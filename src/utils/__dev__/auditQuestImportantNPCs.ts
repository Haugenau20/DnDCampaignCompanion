// src/utils/__dev__/auditQuestImportantNPCs.ts
//
// ============================================================================
// OPERATOR TOOLING — NOT PART OF THE APPLICATION RUNTIME
// ============================================================================
// Read-only audit for `D15.7`: `Quest.importantNPCs` is deleted in favour of
// `relatedNPCIds` (`handoff/15-5-quest-page.md` item 4).
//
// `15-5` asks whoever implements it to "check for persisted data before
// deleting the field, and say in the PR description whether any document
// carries `importantNPCs` values that are not already in `relatedNPCIds`".
// That question can only be answered against a real campaign, which no test
// and no CI job can reach. This script is how it gets answered.
//
// What the field deletion actually does to stored data: **nothing**. Every
// write in the app goes through `updateDoc` (see
// `DocumentService.updateDocumentWithAttribution`), which merges field by
// field and never removes one. A quest document that carries `importantNPCs`
// today still carries it after this change; the app simply stops reading and
// writing it. So this audit is not a deadline -- it can be run before or after
// the merge, and the answer is the same.
//
// Usage:
//   npx ts-node ./src/utils/__dev__/auditQuestImportantNPCs.ts
//
// It signs in as a real user (prompted for interactively, password not
// echoed), reads `groups/{g}/campaigns/{c}/quests` and `.../npcs` for every
// group that user belongs to, and prints -- for each quest carrying
// `importantNPCs` -- which of those names the quest's `relatedNPCIds` already
// covers and which it does not. It writes nothing, ever: there is no `migrate`
// mode, because what to do with a name that matches no NPC record is a
// judgement about a campaign, not a data repair.
//
// The environment contract is `normalizeChapterDateModified.ts`'s, verbatim:
// REACT_APP_* pointing at the project you mean to read, the ordinary client
// SDK rather than `firebase-admin`, no service-account key, and the project id
// printed before anything happens. Imports here are **relative** on purpose --
// `ts-node` in this repo resolves neither `baseUrl` nor `paths` (see
// CLAUDE.md), so a bare `core/...` specifier passes tsc, jest and webpack and
// then fails at runtime in exactly this file.
// ============================================================================

import * as readline from "readline";
import * as dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "../../core/services/firebase/config/firebaseConfig";

dotenv.config();

// ----------------------------------------------------------------------------
// Pure logic — no Firestore, no network. Exported for the unit test beside it.
// ----------------------------------------------------------------------------

/** One entry of the field being retired. */
export interface StoredImportantNPC {
  name?: string;
  description?: string;
}

/** The two collections, as much of them as this audit reads. */
export interface AuditQuest {
  path: string;
  title?: string;
  importantNPCs?: StoredImportantNPC[];
  relatedNPCIds?: string[];
}

export interface AuditNPC {
  id: string;
  name?: string;
}

/** What one quest's `importantNPCs` turn out to be worth. */
export interface QuestFinding {
  path: string;
  title: string;
  /** Names already represented by an id in `relatedNPCIds`. Nothing is lost. */
  covered: string[];
  /**
   * Names `relatedNPCIds` does not cover, each with the NPC record it would
   * migrate to if one exists. `npcId: null` means no record carries that name
   * at all -- the line is free text about somebody who was never entered, and
   * there is no id to migrate it into.
   */
  uncovered: { name: string; npcId: string | null }[];
}

export interface AuditReport {
  questsScanned: number;
  questsCarryingImportantNPCs: number;
  namesTotal: number;
  namesCovered: number;
  /** Uncovered, and resolvable to an NPC record: these are migratable. */
  namesMigratable: number;
  /** Uncovered, and naming nobody on record: free text with nowhere to go. */
  namesUnresolvable: number;
  findings: QuestFinding[];
}

/**
 * Compare a name to an id or another name, ignoring the things that differ
 * between the two spellings of the same person.
 *
 * Ids in this product are slugs of names (`generateUniqueEntityId`), so
 * "Thorin Oakenshield" and `thorin-oakenshield` are the same person written
 * two ways, and "Eönwë" and `eonwe` differ only by diacritics. Everything that
 * is not a letter or a digit is dropped, and the comparison is done on what is
 * left.
 */
export const normalizeForComparison = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Does `relatedNPCIds` already say what this `importantNPCs` name says?
 *
 * Covered if the name matches one of the attached ids, or the *name* of the
 * NPC record one of those ids points at. Both directions of containment count:
 * a quest often names "Gandalf" where the NPC record is "Gandalf the Grey".
 */
export function isCovered(
  name: string,
  relatedNPCIds: string[],
  npcsById: Map<string, string>
): boolean {
  const target = normalizeForComparison(name);
  if (!target) return true; // an empty entry says nothing, so nothing is lost

  return relatedNPCIds.some((id) => {
    const candidates = [normalizeForComparison(id), normalizeForComparison(npcsById.get(id) ?? "")];
    return candidates.some(
      (candidate) =>
        candidate.length > 0 &&
        (candidate === target || candidate.includes(target) || target.includes(candidate))
    );
  });
}

/** The NPC record this name would migrate to, or `null` if there is none. */
export function resolveToNPC(name: string, npcs: AuditNPC[]): string | null {
  const target = normalizeForComparison(name);
  if (!target) return null;

  const match = npcs.find((npc) => {
    const candidate = normalizeForComparison(npc.name ?? "");
    return candidate.length > 0 && (candidate === target || candidate.includes(target));
  });
  return match ? match.id : null;
}

/** The whole audit, as a pure function of what was read. */
export function buildAuditReport(quests: AuditQuest[], npcs: AuditNPC[]): AuditReport {
  const npcsById = new Map(npcs.map((npc) => [npc.id, npc.name ?? ""]));

  const findings: QuestFinding[] = [];
  let namesTotal = 0;
  let namesCovered = 0;
  let namesMigratable = 0;
  let namesUnresolvable = 0;

  for (const quest of quests) {
    const stored = (quest.importantNPCs ?? []).map((entry) => entry?.name ?? "").filter(Boolean);
    if (stored.length === 0) continue;

    const related = quest.relatedNPCIds ?? [];
    const covered: string[] = [];
    const uncovered: { name: string; npcId: string | null }[] = [];

    for (const name of stored) {
      namesTotal += 1;
      if (isCovered(name, related, npcsById)) {
        namesCovered += 1;
        covered.push(name);
        continue;
      }

      const npcId = resolveToNPC(name, npcs);
      if (npcId) {
        namesMigratable += 1;
      } else {
        namesUnresolvable += 1;
      }
      uncovered.push({ name, npcId });
    }

    findings.push({
      path: quest.path,
      title: quest.title ?? "(untitled)",
      covered,
      uncovered,
    });
  }

  return {
    questsScanned: quests.length,
    questsCarryingImportantNPCs: findings.length,
    namesTotal,
    namesCovered,
    namesMigratable,
    namesUnresolvable,
    findings,
  };
}

// ----------------------------------------------------------------------------
// Firestore — reads only
// ----------------------------------------------------------------------------

/**
 * Every quest and NPC reachable from the signed-in user's own memberships:
 *   users/{uid}.groups -> groups/{g}/campaigns -> .../quests and .../npcs
 *
 * Enumerated explicitly rather than with `collectionGroup`, for the reason the
 * sibling script's header gives: a collection-group query is denied by the
 * production rules and would need its own composite index besides.
 */
async function walkReachable(
  db: Firestore,
  uid: string
): Promise<{ quests: AuditQuest[]; npcs: AuditNPC[]; warnings: string[] }> {
  const quests: AuditQuest[] = [];
  const npcs: AuditNPC[] = [];
  const warnings: string[] = [];

  const userDocSnap = await getDoc(doc(db, "users", uid));
  if (!userDocSnap.exists()) {
    throw new Error(`No users/${uid} document found for the signed-in account`);
  }
  const groupIds: string[] = (userDocSnap.data().groups as string[] | undefined) ?? [];
  if (groupIds.length === 0) {
    warnings.push(`users/${uid} has no groups — nothing to scan`);
  }

  for (const groupId of groupIds) {
    let campaignsSnap;
    try {
      campaignsSnap = await getDocs(collection(db, "groups", groupId, "campaigns"));
    } catch (error) {
      warnings.push(`Could not list groups/${groupId}/campaigns: ${(error as Error).message}`);
      continue;
    }

    for (const campaignDoc of campaignsSnap.docs) {
      const campaignId = campaignDoc.id;

      try {
        const questsSnap = await getDocs(
          collection(db, "groups", groupId, "campaigns", campaignId, "quests")
        );
        questsSnap.docs.forEach((questDoc) => {
          const data = questDoc.data();
          quests.push({
            path: questDoc.ref.path,
            title: data.title,
            importantNPCs: data.importantNPCs,
            relatedNPCIds: data.relatedNPCIds,
          });
        });
      } catch (error) {
        warnings.push(
          `Could not list groups/${groupId}/campaigns/${campaignId}/quests: ${(error as Error).message}`
        );
      }

      try {
        const npcsSnap = await getDocs(
          collection(db, "groups", groupId, "campaigns", campaignId, "npcs")
        );
        npcsSnap.docs.forEach((npcDoc) => {
          npcs.push({ id: npcDoc.id, name: npcDoc.data().name });
        });
      } catch (error) {
        warnings.push(
          `Could not list groups/${groupId}/campaigns/${campaignId}/npcs: ${(error as Error).message}`
        );
      }
    }
  }

  return { quests, npcs, warnings };
}

/** Ask a question on the terminal and resolve with the typed answer. */
function promptVisible(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Ask for a secret without echoing it.
 *
 * `readline` echoes every keystroke through its private `_writeToOutput` hook;
 * replacing that hook after the prompt has been written swallows the typed
 * characters and nothing else. The answer is not trimmed: whitespace can be
 * part of a password.
 */
function promptHidden(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  let muted = false;
  const rlInternals = rl as unknown as {
    _writeToOutput: (text: string) => void;
    output: NodeJS.WritableStream;
  };
  const writeToOutput = rlInternals._writeToOutput.bind(rl);
  rlInternals._writeToOutput = (text: string) => {
    if (!muted) writeToOutput(text);
  };

  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      muted = false;
      rlInternals.output.write("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function main(): Promise<void> {
  const projectId = process.env.REACT_APP_PROJECT_ID;
  if (!projectId) {
    console.error(
      "REACT_APP_PROJECT_ID is not set. Point the REACT_APP_* variables at the\n" +
        "project you mean to read (the same ones the app itself uses)."
    );
    process.exit(1);
    return;
  }
  console.log(`Reading project '${projectId}'. This script writes nothing.`);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  if (!process.stdin.isTTY) {
    console.error("No terminal available to prompt for credentials — run this by hand.");
    process.exit(1);
    return;
  }

  const email = await promptVisible("Email: ");
  const password = await promptHidden("Password: ");

  const auth = getAuth(app);
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    // Report the failure without ever echoing the password back.
    const code = (error as { code?: string }).code ?? "unknown";
    console.error(`Sign-in failed for ${email} (${code}).`);
    process.exit(1);
    return;
  }

  const uid = credential.user.uid;
  console.log(`Signed in as ${credential.user.email ?? uid} (uid: ${uid})`);

  const { quests, npcs, warnings } = await walkReachable(db, uid);
  warnings.forEach((warning) => console.warn(`WARNING: ${warning}`));

  const report = buildAuditReport(quests, npcs);

  console.log(`\nQuests scanned: ${report.questsScanned}`);
  console.log(`Quests carrying importantNPCs: ${report.questsCarryingImportantNPCs}`);
  console.log(`Names in that field: ${report.namesTotal}`);
  console.log(`  already covered by relatedNPCIds: ${report.namesCovered}`);
  console.log(`  not covered, but matching an NPC record: ${report.namesMigratable}`);
  console.log(`  not covered, and matching no NPC record: ${report.namesUnresolvable}`);

  report.findings
    .filter((finding) => finding.uncovered.length > 0)
    .forEach((finding) => {
      console.log(`\n${finding.title}  (${finding.path})`);
      finding.uncovered.forEach(({ name, npcId }) => {
        console.log(
          npcId
            ? `  - "${name}" is not attached; the NPC record '${npcId}' is the same person`
            : `  - "${name}" is not attached, and no NPC record carries that name`
        );
      });
    });

  if (report.namesMigratable === 0 && report.namesUnresolvable === 0) {
    console.log("\nNothing is lost: every name is already said by relatedNPCIds.");
  } else {
    console.log(
      "\nAttach the people above to their quests (the quest page's \"Who is in it\")\n" +
        "before relying on relatedNPCIds alone. The stored field is untouched either\n" +
        "way -- the app no longer reads it, and no write removes it."
    );
  }

  process.exit(0);
}

// Only when actually executed, so the pure helpers above stay importable.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
