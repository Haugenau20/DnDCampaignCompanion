// src/components/shared/__tests__/AttributionInfo.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AttributionInfo from '../AttributionInfo';

// ---------------------------------------------------------------------------
// Mock firebase context
// ---------------------------------------------------------------------------
jest.mock('../../../context/firebase', () => ({
  useFirebase: jest.fn(),
}));

const { useFirebase } = require('../../../context/firebase');

// ---------------------------------------------------------------------------
// Mock attribution-utils
// ---------------------------------------------------------------------------
jest.mock('../../../utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(),
  fetchAttributionUsernames: jest.fn(),
}));

const { determineAttributionActor, fetchAttributionUsernames } =
  require('../../../utils/attribution-utils');

// ---------------------------------------------------------------------------
// Mock firebase services
// ---------------------------------------------------------------------------
jest.mock('../../../services/firebase', () => ({
  default: {},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides = {}) {
  return {
    createdByUsername: 'TestUser',
    createdBy: 'uid-test',
    dateAdded: '2024-01-15T10:00:00.000Z',
    modifiedByUsername: undefined,
    modifiedBy: undefined,
    dateModified: undefined,
    createdByCharacterId: null,
    createdByCharacterName: null,
    modifiedByCharacterId: null,
    modifiedByCharacterName: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AttributionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default the active group is set
    (useFirebase as jest.Mock).mockReturnValue({ activeGroupId: 'group-1' });
    // By default fetchAttributionUsernames resolves to an empty map
    (fetchAttributionUsernames as jest.Mock).mockResolvedValue({});
    // determineAttributionActor returns based on item fields
    (determineAttributionActor as jest.Mock).mockImplementation((item: any) => {
      return item.createdByCharacterName || item.createdByUsername || '';
    });
  });

  // -------------------------------------------------------------------------
  // Renders nothing with no attribution data
  // -------------------------------------------------------------------------
  describe('no attribution data', () => {
    test('should render nothing when no attribution data is present', () => {
      (determineAttributionActor as jest.Mock).mockReturnValue('');
      const { container } = render(<AttributionInfo item={{}} />);
      // Component returns null → container has an empty div wrapper
      expect(container.firstChild).toBeNull();
    });

    test('should render nothing when both creator and modifier resolve to empty', () => {
      (determineAttributionActor as jest.Mock).mockReturnValue('');
      const item = makeItem({ createdByUsername: undefined, createdBy: undefined });
      const { container } = render(<AttributionInfo item={item} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Creator attribution
  // -------------------------------------------------------------------------
  describe('creator attribution', () => {
    test('should display "Added by" with creator username and date', () => {
      (determineAttributionActor as jest.Mock).mockReturnValueOnce('TestUser').mockReturnValueOnce('');
      const item = makeItem({ dateAdded: '2024-01-15T10:00:00.000Z' });
      render(<AttributionInfo item={item} />);
      expect(screen.getByText(/Added by TestUser/)).toBeInTheDocument();
    });

    test('should format the creation date in the text', () => {
      (determineAttributionActor as jest.Mock).mockReturnValueOnce('TestUser').mockReturnValueOnce('');
      const item = makeItem({ dateAdded: '2024-01-15T10:00:00.000Z' });
      render(<AttributionInfo item={item} />);
      // Date format: en-uk = dd/mm/yyyy
      expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument();
    });

    test('should not render creator section when dateAdded is missing', () => {
      (determineAttributionActor as jest.Mock).mockReturnValueOnce('TestUser').mockReturnValueOnce('');
      const item = makeItem({ dateAdded: undefined });
      render(<AttributionInfo item={item} />);
      expect(screen.queryByText(/Added by/)).not.toBeInTheDocument();
    });

    test('should display character name when createdByCharacterName is set', () => {
      (determineAttributionActor as jest.Mock).mockReturnValueOnce('Aragorn').mockReturnValueOnce('');
      const item = makeItem({
        createdByCharacterName: 'Aragorn',
        dateAdded: '2024-01-15T10:00:00.000Z',
      });
      render(<AttributionInfo item={item} />);
      expect(screen.getByText(/Added by Aragorn/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Modifier attribution
  // -------------------------------------------------------------------------
  describe('modifier attribution', () => {
    test('should display "Modified by" when modifier differs from creator and later date', () => {
      (determineAttributionActor as jest.Mock)
        .mockReturnValueOnce('TestUser')   // creator
        .mockReturnValueOnce('Editor');    // modifier
      const item = makeItem({
        dateAdded: '2024-01-15T10:00:00.000Z',
        modifiedByUsername: 'Editor',
        modifiedBy: 'uid-editor',
        dateModified: '2024-06-20T10:00:00.000Z', // clearly later
      });
      render(<AttributionInfo item={item} />);
      expect(screen.getByText(/Modified by Editor/)).toBeInTheDocument();
    });

    test('should not display modifier section when dateModified is missing', () => {
      (determineAttributionActor as jest.Mock)
        .mockReturnValueOnce('TestUser')
        .mockReturnValueOnce('Editor');
      const item = makeItem({
        modifiedByUsername: 'Editor',
        dateModified: undefined,
      });
      render(<AttributionInfo item={item} />);
      expect(screen.queryByText(/Modified by/)).not.toBeInTheDocument();
    });

    test('should not display modifier when same user modifies within 1 second of creation', () => {
      (determineAttributionActor as jest.Mock)
        .mockReturnValueOnce('TestUser')
        .mockReturnValueOnce('TestUser'); // same actor
      const dateAdded = '2024-01-15T10:00:00.000Z';
      const dateModified = '2024-01-15T10:00:00.500Z'; // 500ms later — within buffer
      const item = makeItem({
        dateAdded,
        modifiedByUsername: 'TestUser',
        dateModified,
      });
      render(<AttributionInfo item={item} />);
      expect(screen.queryByText(/Modified by/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Username lookup fallback
  // -------------------------------------------------------------------------
  describe('username lookup fallback', () => {
    test('should call fetchAttributionUsernames when createdBy is set without username', async () => {
      (determineAttributionActor as jest.Mock).mockReturnValue('FetchedUser');
      (fetchAttributionUsernames as jest.Mock).mockResolvedValue({ 'uid-test': 'FetchedUser' });
      const item = makeItem({
        createdBy: 'uid-test',
        createdByUsername: undefined,
        createdByCharacterName: undefined,
        dateAdded: '2024-01-15T10:00:00.000Z',
      });
      render(<AttributionInfo item={item} />);
      await waitFor(() => {
        expect(fetchAttributionUsernames).toHaveBeenCalledWith(
          'group-1',
          expect.arrayContaining(['uid-test']),
          expect.anything()
        );
      });
    });

    test('should NOT call fetchAttributionUsernames when createdByUsername is already available', async () => {
      (determineAttributionActor as jest.Mock).mockReturnValue('TestUser');
      const item = makeItem({
        createdByUsername: 'TestUser',
        dateAdded: '2024-01-15T10:00:00.000Z',
      });
      render(<AttributionInfo item={item} />);
      // Wait a tick to allow any effects to run
      await waitFor(() => {
        expect(fetchAttributionUsernames).not.toHaveBeenCalled();
      });
    });

    test('should NOT call fetchAttributionUsernames when no activeGroupId', async () => {
      (useFirebase as jest.Mock).mockReturnValue({ activeGroupId: null });
      (determineAttributionActor as jest.Mock).mockReturnValue('');
      const item = makeItem({
        createdBy: 'uid-test',
        createdByUsername: undefined,
      });
      render(<AttributionInfo item={item} />);
      await waitFor(() => {
        expect(fetchAttributionUsernames).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Prop variations
  // -------------------------------------------------------------------------
  describe('prop variations', () => {
    test('should handle item with only createdBy (no username) without crashing', () => {
      (determineAttributionActor as jest.Mock).mockReturnValue('');
      const item = { createdBy: 'uid-only' };
      expect(() => render(<AttributionInfo item={item} />)).not.toThrow();
    });

    test('should handle an empty item object without crashing', () => {
      (determineAttributionActor as jest.Mock).mockReturnValue('');
      expect(() => render(<AttributionInfo item={{}} />)).not.toThrow();
    });

    test('should handle item with both character and username attribution', () => {
      // character name takes priority per determineAttributionActor
      (determineAttributionActor as jest.Mock).mockReturnValueOnce('Frodo Baggins').mockReturnValueOnce('');
      const item = makeItem({
        createdByCharacterName: 'Frodo Baggins',
        createdByUsername: 'frodobaggins',
        dateAdded: '2024-01-15T10:00:00.000Z',
      });
      render(<AttributionInfo item={item} />);
      expect(screen.getByText(/Added by Frodo Baggins/)).toBeInTheDocument();
    });
  });
});
