// components/features/story/TableView.tsx
import React from 'react';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import { Chapter } from '../../../types/story';
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
  onSort,
  onEditChapter,
  isAdmin = false
}) => {

  return (
    <div className="rounded-lg overflow-hidden card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary border-b card-border">
              <th 
                className={clsx("px-6 py-3 text-left cursor-pointer", 
                  sortField === 'order' ? `typography` : ''
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
                  sortField === 'title' ? `typography` : ''
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
                  sortField === 'lastModified' ? `typography` : ''
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
                    `card-border`, 
                    index % 2 ? `bg-secondary` : ''
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
                        `hover:typography`
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
                        {new Date(chapter.dateModified || chapter.dateAdded || chapter.modifiedAt || chapter.createdAt).toLocaleDateString()}
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