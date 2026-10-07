/*
 * Delete an account on request.
 *
 * The privacy page promises that a rights request gets an answer from a
 * person. For someone who can still sign in, deleting is a button on their
 * profile. This is for someone who cannot: it runs `deleteAccount`, the same
 * code as that button (the `deleteUser` callable), so it removes exactly what
 * the privacy page lists -- the sign-in, the profile, the profile in every
 * group with its private notes and reading progress, and the names reserved
 * to them. What they wrote into campaigns stays, as it does for the button.
 *
 * WITHOUT --apply IT ONLY READS, and prints what would go. With --apply it
 * deletes, and that cannot be undone. Confirm the request came from the
 * address you are about to delete before you run it.
 *
 * Run it with your own Google account, which needs owner or editor access to
 * the project; no key file is involved (Application Default Credentials):
 *
 *   gcloud auth application-default login
 *   cd firebase/functions
 *   npm run build
 *   node scripts/delete-account.js --project dnd-campaign-companion --email someone@example.com
 *   node scripts/delete-account.js --project dnd-campaign-companion --email someone@example.com --apply
 *
 * `--uid <uid>` instead of `--email` reaches an account whose sign-in is gone
 * but whose profile is not. `--emulator` runs against the dev emulators.
 *
 * The one refusal is the button's: the only admin of a group that has other
 * members. Make another member an admin first -- in the Firebase console, set
 * `role` to "admin" on that member's `groups/{g}/users/{uid}` -- and run it
 * again.
 */
const {initializeApp, getApps} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");

/**
 * "1 campaign", "0 campaigns".
 *
 * @param {number} count How many
 * @param {string} noun The singular
 * @return {string} The phrase
 */
const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * What the deletion would remove, for the maintainer to read before deciding.
 * Counts only: it names no note and quotes nothing anyone wrote.
 *
 * @param {object} plan What `planAccountDeletion` returned
 * @param {boolean} apply Whether the deletion follows
 * @return {string} The report
 */
function describePlan(plan, apply) {
  if (!plan.hasSignIn && !plan.hasProfile) {
    return `There is no account ${plan.uid}: no sign-in and no profile.`;
  }
  const lines = [
    `Account ${plan.uid}${plan.email ? ` (${plan.email})` : ""}`,
    `  sign-in: ${plan.hasSignIn ? "yes" : "no"}`,
    `  profile: ${plan.hasProfile ? "yes" : "no"}`,
  ];
  for (const group of plan.groups) {
    lines.push(
      `  group ${group.groupId}: names ${group.names.join(", ") || "none"}; ` +
      `${plural(group.notes, "private note")}; ` +
      `reading progress in ${plural(group.readingProgress, "campaign")}`
    );
    if (group.onlyAdmin) {
      lines.push(
        `    ONLY ADMIN of ${group.groupId}, which has other members. Make one of them an admin first ` +
        `(groups/${group.groupId}/users/<their uid>, role "admin"); until then --apply refuses.`
      );
    }
  }
  const blocked = plan.groups.filter((group) => group.onlyAdmin).map((group) => group.groupId);
  lines.push("");
  if (blocked.length) {
    lines.push(`Nothing has been changed, and nothing can be until ${blocked.join(", ")} has another admin.`);
  } else {
    lines.push(apply ?
      "Deleting all of the above. This cannot be undone." :
      "Nothing has been changed. Run again with --apply to delete all of the above.");
  }
  return lines.join("\n");
}

/**
 * The value after `name` on the command line, if any.
 *
 * @param {string[]} args The arguments
 * @param {string} name The flag
 * @return {string | undefined} Its value
 */
function flag(args, name) {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
}

/** Parses the command line, then plans and, with --apply, deletes. */
async function main() {
  const args = process.argv.slice(2);
  const projectId = flag(args, "--project");
  const email = flag(args, "--email");
  const uidArg = flag(args, "--uid");
  const apply = args.includes("--apply");
  if (!projectId || (!email === !uidArg)) {
    console.error(
      "Usage: node scripts/delete-account.js --project <project-id> " +
      "(--email <address> | --uid <uid>) [--apply] [--emulator]"
    );
    process.exit(2);
  }

  if (args.includes("--emulator")) {
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  } else {
    // Never let an environment variable left over from the emulators point a
    // production deletion somewhere else, or the other way round.
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  }
  if (!getApps().length) initializeApp({projectId});

  let deletion;
  try {
    deletion = require("../lib/userManagement/accountDeletion");
  } catch {
    console.error("The functions are not built. Run `npm run build` in firebase/functions first.");
    process.exit(1);
  }

  let uid = uidArg;
  if (!uid) {
    try {
      uid = (await getAuth().getUserByEmail(email)).uid;
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
      console.error(
        `No sign-in uses ${email}. If a profile was left behind, find its uid in the ` +
        "console (users/, by email) and run again with --uid."
      );
      process.exit(1);
    }
  }

  const plan = await deletion.planAccountDeletion(uid);
  console.log(describePlan(plan, apply));
  if (!apply || (!plan.hasSignIn && !plan.hasProfile)) return;
  if (plan.groups.some((group) => group.onlyAdmin)) process.exit(1);

  // The plan is a read; an admin can step down between it and this, so the
  // deletion checks again and may still refuse.
  try {
    await deletion.deleteAccount(uid);
  } catch (error) {
    if (error.code === "failed-precondition") {
      console.error(`Refused: they are the only admin of ${error.details?.groupId}. Nothing was deleted.`);
      process.exit(1);
    }
    throw error;
  }
  console.log("Deleted.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {describePlan};
