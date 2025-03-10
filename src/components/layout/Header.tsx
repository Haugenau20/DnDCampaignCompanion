// components/layout/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from '../shared/SearchBar';
import ThemeSelector from '../shared/ThemeSelector';
import UserProfileButton from '../features/auth/UserProfileButton';
import { useNavigation } from '../../hooks/useNavigation';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';

const Header: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <header className={clsx(
      'p-4',
      `${themePrefix}-header`
    )}>
      <div className="container justify-center mx-auto flex items-center gap-4">
      <Link 
          to="/" 
          onClick={(e) => {
            e.preventDefault();
            navigateToPage('/');
          }}
          className={clsx(
            'text-xl font-bold',
            `${themePrefix}-header-title`
          )}
        >
          D&D Campaign Companion
        </Link>
        
        <div className="flex-1 max-w-2xl mx-4 hidden md:block">
          <SearchBar />
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeSelector />
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
};

export default Header;