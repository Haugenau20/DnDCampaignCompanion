const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/jest-dom');
const InlineEditor = require('/workspace/DnDCampaignCompanion/src/shared/components/inline-edit/InlineEditor').default;

test('current scalar editor cannot submit a correction that clears an optional field', () => {
  const onSubmit = jest.fn(async () => undefined);
  render(React.createElement(InlineEditor, { label: 'Title or role', initialValue: 'Former captain', submitLabel: 'Save title', onSubmit, onSaved: jest.fn() }));
  fireEvent.change(screen.getByLabelText('Title or role'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save title' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Save title' }));
  expect(onSubmit).not.toHaveBeenCalled();
});
