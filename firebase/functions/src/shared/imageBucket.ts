// functions/src/shared/imageBucket.ts
import {getApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";

/**
 * The bucket campaign images live in: `<projectId>.firebasestorage.app`, the
 * same one the web app's `storageBucket` names.
 *
 * Named explicitly rather than taken from `getStorage().bucket()`, whose
 * default comes from the runtime's FIREBASE_CONFIG -- and for a project as old
 * as this one that may still be a legacy `appspot.com` bucket.
 *
 * @return {Bucket} The image bucket
 */
export function imageBucket() {
  const projectId =
    getApp().options.projectId ?? process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error("No project id: cannot name the image bucket.");
  }
  return getStorage().bucket(`${projectId}.firebasestorage.app`);
}
