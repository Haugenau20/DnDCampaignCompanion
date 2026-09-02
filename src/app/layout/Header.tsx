// app/layout/Header.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from 'shared/components/SearchBar';
import ThemeSelector from 'shared/components/ThemeSelector';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  useGroups,
  useJoinGroupCompletion,
  JoinGroupDialog,
  AdminPanel,
  SignInForm
} from 'features/user-management';
import { LogIn } from 'lucide-react';
import ContextSwitcher from 'shared/components/context-switcher/ContextSwitcher';
import UserMenu from 'shared/components/user-menu/UserMenu';
import Button from 'core/components/Button';
import Dialog from 'core/components/Dialog';
import Navigation from './Navigation';

/**
 * Main application header with simplified layout
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup } = useGroups();
  const completeJoin = useJoinGroupCompletion();

  // Dialog states
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  /**
   * Closes the dialog and lands the user in the group they just joined.
   *
   * The landing behaviour itself -- refresh, find the group that appeared,
   * switch to it, log rather than throw if that fails -- now lives in
   * {@link useJoinGroupCompletion} so the account card's own "Join another"
   * entrance can share it exactly. This handler keeps only the header's own
   * dialog state.
   */
  const handleJoinedGroup = async () => {
    setShowJoinGroup(false);
    await completeJoin();
  };

  // Handle sign in click
  const handleSignInClick = () => {
    setShowSignIn(true);
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

            {/* Right side - Account */}
            <div className="flex items-center justify-center gap-2">
              {user ? (
                /* One named menu carries everything the hamburger used to:
                   profile, group members, report a problem, admin panel and
                   sign out, plus the posting-as switch and the account
                   theme. */
                <UserMenu onOpenAdmin={() => setShowAdmin(true)} />
              ) : (
                <>
                  {/* Theme stays reachable without an account -- the
                      hamburger used to carry this for signed-out users too. */}
                  <ThemeSelector />
                  <Button
                    variant="ghost"
                    onClick={handleSignInClick}
                    startIcon={<LogIn className="w-5 h-5" />}
                  >
                    <span>Sign In</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Join Group Dialog -- the sole mount; ContextSwitcher's chip opens it
          through the `onJoinGroup` callback rather than mounting its own. */}
      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={handleJoinedGroup}
      />

      {/* Admin Panel Dialog -- opened by the account menu */}
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
