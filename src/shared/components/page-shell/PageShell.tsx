// src/shared/components/page-shell/PageShell.tsx
import React, { ReactNode } from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";

/** Props for {@link PageShell}. */
export interface PageShellProps {
  /**
   * The page's name. Always rendered as the document's `h1`.
   *
   * A node rather than a string only so a detail page can place an
   * `EntitySigil` beside the name inside the heading. The sigil is
   * `aria-hidden` by design, so the `h1`'s accessible name is still just the
   * name. Anything that changes what the heading *says* belongs in the string.
   */
  title: ReactNode;
  /** One line under the title saying what the page is for. */
  subtitle?: ReactNode;
  /**
   * Controls that act on the page's data.
   *
   * Pages pass `gate.canAct && <Button/>`, so `false` is the ordinary value in
   * the signed-out and pick-campaign states and must render nothing at all —
   * not an empty flex row, and certainly not the string "false".
   */
  actions?: ReactNode;
  /** Optional breadcrumb, rendered above the title. */
  breadcrumb?: ReactNode;
  /** Extra classes for the outer container. */
  className?: string;
  children: ReactNode;
}

/**
 * The header and container every gated page shares.
 *
 * Its whole reason for existing is the guarantee that the title and subtitle
 * render in *every* state — including the signed-out and pick-campaign ones,
 * where each page previously returned an early `<Card>` centred in an otherwise
 * empty viewport, so you could not tell which page you were looking at.
 *
 * It also ends the drift in heading level: the page title was an `h1` on four
 * pages and an `h2` on the rest.
 */
const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
  children,
}) => (
  <div className={clsx("max-w-7xl mx-auto px-4 py-8", className)}>
    {breadcrumb}
    <header className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
      <div>
        <Typography variant="h1" className="mb-2">
          {title}
        </Typography>
        {subtitle && <Typography color="secondary">{subtitle}</Typography>}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
    {children}
  </div>
);

export default PageShell;
