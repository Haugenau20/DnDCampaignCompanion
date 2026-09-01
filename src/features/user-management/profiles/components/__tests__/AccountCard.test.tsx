// src/features/user-management/profiles/components/__tests__/AccountCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import AccountCard from "../AccountCard";

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));

const { useAuth } = require("@/features/user-management");

describe("AccountCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { uid: "user-1", email: "test@test.com" } });
  });

  test("displays the user's email", () => {
    render(<AccountCard />);
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });
});
