// src/features/user-management/admin/utils/invite-link.ts

/**
 * Build the invitation link an admin copies and sends.
 *
 * This is the whole product of "Invite someone": the token exists to make this
 * URL, and the URL is the only part anybody else ever sees.
 *
 * It points at `/join`, which is new in this phase. What it replaced was
 * `${origin}?join=true&token=…&groupId=…` -- a query string **nothing in the
 * application has ever read**, so every invitation sent from the admin panel
 * landed on the campaign home page and quietly did nothing. The route is what
 * makes the link work, not merely what makes it prettier.
 *
 * @param origin The site's origin, normally `window.location.origin`
 * @param token The registration token
 * @param groupId The group being joined, carried because `/join` reads it
 * @returns An absolute URL
 */
export function buildInviteLink(
  origin: string,
  token: string,
  groupId: string | null | undefined
): string {
  const url = new URL("/join", origin);
  url.searchParams.set("token", token);
  if (groupId) url.searchParams.set("groupId", groupId);
  return url.toString();
}

export default buildInviteLink;
