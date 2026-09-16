// src/shared/components/gated/types.ts

/**
 * One campaign the signed-in user could switch to, and the group it lives in.
 *
 * The group travels with the campaign rather than being a grouping header,
 * because two campaigns in different groups can share a name and the row has to
 * be unambiguous on its own.
 *
 * It lives in its own module because three of this directory's files need it —
 * the panel that renders the rows, the hook that fetches them, and the wrapper
 * that wires the two together — and none of those three is naturally the owner.
 */
export interface CampaignOption {
  campaignId: string;
  campaignName: string;
  groupId: string;
  groupName: string;
}
