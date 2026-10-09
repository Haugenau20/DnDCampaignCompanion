// src/features/campaign-entities/shared/__tests__/linkActions.test.ts
//
// T131: a link added or removed from either page lands in its owner, and
// removing one clears the old second half too.
import { createLinkActions, LinkDeps } from '../linkActions';
import { resolveRecordChange } from '@/test-utils/update-after-reading';

type Store = Record<string, any>;

/** Actions over an in-memory campaign, recording every write as resolved fields. */
function setup(records: { npcs?: any[]; quests?: any[]; locations?: any[]; rumors?: any[] }) {
  const npcs = records.npcs ?? [];
  const quests = records.quests ?? [];
  const locations = records.locations ?? [];
  const rumors = records.rumors ?? [];
  const writes: Array<[string, string, any]> = [];
  const writer = (kind: string, list: any[]) => async (id: string, change: any) => {
    const current: Store = list.find((record) => record.id === id) ?? { id };
    writes.push([kind, id, resolveRecordChange(change, current)]);
  };
  const deps: LinkDeps = {
    npcs,
    quests,
    locations,
    updateNPC: writer('npc', npcs),
    updateQuest: writer('quest', quests),
    updateLocation: writer('location', locations),
    updateRumor: writer('rumor', rumors),
  };
  return { ...createLinkActions(deps), writes };
}

const npc = (id: string, connections: Partial<Record<string, string[]>> = {}, extra = {}) => ({
  id,
  name: id,
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [], ...connections },
  ...extra,
});

describe('person ↔ quest', () => {
  it('writes the quest, whichever end it starts from', async () => {
    for (const [a, b] of [
      [{ kind: 'npc', id: 'frodo' }, { kind: 'quest', id: 'ring' }],
      [{ kind: 'quest', id: 'ring' }, { kind: 'npc', id: 'frodo' }],
    ] as const) {
      const { link, writes } = setup({ npcs: [npc('frodo')], quests: [{ id: 'ring', relatedNPCIds: ['sam'] }] });
      await link(a, b);
      expect(writes).toEqual([['quest', 'ring', { relatedNPCIds: ['sam', 'frodo'] }]]);
    }
  });

  it("removes it from the quest, and from the person's old list where it is", async () => {
    const { unlink, writes } = setup({
      npcs: [npc('frodo', { relatedQuests: ['ring', 'other'] })],
      quests: [{ id: 'ring', relatedNPCIds: ['frodo'] }],
    });
    await unlink({ kind: 'npc', id: 'frodo' }, { kind: 'quest', id: 'ring' });
    expect(writes).toEqual([
      ['quest', 'ring', { relatedNPCIds: [] }],
      ['npc', 'frodo', { connections: { relatedNPCs: [], affiliations: [], relatedQuests: ['other'] } }],
    ]);
  });
});

describe('person ↔ place', () => {
  it('adds the person to the place, replacing nothing', async () => {
    const { link, writes } = setup({ npcs: [npc('strider', {}, { locationId: 'bree' })], locations: [{ id: 'rivendell' }] });
    await link({ kind: 'npc', id: 'strider' }, { kind: 'location', id: 'rivendell' });
    expect(writes).toEqual([['location', 'rivendell', { connectedNPCs: ['strider'] }]]);
  });

  it("clears only the person's old single place when that is all that holds it", async () => {
    const { unlink, writes } = setup({
      npcs: [npc('butterbur', {}, { locationId: 'bree', location: 'Bree' })],
      locations: [{ id: 'bree', connectedNPCs: [] }],
    });
    await unlink({ kind: 'location', id: 'bree' }, { kind: 'npc', id: 'butterbur' });
    expect(writes).toEqual([['npc', 'butterbur', { locationId: '', location: '' }]]);
  });

  it('removes the person from the place that lists them', async () => {
    const { unlink, writes } = setup({ npcs: [npc('strider')], locations: [{ id: 'bree', connectedNPCs: ['strider', 'nob'] }] });
    await unlink({ kind: 'npc', id: 'strider' }, { kind: 'location', id: 'bree' });
    expect(writes).toEqual([['location', 'bree', { connectedNPCs: ['nob'] }]]);
  });
});

describe('place ↔ quest', () => {
  const erebor = { id: 'erebor', name: 'Erebor', relatedQuests: [] as string[] };

  it("makes the place the quest's own location when it has none", async () => {
    const { link, writes } = setup({ locations: [erebor], quests: [{ id: 'q' }] });
    await link({ kind: 'location', id: 'erebor' }, { kind: 'quest', id: 'q' });
    expect(writes).toEqual([['quest', 'q', { locationId: 'erebor', location: 'Erebor' }]]);
  });

  it('adds it as one of the places of a quest that has a location', async () => {
    const { link, writes } = setup({ locations: [erebor], quests: [{ id: 'q', locationId: 'dale' }] });
    await link({ kind: 'quest', id: 'q' }, { kind: 'location', id: 'erebor' });
    expect(writes).toEqual([
      ['quest', 'q', { keyLocations: [{ name: 'Erebor', description: '', locationId: 'erebor' }] }],
    ]);
  });

  it('removes every way the quest names the place, and the old half', async () => {
    const { unlink, writes } = setup({
      locations: [{ ...erebor, relatedQuests: ['q'] }],
      quests: [{ id: 'q', locationId: 'erebor', keyLocations: [{ name: 'erebor' }, { name: 'Dale', description: 'x' }] }],
    });
    await unlink({ kind: 'quest', id: 'q' }, { kind: 'location', id: 'erebor' });
    expect(writes).toEqual([
      ['quest', 'q', { locationId: '', location: '', keyLocations: [{ name: 'Dale', description: 'x' }] }],
      ['location', 'erebor', { relatedQuests: [] }],
    ]);
  });
});

describe('rumour links', () => {
  it('writes the rumour for a place and for a person', async () => {
    const { link, writes } = setup({ rumors: [{ id: 'r', relatedNPCs: [], relatedLocations: [] }] });
    await link({ kind: 'location', id: 'bree' }, { kind: 'rumor', id: 'r' });
    await link({ kind: 'rumor', id: 'r' }, { kind: 'npc', id: 'frodo' });
    expect(writes).toEqual([
      ['rumor', 'r', { relatedLocations: ['bree'] }],
      ['rumor', 'r', { relatedNPCs: ['frodo'] }],
    ]);
  });

  it('clears where it was heard too, when that is the place unlinked', async () => {
    const { unlink, writes } = setup({ rumors: [{ id: 'r', locationId: 'bree', relatedLocations: ['bree'] }] });
    await unlink({ kind: 'rumor', id: 'r' }, { kind: 'location', id: 'bree' });
    expect(writes).toEqual([['rumor', 'r', { relatedLocations: [], locationId: '', location: '' }]]);
  });
});

describe('person ↔ person', () => {
  it('stores the link once: nothing when the other already holds it', async () => {
    const { link, writes } = setup({ npcs: [npc('arwen'), npc('aragorn', { relatedNPCs: ['arwen'] })] });
    await link({ kind: 'npc', id: 'arwen' }, { kind: 'npc', id: 'aragorn' });
    expect(writes).toEqual([]);
  });

  it('otherwise on the person whose page added it', async () => {
    const { link, writes } = setup({ npcs: [npc('arwen'), npc('aragorn')] });
    await link({ kind: 'npc', id: 'arwen' }, { kind: 'npc', id: 'aragorn' });
    expect(writes).toEqual([['npc', 'arwen', { connections: { relatedNPCs: ['aragorn'], affiliations: [], relatedQuests: [] } }]]);
  });

  it('removes it from whichever side holds it, from either page', async () => {
    const { unlink, writes } = setup({ npcs: [npc('arwen'), npc('aragorn', { relatedNPCs: ['arwen', 'legolas'] })] });
    await unlink({ kind: 'npc', id: 'arwen' }, { kind: 'npc', id: 'aragorn' });
    expect(writes).toEqual([
      ['npc', 'aragorn', { connections: { relatedNPCs: ['legolas'], affiliations: [], relatedQuests: [] } }],
    ]);
  });
});

it('refuses a pair that cannot be linked', async () => {
  const { link } = setup({});
  await expect(link({ kind: 'quest', id: 'a' }, { kind: 'quest', id: 'b' })).rejects.toThrow(/cannot be linked/);
});
