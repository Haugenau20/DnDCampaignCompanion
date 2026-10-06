// src/core/constants/app.ts

/**
 * The running app version, attached to contact submissions so a bug report
 * says which build it came from without the reporter having to know.
 *
 * Create React App only exposes environment variables prefixed
 * `REACT_APP_`, and nothing sets one today, so the fallback is what a local
 * dev build reports. Set `REACT_APP_VERSION` in the deploy environment to
 * make this meaningful in production.
 */
export const APP_VERSION = process.env.REACT_APP_VERSION || "0.1.0-dev";

/**
 * Whether this build is a pull request's preview site (T110).
 *
 * Previews run unmerged code against the **production** project, on a hostname
 * that changes per PR, so sign-in is off there on purpose: signed in, unreviewed
 * code could write real records. Only the preview workflow
 * (`firebase-hosting-pull-request.yml`) sets `REACT_APP_PREVIEW`; the live
 * deploy and the dev server do not. Read on each call, so a test can set it.
 */
export const isPreviewBuild = (): boolean => process.env.REACT_APP_PREVIEW === "true";
