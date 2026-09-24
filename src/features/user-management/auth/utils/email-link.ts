// src/features/user-management/auth/utils/email-link.ts

/** The route a magic sign-in link opens. */
export const EMAIL_LINK_PATH = '/auth/link';

/** An invitation the link should redeem once it has signed the reader in. */
export interface InvitationToRedeem {
  groupId: string;
  token: string;
  /** The name the reader chose for themselves in that group. */
  username: string;
}

/** What a magic link carries besides Firebase's own parameters. */
export interface SignInLinkIntent {
  /** Where to go after signing in. Unvalidated -- pass through `safeNextPath`. */
  next: string | null;
  invitation: InvitationToRedeem | null;
  /**
   * The sign-in request of the device that asked for the link, so that
   * another device opening it can approve that one instead of itself. Never
   * set on an invitation link.
   */
  device: string | null;
}

/**
 * The URL a magic link should open.
 *
 * Everything the landing page needs travels in the URL itself, not in this
 * browser's storage, so that a link sent from a laptop still works when it is
 * opened on a phone. That includes an invitation: its group and token were in
 * the invite link already, and the chosen name is not a secret.
 *
 * `groupId` keeps its name from the invite link because
 * `InvitationService.validateRegistrationToken` reads it from the page's own
 * query string.
 *
 * @param origin The app's origin, e.g. `window.location.origin`
 * @param intent Where to go next and which device asked, or which invitation to redeem
 */
export function signInLinkUrl(
  origin: string,
  intent: Partial<SignInLinkIntent> = {}
): string {
  const params = new URLSearchParams();
  if (intent.invitation) {
    params.set('groupId', intent.invitation.groupId);
    params.set('token', intent.invitation.token);
    params.set('username', intent.invitation.username);
  } else {
    if (intent.next) params.set('next', intent.next);
    if (intent.device) params.set('device', intent.device);
  }
  const query = params.toString();
  return `${origin}${EMAIL_LINK_PATH}${query ? `?${query}` : ''}`;
}

/**
 * Read back what `signInLinkUrl` put in a link.
 * @param params The landing page's query string
 */
export function readSignInLinkIntent(params: URLSearchParams): SignInLinkIntent {
  const groupId = params.get('groupId');
  const token = params.get('token');
  const username = params.get('username');
  const invitation =
    groupId && token && username ? { groupId, token, username } : null;
  return {
    next: params.get('next'),
    invitation,
    device: invitation ? null : params.get('device'),
  };
}
