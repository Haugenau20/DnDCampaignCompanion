// src/utils/__dev__/generators/contentGenerators/sagaGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from '../userGenerator';
import { SagaData } from '../../../../types/saga';

// Create a saga for a specific campaign
export const createSaga = async (
  db: any,
  groupId: string,
  campaignId: string,
  userMapping: UserMapping,
  formattedDate: string
) => {
  // Define saga data based on the campaign
  let sagaData;
  
  if (campaignId === 'campaign1-1') {
    // LOTR Campaign Saga
    sagaData = {
      id: 'sagaData',
      title: 'The War of the Ring',
      content: 'The epic story of the Fellowship\'s quest to destroy the One Ring and save Middle-earth from the darkness of Sauron. Beginning with the departure from the Shire, this saga chronicles the journey through Middle-earth, the breaking of the Fellowship, and the final confrontation at Mount Doom.\n\nAgainst seemingly impossible odds, a small hobbit named Frodo Baggins carries the fate of all free peoples on his shoulders. With his loyal companion Sam and the guidance of Gandalf, he must resist the corrupting influence of the Ring while the forces of good and evil clash across the lands.\n\nMeanwhile, Aragorn, heir to the throne of Gondor, must embrace his destiny and unite the peoples of Middle-earth against Sauron\'s armies. Along with Legolas, Gimli, and the remaining members of the Fellowship, they fight to give Frodo the chance he needs to complete his quest.',
      lastUpdated: formattedDate,
      version: '1.0'
    };
  } else if (campaignId === 'campaign1-2') {
    // The Hobbit Campaign Saga
    sagaData = {
      id: 'sagaData',
      title: 'There and Back Again',
      content: 'The unexpected adventure of Bilbo Baggins, a respectable hobbit who is swept into a quest to reclaim the lost Dwarf Kingdom of Erebor from the fearsome dragon Smaug. Recruited by the wizard Gandalf to join thirteen dwarves led by the legendary warrior Thorin Oakenshield, Bilbo finds himself in a journey through treacherous lands far beyond the comfort of the Shire.\n\nAlong the way, Bilbo encounters trolls, goblins, giant spiders, and wood elves, and finds himself transformed from a reluctant participant into a crucial member of the company. His greatest discovery, however, comes in the dark tunnels beneath the Misty Mountains: a mysterious ring that grants invisibility to its wearer.\n\nAs the company reaches the Lonely Mountain and confronts the dragon, they unwittingly set in motion events that will lead to the Battle of Five Armies, where the future of Middle-earth itself hangs in the balance.',
      lastUpdated: formattedDate,
      version: '1.0'
    };
  } else if (campaignId === 'campaign2-1') {
    // Silmarillion Campaign Saga
    sagaData = {
      id: 'sagaData',
      title: 'The Jewels of Fëanor',
      content: 'This saga chronicles the earliest days of Arda, from the Music of the Ainur that created the world to the end of the First Age. It centers on the Silmarils, three perfect jewels crafted by Fëanor that contained the light of the Two Trees of Valinor.\n\nWhen Melkor, the first and greatest of the dark powers, steals the Silmarils and destroys the Two Trees, Fëanor and his sons swear a terrible oath to recover the jewels at any cost. This oath leads the Noldor Elves to rebel against the Valar, commit the first Kinslaying, and depart from Valinor to Middle-earth.\n\nIn Middle-earth, the Noldor establish kingdoms and wage a long, ultimately doomed war against Melkor (now called Morgoth). The saga includes the tragic tales of Beren and Lúthien, Túrin Turambar, and the fall of great elven kingdoms like Gondolin. It concludes with the War of Wrath, when the Valar finally intervene, defeat Morgoth, and fundamentally change the shape of the world.',
      lastUpdated: formattedDate,
      version: '1.0'
    };
  } else if (campaignId === 'campaign2-2') {
    // Tales of the Dúnedain Campaign Saga
    sagaData = {
      id: 'sagaData',
      title: 'Guardians of the North',
      content: 'This saga follows the Rangers of the North, descendants of the lost kingdom of Arnor and heirs to a proud legacy. Though their kingdom has fallen, the Dúnedain continue their ancient duty to protect the lands and peoples of the North from the shadows that threaten them.\n\nLed by their chieftain Aragorn, son of Arathorn, these grim wanderers patrol the wild lands of Eriador, from the Weather Hills to the borders of the Shire. They keep watch over ancient ruins where evil may lurk, defend villages from marauders, and preserve the lore and artifacts of their heritage against the day when the kingdom might be restored.\n\nAs darkness grows again in the East, the Rangers find themselves stretched thin, battling increased threats from orcs, trolls, and more mysterious enemies. Their greatest challenge may not be the foes they face, but maintaining hope for a future that seems ever more distant, while the memory of their glory fades among the people they silently protect.',
      lastUpdated: formattedDate,
      version: '1.0'
    };
  }
  
  // Create the saga in Firestore
  if (sagaData) {
    await setDoc(doc(db, 'groups', groupId, 'campaigns', campaignId, 'saga', sagaData.id), sagaData);
    console.log(`Created saga for ${campaignId}: ${sagaData.title}`);
  }
  
  return sagaData;
};