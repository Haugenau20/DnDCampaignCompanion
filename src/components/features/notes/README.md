# Notes Component

The Notes feature allows users to create and manage personal notes within their campaign.

## Key Features

- Individual note taking with automatic saving
- Entity extraction using OpenAI
- Ability to convert extracted entities into campaign elements
- Notes stored at path: `groups/{groupId}/users/{userId}/notes`

## Component Structure

- **NotesList**: Displays all user notes with creation option
- **NoteCard**: Card representation of a single note in the list
- **NoteEditor**: Interface for editing note title and content
- **EntityExtractor**: Extracts entities from note content
- **EntityCard**: Displays an extracted entity with conversion options
- **NoteReferences**: Shows connections between notes and campaign elements

## Data Flow

1. Notes are created and managed through `NoteContext`
2. Entity extraction performed through `useEntityExtractor` hook
3. Bidirectional relationships maintained through `note-relationships.ts`

## Usage

Notes can be accessed through the Notes section in the navigation menu. Each note is private to the individual user who created it.

## Technical Notes

- Entity extraction uses OpenAI API to identify important entities
- Notes have bidirectional relationships with campaign elements
- All note changes are automatically saved after a brief delay