// components/features/layouts/journal/JournalLayout.tsx
import React, { useState } from 'react';
import { LayoutProps } from '../dashboard/DashboardLayout';
import { Book, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../../core/Button';
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

      {/* View toggle */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm card-border">
          <Button
            variant={pageView === 'overview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPageView('overview')}
            startIcon={<Book size={16} />}
          >
            Overview
          </Button>
          <Button
            variant={pageView === 'story' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPageView('story')}
            startIcon={<Bookmark size={16} />}
          >
            Story
          </Button>
        </div>
      </div>

      {/* Journal container with binding effect */}
      <div className="relative w-full rounded-lg overflow-hidden shadow-lg journal-container">
        {/* Central binding */}
        <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-8 hidden md:block journal-binding">
          {/* Binding stitches */}
          <div className="absolute inset-0 flex flex-col justify-evenly items-center">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="w-1 h-4 rounded-full journal-stitch"
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
            <span className="px-2 py-1 rounded-full text-xs flex items-center justify-center relative -top-1 journal-pagination">
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
                  <LocationsMap locations={locations} loading={loading} />
                  <RumorsSection rumors={rumors} loading={loading} />
                </>
              ) : (
                /* Recent Activity */
                <>
                  <RecentActivityChronicle activities={activities} loading={loading} />
                </>
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