// src/shared/components/command-palette/HighlightedText.tsx
import React from "react";
import { splitOnMatch } from "shared/utils/searchPresentation";

/** Props for {@link HighlightedText}. */
interface HighlightedTextProps {
  /** The text to render. */
  text: string;
  /** The query whose literal occurrences are marked. */
  query: string;
}

/**
 * Render `text` with every literal occurrence of `query` wrapped in `<mark>`.
 *
 * Fuzzy subsequence hits render unhighlighted -- see {@link splitOnMatch}.
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => (
  <>
    {splitOnMatch(text, query).map((segment, index) =>
      segment.isMatch ? (
        <mark key={index} className="bg-accent text-primary rounded-sm px-0.5">
          {segment.text}
        </mark>
      ) : (
        <React.Fragment key={index}>{segment.text}</React.Fragment>
      )
    )}
  </>
);

export default HighlightedText;
