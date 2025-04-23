// src/components/features/story/books/BookGreen.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookGreen: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with embossed pattern - Green */}
        <rect width="60" height="150" fill="#2E8B57" />
        
        {/* Leather texture */}
        <rect width="60" height="150" fill="url(#greenLeather)" opacity="0.6" />
        
        {/* Spine details */}
        <rect x="25" y="5" width="10" height="140" fill="#1A5E3A" />
        
        {/* Gilded trim */}
        <rect x="0" y="0" width="60" height="5" fill="#D4AF37" />
        <rect x="0" y="145" width="60" height="5" fill="#D4AF37" />
        
        {/* Decorative swirls */}
        <path d="M5 25 Q15 15, 30 25 Q45 35, 55 25" stroke="#1A5E3A" strokeWidth="2" fill="none" />
        <path d="M5 50 Q15 40, 30 50 Q45 60, 55 50" stroke="#1A5E3A" strokeWidth="2" fill="none" />
        <path d="M5 100 Q15 90, 30 100 Q45 110, 55 100" stroke="#1A5E3A" strokeWidth="2" fill="none" />
        <path d="M5 125 Q15 115, 30 125 Q45 135, 55 125" stroke="#1A5E3A" strokeWidth="2" fill="none" />
        
        {/* Embossed foliage design */}
        <path d="M30 55 Q40 65, 30 75 Q20 85, 30 95 Q40 85, 30 75 Q20 65, 30 55 Z" fill="#3AA76D" />
        <path d="M20 70 Q30 60, 40 70 M20 80 Q30 90, 40 80" stroke="#1A5E3A" strokeWidth="1.5" fill="none" />
        
        {/* Bronze corner protectors */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#CD7F32" opacity="0.7" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#CD7F32" opacity="0.7" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#CD7F32" opacity="0.7" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#CD7F32" opacity="0.7" />
        
        {/* Leather pattern definition */}
        <defs>
            <pattern id="greenLeather" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#2E8B57" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#1A5E3A" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="3" fill="#1A5E3A" opacity="0.3" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookGreen;