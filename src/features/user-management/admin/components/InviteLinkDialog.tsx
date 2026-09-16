// src/features/user-management/admin/components/InviteLinkDialog.tsx
import React, { useEffect, useState } from 'react';
import Dialog from 'core/components/Dialog';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import { Check, Copy } from 'lucide-react';

/** Props for {@link InviteLinkDialog}. */
export interface InviteLinkDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Closes it. */
  onClose: () => void;
  /** The invitation link to share, already built. */
  link: string;
  /** The group the invitation is for, named in the sentence. */
  groupName: string;
  /** Who the invitation is for, when a note says. */
  note?: string;
}

/**
 * The one dialog this phase adds, and the shape the survivors copy.
 *
 * It passes the rule in §1 on all three questions: it is one decision (copy
 * this and go), about the invitation behind it, with nothing worth returning
 * to. So it stays a dialog while admin and sign-in become pages.
 *
 * Built to 14-5's diet deliberately, since it is the reference: **no `Card`
 * inside it** -- `Dialog` already supplies the title, border and padding, and
 * an inner card is the duplication that produced two "Sign In" headings. One
 * title, one sentence of consequence, the link, one button.
 */
const InviteLinkDialog: React.FC<InviteLinkDialogProps> = ({
  open,
  onClose,
  link,
  groupName,
  note,
}) => {
  const [copied, setCopied] = useState(false);

  // A stale "Copied!" on reopening would claim something about a link the
  // admin has not touched yet.
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch (err) {
      // Clipboard access can be refused outright. Saying nothing is wrong, but
      // the link is on screen and selectable, so the recovery is visible.
      console.error('Failed to copy the invitation link:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={note ? `Invite link for ${note}` : 'Invite link'}
      maxWidth="max-w-md"
      isNested={true}
    >
      <div className="space-y-4">
        <Typography color="secondary">
          {`Anyone with this link can join ${groupName} once. It expires when used.`}
        </Typography>

        <div className="flex items-center gap-2 rounded-md p-2 card-subtle card-border">
          {/* Selectable rather than truncated to a stub: the link is the
              product of this dialog, so it has to be readable and copyable by
              hand if the clipboard is unavailable. */}
          <code className="font-mono text-xs break-all min-w-0 flex-1">
            {link}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
};

export default InviteLinkDialog;
