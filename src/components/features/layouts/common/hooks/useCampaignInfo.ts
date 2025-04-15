// components/features/layouts/common/hooks/useCampaignInfo.ts
import { useGroups, useCampaigns } from '../../../../../context/firebase';

/**
 * Hook for retrieving and processing campaign information
 */
export const useCampaignInfo = () => {
  const { activeGroup } = useGroups();
  const { activeCampaignId, campaigns } = useCampaigns();
  
  // Find the active campaign
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
  
  // Format creation date if available
  const formattedCreationDate = activeCampaign?.createdAt ? 
    (activeCampaign.createdAt instanceof Date 
      ? activeCampaign.createdAt.toLocaleDateString()
      : new Date(activeCampaign.createdAt).toLocaleDateString()
    ) : null;
  
  return {
    activeGroup,
    activeCampaign,
    formattedCreationDate,
    hasCampaign: !!activeCampaign,
    hasGroup: !!activeGroup
  };
};