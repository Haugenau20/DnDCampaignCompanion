// components/layout/Header.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from '../shared/SearchBar';
import ThemeSelector from '../shared/ThemeSelector';
import UserProfileButton from '../features/auth/UserProfileButton';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/firebase';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import ContextSwitcher from '../shared/ContextSwitcher';
import Button from '../core/Button';
import { clsx } from 'clsx';

/**
 * Main application header with clean, minimal design
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themePrefix = theme.name;

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className={clsx(
      'p-4',
      `${themePrefix}-header`
    )}>
      <div className="container mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Left side - Logo */}
          <Link 
            to="/" 
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className={clsx(
              'text-xl font-bold',
              `${themePrefix}-header-title`
            )}
          >
            D&D Campaign Companion
          </Link>
          
          {/* Middle - Search */}
          <div className="flex-1 max-w-2xl px-4">
            <SearchBar />
          </div>
          
          {/* Right side - User Controls */}
          <div className="flex items-center gap-3">
            {/* Context Switcher - Only show if user is logged in */}
            {user && <ContextSwitcher />}
            
            <ThemeSelector />
            <UserProfileButton />
            
            {user && (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                startIcon={<LogOut className="w-5 h-5" />}
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
        
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between">
          {/* Mobile Logo */}
          <Link 
            to="/" 
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className={clsx(
              'text-lg font-bold',
              `${themePrefix}-header-title`
            )}
          >
            D&D Campaign
          </Link>
          
          {/* Mobile Controls */}
          <div className="flex items-center gap-2">
            <UserProfileButton />
            <button
              onClick={toggleMobileMenu}
              className={clsx(
                'p-2 rounded-md',
                `${themePrefix}-button-ghost`
              )}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={clsx(
            'md:hidden mt-4 p-4 rounded-lg',
            `${themePrefix}-card`
          )}>
            <div className="flex flex-col space-y-4">
              {/* Mobile Search */}
              <SearchBar />
              
              {/* Mobile Context Switcher */}
              {user && <ContextSwitcher />}
              
              {/* Mobile Theme */}
              <div className="flex items-center justify-between">
                <span className={clsx(`${themePrefix}-typography-secondary`)}>Theme</span>
                <ThemeSelector />
              </div>
              
              {/* Sign Out Button */}
              {user && (
                <Button
                  onClick={handleSignOut}
                  startIcon={<LogOut className="w-5 h-5" />}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;