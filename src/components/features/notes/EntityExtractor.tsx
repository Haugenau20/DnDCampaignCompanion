// Updated src/components/features/notes/EntityExtractor.tsx

import React, { useState, useEffect } from "react";
import { ExtractedEntity } from "../../../types/note";
import Typography from "../../core/Typography";
import Button from "../../core/Button";
import Card from "../../core/Card";
import EntityCard from "./EntityCard";
import { useEntityExtractor } from "../../../hooks/useEntityExtractor";
import { useNotes } from "../../../context/NoteContext";
import { useNavigation } from "../../../hooks/useNavigation";
import { Loader2, AlertCircle, Info, ExternalLink, Search } from 'lucide-react';
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
  /** Function to get current editor content */
  getCurrentEditorContent?: () => { title: string; content: string };
  /** Function to save current editor content */
  saveCurrentEditorContent?: () => Promise<void>;
}

/**
 * Component for extracting and displaying entities from notes
 * Integrates with OpenAI for entity extraction and checks for existing campaign elements
 * Now automatically saves current editor content before extraction to prevent data loss
 */
const EntityExtractor: React.FC<EntityExtractorProps> = ({ 
  noteId,
  existingReferences = [],
  referencesSearchComplete = false,
  onEntityConverted,
  getCurrentEditorContent,
  saveCurrentEditorContent 
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedExtraction, setHasAttemptedExtraction] = useState(false);
  const [lastExtractionStats, setLastExtractionStats] = useState<{
    totalFound: number;
    filteredOut: number;
  } | null>(null);
  const [isSavingBeforeExtraction, setIsSavingBeforeExtraction] = useState(false);
  
  const { 
    extractWithOpenAI, 
    isExtracting: hookIsExtracting, 
    error: hookError, 
    isUsageLimitExceeded, 
    contactInfo, 
    isExtractionAvailable,
    refreshUsageStatus
  } = useEntityExtractor();
  const { getNoteById, updateNote } = useNotes();
  const { navigateToPage } = useNavigation();
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
   * Now automatically saves current editor content before extraction
   */
  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setHasAttemptedExtraction(true);
    
    try {
      // Step 1: Save current editor content before extraction
      if (saveCurrentEditorContent) {
        setIsSavingBeforeExtraction(true);
        try {
          await saveCurrentEditorContent();
          console.log("EntityExtractor: Saved current editor content before extraction");
        } catch (saveError) {
          console.error("EntityExtractor: Failed to save content before extraction:", saveError);
          throw new Error("Failed to save your work before analysis. Please save manually and try again.");
        } finally {
          setIsSavingBeforeExtraction(false);
        }
      }

      // Step 2: Get the content to extract from
      let contentToExtract = "";
      
      if (getCurrentEditorContent) {
        // Use current editor content if available (most up-to-date)
        const editorContent = getCurrentEditorContent();
        contentToExtract = editorContent.content;
      } else {
        // Fallback to note content from context
        const note = getNoteById(noteId);
        if (!note) {
          throw new Error("Note not found");
        }
        contentToExtract = note.content;
      }
      
      // Step 3: Validate content
      if (contentToExtract.length < 50) {
        throw new Error("Note content is too short for analysis (minimum 50 characters)");
      }
      
      // Step 4: Clear any previously extracted entities that haven't been converted
      const note = getNoteById(noteId);
      if (note) {
        const convertedEntities = note.extractedEntities.filter(entity => entity.isConverted);
        
        // Update the note to keep only converted entities
        await updateNote(noteId, {
          extractedEntities: convertedEntities,
        });
        
        // Clear local state of extracted entities
        setExtractedEntities([]);
      }
      
      // Step 5: Extract entities using the current content
      const rawEntities = await extractWithOpenAI(contentToExtract);
      
      // If extraction failed due to limits, the error will be handled by the hook
      if (rawEntities.length === 0 && isUsageLimitExceeded) {
        return; // Don't proceed with processing if limit exceeded
      }
      
      // Step 6: Process extracted entities
      const uniqueEntities = deduplicateEntities(rawEntities);
      const newEntities = await filterNewEntities(uniqueEntities);
      
      // Calculate statistics for user feedback
      const totalFoundBeforeFiltering = uniqueEntities.length;
      const filteredOutCount = totalFoundBeforeFiltering - newEntities.length;
      
      setLastExtractionStats({
        totalFound: totalFoundBeforeFiltering,
        filteredOut: filteredOutCount
      });
      
      // Step 7: Update the note in the database with all entities
      if (note) {
        const convertedEntities = note.extractedEntities.filter(entity => entity.isConverted);
        await updateNote(noteId, {
          extractedEntities: [...convertedEntities, ...uniqueEntities],
        });
      }
      
      // Step 8: Update local state with only the new entities (for display)
      setExtractedEntities(newEntities);
      
    } catch (err) {
      // Note: Usage limit errors are now handled by the hook
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze note";
      setError(errorMessage);
      console.error("EntityExtractor:", err);
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

  /**
   * Navigate to contact form with pre-filled subject for limit increase request
   */
  const handleContactForLimitIncrease = () => {
    if (contactInfo) {
      // Navigate to contact page with pre-filled subject
      const params = new URLSearchParams();
      params.set('subject', contactInfo.prefilledSubject);
      navigateToPage(`${contactInfo.contactUrl}?${params.toString()}`);
    }
  };

  // Show loading state until references search is complete
  if (!referencesSearchComplete) {
    return (
      <Card className="entity-extractor">
        <Card.Content>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Typography variant="h4">Smart Detection</Typography>
              <Button 
                disabled 
                className="extract-button w-12 h-12 p-0"
                title="Analyze note to find characters, locations, quests, and rumors"
              >
                <Search className="w-5 h-5" />
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

  // Determine if we're currently processing
  const isProcessing = isExtracting || hookIsExtracting || isSavingBeforeExtraction;

  return (
    <Card className="entity-extractor">
      <Card.Content>
        <div className="space-y-6">
          {/* Header with icon-only button */}
          <div className="flex justify-between items-center">
            <Typography variant="h4">Smart Detection</Typography>
            <Button
              onClick={handleExtract}
              disabled={isProcessing || !isExtractionAvailable}
              className="extract-button w-12 h-12 p-0"
              title="Analyze note to find characters, locations, quests, and rumors (auto-saves first)"
            >
              {isProcessing ? 
                <Loader2 className="w-5 h-5 animate-spin" /> : 
                <Search className="w-5 h-5" />
              }
            </Button>
          </div>

          {/* Usage limit exceeded state */}
          {isUsageLimitExceeded && contactInfo && (
            <div className="p-4 rounded-lg border-l-4 status-failed">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 status-failed" />
                <div className="flex-1">
                  <Typography variant="body" className="font-medium mb-2">
                    Usage Limit Reached
                  </Typography>
                  <Typography variant="body-sm" color="secondary" className="mb-3">
                    {contactInfo.message}
                  </Typography>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleContactForLimitIncrease}
                    endIcon={<ExternalLink className="w-4 h-4" />}
                  >
                    Request Limit Increase
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {(error || hookError) && !isUsageLimitExceeded && (
            <div className="flex items-center gap-2 p-3 rounded error-container">
              <AlertCircle className="w-4 h-4 status-failed" />
              <Typography variant="body-sm" color="error">
                {error || hookError}
              </Typography>
            </div>
          )}

          {/* Loading state with detailed feedback */}
          {isProcessing && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin primary" />
              <Typography color="secondary">
                {isSavingBeforeExtraction ? "Saving your work..." : "Analyzing note content..."}
              </Typography>
              {isSavingBeforeExtraction && (
                <Typography variant="body-sm" color="secondary" className="mt-2">
                  Making sure your content is saved before analysis
                </Typography>
              )}
            </div>
          )}

          {/* New extracted entities that can be converted */}
          {!isProcessing && extractedEntities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Typography variant="h4">Found in Your Note</Typography>
                {lastExtractionStats && lastExtractionStats.filteredOut > 0 && (
                  <Typography variant="body-sm" color="secondary">
                    {lastExtractionStats.filteredOut} existing {lastExtractionStats.filteredOut === 1 ? 'item' : 'items'} filtered out
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
          {!isProcessing && extractedEntities.length === 0 && !(error || hookError) && !isUsageLimitExceeded && (
            <div className="text-center py-8">
              {!hasAttemptedExtraction ? (
                // Never attempted extraction
                <>
                  <Info className="w-8 h-8 mx-auto mb-4 primary" />
                  <Typography color="secondary" className="mb-2">
                    Click the search button to automatically find characters, locations, quests, and rumors in your note.
                  </Typography>
                  <Typography variant="body-sm" color="secondary" className="italic">
                    Your work will be saved automatically before analysis
                  </Typography>
                </>
              ) : (
                // Attempted extraction but no new entities found
                <>
                  <Info className="w-8 h-8 mx-auto mb-4 primary" />
                  <Typography className="mb-2 font-medium">
                    No New Content Found
                  </Typography>
                  <div className="space-y-2">
                    {lastExtractionStats && lastExtractionStats.totalFound > 0 ? (
                      <>
                        <Typography color="secondary" variant="body-sm">
                          Found {lastExtractionStats.totalFound} potential {lastExtractionStats.totalFound === 1 ? 'item' : 'items'}, but {lastExtractionStats.filteredOut === lastExtractionStats.totalFound ? 'all' : lastExtractionStats.filteredOut} {lastExtractionStats.filteredOut === 1 ? 'matches' : 'match'} existing campaign content.
                        </Typography>
                        <Typography color="secondary" variant="body-sm">
                          Check the "Campaign References Found" section below to see what was already identified.
                        </Typography>
                      </>
                    ) : (
                      <Typography color="secondary" variant="body-sm">
                        No characters, locations, quests, or rumors were detected. Try adding more specific names or details.
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