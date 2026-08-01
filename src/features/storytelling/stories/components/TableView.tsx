// src/features/storytelling/stories/components/TableView.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import { Chapter } from 'features/storytelling/chapters/types';
import { Clock, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';

type SortField = 'order' | 'title' | 'lastModified';

interface TableViewProps {
  chapters: Chapter[];
  currentChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onEditChapter?: (chapterId: string) => void;
  isAdmin?: boolean;
}

const TableView: React.FC<TableViewProps> = ({
  chapters,
  currentChapterId,
  onChapterSelect,
  sortField,
  sortDirection,
  onSort,
  onEditChapter,
  isAdmin = false
}) => {
  /**
   * Sortable column header. Sorting lives on a real <button> so it is reachable by
   * keyboard, and aria-sort exposes the direction to screen readers. The arrow shows
   * on every sortable column — dimmed when inactive — so the other columns don't
   * look inert, and it points the way the sort actually runs.
   */
  const SortableHeader: React.FC<{
    field: SortField;
    label: string;
    className?: string;
  }> = ({ field, label, className }) => {
    const isActive = sortField === field;
    const Arrow = isActive ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <th
        scope="col"
        className={clsx('px-6 py-3 text-left', className)}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => onSort(field)}
          className="flex items-center gap-1 cursor-pointer"
        >
          <span className={clsx(isActive && 'font-semibold')}>{label}</span>
          <Arrow className={clsx('w-4 h-4', !isActive && 'opacity-40')} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <div className="rounded-lg overflow-hidden card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary border-b card-border">
              <SortableHeader field="order" label="Ch #" />
              <SortableHeader field="title" label="Title" />
              <SortableHeader
                field="lastModified"
                label="Last Updated"
                className="hidden md:table-cell"
              />
              <th scope="col" className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter, index) => {
              const isCurrentChapter = chapter.id === currentChapterId;
              
              return (
                <tr 
                  key={chapter.id}
                  className={clsx(
                    // `selectable-item` supplies the actual hover paint
                    // (background-color: var(--bg-accent)). The previous
                    // hover:bg-opacity-50 had no hover:bg-* to modulate, so rows
                    // had no hover feedback at all despite transition-colors.
                    "border-b last:border-b-0 transition-colors selectable-item",
                    `card-border`,
                    index % 2 ? `bg-secondary` : ''
                  )}
                >
                  <td className="px-6 py-4">
                    <Typography variant="body">{chapter.order}</Typography>
                  </td>
                  {/* Make title clickable */}
                  <td
                    className="px-6 py-4 cursor-pointer group"
                    onClick={() => onChapterSelect(chapter.id)}
                  >
                    <Typography
                      variant="body"
                      className={clsx(
                        isCurrentChapter ? 'font-semibold' : '',
                        // `.typography` is hand-written CSS, not a Tailwind utility,
                        // so `hover:typography` never generated a rule. Underline on
                        // row hover is a real affordance for a clickable title.
                        'group-hover:underline hover:underline'
                      )}
                    >
                      {chapter.title}
                    </Typography>
                    {chapter.summary && (
                      <Typography variant="body-sm" color="secondary" className="line-clamp-1">
                        {chapter.summary}
                      </Typography>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 primary" />
                      <Typography variant="body-sm" color="secondary">
                        {new Date(chapter.dateModified || chapter.dateAdded).toLocaleDateString()}
                      </Typography>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChapterSelect(chapter.id)}
                      className="text-sm"
                    >
                      Read
                    </Button>
                    {isAdmin && onEditChapter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditChapter(chapter.id)}
                        className="text-sm"
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;