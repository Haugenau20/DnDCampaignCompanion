// src/features/collaboration/notes/components/CampaignLinksPanel.tsx

import React, { useEffect, useState } from "react";
import { EntityType, ExtractedEntity } from "../types";
import { useNotes } from "../context/NoteContext";
import { useNoteReferences, normalizeTextForComparison } from "./NoteReferences";
import Typography from "../../../../core/components/Typography";
import Button from "../../../../core/components/Button";
import { useEntityExtractor } from "../../entity-extraction/hooks/useEntityExtractor";
import { useNavigation } from "shared/hooks/useNavigation";
import { useNPCs, useLocations, useQuests, useRumors } from "features/campaign-entities";
import { Loader2, Search, AlertCircle, ExternalLink, Users, MapPin, Scroll, MessageSquare } from 'lucide-react';

export interface CampaignLinksPanelProps {
  /** ID of the note this panel is for */
  noteId: string;
  /** Reads the live editor buffer so a scan sees unsaved text. */
  getCurrentEditorContent?: () => { title: string; content: string };
  /** Saves the editor before analysis; rejects to abort the scan (#1051). */
  saveCurrentEditorContent?: () => Promise<void>;
  /** Fired after an entity is converted, so the editor can refresh. */
  onEntityConverted?: (entityId: string, createdId: string) => void;
}

/** "an NPC" reads correctly; "a location" does not take "an". */
function articleFor(type: EntityType): string {
  return type === "npc" ? "an" : "a";
}

/**
 * Get entity type display name
 */
function getEntityTypeName(type: EntityType): string {
  switch (type) {
    case "npc":
      return "NPC";
    case "location":
      return "Location";
    case "quest":
      return "Quest";
    case "rumor":
      return "Rumor";
    default:
      return type;
  }
}

/**
 * Get icon for entity type
 */
function getEntityIcon(type: EntityType): React.ReactNode {
  switch (type) {
    case "npc":
      return <Users className="w-4 h-4" />;
    case "location":
      return <MapPin className="w-4 h-4" />;
    case "quest":
      return <Scroll className="w-4 h-4" />;
    case "rumor":
      return <MessageSquare className="w-4 h-4" />;
    default:
      return null;
  }
}

/**
 * The note editor's right-rail panel: campaign entities the note already
 * references, and campaign entities a scan detected but that are not yet
 * in the campaign.
 *
 * Replaces two stacked cards (Smart Detection, Campaign References Found)
 * whose primary content used to be their own empty state. With nothing to
 * show, this panel renders its header alone.
 */
const CampaignLinksPanel: React.FC<CampaignLinksPanelProps> = ({
  noteId,
  getCurrentEditorContent,
  saveCurrentEditorContent,
  onEntityConverted,
}) => {
  const { references, isLoading: referencesLoading } = useNoteReferences(noteId);
  const { getNoteById, updateNote, convertEntity } = useNotes();
  const { navigateToPage } = useNavigation();
  const { npcs } = useNPCs();
  const { locations } = useLocations();
  const { quests } = useQuests();
  const { rumors } = useRumors();

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSavingBeforeExtraction, setIsSavingBeforeExtraction] = useState(false);
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());
  /**
   * True once a scan has COMPLETED in this session and found nothing new.
   * Never set on first load -- only `handleExtract` touches it -- so the
   * idle panel stays exactly as spec'd, and a user-initiated scan that comes
   * back empty still gets a one-line answer instead of silence.
   */
  const [scanFoundNothing, setScanFoundNothing] = useState(false);

  const {
    extractWithOpenAI,
    isExtracting: hookIsExtracting,
    error: hookError,
    isUsageLimitExceeded,
    contactInfo,
    isExtractionAvailable,
  } = useEntityExtractor();

  /**
   * Check if entity matches any existing reference
   */
  const isEntityMatchingExistingReference = (entity: ExtractedEntity): boolean => {
    return references.some(reference => {
      if (reference.type !== entity.type) return false;

      const normalizedEntityText = normalizeTextForComparison(entity.text);

      return reference.matchingText.some(matchText => {
        const normalizedMatchText = normalizeTextForComparison(matchText);

        if (normalizedEntityText === normalizedMatchText) return true;

        return normalizedEntityText.includes(normalizedMatchText) ||
               normalizedMatchText.includes(normalizedEntityText);
      });
    });
  };

  // Load existing entities from the note, filtering out anything that
  // already matches a reference (unless it has been converted). Deferred
  // until references have actually settled: `references` is derived from
  // the four entity contexts, and while any of them is still loading it is
  // an incomplete set — filtering against it here could show an entity that
  // IS in the campaign as "detected, not in your campaign" for the moment
  // between mount and the contexts arriving.
  useEffect(() => {
    if (referencesLoading) return;

    const note = getNoteById(noteId);
    if (note && note.extractedEntities.length > 0) {
      const filteredEntities = note.extractedEntities.filter(entity => {
        if (entity.isConverted) return true;
        return !isEntityMatchingExistingReference(entity);
      });
      setExtractedEntities(filteredEntities);
    } else {
      setExtractedEntities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, getNoteById, references, referencesLoading]);

  /**
   * Deduplicate extracted entities based on text and type
   */
  const deduplicateEntities = (entities: ExtractedEntity[]): ExtractedEntity[] => {
    const uniqueEntities: ExtractedEntity[] = [];

    entities.forEach(entity => {
      const existingIndex = uniqueEntities.findIndex(existing =>
        existing.type === entity.type &&
        normalizeTextForComparison(existing.text) === normalizeTextForComparison(entity.text)
      );

      if (existingIndex === -1) {
        uniqueEntities.push(entity);
      } else if (entity.confidence > uniqueEntities[existingIndex].confidence) {
        uniqueEntities[existingIndex] = entity;
      }
    });

    return uniqueEntities;
  };

  /**
   * Filter out entities that already exist in the campaign
   */
  const filterNewEntities = (entities: ExtractedEntity[]): ExtractedEntity[] => {
    const entitiesWithoutReferences = entities.filter(entity =>
      !isEntityMatchingExistingReference(entity)
    );

    const allElements = [
      ...(npcs as any[]).map(e => ({ ...e, type: 'npc' as EntityType })),
      ...(locations as any[]).map(e => ({ ...e, type: 'location' as EntityType })),
      ...(quests as any[]).map(e => ({ ...e, type: 'quest' as EntityType })),
      ...(rumors as any[]).map(e => ({ ...e, type: 'rumor' as EntityType })),
    ];

    return entitiesWithoutReferences.filter(entity => {
      const normalizedEntityText = normalizeTextForComparison(entity.text);

      const exists = allElements.some(element =>
        element.type === entity.type &&
        (normalizeTextForComparison(element.name || '') === normalizedEntityText ||
         normalizeTextForComparison(element.title || '') === normalizedEntityText)
      );
      return !exists;
    });
  };

  /**
   * Perform entity extraction on the note. Saves the editor first (aborting
   * on failure, bug #1051), then extracts, dedupes and filters out anything
   * already in the campaign.
   */
  const handleExtract = async () => {
    // Defensive: the button is disabled while references are loading, but
    // guard here too since filterNewEntities reads the same not-yet-settled
    // npcs/locations/quests/rumors.
    if (referencesLoading) return;

    setIsExtracting(true);
    setError(null);
    setScanFoundNothing(false);

    try {
      if (saveCurrentEditorContent) {
        setIsSavingBeforeExtraction(true);
        try {
          await saveCurrentEditorContent();
        } catch (saveError) {
          throw new Error("Failed to save your work before analysis. Please save manually and try again.");
        } finally {
          setIsSavingBeforeExtraction(false);
        }
      }

      let contentToExtract = "";

      if (getCurrentEditorContent) {
        contentToExtract = getCurrentEditorContent().content;
      } else {
        const note = getNoteById(noteId);
        if (!note) {
          throw new Error("Note not found");
        }
        contentToExtract = note.content;
      }

      if (contentToExtract.length < 50) {
        throw new Error("Note content is too short for analysis (minimum 50 characters)");
      }

      const note = getNoteById(noteId);
      if (note) {
        const convertedEntities = note.extractedEntities.filter(entity => entity.isConverted);
        await updateNote(noteId, { extractedEntities: convertedEntities });
        setExtractedEntities([]);
      }

      const rawEntities = await extractWithOpenAI(contentToExtract);

      if (rawEntities.length === 0 && isUsageLimitExceeded) {
        return;
      }

      const uniqueEntities = deduplicateEntities(rawEntities);
      const newEntities = filterNewEntities(uniqueEntities);

      if (note) {
        const convertedEntities = note.extractedEntities.filter(entity => entity.isConverted);
        await updateNote(noteId, {
          extractedEntities: [...convertedEntities, ...uniqueEntities],
        });
      }

      setExtractedEntities(newEntities);
      setScanFoundNothing(newEntities.length === 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze note";
      setError(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * Handle entity conversion
   */
  const handleEntityConverted = (entityId: string, createdId: string) => {
    setExtractedEntities(prevEntities =>
      prevEntities.map(entity =>
        entity.id === entityId
          ? { ...entity, isConverted: true, convertedToId: createdId }
          : entity
      )
    );

    if (onEntityConverted) {
      onEntityConverted(entityId, createdId);
    }
  };

  const handleAdd = async (entity: ExtractedEntity) => {
    setConvertingIds(prev => new Set(prev).add(entity.id));
    try {
      const createdId = await convertEntity(noteId, entity.id, entity.type);
      handleEntityConverted(entity.id, createdId);
    } catch (convertError) {
      console.error("Failed to convert entity:", convertError);
    } finally {
      setConvertingIds(prev => {
        const next = new Set(prev);
        next.delete(entity.id);
        return next;
      });
    }
  };

  /**
   * Navigate to contact form with pre-filled subject for limit increase request
   */
  const handleContactForLimitIncrease = () => {
    if (contactInfo) {
      const params = new URLSearchParams();
      params.set('subject', contactInfo.prefilledSubject);
      navigateToPage(`${contactInfo.contactUrl}?${params.toString()}`);
    }
  };

  /**
   * Navigate to the entity detail page
   */
  const navigateToEntity = (reference: { type: EntityType; id: string }) => {
    const paths: Record<string, string> = {
      npc: "/npcs",
      location: "/locations",
      quest: "/quests",
      rumor: "/rumors",
    };

    const path = paths[reference.type];
    if (path) {
      navigateToPage(`${path}?highlight=${reference.id}`);
    }
  };

  const isProcessing = isExtracting || hookIsExtracting || isSavingBeforeExtraction;
  const detections = extractedEntities.filter(entity => !entity.isConverted);

  /**
   * Whether this note looks like it has never been through a scan.
   *
   * Nothing on the note records "was scanned" -- adding such a field is out of
   * scope -- so this is inferred: no stored entities, no matched references,
   * and no scan completed in this session. That makes a note which WAS scanned
   * and genuinely found nothing indistinguishable from one never scanned, once
   * the session ends. The imprecision is deliberate and only ever understates
   * progress; it never claims a scan happened when it did not.
   */
  const storedEntityCount = getNoteById(noteId)?.extractedEntities.length ?? 0;
  const looksUnscanned =
    !scanFoundNothing &&
    !isProcessing &&
    storedEntityCount === 0 &&
    references.length === 0;

  return (
    <div className="campaign-links card rounded-xl p-4">
      {/* Header — always rendered, even when both groups are empty */}
      <div className="flex items-center justify-between gap-3">
        <Typography variant="body" className="font-semibold">
          Campaign links
        </Typography>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExtract}
          disabled={isProcessing || !isExtractionAvailable() || referencesLoading}
          startIcon={
            isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )
          }
        >
          Scan note
        </Button>
      </div>

      {looksUnscanned && (
        <Typography variant="body-sm" color="muted" className="mt-4">
          Not scanned yet.
        </Typography>
      )}

      {scanFoundNothing && detections.length === 0 && (
        <Typography variant="body-sm" color="secondary" className="mt-4">
          No new names found in this note.
        </Typography>
      )}

      {isUsageLimitExceeded && contactInfo && (
        <div className="mt-4 p-3 rounded-lg border-l-4 status-failed">
          <Typography variant="body-sm" className="font-medium mb-1">
            Usage Limit Reached
          </Typography>
          <Typography variant="body-sm" color="secondary" className="mb-2">
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
      )}

      {(error || hookError) && !isUsageLimitExceeded && (
        <div className="mt-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 status-failed flex-shrink-0" />
          <Typography variant="body-sm" color="error">
            {error || hookError}
          </Typography>
        </div>
      )}

      {/* Group 1 — matched */}
      {references.length > 0 && (
        <div className="mt-4">
          <Typography
            variant="caption"
            color="muted"
            className="text-[11px] uppercase tracking-wider"
          >
            {`IN YOUR CAMPAIGN · ${references.length}`}
          </Typography>
          <div className="mt-2 space-y-1">
            {references.map(reference => (
              <button
                key={`${reference.type}-${reference.id}`}
                type="button"
                onClick={() => navigateToEntity(reference)}
                className="dropdown-item w-full flex items-center gap-3 px-2 py-1.5 rounded text-left"
              >
                <span className="primary flex-shrink-0">{getEntityIcon(reference.type)}</span>
                <Typography variant="body-sm" className="flex-1 truncate">
                  {reference.title}
                </Typography>
                <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
                  {getEntityTypeName(reference.type)}
                </Typography>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Group 2 — detected, not yet in the campaign */}
      {detections.length > 0 && (
        <div className="mt-4">
          <Typography
            variant="caption"
            className="text-[11px] uppercase tracking-wider status-unknown"
          >
            {`DETECTED, NOT IN YOUR CAMPAIGN · ${detections.length}`}
          </Typography>
          <div className="mt-2 space-y-2">
            {detections.map(entity => (
              <div
                key={entity.id}
                className="flex items-center gap-3 p-2 rounded bg-secondary"
              >
                <div className="min-w-0 flex-1">
                  <Typography variant="body-sm" className="font-medium truncate">
                    {entity.text}
                  </Typography>
                  <Typography variant="caption" color="secondary">
                    {`looks like ${articleFor(entity.type)} ${getEntityTypeName(entity.type)} · ${Math.round(
                      entity.confidence * 100
                    )}% confidence`}
                  </Typography>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAdd(entity)}
                  disabled={convertingIds.has(entity.id)}
                >
                  {convertingIds.has(entity.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footnote — only where it is relevant */}
      {(references.length > 0 || detections.length > 0) && (
        <Typography variant="caption" color="muted" className="block mt-4">
          Scanning saves your note first.
        </Typography>
      )}
    </div>
  );
};

export default CampaignLinksPanel;
