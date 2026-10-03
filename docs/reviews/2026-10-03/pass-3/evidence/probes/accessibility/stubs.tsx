import React from '/workspace/DnDCampaignCompanion/node_modules/react';

const results = Array.from({ length: 35 }, (_, index) => ({
  id: `person-${index}`, type: 'npc', title: `Synthetic person ${String(index).padStart(2, '0')}`,
  matches: ['A long synthetic description used to make the actual result row occupy its normal two lines.'],
  matchCount: 1, score: 1,
}));
export function useSearch() {
  const [query, setQuery] = React.useState('person');
  return { query, results, isSearching: false, isQueryTooShort: false, isIndexReady: true,
    onSearch: setQuery, onClearSearch: () => setQuery('') };
}
const Icon = () => <span aria-hidden="true">+</span>;
const createActions = ['npc', 'quest', 'location', 'rumor', 'chapter', 'note'].map(id => ({
  id, icon: Icon, entityLabel: id,
  run: () => { (window as any).__probe.created.push(id); },
}));
export const useCreateActions = () => createActions;
export const useCampaigns = () => ({ activeCampaign: { id: 'synthetic', name: 'Synthetic campaign' } });
export const useNavigation = () => ({
  navigateToPage: (path: string) => (window as any).__probe.navigated.push(path),
  createPath: (path: string) => path,
});
export const useQuickAdd = () => ({ openQuickAdd: (...args: any[]) => (window as any).__probe.quickAdd.push(args) });
export const useQuickAddCreate = () => async () => {
  (window as any).__probe.writes++;
  return 'synthetic-created';
};
