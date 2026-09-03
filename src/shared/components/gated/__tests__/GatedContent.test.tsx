// src/shared/components/gated/__tests__/GatedContent.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GatedContent from "../GatedContent";
import { GATED_COPY } from "../gated-page-copy";
import type { PageGate } from "../usePageGate";

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);
let mockActiveGroupId: string | null = "g-1";

jest.mock("features/user-management", () => ({
  useGroups: () => ({
    groups: [{ id: "g-1", name: "The Fellowship" }],
    activeGroupId: mockActiveGroupId,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({ setActiveCampaign: mockSetActiveCampaign }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

let mockOptions = [
  {
    campaignId: "c-1",
    campaignName: "Phandelver",
    groupId: "g-1",
    groupName: "The Fellowship",
  },
];

jest.mock("../useSelectableCampaigns", () => ({
  useSelectableCampaigns: (enabled: boolean) => ({
    options: enabled ? mockOptions : [],
    loading: false,
  }),
}));

const gate = (overrides: Partial<PageGate> = {}): PageGate => ({
  state: "ready",
  canAct: true,
  page: "quests",
  mode: "read",
  copy: GATED_COPY.quests,
  heading: GATED_COPY.quests.heading,
  error: null,
  ...overrides,
});

const renderGate = (value: PageGate) =>
  render(
    <MemoryRouter>
      <GatedContent gate={value}>
        <div data-testid="page-body">the quests</div>
      </GatedContent>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveGroupId = "g-1";
  mockOptions = [
    {
      campaignId: "c-1",
      campaignName: "Phandelver",
      groupId: "g-1",
      groupName: "The Fellowship",
    },
  ];
});

describe("GatedContent", () => {
  it("renders the page body when ready", () => {
    renderGate(gate());
    expect(screen.getByTestId("page-body")).toBeInTheDocument();
  });

  it("renders a skeleton and no message while resolving", () => {
    renderGate(gate({ state: "resolving", canAct: false }));
    expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("page-body")).not.toBeInTheDocument();
    // The flash this PR removes: no "please select" copy during restore.
    expect(screen.queryByText(/sign in to/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/which campaign/i)).not.toBeInTheDocument();
  });

  it("renders the signed-out panel instead of the body", () => {
    renderGate(gate({ state: "signed-out", canAct: false }));
    expect(
      screen.getByRole("heading", { name: GATED_COPY.quests.heading })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("page-body")).not.toBeInTheDocument();
  });

  it("opens the sign-in dialog from the panel", () => {
    renderGate(gate({ state: "signed-out", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
  });

  it("opens the join-group dialog from the panel", () => {
    renderGate(gate({ state: "signed-out", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /invite link/i }));
    expect(screen.getByTestId("join-group-dialog")).toBeInTheDocument();
  });

  it("renders the campaign picker instead of the body", () => {
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    expect(
      screen.getByRole("heading", { name: /which campaign/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("page-body")).not.toBeInTheDocument();
  });

  it("switches campaign without touching the group when it is the active one", async () => {
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    await waitFor(() =>
      expect(mockSetActiveCampaign).toHaveBeenCalledWith("c-1")
    );
    expect(mockSetActiveGroup).not.toHaveBeenCalled();
  });

  it("switches group first when the campaign is in another group", async () => {
    mockActiveGroupId = "g-2";
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    await waitFor(() => expect(mockSetActiveGroup).toHaveBeenCalledWith("g-1"));
    await waitFor(() =>
      expect(mockSetActiveCampaign).toHaveBeenCalledWith("c-1")
    );
  });

  it("shows a failed switch in the panel", async () => {
    mockSetActiveCampaign.mockRejectedValueOnce(new Error("offline"));
    renderGate(gate({ state: "pick-campaign", canAct: false }));
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    expect(await screen.findByText("offline")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Phandelver/ })
    ).toBeInTheDocument();
  });

  it("names what failed to load in the error state", () => {
    renderGate(gate({ state: "error", canAct: false, error: "Network down" }));
    expect(screen.getByText(/couldn't load quests/i)).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("offers a retry only when the page gave it one", () => {
    const onRetry = jest.fn();
    const { rerender } = renderGate(
      gate({ state: "error", canAct: false, error: "Network down", onRetry })
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <GatedContent gate={gate({ state: "error", canAct: false, error: "x" })}>
          <div data-testid="page-body">the quests</div>
        </GatedContent>
      </MemoryRouter>
    );
    expect(
      screen.queryByRole("button", { name: /try again/i })
    ).not.toBeInTheDocument();
  });

  it("uses the write heading on a create route", () => {
    renderGate(
      gate({
        state: "signed-out",
        canAct: false,
        mode: "write",
        heading: GATED_COPY.quests.writeHeading as string,
      })
    );
    expect(
      screen.getByRole("heading", {
        name: GATED_COPY.quests.writeHeading as string,
      })
    ).toBeInTheDocument();
  });
});
