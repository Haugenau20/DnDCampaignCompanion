// src/features/collaboration/entity-extraction/components/__tests__/EntityExtractor.test.tsx
//
// EntityExtractor was reduced to a thin wrapper around CampaignLinksPanel
// (Task 9): the extraction machinery -- save-before-analysis, dedup,
// filtering, the usage-limit panel -- all moved there, along with the
// "in your campaign" group that used to be NoteReferences. This suite
// verifies the wrapper delegates, forwarding its props and keeping the two
// deprecated-but-still-declared props (`existingReferences`,
// `referencesSearchComplete`) accepted without error, since NotePage still
// passes them and is owned by a later track.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EntityExtractor from '../EntityExtractor';

const mockCampaignLinksPanel = jest.fn();

jest.mock('../../../notes/components/CampaignLinksPanel', () => ({
  __esModule: true,
  default: (props: any) => {
    mockCampaignLinksPanel(props);
    return (
      <div data-testid="campaign-links-panel">
        <button onClick={() => props.onEntityConverted?.('ent-1', 'created-1')}>
          simulate-convert
        </button>
      </div>
    );
  },
}));

describe('EntityExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render CampaignLinksPanel', () => {
    render(<EntityExtractor noteId="note-1" />);
    expect(screen.getByTestId('campaign-links-panel')).toBeInTheDocument();
  });

  test('should forward noteId to CampaignLinksPanel', () => {
    render(<EntityExtractor noteId="note-42" />);
    expect(mockCampaignLinksPanel).toHaveBeenCalledWith(
      expect.objectContaining({ noteId: 'note-42' })
    );
  });

  test('should forward getCurrentEditorContent and saveCurrentEditorContent', () => {
    const getCurrentEditorContent = jest.fn();
    const saveCurrentEditorContent = jest.fn();

    render(
      <EntityExtractor
        noteId="note-1"
        getCurrentEditorContent={getCurrentEditorContent}
        saveCurrentEditorContent={saveCurrentEditorContent}
      />
    );

    expect(mockCampaignLinksPanel).toHaveBeenCalledWith(
      expect.objectContaining({ getCurrentEditorContent, saveCurrentEditorContent })
    );
  });

  test('should forward onEntityConverted and call it through the panel', () => {
    const onEntityConverted = jest.fn();

    render(<EntityExtractor noteId="note-1" onEntityConverted={onEntityConverted} />);

    fireEvent.click(screen.getByText('simulate-convert'));

    expect(onEntityConverted).toHaveBeenCalledWith('ent-1', 'created-1');
  });

  test('should accept existingReferences and referencesSearchComplete without error', () => {
    // These props are deprecated and ignored, but NotePage (owned by a later
    // track) still passes them, so the wrapper must keep declaring them.
    expect(() =>
      render(
        <EntityExtractor
          noteId="note-1"
          existingReferences={[
            { id: 'npc-1', type: 'npc', title: 'Gundren', matchingText: ['Gundren'] },
          ]}
          referencesSearchComplete={true}
        />
      )
    ).not.toThrow();
    expect(screen.getByTestId('campaign-links-panel')).toBeInTheDocument();
  });
});
