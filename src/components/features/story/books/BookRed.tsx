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
      {/* Book spine with embossed pattern - Red */}
      <rect width="60" height="150" fill="#8B3A3A" />
      
      {/* Spine details */}
      <rect x="25" y="5" width="10" height="140" fill="#732626" />
      
      {/* Gilded trim */}
      <rect x="0" y="0" width="60" height="5" fill="#D4AF37" />
      <rect x="0" y="145" width="60" height="5" fill="#D4AF37" />
      
      {/* Decorative pattern */}
      <path d="M10 30 Q30 25, 50 30 Q30 35, 10 30 Z" fill="#A05050" />
      <path d="M10 60 Q30 55, 50 60 Q30 65, 10 60 Z" fill="#A05050" />
      <path d="M10 90 Q30 85, 50 90 Q30 95, 10 90 Z" fill="#A05050" />
      <path d="M10 120 Q30 115, 50 120 Q30 125, 10 120 Z" fill="#A05050" />
      
      {/* Embossed medallion */}
      <circle cx="30" cy="75" r="15" fill="#A05050" />
      <circle cx="30" cy="75" r="10" fill="#732626" />
      <path d="M25 75 L35 75 M30 70 L30 80" stroke="#A05050" strokeWidth="2" />
      
      {/* Gold corner protectors */}
      <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#D4AF37" opacity="0.7" />
      <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#D4AF37" opacity="0.7" />
      <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#D4AF37" opacity="0.7" />
      <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#D4AF37" opacity="0.7" />
    </svg>
  );
};

export default BookRed;