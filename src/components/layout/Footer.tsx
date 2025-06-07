// components/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigation } from '../../hooks/useNavigation';

const Footer: React.FC = () => {
  const { navigateToPage } = useNavigation();
  
  return (
    <footer className="p-4 footer">
      <div className="container mx-auto flex justify-center items-center gap-4">
        <p className="typography">
          &copy; {new Date().getFullYear()} D&D Campaign Companion
        </p>
        
        <Link 
          to="/privacy" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/privacy');
          }}
          className="text-sm hover:underline typography"
        >
          Privacy Policy
        </Link>
        
        <Link 
          to="/contact" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/contact');
          }}
          className="text-sm hover:underline typography"
        >
          Contact Us
        </Link>
      </div>
    </footer>
  );
};

export default Footer;