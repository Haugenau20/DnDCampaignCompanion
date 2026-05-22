// src/components/features/notes/__tests__/EntityCard.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EntityCard from '../EntityCard';
import { ExtractedEntity } from '../../../../types/note';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockConvertEntity = jest.fn();

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

const { useNotes } = require('../../../../context/NoteContext');

function setupMocks({ convertEntity = mockConvertEntity } = {}) {
  (useNotes as jest.Mock).mockReturnValue({ convertEntity });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: 'entity-1',
    text: 'Aldric the Wise',
    type: 'npc',
    confidence: 0.9,
    isConverted: false,
    createdAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConvertEntity.mockResolvedValue('created-npc-id');
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render entity text', () => {
      render(<EntityCard entity={makeEntity()} noteId="note-1" />);
      expect(screen.getByText('Aldric the Wise')).toBeInTheDocument();
    });

    test('should render entity type as "NPC" for npc type', () => {
      render(<EntityCard entity={makeEntity({ type: 'npc' })} noteId="note-1" />);
      expect(screen.getByText(/NPC/)).toBeInTheDocument();
    });

    test('should render entity type as "Location" for location type', () => {
      render(<EntityCard entity={makeEntity({ type: 'location', text: 'Silverkeep' })} noteId="note-1" />);
      expect(screen.getByText(/Location/)).toBeInTheDocument();
    });

    test('should render entity type as "Quest" for quest type', () => {
      render(<EntityCard entity={makeEntity({ type: 'quest', text: 'The Lost Artifact' })} noteId="note-1" />);
      expect(screen.getByText(/Quest/)).toBeInTheDocument();
    });

    test('should render entity type as "Rumor" for rumor type', () => {
      render(<EntityCard entity={makeEntity({ type: 'rumor', text: 'Dark times ahead' })} noteId="note-1" />);
      expect(screen.getByText(/Rumor/)).toBeInTheDocument();
    });

    test('should render confidence percentage', () => {
      render(<EntityCard entity={makeEntity({ confidence: 0.9 })} noteId="note-1" />);
      expect(screen.getByText(/90%/)).toBeInTheDocument();
    });

    test('should render confidence for low confidence entity', () => {
      render(<EntityCard entity={makeEntity({ confidence: 0.45 })} noteId="note-1" />);
      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });

    test('should render confidence for medium confidence entity (0.5–0.79 range)', () => {
      render(<EntityCard entity={makeEntity({ confidence: 0.65 })} noteId="note-1" />);
      expect(screen.getByText(/65%/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Conversion state
  // -------------------------------------------------------------------------
  describe('conversion state', () => {
    test('should render convert button for unconverted entities', () => {
      render(<EntityCard entity={makeEntity({ isConverted: false })} noteId="note-1" />);
      // Plus icon button is the convert button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should NOT render convert button for converted entities', () => {
      render(<EntityCard entity={makeEntity({ isConverted: true })} noteId="note-1" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Default entity type (lines 45, 63 — default cases in getEntityIcon and getEntityTypeName)
  // -------------------------------------------------------------------------
  describe('unknown entity type (default branch)', () => {
    test('should render the raw type string as name for unknown entity types (line 63)', () => {
      render(
        <EntityCard entity={makeEntity({ type: 'unknown' as any, text: 'Mystery Thing' })} noteId="note-1" />
      );
      // getEntityTypeName default returns the type string itself
      expect(screen.getByText(/unknown/i)).toBeInTheDocument();
    });

    test('should render without crashing for an unknown entity type (default icon, line 45)', () => {
      // getEntityIcon default returns <FileQuestion /> — just verify no crash
      expect(() => {
        render(
          <EntityCard entity={makeEntity({ type: 'other' as any, text: 'Odd Entity' })} noteId="note-1" />
        );
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Convert interaction
  // -------------------------------------------------------------------------
  describe('convert interaction', () => {
    test('should call convertEntity when convert button is clicked', async () => {
      render(<EntityCard entity={makeEntity({ id: 'e1', type: 'npc' })} noteId="note-42" />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(mockConvertEntity).toHaveBeenCalledWith('note-42', 'e1', 'npc');
      });
    });

    test('should call onConverted callback with entityId and createdId after conversion', async () => {
      const onConverted = jest.fn();
      render(
        <EntityCard
          entity={makeEntity({ id: 'e1', type: 'location' })}
          noteId="note-1"
          onConverted={onConverted}
        />
      );
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(onConverted).toHaveBeenCalledWith('e1', 'created-npc-id');
      });
    });

    test('should disable convert button while converting', async () => {
      // Make convertEntity hang
      let resolveConvert!: (id: string) => void;
      mockConvertEntity.mockReturnValue(new Promise<string>(res => { resolveConvert = res; }));

      render(<EntityCard entity={makeEntity()} noteId="note-1" />);
      const btn = screen.getByRole('button');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });

      // Cleanup
      resolveConvert('done');
    });

    test('should not crash when convertEntity throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockConvertEntity.mockRejectedValue(new Error('Conversion failed'));
      render(<EntityCard entity={makeEntity()} noteId="note-1" />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(mockConvertEntity).toHaveBeenCalled();
      });
      // Component should not have unmounted / crashed
      expect(screen.getByText('Aldric the Wise')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });
});
