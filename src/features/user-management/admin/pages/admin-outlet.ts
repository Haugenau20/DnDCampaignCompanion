// src/features/user-management/admin/pages/admin-outlet.ts
import { useOutletContext } from 'react-router-dom';
import type { GroupMember } from '../types';

/**
 * What `AdminLayout` hands down to whichever admin view is rendering.
 *
 * The member list is here because the band already has to fetch it: the
 * metadata line states the member count and how many admins there are, and
 * both are counted rather than assumed. Letting `/admin/people` fetch the same
 * collection a second time to draw the same people would be exactly the
 * duplication that view exists to remove.
 */
export interface AdminOutletContext {
  members: GroupMember[];
  membersLoading: boolean;
  /** A failure to load members, surfaced by the view rather than the band. */
  membersError: string | null;
  /** Re-reads the member list, after a removal. */
  reloadMembers: () => Promise<void>;
}

/** Typed access to {@link AdminOutletContext}. */
export function useAdminOutlet(): AdminOutletContext {
  return useOutletContext<AdminOutletContext>();
}
