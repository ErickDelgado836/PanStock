import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  User,
  KeyRound,
  AlertCircle,
  ShieldCheck,
  Wheat,
  Building2,
} from 'lucide-react';
import { EspañolaFullLogo } from './Logos';
import { getUsers, setCurrentUser, saveUsers } from '../services/storage';
import { DEFAULT_ADMIN_USER } from '../data/seedData';
import { UserProfile } from '../types';

interface LoginModalProps {
  isAdminRoute?: boolean;
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateToAdmin?: () => void;
  onNavigateToApp?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isAdminRoute = false,
  onLoginSuccess,
  onNavigateToAdmin,
  onNavigateToApp,
}) => {
  const [isAdminMode, setIsAdminMode] = useState(isAdminRoute);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guarantee browser autoplay and seamless infinite looping
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.defaultMuted = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;
    videoEl.setAttribute('muted', '');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', '');
    videoEl.setAttribute('autoplay', '');
    videoEl.setAttribute('loop', '');

    const playVideo = () => {
      if (!videoEl) return;
      videoEl.playbackRate = 1.15;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
          })
          .catch(() => {
            // Wait for user interaction if browser policy requires it
          });
      }
    };

    // Load video element
    try {
      videoEl.load();
    } catch (e) {
      // ignore
    }

    playVideo();

    const handleCanPlay = () => {
      playVideo();
    };

    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('loadeddata', handleCanPlay);
    videoEl.addEventListener('loadedmetadata', handleCanPlay);

    // Ensure endless looping even if browser drops loop event
    const handleEnded = () => {
      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
      }
    };

    videoEl.addEventListener('ended', handleEnded);

    const handleUserGesture = () => {
      if (videoEl && videoEl.paused) {
        playVideo();
      }
    };

    window.addEventListener('click', handleUserGesture);
    window.addEventListener('touchstart', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);

    return () => {
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('loadeddata', handleCanPlay);
      videoEl.removeEventListener('loadedmetadata', handleCanPlay);
      videoEl.removeEventListener('ended', handleEnded);
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  const handleToggleMode = (toAdmin: boolean) => {
    setIsAdminMode(toAdmin);
    setErrorMsg('');
    if (toAdmin && onNavigateToAdmin) onNavigateToAdmin();
    if (!toAdmin && onNavigateToApp) onNavigateToApp();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMsg('Por favor ingrese usuario y contraseña.');
      return;
    }

    let users = getUsers();
    let foundUser = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());

    if (cleanUser.toLowerCase() === 'admin' && (!foundUser || foundUser.isDeleted)) {
      // Auto-recreate admin user if missing
      const adminUser = { ...DEFAULT_ADMIN_USER, isDeleted: false, isSuspended: false };
      const otherUsers = users.filter((u) => u.username.toLowerCase() !== 'admin');
      otherUsers.push(adminUser);
      saveUsers(otherUsers);
      foundUser = adminUser;
    }

    if (!foundUser || foundUser.isDeleted) {
      setErrorMsg('Usuario no registrado. Verifique el nombre de usuario.');
      return;
    }

    if (foundUser.isSuspended) {
      setErrorMsg('Este perfil está suspendido, por favor comunícate con el administrador.');
      return;
    }

    const isAdminAdminUser = foundUser.username.toLowerCase() === 'admin';
    const isValidAdminPass = isAdminAdminUser && password === '192021';

    if (foundUser.password !== password && !isValidAdminPass) {
      setErrorMsg('Contraseña incorrecta.');
      return;
    }

    if (isAdminMode && !foundUser.isAdmin) {
      setErrorMsg('Este usuario no posee credenciales de Administrador.');
      return;
    }

    // Set logged in user in storage and notify parent component
    setCurrentUser(foundUser);
    onLoginSuccess(foundUser);
  };

  return (
    <div className="min-h-screen bg-[#0f0c0a] text-slate-100 flex items-center justify-center p-5 xs:p-6 sm:p-6 relative overflow-y-auto font-sans selection:bg-amber-500 selection:text-white">
      {/* Background Video with Crystal-Clear Lighting & Dynamic Ambient Motion */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-cover bg-center"
        style={{ backgroundImage: 'url("/fondo_poster.jpg")' }}
      >
        <video
          ref={videoRef}
          src="/fondo.mp4"
          poster="/fondo_poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover filter brightness-105 scale-105 opacity-95"
        >
          <source src="/fondo.mp4" type="video/mp4" />
          <source src="/pan_video.mp4" type="video/mp4" />
          <source src="/fondo.webm" type="video/webm" />
          <source src="/background.mp4" type="video/mp4" />
        </video>
        {/* Soft Contrast Overlay to Let Video Shine While Preserving Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c0a]/70 via-[#0f0c0a]/20 to-[#0f0c0a]/45" />
      </div>

      {/* High-Class Ambient Bakery Lighting & Warm Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#3d1408_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* Main Luxury Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] xs:max-w-[370px] sm:max-w-md md:max-w-lg bg-white/85 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-black/80 border border-white/40 overflow-hidden relative z-10 text-slate-900 max-h-[94vh] flex flex-col my-auto"
      >
        {/* Top Header Card: YEYÉ NUEVO LOGO Hero Presentation */}
        <div className="relative bg-gradient-to-b from-[#18110c]/95 via-[#221812]/95 to-[#1a120d]/95 p-3.5 sm:p-5 text-white text-center border-b border-amber-950/40 overflow-hidden shrink-0">
          {/* Decorative Wheat Motifs */}
          <div className="absolute -left-6 -top-6 text-amber-500/10 pointer-events-none">
            <Wheat className="w-28 h-28" />
          </div>
          <div className="absolute -right-6 -top-6 text-amber-500/10 pointer-events-none transform -scale-x-100">
            <Wheat className="w-28 h-28" />
          </div>

          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full border border-white/20 text-white text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-2 sm:mb-2.5 shadow-sm">
            <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-white font-extrabold">PanStock • Sistema de Inventario</span>
          </div>

          {/* Featured Hero Card for Panadería Española Logo */}
          <div className="bg-white rounded-2xl p-2.5 sm:p-4 shadow-xl border border-amber-200/40 relative flex flex-col items-center justify-center transform transition-transform hover:scale-[1.01]">
            <img
              src="/espanola.png"
              alt="Panadería Española - El Secreto del Mejor Pan!"
              className="max-h-20 xs:max-h-24 sm:max-h-36 w-auto object-contain my-0.5"
              onError={(e) => {
                // If /espanola.png is not uploaded yet, hide this img and fallback gracefully
                (e.target as HTMLElement).style.display = 'none';
                const fallbackEl = document.getElementById('espanola-logo-fallback');
                if (fallbackEl) fallbackEl.style.display = 'block';
              }}
            />
            <div id="espanola-logo-fallback" style={{ display: 'none' }}>
              <EspañolaFullLogo width={220} height={140} className="my-0.5" />
            </div>
            <div className="flex flex-col items-center border-t border-slate-100 pt-1.5 sm:pt-2 w-full mt-1">
              <span className="text-[9px] sm:text-[11px] font-black tracking-wider text-slate-800 uppercase">
                Panadería Española C.A. • RIF: J-070054034
              </span>
            </div>
          </div>
        </div>

        {/* Form Body - Translucent Glassmorphism */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-white/70 backdrop-blur-md overflow-y-auto flex-1">
          {/* Segmented Mode Selector (Operativo vs. Administrador) */}
          <div className="bg-slate-200/60 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl flex items-center border border-slate-300/70 shadow-inner">
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className={`flex-1 py-1.5 xs:py-2 px-2.5 xs:px-3 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 xs:gap-2 ${
                !isAdminMode
                  ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <User className="w-3.5 h-3.5 text-slate-700" />
              <span>Acceso Operativo</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode(true)}
              className={`flex-1 py-1.5 xs:py-2 px-2.5 xs:px-3 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 xs:gap-2 ${
                isAdminMode
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrador</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-3.5">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 sm:p-3 bg-red-100/90 border border-red-300 rounded-xl flex items-center gap-2 text-red-900 text-xs font-bold shadow-2xs backdrop-blur-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <div>
              <label className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 mb-0.5 sm:mb-1">
                Usuario del Sistema
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario..."
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-white/75 hover:bg-white/95 border border-slate-300/80 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600 focus:bg-white transition-all text-xs sm:text-sm backdrop-blur-sm shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 mb-0.5 sm:mb-1">
                Contraseña de Acceso
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-white/75 hover:bg-white/95 border border-slate-300/80 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-600 focus:bg-white transition-all text-xs sm:text-sm backdrop-blur-sm shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 sm:py-3 px-3.5 sm:px-4 bg-gradient-to-r from-red-600 via-amber-600 to-red-700 hover:from-red-700 hover:to-amber-700 text-white font-black rounded-xl shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm mt-1 sm:mt-2"
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isAdminMode ? 'Ingresar como Administrador' : 'Ingresar al Inventario'}</span>
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-2.5 sm:pt-3 border-t border-slate-200/80 text-center text-[10px] sm:text-[11px] text-slate-600 font-bold">
            <span>PanStock® • Panadería Española C.A. &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


