// src/shared/components/user-menu/UserMenuLinks.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useGroups } from "features/user-management";
import firebaseServices from "core/services/firebase";
import Typography from "core/components/Typography";
import { ChevronRight, LogOut, ShieldAlert } from "lucide-react";

/**
 * Props for {@link UserMenuLinks}.
 */
interface UserMenuLinksProps {
  /** Whether the owning popover is currently open, gating the member-count fetch. */
  open: boolean;
  /** Called after a row navigates or acts, so the owning popover can close. */
  onClose: () => void;
  /** Opens the admin panel dialog, owned by the header. */
  onOpenAdmin: () => void;
}

/**
 * The account menu's link section: profile, group members, report a
 * problem, admin panel (admins only) and sign out.
 *
 * `Group members` is a count, not a control -- member management lives in
 * the admin panel and is out of scope here, so a row that navigated nowhere
 * for non-admins would be a dead control for most people who see it. The
 * count is fetched only while the popover is open, and is omitted rather
 * than shown as zero until it resolves.
 */
const UserMenuLinks: React.FC<UserMenuLinksProps> = ({
  open,
  onClose,
  onOpenAdmin,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { activeGroupId, activeGroupUserProfile } = useGroups();
  const isAdmin = activeGroupUserProfile?.role === "admin";

  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !activeGroupId) return;

    let cancelled = false;
    firebaseServices.group
      .getGroupUsers(activeGroupId)
      .then((users: unknown[]) => {
        if (!cancelled) setMemberCount(users.length);
      })
      .catch(() => {
        // Leave the count unresolved: the row shows its label alone.
      });

    return () => {
      cancelled = true;
    };
  }, [open, activeGroupId]);

  const handleProfile = () => {
    onClose();
    navigate("/profile");
  };

  /**
   * Open the contact page as a problem report, carrying where the user was.
   *
   * The `?from=` parameter is the only thing that tells the report which
   * page the problem was on, since by the time the form renders the current
   * path is always "/contact".
   */
  const handleReport = () => {
    onClose();
    navigate(`/contact?from=${encodeURIComponent(location.pathname)}`);
  };

  const handleAdmin = () => {
    onClose();
    onOpenAdmin();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <div role="none" className="p-2">
      <button
        type="button"
        role="menuitem"
        onClick={handleProfile}
        className="flex items-center justify-between gap-2 px-2 py-2 w-full text-left rounded-md dropdown-item"
      >
        <Typography>Profile and settings</Typography>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
      </button>

      <div role="none" className="flex items-center justify-between gap-2 px-2 py-2">
        <Typography color="secondary">Group members</Typography>
        {memberCount !== null && (
          <Typography color="secondary">{memberCount}</Typography>
        )}
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={handleReport}
        className="flex items-center gap-2 px-2 py-2 w-full text-left rounded-md dropdown-item"
      >
        <Typography>Report a problem</Typography>
      </button>

      {isAdmin && (
        <button
          type="button"
          role="menuitem"
          onClick={handleAdmin}
          className="flex items-center gap-2 px-2 py-2 w-full text-left rounded-md dropdown-item"
        >
          <ShieldAlert className="w-4 h-4 flex-shrink-0 accent" />
          <Typography>Admin panel</Typography>
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={handleSignOut}
        className="flex items-center gap-2 px-2 py-2 w-full text-left rounded-md dropdown-item"
      >
        <LogOut className="w-4 h-4 flex-shrink-0" />
        <Typography color="secondary">Sign out</Typography>
      </button>
    </div>
  );
};

export default UserMenuLinks;
