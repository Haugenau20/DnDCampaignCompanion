// src/core/services/firebase/storage/ImageStorageService.ts
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import BaseFirebaseService from "../core/BaseFirebaseService";
import {
  firebaseConfig,
  useEmulators,
  emulatorHost,
  emulatorPorts
} from "../config/firebaseConfig";
import { StoredImage } from "../../../types/storedImage";
import type { PreparedImage } from "../../../utils/prepare-image";

/** Campaign entities that can carry an image. Mirrors `storage.rules.prod`. */
export type ImageEntityType = "npcs" | "locations";

/**
 * Every object is written once under a fresh name and never changed, so it
 * may be cached for a year without a replace ever showing a stale picture.
 */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** A path segment that can't be empty or climb out of its folder. */
function segment(value: string): string {
  if (!value || value.includes("/") || value === "." || value === "..") {
    throw new Error(`Invalid storage path segment: "${value}"`);
  }
  return value;
}

/**
 * The folder an entity's images live in. It mirrors the entity's Firestore
 * path, which is what lets the rules read the group from it and lets a
 * campaign's files be deleted as one prefix.
 */
export function entityImagePrefix(
  groupId: string,
  campaignId: string,
  entityType: ImageEntityType,
  entityId: string
): string {
  return [
    "groups", segment(groupId),
    "campaigns", segment(campaignId),
    entityType, segment(entityId)
  ].join("/");
}

/**
 * The folder a campaign's banner lives in. Under the campaign's own folder, so
 * deleting the campaign's prefix takes the banner with it.
 */
export function campaignBannerPrefix(groupId: string, campaignId: string): string {
  return ["groups", segment(groupId), "campaigns", segment(campaignId), "banner"].join("/");
}

/** The folder a group's crest lives in. */
export function crestPrefix(groupId: string): string {
  return `groups/${segment(groupId)}/crest`;
}

/**
 * The folder a user's bug-report screenshots live in (T020). Keyed by the
 * uploader, so the rules can let each user write only their own; nobody reads
 * it from the app -- `sendContactEmail` attaches the file and deletes it.
 */
export function supportScreenshotPrefix(uid: string): string {
  return `support/${segment(uid)}`;
}

/**
 * How long an upload waits for its pending entry before going on without it.
 * The entry needs the server; a client that cannot reach it should still get
 * an answer rather than a progress bar that never moves.
 */
const PENDING_ENTRY_TIMEOUT_MS = 10_000;

/**
 * Where the pending entry for an image path lives: in the path's group, named
 * after the file (T084). `firestore.rules.prod` checks both.
 *
 * @param path An image path under `groups/{groupId}/`
 * @returns The entry's collection path and document id
 */
export function pendingUploadOf(path: string): { collection: string; id: string } {
  const segments = path.split("/");
  const [root, groupId] = segments;
  const id = segments[segments.length - 1];
  if (root !== "groups" || !groupId || segments.length < 3 || !id) {
    throw new Error(`Not an image path in a group: "${path}"`);
  }
  return { collection: `groups/${groupId}/pendingUploads`, id };
}

/**
 * Whether a URL is a download URL for this app's own bucket.
 *
 * A member can write any string into a Firestore document, so an image URL is
 * checked before it is rendered: a planted third-party URL would let its owner
 * log the IP address of everyone who opens the page.
 */
export function isOwnBucketUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const origins = ["https://firebasestorage.googleapis.com"];
  if (useEmulators) origins.push(`http://${emulatorHost}:${emulatorPorts.storage}`);

  return (
    origins.includes(parsed.origin) &&
    parsed.pathname.startsWith(`/v0/b/${firebaseConfig.storageBucket}/o/`)
  );
}

/**
 * Uploads and deletes images in Firebase Storage.
 *
 * Callers save the returned `StoredImage` on their document, and decide the
 * order of writes (see the design's lifecycle table -- the document is always
 * written before an old file is deleted). The one Firestore write here is the
 * upload's pending entry, which says "a document is about to point at this
 * file" until the caller calls `clearPendingUpload` (T084).
 */
class ImageStorageService extends BaseFirebaseService {
  private static instance: ImageStorageService;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance of ImageStorageService
   */
  public static getInstance(): ImageStorageService {
    if (!ImageStorageService.instance) {
      ImageStorageService.instance = new ImageStorageService();
    }
    return ImageStorageService.instance;
  }

  /**
   * Upload a prepared image under a new, random name in `prefix`.
   * @param prefix Folder from `entityImagePrefix`, `campaignBannerPrefix` or `crestPrefix`
   * @param image Output of `prepareImage`
   * @param onProgress Called with the fraction uploaded, 0 to 1
   * @returns What to store on the document
   */
  public async upload(
    prefix: string,
    image: PreparedImage,
    onProgress?: (fraction: number) => void
  ): Promise<StoredImage> {
    const uid = this.requireUid();
    const path = `${prefix}/${crypto.randomUUID()}.${image.extension}`;
    // The entry is written alongside the bytes, and waited for before the
    // image is handed back: the caller's document write must not reach the
    // server ahead of it, or the daily sweep could take a file whose write
    // is queued in an offline tab for an orphan (IMG-003).
    const recorded = this.recordPendingUpload(path, uid);
    const objectRef = await this.put(path, image, onProgress, IMMUTABLE_CACHE_CONTROL);
    await recorded;

    return {
      path,
      url: await getDownloadURL(objectRef),
      width: image.width,
      height: image.height,
      uploadedBy: uid,
      uploadedAt: new Date().toISOString(),
      // Left out rather than undefined: Firestore refuses an undefined field.
      ...(image.brightness ? { brightness: image.brightness } : {})
    };
  }

  /**
   * Upload a prepared screenshot for a bug report, under a new, random name in
   * the signed-in user's own support folder.
   *
   * Returns the path alone: the rules let nobody read the folder, so there is
   * no download URL to ask for. The path goes to `sendContactEmail`, which
   * attaches the file to the email and then deletes it.
   *
   * @param image Output of `prepareImage`
   * @param onProgress Called with the fraction uploaded, 0 to 1
   * @returns The object path
   */
  public async uploadScreenshot(
    image: PreparedImage,
    onProgress?: (fraction: number) => void
  ): Promise<string> {
    const path = `${supportScreenshotPrefix(this.requireUid())}/${crypto.randomUUID()}.${image.extension}`;
    await this.put(path, image, onProgress);
    return path;
  }

  /**
   * The document now points at `path`, or never will: its pending entry can
   * go. Never throws -- an entry left behind only keeps its file until the
   * sweep's lease runs out, so the user's action has still succeeded.
   * @param path `StoredImage.path`
   */
  public clearPendingUpload(path: string): void {
    const warn = (error: unknown) =>
      console.warn(`Could not clear the pending entry for ${path}; the sweep's lease will.`, error);
    try {
      const { collection, id } = pendingUploadOf(path);
      deleteDoc(doc(this.db, collection, id)).catch(warn);
    } catch (error) {
      warn(error);
    }
  }

  /**
   * Record `path` as an upload whose document is still to be written.
   *
   * Best effort, for now: until the production rules allow the entry, it is
   * refused and the upload goes on as it always has (T084's first half). It
   * also gives up waiting after {@link PENDING_ENTRY_TIMEOUT_MS}.
   */
  private async recordPendingUpload(path: string, uid: string): Promise<void> {
    const { collection, id } = pendingUploadOf(path);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`The pending entry for ${path} did not answer; uploading without waiting.`);
        resolve();
      }, PENDING_ENTRY_TIMEOUT_MS);
    });
    try {
      await Promise.race([
        setDoc(doc(this.db, collection, id), { path, uid, createdAt: serverTimestamp() }),
        timedOut
      ]);
    } catch (error) {
      console.warn(`Could not record ${path} as a pending upload.`, error);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Delete an image. An object that is already gone counts as deleted, so a
   * retried cleanup never fails on its own earlier success.
   * @param path `StoredImage.path`
   */
  public async remove(path: string): Promise<void> {
    try {
      await deleteObject(ref(this.storage, path));
    } catch (error) {
      if ((error as { code?: string }).code === "storage/object-not-found") return;
      throw error;
    }
  }

  /** The signed-in user's id; every upload needs one. */
  private requireUid(): string {
    const uid = this.getCurrentUser()?.uid;
    if (!uid) {
      throw new Error("Not authenticated");
    }
    return uid;
  }

  /**
   * Write `image` to `path` and wait for the upload to finish.
   * @param path The full object path
   * @param image Output of `prepareImage`
   * @param onProgress Called with the fraction uploaded, 0 to 1
   * @param cacheControl The object's `Cache-Control`, if any
   * @returns A reference to the written object
   */
  private async put(
    path: string,
    image: PreparedImage,
    onProgress?: (fraction: number) => void,
    cacheControl?: string
  ) {
    const objectRef = ref(this.storage, path);
    const task = uploadBytesResumable(objectRef, image.blob, {
      contentType: image.contentType,
      ...(cacheControl ? { cacheControl } : {})
    });

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        snapshot => {
          if (onProgress && snapshot.totalBytes > 0) {
            onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
          }
        },
        reject,
        resolve
      );
    });
    return objectRef;
  }
}

export default ImageStorageService;
