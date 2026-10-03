// src/app/layout/__tests__/Navigation.highlight.test.tsx
// Which destination the nav marks as current, with the real router and the
// real useNavigation — Navigation.test.tsx stubs the highlighting out, which
// is how Home came to be lit on every page except Home.

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavigationProvider } from "shared/context/NavigationContext";
import Navigation, { NavigationProps } from "../Navigation";

/**
 * Renders one variant of the nav at `path` and returns the labels of the
 * destinations marked `aria-current="page"`.
 */
function currentItems(path: string, variant: NavigationProps["variant"]): string[] {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationProvider>
        <Navigation variant={variant} />
      </NavigationProvider>
    </MemoryRouter>
  );
  const nav = screen.getByRole("navigation", { name: "Main" });
  return within(nav)
    .queryAllByRole("button")
    .filter((button) => button.getAttribute("aria-current") === "page")
    .map((button) => button.textContent ?? "");
}

describe.each<NavigationProps["variant"]>(["inline", "mobile"])(
  "Navigation highlight (%s)",
  (variant) => {
    test("on Home, marks Home and nothing else", () => {
      expect(currentItems("/", variant)).toEqual(["Home"]);
    });

    test("on a section page, marks that section and not Home", () => {
      expect(currentItems("/story", variant)).toEqual(["Story"]);
    });

    test("below a section, still marks that section and not Home", () => {
      expect(currentItems("/quests/some-quest", variant)).toEqual(["Quests"]);
    });

    test("on a page outside the nav, marks nothing", () => {
      expect(currentItems("/privacy", variant)).toEqual([]);
    });
  }
);
