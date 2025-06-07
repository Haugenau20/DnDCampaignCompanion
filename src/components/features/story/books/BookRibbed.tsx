// src/components/features/story/books/BookRed.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookRed: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with pronounced ribs - Royal blue base */}
        <rect width="60" height="150" fill="#1A365D" />
        
        {/* Texture */}
        <rect width="60" height="150" fill="url(#ribbedTexture)" opacity="0.7" />
        
        {/* Prominent spine ribs */}
        <rect x="0" y="20" width="60" height="6" rx="3" ry="3" fill="#0F2A4A" stroke="#8695A4" strokeWidth="0.5" />
        <rect x="0" y="40" width="60" height="6" rx="3" ry="3" fill="#0F2A4A" stroke="#8695A4" strokeWidth="0.5" />
        <rect x="0" y="60" width="60" height="6" rx="3" ry="3" fill="#0F2A4A" stroke="#8695A4" strokeWidth="0.5" />
        <rect x="0" y="80" width="60" height="6" rx="3" ry="3" fill="#0F2A4A" stroke="#8695A4" strokeWidth="0.5" />
        <rect x="0" y="100" width="60" height="6" rx="3" ry="3" fill="#0F2A4A" stroke="#8695A4" strokeWidth="0.5" />
        <rect x="0" y="120" width="60" height="6" rx="3" ry="3" fill="#0F2A4A" stroke="#8695A4" strokeWidth="0.5" />
        
        {/* Title area between ribs */}
        <rect x="10" y="43" width="40" height="20" fill="#263F6C" />
        <rect x="15" y="48" width="30" height="10" fill="#0F2A4A" />
        
        {/* Between-rib decorations */}
        <path d="M30 10 L30 17" stroke="#8695A4" strokeWidth="0.5" />
        <path d="M30 130 L30 137" stroke="#8695A4" strokeWidth="0.5" />
        
        <path d="M15 30 Q30 25, 45 30" stroke="#8695A4" strokeWidth="0.5" fill="none" />
        <path d="M15 35 Q30 40, 45 35" stroke="#8695A4" strokeWidth="0.5" fill="none" />
        
        <path d="M15 110 Q30 105, 45 110" stroke="#8695A4" strokeWidth="0.5" fill="none" />
        <path d="M15 115 Q30 120, 45 115" stroke="#8695A4" strokeWidth="0.5" fill="none" />
        
        {/* Decorative elements */}
        <circle cx="30" cy="30" r="3" fill="#8695A4" />
        <circle cx="30" cy="110" r="3" fill="#8695A4" />
        
        {/* Silver edging */}
        <rect x="0" y="0" width="60" height="5" fill="#8695A4" />
        <rect x="0" y="145" width="60" height="5" fill="#8695A4" />
        
        {/* Silver corners */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#8695A4" opacity="0.6" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#8695A4" opacity="0.6" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#8695A4" opacity="0.6" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#8695A4" opacity="0.6" />
        
        {/* Ribbed pattern definition */}
        <defs>
            <pattern id="ribbedTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#1A365D" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="#0F2A4A" strokeWidth="0.3" />
            <line x1="10" y1="0" x2="10" y2="20" stroke="#0F2A4A" strokeWidth="0.3" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookRed;