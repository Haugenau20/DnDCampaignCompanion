// src/components/features/story/books/BookOrnate.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookOrnate: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with ornate gilding - Deep burgundy base */}
        <rect width="60" height="150" fill="#5E1914" />
        
        {/* Leather texture */}
        <rect width="60" height="150" fill="url(#ornateTexture)" opacity="0.7" />
        
        {/* Elaborate gilded frames */}
        <rect x="5" y="5" width="50" height="140" fill="none" stroke="#D4AF37" stroke-width="1" />
        <rect x="10" y="10" width="40" height="130" fill="none" stroke="#D4AF37" stroke-width="0.5" />
        
        {/* Ornate gilded corners */}
        <path d="M5 5 C10 10, 15 5, 20 5 C20 10, 15 15, 15 20 C10 20, 5 15, 5 10 Z" fill="#D4AF37" />
        <path d="M55 5 C50 10, 45 5, 40 5 C40 10, 45 15, 45 20 C50 20, 55 15, 55 10 Z" fill="#D4AF37" />
        <path d="M5 145 C10 140, 15 145, 20 145 C20 140, 15 135, 15 130 C10 130, 5 135, 5 140 Z" fill="#D4AF37" />
        <path d="M55 145 C50 140, 45 145, 40 145 C40 140, 45 135, 45 130 C50 130, 55 135, 55 140 Z" fill="#D4AF37" />
        
        {/* Gilded ornate centerpiece */}
        <circle cx="30" cy="75" r="20" fill="#5E1914" stroke="#D4AF37" stroke-width="1" />
        <path d="M30 55 L30 95 M20 65 L40 85 M40 65 L20 85" stroke="#D4AF37" stroke-width="1" fill="none" />
        <circle cx="30" cy="75" r="10" fill="#5E1914" stroke="#D4AF37" stroke-width="0.5" />
        <circle cx="30" cy="75" r="5" fill="#D4AF37" />
        
        {/* Ornate spine decorations */}
        <rect x="20" y="30" width="20" height="5" fill="#D4AF37" />
        <rect x="20" y="115" width="20" height="5" fill="#D4AF37" />
        
        {/* Ornate swirls */}
        <path d="M15 40 Q30 35, 45 40" stroke="#D4AF37" stroke-width="1" fill="none" />
        <path d="M15 45 Q30 50, 45 45" stroke="#D4AF37" stroke-width="1" fill="none" />
        <path d="M15 105 Q30 100, 45 105" stroke="#D4AF37" stroke-width="1" fill="none" />
        <path d="M15 110 Q30 115, 45 110" stroke="#D4AF37" stroke-width="1" fill="none" />
        
        {/* Detailed gilded pattern */}
        <defs>
            <pattern id="ornateTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#5E1914" />
            <path d="M5 0 L10 5 L15 0 M0 5 L5 10 L0 15 M20 5 L15 10 L20 15 M5 20 L10 15 L15 20" stroke="#D4AF37" stroke-width="0.3" fill="none" />
            <circle cx="10" cy="10" r="2" fill="#D4AF37" opacity="0.3" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookOrnate;