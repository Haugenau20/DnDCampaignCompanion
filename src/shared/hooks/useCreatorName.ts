// src/shared/hooks/useCreatorName.ts
import { useEffect, useState } from "react";
import { useFirebase } from "features/user-management";
import firebaseServices from "core/services/firebase";
import { determineAttributionActor, fetchAttributionUsernames } from "../utils/attribution-utils";

/** The creation half of a record's attribution. */
export interface CreatorFields {
  createdBy?: string;
  createdByUsername?: string;
  createdByCharacterName?: string | null;
}

/**
 * The name a record's creator is credited by, resolved the way the record's
 * own page does it (`AttributionInfo`): the character active when it was
 * written, then the stored username, then the `createdBy` uid's group profile.
 *
 * A list row that read `createdByUsername` alone said "Unknown" for records
 * whose page named the author, and the username where the page named the
 * character (T124). Only the creator fields are passed on, so a later edit
 * never changes who is credited with recording it.
 *
 * @param item The record's creation attribution
 * @returns The creator's name, or `''` when nothing names them
 */
export const useCreatorName = ({
  createdBy,
  createdByUsername,
  createdByCharacterName,
}: CreatorFields): string => {
  const { activeGroupId } = useFirebase();
  const stored = determineAttributionActor({ createdByUsername, createdByCharacterName });
  // Only a record with no stored name costs a profile read.
  const uidToLookUp = stored ? undefined : createdBy;
  const [lookedUp, setLookedUp] = useState<{ uid: string; name: string } | null>(null);

  useEffect(() => {
    if (!activeGroupId || !uidToLookUp) return;
    let cancelled = false;
    fetchAttributionUsernames(activeGroupId, [uidToLookUp], firebaseServices)
      .then((names) => {
        if (!cancelled) setLookedUp({ uid: uidToLookUp, name: names[uidToLookUp] ?? "" });
      })
      .catch((err) => console.error("Error fetching the creator's name:", err));
    return () => {
      cancelled = true;
    };
  }, [activeGroupId, uidToLookUp]);

  if (stored) return stored;
  // A name looked up for another uid is not this record's.
  return lookedUp && lookedUp.uid === uidToLookUp ? lookedUp.name : "";
};

export default useCreatorName;
