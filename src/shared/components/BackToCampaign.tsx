// src/shared/components/BackToCampaign.tsx
import React from "react";
import { ArrowLeft } from "lucide-react";
import Button from "core/components/Button";
import { useNavigation } from "shared/hooks/useNavigation";

/** Props for {@link BackToCampaign}. */
export interface BackToCampaignProps {
  /** Extra classes, usually the caller's own bottom margin. */
  className?: string;
  /**
   * The active campaign's name, or nothing when there is none. The caller
   * reads it from `useCampaigns`; see the component's note for why this does
   * not.
   */
  campaignName?: string | null;
}

/**
 * The way out of a page that sits beside the campaign rather than inside it.
 *
 * Contact and profile both wrote this by hand, identically and twice: the same
 * `className="button button-link flex items-center gap-2 text-sm"`, the same
 * `ArrowLeft`, and the same `activeCampaign?.name ? ... : "Back to the
 * campaign"` fallback. `ContactSuccess` writes that label a third time for its
 * own button, which is a different control and keeps its own.
 *
 * It names the campaign because these pages are reached from a footer link or
 * an account menu, where "back" alone does not say back to *what* -- and it
 * falls back to the generic phrasing rather than an empty name, since a
 * signed-out visitor has no campaign and still needs the way out.
 *
 * On `Button variant="link"` rather than the raw class pair, so it inherits
 * the primitive's focus ring and disabled handling like every other control.
 *
 * It is told the campaign's name rather than reading `useCampaigns` itself.
 * `AdminLayout`, inside `user-management`, renders it, so a `shared/`
 * component importing that feature's barrel closed an import cycle, which
 * `lint`'s `import/no-cycle` refuses (T030).
 */
const BackToCampaign: React.FC<BackToCampaignProps> = ({ className, campaignName }) => {
  const { navigateToPage } = useNavigation();

  const label = campaignName ? `Back to ${campaignName}` : "Back to the campaign";

  return (
    <Button
      variant="link"
      className={className}
      onClick={() => navigateToPage("/")}
      startIcon={<ArrowLeft className="w-4 h-4" />}
    >
      {label}
    </Button>
  );
};

export default BackToCampaign;
