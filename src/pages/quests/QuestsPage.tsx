// src/pages/QuestsPage.tsx
import React, { useState, useMemo } from 'react';
import Typography from '../../components/core/Typography';
import Card from '../../components/core/Card';
import Input from '../../components/core/Input';
import Button from '../../components/core/Button';
import { QuestStatus } from '../../types/quest';
import QuestCard from '../../components/features/quests/QuestCard';
import { useFirebase } from '../../context/FirebaseContext';
import { useQuests } from '../../context/QuestContext';
import { useNavigation } from '../../hooks/useNavigation';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';
import { 
  Scroll, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Search, 
  MapPin, 
  Loader2,
  Plus 
} from 'lucide-react';

const QuestsPage: React.FC = () => {
  // Auth state
  const { user } = useFirebase();
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Get quests data
  const { quests, loading, error } = useQuests();
  
  // URL and filters state
  const { getCurrentQueryParams } = useNavigation();
  const { highlight: highlightedQuestId } = getCurrentQueryParams();
  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate stats
  const stats = useMemo(() => ({
    active: quests.filter(q => q.status === 'active').length,
    completed: quests.filter(q => q.status === 'completed').length,
    failed: quests.filter(q => q.status === 'failed').length,
  }), [quests]);

  // Get unique locations for filter dropdown
  const locations = useMemo(() => {
    const uniqueLocations = new Set(quests.map(q => q.location).filter(Boolean));
    return Array.from(uniqueLocations).sort();
  }, [quests]);

  // Filter quests based on status, location and search query
  const filteredQuests = useMemo(() => {
    return quests.filter(quest => {
      // Status filter
      if (statusFilter !== 'all' && quest.status !== statusFilter) {
        return false;
      }

      // Location filter - must match exactly
      if (locationFilter !== 'all') {
        if (quest.location?.toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          quest.title.toLowerCase().includes(search) ||
          quest.description.toLowerCase().includes(search) ||
          quest.objectives.some(obj => obj.description.toLowerCase().includes(search)) ||
          quest.relatedNPCIds?.some(npc => npc.toLowerCase().includes(search))
        );
      }

      return true;
    });
  }, [quests, statusFilter, locationFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className={clsx("w-6 h-6 animate-spin", `${themePrefix}-primary`)} />
            <Typography>Loading quests...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <Typography color="error">
            Error Loading Quests. Sign in to view content.
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Typography variant="h1" className="mb-2">
            Campaign Quests
          </Typography>
          <Typography color="secondary">
            Track your party's epic adventures and missions
          </Typography>
        </div>

        {/* Auth actions */}
        <div className="flex gap-2">
          {user && (
            <Button
              onClick={() => navigateToPage('/quests/create')}
              startIcon={<Plus className="w-5 h-5" />}
            >
              Create Quest
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Scroll className={clsx("w-8 h-8 mr-4", `${themePrefix}-status-active`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.active}
              </Typography>
              <Typography color="secondary">
                Active Quests
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <CheckCircle2 className={clsx("w-8 h-8 mr-4", `${themePrefix}-status-completed`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.completed}
              </Typography>
              <Typography color="secondary">
                Completed
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <XCircle className={clsx("w-8 h-8 mr-4", `${themePrefix}-status-failed`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.failed}
              </Typography>
              <Typography color="secondary">
                Failed
              </Typography>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <Card.Content className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 w-full md:w-auto">
            <Input
              startIcon={<Search className={`${themePrefix}-typography-secondary`} />}
              placeholder="Search quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />
          </div>
          
          <div className="flex items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className={`${themePrefix}-typography-secondary`} />
              <Typography variant="body-sm">Status:</Typography>
              <select
                className={clsx("rounded border p-1", `${themePrefix}-input`)}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as QuestStatus | 'all')}
              >
                <option value="all">All Quests</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Location Filter */}
            {locations.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin size={20} className={`${themePrefix}-typography-secondary`} />
                <Typography variant="body-sm">Location:</Typography>
                <select
                  className={clsx("rounded border p-1", `${themePrefix}-input`)}
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="all">All Locations</option>
                  {locations.map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Quest List */}
      <div className="space-y-6">
        {filteredQuests.map(quest => (
          <div
            key={quest.id}
            id={`quest-${quest.id}`}
            className={clsx(
              `transition-all duration-300`,
              highlightedQuestId === quest.id ? `${themePrefix}-highlighted-item` : ''
            )}
          >
            <QuestCard quest={quest} />
          </div>
        ))}
        
        {filteredQuests.length === 0 && (
          <Card>
            <Card.Content className="text-center py-12">
              <Scroll className={clsx("w-12 h-12 mx-auto mb-4", `${themePrefix}-typography-secondary`)} />
              <Typography variant="h3" className="mb-2">
                No Quests Found
              </Typography>
              <Typography color="secondary">
                {searchQuery
                  ? 'No quests match your search criteria'
                  : statusFilter === 'all' 
                    ? 'There are no quests to display'
                    : `No ${statusFilter} quests found`}
              </Typography>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuestsPage;