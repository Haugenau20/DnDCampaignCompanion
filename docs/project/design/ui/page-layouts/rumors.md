# Rumors Page Layout and Design

## Page Structure

### Main Layout

The Rumors page follows the application's standard layout with these key sections:

1. **Header Section**
   - Page title ("Rumors")
   - Add Rumor button (floating action button on mobile)
   - Toggle for batch selection mode

2. **Statistics Cards Row**
   - Total Rumors count
   - Confirmed Rumors count
   - Unconfirmed Rumors count
   - False Rumors count

3. **Filter Bar**
   - Search input field
   - Status filter dropdown
   - Source filter dropdown
   - Location filter dropdown
   - Sort options dropdown

4. **Rumor List**
   - Grid of rumor cards (desktop)
   - Vertical list of rumor cards (mobile)
   - Pagination controls or infinite scroll for large collections

5. **Batch Action Bar** (visible when in selection mode)
   - Selected count indicator
   - Delete Selected button
   - Update Status dropdown
   - Combine Selected button
   - Convert to Quest button

### Rumor Card Design

Each rumor card has the following elements:

1. **Header**
   - Verification status indicator (color + icon)
   - Title
   - Source information with appropriate icon
   - Expand/collapse toggle

2. **Body** (expanded view)
   - Rumor content
   - Related NPCs section with links
   - Related Locations section with links
   - Notes section

3. **Footer**
   - Creation information (username + date)
   - Action buttons:
     - Edit button
     - Convert to Quest button
     - Delete button

## Component Specifications

### Verification Status Indicator

- **Confirmed**
  - Green dot/checkmark icon
  - Left border: 4px solid green
  - Text label: "Confirmed"

- **Unconfirmed**
  - Yellow/amber dot/question mark icon
  - Left border: 4px solid amber
  - Text label: "Unconfirmed"

- **False**
  - Red dot/X icon
  - Left border: 4px solid red
  - Text label: "False"

### Source Representation

- **NPC Source**
  - Person icon
  - Name with link to NPC page
  - Optional parenthetical location

- **Tavern/Inn Source**
  - Building icon
  - Tavern name
  - Optional location reference

- **Written Notice Source**
  - Scroll/parchment icon
  - Notice type description

- **Traveler Source**
  - Road/traveler icon
  - Traveler description

- **Other Source**
  - Generic information icon
  - Custom source description

### Related Items Section

- Grid of connected items (NPCs, locations)
- Each item shows:
  - Appropriate icon
  - Name as link to entity page
  - Subtle divider between items
  - "View all" expansion if many items

## Dialog Designs

### Add/Edit Rumor Dialog

1. **Basic Information Section**
   - Title field
   - Content textarea
   - Verification status selection (radio buttons with color coding)

2. **Source Selection Section**
   - Two tabs:
     - "Existing NPC" tab with grid selection
     - "Custom Source" tab with type and name fields

3. **Related Entities Section**
   - NPC selection with search and multi-select
   - Location selection with search and multi-select

4. **Notes Section**
   - Notes textarea
   - Option to add user attribution to note

### Combine Rumors Dialog

1. **Selected Rumors Section**
   - List of selected rumors with verification status
   - Option to remove individual rumors from combination

2. **Combined Information Section**
   - Auto-generated title field (editable)
   - Combined content preview with attribution markers
   - Option to manually edit combined content

3. **Integration Options**
   - Checkboxes for:
     - Include all related NPCs
     - Include all related locations
     - Mark source rumors as "Confirmed" after combining

## Interaction Patterns

### Single Rumor Operations

1. **View Details Flow**
   - Click rumor card to expand/collapse details
   - Expanded view shows complete rumor information
   - Related entities are clickable to navigate

2. **Edit Flow**
   - Click edit button to open edit dialog
   - Pre-populated with current rumor data
   - Save/cancel buttons to confirm/discard changes

3. **Convert to Quest Flow**
   - Click "Convert to Quest" button
   - Open quest creation form pre-filled with rumor data
   - Option to keep or modify auto-populated fields
   - Post-creation, rumor shows link to created quest

### Batch Operations

1. **Selection Mode**
   - Toggle "Select Mode" button to enable selection
   - Checkboxes appear on all rumor cards
   - Batch action bar appears at bottom of screen

2. **Batch Status Update**
   - Select multiple rumors
   - Choose status from dropdown in batch action bar
   - Confirmation dialog for large selections
   - Success notification on completion

3. **Combine Flow**
   - Select multiple rumors
   - Click "Combine" in batch action bar
   - Opens combine dialog with preview
   - Generates new rumor from combined information
   - Option to delete or retain source rumors

4. **Batch Convert to Quest**
   - Select multiple rumors
   - Click "Convert to Quest" in batch action bar
   - Opens quest creation form with combined data
   - Creates new quest linked to all source rumors

## Responsive Design Considerations

### Desktop Layout (≥1024px)
- Grid layout with 3 columns of rumor cards
- Expanded statistics cards in single row
- Full filter bar visible
- Action buttons with text labels

### Tablet Layout (768px - 1023px)
- Grid layout with 2 columns of rumor cards
- Statistics cards in single row, more compact
- Filter options in scrollable row
- Compact action buttons with text labels

### Mobile Layout (≤767px)
- Single column list of rumor cards
- Statistics cards in 2x2 grid
- Filter options collapsed into dropdown menu
- Action buttons as icons with tooltips
- Floating action button for adding rumors

## Data Structure

```typescript
interface Rumor {
  id: string;
  title: string;
  content: string;
  status: 'unconfirmed' | 'confirmed' | 'false';
  sourceType: 'npc' | 'tavern' | 'notice' | 'traveler' | 'other';
  sourceName: string;
  sourceNpcId?: string; // Optional reference to NPC if source is an NPC
  location: string;
  locationId?: string; // Optional reference to location in system
  dateAdded: string;
  dateModified: string;
  createdBy: string; // User UID
  createdByUsername: string; // Username for display
  modifiedBy: string; // User UID of last modifier
  modifiedByUsername: string; // Username for display
  relatedNPCs: string[]; // Array of NPC IDs
  relatedLocations: string[]; // Array of location IDs
  notes: {
    id: string;
    content: string;
    dateAdded: string;
    addedBy: string;
    addedByUsername: string;
  }[];
  convertedToQuestId?: string; // If rumor was converted to quest
}
```

## Visual Examples

### Rumor Card States

```
┌─────────────────────────────────────┐
│ ● UNCONFIRMED    [Expand ▼]         │
├─────────────────────────────────────┤
│ Strange Lights in the Forest        │
│                                     │
│ 🧙‍♂️ From: Old Man Jenkins          │
│                                     │
│ Added by: RangerBob                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✓ CONFIRMED      [Collapse ▲]       │
├─────────────────────────────────────┤
│ Dragon Sighted Near Mountain Pass   │
│                                     │
│ 🏠 From: Crossroads Inn             │
│                                     │
│ Multiple travelers reported seeing  │
│ a large red dragon flying over the  │
│ northern mountain pass three days   │
│ ago. Livestock has gone missing.    │
│                                     │
│ Related NPCs:                       │
│ • Innkeeper Jorgen                  │
│ • Merchant Silvia                   │
│                                     │
│ Related Locations:                  │
│ • Northern Mountain Pass            │
│ • Thorndale Village                 │
│                                     │
│ Added by: RangerBob - 3 days ago    │
│                                     │
│ [Edit] [Convert to Quest] [Delete]  │
└─────────────────────────────────────┘
```

### Batch Selection Mode

```
┌─────────────────────────────────────┐
│ [✓] ● UNCONFIRMED                   │
├─────────────────────────────────────┤
│ Strange Lights in the Forest        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [✓] ● UNCONFIRMED                   │
├─────────────────────────────────────┤
│ Missing Shipment of Weapons         │
└─────────────────────────────────────┘

──────────────────────────────────────

Selected: 2 rumors
[Delete] [Set Status ▼] [Combine] [Convert to Quest]
```