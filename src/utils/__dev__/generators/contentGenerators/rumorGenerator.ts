// src/utils/__dev__/generators/contentGenerators/rumorGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from '../userGenerator';
import { Rumor as AppRumor } from '../../../../types/rumor';


// Types for rumor data
type RumorStatus = 'confirmed' | 'unconfirmed' | 'false';
type SourceType = 'npc' | 'tavern' | 'notice' | 'traveler' | 'other';

interface RumorData extends Omit<AppRumor, 'sourceNpcId' | 'locationId'> {
    sourceNpcId: string | null;
    locationId: string | null;
  }

// Create rumors for a specific campaign
export const createRumors = async (
  db: any,
  groupId: string,
  campaignId: string,
  userMapping: UserMapping,
  formattedDate: string
) => {
  // Get user IDs for creating rumors
  const aragornUid = userMapping['aragorn'] || userMapping['Aragorn'];
  const gandalfUid = userMapping['gandalf'] || userMapping['Gandalf'];
  const gimliUid = userMapping['gimli'] || userMapping['Gimli'];
  const legolasUid = userMapping['legolas'] || userMapping['Legolas'];
  const frodoUid = userMapping['frodo'] || userMapping['Frodo'];
  const samwiseUid = userMapping['samwise'] || userMapping['Samwise'];
  const pipinUid = userMapping['pippin'] || userMapping['Pippin'];
  
  // Define rumors based on the campaign
  let rumorsData: RumorData[] = [];
  
  if (campaignId === 'campaign1-1') {
    // LOTR Campaign Rumors
    rumorsData = getLOTRRumors(aragornUid, gandalfUid, gimliUid, legolasUid, formattedDate);
  } else if (campaignId === 'campaign1-2') {
    // The Hobbit Campaign Rumors
    rumorsData = getHobbitRumors(aragornUid, gandalfUid, gimliUid, legolasUid, formattedDate);
  } else if (campaignId === 'campaign2-1') {
    // Silmarillion Campaign Rumors
    rumorsData = getSilmarillionRumors(aragornUid, frodoUid, samwiseUid, pipinUid, formattedDate);
  } else if (campaignId === 'campaign2-2') {
    // Tales of the Dúnedain Campaign Rumors
    rumorsData = getDunedainRumors(aragornUid, frodoUid, samwiseUid, pipinUid, formattedDate);
  }
  
  // Create the rumors in Firestore
  for (const rumor of rumorsData) {
    await setDoc(doc(db, 'groups', groupId, 'campaigns', campaignId, 'rumors', rumor.id), rumor);
    console.log(`Created rumor for ${campaignId}: ${rumor.title}`);
  }
  
  return rumorsData;
};

// Helper function to get rumors for The Lord of the Rings campaign
const getLOTRRumors = (aragornUid: string, gandalfUid: string, gimliUid: string, legolasUid: string, formattedDate: string) => {
  return [
    {
      id: 'strange-visitors-to-the-shire',
      title: 'Strange Visitors to the Shire',
      content: 'Black-cloaked riders have been seen asking about "Baggins" throughout the Shire.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Gaffer Gamgee',
      sourceNpcId: null,
      location: 'The Shire',
      locationId: 'the-shire',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: aragornUid,
      createdByUsername: 'Aragorn',
      modifiedBy: aragornUid,
      modifiedByUsername: 'Aragorn',
      relatedNPCs: ['frodo', 'bilbo'],
      relatedLocations: ['the-shire'],
      notes: [
        {
          id: 'note1-1',
          content: 'These are likely the Nazgûl hunting for the Ring.',
          dateAdded: formattedDate,
          createdBy: aragornUid,
          createdByUsername: 'Aragorn'
        }
      ]
    },
    {
      id: 'the-enemys-forces-are-growing',
      title: 'The Enemy\'s Forces are Growing',
      content: 'Mordor has been gathering armies. Orcs, trolls, and men from the East and South have answered Sauron\'s call.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'traveler' as SourceType,
      sourceName: 'Ranger from the East',
      sourceNpcId: null,
      location: 'Rivendell',
      locationId: 'rivendell',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: gandalfUid,
      createdByUsername: 'Gandalf',
      modifiedBy: gandalfUid,
      modifiedByUsername: 'Gandalf',
      relatedNPCs: ['sauron'],
      relatedLocations: ['mordor'],
      notes: [
        {
          id: 'note2-1',
          content: 'This aligns with Gandalf\'s intelligence from his journeys.',
          dateAdded: formattedDate,
          createdBy: gandalfUid,
          createdByUsername: 'Gandalf'
        }
      ]
    },
    {
      id: 'dwarves-in-moria',
      title: 'Dwarves in Moria',
      content: 'A dwarf expedition led by Balin attempted to reclaim Moria years ago, but no word has come from them in a long time.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Glóin',
      sourceNpcId: null,
      location: 'Rivendell',
      locationId: 'rivendell',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: gimliUid,
      createdByUsername: 'Gimli',
      modifiedBy: gimliUid,
      modifiedByUsername: 'Gimli',
      relatedNPCs: ['gimli'],
      relatedLocations: ['mines-of-moria'],
      notes: [
        {
          id: 'note3-1',
          content: 'Gimli is particularly interested in discovering their fate.',
          dateAdded: formattedDate,
          createdBy: gimliUid,
          createdByUsername: 'Gimli'
        }
      ]
    },
    {
      id: 'the-white-wizards-betrayal',
      title: 'The White Wizard\'s Betrayal',
      content: 'Saruman has turned to the shadow and is no longer an ally of the free peoples.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Gandalf',
      sourceNpcId: 'gandalf',
      location: 'Rivendell',
      locationId: 'rivendell',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: gandalfUid,
      createdByUsername: 'Gandalf',
      modifiedBy: gandalfUid,
      modifiedByUsername: 'Gandalf',
      relatedNPCs: ['gandalf', 'saruman'],
      relatedLocations: ['isengard'],
      notes: [
        {
          id: 'note4-1',
          content: 'Gandalf was imprisoned at Orthanc but escaped with the help of an eagle.',
          dateAdded: formattedDate,
          createdBy: gandalfUid,
          createdByUsername: 'Gandalf'
        }
      ],
      convertedToQuestId: 'defeat-saruman'
    },
    {
      id: 'a-secret-path-into-mordor',
      title: 'A Secret Path into Mordor',
      content: 'There may be a path into Mordor that is not watched by the Eye.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'other' as SourceType,
      sourceName: 'Ancient Maps',
      sourceNpcId: null,
      location: 'Rivendell',
      locationId: 'rivendell',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: aragornUid,
      createdByUsername: 'Aragorn',
      modifiedBy: aragornUid,
      modifiedByUsername: 'Aragorn',
      relatedNPCs: ['gollum'],
      relatedLocations: ['mordor'],
      notes: [
        {
          id: 'note5-1',
          content: 'Gollum might have knowledge of this path, as he escaped from Mordor.',
          dateAdded: formattedDate,
          createdBy: aragornUid,
          createdByUsername: 'Aragorn'
        }
      ]
    }
  ];
};

// Helper function to get rumors for The Hobbit campaign
const getHobbitRumors = (aragornUid: string, gandalfUid: string, gimliUid: string, legolasUid: string, formattedDate: string) => {
  return [
    {
      id: 'dragon-sickness',
      title: 'Dragon Sickness',
      content: 'It\'s said that the vast treasure of Erebor carries a curse that inflames the greed of those who look upon it.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Gandalf',
      sourceNpcId: 'gandalf',
      location: 'Bag End',
      locationId: 'bag-end',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: gandalfUid,
      createdByUsername: 'Gandalf',
      modifiedBy: gandalfUid,
      modifiedByUsername: 'Gandalf',
      relatedNPCs: ['thorin'],
      relatedLocations: ['erebor'],
      notes: [
        {
          id: 'note1-1',
          content: 'This may explain the obsessive behavior of Thorin\'s grandfather before the dragon came.',
          dateAdded: formattedDate,
          createdBy: gandalfUid,
          createdByUsername: 'Gandalf'
        }
      ]
    },
    {
      id: 'spiders-in-mirkwood',
      title: 'Giant Spiders in Mirkwood',
      content: 'Travelers speak of enormous spiders inhabiting the dark forest of Mirkwood, spinning webs to catch unwary travelers.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'traveler' as SourceType,
      sourceName: 'Woodman',
      sourceNpcId: null,
      location: 'Edge of Mirkwood',
      locationId: 'mirkwood',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: aragornUid,
      createdByUsername: 'Aragorn',
      modifiedBy: aragornUid,
      modifiedByUsername: 'Aragorn',
      relatedNPCs: [],
      relatedLocations: ['mirkwood'],
      notes: [
        {
          id: 'note2-1',
          content: 'The forest seems more dangerous than it once was. Some evil influence may be at work.',
          dateAdded: formattedDate,
          createdBy: aragornUid,
          createdByUsername: 'Aragorn'
        }
      ]
    },
    {
      id: 'smaug-awakening',
      title: 'Signs of Smaug\'s Activity',
      content: 'Shepherds near the Lonely Mountain report occasional smoke from the peak and missing livestock, suggesting the dragon may be active.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'traveler' as SourceType,
      sourceName: 'Merchant from Dale',
      sourceNpcId: null,
      location: 'Lake-town',
      locationId: null,
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: gimliUid,
      createdByUsername: 'Gimli',
      modifiedBy: gimliUid,
      modifiedByUsername: 'Gimli',
      relatedNPCs: ['smaug'],
      relatedLocations: ['erebor'],
      notes: [
        {
          id: 'note3-1',
          content: 'The dragon has not been seen flying in decades, but these signs suggest he still lives.',
          dateAdded: formattedDate,
          createdBy: gimliUid,
          createdByUsername: 'Gimli'
        }
      ]
    },
    {
      id: 'thranduil-isolationism',
      title: 'The Elvenking\'s Isolationism',
      content: 'King Thranduil of the Woodland Realm has withdrawn his people deeper into Mirkwood and grown suspicious of outsiders.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Wandering Elf',
      sourceNpcId: null,
      location: 'Rivendell',
      locationId: null,
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: legolasUid,
      createdByUsername: 'Legolas',
      modifiedBy: legolasUid,
      modifiedByUsername: 'Legolas',
      relatedNPCs: ['thranduil'],
      relatedLocations: ['mirkwood'],
      notes: [
        {
          id: 'note4-1',
          content: 'Travelers passing through Mirkwood are sometimes detained by the Wood Elves.',
          dateAdded: formattedDate,
          createdBy: legolasUid,
          createdByUsername: 'Legolas'
        }
      ]
    },
    {
      id: 'secret-door-erebor',
      title: 'A Secret Door to Erebor',
      content: 'There are rumors of a hidden door into the Lonely Mountain, one that might allow entry without facing the dragon at the main gate.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'other' as SourceType,
      sourceName: 'Thorin\'s Map',
      sourceNpcId: null,
      location: 'Bag End',
      locationId: 'bag-end',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: gandalfUid,
      createdByUsername: 'Gandalf',
      modifiedBy: gandalfUid,
      modifiedByUsername: 'Gandalf',
      relatedNPCs: ['thorin'],
      relatedLocations: ['erebor'],
      notes: [
        {
          id: 'note5-1',
          content: 'The map contains moon-letters that may reveal more about this door when read under the proper light.',
          dateAdded: formattedDate,
          createdBy: gandalfUid,
          createdByUsername: 'Gandalf'
        }
      ],
      convertedToQuestId: 'reclaim-erebor'
    }
  ];
};

// Helper function to get rumors for The Silmarillion campaign
const getSilmarillionRumors = (aragornUid: string, frodoUid: string, samwiseUid: string, pipinUid: string, formattedDate: string) => {
  return [
    {
      id: 'melkor-discord',
      title: 'Discord in the Music',
      content: 'Melkor has introduced a theme of his own into the Music of the Ainur, contrary to the thought of Ilúvatar.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'other' as SourceType,
      sourceName: 'Visions of the Beginning',
      sourceNpcId: null,
      location: 'Valinor',
      locationId: 'valinor',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: frodoUid,
      createdByUsername: 'Frodo',
      modifiedBy: frodoUid,
      modifiedByUsername: 'Frodo',
      relatedNPCs: ['melkor'],
      relatedLocations: ['valinor'],
      notes: [
        {
          id: 'note1-1',
          content: 'This discord is the seed of all the strife that would later enter the world.',
          dateAdded: formattedDate,
          createdBy: frodoUid,
          createdByUsername: 'Frodo'
        }
      ]
    },
    {
      id: 'feanor-pride',
      title: 'The Pride of Fëanor',
      content: 'Fëanor, greatest craftsman of the Noldor, grows ever more possessive of his creations, particularly the Silmarils.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Fingolfin',
      sourceNpcId: null,
      location: 'Tirion',
      locationId: null,
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: samwiseUid,
      createdByUsername: 'Samwise',
      modifiedBy: samwiseUid,
      modifiedByUsername: 'Samwise',
      relatedNPCs: ['feanor'],
      relatedLocations: ['valinor'],
      notes: [
        {
          id: 'note2-1',
          content: 'The rift between Fëanor and his half-brothers grows wider as Melkor\'s whispers take root.',
          dateAdded: formattedDate,
          createdBy: samwiseUid,
          createdByUsername: 'Samwise'
        }
      ]
    },
    {
      id: 'ungoliant-alliance',
      title: 'Melkor\'s Dark Alliance',
      content: 'Melkor has been seen in the company of Ungoliant, the great spider of darkness, in the south of Valinor.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Teleri Mariner',
      sourceNpcId: null,
      location: 'Shores of Valinor',
      locationId: 'valinor',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: pipinUid,
      createdByUsername: 'Pippin',
      modifiedBy: pipinUid,
      modifiedByUsername: 'Pippin',
      relatedNPCs: ['melkor'],
      relatedLocations: ['valinor'],
      notes: [
        {
          id: 'note3-1',
          content: 'Ungoliant dwells in Avathar, a land of shadows that the Valar have neglected.',
          dateAdded: formattedDate,
          createdBy: pipinUid,
          createdByUsername: 'Pippin'
        }
      ]
    },
    {
        id: 'hidden-city',
      title: 'A Hidden City',
      content: 'Turgon, son of Fingolfin, is said to be building a secret city that will be hidden from the eyes of Morgoth.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'traveler' as SourceType,
      sourceName: 'Sindar Elf',
      sourceNpcId: null,
      location: 'Beleriand',
      locationId: 'beleriand',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: aragornUid,
      createdByUsername: 'Aragorn',
      modifiedBy: aragornUid,
      modifiedByUsername: 'Aragorn',
      relatedNPCs: ['turgon'],
      relatedLocations: ['gondolin'],
      notes: [
        {
          id: 'note4-1',
          content: 'Ulmo, Lord of Waters, is said to be guiding Turgon in this endeavor.',
          dateAdded: formattedDate,
          createdBy: aragornUid,
          createdByUsername: 'Aragorn'
        }
      ]
    },
    {
      id: 'sons-of-feanor-oath',
      title: 'The Terrible Oath',
      content: 'Fëanor and his seven sons have sworn a terrible oath to recover the Silmarils at any cost, calling the Everlasting Darkness upon themselves should they fail.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Witness to the Oath',
      sourceNpcId: null,
      location: 'Tirion',
      locationId: null,
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: frodoUid,
      createdByUsername: 'Frodo',
      modifiedBy: frodoUid,
      modifiedByUsername: 'Frodo',
      relatedNPCs: ['feanor'],
      relatedLocations: ['valinor'],
      notes: [
        {
          id: 'note5-1',
          content: 'This oath will drive them to commit terrible deeds in their quest for the jewels.',
          dateAdded: formattedDate,
          createdBy: frodoUid,
          createdByUsername: 'Frodo'
        }
      ],
      convertedToQuestId: 'oath-of-feanor'
    }
  ];
};

// Helper function to get rumors for the Dúnedain campaign
const getDunedainRumors = (aragornUid: string, frodoUid: string, samwiseUid: string, pipinUid: string, formattedDate: string) => {
  return [
    {
      id: 'movement-in-the-east',
      title: 'Movement in the East',
      content: 'Travelers report increased orc activity in the mountains and strange messengers traveling to and from the East.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'traveler' as SourceType,
      sourceName: 'Merchant Caravan',
      sourceNpcId: null,
      location: 'Bree',
      locationId: 'bree',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: aragornUid,
      createdByUsername: 'Aragorn',
      modifiedBy: aragornUid,
      modifiedByUsername: 'Aragorn',
      relatedNPCs: [],
      relatedLocations: ['eriador'],
      notes: [
        {
          id: 'note1-1',
          content: 'This may indicate that the Enemy is gathering forces again.',
          dateAdded: formattedDate,
          createdBy: aragornUid,
          createdByUsername: 'Aragorn'
        }
      ]
    },
    {
      id: 'troll-sightings',
      title: 'Troll Sightings in the Weather Hills',
      content: 'Shepherds have reported seeing trolls wandering in the Weather Hills, far from their usual haunts.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Local Shepherd',
      sourceNpcId: null,
      location: 'Weather Hills',
      locationId: 'weathertop',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: frodoUid,
      createdByUsername: 'Frodo',
      modifiedBy: frodoUid,
      modifiedByUsername: 'Frodo',
      relatedNPCs: ['trolls'],
      relatedLocations: ['weathertop'],
      notes: [
        {
          id: 'note2-1',
          content: 'These may be hill-trolls, which are more cunning than stone-trolls.',
          dateAdded: formattedDate,
          createdBy: frodoUid,
          createdByUsername: 'Frodo'
        }
      ],
      convertedToQuestId: 'protect-the-north'
    },
    {
      id: 'barrow-wight-activity',
      title: 'Increased Barrow-wight Activity',
      content: 'The Barrow-downs have grown more dangerous, with several travelers going missing in recent months.',
      status: 'confirmed' as RumorStatus,
      sourceType: 'traveler' as SourceType,
      sourceName: 'Bree-lander',
      sourceNpcId: null,
      location: 'Bree',
      locationId: 'bree',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: samwiseUid,
      createdByUsername: 'Samwise',
      modifiedBy: samwiseUid,
      modifiedByUsername: 'Samwise',
      relatedNPCs: ['barrow-wights'],
      relatedLocations: ['eriador'],
      notes: [
        {
          id: 'note3-1',
          content: 'There may be a connection to the growing darkness in the East.',
          dateAdded: formattedDate,
          createdBy: samwiseUid,
          createdByUsername: 'Samwise'
        }
      ],
      convertedToQuestId: 'barrow-downs-haunting'
    },
    {
      id: 'gollum-sighting',
      title: 'Strange Creature Sighted',
      content: 'A pale, emaciated creature has been seen skulking near the marshes east of Bree, muttering to itself.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'npc' as SourceType,
      sourceName: 'Hunter',
      sourceNpcId: null,
      location: 'East of Bree',
      locationId: 'eriador',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: pipinUid,
      createdByUsername: 'Pippin',
      modifiedBy: pipinUid,
      modifiedByUsername: 'Pippin',
      relatedNPCs: ['gollum'],
      relatedLocations: ['eriador'],
      notes: [
        {
          id: 'note4-1',
          content: 'This description matches what Gandalf has told us of Gollum.',
          dateAdded: formattedDate,
          createdBy: pipinUid,
          createdByUsername: 'Pippin'
        }
      ],
      convertedToQuestId: 'hunt-for-gollum'
    },
    {
      id: 'annuminas-treasures',
      title: 'Lost Treasures of Annúminas',
      content: 'Legends speak of royal artifacts and historical records still hidden in the ruins of Annúminas, the ancient capital of Arnor.',
      status: 'unconfirmed' as RumorStatus,
      sourceType: 'other' as SourceType,
      sourceName: 'Old Maps and Chronicles',
      sourceNpcId: null,
      location: 'Ranger Refuge',
      locationId: 'ranger-refuge',
      dateAdded: formattedDate,
      dateModified: formattedDate,
      createdBy: aragornUid,
      createdByUsername: 'Aragorn',
      modifiedBy: aragornUid,
      modifiedByUsername: 'Aragorn',
      relatedNPCs: ['aragorn-young'],
      relatedLocations: ['arnor'],
      notes: [
        {
          id: 'note5-1',
          content: 'These artifacts could help restore the legacy of the Dúnedain for future generations.',
          dateAdded: formattedDate,
          createdBy: aragornUid,
          createdByUsername: 'Aragorn'
        }
      ],
      convertedToQuestId: 'lost-heritage'
    }
  ];
};