// src/components/features/auth/UserProfileButton.tsx
import React, { useState } from 'react';
import { useAuth, useGroups } from '../../../context/firebase';
import { useTheme } from '../../../themes/ThemeContext';
import Button from '../../core/Button';
import Dialog from '../../core/Dialog';
import { LogIn, User, ShieldAlert, UserPlus } from 'lucide-react';
import SignInForm from './SignInForm';
import UserProfile from './UserProfile';
import AdminPanel from './adminPanel/AdminPanel';
import JoinGroupDialog from '../groups/JoinGroupDialog';

const UserProfileButton: React.FC = () => {
  const { user } = useAuth();
  const { activeGroupUserProfile, refreshGroups } = useGroups();
  const { setTheme } = useTheme();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);

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

          {user && (
            <Button
              variant="ghost"
              onClick={() => setShowJoinGroupDialog(true)}
              startIcon={<UserPlus className="w-5 h-5" />}
              aria-label="Join a Group"
            />
          )}
          
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

      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={showJoinGroupDialog}
        onClose={() => setShowJoinGroupDialog(false)}
        onSuccess={() => {
          // After successful join, refresh the groups list
          if (refreshGroups) {
            refreshGroups();
          }
        }}
      />
    </>
  );
};

export default UserProfileButton;