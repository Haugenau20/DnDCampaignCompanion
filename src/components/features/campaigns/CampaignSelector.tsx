// src/components/features/campaigns/CampaignSelector.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useGroups, useCampaigns } from '../../../context/firebase';
import { useTheme } from '../../../context/ThemeContext';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import { ChevronDown, LucideIcon, ScrollText } from 'lucide-react';
import clsx from 'clsx';

interface CampaignSelectorProps {
  icon?: LucideIcon;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  icon: Icon = ScrollText,
  fullWidth = false,
  variant = 'primary',
  size = 'md',
  className
}) => {
  const { activeGroup } = useGroups();
  const { campaigns, activeCampaignId, setActiveCampaign } = useCampaigns();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Find the active campaign object based on the activeCampaignId
  const activeCampaign = campaigns.find(campaign => campaign.id === activeCampaignId);

  // Log for debugging the campaign selector state
  useEffect(() => {
    console.log('CampaignSelector: activeCampaignId =', activeCampaignId);
    console.log('CampaignSelector: activeCampaign =', activeCampaign);
    console.log('CampaignSelector: available campaigns =', campaigns);
  }, [activeCampaignId, activeCampaign, campaigns]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle campaign change
  const handleCampaignChange = async (campaignId: string) => {
    if (campaignId === activeCampaignId) {
      setIsOpen(false);
      return;
    }

    console.log(`CampaignSelector: Switching to campaign ${campaignId}`);
    try {
      await setActiveCampaign(campaignId);
      setIsOpen(false);
    } catch (err) {
      console.error('Error switching campaign:', err);
    }
  };

  // Don't render if no group or no campaigns
  if (!activeGroup || campaigns.length === 0) return null;

  // Get button sizes
  const buttonSizeClasses = size === 'sm' 
    ? 'py-1 px-2 text-sm' 
    : size === 'lg' 
      ? 'py-3 px-4 text-lg' 
      : 'py-2 px-3';

  return (
    <div 
      className={clsx(
        'relative',
        fullWidth && 'w-full',
        className
      )}
      ref={dropdownRef}
    >
      <Button
        type="button"
        variant={variant}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-between gap-2',
          fullWidth && 'w-full',
          buttonSizeClasses
        )}
        endIcon={<ChevronDown className={`transition ${isOpen ? 'rotate-180' : ''}`} />}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
          <Typography className="truncate">
            {activeCampaign?.name || 'Select Campaign'}
          </Typography>
        </div>
      </Button>

      {isOpen && (
        <div 
          className={clsx(
            'absolute z-10 mt-1 min-w-full rounded-md shadow-lg',
            fullWidth ? 'w-full' : 'w-64',
            `${themePrefix}-dropdown`
          )}
        >
          <div className="py-1">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => handleCampaignChange(campaign.id)}
                className={clsx(
                  'w-full flex items-center gap-2 px-4 py-2 text-left',
                  activeCampaignId === campaign.id 
                    ? `${themePrefix}-dropdown-item-active` 
                    : `${themePrefix}-dropdown-item`
                )}
              >
                <Typography>
                  {campaign.name}
                </Typography>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignSelector;