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

  // Inverted by 14.4, deliberately. In 14.1 the form still carried its own
  // `Card.Header title="Sign In"`, so the page added nothing. Now the card is
  // gone and the page is the single title -- which is the actual requirement:
  // "Sign In" appears once in the DOM of `/signin`.
  test("titles the page exactly once", () => {
    renderAt("/signin");
    const signInHeadings = screen
      .getAllByRole("heading")
      .filter((h) => /^sign in$/i.test((h.textContent ?? "").trim()));
    expect(signInHeadings).toHaveLength(1);
  });

  test("frames the page without naming a group it cannot read", () => {
    renderAt("/signin");
    expect(screen.getByText(/private campaign/i)).toBeInTheDocument();
  });

  describe("naming where you were going", () => {
    test("names a destination it recognises", () => {
      renderAt("/signin?next=%2Flocations");
      expect(screen.getByText(/you were heading to/i)).toBeInTheDocument();
      expect(screen.getByText("Locations")).toBeInTheDocument();
    });

    test("names the admin route by what it is, not by its path", () => {
      renderAt("/signin?next=%2Fadmin%2Fpeople");
      expect(screen.getByText("group administration")).toBeInTheDocument();
    });

    // A path is not a name. Showing one is worse than saying nothing: it puts
    // a URL the reader never typed in front of them.
    test("says nothing at all rather than printing a path", () => {
      renderAt("/signin?next=%2Fsomething-unknown");
      expect(screen.queryByText(/you were heading to/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/something-unknown/)).not.toBeInTheDocument();
    });

    test("says nothing when there is no destination", () => {
      renderAt("/signin");
      expect(screen.queryByText(/you were heading to/i)).not.toBeInTheDocument();
    });

    test("says nothing for a rejected destination", () => {
      renderAt("/signin?next=https%3A%2F%2Fevil.test");
      expect(screen.queryByText(/you were heading to/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/evil\.test/)).not.toBeInTheDocument();
    });
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
