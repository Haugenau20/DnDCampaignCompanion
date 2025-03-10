// src/components/features/story/books/BookManuscript.tsx
import React from 'react';

interface BookProps {
  height: number;
  className?: string;
}

const BookManuscript: React.FC<BookProps> = ({ height, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 60 150"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
        {/* Book spine with manuscript appearance - Parchment base */}
        <rect width="60" height="150" fill="#F2E8C9" />
        
        {/* Parchment texture */}
        <rect width="60" height="150" fill="url(#parchmentTexture)" opacity="0.8" />
        
        {/* Faded ink stains */}
        <ellipse cx="20" cy="30" rx="15" ry="10" fill="#5D4C3C" opacity="0.2" />
        <ellipse cx="40" cy="100" rx="10" ry="15" fill="#5D4C3C" opacity="0.2" />
        <ellipse cx="15" cy="120" rx="8" ry="5" fill="#5D4C3C" opacity="0.2" />
        
        {/* Binding stitches */}
        <line x1="10" y1="10" x2="10" y2="140" stroke="#8B5A2B" stroke-width="0.8" stroke-dasharray="10,5" />
        <line x1="50" y1="10" x2="50" y2="140" stroke="#8B5A2B" stroke-width="0.8" stroke-dasharray="10,5" />
        
        {/* Handwritten text lines */}
        <line x1="15" y1="20" x2="45" y2="20" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="30" x2="45" y2="30" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="40" x2="45" y2="40" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="50" x2="45" y2="50" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="60" x2="45" y2="60" stroke="#5D4C3C" stroke-width="0.5" />
        
        <line x1="15" y1="80" x2="45" y2="80" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="90" x2="45" y2="90" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="100" x2="45" y2="100" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="110" x2="45" y2="110" stroke="#5D4C3C" stroke-width="0.5" />
        <line x1="15" y1="120" x2="45" y2="120" stroke="#5D4C3C" stroke-width="0.5" />
        
        {/* Illuminated initial area */}
        <rect x="15" y="65" width="30" height="10" fill="#F5E5BC" stroke="#8B5A2B" stroke-width="0.5" />
        <path d="M20 65 L20 75 M20 70 L25 65 L25 75" stroke="#8B0000" stroke-width="1" />
        <circle cx="30" cy="70" r="3" fill="#DAA520" opacity="0.7" />
        
        {/* Slight wear on edges */}
        <rect x="0" y="0" width="60" height="5" fill="#E6D6A8" />
        <rect x="0" y="145" width="60" height="5" fill="#E6D6A8" />
        
        {/* Simple binding corners */}
        <path d="M0 0 L10 0 L10 10 L0 10 Z" fill="#8B5A2B" opacity="0.3" />
        <path d="M50 0 L60 0 L60 10 L50 10 Z" fill="#8B5A2B" opacity="0.3" />
        <path d="M0 140 L10 140 L10 150 L0 150 Z" fill="#8B5A2B" opacity="0.3" />
        <path d="M50 140 L60 140 L60 150 L50 150 Z" fill="#8B5A2B" opacity="0.3" />
        
        {/* Parchment pattern definition */}
        <defs>
        <pattern id="parchmentTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#F2E8C9" />
            <path d="M0 0 L20 20 M20 0 L0 20" stroke="#E6D6A8" stroke-width="0.3" />
            <ellipse cx="10" cy="10" rx="5" ry="3" fill="#E6D6A8" opacity="0.2" transform="rotate(45 10 10)" />
        </pattern>
        </defs>
    </svg>
  );
};

export default BookManuscript;