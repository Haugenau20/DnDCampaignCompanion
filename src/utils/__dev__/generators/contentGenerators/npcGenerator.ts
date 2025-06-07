// src/utils/__dev__/generators/contentGenerators/npcGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from '../userGenerator';
import { NPC } from '../../../../types/npc';

// NPC types
type NPCStatus = 'alive' | 'deceased' | 'missing' | 'unknown';
type NPCRelationship = 'friendly' | 'neutral' | 'hostile' | 'unknown';

// Create NPCs for a specific campaign
export const createNPCs = async (
  db: any,
  groupId: string,
  campaignId: string,
  userMapping: UserMapping,
  formattedDate: string
) => {
  const dmUid = userMapping['dm'];
  
  // Define NPCs based on the campaign
  const npcsData: NPC[] = [];
  
  if (campaignId === 'campaign1-1') {
    // LOTR Campaign NPCs
    npcsData.push(...getLOTRNPCs(dmUid, formattedDate));
  } else if (campaignId === 'campaign1-2') {
    // The Hobbit Campaign NPCs
    npcsData.push(...getHobbitNPCs(dmUid, formattedDate));
  } else if (campaignId === 'campaign2-1') {
    // Silmarillion Campaign NPCs
    npcsData.push(...getSilmarillionNPCs(dmUid, formattedDate));
  } else if (campaignId === 'campaign2-2') {
    // Tales of the Dúnedain Campaign NPCs
    npcsData.push(...getDunedainNPCs(dmUid, formattedDate));
  }
  
  // Create the NPCs in Firestore
  for (const npc of npcsData) {
    await setDoc(doc(db, 'groups', groupId, 'campaigns', campaignId, 'npcs', npc.id), npc);
    console.log(`Created NPC for ${campaignId}: ${npc.name}`);
  }
  
  return npcsData;
};

// Helper function to get NPCs for The Lord of the Rings campaign
const getLOTRNPCs = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'frodo',
      name: 'Frodo Baggins',
      title: 'Ring-bearer',
      status: 'alive' as NPCStatus,
      race: 'Hobbit',
      occupation: 'Adventurer',
      location: 'the-shire',
      relationship: 'friendly' as NPCRelationship,
      description: 'A hobbit from the Shire chosen to bear the One Ring on the journey to Mount Doom.',
      appearance: 'Small stature with curly brown hair and bright eyes.',
      personality: 'Courageous, determined, and resilient despite his gentle nature.',
      background: 'Nephew and adopted heir of Bilbo Baggins, who found the One Ring.',
      connections: {
        relatedNPCs: ['bilbo', 'gandalf', 'gollum'],
        affiliations: ['The Fellowship of the Ring'],
        relatedQuests: ['the-one-ring', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'Bearer of the One Ring and central character of the quest.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'bilbo',
      name: 'Bilbo Baggins',
      title: 'Former Ring-bearer',
      status: 'alive' as NPCStatus,
      race: 'Hobbit',
      occupation: 'Retired Adventurer',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'An elderly hobbit who found the One Ring and kept it for many years before passing it to Frodo.',
      appearance: 'Elderly hobbit with white hair, showing signs of unnaturally slow aging.',
      personality: 'Whimsical, adventurous, but increasingly possessive of the Ring before giving it up.',
      background: 'Former adventurer who journeyed to the Lonely Mountain with dwarves.',
      connections: {
        relatedNPCs: ['frodo', 'gandalf'],
        affiliations: ['The Shire', 'Rivendell'],
        relatedQuests: ['the-one-ring']
      },
      notes: [
        { date: formattedDate, text: 'Found the One Ring in Gollum\'s cave during his adventure with the dwarves.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'elrond',
      name: 'Elrond',
      title: 'Lord of Rivendell',
      status: 'alive' as NPCStatus,
      race: 'Half-elven',
      occupation: 'Ruler, Healer, Loremaster',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'Ancient half-elven lord of Rivendell and keeper of one of the three elven rings.',
      appearance: 'Tall with long dark hair, ageless face, and eyes that reflect his ancient wisdom.',
      personality: 'Wise, serious, and deeply concerned about the fate of Middle-earth.',
      background: 'Son of Eärendil, brother of Elros (first king of Númenor), fought in the Last Alliance against Sauron.',
      connections: {
        relatedNPCs: ['gandalf'],
        affiliations: ['Rivendell', 'White Council'],
        relatedQuests: ['council-of-elrond']
      },
      notes: [
        { date: formattedDate, text: 'Hosted the Council that decided the fate of the One Ring.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gandalf',
      name: 'Gandalf',
      title: 'The Grey (later The White)',
      status: 'alive' as NPCStatus,
      race: 'Maia (Wizard)',
      occupation: 'Wizard, Advisor',
      location: 'mines-of-moria',
      relationship: 'friendly' as NPCRelationship,
      description: 'A wise and powerful wizard sent to Middle-earth to oppose Sauron.',
      appearance: 'Elderly man with long grey beard and hair, penetrating eyes, and a tall pointed hat.',
      personality: 'Wise, occasionally short-tempered, but kind-hearted and deeply caring.',
      background: 'One of the five wizards sent to Middle-earth, secretly a Maia spirit.',
      connections: {
        relatedNPCs: ['frodo', 'bilbo', 'elrond', 'saruman', 'balrog'],
        affiliations: ['The Fellowship of the Ring', 'White Council'],
        relatedQuests: ['the-one-ring', 'council-of-elrond', 'escape-from-moria']
      },
      notes: [
        { date: formattedDate, text: 'Fell in battle with the Balrog but will return transformed.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'aragorn',
      name: 'Aragorn',
      title: 'Heir to the Throne of Gondor',
      status: 'alive' as NPCStatus,
      race: 'Human (Dúnedain)',
      occupation: 'Ranger, Leader',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'The heir of Isildur and rightful king of Gondor, who has lived in exile as a Ranger of the North.',
      appearance: 'Tall, dark-haired man with grey eyes, weather-worn clothes, and noble bearing.',
      personality: 'Wise, valiant, and determined, with a deep sense of duty to his lineage and people.',
      background: 'Raised in Rivendell as Estel, his true identity was concealed for his safety until he came of age.',
      connections: {
        relatedNPCs: ['elrond', 'gandalf', 'arwen'],
        affiliations: ['The Fellowship of the Ring', 'Rangers of the North', 'Gondor'],
        relatedQuests: ['council-of-elrond', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'Carries the shards of Narsil, the sword that cut the Ring from Sauron\'s hand.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gimli',
      name: 'Gimli',
      title: 'Son of Glóin',
      status: 'alive' as NPCStatus,
      race: 'Dwarf',
      occupation: 'Warrior',
      location: 'mines-of-moria',
      relationship: 'friendly' as NPCRelationship,
      description: 'A brave dwarf warrior and member of the Fellowship of the Ring.',
      appearance: 'Stout with a long red beard, carrying a battle axe and wearing dwarf mail.',
      personality: 'Proud, loyal, stubborn, with a hearty laugh and fierce courage.',
      background: 'Son of Glóin, one of Bilbo\'s companions on the journey to Erebor.',
      connections: {
        relatedNPCs: ['legolas', 'aragorn'],
        affiliations: ['The Fellowship of the Ring', 'Erebor'],
        relatedQuests: ['council-of-elrond', 'escape-from-moria']
      },
      notes: [
        { date: formattedDate, text: 'Became a close friend of Legolas, breaking the traditional enmity between dwarves and elves.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'saruman',
      name: 'Saruman',
      title: 'The White',
      status: 'alive' as NPCStatus,
      race: 'Maia (Wizard)',
      occupation: 'Wizard, Betrayer',
      location: 'isengard',
      relationship: 'hostile' as NPCRelationship,
      description: 'Once the head of the White Council, now corrupted and allied with Sauron.',
      appearance: 'Tall, elderly man with white hair and beard, wearing white robes.',
      personality: 'Proud, manipulative, power-hungry, with a persuasive voice.',
      background: 'Leader of the wizards who fell to corruption through his studies of the enemy.',
      connections: {
        relatedNPCs: ['gandalf', 'sauron'],
        affiliations: ['Isengard', 'Former White Council'],
        relatedQuests: ['defeat-saruman']
      },
      notes: [
        { date: formattedDate, text: 'Building an army of Uruk-hai to serve his and Sauron\'s purposes.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'balrog',
      name: 'Balrog of Morgoth',
      title: 'Durin\'s Bane',
      status: 'alive' as NPCStatus,
      race: 'Balrog (Demon)',
      occupation: 'Ancient Evil',
      location: 'mines-of-moria',
      relationship: 'hostile' as NPCRelationship,
      description: 'An ancient demon of shadow and flame awakened by the dwarves of Moria.',
      appearance: 'Massive creature of shadow and flame with burning eyes and a fiery whip.',
      personality: 'Malevolent, destructive, and filled with ancient hatred.',
      background: 'A servant of Morgoth from the First Age who hid in the depths of the earth after his master\'s defeat.',
      connections: {
        relatedNPCs: ['gandalf'],
        affiliations: ['Servants of Morgoth'],
        relatedQuests: ['escape-from-moria']
      },
      notes: [
        { date: formattedDate, text: 'Fought Gandalf on the Bridge of Khazad-dûm, causing both to fall into the abyss.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'sauron',
      name: 'Sauron',
      title: 'The Dark Lord',
      status: 'alive' as NPCStatus,
      race: 'Maia',
      occupation: 'Dark Lord',
      location: 'mordor',
      relationship: 'hostile' as NPCRelationship,
      description: 'The creator of the One Ring and the primary antagonist seeking to dominate Middle-earth.',
      appearance: 'Currently exists as a lidless eye wreathed in flame atop Barad-dûr.',
      personality: 'Domineering, manipulative, patient, and utterly evil.',
      background: 'Once a servant of Morgoth, rose to power in the Second Age and created the Rings of Power.',
      connections: {
        relatedNPCs: ['saruman', 'gollum'],
        affiliations: ['Mordor', 'Forces of Darkness'],
        relatedQuests: ['the-one-ring', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'His power and fate are bound to the One Ring.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gollum',
      name: 'Gollum/Sméagol',
      title: 'Former Ring-bearer',
      status: 'alive' as NPCStatus,
      race: 'Hobbit (Corrupted)',
      occupation: 'Ring-seeker',
      location: 'mordor',
      relationship: 'neutral' as NPCRelationship,
      description: 'A pitiful creature corrupted by the One Ring, which he possessed for centuries.',
      appearance: 'Emaciated, pale, with large luminous eyes and little hair.',
      personality: 'Split personality—Gollum is malicious and obsessed, while Sméagol shows glimpses of his former self.',
      background: 'Once a Stoor hobbit named Sméagol who found the Ring and was corrupted by it over centuries.',
      connections: {
        relatedNPCs: ['frodo', 'sauron'],
        affiliations: ['None'],
        relatedQuests: ['the-one-ring', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'Follows the Ring-bearer out of obsession with "his precious."' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'legolas',
      name: 'Legolas',
      title: 'Prince of the Woodland Realm',
      status: 'alive' as NPCStatus,
      race: 'Elf (Sindar)',
      occupation: 'Warrior, Archer',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'An elven prince from Mirkwood and member of the Fellowship of the Ring.',
      appearance: 'Tall, fair-haired elf with keen eyesight, carrying a bow and long knives.',
      personality: 'Light-hearted yet deadly in battle, curious about the world outside his forest home.',
      background: 'Son of King Thranduil of the Woodland Realm, sent to Rivendell to deliver news of Gollum\'s escape.',
      connections: {
        relatedNPCs: ['gimli', 'aragorn'],
        affiliations: ['The Fellowship of the Ring', 'Woodland Realm'],
        relatedQuests: ['council-of-elrond', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'Forms an unlikely friendship with Gimli the dwarf, breaking centuries of mistrust between their peoples.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'arwen',
      name: 'Arwen Undómiel',
      title: 'Evenstar of Her People',
      status: 'alive' as NPCStatus,
      race: 'Elf (Half-elven)',
      occupation: 'Princess of Rivendell',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'Daughter of Elrond and love of Aragorn, who chose mortality to be with him.',
      appearance: 'Beautiful with long dark hair and grey eyes, bearing the Evenstar pendant.',
      personality: 'Gentle yet determined, willing to sacrifice immortality for love.',
      background: 'Granddaughter of Galadriel, she has the choice of elven immortality or mortal life.',
      connections: {
        relatedNPCs: ['elrond', 'aragorn', 'galadriel'],
        affiliations: ['Rivendell'],
        relatedQuests: []
      },
      notes: [
        { date: formattedDate, text: 'Gave the Evenstar pendant to Aragorn as a token of her love and faith.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'samwise',
      name: 'Samwise Gamgee',
      title: 'Loyal Gardener',
      status: 'alive' as NPCStatus,
      race: 'Hobbit',
      occupation: 'Gardener, Companion',
      location: 'the-shire',
      relationship: 'friendly' as NPCRelationship,
      description: 'Frodo\'s loyal gardener and companion on the quest to destroy the Ring.',
      appearance: 'Stocky hobbit with sandy hair and a plain, honest face.',
      personality: 'Loyal, brave, practical, and with an unwavering sense of duty to Frodo.',
      background: 'Son of the Gaffer, a gardener for the Baggins family in Hobbiton.',
      connections: {
        relatedNPCs: ['frodo', 'gollum'],
        affiliations: ['The Fellowship of the Ring'],
        relatedQuests: ['the-one-ring', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'His loyalty to Frodo never wavers, even in the darkest moments.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'galadriel',
      name: 'Galadriel',
      title: 'Lady of Lórien',
      status: 'alive' as NPCStatus,
      race: 'Elf (Noldor)',
      occupation: 'Ruler, Bearer of Nenya',
      location: 'lothlorien',
      relationship: 'friendly' as NPCRelationship,
      description: 'Ancient and powerful elven ruler who bears one of the Three Rings.',
      appearance: 'Tall with long golden hair, described as beautiful and terrible as the morning and the night.',
      personality: 'Wise, perceptive, testing, and tempted by the One Ring but strong enough to reject it.',
      background: 'One of the eldest elves in Middle-earth, she came from Valinor in the First Age.',
      connections: {
        relatedNPCs: ['elrond', 'celeborn'],
        affiliations: ['Lothlórien', 'White Council'],
        relatedQuests: ['destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'Possesses the Mirror of Galadriel, which shows things that were, things that are, and things that yet may be.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'boromir',
      name: 'Boromir',
      title: 'Captain of the White Tower',
      status: 'alive' as NPCStatus,
      race: 'Human',
      occupation: 'Warrior, Captain of Gondor',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'The eldest son of the Steward of Gondor and a member of the Fellowship of the Ring.',
      appearance: 'Tall, noble man with dark hair and the proud bearing of Gondor.',
      personality: 'Proud, valiant, protective of his people, but susceptible to the Ring\'s influence.',
      background: 'Traveled to Rivendell seeking an answer to a prophetic dream about the One Ring and Isildur\'s Bane.',
      connections: {
        relatedNPCs: ['aragorn', 'frodo'],
        affiliations: ['The Fellowship of the Ring', 'Gondor'],
        relatedQuests: ['council-of-elrond', 'destroy-the-ring']
      },
      notes: [
        { date: formattedDate, text: 'Increasingly tempted by the Ring, seeing it as a weapon that could save his people.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'theoden',
      name: 'Théoden',
      title: 'King of Rohan',
      status: 'alive' as NPCStatus,
      race: 'Human',
      occupation: 'King',
      location: 'edoras',
      relationship: 'friendly' as NPCRelationship,
      description: 'The aging King of Rohan who falls under Saruman\'s influence but is later freed.',
      appearance: 'Elderly but still strong, with a proud bearing when not under Saruman\'s spell.',
      personality: 'Once valiant and strong, now weakened by age and Saruman\'s manipulation, but with an inner strength that resurfaces.',
      background: 'Seventeenth King of Rohan, father to Théodred and uncle to Éomer and Éowyn.',
      connections: {
        relatedNPCs: ['gandalf', 'eomer', 'eowyn'],
        affiliations: ['Rohan'],
        relatedQuests: ['defeat-saruman']
      },
      notes: [
        { date: formattedDate, text: 'His mind is poisoned by his advisor Gríma Wormtongue, who serves Saruman.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};

// Helper function to get NPCs for The Hobbit campaign
const getHobbitNPCs = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'bilbo',
      name: 'Bilbo Baggins',
      title: 'Burglar',
      status: 'alive' as NPCStatus,
      race: 'Hobbit',
      occupation: 'Adventurer',
      location: 'bag-end',
      relationship: 'friendly' as NPCRelationship,
      description: 'A respectable hobbit who is swept into an adventure by Gandalf and a company of dwarves.',
      appearance: 'Short with curly hair and a growing waistline.',
      personality: 'Initially reluctant but grows more adventurous and brave.',
      background: 'A well-to-do hobbit from Bag End in the Shire.',
      connections: {
        relatedNPCs: ['gandalf', 'thorin'],
        affiliations: ['Thorin\'s Company'],
        relatedQuests: ['reclaim-erebor']
      },
      notes: [
        { date: formattedDate, text: 'Finds the One Ring in Gollum\'s cave.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gandalf',
      name: 'Gandalf the Grey',
      title: 'The Grey Wanderer',
      status: 'alive' as NPCStatus,
      race: 'Maia (Wizard)',
      occupation: 'Wizard',
      location: 'bag-end',
      relationship: 'friendly' as NPCRelationship,
      description: 'A mysterious wizard who arranges Bilbo\'s adventure with the dwarves.',
      appearance: 'Tall with a gray beard, pointed hat, and staff.',
      personality: 'Wise, mischievous, and occasionally stern.',
      background: 'One of the five wizards sent to Middle-earth to oppose Sauron.',
      connections: {
        relatedNPCs: ['bilbo', 'thorin', 'radagast'],
        affiliations: ['White Council'],
        relatedQuests: ['unexpected-journey', 'reclaim-erebor']
      },
      notes: [
        { date: formattedDate, text: 'Provides Thorin with the map and key to the secret door of Erebor.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'thorin',
      name: 'Thorin Oakenshield',
      title: 'King Under the Mountain',
      status: 'alive' as NPCStatus,
      race: 'Dwarf',
      occupation: 'Exiled King',
      location: 'bag-end',
      relationship: 'friendly' as NPCRelationship,
      description: 'Leader of the company seeking to reclaim Erebor from the dragon Smaug.',
      appearance: 'Noble dwarf with a long beard and intense eyes.',
      personality: 'Proud, determined, and sometimes stubborn.',
      background: 'Grandson of Thrór, the last King Under the Mountain before Smaug came.',
      connections: {
        relatedNPCs: ['bilbo', 'gandalf', 'balin'],
        affiliations: ['Thorin\'s Company', 'Erebor'],
        relatedQuests: ['reclaim-erebor', 'slay-the-dragon']
      },
      notes: [
        { date: formattedDate, text: 'Named "Oakenshield" after using an oak branch as a shield in battle against orcs.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'smaug',
      name: 'Smaug',
      title: 'The Terrible',
      status: 'alive' as NPCStatus,
      race: 'Dragon',
      occupation: 'Usurper of Erebor',
      location: 'erebor',
      relationship: 'hostile' as NPCRelationship,
      description: 'A fire-drake from the north who seized the Lonely Mountain and its treasure.',
      appearance: 'Enormous red-gold dragon with armored scales and glowing eyes.',
      personality: 'Greedy, cunning, vain, and ruthless.',
      background: 'Drawn to the wealth of Erebor, drove out the dwarves and established his hoard.',
      connections: {
        relatedNPCs: ['thorin', 'bilbo'],
        affiliations: ['None'],
        relatedQuests: ['reclaim-erebor', 'slay-the-dragon']
      },
      notes: [
        { date: formattedDate, text: 'Has a single vulnerability - a bare patch on his left breast where a scale is missing.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gollum',
      name: 'Gollum',
      title: 'Ring-keeper',
      status: 'alive' as NPCStatus,
      race: 'Hobbit (corrupted)',
      occupation: 'Cave-dweller',
      location: 'misty-mountains',
      relationship: 'hostile' as NPCRelationship,
      description: 'A wretched creature who lives in the depths of the Misty Mountains.',
      appearance: 'Pale, emaciated, with large eyes and few teeth.',
      personality: 'Duplicitous, obsessive, and dependent on the Ring.',
      background: 'Once a hobbit named Sméagol who found the Ring and was corrupted by it.',
      connections: {
        relatedNPCs: ['bilbo'],
        affiliations: ['None'],
        relatedQuests: ['riddles-in-the-dark']
      },
      notes: [
        { date: formattedDate, text: 'Refers to himself as "precious" and speaks with a distinctive hissing voice.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'balin',
      name: 'Balin',
      title: 'Son of Fundin',
      status: 'alive' as NPCStatus,
      race: 'Dwarf',
      occupation: 'Warrior',
      location: 'bag-end',
      relationship: 'friendly' as NPCRelationship,
      description: 'A senior member of Thorin\'s company, known for his wisdom.',
      appearance: 'White-bearded dwarf with a red hood.',
      personality: 'Kind, thoughtful, and one of the more diplomatic dwarves.',
      background: 'A respected dwarf who has known Thorin for many years.',
      connections: {
        relatedNPCs: ['thorin', 'dwalin'],
        affiliations: ['Thorin\'s Company', 'Erebor'],
        relatedQuests: ['reclaim-erebor']
      },
      notes: [
        { date: formattedDate, text: 'One of the more friendly dwarves toward Bilbo from the beginning.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'thranduil',
      name: 'Thranduil',
      title: 'Elvenking',
      status: 'alive' as NPCStatus,
      race: 'Elf (Sindar)',
      occupation: 'King',
      location: 'mirkwood',
      relationship: 'neutral' as NPCRelationship,
      description: 'The king of the Woodland Realm in Mirkwood.',
      appearance: 'Tall, fair-haired elf with a crown of autumn leaves and berries.',
      personality: 'Isolationist, cautious, and somewhat distrustful of outsiders.',
      background: 'Ancient elf who has ruled the woodland realm for thousands of years.',
      connections: {
        relatedNPCs: ['legolas', 'thorin'],
        affiliations: ['Woodland Realm'],
        relatedQuests: ['escape-from-mirkwood']
      },
      notes: [
        { date: formattedDate, text: 'Has a strained relationship with the dwarves due to past disputes.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'bard',
      name: 'Bard the Bowman',
      title: 'Descendant of Girion',
      status: 'alive' as NPCStatus,
      race: 'Human',
      occupation: 'Bargeman',
      location: 'laketown',
      relationship: 'friendly' as NPCRelationship,
      description: 'A grim-faced bargeman from Lake-town with exceptional skill as an archer.',
      appearance: 'Tall, dark-haired man with a serious demeanor.',
      personality: 'Serious, responsible, and concerned for his people\'s welfare.',
      background: 'Descendant of Lord Girion of Dale, the city destroyed by Smaug.',
      connections: {
        relatedNPCs: ['thorin', 'smaug'],
        affiliations: ['Lake-town'],
        relatedQuests: ['slay-the-dragon']
      },
      notes: [
        { date: formattedDate, text: 'Possesses the last black arrow capable of killing Smaug.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'beorn',
      name: 'Beorn',
      title: 'Skin-changer',
      status: 'alive' as NPCStatus,
      race: 'Skin-changer',
      occupation: 'Hermit',
      location: 'beorns-hall',
      relationship: 'neutral' as NPCRelationship,
      description: 'A reclusive man who can take the form of a great black bear.',
      appearance: 'Huge, black-haired man with massive arms and a thick beard.',
      personality: 'Gruff but hospitable, mistrusts strangers but kind to animals.',
      background: 'Lives alone in a wooden house between the Misty Mountains and Mirkwood.',
      connections: {
        relatedNPCs: ['gandalf', 'radagast'],
        affiliations: ['None'],
        relatedQuests: ['unexpected-journey']
      },
      notes: [
        { date: formattedDate, text: 'Keeps many animals that serve him and can speak with them.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'radagast',
      name: 'Radagast the Brown',
      title: 'The Brown Wizard',
      status: 'alive' as NPCStatus,
      race: 'Maia (Wizard)',
      occupation: 'Wizard',
      location: 'rhosgobel',
      relationship: 'friendly' as NPCRelationship,
      description: 'A wizard who focuses on nature and animals rather than the affairs of elves and men.',
      appearance: 'Disheveled wizard with brown robes, often with animals or bird droppings on him.',
      personality: 'Eccentric, kind-hearted, and more concerned with plants and animals than politics.',
      background: 'One of the five wizards sent to Middle-earth, chosen by Yavanna for his love of growing things.',
      connections: {
        relatedNPCs: ['gandalf', 'saruman'],
        affiliations: ['None'],
        relatedQuests: ['unexpected-journey']
      },
      notes: [
        { date: formattedDate, text: 'Can communicate with birds and uses them as messengers.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};

// Helper function to get NPCs for The Silmarillion campaign
const getSilmarillionNPCs = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'feanor',
      name: 'Fëanor',
      title: 'Creator of the Silmarils',
      status: 'deceased' as NPCStatus,
      race: 'Elf (Noldor)',
      occupation: 'Craftsman, Leader',
      location: 'valinor',
      relationship: 'neutral' as NPCRelationship,
      description: 'The greatest craftsman of the Elves who created the Silmarils and led the rebellion of the Noldor.',
      appearance: 'Tall with dark hair and fiery eyes that reflect his spirit.',
      personality: 'Proud, passionate, skilled, but also arrogant and quick to anger.',
      background: 'Son of Finwë and Míriel, his mother gave up her life-force in his birth.',
      connections: {
        relatedNPCs: ['fingolfin', 'melkor'],
        affiliations: ['House of Finwë', 'Noldor'],
        relatedQuests: ['oath-of-feanor']
      },
      notes: [
        { date: formattedDate, text: 'His oath to recover the Silmarils drives much of the tragedy of the First Age.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'melkor',
      name: 'Melkor (Morgoth)',
      title: 'The Dark Enemy',
      status: 'alive' as NPCStatus,
      race: 'Ainur (Vala)',
      occupation: 'Dark Lord',
      location: 'angband',
      relationship: 'hostile' as NPCRelationship,
      description: 'The first Dark Lord and the primary antagonist of the First Age.',
      appearance: 'Tall and terrible, with burning hands from the Silmarils and a black iron crown.',
      personality: 'Destructive, jealous of creation, desires to dominate all life.',
      background: 'Originally the most powerful of the Ainur who rebelled against Eru Ilúvatar.',
      connections: {
        relatedNPCs: ['feanor', 'fingolfin', 'sauron'],
        affiliations: ['Forces of Darkness'],
        relatedQuests: ['war-of-wrath']
      },
      notes: [
        { date: formattedDate, text: 'Stole the Silmarils and set them in his Iron Crown.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'fingolfin',
      name: 'Fingolfin',
      title: 'High King of the Noldor',
      status: 'deceased' as NPCStatus,
      race: 'Elf (Noldor)',
      occupation: 'King',
      location: 'beleriand',
      relationship: 'friendly' as NPCRelationship,
      description: 'The second son of Finwë who became High King of the Noldor in Middle-earth.',
      appearance: 'Tall and valiant with the noble bearing of the Noldor.',
      personality: 'Brave, wise, and more temperate than his half-brother Fëanor.',
      background: 'Led many of the Noldor across the Helcaraxë after being abandoned by Fëanor.',
      connections: {
        relatedNPCs: ['feanor', 'melkor'],
        affiliations: ['House of Finwë', 'Noldor'],
        relatedQuests: ['war-of-jewels']
      },
      notes: [
        { date: formattedDate, text: 'Challenged Morgoth to single combat at the gates of Angband.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'beren',
      name: 'Beren',
      title: 'One-handed',
      status: 'alive' as NPCStatus,
      race: 'Human (Edain)',
      occupation: 'Adventurer',
      location: 'beleriand',
      relationship: 'friendly' as NPCRelationship,
      description: 'A mortal man who fell in love with the elven princess Lúthien and quested for a Silmaril.',
      appearance: 'Dark-haired mortal man, later missing his right hand.',
      personality: 'Determined, brave, and utterly devoted to Lúthien.',
      background: 'Son of Barahir, last survivor of his house after Morgoth\'s forces killed his father and companions.',
      connections: {
        relatedNPCs: ['luthien', 'thingol'],
        affiliations: ['House of Bëor'],
        relatedQuests: ['quest-for-silmaril']
      },
      notes: [
        { date: formattedDate, text: 'Lost his hand to Carcharoth while holding a Silmaril.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'luthien',
      name: 'Lúthien Tinúviel',
      title: 'Nightingale',
      status: 'alive' as NPCStatus,
      race: 'Elf (Half-Maia)',
      occupation: 'Princess',
      location: 'doriath',
      relationship: 'friendly' as NPCRelationship,
      description: 'Daughter of King Thingol and Melian the Maia, the most beautiful of all the Children of Ilúvatar.',
      appearance: 'Dark-haired and beautiful beyond description, often wearing a blue cloak.',
      personality: 'Strong-willed, passionate, and willing to sacrifice for love.',
      background: 'Princess of Doriath who fell in love with the mortal Beren.',
      connections: {
        relatedNPCs: ['beren', 'thingol', 'melian'],
        affiliations: ['Doriath'],
        relatedQuests: ['quest-for-silmaril']
      },
      notes: [
        { date: formattedDate, text: 'Used her enchantments to put Morgoth himself to sleep.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'turin',
      name: 'Túrin Turambar',
      title: 'Master of Doom',
      status: 'deceased' as NPCStatus,
      race: 'Human (Edain)',
      occupation: 'Warrior',
      location: 'beleriand',
      relationship: 'neutral' as NPCRelationship,
      description: 'A tragic hero whose life was cursed by Morgoth.',
      appearance: 'Tall and dark-haired, with a stern face and the black sword Gurthang.',
      personality: 'Proud, skilled in battle, but prone to rash decisions and subject to a dark fate.',
      background: 'Son of Húrin, sent to Doriath as a child after his father was captured by Morgoth.',
      connections: {
        relatedNPCs: ['beleg', 'glaurung'],
        affiliations: ['House of Hador', 'Doriath', 'Nargothrond'],
        relatedQuests: []
      },
      notes: [
        { date: formattedDate, text: 'Unwittingly married his sister Nienor, leading to their tragic suicides.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'turgon',
      name: 'Turgon',
      title: 'King of Gondolin',
      status: 'alive' as NPCStatus,
      race: 'Elf (Noldor)',
      occupation: 'King',
      location: 'gondolin',
      relationship: 'friendly' as NPCRelationship,
      description: 'Founder and ruler of the hidden city of Gondolin.',
      appearance: 'Tall and noble with the bearing of a great elven king.',
      personality: 'Wise, cautious, and determined to protect his people from Morgoth.',
      background: 'Son of Fingolfin who founded Gondolin based on a vision from Ulmo.',
      connections: {
        relatedNPCs: ['fingolfin', 'ecthelion', 'glorfindel'],
        affiliations: ['House of Fingolfin', 'Gondolin'],
        relatedQuests: ['fall-of-gondolin']
      },
      notes: [
        { date: formattedDate, text: 'Gondolin remained hidden for nearly 400 years before its fall.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'ecthelion',
      name: 'Ecthelion',
      title: 'Lord of the Fountain',
      status: 'alive' as NPCStatus,
      race: 'Elf (Noldor)',
      occupation: 'Warrior, Commander',
      location: 'gondolin',
      relationship: 'friendly' as NPCRelationship,
      description: 'Lord of the House of the Fountain in Gondolin and slayer of Gothmog.',
      appearance: 'Tall elf wearing silver and diamonds, with a helmet adorned with a spike.',
      personality: 'Noble, brave, and skilled in battle and music.',
      background: 'One of the great lords of Gondolin and commander of its guards.',
      connections: {
        relatedNPCs: ['turgon', 'glorfindel', 'gothmog'],
        affiliations: ['Gondolin', 'House of the Fountain'],
        relatedQuests: ['fall-of-gondolin']
      },
      notes: [
        { date: formattedDate, text: 'Known for his silver flute and the music he would play at the fountains.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'glorfindel',
      name: 'Glorfindel',
      title: 'Lord of the House of the Golden Flower',
      status: 'alive' as NPCStatus,
      race: 'Elf (Noldor)',
      occupation: 'Warrior, Lord',
      location: 'gondolin',
      relationship: 'friendly' as NPCRelationship,
      description: 'Lord of the House of the Golden Flower in Gondolin.',
      appearance: 'Golden-haired elf of great stature and beauty.',
      personality: 'Brave, noble, and willing to sacrifice himself for others.',
      background: 'One of the lords of Gondolin who would later be reborn and sent back to Middle-earth.',
      connections: {
        relatedNPCs: ['turgon', 'ecthelion'],
        affiliations: ['Gondolin', 'House of the Golden Flower'],
        relatedQuests: ['fall-of-gondolin']
      },
      notes: [
        { date: formattedDate, text: 'Slew a Balrog during the escape from Gondolin, though it cost him his life.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'thingol',
      name: 'Elu Thingol',
      title: 'King of Doriath',
      status: 'alive' as NPCStatus,
      race: 'Elf (Sindar)',
      occupation: 'King',
      location: 'doriath',
      relationship: 'neutral' as NPCRelationship,
      description: 'King of the Sindar Elves who rules Doriath with his Maia wife Melian.',
      appearance: 'Tall with silver hair, the most noble-looking of all the Elves.',
      personality: 'Proud, protective of his realm and daughter, distrustful of mortals.',
      background: 'One of the first Elves, who stayed behind in Middle-earth after meeting Melian.',
      connections: {
        relatedNPCs: ['melian', 'luthien', 'beren'],
        affiliations: ['Doriath'],
        relatedQuests: ['quest-for-silmaril']
      },
      notes: [
        { date: formattedDate, text: 'Demanded a Silmaril as bride-price for his daughter Lúthien\'s hand.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};

// Helper function to get NPCs for the Dúnedain campaign
const getDunedainNPCs = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'aragorn-young',
      name: 'Aragorn (Young)',
      title: 'Chieftain of the Dúnedain',
      status: 'alive' as NPCStatus,
      race: 'Human (Dúnedain)',
      occupation: 'Ranger',
      location: 'eriador',
      relationship: 'friendly' as NPCRelationship,
      description: 'The heir of Isildur who protects the North as a Ranger before his destiny calls him to greater things.',
      appearance: 'Tall, dark-haired, with grey eyes and the noble bearing of his ancestors.',
      personality: 'Wise, patient, and skilled in lore and battle.',
      background: 'Raised in Rivendell as Estel, learned his true identity at age 20.',
      connections: {
        relatedNPCs: ['elrond', 'halbarad'],
        affiliations: ['Rangers of the North', 'Rivendell'],
        relatedQuests: ['hunt-for-gollum']
      },
      notes: [
        { date: formattedDate, text: 'Also known as Strider, one of many names he uses in his travels.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'halbarad',
      name: 'Halbarad',
      title: 'Ranger of the North',
      status: 'alive' as NPCStatus,
      race: 'Human (Dúnedain)',
      occupation: 'Ranger',
      location: 'eriador',
      relationship: 'friendly' as NPCRelationship,
      description: 'A trusted kinsman and lieutenant of Aragorn among the Dúnedain.',
      appearance: 'Weather-worn ranger with the typical dark hair and grey eyes of the Dúnedain.',
      personality: 'Loyal, brave, and dedicated to the protection of the innocent.',
      background: 'Descended from the Dúnedain of Arnor and a distant kinsman of Aragorn.',
      connections: {
        relatedNPCs: ['aragorn-young', 'elder-ranger'],
        affiliations: ['Rangers of the North'],
        relatedQuests: ['protect-the-north', 'protect-the-shire']
      },
      notes: [
        { date: formattedDate, text: 'One of Aragorn\'s most trusted companions.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'elrond',
      name: 'Elrond',
      title: 'Lord of Rivendell',
      status: 'alive' as NPCStatus,
      race: 'Half-elven',
      occupation: 'Ruler, Healer, Loremaster',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'The half-elven lord who fostered Aragorn in his youth and taught him his heritage.',
      appearance: 'Ageless, with long dark hair and eyes that reflect ancient wisdom.',
      personality: 'Wise, thoughtful, and concerned with the long-term fate of Middle-earth.',
      background: 'Son of Eärendil who chose the fate of the Elves while his brother chose mortality.',
      connections: {
        relatedNPCs: ['aragorn-young', 'arwen'],
        affiliations: ['Rivendell', 'White Council'],
        relatedQuests: ['lost-heritage']
      },
      notes: [
        { date: formattedDate, text: 'Raised Aragorn as "Estel" (Hope) in Rivendell, concealing his true identity until he came of age.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'arwen',
      name: 'Arwen Undómiel',
      title: 'Evenstar of Her People',
      status: 'alive' as NPCStatus,
      race: 'Half-elven',
      occupation: 'Princess of Rivendell',
      location: 'rivendell',
      relationship: 'friendly' as NPCRelationship,
      description: 'The beautiful daughter of Elrond who falls in love with Aragorn.',
      appearance: 'Strikingly beautiful with long dark hair and grey eyes, resembling Lúthien Tinúviel.',
      personality: 'Gentle but determined, willing to sacrifice immortality for love.',
      background: 'Granddaughter of Galadriel, who has the choice between mortality and immortality.',
      connections: {
        relatedNPCs: ['elrond', 'aragorn-young'],
        affiliations: ['Rivendell'],
        relatedQuests: []
      },
      notes: [
        { date: formattedDate, text: 'Met Aragorn in the woods of Rivendell when he was 20 years old and mistook her for Lúthien.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gandalf',
      name: 'Gandalf the Grey',
      title: 'The Grey Pilgrim',
      status: 'alive' as NPCStatus,
      race: 'Maia (Wizard)',
      occupation: 'Wizard',
      location: 'eriador',
      relationship: 'friendly' as NPCRelationship,
      description: 'A wise wizard who travels Middle-earth opposing the forces of evil.',
      appearance: 'Elderly man with a long grey beard, pointed hat, and staff.',
      personality: 'Wise, occasionally stern, but with a good heart and sense of humor.',
      background: 'One of the five Istari sent to Middle-earth to aid against Sauron.',
      connections: {
        relatedNPCs: ['aragorn-young', 'elrond'],
        affiliations: ['White Council'],
        relatedQuests: ['hunt-for-gollum']
      },
      notes: [
        { date: formattedDate, text: 'Works closely with Aragorn and the Rangers on matters concerning the growing darkness.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'barrow-wights',
      name: 'Barrow-wights',
      title: 'Spirits of the Downs',
      status: 'undead' as NPCStatus,
      race: 'Undead',
      occupation: 'Tomb Guardians',
      location: 'eriador',
      relationship: 'hostile' as NPCRelationship,
      description: 'Evil spirits that inhabit the ancient burial mounds of the Barrow-downs.',
      appearance: 'Ghostly figures with cold hands and glowing eyes, sometimes appearing as corpse-like forms.',
      personality: 'Malevolent, possessive of their treasures, and seeking to trap the living.',
      background: 'Spirits sent by the Witch-king of Angmar to haunt the tombs of the ancient kings of Arnor.',
      connections: {
        relatedNPCs: ['witch-king'],
        affiliations: ['Servants of Angmar'],
        relatedQuests: ['barrow-downs-haunting']
      },
      notes: [
        { date: formattedDate, text: 'They entice travelers into their barrows, where they intend to kill them and make them one of their own.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gollum',
      name: 'Gollum',
      title: 'Ring-bearer',
      status: 'alive' as NPCStatus,
      race: 'Hobbit (Corrupted)',
      occupation: 'Wanderer',
      location: 'eriador',
      relationship: 'hostile' as NPCRelationship,
      description: 'A corrupted creature who once possessed the One Ring and is hunted by the Rangers.',
      appearance: 'Emaciated, pale creature with large, luminous eyes and few teeth.',
      personality: 'Duplicitous, obsessive, with a split personality of Gollum and Sméagol.',
      background: 'Once a Stoor hobbit named Sméagol who found the Ring and was corrupted by it.',
      connections: {
        relatedNPCs: ['aragorn-young'],
        affiliations: ['None'],
        relatedQuests: ['hunt-for-gollum']
      },
      notes: [
        { date: formattedDate, text: 'A challenging quarry who is both pitiable and dangerous.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'trolls',
      name: 'Hill Trolls',
      title: 'Mountain Brutes',
      status: 'alive' as NPCStatus,
      race: 'Troll',
      occupation: 'Predators',
      location: 'weathertop',
      relationship: 'hostile' as NPCRelationship,
      description: 'Large, brutish creatures that have begun venturing from their mountain homes.',
      appearance: 'Massive, stone-like skin, with great strength and limited intelligence.',
      personality: 'Violent, gluttonous, and not particularly bright, but more cunning than stone-trolls.',
      background: 'Created by Morgoth in mockery of Ents, they turn to stone in sunlight.',
      connections: {
        relatedNPCs: [],
        affiliations: ['None'],
        relatedQuests: ['protect-the-north']
      },
      notes: [
        { date: formattedDate, text: 'Unusually active in the Weather Hills, suggesting something may be driving them from their usual territories.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'elder-ranger',
      name: 'Dirhael',
      title: 'Elder of the Dúnedain',
      status: 'alive' as NPCStatus,
      race: 'Human (Dúnedain)',
      occupation: 'Ranger, Keeper of Lore',
      location: 'ranger-refuge',
      relationship: 'friendly' as NPCRelationship,
      description: 'An older Ranger who keeps the history and traditions of the Dúnedain.',
      appearance: 'Grey-haired but still strong, with the weathered face of one who has spent decades in the wild.',
      personality: 'Wise, patient, and concerned with preserving the heritage of Arnor.',
      background: 'Aragorn\'s maternal grandfather who has served as a Ranger for most of his life.',
      connections: {
        relatedNPCs: ['aragorn-young', 'halbarad'],
        affiliations: ['Rangers of the North'],
        relatedQuests: ['lost-heritage']
      },
      notes: [
        { date: formattedDate, text: 'Remembers the days when the Rangers were more numerous and the threat of Angmar was still fresh.' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'butterbur',
      name: 'Barliman Butterbur',
      title: 'Innkeeper',
      status: 'alive' as NPCStatus,
      race: 'Human',
      occupation: 'Innkeeper',
      location: 'bree',
      relationship: 'friendly' as NPCRelationship,
      description: 'The good-natured but forgetful innkeeper of The Prancing Pony in Bree.',
      appearance: 'Portly man with a red face, often wiping his hands on his apron.',
      personality: 'Kind, talkative, but somewhat absent-minded.',
      background: 'From a long line of innkeepers who have run The Prancing Pony for generations.',
      connections: {
        relatedNPCs: ['aragorn-young'],
        affiliations: ['Bree'],
        relatedQuests: ['protect-the-shire']
      },
      notes: [
        { date: formattedDate, text: 'Doesn\'t know Aragorn\'s true identity but recognizes him as the Ranger called "Strider."' }
      ],
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};