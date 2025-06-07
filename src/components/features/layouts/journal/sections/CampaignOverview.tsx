// components/features/layouts/journal/sections/CampaignOverview.tsx
import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { useCampaignInfo } from '../../common/hooks/useCampaignInfo';
import LoadingState from '../../common/components/LoadingState';

interface CampaignOverviewProps {
  loading: boolean;
}

/**
 * Displays an overview of the current campaign in journal style
 */
const CampaignOverview: React.FC<CampaignOverviewProps> = ({ loading }) => {
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } = useCampaignInfo();
  
  if (loading) {
    return (
      <div className="relative animate-pulse journal-section">
        <LoadingState count={3} />
      </div>
    );
  }

  if (!hasGroup || !hasCampaign) {
    return (
      <div className="relative p-4 text-center journal-section">
        <h3 className="text-lg font-medium mb-3 journal-heading">
          {!hasGroup ? "No Group Selected" : "No Active Campaign"}
        </h3>
        <p className="text-sm journal-empty">
          {!hasGroup
            ? "Select or create a group to get started"
            : "Select or create a campaign to begin your adventure"
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className="relative journal-section">
      <h3 className="text-xl font-medium mb-2 journal-heading">
        {activeCampaign?.name}
      </h3>
      
      {activeCampaign?.description && (
        <p className="text-sm italic mb-3 leading-relaxed">
          {activeCampaign.description}
        </p>
      )}
      
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-1 text-xs typography-secondary">
          <MapPin size={12} />
          <span>Group: <span className="font-medium">{activeGroup?.name}</span></span>
        </div>
        
        {formattedCreationDate && (
          <div className="flex items-center gap-1 text-xs typography-secondary">
            <Calendar size={12} />
            <span>Started: <span className="font-medium">{formattedCreationDate}</span></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignOverview;