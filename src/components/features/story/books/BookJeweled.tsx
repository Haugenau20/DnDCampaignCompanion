// src/components/features/story/books/BookJeweled.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookJeweled: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with inlaid jewels - Rich black base */}
        <rect width="60" height="150" fill="#1C1C1C" />
        
        {/* Velvet texture */}
        <rect width="60" height="150" fill="url(#jeweledTexture)" opacity="0.9" />
        
        {/* Gold filigree border */}
        <rect x="5" y="5" width="50" height="140" fill="none" stroke="#D4AF37" strokeWidth="1" />
        
        {/* Central jeweled cross */}
        <rect x="25" y="30" width="10" height="90" fill="#D4AF37" />
        <rect x="15" y="60" width="30" height="10" fill="#D4AF37" />
        
        {/* Jewels in the cross */}
        {/* Ruby */}
        <circle cx="30" cy="40" r="5" fill="#A51C30" />
        <path d="M28 38 L32 42 M32 38 L28 42" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.7" />
        
        {/* Sapphire */}
        <circle cx="30" cy="65" r="5" fill="#0F52BA" />
        <path d="M28 63 L32 67 M32 63 L28 67" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.7" />
        
        {/* Emerald */}
        <circle cx="30" cy="90" r="5" fill="#046307" />
        <path d="M28 88 L32 92 M32 88 L28 92" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.7" />
        
        {/* Amethyst */}
        <circle cx="30" cy="115" r="5" fill="#9966CC" />
        <path d="M28 113 L32 117 M32 113 L28 117" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.7" />
        
        {/* Smaller accent jewels */}
        {/* Diamond */}
        <circle cx="15" cy="65" r="3" fill="#FFFFFF" />
        <circle cx="45" cy="65" r="3" fill="#FFFFFF" />
        
        {/* Topaz */}
        <circle cx="30" cy="25" r="3" fill="#FBCB7B" />
        <circle cx="30" cy="130" r="3" fill="#FBCB7B" />
        
        {/* Gold filigree accents */}
        <path d="M10 20 Q30 15, 50 20" stroke="#D4AF37" strokeWidth="0.7" fill="none" />
        <path d="M10 135 Q30 140, 50 135" stroke="#D4AF37" strokeWidth="0.7" fill="none" />
        
        {/* Gold corner protectors with jewels */}
        <path d="M0 0 L12 0 L12 12 L0 12 Z" fill="#D4AF37" opacity="0.9" />
        <circle cx="6" cy="6" r="3" fill="#A51C30" /> {/* Ruby */}
        
        <path d="M48 0 L60 0 L60 12 L48 12 Z" fill="#D4AF37" opacity="0.9" />
        <circle cx="54" cy="6" r="3" fill="#0F52BA" /> {/* Sapphire */}
        
        <path d="M0 138 L12 138 L12 150 L0 150 Z" fill="#D4AF37" opacity="0.9" />
        <circle cx="6" cy="144" r="3" fill="#046307" /> {/* Emerald */}
        
        <path d="M48 138 L60 138 L60 150 L48 150 Z" fill="#D4AF37" opacity="0.9" />
        <circle cx="54" cy="144" r="3" fill="#9966CC" /> {/* Amethyst */}
        
        {/* Velvet pattern definition */}
        <defs>
            <pattern id="jeweledTexture" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="#1C1C1C" />
            <path d="M0 5 Q5 0, 10 5 Q5 10, 0 5 Z" fill="#272727" opacity="0.5" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookJeweled;