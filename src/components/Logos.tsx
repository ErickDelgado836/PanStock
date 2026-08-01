import React from 'react';

/**
 * Full Emblem Logo for Panadería Española C.A.
 * Recreates the iconic mascot, yellow arch, red banner, and dark blue slogan badge.
 * Ensures 100% contrast legibility with crisp white text on red and navy backgrounds.
 */
export const EspañolaFullLogo: React.FC<{
  className?: string;
  width?: number | string;
  height?: number | string;
}> = ({ className = '', width = 320, height = 280 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 400 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-lg max-w-full ${className}`}
    >
      {/* --- DIAMOND FRAME BACKGROUND PATTERN --- */}
      {/* Top Diamond Stack */}
      <polygon points="200,5 218,23 200,41 182,23" fill="#E31B23" />
      <polygon points="200,42 222,64 200,86 178,64" fill="#E31B23" />
      <polygon points="160,82 182,104 160,126 138,104" fill="#E31B23" />
      <polygon points="240,82 262,104 240,126 218,104" fill="#E31B23" />

      {/* Side Diamonds Left */}
      <polygon points="120,122 142,144 120,166 98,144" fill="#E31B23" />
      <polygon points="82,182 104,204 82,226 60,204" fill="#E31B23" />
      <polygon points="45,242 67,264 45,286 23,264" fill="#E31B23" stroke="#FFFFFF" strokeWidth="1" />

      {/* Side Diamonds Right */}
      <polygon points="280,122 302,144 280,166 258,144" fill="#E31B23" />
      <polygon points="318,182 340,204 318,226 296,204" fill="#E31B23" />
      <polygon points="355,242 377,264 355,286 333,264" fill="#E31B23" stroke="#FFFFFF" strokeWidth="1" />

      {/* Bottom Diamonds */}
      <polygon points="200,300 222,322 200,344 178,322" fill="#E31B23" />
      <polygon points="200,338 215,353 200,368 185,353" fill="#E31B23" />

      {/* --- YELLOW SEMICIRCLE ARCH --- */}
      <path
        d="M 55,225 A 145,145 0 0,1 345,225 Z"
        fill="#FFEC00"
        stroke="#1E2245"
        strokeWidth="4"
      />

      {/* --- BAKER BOY MASCOT --- */}
      <g id="baker-boy">
        {/* Face / Skin */}
        <ellipse cx="200" cy="150" rx="32" ry="36" fill="#FFE0B2" stroke="#1E2245" strokeWidth="3" />

        {/* Eyes & Eyebrows */}
        <ellipse cx="188" cy="144" rx="2.5" ry="3" fill="#1E2245" />
        <ellipse cx="212" cy="144" rx="2.5" ry="3" fill="#1E2245" />
        <path d="M 183,138 Q 188,135 193,138" stroke="#1E2245" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 207,138 Q 212,135 217,138" stroke="#1E2245" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Nose & Smile */}
        <path d="M 198,148 C 196,152 202,154 200,157" stroke="#1E2245" strokeWidth="2" fill="none" />
        <path d="M 188,162 Q 200,172 212,162" stroke="#1E2245" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Ears */}
        <circle cx="167" cy="150" r="6" fill="#FFE0B2" stroke="#1E2245" strokeWidth="2.5" />
        <circle cx="233" cy="150" r="6" fill="#FFE0B2" stroke="#1E2245" strokeWidth="2.5" />

        {/* Red Baker Cap */}
        <path d="M 166,132 Q 200,85 234,132 Z" fill="#E31B23" stroke="#1E2245" strokeWidth="3" />
        <path d="M 164,132 Q 200,126 236,132 L 234,138 Q 200,132 166,138 Z" fill="#B71C1C" />

        {/* Striped Shirt (Yellow/Blue Stripes) */}
        <path d="M 165,186 Q 200,178 235,186 L 250,225 L 150,225 Z" fill="#FFEC00" stroke="#1E2245" strokeWidth="3" />
        {/* Vertical Blue Stripes */}
        <path d="M 175,184 L 168,225" stroke="#1E2245" strokeWidth="3.5" />
        <path d="M 188,182 L 183,225" stroke="#1E2245" strokeWidth="3.5" />
        <path d="M 200,181 L 200,225" stroke="#1E2245" strokeWidth="3.5" />
        <path d="M 212,182 L 217,225" stroke="#1E2245" strokeWidth="3.5" />
        <path d="M 225,184 L 232,225" stroke="#1E2245" strokeWidth="3.5" />

        {/* Red Apron Straps */}
        <path d="M 178,183 L 176,225" stroke="#E31B23" strokeWidth="6" />
        <path d="M 222,183 L 224,225" stroke="#E31B23" strokeWidth="6" />
        <circle cx="177" cy="202" r="3" fill="#FFEC00" />
        <circle cx="223" cy="202" r="3" fill="#FFEC00" />

        {/* Open Arms & Hands */}
        <path d="M 165,190 Q 130,210 100,200 Q 120,222 150,220" fill="#FFEC00" stroke="#1E2245" strokeWidth="3" />
        <path d="M 235,190 Q 270,170 305,175 Q 285,200 250,220" fill="#FFEC00" stroke="#1E2245" strokeWidth="3" />

        {/* Hands */}
        <ellipse cx="98" cy="200" rx="9" ry="7" fill="#FFE0B2" stroke="#1E2245" strokeWidth="2.5" />
        <ellipse cx="304" cy="176" rx="9" ry="7" fill="#FFE0B2" stroke="#1E2245" strokeWidth="2.5" />

        {/* Loaves of Bread */}
        <ellipse cx="125" cy="216" rx="30" ry="14" fill="#FFA000" stroke="#1E2245" strokeWidth="3" />
        <ellipse cx="200" cy="212" rx="42" ry="18" fill="#FFB300" stroke="#1E2245" strokeWidth="3" />
        <ellipse cx="275" cy="216" rx="30" ry="14" fill="#FFA000" stroke="#1E2245" strokeWidth="3" />

        {/* Score lines on Bread */}
        <path d="M 115,212 Q 120,220 125,212" stroke="#1E2245" strokeWidth="2" />
        <path d="M 128,212 Q 133,220 138,212" stroke="#1E2245" strokeWidth="2" />
        <path d="M 185,208 Q 190,220 195,208" stroke="#1E2245" strokeWidth="2.5" />
        <path d="M 200,208 Q 205,220 210,208" stroke="#1E2245" strokeWidth="2.5" />
        <path d="M 265,212 Q 270,220 275,212" stroke="#1E2245" strokeWidth="2" />
      </g>

      {/* --- RED MAIN BADGE ("ESPAÑOLA") --- */}
      <rect
        x="10"
        y="218"
        width="380"
        height="64"
        rx="16"
        fill="#E31B23"
        stroke="#1E2245"
        strokeWidth="3.5"
      />
      {/* High Contrast White Bold Brand Name */}
      <text
        x="200"
        y="262"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontSize="48"
        fontWeight="900"
        letterSpacing="3"
      >
        ESPAÑOLA
      </text>

      {/* --- DARK NAVY SLOGAN BADGE ("El Secreto del Mejor Pan!") --- */}
      <rect
        x="50"
        y="278"
        width="300"
        height="38"
        rx="10"
        fill="#1E2245"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      {/* High Contrast White Italic Slogan */}
      <text
        x="200"
        y="303"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="20"
        fontWeight="bold"
        fontStyle="italic"
        letterSpacing="0.5"
      >
        El Secreto del Mejor Pan!
      </text>
    </svg>
  );
};

export const EspañolaLogo: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 48,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        <EspañolaFullLogo width={size * 1.3} height={size} className="drop-shadow-sm" />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
          ESPAÑOLA
        </span>
        <span className="text-[11px] font-bold text-amber-700 tracking-wide uppercase mt-1">
          El Secreto del Mejor Pan!
        </span>
      </div>
    </div>
  );
};

export const YeyeLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-xs px-2.5 py-1 rounded-md tracking-wider uppercase shadow-xs border border-orange-500/30 ${className}`}
    >
      YEYÉ<span className="text-[8px] align-super ml-0.5">®</span>
    </div>
  );
};

/**
 * YEYÉ NUEVO LOGO Vector SVG Component
 * Recreates the exact typography and visual identity of the Yeyé brand logo:
 * Heavy red rounded lettering with signature royal blue dot over the second 'e' and registered ® emblem.
 */
export const YeyeNuevoLogo: React.FC<{
  className?: string;
  width?: number | string;
  height?: number | string;
}> = ({ className = '', width = 280, height = 140 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 520 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`max-w-full ${className}`}
    >
      <g id="yeye-nuevo-logo">
        {/* Letter 'Y' */}
        <path
          d="M 22 24 L 78 24 L 78 92 C 78 120 70 178 70 178 L 118 178 C 118 178 126 122 126 92 L 126 24 L 182 24 L 126 108 L 126 198 C 126 206 120 212 112 212 L 92 212 C 84 212 78 206 78 198 L 78 114 Z"
          fill="#FF3515"
        />
        {/* Fill for smooth curves of 'Y' */}
        <path
          d="M 22 24 C 22 24 72 108 78 120 L 78 198 C 78 206 84 212 92 212 L 112 212 C 120 212 126 206 126 198 L 126 120 C 132 108 182 24 182 24 L 132 24 L 102 82 L 72 24 Z"
          fill="#FF3515"
        />

        {/* Letter 'e' (1) */}
        <path
          d="M 228 132 C 228 92 200 78 168 78 C 132 78 102 106 102 148 C 102 188 130 214 168 214 C 198 214 222 198 230 172 L 186 162 C 182 174 174 180 164 180 C 150 180 142 168 142 152 L 226 152 C 228 144 228 138 228 132 Z M 142 134 C 144 120 154 110 166 110 C 178 110 186 120 186 134 L 142 134 Z"
          fill="#FF3515"
        />

        {/* Letter 'y' (2) */}
        <path
          d="M 234 82 L 278 82 L 306 142 L 334 82 L 378 82 L 322 184 C 308 212 290 228 264 228 L 244 228 L 244 196 L 258 196 C 272 196 280 188 286 174 L 234 82 Z"
          fill="#FF3515"
        />

        {/* Letter 'e' (2) */}
        <path
          d="M 480 132 C 480 92 452 78 420 78 C 384 78 354 106 354 148 C 354 188 382 214 420 214 C 450 214 474 198 482 172 L 438 162 C 434 174 426 180 416 180 C 402 180 394 168 394 152 L 478 152 C 480 144 480 138 480 132 Z M 394 134 C 396 120 406 110 418 110 C 430 110 438 120 438 134 L 394 134 Z"
          fill="#FF3515"
        />

        {/* SIGNATURE ROYAL BLUE DOT over the second 'e' */}
        <circle cx="434" cy="46" r="30" fill="#1D4ED8" />

        {/* TRADEMARK REGISTERED SYMBOL ® */}
        <g transform="translate(468, 172)">
          <circle cx="16" cy="16" r="14" stroke="#FF3515" strokeWidth="3" fill="none" />
          <text
            x="16"
            y="21.5"
            textAnchor="middle"
            fill="#FF3515"
            fontSize="16"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            R
          </text>
        </g>
      </g>
    </svg>
  );
};


