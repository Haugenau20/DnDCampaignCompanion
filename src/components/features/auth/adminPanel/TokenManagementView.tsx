// src/components/features/auth/adminPanel/TokenManagementView.tsx
import React, { useState, useEffect } from 'react';
import { useInvitations } from '../../../../context/firebase';
import Typography from '../../../core/Typography';
import Input from '../../../core/Input';
import Button from '../../../core/Button';
import Dialog from '../../../core/Dialog';
import { useGroups } from '../../../../context/firebase';
import { 
  Search, 
  Ticket, 
  Clock, 
  Link, 
  Copy, 
  Check, 
  Trash, 
  X, 
  AlertCircle 
} from 'lucide-react';

const TokenManagementView: React.FC = () => {
  const { 
    generateRegistrationToken,
    getRegistrationTokens,
    deleteRegistrationToken
  } = useInvitations();
  
  const { activeGroup, activeGroupId } = useGroups();
  
  // State
  const [tokens, setTokens] = useState<any[]>([]);
  const [newTokenNotes, setNewTokenNotes] = useState('');
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [confirmTokenDialog, setConfirmTokenDialog] = useState({
    isOpen: false,
    token: ''
  });
  
  const [inviteDialog, setInviteDialog] = useState({
    isOpen: false,
    token: ''
  });
  
  const [copySuccess, setCopySuccess] = useState(false);

  // Helper function to generate registration link
  const generateRegistrationLink = (token: string): string => {
    const baseUrl = window.location.origin;
    // Include the groupId in the link - this is crucial for the token validation to work
    return `${baseUrl}?join=true&token=${token}&groupId=${activeGroupId}`;
  };

  // Load tokens on mount
  useEffect(() => {
    if (!activeGroup) return;
    
    const loadTokens = async () => {
      setLoadingTokens(true);
      setError(null);
      try {
        const tokenList = await getRegistrationTokens();
        setTokens(tokenList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tokens');
      } finally {
        setLoadingTokens(false);
      }
    };
    
    loadTokens();
  }, [activeGroup, getRegistrationTokens]);

  // Generate a new registration token
  const handleGenerateToken = async () => {
    if (!activeGroup) return;
    
    setError(null);
    setGeneratingToken(true);
    try {
      const token = await generateRegistrationToken(newTokenNotes);
      
      // Add to local state
      const newToken = {
        token: token,
        notes: newTokenNotes,
        createdAt: new Date(),
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
    if (!tokenToDelete || !activeGroup) return;
  
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

  return (
    <>
      {/* Generate token form */}
      <div className="p-4 rounded-lg mb-6 card">
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

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 typography-error">
          <AlertCircle size={16} />
          <Typography color="error">{error}</Typography>
        </div>
      )}

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
              startIcon={<Search className="w-4 h-4 primary" />}
            />
          </div>
        </div>

        {loadingTokens ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4 primary" />
            <Typography>Loading tokens...</Typography>
          </div>
        ) : sortedTokens.length === 0 ? (
          <div className="text-center py-8 rounded-lg card">
            <Ticket className="w-12 h-12 mx-auto mb-4 primary" />
            <Typography color="secondary">
              {tokenSearchQuery ? 'No tokens match your search' : 'No registration tokens found'}
            </Typography>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden card">
            <table className="min-w-full divide-y">
              <thead className={`navigation`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider typography">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y theme">
                {sortedTokens.map((tokenData) => (
                  <tr key={tokenData.token}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Typography 
                          variant="body-sm" 
                          title={tokenData.token}
                        >
                          {tokenData.token.substring(0, 8)}...
                        </Typography>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tokenData.used ? (
                      <div className="flex items-center form-success">
                        <Check className="w-4 h-4 mr-1" />
                        <Typography 
                          variant="body-sm" 
                          title={tokenData.usedAt ? `Used on ${new Date(tokenData.usedAt).toLocaleDateString()}` : ''}
                        >
                          Used
                        </Typography>
                      </div>
                      ) : (
                        <div className="flex items-center space-x-2">
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
                      <Typography 
                      variant="body-sm" 
                      color="secondary" 
                      className="truncate max-w-xs" 
                      title={tokenData.notes || '-'}
                      >
                        {tokenData.notes && tokenData.notes.length > 24 
                          ? `${tokenData.notes.substring(0, 24)}...` 
                          : tokenData.notes || '-'}
                      </Typography>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap">
                      {!tokenData.used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteToken(tokenData.token)}
                          startIcon={<Trash className="w-4 h-4 delete-button" />}
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
          
          <div className="p-3 rounded border flex items-center space-x-2 overflow-hidden card">
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
                <Check size={16} className="form-success" /> : 
                <Copy size={16} />
              }
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          
          <Typography color="secondary" variant="body-sm">
            This link contains a token that allows anyone with the link to join this group. The token can only be used once.
          </Typography>
          <Typography color="secondary" variant="body-sm">
            New users: Use link to create a new account.
          </Typography>
          <Typography color="secondary" variant="body-sm">
            Existing users: Sign in and press "Join a Group".
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

export default TokenManagementView;