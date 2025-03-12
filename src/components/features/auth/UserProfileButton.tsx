// src/components/features/auth/UserProfileButton.tsx
import React, { useState } from 'react';
import { useAuth, useGroups } from '../../../context/firebase';
import { useTheme } from '../../../context/ThemeContext';
import Button from '../../core/Button';
import Dialog from '../../core/Dialog';
import { LogIn, User, ShieldAlert } from 'lucide-react';
import SignInForm from './SignInForm';
import UserProfile from './UserProfile';
import AdminPanel from './adminPanel/AdminPanel';
import { ThemeName } from '../../../types/theme';
import clsx from 'clsx';

const UserProfileButton: React.FC = () => {
  const { user, loading } = useAuth();
  const { activeGroupUserProfile } = useGroups();
  const { setTheme } = useTheme();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const isAdmin = activeGroupUserProfile?.role === 'admin' || false;

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleSignInClick = () => {
    setShowSignIn(true);
  };

  const handleAdminClick = () => {
    setShowAdmin(true);
  };

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleProfileClick}
            startIcon={<User className="w-5 h-5" />}
          />
          
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={handleAdminClick}
              startIcon={<ShieldAlert className="w-5 h-5" />}
              className="hidden md:flex"
              aria-label="Admin Panel"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSignInClick}
            startIcon={<LogIn className="w-5 h-5" />}
          >
            Sign In
          </Button>
        </div>
      )}

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
    </>
  );
};

export default UserProfileButton;