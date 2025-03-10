// components/features/story/TableView.tsx
import React from 'react';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import { Chapter } from '../../../types/story';
import { useTheme } from '../../../context/ThemeContext';
import { Clock, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';

interface TableViewProps {
  chapters: Chapter[];
  currentChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
  sortField: 'order' | 'title' | 'lastModified';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'order' | 'title' | 'lastModified') => void;
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
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className={clsx("rounded-lg overflow-hidden", `${themePrefix}-card`)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={clsx(`${themePrefix}-bg-secondary border-b border-${themePrefix}-card-border`)}>
              <th 
                className={clsx("px-6 py-3 text-left cursor-pointer", 
                  sortField === 'order' ? `text-${themePrefix}-primary` : ''
                )}
                onClick={() => onSort('order')}
              >
                <div className="flex items-center gap-1">
                  <span>Ch #</span>
                  {sortField === 'order' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className={clsx("px-6 py-3 text-left cursor-pointer",
                  sortField === 'title' ? `text-${themePrefix}-primary` : ''
                )}
                onClick={() => onSort('title')}
              >
                <div className="flex items-center gap-1">
                  <span>Title</span>
                  {sortField === 'title' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className={clsx("px-6 py-3 text-left cursor-pointer hidden md:table-cell",
                  sortField === 'lastModified' ? `text-${themePrefix}-primary` : ''
                )}
                onClick={() => onSort('lastModified')}
              >
                <div className="flex items-center gap-1">
                  <span>Last Updated</span>
                  {sortField === 'lastModified' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter, index) => {
              const isCurrentChapter = chapter.id === currentChapterId;
              
              return (
                <tr 
                  key={chapter.id}
                  className={clsx(
                    "border-b last:border-b-0 hover:bg-opacity-50 transition-colors",
                    `border-${themePrefix}-card-border`,
                    isCurrentChapter ? `bg-${themePrefix}-bg-accent` : 
                      index % 2 ? `bg-${themePrefix}-card-bg` : ''
                  )}
                >
                  <td className="px-6 py-4">
                    <Typography variant="body">{chapter.order}</Typography>
                  </td>
                  {/* Make title clickable */}
                  <td 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => onChapterSelect(chapter.id)}
                  >
                    <Typography 
                      variant="body" 
                      className={clsx(
                        isCurrentChapter ? 'font-semibold' : '',
                        `hover:text-${themePrefix}-primary`
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
                      <Clock className={clsx("w-4 h-4", `text-${themePrefix}-text-secondary`)} />
                      <Typography variant="body-sm" color="secondary">
                        {new Date(chapter.lastModified || Date.now()).toLocaleDateString()}
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