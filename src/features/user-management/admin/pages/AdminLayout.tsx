// src/features/user-management/admin/pages/AdminLayout.tsx
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import Typography from "core/components/Typography";
import PageShell from "shared/components/page-shell/PageShell";
import BackToCampaign from "shared/components/BackToCampaign";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import { useCampaigns } from "../../groups/hooks/useCampaigns";
import { signInPathFor } from "../../auth/utils/next-path";
import type { AdminOutletContext } from "./admin-outlet";
import type { GroupMember } from "../types";

/** The three admin views, in the order the sub-navigation lists them. */
const ADMIN_VIEWS = [
  { to: "/admin/people", label: "People" },
  { to: "/admin/campaigns", label: "Campaigns" },
  { to: "/admin/group", label: "Group" },
];

/**
 * A busy state that claims nothing.
 *
 * Deliberately has no `h1`: every heading this route can render is a terminal
 * answer ("you are not an admin", "no group selected"), and rendering one
 * while the answer is still unknown is the flash this guard exists to prevent.
 */
const AdminBusy: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    className="max-w-7xl mx-auto px-4 py-8"
    data-testid="admin-busy"
  >
    <span className="sr-only">Loading</span>
    <div className="space-y-4" aria-hidden="true">
      <div className="h-10 w-1/3 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
    </div>
  </div>
);

/**
 * The route shell for `/admin/*`: the band, the sub-navigation, and the three
 * states that decide whether any of it renders.
 *
 * These states are lifted out of `AdminPanel` rather than invented here. They
 * were always page concerns wearing a dialog -- a dialog cannot be deep-linked,
 * so "you arrived here signed out" had nowhere to go and became a Back button.
 *
 * **The order of the guards is the whole design.** Auth is asked first and
 * answered with a wait, never a decision: `user` is null both when nobody is
 * signed in and while Firebase Auth is rehydrating, and committing to the
 * second reading is bug #1423 exactly. Only once `useAuth().loading` has
 * settled -- the one flag in this chain that stays true for the entire restore
 * (see `useCampaignContextStatus`) -- may this route conclude anything.
 */
const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, activeGroup, getAllUsers, loading: groupsLoading } = useGroups();
  const { campaigns } = useCampaigns();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Local loading state with timeout to avoid infinite loading
  const [localLoading, setLocalLoading] = useState(true);

  // Set up a timeout to stop showing the loading state after 3 seconds
  // even if the loading state from the hook hasn't resolved
  useEffect(() => {
    if (!groupsLoading) {
      setLocalLoading(false);
    } else {
      // If still loading after 3 seconds, stop showing loading indicator.
      // Kept, deliberately: it looks like a workaround and probably is one,
      // but nothing has established what it works around, so removing it is a
      // behaviour change nobody can predict (10-1).
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [groupsLoading]);

  /**
   * Read the member list once, for the band's counts and the People view's
   * rows. Only admins may call `getAllUsers`, so it is gated on the same
   * answer the rest of the route waits for.
   */
  const reloadMembers = useCallback(async () => {
    if (!isAdmin || !activeGroup) return;
    setMembersLoading(true);
    try {
      setMembers((await getAllUsers()) as GroupMember[]);
      setMembersError(null);
    } catch (err) {
      setMembersError(
        err instanceof Error ? err.message : "Failed to load members"
      );
    } finally {
      setMembersLoading(false);
    }
  }, [isAdmin, activeGroup, getAllUsers]);

  useEffect(() => {
    reloadMembers();
  }, [reloadMembers]);

  // 1. Auth has not settled. Wait -- do not read `user` as an answer yet.
  //
  // No 3-second cap on this one, and that is not an oversight: the cap below
  // ends a wait by falling through to a *page*, whereas falling through here
  // would end it by redirecting a signed-in admin to sign in again. Auth
  // rehydration is measured at 3-7s in this environment (#1423), so a 3s cap
  // here would fire on most cold loads.
  if (authLoading) return <AdminBusy />;

  // 2. Genuinely signed out. Carry the destination so signing in returns here.
  if (!user) return <Navigate to={signInPathFor(location)} replace />;

  // 3. Group data still arriving, and nothing to render a band from yet.
  if (localLoading && !activeGroup) return <AdminBusy />;

  // 4. No group to administer. Not the same answer as "not an admin", and
  //    saying the wrong one sends people looking for a role they may have.
  if (!activeGroup) {
    return (
      <PageShell
        title="No group selected"
        maxWidth="max-w-3xl"
        breadcrumb={<BackToCampaign className="mb-4" />}
      >
        <Typography color="secondary">
          Administration belongs to a group. Choose one from the group switcher
          to manage it.
        </Typography>
      </PageShell>
    );
  }

  // 5. A member, not an admin. A plain statement: this is not an error, and
  //    nothing here is alarm-coloured.
  if (!isAdmin) {
    return (
      <PageShell
        title="You are not an admin of this group"
        maxWidth="max-w-3xl"
        breadcrumb={<BackToCampaign className="mb-4" />}
      >
        <Typography color="secondary">
          {`Only admins can manage ${activeGroup.name}. Ask one of them if you need something changed.`}
        </Typography>
      </PageShell>
    );
  }

  const adminCount = members.filter(
    (member) => member.role?.toLowerCase() === "admin"
  ).length;

  /**
   * The band's one metadata line.
   *
   * Each part is omitted rather than shown as zero while it is still
   * unknown -- a band claiming "0 members" during a fetch is worse than a band
   * that has not said yet.
   */
  const metadata = [
    membersLoading || members.length === 0
      ? null
      : `${members.length} ${members.length === 1 ? "member" : "members"}`,
    campaigns.length === 0
      ? null
      : `${campaigns.length} ${campaigns.length === 1 ? "campaign" : "campaigns"}`,
    adminCount === 0
      ? null
      : adminCount === 1
      ? "you are the only admin"
      : `you are one of ${adminCount} admins`,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* Cancels `main`'s own 16px padding so the band meets the chrome with
          no seam of page colour between them, exactly as `CampaignBanner`
          does. The band bleeds to the viewport; only the vertical cancel is
          Tailwind's job. */}
      <div className="-mx-4 -mt-4 py-8 sm:py-10 hero-band">
        <div className="px-4">
          <div className="max-w-7xl mx-auto">
            <div className="container mx-auto px-2 sm:px-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
                <div className="flex flex-col gap-2 min-w-0">
                  <Typography
                    variant="body-sm"
                    className="hero-eyebrow text-[11px] font-semibold uppercase tracking-wider"
                  >
                    Group administration
                  </Typography>
                  {/* The group's name, not the page's function: this band
                      answers "which group am I administering", which is the
                      one question dropping the app chrome would have made
                      ambiguous. */}
                  <Typography variant="h1" className="text-3xl sm:text-4xl break-words">
                    {activeGroup.name}
                  </Typography>

                  {/* One metadata line. The admin count is counted, never
                      assumed to be one: an admin is any member holding the
                      role, there may be several, and nothing here may imply
                      that one of them is the DM or owns the group. The DM is a
                      fact about the table, not a fact the software stores. */}
                  {metadata.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {metadata.map((item, index) => (
                        <React.Fragment key={item}>
                          {index > 0 && (
                            <span
                              aria-hidden="true"
                              className="hero-dot w-[3px] h-[3px] rounded-full shrink-0"
                            />
                          )}
                          <Typography variant="body-sm" className="hero-muted">
                            {item}
                          </Typography>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* 44px minimum, like every other target on these pages.
                    `Button variant="link"` sets no height of its own, which
                    leaves a 24px tap target on a phone. */}
                <div className="shrink-0">
                  <BackToCampaign className="min-h-[2.75rem]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Routes, not tabs: real anchors, so browser back works and each view
          can be linked to. `NavLink` supplies `aria-current="page"`. */}
      <nav
        aria-label="Administration"
        className={clsx("-mx-4 mb-4 flex flex-wrap border-b", "navigation")}
      >
        <div className="px-4 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="container mx-auto px-2 sm:px-4 flex flex-wrap">
              {ADMIN_VIEWS.map((view) => (
                <NavLink
                  key={view.to}
                  to={view.to}
                  className={({ isActive }) =>
                    clsx(
                      "px-4 font-medium flex items-center min-h-[2.75rem]",
                      isActive ? "nav-item nav-item-active" : "nav-item"
                    )
                  }
                >
                  {view.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <Outlet
        context={
          {
            members,
            membersLoading,
            membersError,
            reloadMembers,
          } satisfies AdminOutletContext
        }
      />
    </>
  );
};

export default AdminLayout;
