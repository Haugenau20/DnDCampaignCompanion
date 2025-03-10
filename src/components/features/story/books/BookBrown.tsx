// src/components/features/story/books/BookBrown.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookBrown: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with embossed pattern - Brown */}
        <rect width="60" height="150" fill="#8B4513" />
        
        {/* Leather texture */}
        <rect width="60" height="150" fill="url(#brownLeather)" opacity="0.6" />
        
        {/* Spine details */}
        <rect x="25" y="5" width="10" height="140" fill="#5C2E0D" />
        
        {/* Raised bands */}
        <rect x="5" y="30" width="50" height="7" rx="3.5" ry="3.5" fill="#A0522D" />
        <rect x="5" y="60" width="50" height="7" rx="3.5" ry="3.5" fill="#A0522D" />
        <rect x="5" y="90" width="50" height="7" rx="3.5" ry="3.5" fill="#A0522D" />
        <rect x="5" y="120" width="50" height="7" rx="3.5" ry="3.5" fill="#A0522D" />
        
        {/* Gilded details */}
        <rect x="0" y="0" width="60" height="5" fill="#D4AF37" />
        <rect x="0" y="145" width="60" height="5" fill="#D4AF37" />
        <path d="M15 45 H45 M15 75 H45 M15 105 H45" stroke="#D4AF37" stroke-width="1" />
        
        {/* Embossed coat of arms */}
        <path d="M25 60 L35 60 L35 85 L30 90 L25 85 Z" fill="#A0522D" />
        <path d="M28 65 L32 65 L32 80 L30 82 L28 80 Z" fill="#5C2E0D" />
        
        {/* Brass corner protectors */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#B5A642" opacity="0.7" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#B5A642" opacity="0.7" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#B5A642" opacity="0.7" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#B5A642" opacity="0.7" />
        
        {/* Leather pattern definition */}
        <defs>
            <pattern id="brownLeather" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#8B4513" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#5C2E0D" stroke-width="0.5" />
            <circle cx="10" cy="10" r="3" fill="#5C2E0D" opacity="0.3" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookBrown;