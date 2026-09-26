// app/layout/Header.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchTrigger from 'shared/components/command-palette/SearchTrigger';
import CommandPalette from 'shared/components/command-palette/CommandPalette';
import ThemeSelector from 'shared/components/ThemeSelector';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  useGroups,
  signInPathFor
} from 'features/user-management';
import { LogIn } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ContextSwitcher from 'shared/components/context-switcher/ContextSwitcher';
import UserMenu from 'shared/components/user-menu/UserMenu';
import Button from 'core/components/Button';
import Navigation from './Navigation';

/**
 * Main application header with simplified layout
 */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeGroup } = useGroups();

  // Command palette state -- the trigger and shortcut both gate on `user`
  // (see the effect below), so this state has no visible effect while
  // signed out.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Global `Meta+K` / `Control+K` shortcut that toggles the command palette.
   *
   * Gated on `user` for the same reason the trigger is: searching an index
   * that was never built is what put results in the signed-out screenshots.
   * A hidden trigger with a live shortcut would open a palette over an empty
   * index with no visible way to have got there.
   */
  useEffect(() => {
    if (!user) {
      // Signing out with the palette open must not leave it open for
      // whoever (or whichever account) signs back in next.
      setPaletteOpen(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      // `altKey` and `shiftKey` are excluded because AltGr on European
      // keyboard layouts sets both `ctrlKey` and `altKey` together, so
      // `AltGr+K` -- a character the user meant to type -- would otherwise
      // also match, swallow the keystroke and toggle the palette.
      if (
        event.key.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [user]);

  /**
   * Sign in is a destination now, and it carries where you were.
   *
   * This used to open a dialog, which had nowhere to put the page you were on
   * -- so signing in from halfway through a campaign returned you to the
   * beginning of it. `signInPathFor` validates and encodes the current
   * location; `/signin` hands it back on success.
   */
  const handleSignInClick = () => {
    navigate(signInPathFor(location));
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
              <span className="title:inline hidden">D&D Campaign Companion</span>
              <span className="title:hidden">D&D Companion</span>
            </Link>

            {/* Campaign context, and the door onto changing it. Previously a
                chip that opened a modal over the page it was about to
                change; now the popover's own anchor. */}
            {user && activeGroup && (
              <>
                <span
                  aria-hidden="true"
                  className="w-px h-6 self-center opacity-40 bg-chrome-border"
                ></span>
                <ContextSwitcher onJoinGroup={() => navigate('/join')} />
              </>
            )}

            {/* Desktop navigation, inline rather than a second full-height row */}
            <Navigation variant="inline" />

            {/* Middle - Search: a fixed-width trigger onto the command palette,
                replacing the field-and-dropdown search bar. Per the shrink
                order in docs/superpowers/specs/2026-09-02-header-command-palette-design.md
                §6, the trigger never yields width under pressure -- `shrink-0`
                (not `flex-1 min-w-0`) reserves its full width instead of
                letting the wrapper collapse below it and overflow leftward
                over the nav. `ml-auto` still pins the wrapper (and the
                account controls after it) to the right whether or not the
                trigger itself renders -- it's gated on `user` (see the
                shortcut effect above for why). */}
            <div className="shrink-0 ml-auto flex justify-end px-1">
              {user && (
                <SearchTrigger
                  ref={searchTriggerRef}
                  onOpen={() => setPaletteOpen(true)}
                />
              )}
            </div>

            {/* Right side - Account */}
            <div className="flex items-center justify-center gap-2">
              {user ? (
                /* One named menu carries everything the hamburger used to:
                   profile, group members, report a problem, admin panel and
                   sign out, plus the posting-as switch and the account
                   theme. */
                <UserMenu />
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

      {/* Command Palette -- gated on `user` for the same reason the trigger
          and shortcut are (see the effect above). */}
      {user && (
        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          triggerRef={searchTriggerRef}
        />
      )}

      {/* No dialogs here any more. Admin, sign-in and join are routes, and
          every control above navigates to one. 14-5 removed the mounts; the
          components behind two of them are gone entirely. */}
    </header>
  );
};

export default Header;
