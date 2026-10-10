// src/app/__tests__/AnalyticsPageView.test.tsx
// T138: each address the player opens is handed to analytics as its section.

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { act } from "react";
import AnalyticsPageView from "../AnalyticsPageView";

jest.mock("@/core/services/firebase/analytics/analytics", () => ({
  trackPageView: jest.fn(),
}));
// DocumentTitle's module imports the feature barrel for its own component.
jest.mock("@/features/user-management", () => ({}));

const { trackPageView } = require("@/core/services/firebase/analytics/analytics");

let navigate: (to: string) => void = () => undefined;
const Navigator: React.FC = () => {
  navigate = useNavigate();
  return null;
};

test("reports each address as its section, without its query string", () => {
  render(
    <MemoryRouter initialEntries={["/auth/link?oobCode=secret"]}>
      <AnalyticsPageView />
      <Navigator />
    </MemoryRouter>
  );

  act(() => navigate("/npcs/sildar-hallwinter"));
  act(() => navigate("/join?code=invite123"));

  expect(trackPageView.mock.calls.map(([page]: [unknown]) => page)).toEqual([
    { path: "/auth/link", title: "Sign in" },
    { path: "/npcs", title: "NPCs" },
    { path: "/join", title: "Join" },
  ]);
});
