import React from 'react';

interface LuxuryLogoProps {
  className?: string;
  size?: number;
}

export const LuxuryLogo: React.FC<LuxuryLogoProps> = ({ className = "w-8 h-8", size }) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;
  
  return (
    <svg 
      className={className} 
      style={style}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle cx="50" cy="50" r="46" fill="#F4F2EB" stroke="#d4af37" strokeWidth="2.5" />
      
      {/* Mannequin stand top (dark grey) */}
      <circle cx="50" cy="20" r="4.5" fill="#2C2A29" />
      <path d="M47 24.5 C47 24.5 48 31 46 33 H54 C52 31 53 24.5 53 24.5 Z" fill="#2C2A29" />
      
      {/* White Shirt Collar */}
      <path d="M40 33 L50 46 L60 33 L50 35 Z" fill="#FFFFFF" stroke="#2C2A29" strokeWidth="1" />
      <path d="M40 33 L50 46 L46 33 Z" fill="#FFFFFF" stroke="#2C2A29" strokeWidth="1" />
      <path d="M60 33 L50 46 L54 33 Z" fill="#FFFFFF" stroke="#2C2A29" strokeWidth="1" />
      
      {/* Dark Tie */}
      <path d="M48.5 46 L51.5 46 L53 51 L47 51 Z" fill="#2C2A29" />
      <path d="M47 51 L53 51 L51.5 75 L48.5 75 Z" fill="#2C2A29" />
      
      {/* Suit Coat (Dark Grey) */}
      <path d="M22 55 C22 41 41 33 41 33 L47 64 L37 86 C31 82 22 72 22 55 Z" fill="#2C2A29" stroke="#E5E3DB" strokeWidth="1.2" />
      <path d="M78 55 C78 41 59 33 59 33 L53 64 L63 86 C69 82 78 72 78 55 Z" fill="#2C2A29" stroke="#E5E3DB" strokeWidth="1.2" />
      
      {/* Pocket Square (White) */}
      <rect x="63" y="55" width="8" height="3" transform="rotate(-15 63 55)" fill="#FFFFFF" />
    </svg>
  );
};
