export function Step1Illustration() {
  return (
    <svg width="110" height="85" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Subtle desk line */}
      <line x1="20" y1="102" x2="140" y2="102" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>

      {/* Code window in background */}
      <rect x="105" y="24" width="38" height="30" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5"/>
      <line x1="112" y1="32" x2="122" y2="32" stroke="#BB0C68" strokeWidth="2" strokeLinecap="round"/>
      <line x1="112" y1="38" x2="134" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="112" y1="44" x2="128" y2="44" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Coffee mug */}
      <rect x="118" y="88" width="10" height="14" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2"/>
      <path d="M128 91C130 91 131 92.5 131 94C131 95.5 130 97 128 97" stroke="#94a3b8" strokeWidth="1.2"/>

      {/* Developer Character (Subtle clean lines) */}
      <path d="M58 102C58 86 68 80 80 80C92 80 102 86 102 102" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M73 80L80 88L87 80" stroke="#64748b" strokeWidth="1.5" fill="#ffffff"/>
      {/* Head */}
      <circle cx="80" cy="58" r="14" fill="#ffffff" stroke="#64748b" strokeWidth="1.5"/>
      {/* Hair */}
      <path d="M69 54C69 46 74 42 80 42C86 42 91 46 91 54" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Glasses */}
      <circle cx="75.5" cy="56" r="3" stroke="#0f172a" strokeWidth="1.2" fill="none"/>
      <circle cx="84.5" cy="56" r="3" stroke="#0f172a" strokeWidth="1.2" fill="none"/>
      <line x1="78.5" y1="56" x2="81.5" y2="56" stroke="#0f172a" strokeWidth="1.2"/>

      {/* Laptop */}
      <rect x="60" y="90" width="40" height="12" rx="2" fill="#0f172a"/>
      <rect x="64" y="76" width="32" height="18" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
      <line x1="68" y1="83" x2="76" y2="83" stroke="#BB0C68" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="68" y1="87" x2="88" y2="87" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function Step2Illustration() {
  return (
    <svg width="110" height="85" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Desk line */}
      <line x1="20" y1="102" x2="140" y2="102" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>

      {/* Screen */}
      <rect x="52" y="38" width="56" height="46" rx="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
      <rect x="56" y="42" width="48" height="34" rx="2" fill="#f9fafb"/>
      
      {/* Form Fields on screen */}
      <line x1="62" y1="48" x2="74" y2="48" stroke="#BB0C68" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="62" y="53" width="36" height="5" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
      <rect x="62" y="62" width="36" height="5" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>

      {/* Stand */}
      <rect x="76" y="84" width="8" height="14" fill="#cbd5e1"/>
      <line x1="66" y1="98" x2="94" y2="98" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>

      {/* Robotic helper arm */}
      <circle cx="28" cy="98" r="6" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5"/>
      <line x1="28" y1="92" x2="38" y2="65" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="38" cy="65" r="3" fill="#BB0C68"/>
      <line x1="38" y1="65" x2="54" y2="55" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="54" cy="55" r="2.5" fill="#0f172a"/>
    </svg>
  );
}
