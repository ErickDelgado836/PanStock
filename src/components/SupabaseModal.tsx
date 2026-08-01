import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, Copy, Check, RefreshCw, X, Code, Server, ShieldCheck } from 'lucide-react';
import { SUPABASE_SETUP_SQL, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseSyncStatus, syncFromSupabase } from '../services/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'guide'>('status');

  if (!isOpen) return null;

  const status = getSupabaseSyncStatus();

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncFromSupabase();
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Conexión con Supabase</h2>
              <p className="text-xs text-emerald-300 font-medium">
                Base de Datos Cloud en Tiempo Real
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
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'status'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            Estado de Conexión
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'sql'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            Script SQL Supabase
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
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
                  isSupabaseConfigured
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isSupabaseConfigured ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base">
                        {isSupabaseConfigured
                          ? 'Supabase Configurado y Activo'
                          : 'Variables de Supabase Pendientes'}
                      </h3>
                      <p className="text-xs font-semibold opacity-80 mt-0.5">
                        {isSupabaseConfigured
                          ? 'La aplicación está conectada con Supabase usando las variables de entorno oficiales.'
                          : 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para sincronizar en tiempo real con la nube.'}
                      </p>
                    </div>
                  </div>

                  {isSupabaseConfigured && (
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
                    Error devuelto por la consola: {status.errorMessage}
                  </div>
                )}
              </div>

              {/* Data Table Sync Overview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Tablas de la Base de Datos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { title: 'usuarios', desc: 'Credenciales, roles y permisos de acceso', badge: 'SELECT, INSERT, UPDATE, DELETE' },
                    { title: 'almacenes', desc: 'Códigos y nombres de los almacenes', badge: 'SELECT, INSERT, UPDATE' },
                    { title: 'categorias', desc: 'Categorías y subgrupos con prefijos', badge: 'SELECT, INSERT, UPDATE, DELETE' },
                    { title: 'productos', desc: 'Inventario, existencias por almacén y lotes', badge: 'SELECT, INSERT, UPDATE, DELETE' },
                    { title: 'movimientos', desc: 'Kardex de entradas, salidas, traslados y ventas', badge: 'SELECT, INSERT, UPDATE' },
                    { title: 'auditorias', desc: 'Conteo físico e inventarios periódicos', badge: 'SELECT, INSERT, UPDATE' },
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

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Sentencias SQL para Supabase</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Copia estas instrucciones y ejecútalas en la sección <strong>SQL Editor</strong> de tu proyecto en Supabase.
                  </p>
                </div>

                <button
                  onClick={handleCopySQL}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Código SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed rounded-2xl overflow-x-auto max-h-[380px] custom-scrollbar border border-slate-800 selection:bg-emerald-800 selection:text-white">
                  {SUPABASE_SETUP_SQL}
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
                <h4 className="font-extrabold text-slate-900 text-sm">Paso 2: Crear las Tablas en Supabase</h4>
                <ol className="list-decimal list-inside space-y-1 font-medium text-slate-600 leading-relaxed">
                  <li>Inicia sesión en <strong className="text-slate-900">Supabase</strong> y abre tu proyecto.</li>
                  <li>Ve al panel lateral y selecciona <strong className="text-slate-900">SQL Editor</strong>.</li>
                  <li>Haz clic en <strong className="text-slate-900">New Query</strong>, pega el código SQL de la pestaña anterior y haz clic en <strong className="text-emerald-700">Run</strong>.</li>
                </ol>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sincronización en Tiempo Real
                </h4>
                <p className="font-medium text-emerald-900 leading-relaxed">
                  Una vez ingresadas las variables y creadas las tablas, todos los cambios que realices en la aplicación se guardarán en Supabase instantáneamente y estarán disponibles desde cualquier navegador o dispositivo.
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
