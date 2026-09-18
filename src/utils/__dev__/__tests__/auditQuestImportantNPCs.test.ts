// src/utils/__dev__/__tests__/auditQuestImportantNPCs.test.ts
//
// The pure half of the `importantNPCs` audit. The Firestore half is operator
// tooling run by hand against a real project and is not covered here -- but
// what it *concludes* is arithmetic, and arithmetic is testable.

import {
  buildAuditReport,
  isCovered,
  normalizeForComparison,
  resolveToNPC,
} from '../auditQuestImportantNPCs';

const NPCS = [
  { id: 'thorin', name: 'Thorin Oakenshield' },
  { id: 'gandalf', name: 'Gandalf the Grey' },
  { id: 'eonwe', name: 'Eönwë' },
];

describe('normalizeForComparison', () => {
  it('reduces an id and a name to the same key', () => {
    expect(normalizeForComparison('Thorin Oakenshield')).toBe('thorinoakenshield');
    expect(normalizeForComparison('thorin-oakenshield')).toBe('thorinoakenshield');
  });

  it('drops diacritics, which is the only difference between a name and its slug', () => {
    expect(normalizeForComparison('Eönwë')).toBe(normalizeForComparison('eonwe'));
  });
});

describe('isCovered', () => {
  const byId = new Map(NPCS.map((npc) => [npc.id, npc.name]));

  it('matches a name against the id it was slugified into', () => {
    expect(isCovered('Thorin Oakenshield', ['thorin-oakenshield'], new Map())).toBe(true);
  });

  it('matches a name against the name of an attached record', () => {
    // The quest says "Gandalf"; the record is "Gandalf the Grey".
    expect(isCovered('Gandalf', ['gandalf'], byId)).toBe(true);
  });

  it('does not match somebody who is simply not attached', () => {
    expect(isCovered('Tom Bombadil', ['thorin', 'gandalf'], byId)).toBe(false);
  });

  it('treats an empty entry as costing nothing', () => {
    expect(isCovered('   ', [], byId)).toBe(true);
  });
});

describe('resolveToNPC', () => {
  it('finds the record a free-text name refers to', () => {
    expect(resolveToNPC('Gandalf', NPCS)).toBe('gandalf');
  });

  it('returns null for somebody who was never entered as a record', () => {
    expect(resolveToNPC('Master of Lake-town', NPCS)).toBeNull();
  });
});

describe('buildAuditReport', () => {
  it('reports nothing lost when every name is already attached', () => {
    const report = buildAuditReport(
      [
        {
          path: 'groups/g/campaigns/c/quests/reclaim-erebor',
          title: 'Reclaim Erebor',
          importantNPCs: [{ name: 'Thorin Oakenshield' }, { name: 'Gandalf' }],
          relatedNPCIds: ['thorin', 'gandalf'],
        },
      ],
      NPCS
    );

    expect(report.namesTotal).toBe(2);
    expect(report.namesCovered).toBe(2);
    expect(report.namesMigratable).toBe(0);
    expect(report.namesUnresolvable).toBe(0);
  });

  it('separates a name that can be migrated from one with nowhere to go', () => {
    // The distinction the handoff's "migrate rather than drop" turns on:
    // a name matching an NPC record has an id to become, and one matching no
    // record is free text about somebody who was never entered.
    const report = buildAuditReport(
      [
        {
          path: 'groups/g/campaigns/c/quests/escape-from-mirkwood',
          title: 'Escape from Mirkwood',
          importantNPCs: [{ name: 'Gandalf' }, { name: 'Master of Lake-town' }],
          relatedNPCIds: [],
        },
      ],
      NPCS
    );

    expect(report.namesCovered).toBe(0);
    expect(report.namesMigratable).toBe(1);
    expect(report.namesUnresolvable).toBe(1);
    expect(report.findings[0].uncovered).toEqual([
      { name: 'Gandalf', npcId: 'gandalf' },
      { name: 'Master of Lake-town', npcId: null },
    ]);
  });

  it('ignores quests that never carried the field', () => {
    const report = buildAuditReport(
      [
        { path: 'quests/a', title: 'A', relatedNPCIds: ['thorin'] },
        { path: 'quests/b', title: 'B', importantNPCs: [] },
      ],
      NPCS
    );

    expect(report.questsScanned).toBe(2);
    expect(report.questsCarryingImportantNPCs).toBe(0);
    expect(report.findings).toEqual([]);
  });
});
