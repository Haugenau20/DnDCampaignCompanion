// src/components/features/auth/adminPanel/CampaignManagementView.tsx

import React, { useState, useEffect } from 'react';
import { useCampaigns, useGroups, useAuth } from '../../../../context/firebase'
import Typography from '../../../core/Typography';
import Input from '../../../core/Input';
import Button from '../../../core/Button';
import Card from '../../../core/Card';
import Dialog from '../../../core/Dialog';
import { Campaign } from '../../../../types/user';
import { 
  Search, 
  BookOpen, 
  Plus, 
  Edit, 
  Trash, 
  X, 
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';
import clsx from 'clsx';

const CampaignManagementView: React.FC = () => {
  const { 
    createCampaign,
    campaigns: contextCampaigns,
    getCampaigns
  } = useCampaigns();
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  
  // State
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New campaign form state
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDescription, setNewCampaignDescription] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  
  // Dialog state
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({
    isOpen: false,
    campaignId: '',
    campaignName: ''
  });

  // Use campaigns from context if available, otherwise use local state
  const campaigns = contextCampaigns.length > 0 ? contextCampaigns : localCampaigns;

  // Load campaigns only once on mount or when activeGroupId changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchCampaigns = async () => {
      if (!activeGroupId) return;
      
      setLoadingCampaigns(true);
      console.log(`CampaignManagementView: Loading campaigns for group ${activeGroupId} (ONE TIME)`);
      
      try {
        const campaignList = await getCampaigns(activeGroupId);
        if (isMounted) {
          console.log(`CampaignManagementView: Setting ${campaignList.length} campaigns`);
          setLocalCampaigns(campaignList);
          setLoadingCampaigns(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading campaigns:', err);
          setError(err instanceof Error ? err.message : 'Failed to load campaigns');
          setLoadingCampaigns(false);
        }
      }
    };
    
    fetchCampaigns();
    
    return () => {
      isMounted = false;
    };
  }, [activeGroupId]);

  // Handle campaign creation
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeGroupId || !newCampaignName.trim()) return;
    
    setCreatingCampaign(true);
    setError(null);
    
    try {
      await createCampaign(
        activeGroupId, 
        newCampaignName,
        newCampaignDescription
      );
      
      // Refresh campaigns list
      const updatedCampaigns = await getCampaigns(activeGroupId);
      setLocalCampaigns(updatedCampaigns);
      
      // Reset form
      setNewCampaignName('');
      setNewCampaignDescription('');
      setShowNewCampaignForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  // Handle campaign deletion
  const handleDeleteCampaign = (campaignId: string, campaignName: string) => {
    setConfirmDeleteDialog({
      isOpen: true,
      campaignId,
      campaignName
    });
  };

  const handleConfirmDeleteCampaign = async () => {
    // TODO: Implement campaign deletion functionality
    console.log('Delete campaign:', confirmDeleteDialog.campaignId);
    setConfirmDeleteDialog({ isOpen: false, campaignId: '', campaignName: '' });
  };

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter(campaign => {
    const searchString = `${campaign.name} ${campaign.description || ''}`.toLowerCase();
    return searchString.includes(campaignSearchQuery.toLowerCase());
  });

  // Sort campaigns by creation date (newest first)
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return (
    <>
      {/* Campaign Controls */}
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h4">
          Campaigns ({filteredCampaigns.length})
        </Typography>
        
        <div className="flex items-center gap-2">
          <div className="w-64">
            <Input
              placeholder="Search campaigns..."
              value={campaignSearchQuery}
              onChange={(e) => setCampaignSearchQuery(e.target.value)}
              startIcon={<Search className={clsx("w-4 h-4", `typography-secondary`)} />}
            />
          </div>
          
          <Button
            onClick={() => setShowNewCampaignForm(true)}
            startIcon={<Plus size={16} />}
          >
            New Campaign
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className={clsx(
          "flex items-center gap-2 p-3 rounded-lg mb-4",
          `typography-error`
        )}>
          <AlertCircle size={16} />
          <Typography color="error">{error}</Typography>
        </div>
      )}

      {/* Campaign List */}
      {loadingCampaigns ? (
        <div className="text-center py-8">
          <div className={clsx(
            "animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4",
            `primary`
          )} />
          <Typography>Loading campaigns...</Typography>
        </div>
      ) : sortedCampaigns.length === 0 ? (
        <div className={clsx(
          "text-center py-8 rounded-lg",
          `card`
        )}>
          <BookOpen className={clsx(
            "w-12 h-12 mx-auto mb-4",
            `primary`
          )} />
          <Typography color="secondary">
            {campaignSearchQuery ? 'No campaigns match your search' : 'No campaigns found'}
          </Typography>
          <Button
            onClick={() => setShowNewCampaignForm(true)}
            startIcon={<Plus size={16} />}
            className="mt-4"
          >
            Create First Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedCampaigns.map(campaign => (
            <Card key={campaign.id} className="h-full">
              <Card.Content className="space-y-3">
                <div className="flex justify-between items-start">
                  <Typography variant="h4">{campaign.name}</Typography>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      startIcon={<Edit size={16} />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      startIcon={<Trash size={16} className={clsx(`delete-button`)} />}
                      onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                
                {campaign.description && (
                  <Typography color="secondary">
                    {campaign.description}
                  </Typography>
                )}
                
                <div className="flex flex-wrap gap-y-2 gap-x-4 pt-2">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} className={clsx(`primary`)} />
                    <Typography variant="body-sm" color="secondary">
                      Created: {campaign.createdAt instanceof Date
                        ? campaign.createdAt.toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                        : new Date(campaign.createdAt).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})
                      } 
                    </Typography>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <User size={16} className={clsx(`primary`)} />
                    <Typography variant="body-sm" color="secondary">
                      By: {campaign.createdBy === user?.uid ? 'You' : 'Another User'}
                    </Typography>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* New Campaign Dialog */}
      <Dialog
        open={showNewCampaignForm}
        onClose={() => setShowNewCampaignForm(false)}
        title="Create New Campaign"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCampaign}>
          <div className="space-y-4">
            <Input
              label="Campaign Name *"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              required
              placeholder="Enter campaign name"
            />
            
            <Input
              label="Description (optional)"
              value={newCampaignDescription}
              onChange={(e) => setNewCampaignDescription(e.target.value)}
              placeholder="Brief description of the campaign"
              isTextArea={true}
              rows={3}
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowNewCampaignForm(false)}
                type="button"
                startIcon={<X size={16} />}
                disabled={creatingCampaign}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                startIcon={<Plus size={16} />}
                disabled={!newCampaignName.trim() || creatingCampaign}
                isLoading={creatingCampaign}
              >
                Create Campaign
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDeleteDialog.isOpen}
        onClose={() => setConfirmDeleteDialog({ isOpen: false, campaignId: '', campaignName: '' })}
        title="Confirm Campaign Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Typography>
            Are you sure you want to delete the campaign <strong>"{confirmDeleteDialog.campaignName}"</strong>?
          </Typography>
          <Typography color="error">
            This will permanently delete all campaign data including NPCs, locations, quests, and story chapters. This action cannot be undone.
          </Typography>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteDialog({ isOpen: false, campaignId: '', campaignName: '' })}
              startIcon={<X size={16} />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteCampaign}
              startIcon={<Trash size={16} />}
            >
              Delete Campaign
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default CampaignManagementView;