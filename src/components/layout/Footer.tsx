// components/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '../../hooks/useNavigation';
import { clsx } from 'clsx';

const Footer: React.FC = () => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;
  
  return (
    <footer className={clsx(
      'p-4',
      `${themePrefix}-footer`
    )}>
      <div className="container mx-auto flex justify-center items-center gap-4">
        <p className={clsx(`${themePrefix}-typography`)}>
          &copy; {new Date().getFullYear()} D&D Campaign Companion
        </p>
        
        <Link 
          to="/privacy" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/privacy');
          }}
          className={clsx(
            'text-sm hover:underline',
            `${themePrefix}-typography`
          )}
        >
          Privacy Policy
        </Link>
        
        <Link 
          to="/contact" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/contact');
          }}
          className={clsx(
            'text-sm hover:underline',
            `${themePrefix}-typography`
          )}
        >
          Contact Us
        </Link>
      </div>
    </footer>
  );
};

export default Footer;