// src/components/features/story/books/BookPurple.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookPurple: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with embossed pattern - Purple */}
        <rect width="60" height="150" fill="#614051" />
        
        {/* Leather texture */}
        <rect width="60" height="150" fill="url(#purpleLeather)" opacity="0.6" />
        
        {/* Spine details */}
        <rect x="25" y="5" width="10" height="140" fill="#412A38" />
        
        {/* Gilded trim */}
        <rect x="0" y="0" width="60" height="5" fill="#D4AF37" />
        <rect x="0" y="145" width="60" height="5" fill="#D4AF37" />
        
        {/* Decorative bands */}
        <rect x="5" y="30" width="50" height="5" fill="#8A6383" />
        <rect x="5" y="60" width="50" height="5" fill="#8A6383" />
        <rect x="5" y="90" width="50" height="5" fill="#8A6383" />
        <rect x="5" y="120" width="50" height="5" fill="#8A6383" />
        
        {/* Embossed ornament */}
        <polygon points="30,60 40,75 30,90 20,75" fill="#8A6383" />
        <circle cx="30" cy="75" r="8" fill="#412A38" />
        <path d="M27 72 L33 78 M33 72 L27 78" stroke="#8A6383" strokeWidth="1.5" />
        
        {/* Gold corner protectors with amethyst gems */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#D4AF37" opacity="0.7" />
        <circle cx="5" cy="5" r="2" fill="#9966CC" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#D4AF37" opacity="0.7" />
        <circle cx="55" cy="5" r="2" fill="#9966CC" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#D4AF37" opacity="0.7" />
        <circle cx="5" cy="145" r="2" fill="#9966CC" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#D4AF37" opacity="0.7" />
        <circle cx="55" cy="145" r="2" fill="#9966CC" />
        
        {/* Leather pattern definition */}
        <defs>
            <pattern id="purpleLeather" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#614051" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#412A38" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="3" fill="#412A38" opacity="0.3" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookPurple;