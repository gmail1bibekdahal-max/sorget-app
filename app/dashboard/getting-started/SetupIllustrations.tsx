export function Step1Illustration() {
  return (
    <svg width="115" height="90" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clock in background */}
      <circle cx="28" cy="38" r="14" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 3"/>
      <line x1="28" y1="38" x2="28" y2="30" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="28" y1="38" x2="34" y2="38" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>

      {/* Code window in background */}
      <rect x="110" y="22" width="38" height="30" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2"/>
      <line x1="116" y1="28" x2="126" y2="28" stroke="#BB0C68" strokeWidth="2" strokeLinecap="round"/>
      <line x1="116" y1="34" x2="136" y2="34" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="116" y1="40" x2="132" y2="40" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Desk line */}
      <line x1="15" y1="102" x2="145" y2="102" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Coffee mug */}
      <rect x="122" y="86" width="12" height="15" rx="2" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5"/>
      <path d="M134 90C136 90 138 92 138 94C138 96 136 98 134 98" stroke="#94A3B8" strokeWidth="1.5"/>
      <path d="M125 82Q127 79 125 76" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Developer Character */}
      {/* Body / Sweater */}
      <path d="M56 100C56 82 66 75 80 75C94 75 104 82 104 100" fill="#BB0C68" fillOpacity="0.85"/>
      <path d="M72 75L80 84L88 75" fill="#FFFFFF"/>
      {/* Head */}
      <circle cx="80" cy="52" r="15" fill="#FED7AA"/>
      {/* Hair & Beard */}
      <path d="M68 47C68 38 73 34 80 34C87 34 92 38 92 47C92 49 91 51 90 52C88 47 85 45 80 45C75 45 72 47 70 52C69 51 68 49 68 47Z" fill="#7C2D12"/>
      <path d="M72 58C72 65 76 68 80 68C84 68 88 65 88 58C88 57 72 57 72 58Z" fill="#7C2D12"/>
      {/* Glasses */}
      <circle cx="75" cy="50" r="3.5" stroke="#3A313C" strokeWidth="1.2" fill="none"/>
      <circle cx="85" cy="50" r="3.5" stroke="#3A313C" strokeWidth="1.2" fill="none"/>
      <line x1="78.5" y1="50" x2="81.5" y2="50" stroke="#3A313C" strokeWidth="1.2"/>

      {/* Laptop */}
      <rect x="58" y="88" width="44" height="14" rx="2" fill="#3A313C"/>
      <rect x="62" y="73" width="36" height="22" rx="2" fill="#E2E8F0" stroke="#3A313C" strokeWidth="1.5"/>
      <rect x="65" y="76" width="30" height="15" rx="1" fill="#0F172A"/>
      <circle cx="80" cy="83" r="2.5" fill="#BB0C68"/>
    </svg>
  );
}

export function Step2Illustration() {
  return (
    <svg width="115" height="90" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Monitor base & stand */}
      <rect x="74" y="88" width="12" height="14" fill="#CBD5E1"/>
      <line x1="60" y1="102" x2="100" y2="102" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/>

      {/* Screen */}
      <rect x="48" y="38" width="64" height="50" rx="5" fill="#FFFFFF" stroke="#3A313C" strokeWidth="2"/>
      <rect x="52" y="42" width="56" height="38" rx="2" fill="#F8FAFC"/>
      
      {/* Form Fields on screen */}
      <rect x="56" y="47" width="22" height="5" rx="1" fill="#BB0C68" fillOpacity="0.4"/>
      <rect x="56" y="55" width="48" height="6" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1"/>
      <circle cx="60" cy="58" r="1.5" fill="#0284C7"/>
      <line x1="64" y1="58" x2="88" y2="58" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
      
      <rect x="56" y="65" width="48" height="6" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1"/>
      <circle cx="60" cy="68" r="1.5" fill="#BB0C68"/>
      <line x1="64" y1="68" x2="80" y2="68" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Robot robotic arm on left */}
      <circle cx="22" cy="100" r="8" fill="#E2E8F0" stroke="#64748b" strokeWidth="2"/>
      <line x1="22" y1="92" x2="32" y2="62" stroke="#64748b" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="32" cy="62" r="4" fill="#BB0C68"/>
      <line x1="32" y1="62" x2="52" y2="54" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="52" cy="54" r="3" fill="#3A313C"/>
      
      {/* Robot arm tool pointing to form field */}
      <path d="M52 51L58 53L52 56" stroke="#BB0C68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Gears / sparkles on right */}
      <circle cx="132" cy="55" r="10" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 3"/>
      <circle cx="132" cy="55" r="4" fill="#FED7AA"/>
      <line x1="126" y1="102" x2="148" y2="102" stroke="#CBD5E1" strokeWidth="2"/>
    </svg>
  );
}
