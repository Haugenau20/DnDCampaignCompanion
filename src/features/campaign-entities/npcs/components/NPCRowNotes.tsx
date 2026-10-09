// src/features/campaign-entities/npcs/components/NPCRowNotes.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import { RosterField } from 'core/components/Roster';
import { formatNoteDate } from 'shared/utils/dateFormatter';
import { useCampaignRecordNotes } from '../../shared/recordNotes';
import type { NPC, NPCNote } from '../types';

/**
 * An NPC's notes in the list's open row: their own documents (T133), read
 * only while the row is open.
 *
 * @returns The row's Notes field
 */
const NPCRowNotes: React.FC<{ npc: NPC }> = ({ npc }) => {
  const notes = useCampaignRecordNotes<NPCNote>('npcs', npc.id);
  return (
    <RosterField label="Notes" emptyText="No notes yet">
      {notes.length ? (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.noteId} className="flex gap-3 px-3 py-2.5 rounded-md bg-secondary">
              <Typography variant="body-sm" color="muted" className="text-xs whitespace-nowrap">
                {formatNoteDate(note.date)}
              </Typography>
              <Typography variant="body-sm">{note.text}</Typography>
            </div>
          ))}
        </div>
      ) : undefined}
    </RosterField>
  );
};

export default NPCRowNotes;
