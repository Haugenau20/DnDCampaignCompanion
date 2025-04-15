// components/features/layouts/journal/JournalLayout.tsx
import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { LayoutProps } from '../dashboard/DashboardLayout';
import { Book, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import Button from '../../../core/Button';
import CampaignBanner from '../dashboard/sections/CampaignBanner';
import JournalPages from './JournalPages';
import JournalPage from './JournalPage';
import CharacterGallery from './sections/CharacterGallery';
import ActiveQuestsList from './sections/ActiveQuestsList';
import RecentActivityChronicle from './sections/RecentActivityChronicle';
import CampaignOverview from './sections/CampaignOverview';
import LocationsMap from './sections/LocationsMap';
import RumorsSection from './sections/RumorsSection';
import StorySection from './sections/StorySection';

/**
 * Journal Layout component that renders the dashboard in a journal style
 */
const JournalLayout: React.FC<LayoutProps> = ({
  npcs,
  locations,
  quests,
  chapters,
  rumors,
  activities,
  loading,
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;
  const [pageView, setPageView] = useState<'overview' | 'story'>('overview');

  // For mobile view, we'll paginate through sections
  const [mobilePage, setMobilePage] = useState(0);
  const totalMobilePages = 3;

  const nextMobilePage = () => {
    setMobilePage((prev) => (prev + 1) % totalMobilePages);
  };

  const prevMobilePage = () => {
    setMobilePage((prev) => (prev - 1 + totalMobilePages) % totalMobilePages);
  };

  return (
    <div className="relative w-full">
      {/* Campaign Banner stays out of the journal */}
      <CampaignBanner />

      {/* View toggle */}
      <div className="mb-4 flex justify-end">
        <div className={clsx(
          "inline-flex rounded-md shadow-sm",
          `${themePrefix}-card-border`
        )}>
          <Button
            variant={pageView === 'overview' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPageView('overview')}
            startIcon={<Book size={16} />}
          >
            Overview
          </Button>
          <Button
            variant={pageView === 'story' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPageView('story')}
            startIcon={<Bookmark size={16} />}
          >
            Story
          </Button>
        </div>
      </div>

      {/* Journal container with binding effect */}
      <div className={clsx(
        "relative w-full rounded-lg overflow-hidden shadow-lg",
        `${themePrefix}-journal-container`
      )}>
        {/* Central binding */}
        <div className={clsx(
          "absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-8",
          "hidden md:block", // Only show binding on larger screens
          `${themePrefix}-journal-binding`
        )}>
          {/* Binding stitches */}
          <div className="absolute inset-0 flex flex-col justify-evenly items-center">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={clsx(
                  "w-1 h-4 rounded-full",
                  `${themePrefix}-journal-stitch`
                )}
              ></div>
            ))}
          </div>
        </div>

        {/* Mobile pagination controls */}
        <div className="flex justify-between md:hidden px-4 pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={prevMobilePage}
            startIcon={<ChevronLeft size={16} />}
          >
            Prev
          </Button>
          <span className={clsx(
            "px-2 py-1 rounded-full text-xs",
            `${themePrefix}-journal-pagination`
          )}>
            {mobilePage + 1}/{totalMobilePages}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={nextMobilePage}
            endIcon={<ChevronRight size={16} />}
          >
            Next
          </Button>
        </div>

        {/* Desktop: Two-page journal layout */}
        <div className="hidden md:flex">
          <JournalPages>
            {/* Left Page Content */}
            <JournalPage side="left">
              {pageView === 'overview' ? (
                <>
                  <CampaignOverview loading={loading} />
                  <CharacterGallery npcs={npcs} loading={loading} />
                  <ActiveQuestsList quests={quests} loading={loading} />
                </>
              ) : (
                <StorySection chapters={chapters} loading={loading} />
              )}
            </JournalPage>

            {/* Right Page Content */}
            <JournalPage side="right">
              {pageView === 'overview' ? (
                <>
                  <RecentActivityChronicle activities={activities} loading={loading} />
                  <LocationsMap locations={locations} loading={loading} />
                  <RumorsSection rumors={rumors} loading={loading} />
                </>
              ) : (
                /* Story notes and potentially character relationship diagrams */
                <div className="space-y-6">
                  <div className={clsx(
                    "p-4 rounded",
                    `${themePrefix}-journal-paper`
                  )}>
                    <h3 className={clsx(
                      "text-lg font-medium mb-2",
                      `${themePrefix}-journal-heading`
                    )}>
                      My Notes
                    </h3>
                    <div className={clsx(
                      "min-h-32 p-3 rounded leading-relaxed",
                      `${themePrefix}-journal-notes-area`
                    )}>
                      <p className="italic text-gray-500">
                        (Your character's notes about the story will appear here...)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </JournalPage>
          </JournalPages>
        </div>

        {/* Mobile: Single page view with pagination */}
        <div className="md:hidden">
          <JournalPage side="single">
            {mobilePage === 0 && (
              <>
                <CampaignOverview loading={loading} />
                <CharacterGallery npcs={npcs} loading={loading} />
              </>
            )}
            {mobilePage === 1 && (
              <>
                <ActiveQuestsList quests={quests} loading={loading} />
                <RecentActivityChronicle activities={activities} loading={loading} />
              </>
            )}
            {mobilePage === 2 && (
              <>
                <LocationsMap locations={locations} loading={loading} />
                <RumorsSection rumors={rumors} loading={loading} />
              </>
            )}
          </JournalPage>
        </div>
      </div>
    </div>
  );
};

export default JournalLayout;