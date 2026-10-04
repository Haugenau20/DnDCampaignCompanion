// src/app/__tests__/RecordRoute.test.tsx
//
// REACT-001: React Router reuses a route's element when only its parameter
// changes, so an editor opened on one record survived the move to another
// and saved its draft onto it. A detail page belongs to one record.

import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import RecordRoute from "../RecordRoute";

/**
 * A page shaped like the entity pages: it reads its record from the route,
 * holds an unsaved draft in state, and saves through a callback built for the
 * record it is showing *now*.
 */
function DraftPage({ onSave }: { onSave: (id: string, draft: string) => void }) {
  const { npcId = "" } = useParams();
  const [draft, setDraft] = useState("");
  return (
    <div>
      <h1>{npcId}</h1>
      <label>
        Description
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <button type="button" onClick={() => onSave(npcId, draft)}>
        Save
      </button>
      <Link to="/npcs/bob">Bob</Link>
      <Link to="/npcs/alice?highlight=note">Same record, new query</Link>
    </div>
  );
}

const renderAt = (onSave: jest.Mock, keyed: boolean) =>
  render(
    <MemoryRouter initialEntries={["/npcs/alice"]}>
      <Routes>
        <Route
          path="/npcs/:npcId"
          element={
            keyed ? (
              <RecordRoute param="npcId">
                <DraftPage onSave={onSave} />
              </RecordRoute>
            ) : (
              <DraftPage onSave={onSave} />
            )
          }
        />
      </Routes>
    </MemoryRouter>
  );

const type = (text: string) =>
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: text } });

describe("RecordRoute", () => {
  it("never saves one record's draft onto the next", () => {
    const onSave = jest.fn();
    renderAt(onSave, true);
    type("Draft belonging only to Alice");

    fireEvent.click(screen.getByRole("link", { name: "Bob" }));
    expect(screen.getByRole("heading", { name: "bob" })).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("bob", "");
    expect(onSave).not.toHaveBeenCalledWith("bob", "Draft belonging only to Alice");
  });

  it("keeps the page, and the draft, while the record stays the same", () => {
    // `?highlight=` and the like change the URL without changing the record;
    // remounting then would throw away what is being typed for no reason.
    renderAt(jest.fn(), true);
    type("Still Alice's");
    fireEvent.click(screen.getByRole("link", { name: "Same record, new query" }));
    expect(screen.getByLabelText("Description")).toHaveValue("Still Alice's");
  });

  it("is what stands between the router and the defect", () => {
    // The control: the same page without the wrapper carries the draft over.
    const onSave = jest.fn();
    renderAt(onSave, false);
    type("Draft belonging only to Alice");
    fireEvent.click(screen.getByRole("link", { name: "Bob" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("bob", "Draft belonging only to Alice");
  });
});
