// src/features/user-management/profiles/hooks/useUsernameEditor.ts
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import { useUser } from "./useUser";

/**
 * What {@link useUsernameEditor} exposes to its component.
 */
export interface UseUsernameEditorResult {
  /** The value bound to the input while the editor is open. */
  value: string;
  /** Updates {@link value}, re-triggering the debounced validation. */
  setValue: (value: string) => void;
  /** Whether the inline editor is currently open. */
  isEditing: boolean;
  /** The username on record, for display when the editor is closed. */
  currentUsername: string;
  /** Opens the inline editor. */
  open: () => void;
  /** Closes the editor and reverts {@link value} to {@link currentUsername}. */
  cancel: () => void;
  /** Submits the new username, when valid, available and changed. */
  submit: (e?: { preventDefault?: () => void }) => Promise<void>;
  /** Whether a debounced availability/validity check is in flight. */
  checking: boolean;
  /**
   * Whether the current value passed format validation. `null` means "not
   * yet checked" -- distinct from the `true`/`false` a real check produces.
   * Save's disabled expression must treat `null` as falsy, so this stays
   * unset (never defaulted to `true`) until a check actually runs, including
   * the moment the editor first opens.
   */
  valid: boolean | null;
  /** Whether the current value is available. Same `null`-is-unchecked rule as {@link valid}. */
  available: boolean | null;
  /** Field-level validation feedback (e.g. "Username must be at least 3 characters"). */
  fieldError: string | null;
  /** An error from a failed save attempt. */
  saveError: string | null;
  /** Whether a save is in flight. */
  saving: boolean;
}

/**
 * Debounced username-editing state machine for the group membership card.
 *
 * Carries the validation state machine that used to live inline in
 * `UserProfile.tsx`: opening the editor, editing the value, and only
 * enabling a submit once a debounced check has come back both valid and
 * available. `valid`/`available` reset to `null` -- not `true` -- both when
 * the editor is not actively checking a name (closed, unchanged, or too
 * short to bother checking) and whenever the value changes while editing, so
 * a stale pass from a previous value can never be acted on.
 */
export function useUsernameEditor(): UseUsernameEditorResult {
  const { user } = useAuth();
  const { activeGroup, activeGroupUserProfile } = useGroups();
  const { validateUsername, updateGroupUserProfile } = useUser();

  const [value, setValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeGroupUserProfile) {
      setValue(activeGroupUserProfile.username || "");
    }
  }, [activeGroupUserProfile]);

  // Username validation with debounce -- see the `valid`/`available` doc
  // comments above for why this resets to `null` rather than `true`.
  useEffect(() => {
    if (!isEditing || !value || !activeGroup || value === activeGroupUserProfile?.username) {
      setValid(null);
      setAvailable(null);
      setFieldError(null);
      return;
    }

    if (value.length < 3) {
      setValid(false);
      setAvailable(null);
      setFieldError("Username must be at least 3 characters");
      return;
    }

    // This name has not been checked yet, so say so straight away rather
    // than when the debounced check starts 500ms later. Otherwise editing a
    // name that already passed leaves the PREVIOUS name's verdict on screen
    // for the length of the debounce -- `checking` is still false, both
    // flags are still true, and Save is enabled against a name nothing has
    // validated.
    setValid(null);
    setAvailable(null);
    setFieldError(null);

    const checkUsername = async () => {
      setChecking(true);
      try {
        const result = await validateUsername(value);
        setValid(result.isValid);
        setAvailable(result.isAvailable ?? null);
        setFieldError(result.error || null);
      } catch (err) {
        setFieldError("Error checking username");
        setValid(false);
        setAvailable(false);
      } finally {
        setChecking(false);
      }
    };

    const timer = setTimeout(() => {
      checkUsername();
    }, 500);

    return () => clearTimeout(timer);
  }, [value, validateUsername, isEditing, activeGroupUserProfile?.username, activeGroup]);

  const open = () => setIsEditing(true);

  const cancel = () => {
    setIsEditing(false);
    if (activeGroupUserProfile) {
      setValue(activeGroupUserProfile.username);
    }
  };

  const submit = async (e?: { preventDefault?: () => void }) => {
    if (e?.preventDefault) e.preventDefault();
    if (!user || !activeGroupUserProfile || !valid || !available || saving || !activeGroup) return;

    if (value === activeGroupUserProfile.username) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      await updateGroupUserProfile(user.uid, { username: value });

      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  return {
    value,
    setValue,
    isEditing,
    currentUsername: activeGroupUserProfile?.username || "",
    open,
    cancel,
    submit,
    checking,
    valid,
    available,
    fieldError,
    saveError,
    saving,
  };
}
