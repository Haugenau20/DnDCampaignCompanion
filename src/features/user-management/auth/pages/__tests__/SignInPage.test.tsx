// src/features/user-management/auth/pages/__tests__/SignInPage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import SignInPage from "../SignInPage";

// The form's own behaviour has its own suite. Here it is reduced to the one
// thing this page is responsible for: what happens after a successful sign-in.
jest.mock("@/features/user-management/auth/components/SignInForm", () => ({
  __esModule: true,
  default: ({ onSuccess }: { onSuccess?: () => void }) => (
    <button onClick={() => onSuccess?.()}>Pretend to sign in</button>
  ),
}));

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return (
    <div data-testid="landed">{`${location.pathname}${location.search}`}</div>
  );
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SignInPage", () => {
  test("renders the sign-in form on a page, with no dialog around it", () => {
    renderAt("/signin");
    expect(
      screen.getByRole("button", { name: "Pretend to sign in" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // `SignInForm` already titles itself, via `Card.Header`. A page heading on
  // top of that is the "Sign In" twice that 14-4 exists to remove, so this
  // page contributes none of its own.
  test("adds no heading of its own on top of the form's", () => {
    renderAt("/signin");
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
  });

  describe("where it sends you afterwards", () => {
    test("to the validated next destination", async () => {
      renderAt("/signin?next=%2Fadmin%2Fpeople");
      await userEvent.click(screen.getByRole("button"));
      expect(screen.getByTestId("landed")).toHaveTextContent("/admin/people");
    });

    test("keeping the destination's own query string", async () => {
      renderAt("/signin?next=%2Flocations%3Fview%3Dmap");
      await userEvent.click(screen.getByRole("button"));
      expect(screen.getByTestId("landed")).toHaveTextContent(
        "/locations?view=map"
      );
    });

    test("to campaign home when there is no next", async () => {
      renderAt("/signin");
      await userEvent.click(screen.getByRole("button"));
      expect(screen.getByTestId("landed")).toHaveTextContent("/");
    });

    test.each([
      ["an absolute URL", "https%3A%2F%2Fevil.test"],
      ["a protocol-relative URL", "%2F%2Fevil.test"],
      ["an encoded protocol-relative URL", "%2F%252Fevil.test"],
    ])("to campaign home rather than off-origin, given %s", async (_l, next) => {
      renderAt(`/signin?next=${next}`);
      await userEvent.click(screen.getByRole("button"));
      expect(screen.getByTestId("landed")).toHaveTextContent("/");
    });
  });
});
