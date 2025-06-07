// src/utils/note-relationships.ts
import { EntityType } from "../types/note";
import firebaseServices from "../services/firebase";

/**
 * Entity reference interface for connecting notes and campaign elements
 */
export interface EntityReference {
  /** ID of the entity */
  id: string;
  /** Type of entity (npc, location, etc.) */
  type: EntityType;
  /** ID of the note this entity is from */
  noteId: string;
  /** Title or name of the entity, if available */
  title?: string;
}

/**
 * Maps entity types to their collection names
 */
const entityCollectionMap: Record<EntityType, string> = {
  npc: "npcs",
  location: "locations",
  quest: "quests",
  rumor: "rumors"
};

/**
 * Links a note to an entity (NPC, location, etc.)
 * @param noteId ID of the note to link
 * @param entityId ID of the campaign entity
 * @param entityType Type of entity being linked
 */
export const linkNoteToEntity = async (
  noteId: string,
  entityId: string,
  entityType: EntityType
): Promise<void> => {
  const collection = entityCollectionMap[entityType];
  if (!collection) {
    throw new Error(`Unsupported entity type: ${entityType}`);
  }
  
  const fieldName: string = "relatedNotes";
  
  type EntityWithNotes = {
    relatedNotes?: string[];
    [key: string]: any;
  };
  
  // Get current entity
  const entity = await firebaseServices.document.getDocument(collection, entityId) as EntityWithNotes;
  if (!entity) throw new Error("Entity not found");
  
  // Add note ID to entity if not already present
  const currentNotes = entity[fieldName] || [];
  if (!currentNotes.includes(noteId)) {
    const updatedNotes = [...currentNotes, noteId];
    await firebaseServices.document.updateDocument(collection, entityId, {
      [fieldName]: updatedNotes
    });
  }
};

/**
 * Removes link between note and entity
 * @param noteId ID of the note to unlink
 * @param entityId ID of the campaign entity
 * @param entityType Type of entity being unlinked
 */
export const unlinkNoteFromEntity = async (
  noteId: string,
  entityId: string,
  entityType: EntityType
): Promise<void> => {
  const collection = entityCollectionMap[entityType];
  if (!collection) {
    throw new Error(`Unsupported entity type: ${entityType}`);
  }
  
  const fieldName: string = "relatedNotes";
  
  type EntityWithNotes = {
    relatedNotes?: string[];
    [key: string]: any;
  };
  
  // Get current entity
  const entity = await firebaseServices.document.getDocument(collection, entityId) as EntityWithNotes;
  if (!entity) return;
  
  // Remove note ID from entity
  const currentNotes = entity[fieldName] || [];
  const updatedNotes = currentNotes.filter((id: string) => id !== noteId);
  
  await firebaseServices.document.updateDocument(collection, entityId, {
    [fieldName]: updatedNotes
  });
};

/**
 * Gets all entities related to a note
 * @param noteId ID of the note to find related entities for
 * @returns Array of entity references 
 */
export const getEntitiesForNote = async (noteId: string): Promise<EntityReference[]> => {
  const references: EntityReference[] = [];
  
  // Check each collection for entities referencing this note
  for (const [type, collection] of Object.entries(entityCollectionMap)) {
    try {
      type Entity = { id: string; name?: string; title?: string; [key: string]: any };

      const entities = await firebaseServices.document.queryDocuments(
        collection,
        "relatedNotes",
        "array-contains",
        noteId
      ) as Entity[];
      
      entities.forEach(entity => {
        references.push({
          id: entity.id,
          type: type as EntityType,
          noteId,
          // Extract a title from the entity if available
          title: entity.name || entity.title || `${type} ${entity.id}`
        });
      });
    } catch (error) {
      console.error(`Error querying ${collection} for note relationships:`, error);
    }
  }
  
  return references;
};