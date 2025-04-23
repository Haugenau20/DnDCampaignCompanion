// src/components/features/story/books/BookClasped.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookClasped: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with metal clasps */}
        <rect width="60" height="150" fill="#4B3B2C" />
        
        {/* Leather texture */}
        <rect width="60" height="150" fill="url(#leatherTexture)" opacity="0.7" />
        
        {/* Spine raised bands */}
        <rect x="0" y="30" width="60" height="8" fill="#3A2E20" />
        <rect x="0" y="60" width="60" height="8" fill="#3A2E20" />
        <rect x="0" y="90" width="60" height="8" fill="#3A2E20" />
        <rect x="0" y="120" width="60" height="8" fill="#3A2E20" />
        
        {/* Metal clasps on side of spine */}
        <rect x="2" y="15" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="4" y="20" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="7" cy="18" r="1.5" fill="#7A6E5D" />
        
        <rect x="2" y="45" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="4" y="50" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="7" cy="48" r="1.5" fill="#7A6E5D" />
        
        <rect x="2" y="75" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="4" y="80" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="7" cy="78" r="1.5" fill="#7A6E5D" />
        
        <rect x="2" y="105" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="4" y="110" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="7" cy="108" r="1.5" fill="#7A6E5D" />
        
        {/* Clasps on the opposite side */}
        <rect x="48" y="15" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="50" y="20" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="53" cy="18" r="1.5" fill="#7A6E5D" />
        
        <rect x="48" y="45" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="50" y="50" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="53" cy="48" r="1.5" fill="#7A6E5D" />
        
        <rect x="48" y="75" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="50" y="80" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="53" cy="78" r="1.5" fill="#7A6E5D" />
        
        <rect x="48" y="105" width="10" height="25" fill="#A19483" rx="2" ry="2" />
        <rect x="50" y="110" width="6" height="15" fill="#7A6E5D" rx="1" ry="1" />
        <circle cx="53" cy="108" r="1.5" fill="#7A6E5D" />
        
        {/* Embossed center design */}
        <rect x="20" y="45" width="20" height="60" rx="2" ry="2" fill="#5C4937" />
        <rect x="25" y="50" width="10" height="50" rx="1" ry="1" fill="#4B3B2C" />
        <line x1="30" y1="50" x2="30" y2="100" stroke="#A19483" strokeWidth="0.5" />
        
        {/* Metal edges */}
        <rect x="0" y="0" width="60" height="5" fill="#A19483" />
        <rect x="0" y="145" width="60" height="5" fill="#A19483" />
        
        {/* Leather pattern definition */}
        <defs>
            <pattern id="leatherTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#4B3B2C" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#3A2E20" strokeWidth="0.3" />
            <circle cx="10" cy="10" r="3" fill="#3A2E20" opacity="0.2" />
            </pattern>
        </defs>
    </svg>
  );
};

export default BookClasped;