// src/shared/components/row-controls/__tests__/row-controls.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StateLadder from "../StateLadder";
import ObjectiveCheckbox from "../ObjectiveCheckbox";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
] as const;

/** A host that only advances the value once the write resolves, as a row does. */
function LadderHost({
  onChange,
  initial = "active",
}: {
  onChange: (next: string) => Promise<unknown>;
  initial?: string;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <StateLadder
      label="Status"
      options={STATUS_OPTIONS as any}
      value={value as any}
      ariaLabel="Status of Reclaim Erebor"
      onChange={async (next) => {
        await onChange(next);
        setValue(next);
      }}
    />
  );
}

describe("StateLadder", () => {
  it("is buttons, not a dropdown", () => {
    render(<LadderHost onChange={jest.fn().mockResolvedValue(undefined)} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("says every step in words, not by colour alone", () => {
    render(<LadderHost onChange={jest.fn().mockResolvedValue(undefined)} />);
    ["Active", "Completed", "Failed"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });

  it("marks the current step, and only it", () => {
    render(<LadderHost onChange={jest.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Failed" })).toHaveAttribute("aria-pressed", "false");
  });

  it("names the group, so three ladders on one screen stay distinguishable", () => {
    render(<LadderHost onChange={jest.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByRole("group", { name: "Status of Reclaim Erebor" })).toBeInTheDocument();
  });

  it("changes state in one click", async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<LadderHost onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(onChange).toHaveBeenCalledWith("completed");
  });

  it("does not write when the current step is clicked again", async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<LadderHost onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  describe("the save contract (§7)", () => {
    it("claims nothing before the write resolves", async () => {
      let resolve!: () => void;
      const onChange = jest.fn(() => new Promise<void>((r) => { resolve = r; }));
      render(<LadderHost onChange={onChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Completed" }));

      // Mid-flight: the lit button is still the one the record holds.
      expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Completed" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText("Saving…")).toBeInTheDocument();

      resolve();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Completed" })).toHaveAttribute("aria-pressed", "true")
      );
    });

    it("leaves the record's value showing when the write is refused", async () => {
      const onChange = jest.fn().mockRejectedValue(new Error("Permission denied"));
      render(<LadderHost onChange={onChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Failed" }));

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Permission denied"));
      expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Failed" })).toHaveAttribute("aria-pressed", "false");
    });

    it("stops showing Saving… once the write settles", async () => {
      const onChange = jest.fn().mockRejectedValue(new Error("nope"));
      render(<LadderHost onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: "Failed" }));
      await waitFor(() => expect(screen.queryByText("Saving…")).not.toBeInTheDocument());
    });
  });
});

/** A host that only ticks once the write resolves. */
function ObjectiveHost({
  onToggle,
  initial = false,
}: {
  onToggle: (completed: boolean) => Promise<unknown>;
  initial?: boolean;
}) {
  const [completed, setCompleted] = React.useState(initial);
  return (
    <ObjectiveCheckbox
      description="Find the secret door"
      completed={completed}
      onToggle={async (next) => {
        await onToggle(next);
        setCompleted(next);
      }}
    />
  );
}

describe("ObjectiveCheckbox", () => {
  it("is a real checkbox, named by the objective it belongs to", () => {
    // The box it replaces was a decorative div marked `aria-hidden`, so a
    // keyboard could not reach it and a screen reader never saw it.
    render(<ObjectiveHost onToggle={jest.fn().mockResolvedValue(undefined)} />);
    const box = screen.getByRole("checkbox", { name: "Find the secret door" });
    expect(box).toBeInTheDocument();
    expect(box).not.toHaveAttribute("aria-hidden");
  });

  it("is reachable and operable by keyboard", async () => {
    const onToggle = jest.fn().mockResolvedValue(undefined);
    render(<ObjectiveHost onToggle={onToggle} />);

    await userEvent.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("writes the new state, not a toggle of its own", async () => {
    const onToggle = jest.fn().mockResolvedValue(undefined);
    render(<ObjectiveHost onToggle={onToggle} initial />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("keeps its strike once ticked", async () => {
    render(<ObjectiveHost onToggle={jest.fn().mockResolvedValue(undefined)} initial />);
    expect(screen.getByText("Find the secret door")).toHaveClass("line-through");
  });

  describe("the save contract (§7)", () => {
    it("never ticks optimistically", async () => {
      let resolve!: () => void;
      const onToggle = jest.fn(() => new Promise<void>((r) => { resolve = r; }));
      render(<ObjectiveHost onToggle={onToggle} />);

      await userEvent.click(screen.getByRole("checkbox"));
      expect(screen.getByRole("checkbox")).not.toBeChecked();
      expect(screen.getByText("Saving…")).toBeInTheDocument();
      // The pending indicator must not join the checkbox's accessible name:
      // it sits beside the label, not inside it.
      expect(
        screen.getByRole("checkbox", { name: "Find the secret door" })
      ).toBeInTheDocument();

      resolve();
      await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
    });

    it("reverts visibly and says why when the write is refused", async () => {
      const onToggle = jest.fn().mockRejectedValue(new Error("Permission denied"));
      render(<ObjectiveHost onToggle={onToggle} />);

      await userEvent.click(screen.getByRole("checkbox"));

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Permission denied"));
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("shows the pending state on its own row only", async () => {
      let resolve!: () => void;
      const onToggle = jest.fn(() => new Promise<void>((r) => { resolve = r; }));
      render(
        <>
          <ObjectiveHost onToggle={onToggle} />
          <ObjectiveHost onToggle={jest.fn().mockResolvedValue(undefined)} />
        </>
      );

      await userEvent.click(screen.getAllByRole("checkbox")[0]);
      expect(screen.getAllByText("Saving…")).toHaveLength(1);

      resolve();
      await waitFor(() => expect(screen.queryByText("Saving…")).not.toBeInTheDocument());
    });
  });
});
