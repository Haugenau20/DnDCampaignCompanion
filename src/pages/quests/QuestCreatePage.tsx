// src/pages/quests/QuestCreatePage.tsx
import React from 'react';
import QuickAddPage from 'shared/components/quick-add/QuickAddPage';

/**
 * Page for creating a new quest.
 *
 * Since `15-1` this is quick add's route mount. Create Quest used to carry
 * twenty-one controls of which two were required, with nothing saying which
 * two until submit; it now asks for the two and nothing else.
 * `QuestCreateForm` is untouched and retires in `15-8`.
 *
 * Write route ("quests", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to add a quest" in place of the form, rather than a form whose submit
 * would fail anyway -- `QuestContext` throws "User must be authenticated to
 * add a quest" before any write.
 */
const QuestCreatePage: React.FC = () => (
  <QuickAddPage entity="quest" gateKey="quests" sectionPath="/quests" sectionLabel="Quests" />
);

export default QuestCreatePage;
