// src/components/features/rumors/RumorDirectory.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Rumor, RumorStatus, SourceType } from '../../../types/rumor';
import RumorCard from './RumorCard';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import RumorBatchActions from './RumorBatchActions';
import { useRumors } from '../../../context/RumorContext';
import { useNavigation } from '../../../hooks/useNavigation';
import { useTheme } from '../../../themes/ThemeContext';
import clsx from 'clsx';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  MapPin,
  Users,
  RotateCw
} from 'lucide-react';

interface RumorDirectoryProps {
  rumors: Rumor[];
  isLoading?: boolean;
}

const RumorDirectory: React.FC<RumorDirectoryProps> = ({ 
  rumors: initialRumors,
  isLoading = false
}) => {
  // Rumor filtering and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RumorStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRumors, setSelectedRumors] = useState<Set<string>>(new Set());
  
  // For highlighting rumor from URL params
  const [highlightedRumorId, setHighlightedRumorId] = useState<string | null>(null);

  const { getCurrentQueryParams } = useNavigation();
  const { highlight: highlightId } = getCurrentQueryParams();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Check for highlighted rumor from URL
  useEffect(() => {
    if (highlightId) {
      setHighlightedRumorId(highlightId);
      // Scroll to the highlighted rumor
      setTimeout(() => {
        const element = document.getElementById(`rumor-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightId, initialRumors]);

  // Get unique locations for filter
  const locations = useMemo(() => {
    const uniqueLocations = new Set<string>();
    initialRumors.forEach(rumor => {
      if (rumor.location) {
        uniqueLocations.add(rumor.location);
      }
    });
    return Array.from(uniqueLocations).sort();
  }, [initialRumors]);

  // Filter rumors based on search and filters
  const filteredRumors = useMemo(() => {
    return initialRumors.filter(rumor => {
      // Status filter
      if (statusFilter !== 'all' && rumor.status !== statusFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && rumor.sourceType !== sourceFilter) {
        return false;
      }

      // Location filter
      if (locationFilter !== 'all' && rumor.location !== locationFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          rumor.title.toLowerCase().includes(search) ||
          rumor.content.toLowerCase().includes(search) ||
          rumor.sourceName.toLowerCase().includes(search) ||
          (rumor.createdByUsername && rumor.createdByUsername.toLowerCase().includes(search))
        );
      }

      return true;
    });
  }, [initialRumors, statusFilter, sourceFilter, locationFilter, searchQuery]);

  // Handle rumor selection
  const handleSelectRumor = (rumorId: string, selected: boolean) => {
    setSelectedRumors(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(rumorId);
      } else {
        newSet.delete(rumorId);
      }
      return newSet;
    });
  };

  // Handle batch selection toggle
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedRumors(new Set());
    }
  };

  // Handle batch actions completion
  const handleBatchActionsComplete = () => {
    setSelectionMode(false);
    setSelectedRumors(new Set());
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <div className="flex justify-center items-center py-8">
            <RotateCw className={`w-6 h-6 animate-spin ${themePrefix}-primary mr-3`} />
            <Typography>Loading rumors...</Typography>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <Card.Content className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Search */}
            <div className="flex-1 w-full md:w-auto">
              <Input
                startIcon={<Search className={`${themePrefix}-typography-secondary`} />}
                placeholder="Search rumors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter size={20} className={`${themePrefix}-typography-secondary`} />
                <Typography variant="body-sm">Status:</Typography>
                <select
                  className={`rounded border p-1 ${themePrefix}-input`}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RumorStatus | 'all')}
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="unconfirmed">Unconfirmed</option>
                  <option value="false">False</option>
                </select>
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-2">
                <Users size={20} className={`${themePrefix}-typography-secondary`} />
                <Typography variant="body-sm">Source:</Typography>
                <select
                  className={`rounded border p-1 ${themePrefix}-input`}
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceType | 'all')}
                >
                  <option value="all">All Sources</option>
                  <option value="npc">NPC</option>
                  <option value="tavern">Tavern</option>
                  <option value="notice">Notice</option>
                  <option value="traveler">Traveler</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Location Filter - only show if there are locations */}
              {locations.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin size={20} className={`${themePrefix}-typography-secondary`} />
                  <Typography variant="body-sm">Location:</Typography>
                  <select
                    className={`rounded border p-1 ${themePrefix}-input`}
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

              {/* Batch Selection Toggle */}
              <Button
                variant={selectionMode ? "primary" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
              >
                {selectionMode ? 'Exit Selection' : 'Select Rumors'}
              </Button>
            </div>
          </div>

          {/* Batch Actions Bar - only visible in selection mode */}
          {selectionMode && (
            <RumorBatchActions
              selectedRumors={selectedRumors}
              onComplete={handleBatchActionsComplete}
            />
          )}
        </Card.Content>
      </Card>

      {/* Rumors List */}
      <div className={`grid gap-4`}>
        {filteredRumors.map(rumor => (
          <div
            key={rumor.id}
            id={`rumor-${rumor.id}`}
            className={clsx(
              `transition-all duration-300`,
              highlightedRumorId === rumor.id ? `ring-2 ring-offset-2 rounded-lg ${themePrefix}-primary ring-opacity-100` : ''
            )}
          >
            <RumorCard 
              rumor={rumor} 
              onSelect={handleSelectRumor}
              selected={selectedRumors.has(rumor.id)}
              selectionMode={selectionMode}
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRumors.length === 0 && (
        <Card>
          <Card.Content className="text-center py-8">
            <HelpCircle className={`w-12 h-12 mx-auto ${themePrefix}-typography-secondary mb-4`} />
            <Typography variant="h3" className="mb-2">
              No Rumors Found
            </Typography>
            <Typography color="secondary">
              {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' || locationFilter !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'There are no rumors to display. Add your first rumor to get started.'}
            </Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default RumorDirectory;