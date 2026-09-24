// src/pages/__tests__/NotFoundPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFoundPage from "../NotFoundPage";

const mockNavigateToPage = jest.fn();
jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NotFoundPage />
    </MemoryRouter>
  );

describe("NotFoundPage", () => {
  beforeEach(() => jest.clearAllMocks());

  // A mistyped or stale address is an ordinary event, so it gets a designed
  // state and a way onward -- not the header and footer around nothing.
  it("says the page does not exist", () => {
    renderAt("/npcs/fake/thing");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("names the address that was asked for", () => {
    renderAt("/npcs/fake/thing");
    expect(screen.getByText("/npcs/fake/thing")).toBeInTheDocument();
  });

  it("offers a way back to the dashboard", () => {
    renderAt("/npcs/fake/thing");
    fireEvent.click(screen.getByRole("button", { name: "Back to the dashboard" }));
    expect(mockNavigateToPage).toHaveBeenCalledWith("/");
  });
});
