// src/core/components/__tests__/Roster.test.tsx
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterPills,
  RosterFilterSelect,
  RosterGroup,
  RosterRow,
  RosterField,
  type RosterSegment,
} from '../Roster';

jest.mock('../Typography', () => ({
  __esModule: true,
  default: ({ children, variant, className }: any) => {
    const Tag = variant === 'h3' ? 'h3' : variant === 'h4' ? 'h4' : 'span';
    return <Tag className={className}>{children}</Tag>;
  },
}));

const segments: RosterSegment[] = [
  { key: 'alive', label: 'alive', count: 15, colorClass: 'bg-status-completed' },
  { key: 'deceased', label: 'deceased', count: 4, colorClass: 'bg-status-failed' },
  { key: 'missing', label: 'missing', count: 0, colorClass: 'bg-status-unknown' },
];

describe('RosterStatusBar', () => {
  test('states the total and its label', () => {
    render(
      <RosterStatusBar
        total={19}
        totalLabel="met so far"
        segments={segments}
        activeKey="all"
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('met so far')).toBeInTheDocument();
  });

  test('pairs every band with a word, so colour is never the only cue', () => {
    render(
      <RosterStatusBar
        total={19}
        totalLabel="met so far"
        segments={segments}
        activeKey="all"
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '15 alive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 deceased' })).toBeInTheDocument();
  });

  test('keeps empty bands listed but dimmed', () => {
    render(
      <RosterStatusBar
        total={19}
        totalLabel="met so far"
        segments={segments}
        activeKey="all"
        onSelect={jest.fn()}
      />
    );
    const empty = screen.getByRole('button', { name: '0 missing' });
    expect(empty).toBeInTheDocument();
    expect(empty.className).toContain('opacity-50');
  });

  test('selects a band', () => {
    const onSelect = jest.fn();
    render(
      <RosterStatusBar
        total={19}
        totalLabel="met so far"
        segments={segments}
        activeKey="all"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '4 deceased' }));
    expect(onSelect).toHaveBeenCalledWith('deceased');
  });

  test('clicking the active band clears back to all', () => {
    const onSelect = jest.fn();
    render(
      <RosterStatusBar
        total={19}
        totalLabel="met so far"
        segments={segments}
        activeKey="alive"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '15 alive' }));
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  test('marks the active band as pressed', () => {
    render(
      <RosterStatusBar
        total={19}
        totalLabel="met so far"
        segments={segments}
        activeKey="alive"
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '15 alive' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '4 deceased' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('does not divide by zero on an empty roster', () => {
    expect(() =>
      render(
        <RosterStatusBar
          total={0}
          totalLabel="met so far"
          segments={[{ key: 'alive', label: 'alive', count: 0, colorClass: 'bg-x' }]}
          activeKey="all"
          onSelect={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});

describe('RosterFilterPills', () => {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'friendly', label: 'Friendly' },
  ];

  test('renders every option visibly rather than behind a select', () => {
    render(
      <RosterFilterPills
        options={options}
        value="all"
        onChange={jest.fn()}
        label="Filter by relationship"
      />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Friendly' })).toBeInTheDocument();
  });

  test('exposes the group with an accessible name', () => {
    render(
      <RosterFilterPills
        options={options}
        value="all"
        onChange={jest.fn()}
        label="Filter by relationship"
      />
    );
    expect(
      screen.getByRole('group', { name: 'Filter by relationship' })
    ).toBeInTheDocument();
  });

  test('reports the chosen value', () => {
    const onChange = jest.fn();
    render(
      <RosterFilterPills
        options={options}
        value="all"
        onChange={onChange}
        label="Filter by relationship"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Friendly' }));
    expect(onChange).toHaveBeenCalledWith('friendly');
  });

  test('the sm size is the same control, only more compact', () => {
    const onChange = jest.fn();
    render(
      <RosterFilterPills
        options={options}
        value="all"
        onChange={onChange}
        label="Filter activity by type"
        size="sm"
      />
    );

    // Same roles, same accessible names, same pressed semantics as the default
    // size — the dashboard's row differs in geometry, not in behaviour.
    const all = screen.getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(all.className).toContain('text-xs');

    fireEvent.click(screen.getByRole('button', { name: 'Friendly' }));
    expect(onChange).toHaveBeenCalledWith('friendly');
  });
});

describe('RosterFilterSelect', () => {
  const options = [
    { value: 'all', label: 'All Locations' },
    { value: 'Dungeon', label: 'Dungeon' },
    { value: 'Forest', label: 'Forest' },
  ];

  test('exposes its label as the accessible name, with no visible label text', () => {
    render(
      <RosterFilterSelect
        options={options}
        value="all"
        onChange={jest.fn()}
        label="Filter by location"
      />
    );
    expect(
      screen.getByRole('combobox', { name: 'Filter by location' })
    ).toBeInTheDocument();
    // The old markup carried a visible "Location:" label the pills never had.
    expect(screen.queryByText('Location:')).not.toBeInTheDocument();
  });

  test('offers every option, unlike pills which would need one control each', () => {
    render(
      <RosterFilterSelect
        options={options}
        value="all"
        onChange={jest.fn()}
        label="Filter by location"
      />
    );
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  test('reports the chosen value', () => {
    const onChange = jest.fn();
    render(
      <RosterFilterSelect
        options={options}
        value="all"
        onChange={onChange}
        label="Filter by location"
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Forest' } });
    expect(onChange).toHaveBeenCalledWith('Forest');
  });

  test('wears the pills\' active treatment once it is actually filtering', () => {
    const { rerender } = render(
      <RosterFilterSelect
        options={options}
        value="all"
        onChange={jest.fn()}
        label="Filter by location"
      />
    );
    // Idle on the "all" value, so a filter row reads as unfiltered at a glance.
    expect(screen.getByRole('combobox').className).not.toContain('bg-status-general');

    rerender(
      <RosterFilterSelect
        options={options}
        value="Forest"
        onChange={jest.fn()}
        label="Filter by location"
      />
    );
    expect(screen.getByRole('combobox').className).toContain('bg-status-general');
  });
});

describe('RosterFilterBar', () => {
  test('renders the search field with its placeholder and reports typing', () => {
    const onChange = jest.fn();
    render(
      <RosterFilterBar placeholder="Search quests..." value="" onChange={onChange} />
    );

    const search = screen.getByPlaceholderText('Search quests...');
    fireEvent.change(search, { target: { value: 'dragon' } });
    expect(onChange).toHaveBeenCalledWith('dragon');
  });

  test('renders filter controls beside the search field', () => {
    render(
      <RosterFilterBar placeholder="Search quests..." value="" onChange={jest.fn()}>
        <button type="button">Select Rumors</button>
      </RosterFilterBar>
    );
    expect(screen.getByRole('button', { name: 'Select Rumors' })).toBeInTheDocument();
  });

  test('is not wrapped in a card, so every directory\'s row sits flat on the page', () => {
    // Quests alone used to wrap this row in a Card, giving it a raised panel its
    // three siblings did not have. One component, one answer.
    const { container } = render(
      <RosterFilterBar placeholder="Search quests..." value="" onChange={jest.fn()} />
    );
    expect(container.querySelector('.card')).toBeNull();
  });
});

describe('RosterGroup', () => {
  test('renders the title as a heading, not a control', () => {
    render(
      <RosterGroup title="Neverwinter Wood" count={1}>
        <div>row</div>
      </RosterGroup>
    );
    // The group header used to be a heading wrapped in a ghost button.
    expect(
      screen.getByRole('heading', { name: 'Neverwinter Wood' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Neverwinter Wood' })
    ).not.toBeInTheDocument();
  });

  test('shows the entry count', () => {
    render(
      <RosterGroup title="Neverwinter Wood" count={3}>
        <div>row</div>
      </RosterGroup>
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('offers a separate labelled link when the group maps to a record', () => {
    const onOpen = jest.fn();
    render(
      <RosterGroup title="Neverwinter Wood" count={1} onOpen={onOpen}>
        <div>row</div>
      </RosterGroup>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open location' }));
    expect(onOpen).toHaveBeenCalled();
  });

  test('omits the link when there is nothing to open', () => {
    render(
      <RosterGroup title="Location unknown" count={2} muted>
        <div>row</div>
      </RosterGroup>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('RosterRow', () => {
  const renderRow = (props: Partial<React.ComponentProps<typeof RosterRow>> = {}) =>
    render(
      <RosterRow
        entityId="acar"
        entityName="Acar"
        gridClassName="grid-cols-2"
        toggleLabel="Acar"
        expandedContent={<div>detail</div>}
        {...props}
      >
        <span>Acar</span>
      </RosterRow>
    );

  test('is a real button, so the row is keyboard reachable', () => {
    renderRow();
    expect(
      screen.getByRole('button', { name: /Expand Acar/ }).tagName
    ).toBe('BUTTON');
  });

  test('reports collapsed state via aria-expanded', () => {
    renderRow();
    expect(screen.getByRole('button', { name: /Expand Acar/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  test('shows expanded content only when expanded', () => {
    const { rerender } = renderRow();
    expect(screen.queryByText('detail')).not.toBeInTheDocument();

    rerender(
      <RosterRow
        entityId="acar"
        entityName="Acar"
        gridClassName="grid-cols-2"
        toggleLabel="Acar"
        expanded
        expandedContent={<div>detail</div>}
      >
        <span>Acar</span>
      </RosterRow>
    );
    expect(screen.getByText('detail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Collapse Acar/ })).toBeInTheDocument();
  });

  test('calls onToggle when activated', () => {
    const onToggle = jest.fn();
    renderRow({ onToggle });
    fireEvent.click(screen.getByRole('button', { name: /Expand Acar/ }));
    expect(onToggle).toHaveBeenCalled();
  });

  test("applies the caller’s grid template to the element holding the cells", () => {
    // The template moved off the button when the row gained its identity mark:
    // the button is now a flex row of [mark, grid], so the columns the caller
    // sizes belong to the grid, not the button. Asserted on the element that
    // actually contains the cells, so it cannot pass on an empty grid.
    renderRow();
    const button = screen.getByRole('button', { name: /Expand Acar/ });
    const grid = button.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain('grid-cols-2');
    expect(grid!).toContainElement(screen.getByText('Acar'));
  });

  test('renders a leadingControl outside the expand button, not nested in it', () => {
    renderRow({
      leadingControl: <input type="checkbox" aria-label="Select Acar" />,
    });

    const checkbox = screen.getByRole('checkbox', { name: 'Select Acar' });
    const toggle = screen.getByRole('button', { name: /Expand Acar/ });

    expect(checkbox).toBeInTheDocument();
    // Interactive elements nested inside a <button> are invalid HTML and the inner
    // control's clicks get swallowed, so the slot must sit beside the button.
    expect(toggle).not.toContainElement(checkbox);
  });

  test('a leadingControl click does not toggle the row', () => {
    const onToggle = jest.fn();
    renderRow({
      onToggle,
      leadingControl: <input type="checkbox" aria-label="Select Acar" />,
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Acar' }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('renders no leading slot when none is given', () => {
    renderRow();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  test('omits the top border on the first row only', () => {
    const { container, unmount } = renderRow({ isFirst: true });
    expect(container.firstElementChild!.className).not.toContain('border-t');
    unmount();

    const { container: second } = renderRow({ isFirst: false });
    expect(second.firstElementChild!.className).toContain('border-t');
  });
});

describe('RosterField', () => {
  test('renders its value when there is one', () => {
    render(<RosterField label="Description"><span>A brewer</span></RosterField>);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('A brewer')).toBeInTheDocument();
  });

  test('says an empty field is empty rather than vanishing', () => {
    render(<RosterField label="Description" emptyText="Nothing written yet" />);
    // The shape of a record should stay legible even when mostly blank.
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
  });

  test('falls back to a default empty message', () => {
    render(<RosterField label="Race" />);
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
  });
});

describe('RosterGroup nesting', () => {
  // The panel is the element that actually holds the rows -- selected through a
  // child, because the group's count pill is also `bg-secondary` and matching on
  // the class alone finds that instead.
  const panelOf = (getByText: (t: string) => HTMLElement) =>
    getByText('row').parentElement as HTMLElement;

  test('a top-level group is a card', () => {
    const { getByText } = render(
      <RosterGroup title="Rivendell" count={2}>
        <div>row</div>
      </RosterGroup>
    );
    const panel = panelOf(getByText);
    expect(panel.className).toContain('card');
    expect(panel.className).not.toContain('bg-secondary');
  });

  test('a nested group is recessed, not a card of its own', () => {
    // A location's sub-locations are parts of one object. Boxing them as a
    // second card restates a containment the indentation already states.
    const { getByText } = render(
      <RosterGroup title="Locations in Moria" count={2} nested>
        <div>row</div>
      </RosterGroup>
    );
    const panel = panelOf(getByText);
    expect(panel.className).toContain('bg-secondary');
    expect(panel.className).toContain('card-border');
    expect(panel.className.split(/\s+/)).not.toContain('card');
  });
});

describe('RosterRow identity mark', () => {
  const renderRow = (
    props: Partial<React.ComponentProps<typeof RosterRow>> = {}
  ) =>
    render(
      <RosterRow
        entityId="acar"
        entityName="Acar"
        gridClassName="grid-cols-2"
        toggleLabel="Acar"
        {...props}
      >
        <span>Acar</span>
      </RosterRow>
    );

  test('renders exactly one mark per row', () => {
    renderRow();
    expect(screen.getAllByTestId('entity-sigil')).toHaveLength(1);
  });

  test('takes its letter from the name, not the id', () => {
    // The id is a slug and may carry a disambiguating suffix; the reader should
    // see the name's initial.
    renderRow({ entityId: 'kerowyn-hucrele-2', entityName: 'Kerowyn Hucrele' });
    expect(screen.getByTestId('entity-sigil')).toHaveTextContent('K');
  });

  test('the same entity keeps the same hue in a different roster', () => {
    // This is the whole point of deriving from the id: an NPC looks like itself
    // in the directory, in the activity feed, and anywhere else that adopts the
    // mark later.
    const { unmount } = renderRow({ entityId: 'thorin', entityName: 'Thorin' });
    const first = screen.getByTestId('entity-sigil').getAttribute('data-sigil-index');
    unmount();

    // Same id, different display name and a different surrounding row.
    renderRow({ entityId: 'thorin', entityName: 'Thorin Oakenshield', gridClassName: 'grid-cols-3' });
    expect(screen.getByTestId('entity-sigil')).toHaveAttribute('data-sigil-index', first);
  });

  test('two different entities can land on different hues', () => {
    // Not every pair will differ across an 8-bucket hash, so this asserts the
    // index is a function of the id at all rather than a constant.
    const seen = new Set<string | null>();
    ['acar', 'thorin', 'balin', 'dwalin', 'gloin', 'oin', 'bifur', 'bofur'].forEach(id => {
      const { unmount } = renderRow({ entityId: id, entityName: id });
      seen.add(screen.getByTestId('entity-sigil').getAttribute('data-sigil-index'));
      unmount();
    });
    expect(seen.size).toBeGreaterThan(1);
  });

  test('is hidden from assistive technology, because the name is right beside it', () => {
    renderRow();
    expect(screen.getByTestId('entity-sigil')).toHaveAttribute('aria-hidden', 'true');
  });

  test('a row without an id fails loudly rather than rendering a mark', () => {
    // A silent fallback would paint every id-less row the same hue, which reads
    // as a grouping that does not exist.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderRow({ entityId: '' })).toThrow(/entityId is required/);
    spy.mockRestore();
  });
});
