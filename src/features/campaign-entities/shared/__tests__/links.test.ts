// src/features/campaign-entities/shared/__tests__/links.test.ts
//
// T131: every link has one owner field, and both sides read it -- plus the
// old second half, until the migration has merged it into the owner.
import {
  locationIdsOfNpc,
  locationIdsOfRumor,
  npcIdsOfLocation,
  npcIdsOfNpc,
  npcIdsOfQuest,
  questIdsOfLocation,
  questIdsOfNpc,
  questNamesLocation,
  rumorIdsOfLocation,
  rumorIdsOfNpc,
} from '../links';

const npc = (id: string, extra: Record<string, unknown> = {}): any => ({
  id,
  name: id,
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
  ...extra,
});
const quest = (id: string, extra: Record<string, unknown> = {}): any => ({ id, title: id, ...extra });
const place = (id: string, extra: Record<string, unknown> = {}): any => ({ id, name: id, ...extra });
const rumor = (id: string, extra: Record<string, unknown> = {}): any => ({
  id,
  relatedNPCs: [],
  relatedLocations: [],
  ...extra,
});

describe('person ↔ quest, owned by the quest', () => {
  const frodo = npc('frodo', { connections: { relatedNPCs: [], affiliations: [], relatedQuests: ['old-quest'] } });
  const quests = [quest('ring', { relatedNPCIds: ['frodo'] }), quest('old-quest'), quest('other')];

  it('gives a person the quests that name them, and their old list', () => {
    expect(questIdsOfNpc(frodo, quests)).toEqual(['ring', 'old-quest']);
  });

  it('gives a quest its own list, and the people whose old list names it', () => {
    expect(npcIdsOfQuest(quests[1], [frodo])).toEqual(['frodo']);
    expect(npcIdsOfQuest(quests[0], [frodo])).toEqual(['frodo']);
  });

  it('names a link held on both halves once', () => {
    const both = npc('sam', { connections: { relatedNPCs: [], affiliations: [], relatedQuests: ['ring'] } });
    const ring = quest('ring', { relatedNPCIds: ['sam'] });
    expect(npcIdsOfQuest(ring, [both])).toEqual(['sam']);
    expect(questIdsOfNpc(both, [ring])).toEqual(['ring']);
  });
});

describe('person ↔ place, owned by the place', () => {
  const places = [place('bree', { connectedNPCs: ['strider'] }), place('rivendell', { connectedNPCs: ['strider'] })];

  it('lets a person be in several places', () => {
    expect(locationIdsOfNpc(npc('strider'), places)).toEqual(['bree', 'rivendell']);
  });

  it("counts a person's old single place too", () => {
    expect(locationIdsOfNpc(npc('butterbur', { locationId: 'bree' }), places)).toEqual(['bree']);
    expect(npcIdsOfLocation(places[0], [npc('strider'), npc('butterbur', { locationId: 'bree' })])).toEqual([
      'strider',
      'butterbur',
    ]);
  });
});

describe('place ↔ quest, owned by the quest', () => {
  const erebor = place('erebor', { name: 'Erebor', relatedQuests: ['old-quest'] });

  it("finds a quest by its location, by a place's stored id, or by a place's name", () => {
    expect(questNamesLocation(quest('a', { locationId: 'erebor' }), erebor)).toBe(true);
    expect(questNamesLocation(quest('b', { keyLocations: [{ name: 'x', locationId: 'erebor' }] }), erebor)).toBe(true);
    expect(questNamesLocation(quest('c', { keyLocations: [{ name: 'EREBOR' }] }), erebor)).toBe(true);
    expect(questNamesLocation(quest('d', { keyLocations: [{ name: 'Erebor', locationId: 'dale' }] }), erebor)).toBe(false);
  });

  it("gives a place the quests that name it, and its old list", () => {
    const quests = [quest('a', { locationId: 'erebor' }), quest('old-quest'), quest('z')];
    expect(questIdsOfLocation(erebor, quests)).toEqual(['a', 'old-quest']);
  });
});

describe('rumour → place', () => {
  it('reads where it was heard and what it concerns together', () => {
    expect(locationIdsOfRumor(rumor('r', { locationId: 'bree', relatedLocations: ['bree', 'weathertop'] }))).toEqual([
      'bree',
      'weathertop',
    ]);
    const rumors = [rumor('heard', { locationId: 'bree' }), rumor('about', { relatedLocations: ['bree'] }), rumor('no')];
    expect(rumorIdsOfLocation(place('bree'), rumors)).toEqual(['heard', 'about']);
  });
});

describe('person ↔ person, stored once and shown both ways', () => {
  const aragorn = npc('aragorn', { connections: { relatedNPCs: ['arwen'], affiliations: [], relatedQuests: [] } });
  const arwen = npc('arwen');

  it('shows the link on the page of the person who does not hold it', () => {
    expect(npcIdsOfNpc(arwen, [aragorn, arwen])).toEqual(['aragorn']);
    expect(npcIdsOfNpc(aragorn, [aragorn, arwen])).toEqual(['arwen']);
  });

  it('never links a person to themselves', () => {
    const odd = npc('gollum', { connections: { relatedNPCs: ['gollum'], affiliations: [], relatedQuests: [] } });
    expect(npcIdsOfNpc(odd, [odd])).toEqual([]);
  });
});

describe('rumour → person', () => {
  it('gives a person the rumours that name them', () => {
    expect(rumorIdsOfNpc(npc('frodo'), [rumor('a', { relatedNPCs: ['frodo'] }), rumor('b')])).toEqual(['a']);
  });
});
