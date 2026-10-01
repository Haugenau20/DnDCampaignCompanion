// src/core/services/firebase/data/DocumentAlreadyExistsError.ts

/**
 * Thrown by `DocumentService.createDocument` when an explicit document id
 * already names a document (bug #1402).
 *
 * The guard that throws it is correct and stays: `setDoc` is a full overwrite,
 * so refusing is the only safe answer. What this class adds is a way for
 * callers to tell "that id is taken" apart from every other failure, so a
 * caller that derived the id from a name can pick the next free one instead of
 * showing the player anything.
 *
 * Two messages, two audiences. `message` is for developers and logs: it names
 * the collection, the id and the service methods to use instead. `userMessage`
 * is the only text a player should ever be shown for this failure.
 */
export class DocumentAlreadyExistsError extends Error {
  /** The collection the create was aimed at. */
  readonly collectionName: string;

  /** The id that was already taken. */
  readonly documentId: string;

  /** Player-safe wording; names no internal service method. */
  readonly userMessage =
    "Someone else just added something with this name. Please try again.";

  /**
   * @param collectionName - Collection name or full path of the refused create.
   * @param documentId - The explicit id that already exists there.
   */
  constructor(collectionName: string, documentId: string) {
    super(
      `Cannot create document: a document with id "${documentId}" already exists in collection "${collectionName}". ` +
      `createDocument never overwrites an existing document - use updateDocumentWithAttribution to modify it, ` +
      `or setDocument if this is a deliberate re-key.`
    );
    this.name = "DocumentAlreadyExistsError";
    this.collectionName = collectionName;
    this.documentId = documentId;
    // Keeps `instanceof` working when compiled to an ES5 target.
    Object.setPrototypeOf(this, DocumentAlreadyExistsError.prototype);
  }
}
