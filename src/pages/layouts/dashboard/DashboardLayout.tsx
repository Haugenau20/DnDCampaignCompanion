// components/features/layouts/DashboardLayout.tsx
import React from 'react';
import ActivityFeed from './sections/ActivityFeed';
import CampaignStats from './sections/CampaignStats';
import OpenQuests from './sections/OpenQuests';
import RumorPrompt from './sections/RumorPrompt';
import PartyCrest from './sections/PartyCrest';

// Props interface for layout components
export interface LayoutProps {
  npcs: any[];
  locations: any[];
  quests: any[];
  chapters: any[];
  rumors: any[];
  activities: any[];
  loading: boolean;
}

/**
 * DashboardLayout component - the default grid-based layout.
 *
 * Reading order is now content-first: campaign header, then the counts as a single
 * hairline strip, then recent activity in the wide column with quests and prompts
 * beside it. Previously the stats took `lg:col-span-2` and activity was squeezed
 * into the remaining third, which gave the most space to the least interesting
 * thing on the page.
 */
const DashboardLayout: React.FC<LayoutProps> = ({
  npcs,
  locations,
  quests,
  chapters,
  rumors,
  activities,
  loading,
}) => {

  return (
    <>
      {/* The hero band is rendered by HomePage, above the page column: it bleeds
          to the viewport edges, and the column it used to live in sets
          `overflow-x-hidden`, which clipped the bleed back to the column's own
          width. The band's layout box was correct -- it measured flush -- but
          the paint was clipped, which is why it read as a floating card. */}

      {/* Counts, demoted to one strip across the full width */}
      <CampaignStats
        npcs={npcs}
        locations={locations}
        quests={quests}
        chapters={chapters}
        rumors={rumors}
        loading={loading}
      />

      {/* Content first: activity takes the wide column, ~1.6:1 against the aside */}
      <div className="w-full mt-8 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-9 lg:items-start">
        <div>
          <ActivityFeed
            activities={activities}
            loading={loading}
          />
        </div>

        <div className="mt-8 lg:mt-0 flex flex-col gap-7">
          <OpenQuests quests={quests} loading={loading} />
          {!loading && <RumorPrompt rumorCount={rumors.length} />}
          {!loading && <PartyCrest chapterCount={chapters.length} />}
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
