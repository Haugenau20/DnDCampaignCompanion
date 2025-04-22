// src/components/features/story/books/BookAged.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookAged: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with aged/weathered appearance */}
        <rect width="60" height="150" fill="#937E62" />
        
        {/* Weathered texture */}
        <rect width="60" height="150" fill="url(#agedTexture)" opacity="0.8" />
        
        {/* Cracks and damage */}
        <path d="M10 30 L20 32 L30 28 L40 33 L50 31" stroke="#5D4F3E" strokeWidth="0.7" fill="none" />
        <path d="M15 50 L25 48 L35 52 L45 47" stroke="#5D4F3E" strokeWidth="0.7" fill="none" />
        <path d="M20 100 L30 102 L40 98 L50 103" stroke="#5D4F3E" strokeWidth="0.7" fill="none" />
        <path d="M10 120 L20 122 L30 118 L40 123" stroke="#5D4F3E" strokeWidth="0.7" fill="none" />
        <path d="M5 70 L55 80" stroke="#5D4F3E" strokeWidth="0.5" fill="none" />
        
        {/* Worn-out binding */}
        <rect x="0" y="0" width="60" height="8" fill="#8F7B65" />
        <rect x="0" y="142" width="60" height="8" fill="#8F7B65" />
        
        {/* Faded title area */}
        <rect x="10" y="40" width="40" height="20" fill="#A08B71" opacity="0.7" />
        <rect x="15" y="45" width="30" height="10" fill="#5D4F3E" opacity="0.4" />
        
        {/* Spine details */}
        <rect x="25" y="8" width="10" height="134" fill="#7A684F" opacity="0.7" />
        
        {/* Water damage stain */}
        <ellipse cx="30" cy="110" rx="25" ry="20" fill="#5D4F3E" opacity="0.3" />
        
        {/* Worn corners */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#7A684F" opacity="0.6" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#7A684F" opacity="0.6" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#7A684F" opacity="0.6" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#7A684F" opacity="0.6" />
        
        {/* Aged texture pattern */}
        <defs>
            <pattern id="agedTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#937E62" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#5D4F3E" strokeWidth="0.2" />
            <rect x="5" y="5" width="10" height="10" fill="#5D4F3E" opacity="0.1" />
            <circle cx="15" cy="15" r="3" fill="#5D4F3E" opacity="0.1" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookAged;