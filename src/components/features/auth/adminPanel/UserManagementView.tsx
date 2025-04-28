// src/components/features/auth/adminPanel/UserManagementView.tsx - Fix key warning

import React, { useState, useEffect } from 'react';
import { useAuth, useGroups } from '../../../../context/firebase';
import Typography from '../../../core/Typography';
import Input from '../../../core/Input';
import Button from '../../../core/Button';
import Dialog from '../../../core/Dialog';
import { formatDisplayDate } from '../../../../utils/dateFormatter';
import { 
  Search, 
  Users, 
  Trash, 
  X, 
  AlertCircle, 
  ShieldCheck,
  User,
  Calendar
} from 'lucide-react';

const UserManagementView: React.FC = () => {
  const { user } = useAuth();
  const { activeGroup, getAllUsers, deleteUser } = useGroups();
  
  // State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [confirmUserDialog, setConfirmUserDialog] = useState({
    isOpen: false,
    userId: '',
    username: ''
  });

  // Load users on mount
  useEffect(() => {
    if (!activeGroup) return;
    
    const loadUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const userList = await getAllUsers();
        setUsers(userList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };
    
    loadUsers();
  }, [activeGroup, getAllUsers]);

  // Handle user deletion
  const handleDeleteUser = (userId: string, username: string) => {
    setConfirmUserDialog({
      isOpen: true,
      userId,
      username
    });
  };

  const handleConfirmedUserDelete = async () => {
    const userId = confirmUserDialog.userId;
    if (!userId || !activeGroup) return;
  
    setError(null);
    try {
      await deleteUser(userId); 
      
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      // Close dialog
      setConfirmUserDialog({ isOpen: false, userId: '', username: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(user => {
    const searchString = `${user.username || ''} ${user.role || ''}`.toLowerCase();
    return searchString.includes(userSearchQuery.toLowerCase());
  });

  // Sort users with admins first, then alphabetically by username
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // Sort by role first (admin first)
    if (a.role !== b.role) {
      return a.role === 'admin' ? -1 : 1;
    }
    // Then sort by username
    return a.username.localeCompare(b.username);
  });

  return (
    <>
      {/* User Controls */}
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h4">
          Group Members ({filteredUsers.length})
        </Typography>
        
        <div className="w-64">
          <Input
            placeholder="Search users..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            startIcon={<Search className="w-4 h-4 primary" />}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 typography-error">
          <AlertCircle size={16} />
          <Typography color="error">{error}</Typography>
        </div>
      )}

      {/* User List */}
      {loadingUsers ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4 primary" />
          <Typography>Loading users...</Typography>
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="text-center py-8 rounded-lg card">
          <Users className="w-12 h-12 mx-auto mb-4 primary" />
          <Typography color="secondary">
            {userSearchQuery ? 'No users match your search' : 'No users found'}
          </Typography>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden card">
          <table className="min-w-full divide-y">
            <thead className={`navigation`}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y theme">
              {sortedUsers.map((userData) => (
                <tr key={userData.userId || userData.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center" title={userData.username || 'Unknown'}>
                      <User className="w-5 h-5 mr-2 primary" />
                      <Typography variant="body-sm" className="font-medium">
                      {userData.username && userData.username.length > 20 
                        ? `${userData.username.slice(0, 20)}...` 
                        : userData.username || 'Unknown'}
                      </Typography>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {userData.role === 'admin' && (
                        <ShieldCheck className="w-4 h-4 mr-1 primary" />
                      )}
                      <Typography variant="body-sm" color="secondary">
                        {userData.role === 'admin' ? 'Admin' : 'Member'}
                      </Typography>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 primary" />
                      <Typography variant="body-sm" color="secondary">
                        {formatDisplayDate(userData.joinedAt, { 
                          year: 'numeric', 
                          day: '2-digit', 
                          month: '2-digit'
                        })}
                      </Typography>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Don't show delete button for current user or for admins */}
                    {user && userData.userId !== user.uid && userData.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(userData.userId, userData.username)}
                        startIcon={<Trash className="w-4 h-4 delete-button" />}
                      >
                        Remove
                      </Button>
                    )}
                    {userData.role === 'admin' && (
                      <Typography variant="body-sm" color="secondary" className="italic">
                        Admin
                      </Typography>
                    )}
                    {user && userData.userId === user.uid && (
                      <Typography variant="body-sm" color="secondary" className="italic">
                        Current User
                      </Typography>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Deletion Confirmation Dialog */}
      <Dialog
        open={confirmUserDialog.isOpen}
        onClose={() => setConfirmUserDialog({ isOpen: false, userId: '', username: '' })}
        title="Confirm User Removal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Typography>
            Are you sure you want to remove <strong>{confirmUserDialog.username}</strong> from this group?
          </Typography>
          <Typography color="error">
            This will remove their access to this group and all associated data.
          </Typography>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="ghost"
              onClick={() => setConfirmUserDialog({ isOpen: false, userId: '', username: '' })}
              startIcon={<X size={16} />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedUserDelete}
              startIcon={<Trash size={16} />}
            >
              Remove User
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default UserManagementView;