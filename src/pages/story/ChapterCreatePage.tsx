// pages/story/ChapterCreatePage.tsx
import React from 'react';
import { ChapterForm, useStory } from 'features/storytelling';
import Breadcrumb from 'shared/components/Breadcrumb';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';

/**
 * Page for creating a new chapter.
 *
 * Write route ("story", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to write a chapter" in place, rather than the old `!user` redirect
 * effect that bounced them straight back to `/story` before the page could
 * say why.
 */
const ChapterCreatePage: React.FC = () => {
  const { isLoading } = useStory();

  const gate = usePageGate('story', { loading: isLoading, mode: 'write' });

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Session Chapters', href: '/story/chapters' },
    { label: 'Create Chapter' }
  ];

  return (
    <PageShell
      title="Create New Chapter"
      breadcrumb={<Breadcrumb items={breadcrumbItems} className="mb-4" />}
    >
      <GatedContent gate={gate}>
        <ChapterForm mode="create" />
      </GatedContent>
    </PageShell>
  );
};

export default ChapterCreatePage;
