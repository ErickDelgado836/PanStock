import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Search,
  Filter,
  Users,
  Check,
  CheckCheck,
  Circle,
  FileText,
  Image as ImageIcon,
  Minimize2,
  Maximize2,
  Download,
  Eye,
  Reply,
  Trash2,
  CornerDownRight,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Clock,
  Shield,
  HelpCircle,
  File,
  Copy,
  CheckCircle2,
  Code,
  User,
  MessageCircle,
  ListFilter
} from 'lucide-react';
import { ChatMessage, UserPresence, UserProfile, ChatAttachment } from '../types';
import {
  fetchChatMessagesFromSupabase,
  fetchAllUserChatMessages,
  sendChatMessage,
  deleteChatMessage,
  markMessagesAsRead,
  pingUserPresence,
  fetchAllUserPresences,
  readFileAsBase64,
  SUPABASE_CHAT_SETUP_SQL,
} from '../services/chatService';
import { getUsers } from '../services/storage';
import { checkIsSupabaseConfigured, registerSupabaseRealtimeCallback } from '../lib/supabase';

interface FloatingChatWidgetProps {
  currentUser: UserProfile;
  currentScreen?: string;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  currentUser,
  currentScreen = 'Inicio',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewTab, setViewTab] = useState<'CHAT' | 'DIRECTORY'>('CHAT');
  const [activeRecipient, setActiveRecipient] = useState<string>('GLOBAL'); // 'GLOBAL' or username
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'UNREAD'>('ALL');
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSqlHelp, setShowSqlHelp] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const userCarouselRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const scrollUsers = (direction: 'left' | 'right') => {
    if (userCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      userCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Load all registered users
  useEffect(() => {
    const users = getUsers().filter((u) => !u.isDeleted && !u.isSuspended);
    setUsersList(users);
  }, [isOpen]);

  // Presence heartbeat every 20 seconds
  useEffect(() => {
    if (!currentUser?.username) return;

    const doPing = () => {
      pingUserPresence(
        currentUser.username,
        currentScreen,
        isTyping ? activeRecipient : null
      );
    };

    doPing();
    const interval = setInterval(doPing, 20000);

    const refreshPresences = async () => {
      const p = await fetchAllUserPresences();
      setPresences(p);
    };
    refreshPresences();
    const presenceInterval = setInterval(refreshPresences, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(presenceInterval);
    };
  }, [currentUser?.username, currentScreen, isTyping, activeRecipient]);

  // Realtime subscription for Supabase
  useEffect(() => {
    const unregister = registerSupabaseRealtimeCallback((payload) => {
      if (payload.table === 'chat_messages' || payload.table === 'user_presence') {
        loadAllData();
      }
    });

    return () => {
      unregister();
    };
  }, [activeRecipient, currentUser?.username]);

  // Poll fallback / initial load
  const loadAllData = async () => {
    if (!currentUser?.username) return;

    const [allMsg, activeMsg, p] = await Promise.all([
      fetchAllUserChatMessages(currentUser.username),
      fetchChatMessagesFromSupabase(currentUser.username, activeRecipient),
      fetchAllUserPresences(),
    ]);

    setAllMessages(allMsg);
    setMessages(activeMsg);
    setPresences(p);

    // Auto mark as read if chat is open
    if (isOpen && activeRecipient !== 'GLOBAL') {
      markMessagesAsRead(activeRecipient, currentUser.username);
    }
  };

  useEffect(() => {
    loadAllData();
    const poll = setInterval(loadAllData, 4000);
    return () => clearInterval(poll);
  }, [activeRecipient, isOpen, currentUser?.username]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Mark active chat as read upon opening
  useEffect(() => {
    if (isOpen && activeRecipient !== 'GLOBAL' && currentUser?.username) {
      markMessagesAsRead(activeRecipient, currentUser.username);
    }
  }, [activeRecipient, isOpen, currentUser?.username]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && pendingAttachments.length === 0) return;
    if (!currentUser?.username) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sender: currentUser.username,
      recipient: activeRecipient,
      content: inputText.trim(),
      attachments: [...pendingAttachments],
      timestamp: new Date().toISOString(),
      isRead: false,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            sender: replyingTo.sender,
            content:
              replyingTo.content ||
              (replyingTo.attachments?.length ? `[${replyingTo.attachments[0].name}]` : 'Mensaje'),
          }
        : undefined,
    };

    setInputText('');
    setPendingAttachments([]);
    setReplyingTo(null);
    setIsTyping(false);

    // Optimistic append
    setMessages((prev) => [...prev, newMsg]);
    setAllMessages((prev) => [...prev, newMsg]);

    await sendChatMessage(newMsg);
  };

  const handleStartReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };

  const handleDeleteMessage = async (msgId: string) => {
    const confirmDelete = window.confirm('¿Deseas eliminar este mensaje para todos?');
    if (!confirmDelete) return;

    // Optimistic update
    const updateList = (list: ChatMessage[]) =>
      list.map((m) =>
        m.id === msgId
          ? { ...m, isDeleted: true, content: '🚫 Este mensaje fue eliminado', attachments: [] }
          : m
      );

    setMessages((prev) => updateList(prev));
    setAllMessages((prev) => updateList(prev));

    await deleteChatMessage(msgId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        alert(`El archivo ${file.name} supera el límite de 10MB.`);
        continue;
      }

      try {
        const base64 = await readFileAsBase64(file);
        let type: 'image' | 'pdf' | 'document' | 'other' = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) type = 'pdf';
        else if (file.type.includes('word') || file.type.includes('sheet') || file.type.includes('text')) {
          type = 'document';
        }

        setPendingAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type,
            url: base64,
            size: file.size,
            mimeType: file.type,
          },
        ]);
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      pingUserPresence(currentUser.username, currentScreen, activeRecipient);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      pingUserPresence(currentUser.username, currentScreen, null);
    }, 2500);
  };

  // Calculate unread count total
  const unreadTotal = allMessages.filter(
    (m) =>
      m.recipient.toLowerCase() === currentUser?.username?.toLowerCase() &&
      !m.isRead
  ).length;

  const getUnreadForUser = (user: string) => {
    return allMessages.filter(
      (m) =>
        m.sender.toLowerCase() === user.toLowerCase() &&
        m.recipient.toLowerCase() === currentUser?.username?.toLowerCase() &&
        !m.isRead
    ).length;
  };

  const isUserOnline = (uname: string) => {
    if (uname.toLowerCase() === currentUser?.username?.toLowerCase()) return true;
    return Boolean(presences[uname.toLowerCase()]?.isOnline);
  };

  const getUserLastActive = (uname: string) => {
    const p = presences[uname.toLowerCase()];
    if (!p || !p.lastActive) return 'Desconectado';
    if (p.isOnline) return `En línea • ${p.currentScreen || 'Sistema'}`;
    const diff = Math.floor((Date.now() - new Date(p.lastActive).getTime()) / 60000);
    if (diff < 1) return 'Visto hace un momento';
    if (diff < 60) return `Visto hace ${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Visto hace ${hours} h`;
    return 'Desconectado hace días';
  };

  // Filtered contacts
  const otherUsers = usersList.filter(
    (u) => u.username.toLowerCase() !== currentUser?.username?.toLowerCase()
  );

  const filteredUsers = otherUsers.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.roleName.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ONLINE') return isUserOnline(u.username);
    if (statusFilter === 'UNREAD') return getUnreadForUser(u.username) > 0;
    return true;
  });

  const activeUserObj = usersList.find(
    (u) => u.username.toLowerCase() === activeRecipient.toLowerCase()
  );

  const isOtherTypingToMe = () => {
    if (activeRecipient === 'GLOBAL') return false;
    const p = presences[activeRecipient.toLowerCase()];
    return p?.isOnline && p?.isTypingTo?.toLowerCase() === currentUser?.username?.toLowerCase();
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_CHAT_SETUP_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      if (isToday) return timeStr;
      return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${timeStr}`;
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* 1. DISCREET FLOATING BUTTON (TRIGGER) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 select-none print:hidden">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-full shadow-2xl hover:shadow-red-600/30 border border-white/20 transition-all duration-200 cursor-pointer active:scale-95"
            title="Abrir Chat Corporativo"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
              {unreadTotal > 0 && (
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[18px] text-[10px] font-black bg-white text-red-600 rounded-full shadow-md animate-bounce flex items-center justify-center">
                  {unreadTotal}
                </span>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-black tracking-wide leading-tight">Chat PanStock</div>
              <div className="text-[10px] text-amber-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {otherUsers.filter((u) => isUserOnline(u.username)).length} En Línea
                </span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* 2. CHAT WINDOW / MODAL DOCK */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 print:hidden flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden ${
            isExpanded
              ? 'inset-2 sm:inset-6 sm:max-w-5xl sm:mx-auto rounded-3xl'
              : 'bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[420px] md:w-[480px] h-[92vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-red-600/20 text-red-400 rounded-xl border border-red-500/30 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight truncate">
                    {activeRecipient === 'GLOBAL'
                      ? '🥖 Sala General de Panadería'
                      : `@${activeRecipient}`}
                  </h3>
                  {activeRecipient !== 'GLOBAL' && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        isUserOnline(activeRecipient)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isUserOnline(activeRecipient) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {isUserOnline(activeRecipient) ? 'En línea' : 'Ausente'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {activeRecipient === 'GLOBAL'
                    ? 'Mensajes visibles para todo el personal'
                    : getUserLastActive(activeRecipient)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowSqlHelp(!showSqlHelp)}
                className="p-1.5 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                title="Configuración y SQL de Supabase para Chat"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'Restaurar tamaño' : 'Maximizar'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Minimizar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SQL Help Banner Modal (if toggled) */}
          {showSqlHelp && (
            <div className="bg-amber-50 border-b border-amber-200 p-3.5 text-xs text-amber-900 shrink-0 max-h-56 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between font-black text-amber-950">
                <span className="flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-amber-600" />
                  Instrucciones para Supabase (Tablas de Chat)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSqlHelp(false)}
                  className="text-amber-700 hover:text-amber-900 font-bold text-[11px]"
                >
                  Cerrar
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Si aún no has creado las tablas en tu base de datos Supabase, copia este script SQL y pégalo en el <strong>SQL Editor</strong> de Supabase para activar la sincronización y persistencia en la nube:
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {sqlCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {sqlCopied ? '¡SQL Copiado!' : 'Copiar Script SQL'}
                </button>
                <span className="text-[10px] text-amber-700">
                  Crea tablas <code>chat_messages</code> y <code>user_presence</code>.
                </span>
              </div>
            </div>
          )}

          {/* Contact Bar & Quick Switcher */}
          <div className="bg-slate-50 border-b border-slate-200 px-2 sm:px-3 py-2 shrink-0">
            {/* View Switcher Tabs (Chat vs Directorio) */}
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewTab('CHAT')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'CHAT'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Conversación</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('DIRECTORY')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewTab === 'DIRECTORY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Directorio ({otherUsers.length})</span>
                </button>
              </div>

              {viewTab === 'CHAT' && (
                <button
                  type="button"
                  onClick={() => setViewTab('DIRECTORY')}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 px-1 cursor-pointer"
                >
                  <ListFilter className="w-3 h-3" />
                  <span>Ver todos</span>
                </button>
              )}
            </div>

            {/* Quick Recipients Horizontal Carousel with Navigation Arrows */}
            {viewTab === 'CHAT' && (
              <div className="relative flex items-center gap-1">
                {/* Left Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollUsers('left')}
                  className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs shrink-0 transition-colors z-10 cursor-pointer"
                  title="Desplazar usuarios a la izquierda"
                  aria-label="Desplazar a la izquierda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Scrollable User Pills */}
                <div
                  ref={userCarouselRef}
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-1.5 overflow-x-auto py-1 scroll-smooth no-scrollbar flex-1"
                >
                  {/* Sala General */}
                  <button
                    type="button"
                    onClick={() => setActiveRecipient('GLOBAL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeRecipient === 'GLOBAL'
                        ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/20'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sala General</span>
                  </button>

                  {/* Individual Users */}
                  {otherUsers.map((u) => {
                    const unread = getUnreadForUser(u.username);
                    const online = isUserOnline(u.username);
                    const isSelected = activeRecipient.toLowerCase() === u.username.toLowerCase();

                    return (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => setActiveRecipient(u.username)}
                        className={`relative px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-500/30'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                        }`}
                        title={`${u.username} (${u.roleName || 'Usuario'})`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            online ? 'bg-emerald-400 ring-2 ring-emerald-200 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <span className="truncate max-w-[100px]">{u.username}</span>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 min-w-[16px] text-[10px] font-black bg-amber-400 text-slate-950 rounded-full shrink-0">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Botón rápido para abrir directorio al final del carrusel */}
                  <button
                    type="button"
                    onClick={() => setViewTab('DIRECTORY')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-200 text-slate-700 hover:bg-slate-300 flex items-center gap-1 cursor-pointer shrink-0 border border-slate-300"
                  >
                    <Users className="w-3 h-3 text-slate-600" />
                    <span>+ Directorio</span>
                  </button>
                </div>

                {/* Right Scroll Arrow */}
                <button
                  type="button"
                  onClick={() => scrollUsers('right')}
                  className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs shrink-0 transition-colors z-10 cursor-pointer"
                  title="Desplazar usuarios a la derecha"
                  aria-label="Desplazar a la derecha"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search and Filters (Shown in both or Directory) */}
            <div className="flex items-center gap-2 pt-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar usuario o cargo..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-6 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-red-500 focus:outline-hidden shadow-2xs"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[10px] font-bold text-slate-600 shrink-0 shadow-2xs">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('ONLINE')}
                  className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                    statusFilter === 'ONLINE' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  En Línea
                </button>
                <button
                  onClick={() => setStatusFilter('UNREAD')}
                  className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                    statusFilter === 'UNREAD' ? 'bg-amber-600 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  No leídos
                  {unreadTotal > 0 && (
                    <span className="px-1 py-0 bg-white/20 text-white rounded-full text-[8px]">
                      {unreadTotal}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Search Dropdown overlay if typing in search input */}
          {searchFilter && filteredUsers.length > 0 && viewTab === 'CHAT' && (
            <div className="bg-white border-b border-slate-200 p-2 shadow-lg max-h-48 overflow-y-auto space-y-1 z-10 shrink-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>Resultados ({filteredUsers.length})</span>
                <span className="text-slate-400 text-[9px]">Haz clic para chatear</span>
              </div>
              {filteredUsers.map((u) => (
                <button
                  key={u.username}
                  onClick={() => {
                    setActiveRecipient(u.username);
                    setSearchFilter('');
                  }}
                  className="w-full px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center justify-between text-left transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isUserOnline(u.username) ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{u.username}</div>
                      <div className="text-[10px] text-slate-500">{u.roleName}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">{getUserLastActive(u.username)}</span>
                </button>
              ))}
            </div>
          )}

          {/* DIRECTORY VIEW: Full list of users if tab is DIRECTORY */}
          {viewTab === 'DIRECTORY' && (
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50 space-y-2">
              <div className="text-xs font-black text-slate-500 px-1 py-1 uppercase tracking-wider flex items-center justify-between">
                <span>Directorio de Personal ({filteredUsers.length})</span>
                <span className="text-[10px] text-slate-400 normal-case font-medium">Selecciona un usuario para abrir chat</span>
              </div>

              {/* Sala General Card */}
              <button
                type="button"
                onClick={() => {
                  setActiveRecipient('GLOBAL');
                  setViewTab('CHAT');
                }}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  activeRecipient === 'GLOBAL'
                    ? 'bg-slate-900 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-800 hover:bg-slate-100 border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black border border-amber-500/30 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black flex items-center gap-1.5">
                      <span>🥖 Sala General de Panadería</span>
                    </div>
                    <div className={`text-xs ${activeRecipient === 'GLOBAL' ? 'text-slate-300' : 'text-slate-500'}`}>
                      Canal público para todo el equipo
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  Abrir Canal
                </div>
              </button>

              {/* Individual Users List */}
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No se encontraron usuarios con ese criterio de búsqueda.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const unread = getUnreadForUser(u.username);
                  const online = isUserOnline(u.username);
                  const isSelected = activeRecipient.toLowerCase() === u.username.toLowerCase();

                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => {
                        setActiveRecipient(u.username);
                        setViewTab('CHAT');
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-100 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar / Status */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase shrink-0">
                            {u.username.substring(0, 2)}
                          </div>
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              online ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 truncate">@{u.username}</span>
                            {u.username.toLowerCase() === 'admin' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-100 text-amber-800 rounded-md">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{u.roleName || 'Operador'}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{getUserLastActive(u.username)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {unread > 0 && (
                          <span className="px-2 py-0.5 text-xs font-black bg-red-600 text-white rounded-full">
                            {unread} nuevo{unread > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-red-600 transition-colors">
                          Chatear
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Messages Area & Input Form (When viewTab is 'CHAT') */}
          {viewTab === 'CHAT' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/60">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  {activeRecipient === 'GLOBAL'
                    ? 'No hay mensajes en la Sala General'
                    : `Inicia la conversación con @${activeRecipient}`}
                </div>
                <p className="text-xs text-slate-500 max-w-xs">
                  Puedes enviar mensajes de texto, fotografías de mercancía y reportes en formato PDF.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine =
                  msg.sender.toLowerCase() === currentUser?.username?.toLowerCase();
                const isDeleted = msg.isDeleted;

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className={`group/msg flex flex-col relative transition-all ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender name for global room or other users */}
                    {!isMine && (
                      <span className="text-[10px] font-bold text-slate-500 mb-1 px-1 flex items-center gap-1">
                        <span>@{msg.sender}</span>
                        {msg.sender.toLowerCase() === 'admin' && (
                          <Shield className="w-3 h-3 text-amber-600" />
                        )}
                      </span>
                    )}

                    {/* Message Bubble + Action Buttons Container */}
                    <div className={`flex items-center gap-1.5 max-w-[90%] sm:max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Action buttons (Reply & Delete) on hover */}
                      {!isDeleted && (
                        <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 shrink-0 px-1">
                          <button
                            type="button"
                            onClick={() => handleStartReply(msg)}
                            className="p-1 rounded-lg bg-white/90 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-2xs cursor-pointer transition-colors"
                            title="Responder / Citar mensaje"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {(isMine || currentUser?.isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded-lg bg-white/90 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 shadow-2xs cursor-pointer transition-colors"
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`w-full rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1.5 ${
                          isDeleted
                            ? 'bg-slate-200/80 text-slate-500 border border-slate-300/60 italic'
                            : isMine
                            ? 'bg-gradient-to-br from-red-600 to-amber-700 text-white rounded-br-xs'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {/* Quote preview if this is a reply to another message */}
                        {msg.replyTo && !isDeleted && (
                          <div
                            onClick={() => {
                              const el = document.getElementById(`chat-msg-${msg.replyTo?.id}`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className={`p-2 rounded-xl text-xs border-l-3 cursor-pointer transition-opacity hover:opacity-90 flex flex-col gap-0.5 mb-1.5 ${
                              isMine
                                ? 'bg-black/25 border-amber-300 text-white/90'
                                : 'bg-slate-100 border-red-500 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-black text-[10px] uppercase tracking-wider">
                              <CornerDownRight className="w-2.5 h-2.5" />
                              <span>@{msg.replyTo.sender}</span>
                            </div>
                            <p className="line-clamp-2 text-[11px] font-medium leading-tight">
                              {msg.replyTo.content}
                            </p>
                          </div>
                        )}

                        {/* Text content */}
                        {msg.content && (
                          <p className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${isDeleted ? 'font-normal italic' : 'font-medium'}`}>
                            {msg.content}
                          </p>
                        )}

                        {/* Attachments */}
                        {!isDeleted && msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="rounded-xl overflow-hidden border border-black/10">
                                {att.type === 'image' ? (
                                  <div className="relative group cursor-pointer" onClick={() => setPreviewAttachment(att)}>
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-h-48 w-full object-cover rounded-lg"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                                      <Eye className="w-4 h-4" /> Ver imagen
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`p-2.5 flex items-center justify-between gap-2 text-xs rounded-lg ${
                                      isMine ? 'bg-black/20 text-white' : 'bg-slate-50 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className={`w-4 h-4 shrink-0 ${isMine ? 'text-amber-300' : 'text-red-600'}`} />
                                      <span className="truncate font-medium">{att.name}</span>
                                    </div>
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`p-1 rounded-md hover:bg-black/10 transition-colors shrink-0 ${
                                        isMine ? 'text-white' : 'text-slate-700'
                                      }`}
                                      title="Descargar archivo"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timestamp & Status */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] ${
                            isMine && !isDeleted ? 'text-amber-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {isMine && !isDeleted && activeRecipient !== 'GLOBAL' && (
                            <span title={msg.isRead ? 'Leído' : 'Entregado'}>
                              {msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-300 inline" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-white/70 inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Is Typing Indicator */}
            {isOtherTypingToMe() && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200 w-fit shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>@{activeRecipient} está escribiendo...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Replying To Banner (WhatsApp style) */}
          {replyingTo && (
            <div className="bg-slate-100 border-t border-slate-300 px-3 py-2 flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 min-w-0 border-l-4 border-red-600 pl-2.5 py-0.5">
                <Reply className="w-4 h-4 text-red-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                    <span>Respondiendo a</span>
                    <span className="text-red-600 font-black">@{replyingTo.sender}</span>
                  </div>
                  <p className="text-xs text-slate-600 truncate max-w-xs font-medium">
                    {replyingTo.content ||
                      (replyingTo.attachments?.length ? `[${replyingTo.attachments[0].name}]` : 'Mensaje')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                title="Cancelar respuesta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pending Attachments Bar */}
          {pendingAttachments.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Adjuntos ({pendingAttachments.length}):
              </span>
              {pendingAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs text-slate-800 shrink-0 shadow-2xs"
                >
                  {att.type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className="truncate max-w-[100px] font-medium">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-600 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="bg-white p-3 border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Adjuntar foto o PDF"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              ref={textInputRef}
              type="text"
              placeholder={
                replyingTo
                  ? `Respondiendo a @${replyingTo.sender}...`
                  : `Escribir mensaje a ${
                      activeRecipient === 'GLOBAL' ? 'todos' : '@' + activeRecipient
                    }...`
              }
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && pendingAttachments.length === 0}
              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer shrink-0 flex items-center justify-center ${
                inputText.trim() || pendingAttachments.length > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )}

      {/* 3. ATTACHMENT FULLSCREEN PREVIEW MODAL */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold truncate">{previewAttachment.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh]">
              {previewAttachment.type === 'image' ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-800"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
