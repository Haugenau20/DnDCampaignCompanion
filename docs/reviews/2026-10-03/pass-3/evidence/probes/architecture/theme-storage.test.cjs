// Diagnostic assertions record the current defect. No Firebase or network access.
const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent, cleanup } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
const { ThemeProvider, useTheme } = require('/workspace/DnDCampaignCompanion/src/core/themes/ThemeContext.tsx');
const ErrorBoundary = require('/workspace/DnDCampaignCompanion/src/shared/components/ErrorBoundary.tsx').default;
const h = React.createElement;
function Consumer() {
  const {theme,setTheme} = useTheme();
  return h('button', {onClick:() => setTheme('dark')}, theme.name);
}
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute('style');
  jest.spyOn(console,'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test('control: normal storage applies selected theme to context and document', () => {
  render(h(ThemeProvider,null,h(Consumer)));
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button').textContent).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
});

test('denied getItem escapes the inner application boundary and prevents children rendering', () => {
  jest.spyOn(Storage.prototype,'getItem').mockImplementation(() => {
    throw new DOMException('Storage access denied', 'SecurityError');
  });
  // index.tsx mounts ThemeProvider above App; App is the owner of ErrorBoundary.
  expect(() => render(h(ThemeProvider,null,
    h(ErrorBoundary,{fallback:h('p',null,'boundary fallback')},h(Consumer))
  ))).toThrow('Storage access denied');
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText('boundary fallback')).toBeNull();
  console.log('ARCH storage denial: render throws SecurityError; child and fallback absent');
});

test('quota failure updates context but leaves the document on the previous theme', () => {
  render(h(ThemeProvider,null,h(Consumer)));
  expect(document.documentElement.dataset.theme).toBe('light');
  const originalCss = document.documentElement.style.cssText;
  jest.spyOn(Storage.prototype,'setItem').mockImplementation(() => {
    throw new DOMException('Storage quota exhausted', 'QuotaExceededError');
  });
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button').textContent).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(document.documentElement.style.cssText).toBe(originalCss);
  console.log('ARCH quota failure: context=dark, document=light, CSS token set unchanged');
});
