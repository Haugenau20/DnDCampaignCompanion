import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../../context/FirebaseContext';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import Dialog from '../../core/Dialog';
import { useTheme } from '../../../context/ThemeContext';
import { FirebaseError } from 'firebase/app';
import { 
  UserPlus, 
  X, 
  Users, 
  Check, 
  AlertCircle, 
  Clock, 
  User,
  Search,
  Trash,
  ShieldAlert,
  Copy,
  Link,
  Ticket,
  UserCog
} from 'lucide-react';
import clsx from 'clsx';

interface AdminPanelProps {
  onClose?: () => void;
}

// Helper function to generate registration link
const generateRegistrationLink = (token: string): string => {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?register=true&token=${token}`;
};

// Tabs enum
enum AdminTab {
  Tokens = 'tokens',
  Users = 'users'
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { 
    user, 
    userProfile, 
    generateRegistrationToken,
    getRegistrationTokens,
    deleteRegistrationToken,
    getAllUsers,
    deleteUser
  } = useFirebase();

  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.Tokens);
  
  // Tokens state
  const [tokens, setTokens] = useState<any[]>([]);
  const [newTokenNotes, setNewTokenNotes] = useState('');
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  
  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Common state
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [confirmTokenDialog, setConfirmTokenDialog] = useState({
    isOpen: false,
    token: ''
  });
  const [confirmUserDialog, setConfirmUserDialog] = useState({
    isOpen: false,
    userId: '',
    username: ''
  });
  const [inviteDialog, setInviteDialog] = useState({
    isOpen: false,
    token: ''
  });
  const [copySuccess, setCopySuccess] = useState(false);

  // Check if current user is admin
  const isAdmin = userProfile?.isAdmin || false;

  // Load data based on active tab
  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      setError(null);
      
      if (activeTab === AdminTab.Tokens) {
        setLoadingTokens(true);
        try {
          const tokenList = await getRegistrationTokens();
          setTokens(tokenList);
        } catch (err) {
          if (err instanceof FirebaseError && err.code === 'permission-denied') {
            setError('You do not have permission to view tokens');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load tokens');
          }
        } finally {
          setLoadingTokens(false);
        }
      } else if (activeTab === AdminTab.Users) {
        setLoadingUsers(true);
        try {
          const userList = await getAllUsers();
          setUsers(userList);
        } catch (err) {
          if (err instanceof FirebaseError && err.code === 'permission-denied') {
            setError('You do not have permission to view users');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load users');
          }
        } finally {
          setLoadingUsers(false);
        }
      }
    };

    loadData();
  }, [isAdmin, activeTab, getRegistrationTokens, getAllUsers]);

  // Generate a new registration token
  const handleGenerateToken = async () => {
    if (!isAdmin || !user) return;

    setError(null);
    setGeneratingToken(true);
    try {
      const token = await generateRegistrationToken(newTokenNotes);
      
      // Add to local state
      const newToken = {
        token: token,
        notes: newTokenNotes,
        createdAt: new Date(),
        createdBy: user.uid,
        used: false
      };
      
      setTokens(prev => [...prev, newToken]);
      
      // Open invite dialog with token
      setInviteDialog({
        isOpen: true,
        token: token
      });
      
      // Reset form
      setNewTokenNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    const link = generateRegistrationLink(inviteDialog.token);
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Delete a token
  const handleDeleteToken = (token: string) => {
    setConfirmTokenDialog({
      isOpen: true,
      token: token
    });
  };

  const handleConfirmedTokenDelete = async () => {
    const tokenToDelete = confirmTokenDialog.token;
    if (!isAdmin || !tokenToDelete) return;
  
    setError(null);
    try {
      await deleteRegistrationToken(tokenToDelete); 
      
      // Update local state
      setTokens(prev => prev.filter(t => t.token !== tokenToDelete));
      
      // Close dialog
      setConfirmTokenDialog({ isOpen: false, token: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete token');
    }
  };

  // Delete a user
  const handleDeleteUser = (userId: string, username: string) => {
    setConfirmUserDialog({
      isOpen: true,
      userId: userId,
      username: username
    });
  };

  const handleConfirmedUserDelete = async () => {
    const userId = confirmUserDialog.userId;
    if (!isAdmin || !userId) return;
  
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

  // Filter tokens by search query
  const filteredTokens = tokens.filter(token => {
    const createdDate = token.createdAt instanceof Date ? token.createdAt.toLocaleDateString() : '';
    const usedDate = token.usedAt instanceof Date ? token.usedAt.toLocaleDateString() : '';
    const searchString = `${token.token} ${token.notes || ''} ${createdDate} ${usedDate}`.toLowerCase();
    return searchString.includes(tokenSearchQuery.toLowerCase());
  });

  // Sort tokens with unused first
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    // Sort by used status first (unused first)
    if (a.used !== b.used) {
      return a.used ? 1 : -1;
    }
    // Then sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // Filter users by search query
  const filteredUsers = users.filter(user => {
    const createdDate = user.dateCreated instanceof Date ? user.dateCreated.toLocaleDateString() : '';
    const lastLoginDate = user.lastLogin instanceof Date ? user.lastLogin.toLocaleDateString() : '';
    const searchString = `${user.username || ''} ${createdDate} ${lastLoginDate}`.toLowerCase();
    return searchString.includes(userSearchQuery.toLowerCase());
  });

  // Sort users by creation date (newest first)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
  });

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <Card>
        <Card.Content className="text-center py-8">
          <ShieldAlert className={clsx("w-16 h-16 mx-auto mb-4", `${themePrefix}-delete-button`)} />
          <Typography variant="h3" className="mb-2">
            Access Denied
          </Typography>
          <Typography color="secondary">
            You do not have administrative privileges.
          </Typography>
          {onClose && (
            <Button
              className="mt-4"
              onClick={onClose}
            >
              Back
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Content className="space-y-6">
          {/* Tab Navigation */}
          <div className={clsx("flex border-b", `${themePrefix}-navigation`)}>
            <button
              className={clsx(
                "py-2 px-4 font-medium flex items-center gap-2",
                activeTab === AdminTab.Tokens 
                  ? `${themePrefix}-navigation-item-active` 
                  : `${themePrefix}-navigation-item`
              )}
              onClick={() => setActiveTab(AdminTab.Tokens)}
            >
              <Ticket className="w-5 h-5" />
              Registration Tokens
            </button>
            <button
              className={clsx(
                "py-2 px-4 font-medium flex items-center gap-2",
                activeTab === AdminTab.Users 
                  ? `${themePrefix}-navigation-item-active` 
                  : `${themePrefix}-navigation-item`
              )}
              onClick={() => setActiveTab(AdminTab.Users)}
            >
              <UserCog className="w-5 h-5" />
              Users
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className={clsx(
              "flex items-center gap-2 p-3 rounded-lg",
              `${themePrefix}-typography-error`
            )}>
              <AlertCircle size={16} />
              <Typography color="error">{error}</Typography>
            </div>
          )}

          {/* Token Management View */}
          {activeTab === AdminTab.Tokens && (
            <>
              {/* Generate token form */}
              <div className={clsx(
                "p-4 rounded-lg",
                `${themePrefix}-card`
              )}>
                <Typography variant="h4" className="mb-4">
                  Generate Registration Token
                </Typography>
                <div className="space-y-3">
                  <Input
                    label="Notes (optional)"
                    value={newTokenNotes}
                    onChange={(e) => setNewTokenNotes(e.target.value)}
                    placeholder="Purpose of this token (e.g., New player for Friday group)"
                  />
                  <Button
                    onClick={handleGenerateToken}
                    disabled={generatingToken}
                    startIcon={<Ticket />}
                    isLoading={generatingToken}
                  >
                    Generate Token
                  </Button>
                </div>
              </div>

              {/* Tokens list */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Typography variant="h4">
                    Registration Tokens ({filteredTokens.length})
                  </Typography>
                  <div className="w-64">
                    <Input
                      placeholder="Search tokens..."
                      value={tokenSearchQuery}
                      onChange={(e) => setTokenSearchQuery(e.target.value)}
                      startIcon={<Search className={clsx("w-4 h-4", `${themePrefix}-typography-secondary`)} />}
                    />
                  </div>
                </div>

                {loadingTokens ? (
                  <div className="text-center py-8">
                    <div className={clsx(
                      "animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4",
                      `${themePrefix}-primary`
                    )} />
                    <Typography>Loading tokens...</Typography>
                  </div>
                ) : sortedTokens.length === 0 ? (
                  <div className={clsx(
                    "text-center py-8 rounded-lg",
                    `${themePrefix}-card`
                  )}>
                    <Ticket className={clsx(
                      "w-12 h-12 mx-auto mb-4",
                      `text-${themePrefix}-secondary`
                    )} />
                    <Typography color="secondary">
                      {tokenSearchQuery ? 'No tokens match your search' : 'No registration tokens found'}
                    </Typography>
                  </div>
                ) : (
                  <div className={clsx(
                    "border rounded-lg overflow-hidden",
                    `${themePrefix}-card`
                  )}>
                    <table className="min-w-full divide-y">
                      <thead className={`${themePrefix}-navigation`}>
                        <tr>
                          <th className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            `${themePrefix}-typography-secondary`
                          )}>
                            Token
                          </th>
                          <th className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            `${themePrefix}-typography-secondary`
                          )}>
                            Status
                          </th>
                          <th className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            `${themePrefix}-typography-secondary`
                          )}>
                            Created
                          </th>
                          <th className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            `${themePrefix}-typography-secondary`
                          )}>
                            Notes
                          </th>
                          <th className={clsx(
                            "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            `${themePrefix}-typography-secondary`
                          )}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={clsx(
                        "divide-y",
                        `${themePrefix}-theme`
                      )}>
                        {sortedTokens.map((tokenData) => (
                          <tr key={tokenData.token}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Ticket className={clsx(
                                  "w-5 h-5 mr-2",
                                  `text-${themePrefix}-secondary`
                                )} />
                                <Typography variant="body-sm" className="font-mono">
                                  {tokenData.token.substring(0, 8)}...
                                </Typography>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {tokenData.used ? (
                              <div className={clsx("flex items-center", `${themePrefix}-form-success`)}>
                                <Check className="w-4 h-4 mr-1" />
                                <Typography variant="body-sm">
                                  Used
                                  {tokenData.usedAt && (
                                    <span className={clsx(
                                      "ml-1",
                                      `${themePrefix}-typography-secondary`
                                    )}>
                                      ({new Date(tokenData.usedAt).toLocaleDateString()})
                                    </span>
                                  )}
                                </Typography>
                              </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center text-yellow-600">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <Typography variant="body-sm">Available</Typography>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setInviteDialog({
                                      isOpen: true,
                                      token: tokenData.token
                                    })}
                                    startIcon={<Link className="w-4 h-4" />}
                                  >
                                    Share
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Typography variant="body-sm" color="secondary">
                                {tokenData.createdAt instanceof Date 
                                  ? tokenData.createdAt.toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                                  : new Date(tokenData.createdAt).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                                }
                              </Typography>
                            </td>
                            <td className="px-6 py-4">
                              <Typography variant="body-sm" color="secondary" className="truncate max-w-xs">
                                {tokenData.notes || '-'}
                              </Typography>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {!tokenData.used && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteToken(tokenData.token)}
                                  startIcon={<Trash className={clsx("w-4 h-4", `${themePrefix}-delete-button`)} />}
                                >
                                  Delete
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* User Management View */}
          {activeTab === AdminTab.Users && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <Typography variant="h4">
                  Users ({filteredUsers.length})
                </Typography>
                <div className="w-64">
                  <Input
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    startIcon={<Search className={clsx("w-4 h-4", `${themePrefix}-typography-secondary`)} />}
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className={clsx(
                    "animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4",
                    `${themePrefix}-primary`
                  )} />
                  <Typography>Loading users...</Typography>
                </div>
              ) : sortedUsers.length === 0 ? (
                <div className={clsx(
                  "text-center py-8 rounded-lg",
                  `${themePrefix}-card`
                )}>
                  <Users className={clsx(
                    "w-12 h-12 mx-auto mb-4",
                    `text-${themePrefix}-secondary`
                  )} />
                  <Typography color="secondary">
                    {userSearchQuery ? 'No users match your search' : 'No users found'}
                  </Typography>
                </div>
              ) : (
                <div className={clsx(
                  "border rounded-lg overflow-hidden",
                  `${themePrefix}-card`
                )}>
                  <table className="min-w-full divide-y">
                    <thead className={`${themePrefix}-navigation`}>
                      <tr>
                        <th className={clsx(
                          "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                          `${themePrefix}-typography-secondary`
                        )}>
                          Username
                        </th>
                        <th className={clsx(
                          "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                          `${themePrefix}-typography-secondary`
                        )}>
                          Role
                        </th>
                        <th className={clsx(
                          "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                          `${themePrefix}-typography-secondary`
                        )}>
                          Joined
                        </th>
                        <th className={clsx(
                          "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                          `${themePrefix}-typography-secondary`
                        )}>
                          Last Login
                        </th>
                        <th className={clsx(
                          "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                          `${themePrefix}-typography-secondary`
                        )}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={clsx(
                      "divide-y",
                      `${themePrefix}-theme`
                    )}>
                      {sortedUsers.map((userData) => (
                        <tr key={userData.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className={clsx(
                                "w-5 h-5 mr-2",
                                `text-${themePrefix}-secondary`
                              )} />
                              <Typography variant="body-sm" className="font-medium">
                                {userData.username || 'Unknown'}
                              </Typography>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Typography variant="body-sm" color={userData.isAdmin ? "primary" : "secondary"}>
                              {userData.isAdmin ? 'Admin' : 'User'}
                            </Typography>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Typography variant="body-sm" color="secondary">
                              {userData.dateCreated instanceof Date 
                                ? userData.dateCreated.toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                                : new Date(userData.dateCreated).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                              }
                            </Typography>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Typography variant="body-sm" color="secondary">
                              {userData.lastLogin instanceof Date 
                                ? userData.lastLogin.toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                                : new Date(userData.lastLogin).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                              }
                            </Typography>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {/* Don't show delete button for current user or for admins */}
                            {user && userData.id !== user.uid && !userData.isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(userData.id, userData.username)}
                                startIcon={<Trash className={clsx("w-4 h-4", `${themePrefix}-delete-button`)} />}
                              >
                                Delete
                              </Button>
                            )}
                            {userData.isAdmin && (
                              <Typography variant="body-sm" color="secondary" className="italic">
                                Admin
                              </Typography>
                            )}
                            {user && userData.id === user.uid && (
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
            </div>
          )}

          {/* Close button */}
          {onClose && (
            <div className="flex justify-end mt-6">
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Token Deletion Confirmation Dialog */}
      <Dialog
        open={confirmTokenDialog.isOpen}
        onClose={() => setConfirmTokenDialog({ isOpen: false, token: '' })}
        title="Confirm Token Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Typography>
            Are you sure you want to delete this registration token?
          </Typography>
          <Typography color="error">
            This will prevent anyone from using it to register.
          </Typography>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="ghost"
              onClick={() => setConfirmTokenDialog({ isOpen: false, token: '' })}
              startIcon={<X size={16} />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedTokenDelete}
              startIcon={<Trash size={16} />}
            >
              Delete Token
            </Button>
          </div>
        </div>
      </Dialog>

      {/* User Deletion Confirmation Dialog */}
      <Dialog
        open={confirmUserDialog.isOpen}
        onClose={() => setConfirmUserDialog({ isOpen: false, userId: '', username: '' })}
        title="Confirm User Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Typography>
            Are you sure you want to delete the user <strong>{confirmUserDialog.username}</strong>?
          </Typography>
          <Typography color="error">
            This will permanently delete their account and all associated data.
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
              Delete User
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialog.isOpen}
        onClose={() => setInviteDialog({ isOpen: false, token: '' })}
        title="Share Registration Link"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Typography>
            Share this registration link:
          </Typography>
          
          <div className={clsx(
            "p-3 rounded border flex items-center space-x-2 overflow-hidden",
            `${themePrefix}-card`
          )}>
            <div className="truncate flex-1">
              <Typography variant="body-sm" className="font-mono">
                {generateRegistrationLink(inviteDialog.token)}
              </Typography>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyInviteLink}
              startIcon={copySuccess ? 
                <Check size={16} className={clsx(`${themePrefix}-form-success`)} /> : 
                <Copy size={16} />
              }
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          
          <Typography color="secondary" variant="body-sm">
            This link contains a token that allows anyone with the link to register an account. The token can only be used once.
          </Typography>
          
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setInviteDialog({ isOpen: false, token: '' })}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default AdminPanel;