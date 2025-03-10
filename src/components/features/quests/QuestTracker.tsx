// features/quests/QuestTracker.tsx
import React, { useState, useCallback } from 'react';
import { Quest, QuestStatus } from '../../../types/quest';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';
import { 
  Scroll, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Filter
} from 'lucide-react';

interface QuestTrackerProps {
  quests: Quest[];
  onUpdateQuest?: (quest: Quest) => void;
}

/**
 * QuestTracker component for managing and displaying quests
 * Supports filtering, sorting, and status updates
 */
const QuestTracker: React.FC<QuestTrackerProps> = ({ 
  quests,
  onUpdateQuest 
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // State for filters and sorting
  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [sortByDate, setSortByDate] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Filter quests based on status
  const filteredQuests = quests.filter(quest => 
    statusFilter === 'all' ? true : quest.status === statusFilter
  );

  // Sort quests by status and optionally by date
  const sortedQuests = [...filteredQuests].sort((a, b) => {
    if (sortByDate) {
      return new Date(b.id).getTime() - new Date(a.id).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  // Toggle quest expansion
  const toggleExpand = (questId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(questId)) {
      newExpanded.delete(questId);
    } else {
      newExpanded.add(questId);
    }
    setExpanded(newExpanded);
  };

  // Update quest status
  const handleStatusUpdate = useCallback((quest: Quest, newStatus: QuestStatus) => {
    if (onUpdateQuest) {
      onUpdateQuest({
        ...quest,
        status: newStatus
      });
    }
  }, [onUpdateQuest]);

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <Card>
        <Card.Content className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter size={20} className={`${themePrefix}-typography-secondary`} />
            <Typography variant="body-sm">Status:</Typography>
            <select
              className={clsx("rounded border p-1", `${themePrefix}-input`)}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuestStatus | 'all')}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortByDate(!sortByDate)}
            startIcon={sortByDate ? <ChevronDown /> : <ChevronUp />}
          >
            Sort by {sortByDate ? 'Date' : 'Name'}
          </Button>
        </Card.Content>
      </Card>

      {/* Quest List */}
      <div className="space-y-4">
        {sortedQuests.map(quest => (
          <Card 
            key={quest.id}
            className={clsx(
              "transition-all",
              quest.status === 'completed' ? 'opacity-75' : ''
            )}
          >
            <Card.Content className="space-y-4">
              {/* Quest Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Typography variant="h3" className="mb-1">
                    {quest.title}
                  </Typography>
                  <Typography color="secondary" className="mb-2">
                    {quest.description}
                  </Typography>
                </div>
                
                {/* Status Controls */}
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(quest, 'completed')}
                    startIcon={<CheckCircle2 className={`${themePrefix}-status-completed`} />}
                    disabled={quest.status === 'completed'}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(quest, 'failed')}
                    startIcon={<XCircle className={`${themePrefix}-status-failed`} />}
                    disabled={quest.status === 'failed'}
                  >
                    Fail
                  </Button>
                </div>
              </div>

              {/* Quest Details */}
              {expanded.has(quest.id) && (
                <div className={clsx("pl-4 border-l-2", `${themePrefix}-border`)}>
                  {/* Objectives */}
                  <Typography variant="h4" className="mb-2">
                    Objectives
                  </Typography>
                  <ul className="space-y-2 mb-4">
                    {quest.objectives.map(objective => (
                      <li 
                        key={objective.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={objective.completed}
                          onChange={() => {
                            if (onUpdateQuest) {
                              onUpdateQuest({
                                ...quest,
                                objectives: quest.objectives.map(obj =>
                                  obj.id === objective.id
                                    ? { ...obj, completed: !obj.completed }
                                    : obj
                                )
                              });
                            }
                          }}
                          className={`h-4 w-4 ${themePrefix}-input`}
                        />
                        <Typography
                          color={objective.completed ? 'secondary' : 'default'}
                          className={objective.completed ? 'line-through' : ''}
                        >
                          {objective.description}
                        </Typography>
                      </li>
                    ))}
                  </ul>

                  {/* Related NPCs */}
                  {quest.relatedNPCIds && quest.relatedNPCIds.length > 0 && (
                    <>
                      <Typography variant="h4" className="mb-2">
                        Related NPCs
                      </Typography>
                      <ul className="mb-4">
                        {quest.relatedNPCIds.map(npc => (
                          <li key={npc}>{npc}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Rewards */}
                  {quest.rewards && quest.rewards.length > 0 && (
                    <>
                      <Typography variant="h4" className="mb-2">
                        Rewards
                      </Typography>
                      <ul>
                        {quest.rewards.map((reward, index) => (
                          <li key={index}>{reward}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(quest.id)}
                className="w-full mt-2"
              >
                {expanded.has(quest.id) ? 'Show Less' : 'Show More'}
              </Button>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sortedQuests.length === 0 && (
        <Card>
          <Card.Content className="text-center py-8">
            <Scroll className={clsx("w-12 h-12 mx-auto mb-4", `${themePrefix}-typography-secondary`)} />
            <Typography variant="h3" className="mb-2">
              No Quests Found
            </Typography>
            <Typography color="secondary">
              {statusFilter === 'all' 
                ? 'You haven\'t added any quests yet.'
                : `No ${statusFilter} quests found.`}
            </Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default QuestTracker;