import { ChatMessage, UserPresence, ChatAttachment } from '../types';
import { checkIsSupabaseConfigured, getSupabaseCredentials, supabase } from '../lib/supabase';

// Flag to track whether chat tables exist in Supabase
let supabaseChatTablesAvailable: boolean | null = null;
const PRESENCE_TIMEOUT_MS = 60000; // 1 minute to consider online

// Helper to check if an error is PGRST205 (missing table in schema)
function isMissingTableError(error: any): boolean {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes?.('Could not find the table') ||
    error?.message?.includes?.('does not exist')
  );
}

export function areSupabaseChatTablesConfigured(): boolean {
  return supabaseChatTablesAvailable !== false;
}

// ==========================================
// SQL SCRIPT FOR CHAT SETUP IN SUPABASE
// ==========================================
export const SUPABASE_CHAT_SETUP_SQL = `-- ========================================================
-- TABLAS Y REGLAS PARA EL MÓDULO DE CHAT INTERNO Y PRESENCIA
-- PanStock Inventory System - Supabase / PostgreSQL
-- Ejecuta este script en el "SQL Editor" de tu panel Supabase
-- ========================================================

-- 1. TABLA DE MENSAJES DE CHAT (Directos y Grupo Global)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL, -- 'GLOBAL' o username específico
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  reply_to JSONB DEFAULT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to JSONB DEFAULT NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. TABLA DE PRESENCIA / ESTADO EN LÍNEA
CREATE TABLE IF NOT EXISTS public.user_presence (
  username TEXT PRIMARY KEY,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  current_screen TEXT DEFAULT 'Inicio',
  is_typing_to TEXT DEFAULT NULL
);

-- 3. ÍNDICES DE VELOCIDAD PARA CHAT
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON public.chat_messages(recipient);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON public.chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pair ON public.chat_messages(sender, recipient, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON public.user_presence(last_active DESC);

-- 4. SEGURIDAD Y PERMISOS (RLS Habilitado con acceso público para anon key)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Full Access Chat Messages" ON public.chat_messages;
CREATE POLICY "Anon Full Access Chat Messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access User Presence" ON public.user_presence;
CREATE POLICY "Anon Full Access User Presence" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);

-- 5. HABILITAR REPLICACIÓN EN TIEMPO REAL (WebSockets Realtime)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages, public.user_presence;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

// Local storage fallback keys
const LOCAL_CHAT_KEY = 'panstock_chat_messages';
const LOCAL_PRESENCE_KEY = 'panstock_user_presence';

export function getLocalChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalChatMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('[LocalChat] Failed to save messages to localStorage', e);
  }
}

// Fetch messages between two users or global room
export async function fetchChatMessagesFromSupabase(
  user1: string,
  user2?: string
): Promise<ChatMessage[]> {
  if (!checkIsSupabaseConfigured()) {
    const local = getLocalChatMessages();
    if (!user2 || user2 === 'GLOBAL') {
      return local.filter((m) => m.recipient === 'GLOBAL');
    }
    return local.filter(
      (m) =>
        (m.sender.toLowerCase() === user1.toLowerCase() && m.recipient.toLowerCase() === user2.toLowerCase()) ||
        (m.sender.toLowerCase() === user2.toLowerCase() && m.recipient.toLowerCase() === user1.toLowerCase())
    );
  }

  try {
    let query = supabase.from('chat_messages').select('*').order('timestamp', { ascending: true });

    if (!user2 || user2 === 'GLOBAL') {
      query = query.eq('recipient', 'GLOBAL');
    } else {
      query = query.or(
        `and(sender.eq.${user1},recipient.eq.${user2}),and(sender.eq.${user2},recipient.eq.${user1})`
      );
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        supabaseChatTablesAvailable = false;
      } else {
        console.warn('[Supabase Chat] Fallback to local on error:', error.message);
      }
      return getLocalChatMessages();
    }
    supabaseChatTablesAvailable = true;

    const formatted: ChatMessage[] = (data || []).map((row: any) => ({
      id: row.id,
      sender: row.sender,
      recipient: row.recipient,
      content: row.content,
      attachments: row.attachments || [],
      timestamp: row.timestamp,
      isRead: row.is_read ?? false,
      readAt: row.read_at,
      replyTo: row.reply_to || undefined,
      isDeleted: row.is_deleted ?? false,
      deletedAt: row.deleted_at || undefined,
    }));

    // Update local cache
    const existing = getLocalChatMessages();
    const map = new Map<string, ChatMessage>();
    existing.forEach((m) => map.set(m.id, m));
    formatted.forEach((m) => map.set(m.id, m));
    saveLocalChatMessages(Array.from(map.values()));

    return formatted;
  } catch (err) {
    console.error('[Supabase Chat] fetchChatMessages Exception', err);
    return getLocalChatMessages();
  }
}

// Fetch all messages (for calculating unread badge counters across all contacts)
export async function fetchAllUserChatMessages(currentUser: string): Promise<ChatMessage[]> {
  if (!checkIsSupabaseConfigured()) {
    return getLocalChatMessages();
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`recipient.eq.GLOBAL,recipient.eq.${currentUser},sender.eq.${currentUser}`)
      .order('timestamp', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        supabaseChatTablesAvailable = false;
      } else {
        console.warn('[Supabase Chat] fetchAllUserChatMessages error:', error.message);
      }
      return getLocalChatMessages();
    }
    supabaseChatTablesAvailable = true;

    const formatted: ChatMessage[] = (data || []).map((row: any) => ({
      id: row.id,
      sender: row.sender,
      recipient: row.recipient,
      content: row.content,
      attachments: row.attachments || [],
      timestamp: row.timestamp,
      isRead: row.is_read ?? false,
      readAt: row.read_at,
      replyTo: row.reply_to || undefined,
      isDeleted: row.is_deleted ?? false,
      deletedAt: row.deleted_at || undefined,
    }));

    // Sync to local
    saveLocalChatMessages(formatted);
    return formatted;
  } catch (err) {
    console.error('[Supabase Chat] fetchAllUserChatMessages exception', err);
    return getLocalChatMessages();
  }
}

// Send a chat message
export async function sendChatMessage(msg: ChatMessage): Promise<boolean> {
  // 1. Always save locally immediately for instant feedback
  const local = getLocalChatMessages();
  const existingIdx = local.findIndex((m) => m.id === msg.id);
  if (existingIdx >= 0) {
    local[existingIdx] = msg;
  } else {
    local.push(msg);
  }
  saveLocalChatMessages(local);

  if (!checkIsSupabaseConfigured() || supabaseChatTablesAvailable === false) {
    return true;
  }

  // 2. Push to Supabase
  try {
    const payload: any = {
      id: msg.id,
      sender: msg.sender,
      recipient: msg.recipient,
      content: msg.content,
      attachments: msg.attachments || [],
      timestamp: msg.timestamp,
      is_read: msg.isRead,
      read_at: msg.readAt,
      reply_to: msg.replyTo || null,
      is_deleted: msg.isDeleted || false,
      deleted_at: msg.deletedAt || null,
    };

    const { error } = await supabase.from('chat_messages').upsert(payload, { onConflict: 'id' });
    if (error) {
      if (isMissingTableError(error)) {
        supabaseChatTablesAvailable = false;
      } else {
        console.error('[Supabase Chat] sendChatMessage Error:', error);
      }
      return false;
    }
    supabaseChatTablesAvailable = true;
    return true;
  } catch (err) {
    console.error('[Supabase Chat] sendChatMessage Exception:', err);
    return false;
  }
}

// Delete a message (mark as deleted)
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Update local cache immediately
  const local = getLocalChatMessages();
  const msg = local.find((m) => m.id === messageId);
  if (msg) {
    msg.isDeleted = true;
    msg.deletedAt = now;
    msg.content = '🚫 Este mensaje fue eliminado';
    msg.attachments = [];
    saveLocalChatMessages(local);
  }

  if (!checkIsSupabaseConfigured() || supabaseChatTablesAvailable === false) {
    return true;
  }

  // 2. Update Supabase
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_deleted: true,
        deleted_at: now,
        content: '🚫 Este mensaje fue eliminado',
        attachments: [],
      })
      .eq('id', messageId);

    if (error) {
      if (isMissingTableError(error)) {
        supabaseChatTablesAvailable = false;
      } else {
        console.error('[Supabase Chat] deleteChatMessage Error:', error);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Chat] deleteChatMessage Exception:', err);
    return false;
  }
}

// Mark messages as read
export async function markMessagesAsRead(sender: string, recipient: string): Promise<boolean> {
  const now = new Date().toISOString();
  
  // Update local
  const local = getLocalChatMessages();
  let modified = false;
  local.forEach((m) => {
    if (
      m.sender.toLowerCase() === sender.toLowerCase() &&
      m.recipient.toLowerCase() === recipient.toLowerCase() &&
      !m.isRead
    ) {
      m.isRead = true;
      m.readAt = now;
      modified = true;
    }
  });
  if (modified) saveLocalChatMessages(local);

  if (!checkIsSupabaseConfigured() || supabaseChatTablesAvailable === false) return true;

  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: now })
      .eq('sender', sender)
      .eq('recipient', recipient)
      .eq('is_read', false);

    if (error) {
      if (isMissingTableError(error)) {
        supabaseChatTablesAvailable = false;
      } else {
        console.error('[Supabase Chat] markMessagesAsRead Error:', error);
      }
      return false;
    }
    supabaseChatTablesAvailable = true;
    return true;
  } catch (err) {
    console.error('[Supabase Chat] markMessagesAsRead Exception:', err);
    return false;
  }
}

// ==========================================
// USER PRESENCE & ONLINE STATUS
// ==========================================

export async function pingUserPresence(
  username: string,
  currentScreen?: string,
  isTypingTo?: string | null
): Promise<boolean> {
  if (!username) return false;
  const now = new Date().toISOString();

  // Local presence
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
    const presences: Record<string, UserPresence> = raw ? JSON.parse(raw) : {};
    presences[username.toLowerCase()] = {
      username,
      lastActive: now,
      isOnline: true,
      currentScreen,
      isTypingTo: isTypingTo || undefined,
    };
    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(presences));
  } catch {
    // ignore
  }

  if (!checkIsSupabaseConfigured()) return true;

  try {
    const payload = {
      username,
      last_active: now,
      is_online: true,
      current_screen: currentScreen || 'Sistema',
      is_typing_to: isTypingTo || null,
    };

    const { error } = await supabase.from('user_presence').upsert(payload, { onConflict: 'username' });
    if (error) {
      // Don't clutter console if table is not yet created
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchAllUserPresences(): Promise<Record<string, UserPresence>> {
  if (!checkIsSupabaseConfigured()) {
    try {
      const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  try {
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error) {
      const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
      return raw ? JSON.parse(raw) : {};
    }

    const result: Record<string, UserPresence> = {};
    const nowTime = Date.now();

    (data || []).forEach((row: any) => {
      const lastActiveTime = new Date(row.last_active).getTime();
      // Considered online if active within the last 90 seconds
      const isOnline = Boolean(row.is_online && nowTime - lastActiveTime < PRESENCE_TIMEOUT_MS);

      result[row.username.toLowerCase()] = {
        username: row.username,
        lastActive: row.last_active,
        isOnline,
        currentScreen: row.current_screen,
        isTypingTo: row.is_typing_to,
      };
    });

    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(result));
    return result;
  } catch {
    return {};
  }
}

// Convert uploaded File to base64 DataURL
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
