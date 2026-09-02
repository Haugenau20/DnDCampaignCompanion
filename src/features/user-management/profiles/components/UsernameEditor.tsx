// src/features/user-management/profiles/components/UsernameEditor.tsx
import React from "react";
import Typography from "core/components/Typography";
import Input from "core/components/Input";
import Button from "core/components/Button";
import { Edit, Check, X, Loader2, AlertCircle } from "lucide-react";
import { useUsernameEditor } from "../hooks/useUsernameEditor";

/**
 * The inline "Name in this group" editor: its Change/Cancel toggle, the
 * validated input, and the Save button gated on a debounced availability
 * check.
 *
 * A behaviour-preserving extraction of the username block that used to sit
 * inline in `UserProfile.tsx`, now over the same state machine hoisted into
 * {@link useUsernameEditor}.
 */
const UsernameEditor: React.FC = () => {
  const {
    value,
    setValue,
    isEditing,
    currentUsername,
    open,
    cancel,
    submit,
    checking,
    valid,
    available,
    fieldError,
    saveError,
    saving,
  } = useUsernameEditor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Typography variant="body-sm" color="secondary">Name in this group</Typography>
        {!isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={open}
            startIcon={<Edit size={16} />}
          >
            Change
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancel}
            startIcon={<X size={16} />}
          >
            Cancel
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={submit} className="flex items-start gap-2">
          <div className="relative flex-1">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              disabled={saving}
              error={fieldError || undefined}
              successMessage={
                valid && available && value !== currentUsername ? "Username available" : undefined
              }
              endIcon={
                checking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : value && valid && available ? (
                  <Check className="w-4 h-4 success-icon" />
                ) : value && (valid === false || available === false) ? (
                  <X className="w-4 h-4 form-error" />
                ) : null
              }
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={saving || checking || !valid || !available || value === currentUsername}
            isLoading={saving}
          >
            Save
          </Button>
        </form>
      ) : (
        <Typography>{currentUsername}</Typography>
      )}

      {saveError && (
        <div className="flex items-center gap-2 form-error">
          <AlertCircle size={16} />
          <Typography color="error">{saveError}</Typography>
        </div>
      )}
    </div>
  );
};

export default UsernameEditor;
