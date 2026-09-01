// app/layout/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from 'shared/components/SearchBar';
import ThemeSelector from 'shared/components/ThemeSelector';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useAuth,
  useGroups,
  JoinGroupDialog,
  AdminPanel,
  UserProfile,
  SignInForm
} from 'features/user-management';
import { Menu, X, LogOut, ShieldAlert, UserPlus, User, LogIn, Bug } from 'lucide-react';
import ContextSwitcher from 'shared/components/context-switcher/ContextSwitcher';
import Button from 'core/components/Button';
import Dialog from 'core/components/Dialog';
import Navigation from './Navigation';

/**
 * Main application header with simplified layout
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { activeGroupUserProfile, refreshGroups, activeGroup, groups, setActiveGroup } = useGroups();
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
  const [showSignIn, setShowSignIn] = useState(false);

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

  /**
   * Open the contact page as a problem report, carrying where the user was.
   *
   * TODO(PR 4): this moves into the profile menu when that lands. The
   * `?from=` parameter must survive the move -- it is the only way the
   * report knows which page the problem was on, since by the time the form
   * renders the current path is always "/contact".
   */
  const handleReportProblem = () => {
    setMenuOpen(false);
    navigate(`/contact?from=${encodeURIComponent(location.pathname)}`);
  };

  // Handle join group click
  const handleJoinGroupClick = () => {
    setShowJoinGroup(true);
    setMenuOpen(false);
  };

  /**
   * One success behaviour for joining a group, from either entrance.
   *
   * Refreshing alone left the user in the group they were already in, staring
   * at a list they had just changed. joinGroupWithToken returns void and no id
   * reaches us, so the new group is the one that appears in the list; if none
   * does -- a re-join, or a race -- refresh and say nothing rather than guess.
   */
  const handleJoinedGroup = async () => {
    setShowJoinGroup(false);
    const before = new Set(groups.map((group) => group.id));
    const after = await refreshGroups();
    const joined = after?.find((group) => !before.has(group.id));
    if (joined) {
      await setActiveGroup(joined.id);
    }
  };

  // Handle admin click
  const handleAdminClick = () => {
    setShowAdmin(true);
    setMenuOpen(false);
  };

  // Handle sign in click
  const handleSignInClick = () => {
    setShowSignIn(true);
    setMenuOpen(false);
  };

  return (
    <header className="px-4 py-3 relative header">
      <div className='max-w-7xl mx-auto'>
        <div className="container mx-auto">
          {/* One bar carries branding, campaign context, navigation, search and
              account. This was three stacked layers — a header, a full-height
              navigation row, and a page-level view toggle — before any content. */}
          <div className="flex items-center gap-3">
            {/* Left side - Logo */}
            <Link
              to="/"
              onClick={(e) => {
              e.preventDefault();
              navigate('/');
              }}
              className="text-xl font-bold whitespace-nowrap header-title"
            >
              <span className="lg:inline hidden">D&D Campaign Companion</span>
              <span className="lg:hidden">D&D Companion</span>
            </Link>

            {/* Campaign context, and the door onto changing it. Previously a
                chip that opened a modal over the page it was about to
                change; now the popover's own anchor. */}
            {user && activeGroup && (
              <>
                <span
                  aria-hidden="true"
                  className="w-px h-6 self-center opacity-40 bg-secondary"
                ></span>
                <ContextSwitcher onJoinGroup={() => setShowJoinGroup(true)} />
              </>
            )}

            {/* Desktop navigation, inline rather than a second full-height row */}
            <Navigation variant="inline" />

            {/* Middle - Search */}
            <div className="flex-1 min-w-0 max-w-xs ml-auto px-1">
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

                        {/* Report a problem — contact is where bug reports
                            come from, and the footer was its only entrance */}
                        <Button
                          variant="ghost"
                          startIcon={<Bug size={24} className="primary" />}
                          iconPosition="top"
                          onClick={handleReportProblem}
                          className="flex flex-col items-center gap-1 button-ghost typography"
                          aria-label="Report a problem"
                        >
                          <span className="text-xs font-medium typography">Report</span>
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
      
      {/* Join Group Dialog -- the sole mount; ContextSwitcher's chip opens it
          through the `onJoinGroup` callback rather than mounting its own. */}
      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={handleJoinedGroup}
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