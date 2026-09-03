// src/shared/components/command-palette/CommandPalette.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Book, MapPin, MessageSquare, Plus, Scroll, Search, StickyNote, Users, X } from "lucide-react";
import type { SearchResult, SearchResultType } from "core/types/search";
import Typography from "core/components/Typography";
import { useSearch } from "shared/hooks/useSearch";
import { useCreateActions } from "shared/hooks/useCreateActions";
import { useNavigation } from "shared/context/NavigationContext";
import { useCampaigns } from "features/user-management";
import { flattenGroups, groupResultsByType } from "shared/utils/searchPresentation";
import HighlightedText from "./HighlightedText";
import { useCommandPaletteKeys } from "./useCommandPaletteKeys";

/** Props for {@link CommandPalette}. */
interface CommandPaletteProps {
  /** Whether the palette is open. Closed renders nothing. */
  isOpen: boolean;
  /** Close the palette. */
  onClose: () => void;
  /** The trigger button that opened the palette, for focus return (Task 4). */
  triggerRef: React.RefObject<HTMLButtonElement>;
}

// Map of icons for each result type. `note` uses `StickyNote` to match the
// icon `src/app/layout/Navigation.tsx` already uses for the `/notes` nav
// item -- the same destination should not change icon between the nav and
// the search results.
const resultTypeIcons: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  story: Book,
  quest: Scroll,
  npc: Users,
  location: MapPin,
  rumors: MessageSquare,
  note: StickyNote,
};

/** The DOM id given to a result's `role="option"` row. */
const optionId = (result: SearchResult): string => `cmdk-option-${result.type}-${result.id}`;

/**
 * The 720px command palette: a portal-rendered search surface reached via
 * {@link SearchTrigger}, replacing the header's field-and-dropdown search bar.
 *
 * It owns query display, grouped/highlighted results, the create-new
 * commands, the loading/empty/too-short states, and the keyboard contract
 * (`useCommandPaletteKeys`): arrow keys move a **virtual** selection --
 * `aria-activedescendant`, not real DOM focus, which stays in the input the
 * whole time -- Enter commits it, Tab cycles the type filter, and Escape
 * closes and returns focus to the trigger.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, triggerRef }) => {
  const {
    query,
    results,
    isSearching,
    isQueryTooShort,
    isIndexReady,
    onSearch,
    onClearSearch,
  } = useSearch();
  const { navigateToPage, createPath } = useNavigation();
  const { activeCampaign } = useCampaigns();
  const createActions = useCreateActions();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<SearchResultType | null>(null);

  /**
   * Navigate to the appropriate page for a result's type.
   *
   * `createPath`'s `params` argument is never substituted into the returned
   * path (see `shared/context/NavigationContext.tsx`), so a note -- whose id
   * belongs in the path itself, at the real route `/notes/:noteId` -- must
   * call `navigateToPage` directly with the id interpolated. The other five
   * types pass their id as a `highlight` query param instead.
   */
  const navigateToResult = useCallback(
    (result: SearchResult): void => {
      switch (result.type) {
        case "story":
          navigateToPage(createPath("/story", {}, { highlight: result.id }));
          break;
        case "quest":
          navigateToPage(createPath("/quests", {}, { highlight: result.id }));
          break;
        case "npc":
          navigateToPage(createPath("/npcs", {}, { highlight: result.id }));
          break;
        case "location":
          navigateToPage(createPath("/locations", {}, { highlight: result.id }));
          break;
        case "rumors":
          navigateToPage(createPath("/rumors", {}, { highlight: result.id }));
          break;
        case "note":
          navigateToPage(`/notes/${result.id}`);
          break;
      }
    },
    [navigateToPage, createPath]
  );

  const groups = useMemo(() => groupResultsByType(results), [results]);
  // Falls back to the unfiltered groups once `typeFilter` no longer matches
  // any group present -- e.g. the query changed underneath a Tab-narrowed
  // filter and the new results contain no result of that type. Without this,
  // `filteredGroups` goes to `[]` and the listbox renders with no rows and no
  // empty state, while the header count label still reports the real total.
  const filteredGroups = useMemo(
    () =>
      typeFilter && groups.some((group) => group.type === typeFilter)
        ? groups.filter((group) => group.type === typeFilter)
        : groups,
    [groups, typeFilter]
  );
  const flatResults = useMemo(() => flattenGroups(filteredGroups), [filteredGroups]);
  const navigableItems = useMemo(
    () => [
      ...flatResults.map((r) => ({ kind: "result" as const, id: optionId(r), result: r })),
      ...createActions.map((a) => ({ kind: "create" as const, id: `cmdk-create-${a.id}`, action: a })),
    ],
    [flatResults, createActions]
  );

  // The Tab cycle's universe of types, always derived from the *unfiltered*
  // results -- so cycling can still reach every type once a filter narrows
  // `filteredGroups` down to one of them.
  const availableTypes = useMemo(() => groups.map((g) => g.type), [groups]);

  const cycleFilter = useCallback(() => {
    setTypeFilter((current) => {
      if (availableTypes.length === 0) return null;
      if (current === null) return availableTypes[0];
      const next = availableTypes.indexOf(current) + 1;
      return next >= availableTypes.length ? null : availableTypes[next];
    });
  }, [availableTypes]);

  const commit = useCallback(() => {
    const item = navigableItems[selectedIndex];
    if (!item) return;
    if (item.kind === "result") {
      navigateToResult(item.result);
    } else {
      // Fire-and-forget, matching the floating action button: awaiting here
      // would defer the close by a microtask, a real user-visible difference.
      void item.action.run();
    }
    onClose();
  }, [navigableItems, selectedIndex, navigateToResult, onClose]);

  // Reset the selection whenever the *navigable* list changes -- not just
  // when `results` changes. `navigableItems` is derived from `filteredGroups`,
  // which also shrinks when `typeFilter` changes with `results` untouched;
  // omitting `typeFilter` here would leave `selectedIndex` pointing past the
  // end of a freshly filtered, shorter list, orphaning `aria-activedescendant`.
  useEffect(() => {
    setSelectedIndex(0);
  }, [results, typeFilter]);

  useCommandPaletteKeys({
    isOpen,
    itemCount: navigableItems.length,
    selectedIndex,
    onMove: setSelectedIndex,
    onCommit: commit,
    onFilterCycle: cycleFilter,
    onClose: () => {
      onClose();
      triggerRef.current?.focus();
    },
  });

  if (!isOpen) {
    return null;
  }

  const activeDescendant = navigableItems[selectedIndex]?.id;
  const campaignName = activeCampaign?.name ?? null;
  const trimmedQuery = query.trim();
  const resultCountLabel = campaignName
    ? `${results.length} result${results.length === 1 ? "" : "s"} in ${campaignName}`
    : `${results.length} result${results.length === 1 ? "" : "s"}`;

  const skeleton = (
    <div data-testid="palette-skeleton" className="p-4 flex flex-col gap-2.5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-md journal-loading h-12" />
      ))}
    </div>
  );

  // Priority order per spec §5.3: the index-not-ready check comes first --
  // that precedence is deliberate and load-bearing -- then the too-short
  // query, then a search in flight, then an untouched empty query (this
  // component's own addition: `isQueryTooShort` requires length > 0, so a
  // length-0 query falls through it and would otherwise hit the "no
  // results" branch below on the very first open), then genuinely empty
  // results, then the results themselves.
  let resultsBody: React.ReactNode;
  if (!isIndexReady) {
    resultsBody = skeleton;
  } else if (isQueryTooShort) {
    resultsBody = (
      <div className="p-8 text-center">
        <Typography color="secondary">Keep typing…</Typography>
      </div>
    );
  } else if (isSearching) {
    resultsBody = skeleton;
  } else if (trimmedQuery.length === 0) {
    resultsBody = (
      <div className="p-8 text-center">
        <Typography color="secondary">Start typing to search…</Typography>
      </div>
    );
  } else if (results.length === 0) {
    resultsBody = (
      <div className="p-8 text-center">
        <Typography color="secondary">
          {campaignName ? `No results in ${campaignName}` : "No results"}
        </Typography>
      </div>
    );
  } else {
    resultsBody = filteredGroups.map((group) => (
      <div key={group.type} role="group" aria-label={group.label}>
        <Typography
          variant="body-sm"
          color="secondary"
          className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
        >
          {group.label}
        </Typography>
        {group.results.map((result) => {
          const index = flatResults.indexOf(result);
          const Icon = resultTypeIcons[result.type];
          const isSelected = index === selectedIndex;
          return (
            <div
              key={optionId(result)}
              id={optionId(result)}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => {
                navigateToResult(result);
                onClose();
              }}
              className={clsx(
                "flex items-start gap-3 px-4 py-2.5 cursor-pointer border-l-[3px]",
                isSelected ? "search-result-selected border-accent" : "search-result border-transparent"
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 primary" />
              <div className="min-w-0 flex-1">
                <Typography className="font-medium">
                  <HighlightedText text={result.title} query={query} />
                </Typography>
                {result.matches[0] && (
                  <Typography variant="body-sm" color="secondary">
                    …<HighlightedText text={result.matches[0]} query={query} />…
                  </Typography>
                )}
              </div>
              {result.matchCount > 1 && (
                <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
                  {`+${result.matchCount - 1} more mentions`}
                </Typography>
              )}
              {isSelected && (
                <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
                  ↵ open
                </Typography>
              )}
            </div>
          );
        })}
      </div>
    ));
  }

  return createPortal(
    <div
      data-testid="palette-scrim"
      className="fixed inset-0 z-40"
      style={{ backgroundColor: "rgba(15,23,42,.34)" }}
      onMouseDown={onClose}
    >
      <div
        data-testid="command-palette"
        onMouseDown={(event) => event.stopPropagation()}
        className={clsx(
          "search-results fixed z-50 overflow-y-auto",
          "left-1/2 -translate-x-1/2 top-[calc(3.5rem+34px)]",
          "w-[720px] max-w-[calc(100vw-2rem)] max-h-[70vh]",
          "max-md:inset-0 max-md:left-0 max-md:w-full max-md:max-w-none",
          "max-md:max-h-none max-md:translate-x-0 max-md:rounded-none"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b card-divider">
          <Search className="w-4 h-4 flex-shrink-0 primary" />
          <input
            type="text"
            role="combobox"
            autoFocus
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls="palette-results"
            aria-activedescendant={activeDescendant}
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search stories, quests, NPCs..."
            className="flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0"
          />
          {trimmedQuery.length > 0 && (
            <Typography variant="body-sm" color="secondary" className="flex-shrink-0">
              {resultCountLabel}
            </Typography>
          )}
          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="button-ghost p-1 rounded flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span
            aria-hidden="true"
            className="hidden md:inline flex-shrink-0 px-1.5 py-0.5 rounded text-xs search"
          >
            esc
          </span>
        </div>

        {/* One listbox for the whole session, in every state -- `aria-controls`
            above names this id unconditionally, so it must exist even while
            showing the skeleton, the too-short prompt or the empty state, or
            `aria-expanded="true"` would point at nothing. Create commands are
            rendered as further options of this same listbox rather than a
            second, id-less one: a listbox may own only `option`/`group`
            children, and a sibling listbox left `aria-activedescendant`
            pointing outside the element `aria-controls` names whenever a
            create row was selected. */}
        <div id="palette-results" role="listbox">
          {resultsBody}

          {createActions.length > 0 && (
            <>
              <hr aria-hidden="true" className="card-divider" />
              {createActions.map((action, actionIndex) => {
                const Icon = action.icon;
                const index = flatResults.length + actionIndex;
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={action.id}
                    id={`cmdk-create-${action.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      action.run();
                      onClose();
                    }}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-2.5 cursor-pointer border-l-[3px]",
                      isSelected ? "search-result-selected border-accent" : "search-result border-transparent"
                    )}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0 primary" />
                    <Icon className="w-4 h-4 flex-shrink-0 primary" />
                    <Typography variant="body-sm">
                      {`New ${action.entityLabel} named "${query}"`}
                    </Typography>
                    {isSelected && (
                      <Typography variant="body-sm" color="secondary" className="flex-shrink-0 ml-auto">
                        ↵ open
                      </Typography>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t card-divider">
          <Typography variant="body-sm" color="secondary">
            ↑↓ move · ↵ open · tab filter by type
          </Typography>
          {campaignName && (
            <Typography variant="body-sm" color="secondary">
              {`Searching ${campaignName} only`}
            </Typography>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
