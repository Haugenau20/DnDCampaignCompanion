import React from 'react';
import Card from '../../core/Card';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import { Book, Clock, ChevronRight } from 'lucide-react';
import { useNavigation } from '../../../context/NavigationContext';

interface LatestChapterProps {
  chapter: {
    id: string;
    title: string;
    content: string;
    order: number;
    lastModified: string;
    summary?: string;
  };
}

const LatestChapter: React.FC<LatestChapterProps> = ({ chapter }) => {
  const { navigateToPage } = useNavigation();

  const handleContinueReading = () => {
    navigateToPage(`/story/chapters/${chapter.id}`);
  };

  return (
    <Card>
      <Card.Content className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 primary" />
            <Typography variant="h4">Latest Chapter</Typography>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 primary" />
            <Typography variant="body-sm" color="secondary">
              {new Date(chapter.lastModified).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})}
            </Typography>
          </div>
        </div>

        {/* Chapter Title */}
        <div>
          <Typography variant="h3">
            Chapter {chapter.order}: {chapter.title}
          </Typography>
        </div>

        {/* Summary */}
        {chapter.summary && (
          <Typography color="secondary">
            {chapter.summary}
          </Typography>
        )}

        {/* Preview of Content */}
        <Typography color="secondary" className="line-clamp-3">
          {chapter.content}
        </Typography>

        {/* Continue Reading Button */}
        <Button
          variant="ghost"
          onClick={handleContinueReading}
          endIcon={<ChevronRight />}
          className="w-full"
        >
          Continue Reading
        </Button>
      </Card.Content>
    </Card>
  );
};

export default LatestChapter;