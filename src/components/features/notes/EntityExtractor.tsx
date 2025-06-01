// src/components/features/notes/EntityExtractor.tsx
import React, { useState, useEffect } from "react";
import { ExtractedEntity } from "../../../types/note";
import Typography from "../../core/Typography";
import Button from "../../core/Button";
import Card from "../../core/Card";
import EntityCard from "./EntityCard";
import { useEntityExtractor } from "../../../hooks/useEntityExtractor";
import { useNotes } from "../../../context/NoteContext";
import { Loader2, AlertCircle, Info } from 'lucide-react';
import DocumentService from "../../../services/firebase/data/DocumentService";
import { PotentialReference, normalizeTextForComparison } from './NoteReferences';

interface EntityExtractorProps {
  /** ID of the note to extract entities from */
  noteId: string;
  /** References already found in the note */
  existingReferences?: PotentialReference[];
  /** Whether the references search has completed */
  referencesSearchComplete?: boolean;
  /** Callback when an entity is converted */
  onEntityConverted?: (entityId: string, createdId: string) => void;
}

/**
 * Component for extracting and displaying entities from notes
 * Integrates with OpenAI for entity extraction and checks for existing campaign elements
 */
const EntityExtractor: React.FC<EntityExtractorProps> = ({ 
  noteId,
  existingReferences = [],
  referencesSearchComplete = false,
  onEntityConverted 
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedExtraction, setHasAttemptedExtraction] = useState(false);
  const [lastExtractionStats, setLastExtractionStats] = useState<{
    totalFound: number;
    filteredOut: number;
  } | null>(null);
  const { extractWithOpenAI } = useEntityExtractor();
  const { getNoteById, updateNote } = useNotes();
  const documentService = DocumentService.getInstance();

  // Load existing entities from the note with proper filtering
  useEffect(() => {
    // Only process entities after references search is complete
    if (!referencesSearchComplete) return;

    const loadAndFilterEntities = () => {
      const note = getNoteById(noteId);
      if (note && note.extractedEntities.length > 0) {
        // Filter out entities that haven't been converted AND match existing references
        const filteredEntities = note.extractedEntities.filter(entity => {
          // Keep converted entities
          if (entity.isConverted) return true;
          
          // Filter out entities that match existing references
          return !isEntityMatchingExistingReference(entity);
        });
        
        setExtractedEntities(filteredEntities);
        
        // If we're loading existing entities, reset extraction attempt state
        // This prevents showing "attempted extraction" state when just viewing existing entities
        if (filteredEntities.length > 0) {
          setHasAttemptedExtraction(false);
          setLastExtractionStats(null);
        }
      } else {
        setExtractedEntities([]);
      }
    };
    
    loadAndFilterEntities();
  }, [noteId, getNoteById, existingReferences, referencesSearchComplete]);

  /**
   * Check if entity matches any existing reference
   */
  const isEntityMatchingExistingReference = (entity: ExtractedEntity): boolean => {
    return existingReferences.some(reference => {
      // First check if types match
      if (reference.type !== entity.type) return false;
      
      // Then check if texts match using the same normalization
      const normalizedEntityText = normalizeTextForComparison(entity.text);
      
      // Check if entity matches any of the reference's matching text
      return reference.matchingText.some(matchText => {
        const normalizedMatchText = normalizeTextForComparison(matchText);
        
        // Exact match after normalization
        if (normalizedEntityText === normalizedMatchText) return true;
        
        // Entity text contains the reference text or vice versa
        return normalizedEntityText.includes(normalizedMatchText) || 
               normalizedMatchText.includes(normalizedEntityText);
      });
    });
  };
  
  /**
   * Deduplicate extracted entities based on text and type
   */
  const deduplicateEntities = (entities: ExtractedEntity[]): ExtractedEntity[] => {
    const uniqueEntities: ExtractedEntity[] = [];
    
    entities.forEach(entity => {
      const isDuplicate = uniqueEntities.some(existing => 
        existing.type === entity.type && 
        normalizeTextForComparison(existing.text) === normalizeTextForComparison(entity.text)
      );
      
      if (!isDuplicate) {
        uniqueEntities.push(entity);
      } else {
        // Find the existing entity and update confidence if higher
        const existingIndex = uniqueEntities.findIndex(existing =>
          existing.type === entity.type && 
          normalizeTextForComparison(existing.text) === normalizeTextForComparison(entity.text)
        );
        if (existingIndex >= 0 && entity.confidence > uniqueEntities[existingIndex].confidence) {
          uniqueEntities[existingIndex] = entity;
        }
      }
    });
    
    return uniqueEntities;
  };
  
  /**
   * Filter out entities that already exist in the campaign
   */
  const filterNewEntities = async (entities: ExtractedEntity[]): Promise<ExtractedEntity[]> => {
    try {
      // First filter out entities that match existing references
      const entitiesWithoutReferences = entities.filter(entity => 
        !isEntityMatchingExistingReference(entity)
      );
      
      // Get all campaign elements
      const [npcs, locations, quests, rumors] = await Promise.all([
        documentService.getCollection<any>('npcs'),
        documentService.getCollection<any>('locations'),
        documentService.getCollection<any>('quests'),
        documentService.getCollection<any>('rumors')
      ]);
      
      const allElements = [
        ...npcs.map(e => ({ ...e, type: 'npc' })),
        ...locations.map(e => ({ ...e, type: 'location' })),
        ...quests.map(e => ({ ...e, type: 'quest' })),
        ...rumors.map(e => ({ ...e, type: 'rumor' }))
      ];
      
      // Filter out entities that already exist in campaign
      return entitiesWithoutReferences.filter(entity => {
        const normalizedEntityText = normalizeTextForComparison(entity.text);
        
        const exists = allElements.some(element => 
          element.type === entity.type && 
          (normalizeTextForComparison(element.name || '') === normalizedEntityText || 
           normalizeTextForComparison(element.title || '') === normalizedEntityText)
        );
        return !exists;
      });
    } catch (error) {
      console.error("Error filtering entities:", error);
      return entities;
    }
  };
  
  /**
   * Perform entity extraction on the note
   */
  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setHasAttemptedExtraction(true);
    
    try {
      // Get the note first to verify it exists
      const note = getNoteById(noteId);
      if (!note) {
        throw new Error("Note not found");
      }
      
      // First clear any previously extracted entities that haven't been converted
      const convertedEntities = note.extractedEntities.filter(entity => entity.isConverted);
      
      // Update the note to keep only converted entities
      await updateNote(noteId, {
        extractedEntities: convertedEntities,
      });
      
      // Clear local state of extracted entities
      setExtractedEntities([]);
      
      // Don't extract if content is too short
      if (note.content.length < 50) {
        throw new Error("Note content is too short for extraction");
      }
      
      // Extract entities using OpenAI
      const rawEntities = await extractWithOpenAI(noteId);
      
      // Deduplicate entities with smart matching
      const uniqueEntities = deduplicateEntities(rawEntities);
      
      // Filter out entities that already exist in campaign
      const newEntities = await filterNewEntities(uniqueEntities);
      
      // Calculate statistics for user feedback
      const totalFoundBeforeFiltering = uniqueEntities.length;
      const filteredOutCount = totalFoundBeforeFiltering - newEntities.length;
      
      setLastExtractionStats({
        totalFound: totalFoundBeforeFiltering,
        filteredOut: filteredOutCount
      });
      
      // Update the note in the database with converted entities + newly extracted entities
      await updateNote(noteId, {
        extractedEntities: [...convertedEntities, ...uniqueEntities],
      });
      
      // Update local state with only the new entities (for display)
      setExtractedEntities(newEntities);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to extract entities";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };
  
  /**
   * Handle entity conversion
   */
  const handleEntityConverted = (entityId: string, createdId: string) => {
    // Update local state
    setExtractedEntities(prevEntities =>
      prevEntities.map(entity => 
        entity.id === entityId
          ? { ...entity, isConverted: true, convertedToId: createdId }
          : entity
      )
    );
    
    // Call parent callback if provided
    if (onEntityConverted) {
      onEntityConverted(entityId, createdId);
    }
  };

  // Show loading state until references search is complete
  if (!referencesSearchComplete) {
    return (
      <Card className="entity-extractor">
        <Card.Content>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Typography variant="h4">Entity Extraction</Typography>
              <Button disabled className="extract-button">
                Extract Entities
              </Button>
            </div>
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin primary" />
              <Typography color="secondary" variant="body-sm">
                Waiting for references to load...
              </Typography>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="entity-extractor">
      <Card.Content>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Typography variant="h4">Entity Extraction</Typography>
            <Button
              onClick={handleExtract}
              disabled={isExtracting}
              className="extract-button"
            >
              {isExtracting ? "Extracting..." : "Extract Entities"}
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded error-container">
              <AlertCircle className="w-4 h-4 status-failed" />
              <Typography variant="body-sm" color="error">
                {error}
              </Typography>
            </div>
          )}

          {/* Loading state with animated spinner */}
          {isExtracting && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin primary" />
              <Typography color="secondary">
                Analyzing note content...
              </Typography>
            </div>
          )}

          {/* New extracted entities that can be converted */}
          {!isExtracting && extractedEntities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Typography variant="h4">New Entities to Convert</Typography>
                {lastExtractionStats && lastExtractionStats.filteredOut > 0 && (
                  <Typography variant="body-sm" color="secondary">
                    {lastExtractionStats.filteredOut} existing {lastExtractionStats.filteredOut === 1 ? 'entity' : 'entities'} filtered out
                  </Typography>
                )}
              </div>
              <div className="grid gap-3">
                {extractedEntities.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    noteId={noteId}
                    onConverted={handleEntityConverted}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Empty state - different messages based on extraction status */}
          {!isExtracting && extractedEntities.length === 0 && !error && (
            <div className="text-center py-8">
              {!hasAttemptedExtraction ? (
                // Never attempted extraction
                <>
                  <Info className="w-8 h-8 mx-auto mb-4 primary" />
                  <Typography color="secondary">
                    Click "Extract Entities" to analyze your note and identify NPCs, locations, quests, and more.
                  </Typography>
                </>
              ) : (
                // Attempted extraction but no new entities found
                <>
                  <Info className="w-8 h-8 mx-auto mb-4 primary" />
                  <Typography className="mb-2 font-medium">
                    No New Entities Found
                  </Typography>
                  <div className="space-y-2">
                    {lastExtractionStats && lastExtractionStats.totalFound > 0 ? (
                      <>
                        <Typography color="secondary" variant="body-sm">
                          Found {lastExtractionStats.totalFound} potential {lastExtractionStats.totalFound === 1 ? 'entity' : 'entities'}, but {lastExtractionStats.filteredOut === lastExtractionStats.totalFound ? 'all' : lastExtractionStats.filteredOut} {lastExtractionStats.filteredOut === 1 ? 'matches' : 'match'} existing campaign elements.
                        </Typography>
                        <Typography color="secondary" variant="body-sm">
                          Check the "Campaign References Found" section below to see what was already identified.
                        </Typography>
                      </>
                    ) : (
                      <Typography color="secondary" variant="body-sm">
                        No entities were detected in your note content. Try adding more specific names, locations, or quest details.
                      </Typography>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EntityExtractor;