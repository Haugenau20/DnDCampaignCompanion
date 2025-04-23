// src/components/features/story/books/BookBlue.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookBlue: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with embossed pattern - Blue */}
        <rect width="60" height="150" fill="#2B547E" />
        
        {/* Leather texture */}
        <rect width="60" height="150" fill="url(#blueLeather)" opacity="0.6" />
        
        {/* Spine details */}
        <rect x="25" y="5" width="10" height="140" fill="#1A3457" />
        
        {/* Gilded trim */}
        <rect x="0" y="0" width="60" height="5" fill="#D4AF37" />
        <rect x="0" y="145" width="60" height="5" fill="#D4AF37" />
        
        {/* Decorative pattern */}
        <path d="M10 30 Q30 25, 50 30 Q30 35, 10 30 Z" fill="#3D6B99" />
        <path d="M10 60 Q30 55, 50 60 Q30 65, 10 60 Z" fill="#3D6B99" />
        <path d="M10 90 Q30 85, 50 90 Q30 95, 10 90 Z" fill="#3D6B99" />
        <path d="M10 120 Q30 115, 50 120 Q30 125, 10 120 Z" fill="#3D6B99" />
        
        {/* Embossed symbol */}
        <circle cx="30" cy="75" r="15" fill="#3D6B99" />
        <path d="M20 75 L40 75 M30 65 L30 85" stroke="#D4AF37" strokeWidth="1.5" />
        <circle cx="30" cy="75" r="7" fill="#1A3457" stroke="#D4AF37" strokeWidth="0.5" />
        
        {/* Silver corner protectors */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#C0C0C0" opacity="0.7" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#C0C0C0" opacity="0.7" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#C0C0C0" opacity="0.7" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#C0C0C0" opacity="0.7" />
        
        {/* Leather pattern definition */}
        <defs>
            <pattern id="blueLeather" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#2B547E" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#1A3457" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="3" fill="#1A3457" opacity="0.3" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookBlue;