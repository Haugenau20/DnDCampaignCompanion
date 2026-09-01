// src/features/user-management/profiles/components/__tests__/UsernameEditor.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsernameEditor from "../UsernameEditor";

const mockValidateUsername = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../hooks/useUser", () => require("@/features/user-management"));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

const mockUser = { uid: "user-1", email: "test@test.com" };
const mockGroup = { id: "group-1", name: "Test Campaign" };
const mockProfile = {
  userId: "user-1",
  username: "testuser",
  role: "member" as const,
  joinedAt: "2024-01-01T00:00:00.000Z",
};

function setupMocks(overrides: { profile?: any } = {}) {
  useAuth.mockReturnValue({ user: mockUser });
  useGroups.mockReturnValue({
    activeGroup: mockGroup,
    activeGroupUserProfile: overrides.profile !== undefined ? overrides.profile : mockProfile,
  });
  useUser.mockReturnValue({
    validateUsername: mockValidateUsername,
    updateGroupUserProfile: mockUpdateGroupUserProfile,
  });
}

describe("UsernameEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
  });

  test('should show "Change" button for username', () => {
    render(<UsernameEditor />);
    expect(screen.getByRole("button", { name: /change/i })).toBeInTheDocument();
  });

  test("should display username", () => {
    render(<UsernameEditor />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  test("should show username input when Change is clicked", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });

  test("should show Cancel button when in edit mode", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  test("should revert username on Cancel", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));
    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "newname" } });
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  test("Save is disabled immediately after the editor opens", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));

    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "validname1" } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"), { timeout: 2000 });
  });

  test("Save is disabled while a check is in flight", async () => {
    let resolveCheck: (v: { isValid: boolean; isAvailable: boolean }) => void = () => {};
    mockValidateUsername.mockImplementation(
      () => new Promise((resolve) => { resolveCheck = resolve; })
    );

    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));

    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "validname1" } });

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"), { timeout: 2000 });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();

    resolveCheck({ isValid: true, isAvailable: true });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  });

  test("Save enables only once a check has come back valid and available", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));

    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "validname1" } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"), { timeout: 2000 });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  });

  test("Save is disabled again when the name is edited after a passing check", async () => {
    mockValidateUsername.mockResolvedValueOnce({ isValid: true, isAvailable: true });

    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));

    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "validname1" } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"), { timeout: 2000 });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());

    let resolveSecondCheck: (v: { isValid: boolean; isAvailable: boolean }) => void = () => {};
    mockValidateUsername.mockImplementation(
      () => new Promise((resolve) => { resolveSecondCheck = resolve; })
    );

    fireEvent.change(usernameInput, { target: { value: "validname2" } });

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname2"), { timeout: 2000 });
    expect(saveBtn).toBeDisabled();

    resolveSecondCheck({ isValid: true, isAvailable: true });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  });

  test("should call updateGroupUserProfile when username form is submitted", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));

    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "newusername" } });

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("newusername"), { timeout: 2000 });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ username: "newusername" })
      );
    });
  });

  test("should show error when username save fails", async () => {
    mockUpdateGroupUserProfile.mockRejectedValue(new Error("Username update failed"));
    render(<UsernameEditor />);

    await userEvent.click(screen.getByRole("button", { name: /change/i }));
    const usernameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(usernameInput, { target: { value: "newusername" } });
    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("newusername"), { timeout: 2000 });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/username update failed/i)).toBeInTheDocument();
    });
  });

  test("should close edit mode when same username is submitted (via Cancel, since Save stays disabled)", async () => {
    render(<UsernameEditor />);
    await userEvent.click(screen.getByRole("button", { name: /change/i }));

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });
});
