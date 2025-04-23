// components/features/layouts/journal/sections/CampaignOverview.tsx
import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { Calendar, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { useCampaignInfo } from '../../common/hooks/useCampaignInfo';
import LoadingState from '../../common/components/LoadingState';

interface CampaignOverviewProps {
  loading: boolean;
}

/**
 * Displays an overview of the current campaign in journal style
 */
const CampaignOverview: React.FC<CampaignOverviewProps> = ({ loading }) => {
  const { theme } = useTheme();
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } = useCampaignInfo();
  const themePrefix = theme.name;
  
  if (loading) {
    return (
      <div className={clsx(
        "relative animate-pulse",
        `${themePrefix}-journal-section`
      )}>
        <LoadingState count={3} />
      </div>
    );
  }

  if (!hasGroup || !hasCampaign) {
    return (
      <div className={clsx(
        "relative p-4 text-center",
        `${themePrefix}-journal-section`
      )}>
        <h3 className={clsx(
          "text-lg font-medium mb-3",
          `${themePrefix}-journal-heading`
        )}>
          {!hasGroup ? "No Group Selected" : "No Active Campaign"}
        </h3>
        <p className={clsx(
          "text-sm",
          `${themePrefix}-journal-empty`
        )}>
          {!hasGroup
            ? "Select or create a group to get started"
            : "Select or create a campaign to begin your adventure"
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className={clsx(
      "relative",
      `${themePrefix}-journal-section`
    )}>
      <h3 className={clsx(
        "text-xl font-medium mb-2",
        `${themePrefix}-journal-heading`
      )}>
        {activeCampaign?.name}
      </h3>
      
      {activeCampaign?.description && (
        <p className={clsx(
          "text-sm italic mb-3 leading-relaxed",
          `${themePrefix}-journal-campaign-description`
        )}>
          {activeCampaign.description}
        </p>
      )}
      
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <div className={clsx(
          "flex items-center gap-1 text-xs",
          `${themePrefix}-typography-secondary`
        )}>
          <MapPin size={12} />
          <span>Group: <span className="font-medium">{activeGroup?.name}</span></span>
        </div>
        
        {formattedCreationDate && (
          <div className={clsx(
            "flex items-center gap-1 text-xs",
            `${themePrefix}-typography-secondary`
          )}>
            <Calendar size={12} />
            <span>Started: <span className="font-medium">{formattedCreationDate}</span></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignOverview;