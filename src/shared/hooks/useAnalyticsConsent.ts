// src/shared/hooks/useAnalyticsConsent.ts
import { useSyncExternalStore } from "react";
import {
  AnalyticsConsent,
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "core/services/firebase/analytics/analytics";

/**
 * The player's answer about Google Analytics, and a way to change it (T138).
 * Every component using it re-renders when the answer changes, here or in
 * another tab.
 *
 * @returns The answer (`null` before there is one) and its setter
 */
export function useAnalyticsConsent(): [
  AnalyticsConsent | null,
  (choice: AnalyticsConsent) => void,
] {
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent);
  return [consent, setAnalyticsConsent];
}
