// components/features/dashboard/CampaignBanner.tsx
import React from 'react';
import Typography from '../../../../core/Typography';
import { useCampaignInfo } from '../../../layouts/common/hooks/useCampaignInfo';

/**
 * Campaign banner component that displays information about the current campaign
 */
const CampaignBanner: React.FC = () => {
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } = useCampaignInfo();
  
  // If no active campaign or group, show a default message
  if (!hasGroup || !hasCampaign) {
    return (
      <div className="p-6 mb-4 text-center typograhpy">
        <Typography variant="h2" className="mb-2">
          Welcome to D&D Campaign Companion x
        </Typography>
        <Typography color="secondary">
          {!hasGroup 
            ? "Select or create a group to get started" 
            : "Select or create a campaign to begin your adventure"
          }
        </Typography>
      </div>
    );
  }
  
  return (
    <div className="p-6 mb-4 relative overflow-hidden text-center typograhpy">
      <div className="relative z-10">
        <Typography variant="h2" className="mb-1">
          Welcome to {activeCampaign?.name}
        </Typography>
        {activeCampaign?.description && (
          <Typography color="secondary" className="max-w-2xl mx-auto">
            {activeCampaign.description}
          </Typography>
        )}
        
        <div className="mt-4 text-sm flex flex-wrap justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-1 typography-secondary">
            <span>Group:</span>
            <span className="font-medium">{activeGroup?.name}</span>
          </div>
          
          {formattedCreationDate && (
            <div className="flex items-center gap-1 typography-secondary">
              <span>Created:</span>
              <span className="font-medium">{formattedCreationDate}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Background decorative element */}
      <div className="absolute -right-20 top-0 bottom-0 transform">
        <div className="w-80 h-80 rounded-full bg-secondary"></div>
      </div>
    </div>
  );
};

export default CampaignBanner;