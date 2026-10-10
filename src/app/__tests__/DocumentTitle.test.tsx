// src/app/__tests__/DocumentTitle.test.tsx
// Tab titles read `{Page} · {Campaign} · Muninn`, leaving out what does not
// apply, so a tab or a bookmark says where it goes.

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DocumentTitle, { documentTitleFor } from "../DocumentTitle";

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useCampaigns: jest.fn(),
}));

const { useAuth, useCampaigns } = require("@/features/user-management");

const CAMPAIGN = "The Sunless Citadel";

describe("documentTitleFor", () => {
  test("names the section, the campaign and the site", () => {
    expect(documentTitleFor("/quests", CAMPAIGN)).toBe("Quests · The Sunless Citadel · Muninn");
  });

  test("a record's page takes its section's name", () => {
    expect(documentTitleFor("/npcs/sildar-hallwinter", CAMPAIGN)).toBe(
      "NPCs · The Sunless Citadel · Muninn"
    );
    expect(documentTitleFor("/story/chapters/create", CAMPAIGN)).toBe(
      "Story · The Sunless Citadel · Muninn"
    );
  });

  test("the home page names the campaign alone", () => {
    expect(documentTitleFor("/", CAMPAIGN)).toBe("The Sunless Citadel · Muninn");
  });

  test("with no campaign, the site's name alone on the home page", () => {
    expect(documentTitleFor("/", null)).toBe("Muninn");
  });

  test("a section with no campaign leaves the campaign out", () => {
    expect(documentTitleFor("/rumors", undefined)).toBe("Rumors · Muninn");
  });

  test("pages outside a campaign never name one", () => {
    expect(documentTitleFor("/profile", CAMPAIGN)).toBe("Profile · Muninn");
    expect(documentTitleFor("/admin/people", CAMPAIGN)).toBe("Admin · Muninn");
    expect(documentTitleFor("/privacy", CAMPAIGN)).toBe("Privacy · Muninn");
    expect(documentTitleFor("/about", CAMPAIGN)).toBe("About · Muninn");
  });

  test("a prefix only matches a whole segment", () => {
    expect(documentTitleFor("/notesy", CAMPAIGN)).toBe("Muninn");
  });

  test("an address no section claims gets the bare title", () => {
    expect(documentTitleFor("/no/such/page", CAMPAIGN)).toBe("Muninn");
  });
});

describe("DocumentTitle", () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <DocumentTitle />
      </MemoryRouter>
    );

  beforeEach(() => {
    document.title = "";
  });

  test("sets the tab title from the address and the active campaign", () => {
    useAuth.mockReturnValue({ user: { uid: "u1" } });
    useCampaigns.mockReturnValue({ activeCampaign: { id: "c1", name: CAMPAIGN } });
    renderAt("/locations");
    expect(document.title).toBe("Locations · The Sunless Citadel · Muninn");
  });

  test("names no campaign to someone signed out", () => {
    useAuth.mockReturnValue({ user: null });
    useCampaigns.mockReturnValue({ activeCampaign: { id: "c1", name: CAMPAIGN } });
    renderAt("/");
    expect(document.title).toBe("Muninn");
  });
});
