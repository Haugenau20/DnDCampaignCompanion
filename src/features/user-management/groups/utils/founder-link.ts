// src/features/user-management/groups/utils/founder-link.ts

/**
 * The query parameter a founder link carries its token in:
 * `https://muninn.quest/join?founder=…` (`founderLink` in
 * `firebase/functions/src/signUp/founderInvitations.ts`).
 */
export const FOUNDER_PARAM = 'founder';

/**
 * Where a founder link leads in this app.
 *
 * With no token it is the page that asks for one: the group-less home links
 * there for someone who has the link but not on this device.
 *
 * @param token The founder link's token, or none
 * @returns A path to `/join` with the `founder` parameter
 */
export function founderLinkPath(token = ''): string {
  return `/join?${FOUNDER_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * The token in what somebody pasted: the whole founder link, or the token
 * alone.
 *
 * A link is read only for its `founder` parameter, whatever its host, since
 * the token is all that is used: it is never followed.
 *
 * @param input What was pasted
 * @returns The token, or `null` when there is none in it
 */
export function readFounderToken(input: string): string | null {
  const candidate = input.trim();
  if (!candidate) return null;
  if (/^[A-Za-z0-9_-]+$/.test(candidate)) return candidate;
  try {
    const token = new URL(candidate).searchParams.get(FOUNDER_PARAM)?.trim();
    return token ? token : null;
  } catch {
    return null;
  }
}
