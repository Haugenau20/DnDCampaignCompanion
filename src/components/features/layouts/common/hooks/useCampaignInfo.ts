// components/features/layouts/common/hooks/useCampaignInfo.ts
import { useGroups, useCampaigns } from '../../../../../context/firebase';
import { formatDisplayDate, convertFirestoreTimestamp } from '../../../../../utils/dateFormatter';

/**
 * Hook for retrieving and processing campaign information
 */
export const useCampaignInfo = () => {
  const { activeGroup } = useGroups();
  const { activeCampaignId, campaigns } = useCampaigns();
  
  // Find the active campaign
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
  
  // Format creation date if available using the new utility function
  const formattedCreationDate = activeCampaign?.createdAt 
    ? formatDisplayDate(activeCampaign.createdAt)
    : null;
  
  // Convert timestamp to Date object for other uses
  const createdAtDate = activeCampaign?.createdAt 
    ? convertFirestoreTimestamp(activeCampaign.createdAt)
    : null;
  
  return {
    activeGroup,
    activeCampaign,
    formattedCreationDate,
    createdAtDate, // Return the actual Date object for additional processing if needed
    hasCampaign: !!activeCampaign,
    hasGroup: !!activeGroup
  };
};