// src/features/user-management/groups/pages/__tests__/JoinPage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import JoinPage from "../JoinPage";

// The form's mechanics -- token validation, the debounced username check, the
// join itself -- are covered by `JoinGroupDialog.test.tsx`, which renders the
// same component. This suite is about the page around it.
jest.mock("@/features/user-management/groups/components/JoinGroupForm", () => ({
  __esModule: true,
  default: ({
    onCancel,
    onSuccess,
  }: {
    onCancel?: () => void;
    onSuccess?: () => void;
  }) => (
    <div>
      <span data-testid="has-cancel">{onCancel ? "yes" : "no"}</span>
      <button onClick={() => onSuccess?.()}>Pretend to join</button>
    </div>
  ),
}));

const completeJoin = jest.fn().mockResolvedValue(undefined);
jest.mock(
  "@/features/user-management/groups/hooks/useJoinGroupCompletion",
  () => ({
    useJoinGroupCompletion: () => completeJoin,
  })
);

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="landed">{location.pathname}</div>;
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("JoinPage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders the join form on a page, with no dialog around it", () => {
    renderAt("/join?token=abc");
    expect(
      screen.getByRole("button", { name: "Pretend to join" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // A page is somewhere you arrived, not an interruption of what you were
  // doing, so there is nothing to cancel back to.
  test("offers no Cancel", () => {
    renderAt("/join?token=abc");
    expect(screen.getByTestId("has-cancel")).toHaveTextContent("no");
  });

  test("lands in the joined group on success, via the shared completion", async () => {
    renderAt("/join?token=abc");
    await userEvent.click(screen.getByRole("button", { name: "Pretend to join" }));
    expect(completeJoin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("landed")).toHaveTextContent("/");
  });
});
