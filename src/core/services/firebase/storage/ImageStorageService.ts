// src/core/services/firebase/storage/ImageStorageService.ts
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
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
 * It knows nothing about Firestore: callers save the returned `StoredImage`
 * on their document, and decide the order of writes (see the design's
 * lifecycle table -- the document is always written before an old file is
 * deleted).
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
    const uid = this.getCurrentUser()?.uid;
    if (!uid) {
      throw new Error("Not authenticated");
    }

    const path = `${prefix}/${crypto.randomUUID()}.${image.extension}`;
    const objectRef = ref(this.storage, path);
    const task = uploadBytesResumable(objectRef, image.blob, {
      contentType: image.contentType,
      cacheControl: IMMUTABLE_CACHE_CONTROL
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

    return {
      path,
      url: await getDownloadURL(objectRef),
      width: image.width,
      height: image.height,
      uploadedBy: uid,
      uploadedAt: new Date().toISOString()
    };
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
}

export default ImageStorageService;
