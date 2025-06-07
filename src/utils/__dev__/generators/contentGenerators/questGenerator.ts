// src/utils/__dev__/generators/contentGenerators/questGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from '../userGenerator';
import { Quest as AppQuest } from '../../../../types/quest';

// Types for quest data
type QuestStatus = 'active' | 'completed' | 'failed';

interface QuestData extends Omit<AppQuest, 'dateCompleted'> {
    dateCompleted: string | null;
  }

// Create quests for a specific campaign
export const createQuests = async (
  db: any,
  groupId: string,
  campaignId: string,
  userMapping: UserMapping,
  formattedDate: string
) => {
  const dmUid = userMapping['dm'];
  
  // Define quests based on the campaign
  let questsData: QuestData[] = [];
  
  if (campaignId === 'campaign1-1') {
    // LOTR Campaign Quests
    questsData = getLOTRQuests(dmUid, formattedDate);
  } else if (campaignId === 'campaign1-2') {
    // The Hobbit Campaign Quests
    questsData = getHobbitQuests(dmUid, formattedDate);
  } else if (campaignId === 'campaign2-1') {
    // Silmarillion Campaign Quests
    questsData = getSilmarillionQuests(dmUid, formattedDate);
  } else if (campaignId === 'campaign2-2') {
    // Tales of the Dúnedain Campaign Quests
    questsData = getDunedainQuests(dmUid, formattedDate);
  }
  
  // Create the quests in Firestore
  for (const quest of questsData) {
    await setDoc(doc(db, 'groups', groupId, 'campaigns', campaignId, 'quests', quest.id), quest);
    console.log(`Created quest for ${campaignId}: ${quest.title}`);
  }
  
  return questsData;
};

// Helper function to get quests for The Lord of the Rings campaign
const getLOTRQuests = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'the-one-ring',
      title: 'The One Ring',
      description: 'Discover the true nature of Bilbo\'s ring and determine what must be done with it.',
      status: 'completed' as QuestStatus,
      background: 'Bilbo Baggins found a mysterious ring during his adventure with the dwarves, which has been identified as the One Ring of Sauron.',
      objectives: [
        {
          id: 'obj1-1',
          description: 'Consult with Gandalf about the ring\'s nature',
          completed: true
        },
        {
          id: 'obj1-2',
          description: 'Test the ring in fire to reveal its inscription',
          completed: true
        },
        {
          id: 'obj1-3',
          description: 'Keep the ring safe from the Nazgûl',
          completed: true
        }
      ],
      leads: ['The ring must be taken to the Council at Rivendell'],
      keyLocations: [
        { name: 'The Shire', description: 'Where the ring has been kept hidden for decades' },
        { name: 'Rivendell', description: 'Where the Council will decide the ring\'s fate' }
      ],
      importantNPCs: [
        { name: 'Gandalf', description: 'Has knowledge of the ring\'s history' },
        { name: 'Frodo Baggins', description: 'The new ring-bearer' },
        { name: 'Bilbo Baggins', description: 'The former ring-bearer' }
      ],
      relatedNPCIds: ['frodo', 'bilbo', 'gandalf'],
      complications: ['The Nazgûl are hunting for the ring', 'The ring corrupts its bearer over time'],
      rewards: ['Knowledge of the ring\'s true nature', 'Understanding the threat to Middle-earth'],
      location: 'the-shire',
      levelRange: '1-3',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'council-of-elrond',
      title: 'Council of Elrond',
      description: 'Attend the Council of Elrond to determine the fate of the One Ring.',
      status: 'completed' as QuestStatus,
      background: 'With the One Ring identified, a council of the free peoples of Middle-earth must decide what to do with it.',
      objectives: [
        {
          id: 'obj2-1',
          description: 'Reach Rivendell safely',
          completed: true
        },
        {
          id: 'obj2-2',
          description: 'Present the Ring at the Council',
          completed: true
        },
        {
          id: 'obj2-3',
          description: 'Form a plan to deal with the Ring',
          completed: true
        }
      ],
      leads: ['The Ring must be destroyed in the fires of Mount Doom'],
      keyLocations: [
        { name: 'Rivendell', description: 'The location of the Council' },
        { name: 'Mordor', description: 'The only place where the Ring can be destroyed' }
      ],
      importantNPCs: [
        { name: 'Elrond', description: 'Host of the Council' },
        { name: 'Gandalf', description: 'Advisor and guide' },
        { name: 'Frodo Baggins', description: 'The Ring-bearer' }
      ],
      relatedNPCIds: ['frodo', 'elrond', 'gandalf', 'gimli'],
      complications: ['Disagreements between races', 'The corruption of the Ring affects the Council'],
      rewards: ['Formation of the Fellowship of the Ring', 'A plan to destroy the Ring'],
      location: 'rivendell',
      levelRange: '3-5',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'escape-from-moria',
      title: 'Escape from Moria',
      description: 'Navigate through the ancient dwarf kingdom of Moria and escape the dangers within.',
      status: 'completed' as QuestStatus,
      background: 'The Fellowship must pass through Moria after being unable to cross the mountains via the Redhorn Pass.',
      objectives: [
        {
          id: 'obj3-1',
          description: 'Find the entrance to Moria',
          completed: true
        },
        {
          id: 'obj3-2',
          description: 'Navigate through the mines',
          completed: true
        },
        {
          id: 'obj3-3',
          description: 'Escape from the Balrog and orcs',
          completed: true
        }
      ],
      leads: ['Continue the journey to Mordor'],
      keyLocations: [
        { name: 'Doors of Durin', description: 'The western entrance to Moria' },
        { name: 'Bridge of Khazad-dûm', description: 'Where Gandalf confronts the Balrog' }
      ],
      importantNPCs: [
        { name: 'Gandalf', description: 'Guide through the mines' },
        { name: 'Gimli', description: 'Dwarf with knowledge of Moria\'s history' },
        { name: 'Balrog', description: 'Ancient demon awakened in the depths' }
      ],
      relatedNPCIds: ['gandalf', 'gimli', 'balrog'],
      complications: ['Cave-in blocking the western entrance', 'Orcs and trolls patrolling the mines', 'The Balrog\'s awakening'],
      rewards: ['Passage through the mountains', 'Discovery of the fate of Balin\'s expedition'],
      location: 'mines-of-moria',
      levelRange: '5-7',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'destroy-the-ring',
      title: 'Destroy the Ring',
      description: 'Journey to Mount Doom in Mordor to destroy the One Ring in the fires where it was forged.',
      status: 'active' as QuestStatus,
      background: 'The One Ring can only be destroyed in the fires of Mount Doom, where it was created by Sauron.',
      objectives: [
        {
          id: 'obj4-1',
          description: 'Reach Mordor undetected',
          completed: false
        },
        {
          id: 'obj4-2',
          description: 'Find a path to Mount Doom',
          completed: false
        },
        {
          id: 'obj4-3',
          description: 'Cast the Ring into the fire',
          completed: false
        }
      ],
      leads: ['Gollum may know a secret way into Mordor'],
      keyLocations: [
        { name: 'Mordor', description: 'The dark land ruled by Sauron' },
        { name: 'Mount Doom', description: 'The volcano where the Ring must be destroyed' }
      ],
      importantNPCs: [
        { name: 'Frodo Baggins', description: 'The Ring-bearer' },
        { name: 'Gollum', description: 'Guide with knowledge of secret paths' },
        { name: 'Sauron', description: 'The Dark Lord who seeks the Ring' }
      ],
      relatedNPCIds: ['frodo', 'sauron', 'gollum'],
      complications: ['The Ring\'s corruption grows stronger near Mordor', 'Sauron\'s forces patrol the land', 'Gollum\'s trustworthiness is questionable'],
      rewards: ['The destruction of the One Ring', 'The downfall of Sauron', 'Freedom for Middle-earth'],
      location: 'mordor',
      levelRange: '8-10',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'defeat-saruman',
      title: 'Defeat Saruman',
      description: 'Confront the traitorous wizard Saruman and end his alliance with Sauron.',
      status: 'active' as QuestStatus,
      background: 'Saruman the White has betrayed the free peoples and allied with Sauron, building an army at Isengard.',
      objectives: [
        {
          id: 'obj5-1',
          description: 'Gather intelligence on Saruman\'s forces',
          completed: true
        },
        {
          id: 'obj5-2',
          description: 'Rally the Rohirrim to fight against Isengard',
          completed: false
        },
        {
          id: 'obj5-3',
          description: 'Defeat Saruman\'s army and confront the wizard',
          completed: false
        }
      ],
      leads: ['The Ents of Fangorn Forest might be persuaded to help'],
      keyLocations: [
        { name: 'Isengard', description: 'Saruman\'s fortress and base of operations' },
        { name: 'Orthanc', description: 'The tower at the center of Isengard where Saruman resides' }
      ],
      importantNPCs: [
        { name: 'Saruman', description: 'The traitorous wizard' },
        { name: 'Gandalf', description: 'Now returned as Gandalf the White' }
      ],
      relatedNPCIds: ['gandalf', 'saruman'],
      complications: ['Saruman\'s voice is unnaturally persuasive', 'The Uruk-hai are stronger than ordinary orcs'],
      rewards: ['Weakening of Sauron\'s alliance', 'Recovery of lost knowledge from Orthanc'],
      location: 'isengard',
      levelRange: '6-8',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    }
  ];
};

// Helper function to get quests for The Hobbit campaign
const getHobbitQuests = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'unexpected-journey',
      title: 'An Unexpected Journey',
      description: 'Join Thorin and Company on their quest to reclaim the Lonely Mountain.',
      status: 'completed' as QuestStatus,
      background: 'Thorin Oakenshield wishes to reclaim his ancestral home and treasure from the dragon Smaug.',
      objectives: [
        {
          id: 'obj1-1',
          description: 'Meet with the dwarves and Gandalf',
          completed: true
        },
        {
          id: 'obj1-2',
          description: 'Sign the contract as the company burglar',
          completed: true
        },
        {
          id: 'obj1-3',
          description: 'Begin the journey east',
          completed: true
        }
      ],
      leads: ['Travel east toward the Misty Mountains'],
      keyLocations: [
        { name: 'Bag End', description: 'Bilbo\'s home where the company assembles' },
        { name: 'The Trollshaws', description: 'Where the company encounters three trolls' }
      ],
      importantNPCs: [
        { name: 'Gandalf', description: 'The wizard who organized the expedition' },
        { name: 'Thorin Oakenshield', description: 'Leader of the company and rightful King under the Mountain' },
        { name: 'Bilbo Baggins', description: 'Reluctant burglar hired for the quest' }
      ],
      relatedNPCIds: ['bilbo', 'gandalf', 'thorin'],
      complications: ['Bilbo\'s inexperience', 'Hostile lands', 'The company\'s skepticism of Bilbo'],
      rewards: ['Finding trolls\' treasure', 'Acquiring Sting and other treasures'],
      location: 'bag-end',
      levelRange: '1-3',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'riddles-in-the-dark',
      title: 'Riddles in the Dark',
      description: 'Survive a perilous encounter in the goblin tunnels and match wits with a strange creature.',
      status: 'completed' as QuestStatus,
      background: 'After being captured by goblins in the Misty Mountains, the company is scattered, and Bilbo finds himself lost in the tunnels.',
      objectives: [
        {
          id: 'obj2-1',
          description: 'Escape from the goblins',
          completed: true
        },
        {
          id: 'obj2-2',
          description: 'Find a way out of the tunnels',
          completed: true
        },
        {
          id: 'obj2-3',
          description: 'Reunite with the company',
          completed: true
        }
      ],
      leads: ['Continue east after escaping the mountains'],
      keyLocations: [
        { name: 'Goblin tunnels', description: 'Labyrinthine passages under the Misty Mountains' },
        { name: 'Gollum\'s lake', description: 'The underground lake where Gollum lives' }
      ],
      importantNPCs: [
        { name: 'Gollum', description: 'A strange creature living in the depths who possesses a magical ring' },
        { name: 'Great Goblin', description: 'Leader of the goblins of the Misty Mountains' }
      ],
      relatedNPCIds: ['bilbo', 'gollum', 'great-goblin'],
      complications: ['The darkness of the tunnels', 'Gollum\'s desire to eat Bilbo', 'Finding the way out'],
      rewards: ['The One Ring', 'Knowledge of Gollum\'s riddles', 'Escaping the mountain'],
      location: 'misty-mountains',
      levelRange: '3-5',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'escape-from-mirkwood',
      title: 'Escape from Mirkwood',
      description: 'Free the dwarves from the Wood Elves and find a way to Lake-town.',
      status: 'completed' as QuestStatus,
      background: 'After being captured by the Wood Elves in Mirkwood, the dwarves are imprisoned in the Elvenking\'s halls.',
      objectives: [
        {
          id: 'obj3-1',
          description: 'Find a way to free the dwarves',
          completed: true
        },
        {
          id: 'obj3-2',
          description: 'Secure a means of escape',
          completed: true
        },
        {
          id: 'obj3-3',
          description: 'Navigate to Lake-town',
          completed: true
        }
      ],
      leads: ['From Lake-town, the company can access the Lonely Mountain'],
      keyLocations: [
        { name: 'Elvenking\'s Halls', description: 'The underground palace of Thranduil' },
        { name: 'Forest River', description: 'The river that flows from Mirkwood to the Long Lake' }
      ],
      importantNPCs: [
        { name: 'Thranduil', description: 'The Elvenking who imprisoned the dwarves' },
        { name: 'Master of Lake-town', description: 'The greedy ruler of Esgaroth' }
      ],
      relatedNPCIds: ['bilbo', 'thranduil'],
      complications: ['Bilbo must remain invisible', 'The rushing river is dangerous', 'The need for secrecy'],
      rewards: ['Reaching Lake-town', 'Freedom for the company', 'The last leg of the journey'],
      location: 'mirkwood',
      levelRange: '5-7',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'reclaim-erebor',
      title: 'Reclaim Erebor',
      description: 'Find the secret door into the Lonely Mountain and reclaim the dwarven kingdom.',
      status: 'active' as QuestStatus,
      background: 'The company has reached the Lonely Mountain and must now find a way inside to assess the situation with Smaug.',
      objectives: [
        {
          id: 'obj4-1',
          description: 'Find the secret door mentioned in the map',
          completed: true
        },
        {
          id: 'obj4-2',
          description: 'Enter the mountain undetected',
          completed: false
        },
        {
          id: 'obj4-3',
          description: 'Scout the dragon\'s hoard',
          completed: false
        }
      ],
      leads: ['The door can only be opened on Durin\'s Day'],
      keyLocations: [
        { name: 'Secret door', description: 'Hidden entrance on the western side of the mountain' },
        { name: 'Great hall', description: 'The main hall of Erebor where Smaug may be' }
      ],
      importantNPCs: [
        { name: 'Thorin Oakenshield', description: 'Rightful King under the Mountain' },
        { name: 'Smaug', description: 'The dragon who seized Erebor and its treasure' }
      ],
      relatedNPCIds: ['bilbo', 'thorin', 'smaug'],
      complications: ['Limited time to find the door', 'The threat of waking Smaug', 'Thorin\'s growing obsession with the Arkenstone'],
      rewards: ['Access to Erebor', 'Potential recovery of the Arkenstone', 'First steps to reclaiming the kingdom'],
      location: 'erebor',
      levelRange: '7-9',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'slay-the-dragon',
      title: 'Slay the Dragon',
      description: 'Find a way to defeat Smaug and secure the treasure of Erebor.',
      status: 'active' as QuestStatus,
      background: 'With access to the mountain gained, the company must now deal with the dragon who guards the treasure.',
      objectives: [
        {
          id: 'obj5-1',
          description: 'Find Smaug\'s weakness',
          completed: false
        },
        {
          id: 'obj5-2',
          description: 'Alert Lake-town of the coming danger',
          completed: false
        },
        {
          id: 'obj5-3',
          description: 'Defeat or drive away Smaug',
          completed: false
        }
      ],
      leads: ['Rumors suggest Smaug has a vulnerable spot on his chest'],
      keyLocations: [
        { name: 'Treasury', description: 'The vast hall where Smaug sleeps on his hoard' },
        { name: 'Lake-town', description: 'The town on the Long Lake that may be in danger' }
      ],
      importantNPCs: [
        { name: 'Smaug', description: 'The terrifying dragon' },
        { name: 'Bard the Bowman', description: 'A skilled archer from Lake-town' }
      ],
      relatedNPCIds: ['bilbo', 'smaug', 'bard'],
      complications: ['Smaug\'s intelligence', 'The risk to Lake-town', 'The sheer power of the dragon'],
      rewards: ['Freedom from the dragon', 'Access to the treasure', 'Restoration of Erebor'],
      location: 'erebor',
      levelRange: '9-10',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    }
  ];
};

// Helper function to get quests for the Silmarillion campaign
const getSilmarillionQuests = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'creation-of-silmarils',
      title: 'Creation of the Silmarils',
      description: 'Witness the forging of the three jewels that will shape the destiny of Arda.',
      status: 'completed' as QuestStatus,
      background: 'Fëanor, greatest of the Noldor, seeks to capture the light of the Two Trees in three jewels of unparalleled beauty.',
      objectives: [
        {
          id: 'obj1-1',
          description: 'Gather materials for the Silmarils',
          completed: true
        },
        {
          id: 'obj1-2',
          description: 'Assist Fëanor in their crafting',
          completed: true
        },
        {
          id: 'obj1-3',
          description: 'Protect the completed jewels',
          completed: true
        }
      ],
      leads: ['The Silmarils attract the envy of Melkor'],
      keyLocations: [
        { name: 'Tirion', description: 'City of the Noldor in Valinor' },
        { name: 'Two Trees', description: 'Source of the light captured in the Silmarils' }
      ],
      importantNPCs: [
        { name: 'Fëanor', description: 'The brilliant craftsman who creates the Silmarils' },
        { name: 'Varda', description: 'The Vala who hallows the jewels' }
      ],
      relatedNPCIds: ['feanor', 'varda'],
      complications: ['The growing pride of Fëanor', 'Melkor\'s spreading of lies', 'The dispute with Fingolfin'],
      rewards: ['The completion of the Silmarils', 'Prestige among the Eldar', 'The blessing of the Valar'],
      location: 'valinor',
      levelRange: '1-3',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'oath-of-feanor',
      title: 'The Oath of Fëanor',
      description: 'Respond to the theft of the Silmarils and the darkening of Valinor.',
      status: 'completed' as QuestStatus,
      background: 'After Melkor destroys the Two Trees and steals the Silmarils, killing Finwë, Fëanor and his sons swear a terrible oath.',
      objectives: [
        {
          id: 'obj2-1',
          description: 'Confront the aftermath of Melkor\'s attack',
          completed: true
        },
        {
          id: 'obj2-2',
          description: 'Choose whether to follow Fëanor\'s rebellion',
          completed: true
        },
        {
          id: 'obj2-3',
          description: 'Participate in the Kinslaying at Alqualondë',
          completed: true
        }
      ],
      leads: ['The journey to Middle-earth to pursue Melkor, now called Morgoth'],
      keyLocations: [
        { name: 'Formenos', description: 'Fëanor\'s stronghold where Finwë was slain' },
        { name: 'Alqualondë', description: 'Haven of the Teleri, site of the first Kinslaying' }
      ],
      importantNPCs: [
        { name: 'Fëanor', description: 'Leader of the rebellion' },
        { name: 'Mandos', description: 'The Vala who pronounces doom upon the Noldor' }
      ],
      relatedNPCIds: ['feanor', 'melkor'],
      complications: ['The terrible oath and its consequences', 'The opposition of the Valar', 'The division among the Noldor'],
      rewards: ['Freedom from the rule of the Valar', 'The journey to Middle-earth', 'The pursuit of vengeance'],
      location: 'valinor',
      levelRange: '4-6',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'quest-for-silmaril',
      title: 'The Quest for a Silmaril',
      description: 'Join Beren and Lúthien in their quest to recover a Silmaril from Morgoth\'s crown.',
      status: 'completed' as QuestStatus,
      background: 'To win the hand of Lúthien, Beren must fulfill King Thingol\'s seemingly impossible demand: to bring him a Silmaril from Morgoth\'s crown.',
      objectives: [
        {
          id: 'obj3-1',
          description: 'Help Beren reach Doriath and meet Lúthien',
          completed: true
        },
        {
          id: 'obj3-2',
          description: 'Journey to Angband, fortress of Morgoth',
          completed: true
        },
        {
          id: 'obj3-3',
          description: 'Aid in the theft of the Silmaril',
          completed: true
        }
      ],
      leads: ['The success of this quest will give hope to the free peoples'],
      keyLocations: [
        { name: 'Doriath', description: 'Woodland realm of King Thingol' },
        { name: 'Angband', description: 'Fortress of Morgoth where the Silmarils are kept' }
      ],
      importantNPCs: [
        { name: 'Beren', description: 'Mortal man who loves Lúthien' },
        { name: 'Lúthien', description: 'Daughter of Thingol and Melian' },
        { name: 'Morgoth', description: 'The Dark Enemy who wears the Silmarils in his crown' }
      ],
      relatedNPCIds: ['beren', 'luthien', 'morgoth'],
      complications: ['The seemingly impossible task', 'The guard dog Carcharoth', 'The power of Morgoth'],
      rewards: ['A Silmaril', 'The union of Beren and Lúthien', 'A blow against Morgoth'],
      location: 'beleriand',
      levelRange: '7-9',
      dateAdded: formattedDate,
      dateCompleted: formattedDate,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'fall-of-gondolin',
      title: 'The Fall of Gondolin',
      description: 'Survive the siege and destruction of the last great Elven kingdom of the First Age.',
      status: 'active' as QuestStatus,
      background: 'Gondolin, the hidden city of Turgon, is betrayed to Morgoth by Maeglin, leading to its destruction by the forces of Angband.',
      objectives: [
        {
          id: 'obj4-1',
          description: 'Defend the walls against Morgoth\'s army',
          completed: true
        },
        {
          id: 'obj4-2',
          description: 'Battle against dragons and Balrogs in the city',
          completed: false
        },
        {
          id: 'obj4-3',
          description: 'Escort refugees through the secret way',
          completed: false
        }
      ],
      leads: ['The survivors must find a new sanctuary'],
      keyLocations: [
        { name: 'Gondolin', description: 'The hidden city under attack' },
        { name: 'Cirith Thoronath', description: 'Eagle\'s Cleft, the escape route from the city' }
      ],
      importantNPCs: [
        { name: 'Turgon', description: 'King of Gondolin who dies in its fall' },
        { name: 'Ecthelion', description: 'Lord who slays Gothmog, Lord of Balrogs' },
        { name: 'Glorfindel', description: 'Lord who fights a Balrog to protect the refugees' }
      ],
      relatedNPCIds: ['turgon', 'ecthelion', 'glorfindel'],
      complications: ['Overwhelming enemy forces', 'The need to protect civilians', 'The treachery of Maeglin'],
      rewards: ['Survival', 'Preservation of some of Gondolin\'s legacy', 'The escape of Eärendil'],
      location: 'gondolin',
      levelRange: '9-10',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'war-of-wrath',
      title: 'The War of Wrath',
      description: 'Participate in the final battle against Morgoth at the end of the First Age.',
      status: 'active' as QuestStatus,
      background: 'After the voyage of Eärendil, the Valar finally march against Morgoth, leading to the greatest battle in the history of Arda.',
      objectives: [
        {
          id: 'obj5-1',
          description: 'Join the Host of the Valar',
          completed: true
        },
        {
          id: 'obj5-2',
          description: 'Fight in the final assault on Angband',
          completed: false
        },
        {
          id: 'obj5-3',
          description: 'Witness the overthrow of Morgoth',
          completed: false
        }
      ],
      leads: ['The end of the First Age and the reshaping of Middle-earth'],
      keyLocations: [
        { name: 'Angband', description: 'Fortress of Morgoth, the final objective' },
        { name: 'Beleriand', description: 'The land that will sink beneath the sea in the cataclysm' }
      ],
      importantNPCs: [
        { name: 'Eönwë', description: 'Herald of Manwë, leader of the Host' },
        { name: 'Morgoth', description: 'The Dark Enemy who will be defeated' },
        { name: 'Ancalagon the Black', description: 'Greatest of the winged dragons' }
      ],
      relatedNPCIds: ['eonwe', 'morgoth', 'ancalagon'],
      complications: ['The sheer scale of the battle', 'The unleashing of the winged dragons', 'The breaking of Beleriand'],
      rewards: ['The defeat of Morgoth', 'Recovery of the remaining Silmarils', 'The dawn of a new age'],
      location: 'beleriand',
      levelRange: '10-12',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    }
  ];
};

// Helper function to get quests for the Dúnedain campaign
const getDunedainQuests = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'protect-the-north',
      title: 'Protect the North',
      description: 'Patrol the ancient lands of Arnor and defend settlements from increasing threats.',
      status: 'active' as QuestStatus,
      background: 'The Rangers of the North maintain a constant vigil over the lands of the former kingdom of Arnor, protecting the scattered villages from orcs, trolls, and other dangers.',
      objectives: [
        {
          id: 'obj1-1',
          description: 'Patrol the East Road and keep it safe for travelers',
          completed: true
        },
        {
          id: 'obj1-2',
          description: 'Investigate reports of troll activity in the Weather Hills',
          completed: false
        },
        {
          id: 'obj1-3',
          description: 'Eliminate the threat to nearby settlements',
          completed: false
        }
      ],
      leads: ['The trolls may be part of a larger pattern of evil creatures moving south'],
      keyLocations: [
        { name: 'Weather Hills', description: 'Where troll sightings have increased' },
        { name: 'Ranger Refuge', description: 'Hidden outpost used by the Rangers' }
      ],
      importantNPCs: [
        { name: 'Aragorn', description: 'Chieftain of the Dúnedain' },
        { name: 'Halbarad', description: 'Trusted lieutenant of Aragorn' }
      ],
      relatedNPCIds: ['aragorn-young', 'halbarad'],
      complications: ['The vast area to patrol', 'Limited Rangers to cover all threats', 'Keeping their identity secret'],
      rewards: ['Safety for the northern settlements', 'Preventing a larger incursion', 'Gathering intelligence on enemy movements'],
      location: 'arnor',
      levelRange: '3-5',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'protect-the-shire',
      title: 'Protect the Shire',
      description: 'Maintain the secret watch over the borders of the Shire to keep its inhabitants safe and unaware of outside dangers.',
      status: 'active' as QuestStatus,
      background: 'The Rangers have long guarded the borders of the Shire, though the hobbits remain largely unaware of their protectors.',
      objectives: [
        {
          id: 'obj2-1',
          description: 'Patrol the borders of the Shire',
          completed: true
        },
        {
          id: 'obj2-2',
          description: 'Track down a band of brigands threatening farmers',
          completed: false
        },
        {
          id: 'obj2-3',
          description: 'Eliminate the threat without alerting the hobbits',
          completed: false
        }
      ],
      leads: ['The brigands may have connections to agents of the Enemy'],
      keyLocations: [
        { name: 'Bounds of the Shire', description: 'The borders the Rangers patrol' },
        { name: 'Bree', description: 'Town where information can be gathered' }
      ],
      importantNPCs: [
        { name: 'Aragorn', description: 'Chieftain who places special importance on protecting the Shire' },
        { name: 'Butterbur', description: 'Innkeeper at the Prancing Pony who sometimes provides information' }
      ],
      relatedNPCIds: ['aragorn-young', 'butterbur'],
      complications: ['Maintaining secrecy', 'The hobbits\' obliviousness to danger', 'Limited resources'],
      rewards: ['Continued peace in the Shire', 'Keeping the hobbits safe', 'Fulfilling an ancient duty'],
      location: 'eriador',
      levelRange: '2-4',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'hunt-for-gollum',
      title: 'The Hunt for Gollum',
      description: 'Track down the creature Gollum to learn what he knows about the One Ring.',
      status: 'active' as QuestStatus,
      background: 'At Gandalf\'s request, Aragorn undertakes a search for Gollum, who possessed the One Ring for centuries and may have vital information.',
      objectives: [
        {
          id: 'obj3-1',
          description: 'Gather intelligence on Gollum\'s movements',
          completed: true
        },
        {
          id: 'obj3-2',
          description: 'Track him through the wilderness',
          completed: false
        },
        {
          id: 'obj3-3',
          description: 'Capture him alive and bring him to Mirkwood',
          completed: false
        }
      ],
      leads: ['Gollum may have been heading toward Mordor'],
      keyLocations: [
        { name: 'Dead Marshes', description: 'Where Gollum may be hiding' },
        { name: 'Mirkwood', description: 'Where Gollum should be delivered if captured' }
      ],
      importantNPCs: [
        { name: 'Gandalf', description: 'The wizard who requested the hunt' },
        { name: 'Gollum', description: 'The elusive creature being hunted' }
      ],
      relatedNPCIds: ['aragorn-young', 'gandalf', 'gollum'],
      complications: ['Gollum\'s cunning and evasiveness', 'The need to take him alive', 'The vast area to search'],
      rewards: ['Information about the Ring', 'Assisting Gandalf\'s investigation', 'Preventing Gollum from falling into enemy hands'],
      location: 'eriador',
      levelRange: '6-8',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'barrow-downs-haunting',
      title: 'The Haunting of the Barrow-downs',
      description: 'Investigate an increase in the activity of the Barrow-wights and protect travelers.',
      status: 'active' as QuestStatus,
      background: 'The ancient burial mounds known as the Barrow-downs have always been a place of dread, but recently the evil spirits known as Barrow-wights have become more aggressive.',
      objectives: [
        {
          id: 'obj4-1',
          description: 'Investigate increased Barrow-wight activity',
          completed: true
        },
        {
          id: 'obj4-2',
          description: 'Rescue travelers captured by the wights',
          completed: false
        },
        {
          id: 'obj4-3',
          description: 'Discover the source of the increased activity',
          completed: false
        }
      ],
      leads: ['The activity may be connected to a growing darkness in the East'],
      keyLocations: [
        { name: 'Barrow-downs', description: 'Ancient burial mounds haunted by evil spirits' },
        { name: 'Great Barrow', description: 'The largest and most dangerous of the burial mounds' }
      ],
      importantNPCs: [
        { name: 'Tom Bombadil', description: 'Mysterious figure who knows much about the Barrow-downs' },
        { name: 'Barrow-wights', description: 'Evil spirits that possess the dead' }
      ],
      relatedNPCIds: ['aragorn-young', 'barrow-wights'],
      complications: ['The supernatural nature of the threat', 'The bewildering magic of the downs', 'Rescuing victims before they are killed'],
      rewards: ['Safer travel near the downs', 'Ancient artifacts from the barrows', 'Knowledge about the growing darkness'],
      location: 'eriador',
      levelRange: '5-7',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    },
    {
      id: 'lost-heritage',
      title: 'Lost Heritage',
      description: 'Recover artifacts and knowledge from the fallen kingdom of Arnor.',
      status: 'active' as QuestStatus,
      background: 'The Rangers are the descendants of the people of Arnor, and they seek to preserve what remains of their heritage by recovering artifacts and documents from ruined cities and fortresses.',
      objectives: [
        {
          id: 'obj5-1',
          description: 'Locate the ruins of Annúminas, ancient capital of Arnor',
          completed: true
        },
        {
          id: 'obj5-2',
          description: 'Navigate the crumbling structures and potential dangers',
          completed: false
        },
        {
          id: 'obj5-3',
          description: 'Recover historical records and royal heirlooms',
          completed: false
        }
      ],
      leads: ['The recovered items will help preserve the legacy for a future restoration'],
      keyLocations: [
        { name: 'Annúminas', description: 'Ruined capital of Arnor by Lake Evendim' },
        { name: 'Ranger Refuge', description: 'Where recovered artifacts can be safely stored' }
      ],
      importantNPCs: [
        { name: 'Aragorn', description: 'Heir to the throne of both Arnor and Gondor' },
        { name: 'Elder Ranger', description: 'Keeper of the history and traditions of the Dúnedain' }
      ],
      relatedNPCIds: ['aragorn-young', 'elder-ranger'],
      complications: ['Dangerous ruins', 'Brigands who may have claimed the area', 'The fragility of ancient artifacts'],
      rewards: ['Preservation of the Dúnedain heritage', 'Recovery of powerful artifacts', 'Knowledge that may aid in future restoration'],
      location: 'arnor',
      levelRange: '4-6',
      dateAdded: formattedDate,
      dateCompleted: null,
      createdBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateModified: formattedDate,
      modifiedBy: dmUid,
      modifiedByUsername: 'DungeonMaster'
    }
  ];
};