// components/features/dashboard/CampaignBanner.tsx
import React from 'react';
import Typography from '../../../../core/Typography';
import { useTheme } from '../../../../../context/ThemeContext';
import clsx from 'clsx';
import { useCampaignInfo } from '../../../layouts/common/hooks/useCampaignInfo';

/**
 * Campaign banner component that displays information about the current campaign
 */
const CampaignBanner: React.FC = () => {
  const { theme } = useTheme();
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } = useCampaignInfo();
  const themePrefix = theme.name;
  
  // If no active campaign or group, show a default message
  if (!hasGroup || !hasCampaign) {
    return (
      <div className={clsx("p-6 mb-4 text-center", `${themePrefix}-text`)}>
        <Typography variant="h2" className="mb-2">
          Welcome to D&D Campaign Companion
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
    <div className={clsx(
      "p-6 mb-4 relative overflow-hidden text-center",
      `${themePrefix}-text`
    )}>
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
          <div className={clsx("flex items-center gap-1", `${themePrefix}-typography-secondary`)}>
            <span>Group:</span>
            <span className="font-medium">{activeGroup?.name}</span>
          </div>
          
          {formattedCreationDate && (
            <div className={clsx("flex items-center gap-1", `${themePrefix}-typography-secondary`)}>
              <span>Created:</span>
              <span className="font-medium">{formattedCreationDate}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Background decorative element */}
      <div className="absolute -right-20 top-0 bottom-0 transform opacity-10">
        <div className={clsx(
          "w-80 h-80 rounded-full",
          `bg-${themePrefix}-primary`
        )}></div>
      </div>
    </div>
  );
};

export default CampaignBanner;