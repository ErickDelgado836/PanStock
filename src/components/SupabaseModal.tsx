import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, Copy, Check, RefreshCw, X, Code, Server, ShieldCheck, Key, Link, Lock, Zap, Network, Layers, MessageSquare, Users } from 'lucide-react';
import { SUPABASE_SETUP_SQL, SUPABASE_OPTIMIZATION_INDEXES_SQL, SUPABASE_CHAT_SETUP_SQL, getSupabaseCredentials, updateSupabaseClient, checkIsSupabaseConfigured } from '../lib/supabase';
import { getSupabaseSyncStatus, syncFromSupabase } from '../services/storage';
import { UserProfile } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedIndexes, setCopiedIndexes] = useState(false);
  const [copiedChat, setCopiedChat] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'indexes' | 'guide'>('status');
  const [sqlViewMode, setSqlViewMode] = useState<'full' | 'chat_only' | 'indexes_only'>('chat_only');

  const isAdmin = currentUser?.isAdmin ?? false;

  const initialCreds = getSupabaseCredentials();
  const [inputUrl, setInputUrl] = useState(initialCreds.url);
  const [inputKey, setInputKey] = useState(initialCreds.key);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const isConfigured = checkIsSupabaseConfigured();
  const status = getSupabaseSyncStatus();

  const handleCopyFullSQL = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  const handleCopyIndexesSQL = () => {
    navigator.clipboard.writeText(SUPABASE_OPTIMIZATION_INDEXES_SQL);
    setCopiedIndexes(true);
    setTimeout(() => setCopiedIndexes(false), 2500);
  };

  const handleCopyChatSQL = () => {
    navigator.clipboard.writeText(SUPABASE_CHAT_SETUP_SQL);
    setCopiedChat(true);
    setTimeout(() => setCopiedChat(false), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncFromSupabase();
    setIsSyncing(false);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    updateSupabaseClient(inputUrl, inputKey);
    const success = await syncFromSupabase();
    setIsSyncing(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleClearCredentials = async () => {
    updateSupabaseClient('', '');
    setInputUrl('');
    setInputKey('');
    await syncFromSupabase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Base de Datos Supabase & Optimización</h2>
              <p className="text-xs text-emerald-300 font-medium">
                Relaciones, Integridad Referencial e Índices de Alta Velocidad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'status'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            Estado de Conexión
          </button>
          <button
            onClick={() => setActiveTab('indexes')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'indexes'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Índices y Relaciones (26 Índices)
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'sql'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            Editor de Scripts SQL
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Guía de Configuración
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Connection Status Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  isConfigured
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isConfigured ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base">
                        {isConfigured
                          ? 'Supabase Configurado y Activo'
                          : 'Modo Local (Sin Supabase Conectado)'}
                      </h3>
                      <p className="text-xs font-semibold opacity-80 mt-0.5">
                        {isConfigured
                          ? 'Sincronización activa con PostgreSQL en tiempo real. Índices y llaves foráneas optimizan cada consulta y búsqueda.'
                          : 'Tus datos se están guardando en este navegador. Para activar sincronización con Supabase y aprovechar los índices de PostgreSQL, ingresa tus credenciales.'}
                      </p>
                    </div>
                  </div>

                  {isConfigured && (
                    <button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Forzar Sincronización'}</span>
                    </button>
                  )}
                </div>

                {status.errorMessage && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-xl text-xs text-red-800 font-bold">
                    {status.errorMessage}
                  </div>
                )}
              </div>

              {/* Quick Optimization Summary Banner */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Índices & Relaciones Listos para Ejecutar
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      26 Índices (B-Tree, Multicolumna y GIN JSONB) + 7 Foreign Keys con cascadas configuradas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCopyIndexesSQL}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
                >
                  {copiedIndexes ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedIndexes ? '¡Copiado!' : 'Copiar Solo Índices SQL'}</span>
                </button>
              </div>

              {/* Direct Supabase Credentials Form */}
              <form onSubmit={handleSaveCredentials} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-600" />
                      Credenciales de Conexión Supabase
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      URL y Anon Key del proyecto de Supabase.
                    </p>
                  </div>
                  {saveSuccess && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full flex items-center gap-1.5 border border-emerald-300 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> Conectado exitosamente
                    </span>
                  )}
                </div>

                {!isAdmin && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Vista de solo lectura. Solo el perfil Administrador tiene acceso para modificar o guardar la configuración de Supabase.</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-slate-500" />
                      Supabase Project URL (VITE_SUPABASE_URL)
                    </label>
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://tu-proyecto.supabase.co"
                      required
                      disabled={!isAdmin}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
                    </label>
                    <input
                      type="password"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      required
                      disabled={!isAdmin}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {initialCreds.url && isAdmin ? (
                    <button
                      type="button"
                      onClick={handleClearCredentials}
                      className="text-xs text-slate-500 hover:text-red-600 font-bold transition-colors cursor-pointer"
                    >
                      Desconectar y volver a Modo Local
                    </button>
                  ) : <div />}

                  {isAdmin ? (
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Conectando...' : 'Guardar y Conectar Supabase'}</span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Edición Restringida (Solo Admin)</span>
                    </div>
                  )}
                </div>
              </form>

              {/* Data Table Sync Overview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Tablas y Esquema de la Base de Datos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { title: 'usuarios', desc: 'Credenciales, roles y permisos (PK: username)', badge: '4 Índices' },
                    { title: 'almacenes', desc: 'Códigos y nombres de los 10 almacenes (PK: id)', badge: '3 Índices' },
                    { title: 'categorias', desc: 'Grupos y subgrupos con prefijos (PK: id)', badge: '2 Índices' },
                    { title: 'productos', desc: 'Catálogo, existencias, alertas y lotes JSONB (FK: category_id)', badge: '8 Índices + GIN' },
                    { title: 'movimientos', desc: 'Kardex de transacciones y notas (FK: usuario, almacenes)', badge: '10 Índices + GIN' },
                    { title: 'auditorias', desc: 'Conteo físico e inventario periódico (FK: almacén, categoría)', badge: '6 Índices + GIN' },
                    { title: 'chat_messages', desc: 'Mensajes globales y privados con adjuntos y respuestas (FK: sender, recipient)', badge: '5 Índices' },
                    { title: 'user_presence', desc: 'Detección en tiempo real de usuarios conectados y pantalla activa (PK: username)', badge: '1 Índice + Realtime' },
                  ].map((table) => (
                    <div key={table.title} className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-slate-900">{table.title}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md border border-emerald-200">
                            {table.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">{table.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'indexes' && (
            <div className="space-y-5">
              {/* Header section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl">
                <div>
                  <h3 className="font-black text-sm text-emerald-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    26 Índices y Relaciones de Integridad Referencial
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Diseñados para optimizar el rendimiento de búsquedas, filtros por almacén, ordenamiento cronológico y búsquedas en campos JSONB.
                  </p>
                </div>
                <button
                  onClick={handleCopyIndexesSQL}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  {copiedIndexes ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedIndexes ? '¡Copiado al portapapeles!' : 'Copiar Script de Índices SQL'}</span>
                </button>
              </div>

              {/* Relational Foreign Keys Mapping Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Relaciones entre Tablas (Foreign Keys con Cascada)
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>productos.category_id</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700">categorias.id</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Garantiza que ningún producto quede huérfano sin categoría asignada.</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>movimientos.responsible_user</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700">usuarios.username</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Auditoría estricta de operador responsable por cada movimiento.</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>movimientos.source_warehouse_id</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700">almacenes.id</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Validación y relación de almacén de salida o origen.</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>movimientos.target_warehouse_id</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700">almacenes.id</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Validación y relación de almacén destino o ventas.</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>auditorias.warehouse_id / category_id</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700">almacenes.id / categorias.id</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Conexión de inventario físico periódico con borrado en cascada.</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>auditorias.responsible_user</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700">usuarios.username</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Registro inalterable del auditor responsable de la toma de inventario.</p>
                  </div>
                </div>
              </div>

              {/* Indexes Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Desglose de Índices Creados para Optimización de Consultas
                  </h4>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">📦 Tabla: public.productos (8 Índices)</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">B-Tree + Multicolumna + GIN JSONB</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 font-mono">
                      <div>• <strong className="text-slate-900">idx_productos_category_id</strong> (Filtro por grupo)</div>
                      <div>• <strong className="text-slate-900">idx_productos_code</strong> (Búsqueda por código)</div>
                      <div>• <strong className="text-slate-900">idx_productos_name</strong> (Búsqueda por nombre)</div>
                      <div>• <strong className="text-slate-900">idx_productos_expiration_date</strong> (Alertas vencimiento)</div>
                      <div>• <strong className="text-slate-900">idx_productos_cat_code</strong> (Compuesto: categoría + código)</div>
                      <div>• <strong className="text-slate-900">idx_productos_stock_gin</strong> (GIN en stock_by_warehouse)</div>
                      <div>• <strong className="text-slate-900">idx_productos_lots_gin</strong> (GIN en lotes)</div>
                      <div>• <strong className="text-slate-900">idx_productos_entry_date</strong> (Filtro fecha ingreso)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">🚚 Tabla: public.movimientos (10 Índices)</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">Kardex & Rango Fechas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 font-mono">
                      <div>• <strong className="text-slate-900">idx_movimientos_type</strong> (ENTRY, EXIT, TRANSFER, SALE)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_date</strong> (Orden cronológico DESC)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_created_at</strong> (Orden por inserción)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_number</strong> (Búsqueda por Nº Comprobante)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_doc_ref</strong> (Búsqueda por Factura / Doc)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_resp_user</strong> (Filtro por responsable)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_source_wh</strong> (Almacén origen)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_target_wh</strong> (Almacén destino)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_wh_type_date</strong> (Compuesto multi-filtro)</div>
                      <div>• <strong className="text-slate-900">idx_movimientos_items_gin</strong> (GIN para items en movimiento)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">📋 Tabla: public.auditorias (6 Índices)</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">Conteo Físico & Auditoría</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 font-mono">
                      <div>• <strong className="text-slate-900">idx_auditorias_warehouse_id</strong> (Filtro por almacén)</div>
                      <div>• <strong className="text-slate-900">idx_auditorias_category_id</strong> (Filtro por categoría)</div>
                      <div>• <strong className="text-slate-900">idx_auditorias_date</strong> (Fecha de auditoría DESC)</div>
                      <div>• <strong className="text-slate-900">idx_auditorias_user</strong> (Auditor responsable)</div>
                      <div>• <strong className="text-slate-900">idx_auditorias_wh_cat_date</strong> (Última auditoría por grupo)</div>
                      <div>• <strong className="text-slate-900">idx_auditorias_items_gin</strong> (GIN para conteo físico de items)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Sentencias SQL para Supabase SQL Editor</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Elige el script que deseas ejecutar en Supabase para sincronizar tu base de datos o habilitar el chat.
                  </p>
                </div>

                {/* Switch view mode */}
                <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setSqlViewMode('chat_only')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sqlViewMode === 'chat_only'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat & Presencia
                  </button>
                  <button
                    onClick={() => setSqlViewMode('full')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sqlViewMode === 'full'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Script Completo (8 Tablas)
                  </button>
                  <button
                    onClick={() => setSqlViewMode('indexes_only')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sqlViewMode === 'indexes_only'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Solo Índices
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700">
                  {sqlViewMode === 'chat_only' && (
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Tablas de Chat Interno + Monitoreo de Usuarios Conectados en Línea + Realtime
                    </span>
                  )}
                  {sqlViewMode === 'indexes_only' && (
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <Zap className="w-3.5 h-3.5" />
                      Script seguro de Índices y Foreign Keys (Idempotente con IF NOT EXISTS)
                    </span>
                  )}
                  {sqlViewMode === 'full' && (
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <Database className="w-3.5 h-3.5" />
                      Script de Creación Total (8 Tablas + Chat + Presencia + Índices + Realtime)
                    </span>
                  )}
                </div>

                <button
                  onClick={
                    sqlViewMode === 'chat_only'
                      ? handleCopyChatSQL
                      : sqlViewMode === 'indexes_only'
                      ? handleCopyIndexesSQL
                      : handleCopyFullSQL
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  {(sqlViewMode === 'chat_only'
                    ? copiedChat
                    : sqlViewMode === 'indexes_only'
                    ? copiedIndexes
                    : copiedFull) ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>
                    {(sqlViewMode === 'chat_only'
                      ? copiedChat
                      : sqlViewMode === 'indexes_only'
                      ? copiedIndexes
                      : copiedFull)
                      ? '¡Copiado al portapapeles!'
                      : 'Copiar este Código SQL'}
                  </span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed rounded-2xl overflow-x-auto max-h-[380px] custom-scrollbar border border-slate-800 selection:bg-emerald-800 selection:text-white">
                  {sqlViewMode === 'chat_only'
                    ? SUPABASE_CHAT_SETUP_SQL
                    : sqlViewMode === 'indexes_only'
                    ? SUPABASE_OPTIMIZATION_INDEXES_SQL
                    : SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-blue-900 text-sm">Paso 1: Variables de Entorno en Vercel</h4>
                <p className="font-medium text-blue-800 leading-relaxed">
                  Agrega las siguientes variables en la configuración de tu proyecto en Vercel (Project Settings → Environment Variables):
                </p>
                <div className="p-3 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl space-y-1">
                  <p>VITE_SUPABASE_URL = https://tu-proyecto.supabase.co</p>
                  <p>VITE_SUPABASE_ANON_KEY = tu_anon_key_aqui</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Paso 2: Ejecutar los Índices y Relaciones en Supabase</h4>
                <ol className="list-decimal list-inside space-y-1 font-medium text-slate-600 leading-relaxed">
                  <li>Inicia sesión en <strong className="text-slate-900">Supabase</strong> y abre tu proyecto.</li>
                  <li>Ve al panel lateral izquierdo y selecciona <strong className="text-slate-900">SQL Editor</strong>.</li>
                  <li>Haz clic en <strong className="text-slate-900">New Query</strong> (+), copia el código de la pestaña <strong>Editor de Scripts SQL</strong> y haz clic en el botón verde <strong className="text-emerald-700">Run</strong>.</li>
                  <li>Los 26 índices y las relaciones de llaves foráneas se aplicarán de inmediato garantizando consultas instantáneas.</li>
                </ol>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sincronización en Tiempo Real e Índices Activos
                </h4>
                <p className="font-medium text-emerald-900 leading-relaxed">
                  Una vez ejecutados los índices, cada búsqueda por código de producto, alertas de vencimiento, filtro por almacén o reporte de movimientos se ejecutará en milisegundos gracias al motor de optimización de PostgreSQL.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
