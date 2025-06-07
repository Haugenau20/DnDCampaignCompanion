// src/utils/__dev__/generators/contentGenerators/locationGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from '../userGenerator';
import { Location as AppLocation } from '../../../../types/location';


// Types for location data
type LocationType = 'region' | 'city' | 'town' | 'village' | 'dungeon' | 'landmark' | 'building' | 'poi';
type LocationStatus = 'known' | 'explored' | 'visited';

interface LocationData extends Omit<AppLocation, 'parentId' | 'lastVisited'> {
    parentId?: string | null;
    lastVisited?: string | null;
  }

// Create locations for a specific campaign
export const createLocations = async (
  db: any,
  groupId: string,
  campaignId: string,
  userMapping: UserMapping,
  formattedDate: string
) => {
  const dmUid = userMapping['dm'];
  
  // Define locations based on the campaign
  let locationsData: LocationData[] = [];
  
  if (campaignId === 'campaign1-1') {
    // LOTR Campaign Locations
    locationsData = getLOTRLocations(dmUid, formattedDate);
  } else if (campaignId === 'campaign1-2') {
    // The Hobbit Campaign Locations
    locationsData = getHobbitLocations(dmUid, formattedDate);
  } else if (campaignId === 'campaign2-1') {
    // Silmarillion Campaign Locations
    locationsData = getSilmarillionLocations(dmUid, formattedDate);
  } else if (campaignId === 'campaign2-2') {
    // Tales of the Dúnedain Campaign Locations
    locationsData = getDunedainLocations(dmUid, formattedDate);
  }
  
  // Create the locations in Firestore
  for (const location of locationsData) {
    await setDoc(doc(db, 'groups', groupId, 'campaigns', campaignId, 'locations', location.id), location);
    console.log(`Created location for ${campaignId}: ${location.name}`);
  }
  
  return locationsData;
};

// Helper function to get locations for The Lord of the Rings campaign
const getLOTRLocations = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'the-shire',
      name: 'The Shire',
      type: 'region' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'A peaceful region inhabited by hobbits, a small agricultural folk.',
      features: ['Green hills', 'Hobbit holes', 'The Party Tree', 'Bywater Pool'],
      connectedNPCs: ['frodo', 'bilbo'],
      relatedQuests: ['the-one-ring'],
      notes: [
        { date: formattedDate, text: 'Home of the hobbits and starting point of the journey.' }
      ],
      tags: ['peaceful', 'farming', 'hobbits'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'rivendell',
      name: 'Rivendell',
      type: 'city' as LocationType,
      status: 'visited' as LocationStatus,
      description: 'An elven outpost in Middle-earth and the house of Elrond.',
      parentId: null,
      features: ['Last Homely House', 'Council chamber', 'Waterfalls', 'Elven architecture'],
      connectedNPCs: ['elrond', 'gandalf'],
      relatedQuests: ['the-one-ring', 'council-of-elrond'],
      notes: [
        { date: formattedDate, text: 'Location of the Council where the Fellowship was formed.' }
      ],
      tags: ['elven', 'haven', 'wisdom'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'mines-of-moria',
      name: 'Mines of Moria',
      type: 'dungeon' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'An ancient underground dwarf kingdom, now infested with orcs and a Balrog.',
      parentId: null,
      features: ['Bridge of Khazad-dûm', 'Chamber of Mazarbul', 'Endless stairways', 'Cavernous halls'],
      connectedNPCs: ['gandalf', 'gimli', 'balrog'],
      relatedQuests: ['escape-from-moria'],
      notes: [
        { date: formattedDate, text: 'Gandalf fell here fighting the Balrog of Morgoth.' }
      ],
      tags: ['dangerous', 'underground', 'dwarf ruins'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'mordor',
      name: 'Mordor',
      type: 'region' as LocationType,
      status: 'known' as LocationStatus,
      description: 'The dark land where Sauron dwells, surrounded by mountains and filled with evil creatures.',
      parentId: null,
      features: ['Mount Doom', 'Barad-dûr', 'Black Gate', 'Plateau of Gorgoroth'],
      connectedNPCs: ['sauron', 'gollum'],
      relatedQuests: ['destroy-the-ring'],
      notes: [
        { date: formattedDate, text: 'The final destination for the Ring-bearer.' }
      ],
      tags: ['evil', 'volcanic', 'dangerous'],
      lastVisited: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'isengard',
      name: 'Isengard',
      type: 'landmark' as LocationType,
      status: 'known' as LocationStatus,
      description: 'The fortress of Saruman the White, with the tower of Orthanc at its center.',
      parentId: null,
      features: ['Tower of Orthanc', 'Ring of Isengard', 'Underground forges', 'Gardens'],
      connectedNPCs: ['saruman'],
      relatedQuests: ['defeat-saruman'],
      notes: [
        { date: formattedDate, text: 'Once a beautiful place, now corrupted by Saruman\'s evil.' }
      ],
      tags: ['fortress', 'corruption', 'wizardry'],
      lastVisited: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};

// Helper function to get locations for The Hobbit campaign
const getHobbitLocations = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'bag-end',
      name: 'Bag End',
      type: 'building' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'The comfortable hobbit-hole home of Bilbo Baggins in Hobbiton.',
      parentId: 'hobbiton',
      features: ['Round green door', 'Well-stocked pantry', 'Comfortable furnishings', 'Bilbo\'s study'],
      connectedNPCs: ['bilbo', 'gandalf'],
      relatedQuests: ['unexpected-journey'],
      notes: [
        { date: formattedDate, text: 'Starting point of the adventure, where the dwarves gathered.' }
      ],
      tags: ['hobbit-hole', 'comfortable', 'starting point'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'trollshaws',
      name: 'Trollshaws',
      type: 'region' as LocationType,
      status: 'visited' as LocationStatus,
      description: 'A dangerous area east of Rivendell where the company encountered three trolls.',
      parentId: null,
      features: ['Dense forests', 'Stone trolls', 'Troll hoard', 'Rocky terrain'],
      connectedNPCs: ['gandalf', 'thorin'],
      relatedQuests: ['unexpected-journey'],
      notes: [
        { date: formattedDate, text: 'Bilbo found Sting in the troll hoard.' }
      ],
      tags: ['dangerous', 'trolls', 'forest'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'misty-mountains',
      name: 'Misty Mountains',
      type: 'region' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'A great mountain range that the company must cross, home to goblins and other dangers.',
      parentId: null,
      features: ['Goblin tunnels', 'Gollum\'s lake', 'Treacherous passes', 'Eagle eyries'],
      connectedNPCs: ['gollum', 'great-goblin'],
      relatedQuests: ['riddles-in-the-dark'],
      notes: [
        { date: formattedDate, text: 'Bilbo found the One Ring here after getting separated from the company.' }
      ],
      tags: ['mountains', 'goblins', 'dangerous'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'mirkwood',
      name: 'Mirkwood',
      type: 'region' as LocationType,
      status: 'visited' as LocationStatus,
      description: 'A dark, enchanted forest filled with giant spiders and ruled by Wood Elves.',
      parentId: null,
      features: ['Enchanted river', 'Elven path', 'Spider lairs', 'Wood Elf kingdom'],
      connectedNPCs: ['thranduil', 'spiders'],
      relatedQuests: ['escape-from-mirkwood'],
      notes: [
        { date: formattedDate, text: 'The company was captured here first by spiders and then by elves.' }
      ],
      tags: ['forest', 'enchanted', 'dangerous', 'elves'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'erebor',
      name: 'Erebor (Lonely Mountain)',
      type: 'landmark' as LocationType,
      status: 'known' as LocationStatus,
      description: 'The ancient kingdom of the dwarves containing vast treasures guarded by the dragon Smaug.',
      parentId: null,
      features: ['Secret door', 'Great hall', 'Treasury', 'Smaug\'s lair'],
      connectedNPCs: ['thorin', 'smaug'],
      relatedQuests: ['reclaim-erebor', 'slay-the-dragon'],
      notes: [
        { date: formattedDate, text: 'The destination of the company\'s quest and the ancestral home of Thorin\'s people.' }
      ],
      tags: ['mountain', 'dwarf kingdom', 'treasure', 'dragon'],
      lastVisited: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};

// Helper function to get locations for The Silmarillion campaign
const getSilmarillionLocations = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'valinor',
      name: 'Valinor',
      type: 'region' as LocationType,
      status: 'known' as LocationStatus,
      description: 'The blessed realm in the west where the Valar dwell and where the Elves were invited to live.',
      parentId: null,
      features: ['Taniquetil', 'Halls of Mandos', 'Gardens of Lórien', 'Two Trees'],
      connectedNPCs: ['feanor', 'melkor'],
      relatedQuests: ['creation-of-silmarils'],
      notes: [
        { date: formattedDate, text: 'Source of the light captured in the Silmarils.' }
      ],
      tags: ['divine', 'blessed', 'light'],
      lastVisited: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'beleriand',
      name: 'Beleriand',
      type: 'region' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'The western region of Middle-earth during the First Age, later sunk beneath the sea.',
      parentId: null,
      features: ['Doriath', 'Nargothrond', 'Gondolin', 'Thangorodrim'],
      connectedNPCs: ['beren', 'luthien', 'turin'],
      relatedQuests: ['war-of-jewels', 'quest-for-silmaril'],
      notes: [
        { date: formattedDate, text: 'The main battleground of the War of the Jewels.' }
      ],
      tags: ['first age', 'battleground', 'elven kingdoms'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'angband',
      name: 'Angband',
      type: 'dungeon' as LocationType,
      status: 'known' as LocationStatus,
      description: 'The great underground fortress of Morgoth in the Iron Mountains of the north.',
      parentId: null,
      features: ['Iron crown', 'Pits of Angband', 'Throne of Morgoth', 'Forges'],
      connectedNPCs: ['morgoth', 'gothmog'],
      relatedQuests: ['war-of-wrath'],
      notes: [
        { date: formattedDate, text: 'Where Morgoth kept the Silmarils after stealing them.' }
      ],
      tags: ['fortress', 'evil', 'underground'],
      lastVisited: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'gondolin',
      name: 'Gondolin',
      type: 'city' as LocationType,
      status: 'visited' as LocationStatus,
      description: 'A hidden city of the Noldor, founded by Turgon and kept secret from Morgoth for centuries.',
      parentId: 'beleriand',
      features: ['Encircling mountains', 'Seven gates', 'King\'s square', 'White towers'],
      connectedNPCs: ['turgon', 'ecthelion', 'glorfindel'],
      relatedQuests: ['fall-of-gondolin'],
      notes: [
        { date: formattedDate, text: 'The last of the great elven kingdoms to fall to Morgoth.' }
      ],
      tags: ['hidden', 'elven', 'city'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'numenor',
      name: 'Númenor',
      type: 'region' as LocationType,
      status: 'known' as LocationStatus,
      description: 'A great island kingdom given to the Edain by the Valar after the War of Wrath.',
      parentId: null,
      features: ['Armenelos', 'Meneltarma', 'Haven of Rómenna', 'Temple of Morgoth'],
      connectedNPCs: ['elros', 'ar-pharazon'],
      relatedQuests: ['fall-of-numenor'],
      notes: [
        { date: formattedDate, text: 'Eventually sunk beneath the waves when its people turned to evil under Sauron\'s influence.' }
      ],
      tags: ['island', 'human kingdom', 'downfall'],
      lastVisited: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};

// Helper function to get locations for the Dúnedain campaign
const getDunedainLocations = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'arnor',
      name: 'Arnor (Former Kingdom)',
      type: 'region' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'The northern kingdom of the Dúnedain, now fallen and largely abandoned.',
      parentId: null,
      features: ['Ruins of Fornost', 'Weather Hills', 'North Downs', 'Ancient watchtowers'],
      connectedNPCs: ['aragorn-young', 'halbarad'],
      relatedQuests: ['protect-the-north'],
      notes: [
        { date: formattedDate, text: 'Former home of the northern Dúnedain, now patrolled by the Rangers.' }
      ],
      tags: ['ruins', 'kingdom', 'dúnedain'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'eriador',
      name: 'Eriador',
      type: 'region' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'The large region between the Misty Mountains and the Blue Mountains, including the Shire.',
      parentId: null,
      features: ['Bree', 'Weathertop', 'The Old Forest', 'Ranger camps'],
      connectedNPCs: ['aragorn-young', 'barrow-wights'],
      relatedQuests: ['protect-the-shire', 'hunt-for-gollum'],
      notes: [
        { date: formattedDate, text: 'The main patrolling grounds of the Rangers.' }
      ],
      tags: ['wilderness', 'patrol', 'scattered settlements'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'bree',
      name: 'Bree',
      type: 'town' as LocationType,
      status: 'visited' as LocationStatus,
      description: 'A village of Men and Hobbits at the crossroads of the Great East Road and the Greenway.',
      parentId: 'eriador',
      features: ['The Prancing Pony', 'Town gate', 'Market square', 'Mixed dwellings'],
      connectedNPCs: ['butterbur', 'aragorn-young'],
      relatedQuests: ['protect-the-north', 'hunt-for-gollum'],
      notes: [
        { date: formattedDate, text: 'A rare place where Men and Hobbits live together, and a common stop for Rangers.' }
      ],
      tags: ['town', 'inn', 'crossroads'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'weathertop',
      name: 'Weathertop (Amon Sûl)',
      type: 'landmark' as LocationType,
      status: 'visited' as LocationStatus,
      description: 'A hill topped with the ruins of an ancient watchtower that once housed a palantír.',
      parentId: 'eriador',
      features: ['Tower ruins', 'Defensive ring', 'Wide view', 'Ancient stones'],
      connectedNPCs: ['aragorn-young', 'trolls'],
      relatedQuests: ['protect-the-north'],
      notes: [
        { date: formattedDate, text: 'An important landmark and meeting place for the Rangers.' }
      ],
      tags: ['ruins', 'watchtower', 'strategic point'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    },
    {
      id: 'ranger-refuge',
      name: 'Ranger\'s Refuge',
      type: 'building' as LocationType,
      status: 'explored' as LocationStatus,
      description: 'A hidden outpost used by the Rangers as a base and place to exchange information.',
      parentId: 'eriador',
      features: ['Hidden entrance', 'Meeting hall', 'Armory', 'Healing supplies'],
      connectedNPCs: ['aragorn-young', 'halbarad'],
      relatedQuests: ['protect-the-north', 'hunt-for-gollum'],
      notes: [
        { date: formattedDate, text: 'Location known only to trusted Rangers and allies.' }
      ],
      tags: ['secret', 'base', 'rangers'],
      lastVisited: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster',
      dateModified: formattedDate
    }
  ];
};