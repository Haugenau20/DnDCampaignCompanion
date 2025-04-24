// components/layout/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from '../shared/SearchBar';
import ThemeSelector from '../shared/ThemeSelector';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/firebase';
import { useGroups, useCampaigns } from '../../context/firebase';
import { Menu, X, LogOut, ShieldAlert, UserPlus, User, Book, ChevronDown, Users, LogIn } from 'lucide-react';
import ContextSwitcher from '../shared/ContextSwitcher';
import Button from '../core/Button';
import Typography from '../core/Typography';
import Dialog from '../core/Dialog';
import { clsx } from 'clsx';
import JoinGroupDialog from '../features/groups/JoinGroupDialog';
import AdminPanel from '../features/auth/adminPanel/AdminPanel';
import UserProfile from '../features/auth/UserProfile';
import SignInForm from '../features/auth/SignInForm';

/**
 * Main application header with simplified layout
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeGroupUserProfile, refreshGroups, activeGroup } = useGroups();
  const { activeCampaignId, campaigns } = useCampaigns();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  const isAdmin = activeGroupUserProfile?.role === 'admin' || false;
  
  // Dialog states
  const [showProfile, setShowProfile] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showContextSwitcher, setShowContextSwitcher] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Get the active campaign name
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Position the menu under the hamburger button
  useEffect(() => {
    if (menuOpen && menuButtonRef.current && menuContainerRef.current) {
      const buttonRect = menuButtonRef.current.getBoundingClientRect();
      // Position the menu below the button
      menuContainerRef.current.style.top = `${buttonRect.bottom}px`;
      menuContainerRef.current.style.right = `${window.innerWidth - buttonRect.right}px`;
    }
  }, [menuOpen]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      setMenuOpen(false); // Close menu after signing out
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Toggle menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  // Handle profile click
  const handleProfileClick = () => {
    setShowProfile(true);
    setMenuOpen(false);
  };
  
  // Handle join group click
  const handleJoinGroupClick = () => {
    setShowJoinGroup(true);
    setMenuOpen(false);
  };
  
  // Handle admin click
  const handleAdminClick = () => {
    setShowAdmin(true);
    setMenuOpen(false);
  };

  // Handle context switcher click
  const handleContextSwitcherClick = () => {
    setShowContextSwitcher(true);
    setMenuOpen(false);
  };
  
  // Handle sign in click
  const handleSignInClick = () => {
    setShowSignIn(true);
    setMenuOpen(false);
  };

  return (
    <header className="p-4 relative header">
      <div className='max-w-7xl mx-auto'>
        <div className="container mx-auto">
          {/* Main Header - Both Desktop and Mobile */}
          <div className="flex items-center justify-center gap-2">
            {/* Left side - Logo */}
            <Link 
              to="/" 
              onClick={(e) => {
              e.preventDefault();
              navigate('/');
              }}
              className="text-xl font-bold whitespace-nowrap header-title"
            >
              <span className="md:inline hidden">D&D Campaign Companion</span>
              <span className="md:hidden">D&D Campaign</span>
            </Link>
            
            {/* Middle - Search */}
            <div className="flex-1 max-w-xl px-2 md:px-4">
              <SearchBar />
            </div>
            
            {/* Right side - Menu Button + Sign In/Out */}
            <div className="flex items-center justify-center gap-2">
              {/* Menu Button */}
              <button
              ref={menuButtonRef}
              onClick={toggleMenu}
              className="p-2 rounded-md button-ghost"
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="header-menu"
              >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              {/* Sign Out Button - Always visible on desktop when logged in */}
              {user ? (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                startIcon={<LogOut className="w-5 h-5" />}
                className="hidden md:flex"
              >
                <span className="hidden lg:inline">Sign Out</span>
              </Button>
              ) : (
              /* Sign In Button - Always visible on desktop when not logged in */
              <Button
                variant="ghost"
                onClick={handleSignInClick}
                startIcon={<LogIn className="w-5 h-5" />}
                className="hidden md:flex"
              >
                <span className="hidden lg:inline">Sign In</span>
              </Button>
              )}
            </div>
          </div>
          
          {/* Menu Dropdown */}
          {menuOpen && (
            <div 
              ref={menuContainerRef}
              className="fixed" 
              style={{ zIndex: 50 }}
            >
              <div 
                id="header-menu"
                ref={menuRef}
                className="mt-2 p-4 rounded-lg shadow-lg w-72 card"
              >
                <div className="flex flex-col space-y-4">
                  {user ? (
                    /* Account section - only when logged in */
                    <div>
                      <h3 className="mb-3 font-medium typography">
                        Account
                      </h3>
                      
                      {/* Icon Buttons Row */}
                      <div className="flex gap-4 justify-center">
                        {/* Profile Button */}
                        <Button
                          variant="ghost"
                          startIcon={<User size={24} className="primary" />}
                          iconPosition="top"
                          onClick={handleProfileClick}
                          className="flex flex-col items-center gap-1 button-ghost typography"
                          aria-label="Profile"
                        >
                          <span className="text-xs font-medium typography">Profile</span>
                        </Button>
                        
                        {/* Join Group Button */}
                        <Button
                          variant="ghost"
                          startIcon={<UserPlus size={24} className="primary" />}
                          iconPosition="top"
                          onClick={handleJoinGroupClick}
                          className="flex flex-col items-center gap-1 button-ghost typography"
                          aria-label="Join Group"
                        >
                          <span className="text-xs font-medium typography">Groups</span>
                        </Button>
                        
                        {/* Admin Button - only if admin */}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            startIcon={<ShieldAlert size={24} className="primary" />}
                            iconPosition="top"
                            onClick={handleAdminClick}
                            className="flex flex-col items-center gap-1 button-ghost typography"
                            aria-label="Admin"
                          >
                            <span className="text-xs font-medium typography">Admin</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Sign In Section - Only when not logged in */
                    <div>
                      <h3 className="mb-3 font-medium lg:hidden md:hidden typography">
                        Account
                      </h3>
                      <Button
                        onClick={handleSignInClick}
                        startIcon={<LogIn className="w-5 h-5" />}
                        className="w-full lg:hidden md:hidden"
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                  
                  {/* Campaign Section - Only when logged in */}
                  {user && (
                    <div className="pt-4">
                      <h3 className="mb-3 font-medium typography">
                        Campaign
                      </h3>
                      
                      {/* Group Display */}
                      <div className="mb-2">
                        <Typography variant="body-sm" color="secondary">Group:</Typography>
                        <div className="flex items-center mt-1 pl-1">
                          <Users size={18} className="mr-2 flex-shrink-0 primary" />
                          <Typography className="flex-1 truncate">
                            {activeGroup ? activeGroup.name : 'No Group Selected'}
                          </Typography>
                        </div>
                      </div>
                      
                      {/* Campaign Display */}
                      <div className="mb-3">
                        <Typography variant="body-sm" color="secondary">Campaign:</Typography>
                        <div className="flex items-center mt-1 pl-1">
                          <Book size={18} className="mr-2 flex-shrink-0 primary" />
                          <Typography className="flex-1 truncate">
                            {activeCampaign ? activeCampaign.name : 'No Campaign Selected'}
                          </Typography>
                        </div>
                      </div>
                      
                      {/* Change Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={handleContextSwitcherClick}
                        endIcon={<ChevronDown size={16} />}
                      >
                        Change
                      </Button>
                    </div>
                  )}

                  {/* Appearance Section - Always visible */}
                  <div className="pt-4">
                    <h3 className="mb-3 font-medium typography">
                      Appearance
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="typography">Theme</span>
                        <ThemeSelector />
                    </div>
                  </div>
                  
                  {/* Sign Out button - Mobile only */}
                  {user && (
                    <div className="pt-3">
                      <Button
                        onClick={handleSignOut}
                        startIcon={<LogOut className="w-5 h-5" />}
                        className="w-full md:hidden"
                      >
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Dialog */}
      <Dialog
        open={showProfile}
        onClose={() => setShowProfile(false)}
        title={`${activeGroupUserProfile?.username}'s profile` || 'Your Profile'}
        maxWidth="max-w-md"
      >
        <UserProfile 
          onSaved={() => setShowProfile(false)}
          onCancel={() => setShowProfile(false)}
        />
      </Dialog>
      
      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={() => {
          if (refreshGroups) {
            refreshGroups();
          }
        }}
      />
      
      {/* Admin Panel Dialog */}
      <Dialog
        open={showAdmin}
        onClose={() => setShowAdmin(false)}
        title="Admin Panel"
        maxWidth="max-w-4xl"
      >
        <AdminPanel 
          onClose={() => setShowAdmin(false)}
        />
      </Dialog>
      
      {/* Context Switcher Dialog */}
      <Dialog
        open={showContextSwitcher}
        onClose={() => setShowContextSwitcher(false)}
        title="Select Group and Campaign"
        maxWidth="max-w-md"
      >
        <div className="p-4">
          <ContextSwitcher 
            inDialog={true} 
            onClose={() => setShowContextSwitcher(false)} 
          />
        </div>
      </Dialog>
      
      {/* Sign In Dialog */}
      <Dialog
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        title="Sign In"
        maxWidth="max-w-md"
      >
        <SignInForm 
          onSuccess={() => setShowSignIn(false)} 
        />
      </Dialog>
    </header>
  );
};

export default Header;