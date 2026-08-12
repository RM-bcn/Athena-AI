import React from 'react';
import { Sailboat } from 'lucide-react';

/** A fixed, decorative Greek map for the itinerary route header. */
export const RouteMapBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 360"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="greek-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9e7f2" />
          <stop offset="0.58" stopColor="#d7f5f8" />
          <stop offset="1" stopColor="#f3fcfb" />
        </linearGradient>
        <linearGradient id="greek-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset="1" stopColor="#f5edcc" />
        </linearGradient>
        <filter id="boat-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#005BAE" floodOpacity="0.16" />
        </filter>
      </defs>

      <rect width="1200" height="360" fill="url(#greek-sea)" />

      {/* Soft hand-drawn sea lines */}
      <path d="M-40 74 C150 28 270 105 440 65 S770 22 1240 78" fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.42" />
      <path d="M-70 178 C140 128 278 205 470 166 S845 120 1260 176" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.36" />
      <path d="M-40 286 C190 234 340 316 550 271 S890 224 1250 281" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.34" />

      {/* Stylised mainland Greece and Peloponnese */}
      <path
        d="M92 54 C130 38 171 45 190 66 L224 64 L247 88 L285 92 L300 119 L337 122 L354 150 L337 177 L307 170 L291 194 L263 187 L247 211 L220 200 L203 220 L174 204 L159 179 L130 177 L139 149 L116 127 L126 99 L99 84 Z"
        fill="url(#greek-land)"
        stroke="#e4d49b"
        strokeWidth="3"
      />
      <path
        d="M170 201 L199 213 L216 239 L205 267 L181 286 L151 275 L142 249 L119 233 L135 211 Z"
        fill="url(#greek-land)"
        stroke="#e4d49b"
        strokeWidth="3"
      />
      <path
        d="M352 137 C372 126 397 135 405 153 L397 176 L378 190 L355 179 L343 158 Z"
        fill="url(#greek-land)"
        stroke="#e4d49b"
        strokeWidth="3"
      />

      {/* Euboea and the Cyclades as a friendly island scatter */}
      <path d="M432 76 C451 68 469 81 468 101 L454 130 L443 158 L428 145 L436 116 L423 95 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />
      <path d="M548 112 C568 101 591 109 598 126 L585 143 L558 140 L540 128 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />
      <path d="M625 164 C646 153 671 162 674 180 L657 193 L630 189 L615 177 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />
      <path d="M712 111 C731 100 753 108 756 125 L741 140 L716 136 L702 124 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />
      <path d="M785 188 C803 176 825 183 830 199 L814 214 L790 210 L777 199 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />
      <path d="M879 126 C893 116 912 122 916 136 L902 148 L882 145 L872 136 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />
      <path d="M958 207 C976 196 999 204 1002 220 L986 235 L961 230 L949 220 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />

      {/* Crete */}
      <path d="M632 302 C688 278 763 278 832 294 C859 300 876 314 851 324 C776 340 690 337 625 320 C613 316 616 308 632 302 Z" fill="url(#greek-land)" stroke="#e4d49b" strokeWidth="3" />

      {/* Decorative island route, intentionally independent from the itinerary data */}
      <path
        d="M395 157 C492 122 540 147 598 174 S722 143 787 195 S906 174 974 218"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M395 157 C492 122 540 147 598 174 S722 143 787 195 S906 174 974 218"
        fill="none"
        stroke="#70b9dc"
        strokeWidth="3"
        strokeDasharray="14 13"
        strokeLinecap="round"
        opacity="0.62"
      />

      <g fill="#70b9dc" opacity="0.82">
        <circle cx="395" cy="157" r="8" />
        <circle cx="598" cy="174" r="8" />
        <circle cx="787" cy="195" r="8" />
        <circle cx="974" cy="218" r="8" />
      </g>
      <g fill="#ffffff">
        <circle cx="395" cy="157" r="3" />
        <circle cx="598" cy="174" r="3" />
        <circle cx="787" cy="195" r="3" />
        <circle cx="974" cy="218" r="3" />
      </g>

      <text x="830" y="78" fill="#277fa8" fontSize="18" fontWeight="700" letterSpacing="5" opacity="0.38">
        GREEK ISLANDS
      </text>
      <text x="855" y="99" fill="#277fa8" fontSize="11" fontWeight="600" letterSpacing="3" opacity="0.3">
        AEGEAN SEA
      </text>
    </svg>

    <div
      className="absolute left-[58%] top-[20%] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#005BAE] text-white shadow-lg"
      style={{ filter: 'drop-shadow(0 5px 5px rgba(0, 91, 174, 0.16))' }}
    >
      <Sailboat className="h-7 w-7" strokeWidth={1.8} />
    </div>
  </div>
);
