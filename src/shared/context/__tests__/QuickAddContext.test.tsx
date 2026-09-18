// src/shared/context/__tests__/QuickAddContext.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QuickAddProvider, useQuickAdd } from "../QuickAddContext";

// The form is stubbed: this suite is about which surface is open and what it
// is handed, not about the fields inside it.
jest.mock("shared/components/quick-add/QuickAddForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="quick-add-form">
      <span data-testid="quick-add-props">{JSON.stringify(props)}</span>
    </div>
  ),
}));

function Launcher() {
  const { openQuickAdd, closeQuickAdd, openEntity } = useQuickAdd();
  return (
    <div>
      <span data-testid="open-entity">{openEntity ?? "none"}</span>
      <button onClick={() => openQuickAdd("npc")}>add npc</button>
      <button onClick={() => openQuickAdd("quest")}>add quest</button>
      <button onClick={() => openQuickAdd("location", { parentId: "hobbiton" })}>
        add place inside
      </button>
      <button onClick={closeQuickAdd}>close</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <MemoryRouter>
      <QuickAddProvider>
        <Launcher />
      </QuickAddProvider>
    </MemoryRouter>
  );
}

const props = () => JSON.parse(screen.getByTestId("quick-add-props").textContent!);

describe("QuickAddProvider", () => {
  it("shows nothing until something opens it", () => {
    renderWithProvider();
    expect(screen.queryByTestId("quick-add-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("open-entity")).toHaveTextContent("none");
  });

  it("opens the surface for the entity asked for", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add npc"));

    expect(screen.getByTestId("quick-add-form")).toBeInTheDocument();
    expect(props().entity).toBe("npc");
    expect(screen.getByTestId("open-entity")).toHaveTextContent("npc");
  });

  it("names the surface, so the dialog and the route agree", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add npc"));
    expect(screen.getByRole("dialog", { name: "New NPC" })).toBeInTheDocument();
  });

  it("is a real modal dialog, not an anonymous div", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add quest"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("carries a pre-set parent through to the form", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add place inside"));
    expect(props().parentId).toBe("hobbiton");
  });

  it("closes on request and clears what it was carrying", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add place inside"));
    expect(screen.getByTestId("quick-add-form")).toBeInTheDocument();

    await userEvent.click(screen.getByText("close"));
    expect(screen.queryByTestId("quick-add-form")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("add npc"));
    expect(props().parentId).toBeUndefined();
  });

  it("does not inherit the previous entity's state when switching", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add place inside"));
    await userEvent.click(screen.getByText("add quest"));

    expect(props().entity).toBe("quest");
    expect(props().parentId).toBeUndefined();
  });

  it("holds one surface at a time", async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText("add npc"));
    await userEvent.click(screen.getByText("add quest"));
    expect(screen.getAllByTestId("quick-add-form")).toHaveLength(1);
  });
});

describe("useQuickAdd without a provider", () => {
  it("returns a no-op opener rather than throwing", () => {
    // `useCreateActions` is rendered by the command palette and the create
    // menu, whose suites mount neither this provider nor the entity contexts.
    // Throwing here would make this PR's wiring break tests about surfaces it
    // does not touch.
    function Bare() {
      const { openQuickAdd, openEntity } = useQuickAdd();
      return (
        <button onClick={() => openQuickAdd("npc")}>{openEntity ?? "none"}</button>
      );
    }

    render(<Bare />);
    expect(screen.getByRole("button", { name: "none" })).toBeInTheDocument();
    expect(() =>
      screen.getByRole("button", { name: "none" }).click()
    ).not.toThrow();
  });
});
