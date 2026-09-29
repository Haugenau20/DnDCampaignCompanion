// src/features/user-management/auth/components/__tests__/CodeInput.test.tsx
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeInput from '../CodeInput';
import { unnamedControlsIn } from '@/test-utils/accessible-names';

/** The boxes, holding their value in state as a form would. */
const Harness: React.FC<{
  initial?: string;
  onChange?: (value: string) => void;
  /** Clear a full code at once, as a refused code does. */
  refuse?: boolean;
}> = ({ initial = '', onChange, refuse = false }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <CodeInput
        label="Code from the link"
        value={value}
        onChange={(next) => {
          setValue(refuse && next.length === 6 ? '' : next);
          onChange?.(next);
        }}
      />
      <output data-testid="value">{value}</output>
    </>
  );
};

const boxes = () => screen.getAllByRole('textbox');
const value = () => screen.getByTestId('value').textContent;

describe('CodeInput', () => {
  test('draws six named boxes in a group named by its label', () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('group', { name: 'Code from the link' })).toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
    expect(boxes()[0]).toHaveAccessibleName('Digit 1 of 6');
    expect(unnamedControlsIn(container)).toEqual([]);
  });

  test('offers the phone\'s one-time-code autofill on the first box', () => {
    render(<Harness />);
    expect(boxes()[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(boxes()[0]).toHaveAttribute('inputmode', 'numeric');
  });

  test('moves on to the next box as each digit is typed', async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], '482');
    expect(value()).toBe('482');
    expect(boxes()[3]).toHaveFocus();
    expect(boxes().map((box) => (box as HTMLInputElement).value)).toEqual(['4', '8', '2', '', '', '']);
  });

  test('takes nothing but digits', async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], '4a-8');
    expect(value()).toBe('48');
  });

  test('never holds more than six digits', async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], '48291357');
    expect(value()).toHaveLength(6);
    expect(value()).toMatch(/^48291/);
  });

  // Paste, and the phone's autofill, put the whole code into one box.
  test('spreads a pasted code across the boxes', async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(boxes()[0]);
    await userEvent.paste('482 913');
    expect(value()).toBe('482913');
    expect(onChange).toHaveBeenLastCalledWith('482913');
  });

  test('Backspace in an empty box clears the one before it and moves back', async () => {
    render(<Harness />);
    await userEvent.type(boxes()[0], '482');
    await userEvent.keyboard('{Backspace}');
    expect(value()).toBe('48');
    expect(boxes()[2]).toHaveFocus();
    await userEvent.keyboard('{Backspace}');
    expect(value()).toBe('4');
    expect(boxes()[1]).toHaveFocus();
  });

  test('typing over a digit replaces it', async () => {
    render(<Harness initial="482913" />);
    await userEvent.click(boxes()[2]);
    await userEvent.keyboard('7');
    expect(value()).toBe('487913');
    expect(boxes()[3]).toHaveFocus();
  });

  test('arrow keys move between boxes', async () => {
    render(<Harness initial="482" />);
    await userEvent.click(boxes()[2]);
    await userEvent.keyboard('{ArrowLeft}');
    expect(boxes()[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    // Not past the first empty box.
    expect(boxes()[3]).toHaveFocus();
  });

  test('a box past the digits typed sends focus to the first empty one', async () => {
    render(<Harness initial="48" />);
    await userEvent.click(boxes()[5]);
    expect(boxes()[2]).toHaveFocus();
  });

  test('the caret follows the digits back when they are cleared from outside', async () => {
    render(<Harness refuse />);
    await userEvent.type(boxes()[0], '482913');
    expect(value()).toBe('');
    expect(boxes()[0]).toHaveFocus();
    await userEvent.keyboard('4');
    expect(value()).toBe('4');
  });
});
