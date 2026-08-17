import { ChatMessage, UserPresence, ChatAttachment } from '../types';
import { checkIsSupabaseConfigured, getSupabaseCredentials, supabase } from '../lib/supabase';

// 5 minutes tolerance for online presence (prevents clock skew issues)
const PRESENCE_TIMEOUT_MS = 300000;

export function areSupabaseChatTablesConfigured(): boolean {
  return checkIsSupabaseConfigured();
}

// ========================================================
// SQL SCRIPT FOR SUPABASE REALTIME & CHAT SETUP
// ========================================================
export const SUPABASE_CHAT_SETUP_SQL = `-- ========================================================
-- SCRIPT DE TIEMPO REAL INSTANTÁNEO PARA CHAT Y PRESENCIA
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

-- 3. HABILITAR IDENTIDAD DE RÉPLICA COMPLETA (CRUCIAL PARA REALTIME EN SUPABASE)
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

-- 4. ÍNDICES DE VELOCIDAD PARA CHAT
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON public.chat_messages(recipient);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON public.chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pair ON public.chat_messages(sender, recipient, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON public.user_presence(last_active DESC);

-- 5. SEGURIDAD Y PERMISOS RLS (Acceso público permitido con anon key)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Full Access Chat Messages" ON public.chat_messages;
CREATE POLICY "Anon Full Access Chat Messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access User Presence" ON public.user_presence;
CREATE POLICY "Anon Full Access User Presence" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);

-- 6. HABILITAR REPLICACIÓN EN TIEMPO REAL (WebSockets Realtime)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
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

// Helper to accurately filter messages for any conversation
export function filterMessagesForConversation(
  all: ChatMessage[],
  currentUser: string,
  recipient: string = 'GLOBAL'
): ChatMessage[] {
  if (!recipient || recipient === 'GLOBAL') {
    return all.filter((m) => m.recipient === 'GLOBAL');
  }
  const u1 = currentUser.toLowerCase();
  const u2 = recipient.toLowerCase();

  return all.filter((m) => {
    if (m.recipient === 'GLOBAL') return false;
    const sender = m.sender.toLowerCase();
    const recip = m.recipient.toLowerCase();
    return (sender === u1 && recip === u2) || (sender === u2 && recip === u1);
  });
}

// Audio context singleton for mobile & desktop
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// Unlock mobile audio upon first user gesture (touch, click, tap)
export function unlockAudioOnUserInteraction() {
  if (isAudioUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().then(() => {
        isAudioUnlocked = true;
      });
    } else {
      isAudioUnlocked = true;
    }
  } catch {
    // Ignore autoplay restriction failures until valid gesture
  }
}

// Subtle notification sound + mobile vibration
export function playNotificationSound() {
  try {
    // Mobile Vibration feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 80]);
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }

    const ctx = sharedAudioContext;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {
    // Audio autoplay might be blocked on some mobile browsers before interaction
  }
}

// Merge two message arrays deduplicating by ID and sorting by timestamp
export function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  current.forEach((m) => map.set(m.id, m));
  incoming.forEach((m) => {
    const existing = map.get(m.id);
    if (!existing) {
      map.set(m.id, m);
    } else {
      map.set(m.id, {
        ...existing,
        ...m,
        isRead: m.isRead || existing.isRead,
        isDeleted: m.isDeleted || existing.isDeleted,
      });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Fetch messages between two users or global room
export async function fetchChatMessagesFromSupabase(
  user1: string,
  user2: string = 'GLOBAL'
): Promise<ChatMessage[]> {
  if (!checkIsSupabaseConfigured()) {
    const local = getLocalChatMessages();
    return filterMessagesForConversation(local, user1, user2);
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.warn('[Supabase Chat] Fallback to local on error:', error.message);
      return filterMessagesForConversation(getLocalChatMessages(), user1, user2);
    }

    const formatted: ChatMessage[] = (data || []).map((row: any) => ({
      id: row.id,
      sender: row.sender,
      recipient: row.recipient,
      content: row.content || '',
      attachments: row.attachments || [],
      timestamp: row.timestamp || new Date().toISOString(),
      isRead: Boolean(row.is_read),
      readAt: row.read_at,
      replyTo: row.reply_to || undefined,
      isDeleted: Boolean(row.is_deleted),
      deletedAt: row.deleted_at || undefined,
    }));

    // Update local cache
    const existing = getLocalChatMessages();
    const merged = mergeChatMessages(existing, formatted);
    saveLocalChatMessages(merged);

    return filterMessagesForConversation(merged, user1, user2);
  } catch (err) {
    console.error('[Supabase Chat] fetchChatMessages Exception', err);
    return filterMessagesForConversation(getLocalChatMessages(), user1, user2);
  }
}

// Fetch all messages (for calculating unread badge counters across all contacts)
export async function fetchAllUserChatMessages(currentUser?: string): Promise<ChatMessage[]> {
  if (!checkIsSupabaseConfigured()) {
    return getLocalChatMessages();
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.warn('[Supabase Chat] fetchAllUserChatMessages error:', error.message);
      return getLocalChatMessages();
    }

    const formatted: ChatMessage[] = (data || []).map((row: any) => ({
      id: row.id,
      sender: row.sender,
      recipient: row.recipient,
      content: row.content || '',
      attachments: row.attachments || [],
      timestamp: row.timestamp || new Date().toISOString(),
      isRead: Boolean(row.is_read),
      readAt: row.read_at,
      replyTo: row.reply_to || undefined,
      isDeleted: Boolean(row.is_deleted),
      deletedAt: row.deleted_at || undefined,
    }));

    // Merge and sync to local
    const local = getLocalChatMessages();
    const merged = mergeChatMessages(local, formatted);
    saveLocalChatMessages(merged);
    return merged;
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

  if (!checkIsSupabaseConfigured()) {
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
      is_read: Boolean(msg.isRead),
      read_at: msg.readAt || null,
      reply_to: msg.replyTo || null,
      is_deleted: Boolean(msg.isDeleted),
      deleted_at: msg.deletedAt || null,
    };

    const { error } = await supabase.from('chat_messages').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[Supabase Chat] sendChatMessage Error:', error);
      return false;
    }
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

  if (!checkIsSupabaseConfigured()) {
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
      console.error('[Supabase Chat] deleteChatMessage Error:', error);
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

  if (!checkIsSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: now })
      .eq('sender', sender)
      .eq('recipient', recipient)
      .eq('is_read', false);

    if (error) {
      console.error('[Supabase Chat] markMessagesAsRead Error:', error);
      return false;
    }
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
  isTypingTo?: string | null,
  isOnline: boolean = true
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
      isOnline,
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
      is_online: isOnline,
      current_screen: currentScreen || 'Sistema',
      is_typing_to: isTypingTo || null,
    };

    const { error } = await supabase.from('user_presence').upsert(payload, { onConflict: 'username' });
    if (error) {
      console.warn('[Supabase Presence] ping error:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchAllUserPresences(): Promise<Record<string, UserPresence>> {
  const localPresences = (() => {
    try {
      const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  if (!checkIsSupabaseConfigured()) {
    return localPresences;
  }

  try {
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error) {
      console.warn('[Supabase Presence] fetch error:', error.message);
      return localPresences;
    }

    const result: Record<string, UserPresence> = { ...localPresences };
    const nowTime = Date.now();

    (data || []).forEach((row: any) => {
      const lastActiveTime = new Date(row.last_active).getTime();
      const diff = Math.abs(nowTime - lastActiveTime);
      // Online if flagged online and pinged within last 5 minutes (handles clock skew)
      const isOnline = Boolean(row.is_online && diff < PRESENCE_TIMEOUT_MS);

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
    return localPresences;
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
