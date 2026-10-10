// src/pages/__tests__/AboutPage.test.tsx
// /about: why the site exists, where the name comes from, and who made it.

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AboutPage, { ABOUT_EXTRAS, SOURCE_URL } from "../AboutPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>
  );

describe("AboutPage", () => {
  test("is titled once, with the page's headline", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("A memory for the table");
  });

  test("has a section for why it exists, the name, and who made it", () => {
    renderPage();
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual(["Why it exists", "The name", "Who made it"]);
  });

  test("tells the myth and how to say the name", () => {
    renderPage();
    expect(screen.getByText(/One is Huginn, thought\. The other is Muninn, memory\./)).toBeInTheDocument();
    expect(screen.getByText("MOO-nin")).toBeInTheDocument();
  });

  test("spells rumour one way, the app's", () => {
    renderPage();
    expect(screen.queryByText(/\brumors?\b/i)).not.toBeInTheDocument();
    expect(screen.getByText(/which rumour we'd already ruled out/)).toBeInTheDocument();
  });

  test("links to the code, in a new tab", () => {
    renderPage();
    const link = screen.getByRole("link", { name: "View the code on GitHub" });
    expect(link).toHaveAttribute("href", SOURCE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  test("points questions at the contact page and data at the privacy page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "contact page" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "privacy page" })).toHaveAttribute("href", "/privacy");
  });

  // Both wait on the maintainer, and stay out until they have somewhere to point.
  describe("the parts that are switched off", () => {
    test("are off", () => {
      expect(ABOUT_EXTRAS).toEqual({ coffeeUrl: null, photoSrc: null });
    });

    test("draw no coffee button and no photo", () => {
      renderPage();
      expect(screen.queryByRole("link", { name: /coffee/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Søren" })).not.toBeInTheDocument();
    });

    test("draw both once given somewhere to point", () => {
      const saved = { ...ABOUT_EXTRAS };
      ABOUT_EXTRAS.coffeeUrl = "https://example.test/coffee";
      ABOUT_EXTRAS.photoSrc = "/photo.webp";
      try {
        renderPage();
        expect(screen.getByRole("link", { name: "Buy me a coffee" })).toHaveAttribute(
          "href",
          "https://example.test/coffee"
        );
        expect(screen.getByRole("img", { name: "Søren" })).toHaveAttribute("src", "/photo.webp");
      } finally {
        Object.assign(ABOUT_EXTRAS, saved);
      }
    });
  });
});
