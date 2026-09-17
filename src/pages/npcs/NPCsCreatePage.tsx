// src/pages/npcs/NPCsCreatePage.tsx
import React from 'react';
import QuickAddPage from 'shared/components/quick-add/QuickAddPage';

/**
 * Page for creating a new NPC.
 *
 * Since `15-1` this is quick add's route mount rather than a page carrying
 * `NPCForm`'s twenty-one controls: two fields, then the record. The route is
 * kept because note conversion navigates to it and a pasted link must land
 * somewhere. `NPCForm` itself is untouched and still serves `/npcs/edit/:id`
 * until `15-8` retires it.
 *
 * Write route ("npcs", `mode: "write"`) so a signed-out visitor sees "Sign in
 * to add an NPC" in place of the form, rather than a form whose submit would
 * fail anyway once it reached the NPC context.
 */
const NPCsCreatePage: React.FC = () => (
  <QuickAddPage entity="npc" gateKey="npcs" sectionPath="/npcs" sectionLabel="NPCs" />
);

export default NPCsCreatePage;
