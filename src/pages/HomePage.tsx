// pages/HomePage.tsx
import React, { useMemo } from 'react';
import Typography from '../components/core/Typography';
import Card from '../components/core/Card';
import LatestChapter from '../components/features/story/LatestChapter';
import { useChapterData } from '../hooks/useChapterData';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import { Book, Scroll, Users, MapPin, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

/**
 * Interface for quick access section items
 */
interface QuickAccessItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

/**
 * HomePage component serving as the main landing page of the application
 */
const HomePage: React.FC = () => {
  const { chapters, loading, error } = useChapterData();
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Get the latest chapter from the fetched data
  const latestChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    
    // Sort chapters by order and get the latest one
    const sortedChapters = [...chapters].sort((a, b) => b.order - a.order);
    const latest = sortedChapters[0];
    
    if (!latest) return null;

    // Fix for date parsing issue
    let lastModifiedIso;
    try {
      if (latest.lastModified) {
        // Try to parse the date properly
        const date = new Date(latest.lastModified);
        // Check if date is valid before calling toISOString()
        if (!isNaN(date.getTime())) {
          lastModifiedIso = date.toISOString();
        } else {
          // Use current date if invalid
          lastModifiedIso = new Date().toISOString();
        }
      } else {
        // If lastModified is missing, use current date
        lastModifiedIso = new Date().toISOString();
      }
    } catch (e) {
      // Fallback to current date for any parsing errors
      console.error('Error parsing lastModified date:', e);
      lastModifiedIso = new Date().toISOString();
    }

    // Return with the safely formatted date
    return {
      ...latest,
      lastModified: lastModifiedIso
    };
  }, [chapters]);

  // Quick access section items
  const quickAccessItems: QuickAccessItem[] = [
    {
      title: 'Story',
      description: 'Follow your epic journey chapter by chapter',
      icon: <Book className="w-6 h-6" />,
      path: '/story'
    },
    {
      title: 'Quests',
      description: 'Track your ongoing adventures and rewards',
      icon: <Scroll className="w-6 h-6" />,
      path: '/quests'
    },
    {
      title: 'Rumors',
      description: 'Track and investigate rumors from across the realm',
      icon: <MessageSquare className="w-6 h-6" />,
      path: '/rumors'
    },
    {
      title: 'NPCs',
      description: 'Keep track of friends, foes, and everyone in between',
      icon: <Users className="w-6 h-6" />,
      path: '/npcs'
    },
    {
      title: 'Locations',
      description: 'Explore the world and its many destinations',
      icon: <MapPin className="w-6 h-6" />,
      path: '/locations'
    }
  ];

  return (
    <div className={clsx("max-w-7xl mx-auto px-4 py-8", `${themePrefix}-content`)}>
      {/* Hero Section */}
      <section className="text-center mb-12">
        <Typography variant="h1" className={`mb-4 ${themePrefix}-typography-heading`}>
          D&D Campaign Companion
        </Typography>
        <Typography variant="body-lg" color="secondary" className="mb-8">
          Your digital guide through epic adventures
        </Typography>
      </section>

      {/* Quick Access Section */}
      <section className="mb-12">
        <Typography variant="h2" className={`mb-6 ${themePrefix}-typography-heading`}>
          Quick Access
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickAccessItems.map((item) => (
            <Card
              key={item.path}
              hoverable
              onClick={() => navigateToPage(item.path)}
              className="h-full"
            >
              <Card.Content className="flex flex-col items-center text-center p-6">
                {/* Theme-specific icon container */}
                <div className={clsx(
                  "p-3 rounded-full mb-4",
                  `${themePrefix}-icon-bg`
                )}>
                  {/* Theme-specific icon color */}
                  <span className={clsx(`${themePrefix}-primary`)}>
                    {item.icon}
                  </span>
                </div>
                <Typography variant="h4" className={`mb-2 ${themePrefix}-typography-heading`}>
                  {item.title}
                </Typography>
                <Typography color="secondary">
                  {item.description}
                </Typography>
              </Card.Content>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Activity Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h2" className={`${themePrefix}-typography-heading`}>
            Recent Activity
          </Typography>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card>
              <Card.Content className="text-center py-8">
                <div className={clsx(
                  "animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4",
                  `border-${themePrefix}-primary`
                )} />
                <Typography variant="h3" className={`mb-2 ${themePrefix}-typography-heading`}>
                  Loading Recent Activity
                </Typography>
              </Card.Content>
            </Card>
          ) : error ? (
            <Card>
              <Card.Content className="text-center py-8">
                <Typography color="error" className="mb-2">
                  {"Error Loading Recent Activity. Sign in to view content."}
                </Typography>
              </Card.Content>
            </Card>
          ) : latestChapter ? (
            <LatestChapter chapter={latestChapter} />
          ) : (
            <Card>
              <Card.Content className="text-center py-8">
                <Book className={clsx(
                  "w-12 h-12 mx-auto mb-4",
                  `text-${themePrefix}-secondary`
                )} />
                <Typography variant="h3" className={`mb-2 ${themePrefix}-typography-heading`}>
                  No Chapters Available
                </Typography>
                <Typography color="secondary">
                  Start your adventure by adding your first chapter.
                </Typography>
              </Card.Content>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;