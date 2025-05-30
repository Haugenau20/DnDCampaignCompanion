// src/utils/__dev__/generators/contentGenerators/chapterGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from '../userGenerator';
import { Chapter as AppChapter } from '../../../../types/story';

interface ChapterData extends Omit<AppChapter, 'dateModified'> {
    dateModified: string;
  }

// Create chapters with various content based on the campaign
export const createChapters = async (
  db: any, 
  groupId: string, 
  campaignId: string, 
  userMapping: UserMapping,
  formattedDate: string
) => {
  // Get the Dungeon Master's UID
  const dmUid = userMapping['dm'];
  
  // Define chapters based on the campaign
  let chaptersData: ChapterData[] = [];
  
  if (campaignId === 'campaign1-1') {
    // LOTR Campaign - 30 chapters
    chaptersData = getLOTRChapters(dmUid, formattedDate);
  } else if (campaignId === 'campaign1-2') {
    // The Hobbit Campaign
    chaptersData = getHobbitChapters(dmUid, formattedDate);
  } else if (campaignId === 'campaign2-1') {
    // Silmarillion Campaign
    chaptersData = getSilmarillionChapters(dmUid, formattedDate);
  } else if (campaignId === 'campaign2-2') {
    // Tales of the Dúnedain Campaign
    chaptersData = getDunedainChapters(dmUid, formattedDate);
  }
  
  // Create the chapters in Firestore
  for (const chapter of chaptersData) {
    await setDoc(doc(db, 'groups', groupId, 'campaigns', campaignId, 'chapters', chapter.id), chapter);
    console.log(`Created chapter for ${campaignId}: ${chapter.title}`);
  }
  
  return chaptersData;
};

// Helper function to get 30 chapters for The Lord of the Rings campaign
const getLOTRChapters = (dmUid: string, formattedDate: string) => {
  return [
    // Book 1: The Fellowship of the Ring Part 1
    {
      id: 'chapter-01',
      title: 'A Long-expected Party',
      content: 'The chapter begins with preparations for Bilbo Baggins\'s eleventy-first (111th) birthday party. Bilbo had acquired a reputation as being a bit odd after his adventure with the dwarves, and his continued youthfulness despite his age adds to this perception. At the party, Bilbo gives a speech and then uses his magic ring to disappear, shocking the guests. He leaves the Shire permanently, leaving all his possessions, including the ring, to his nephew and heir Frodo Baggins.',
      order: 1,
      subChapters: [
        {
          id: 'subchapter1-1',
          title: 'Concerning Bilbo\'s Birthday',
          content: 'The preparations and anticipation for Bilbo\'s grand eleventy-first birthday celebration that has the whole Shire talking.',
          order: 1,
          createdBy: dmUid,
          createdByUsername: 'DungeonMaster',
          dateAdded: formattedDate
        },
        {
          id: 'subchapter1-2',
          title: 'The Disappearance',
          content: 'Bilbo\'s shocking departure and the confusion that follows when he uses the Ring to vanish during his speech.',
          order: 2,
          createdBy: dmUid,
          createdByUsername: 'DungeonMaster',
          dateAdded: formattedDate
        }
      ],
      dateModified: formattedDate,
      summary: 'Bilbo\'s birthday party and mysterious departure from the Shire.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-02',
      title: 'The Shadow of the Past',
      content: 'Seventeen years pass with Frodo living comfortably in Bag End. Gandalf returns with grave news about Frodo\'s magic ring - it is the One Ring, created by the Dark Lord Sauron. He explains the history of the Ring and how it was lost for millennia before being found by Gollum and then Bilbo. Gandalf warns that Sauron has learned that the Ring is in the possession of a hobbit named Baggins in the Shire, and his servants, the Ringwraiths, will be searching for it. Frodo decides he must leave the Shire to protect it and its people.',
      order: 2,
      dateModified: formattedDate,
      summary: 'Gandalf reveals the true nature of the Ring and the threat it poses.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-03',
      title: 'Three is Company',
      content: 'Frodo prepares to leave the Shire, selling Bag End to the Sackville-Bagginses as a cover for his departure. He takes along his gardener and friend Samwise Gamgee, who was caught eavesdropping on Frodo\'s conversation with Gandalf about the Ring. They are also joined by Frodo\'s cousin, Peregrin Took (Pippin). As they travel, they narrowly avoid a Black Rider and later encounter Elves led by Gildor Inglorion, who provide them with food, shelter, and cryptic advice.',
      order: 3,
      dateModified: formattedDate,
      summary: 'Frodo begins his journey out of the Shire with Sam and Pippin.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-04',
      title: 'A Short Cut to Mushrooms',
      content: 'The hobbits continue their journey through the Shire, taking a shortcut through Farmer Maggot\'s land. Frodo is apprehensive as he had stolen mushrooms from the farmer in his youth. However, Farmer Maggot welcomes them and reveals that a Black Rider had come asking about Frodo earlier. The hobbits are alarmed by this news. Farmer Maggot gives them dinner and then takes them by wagon to the Bucklebury Ferry to help them on their way. Along the road, they meet Frodo\'s cousin Meriadoc Brandybuck (Merry), who has been waiting for them.',
      order: 4,
      dateModified: formattedDate,
      summary: 'The hobbits encounter Farmer Maggot and learn more about the pursuing Black Riders.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-05',
      title: 'A Conspiracy Unmasked',
      content: 'The hobbits arrive at Frodo\'s new house in Crickhollow, Buckland. After dinner, Merry, Pippin, and Sam reveal to Frodo that they know about the Ring and his plan to leave the Shire. They have been preparing for the journey and intend to accompany him. Frodo is deeply moved by their loyalty. They decide to leave through the Old Forest the next morning instead of by road, hoping to evade the Black Riders who would expect them to take the main road.',
      order: 5,
      dateModified: formattedDate,
      summary: 'Frodo discovers his friends know about his quest and plan to accompany him.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-06',
      title: 'The Old Forest',
      content: 'The hobbits enter the Old Forest, an ancient and unwelcoming place that seems to be conscious and malevolent. The forest paths shift and change, forcing the hobbits toward the center of the forest. They come upon the Withywindle river and begin to feel unnaturally sleepy. Merry and Pippin fall asleep against a large willow tree called Old Man Willow, which traps them in cracks in its trunk. Frodo is pushed into the river, and Sam barely escapes. When their attempts to free Merry and Pippin fail, Frodo desperately calls for help, and they are rescued by the mysterious Tom Bombadil.',
      order: 6,
      dateModified: formattedDate,
      summary: 'The hobbits face the dangers of the Old Forest and encounter Old Man Willow.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-07',
      title: 'In the House of Tom Bombadil',
      content: 'Tom Bombadil takes the hobbits to his house, where they meet his wife, Goldberry. Tom is a merry and enigmatic figure who seems unaffected by the Ring\'s power. He tells the hobbits stories and songs about the Old Forest and the Barrow-downs. The hobbits spend two nights at Tom\'s house, resting and recovering from their ordeal in the forest. Before they leave, Tom teaches them a rhyme to call him if they need help and warns them about the Barrow-downs.',
      order: 7,
      dateModified: formattedDate,
      summary: 'The hobbits find respite with the mysterious Tom Bombadil and Goldberry.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-08',
      title: 'Fog on the Barrow-downs',
      content: 'Leaving Tom Bombadil\'s house, the hobbits cross the Barrow-downs, an ancient burial ground. They are caught in a thick fog and become separated. Frodo wakes alone and realizes he has been captured by a Barrow-wight, one of the evil spirits haunting the tombs. He finds his friends laid out like corpses, dressed in white with gold and jewels, and a sword across their necks. Remembering Tom\'s rhyme, Frodo calls for help. Tom arrives, dispels the Barrow-wight, and revives the other hobbits. Tom gives each hobbit a dagger from the Barrow-wight\'s treasure and escorts them to the edge of his lands on the East Road.',
      order: 8,
      dateModified: formattedDate,
      summary: 'The hobbits face the terrifying Barrow-wights but are saved by Tom Bombadil.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-09',
      title: 'At the Sign of the Prancing Pony',
      content: 'The hobbits arrive at the village of Bree and check into The Prancing Pony inn, run by Barliman Butterbur. They meet the locals in the common room, where Frodo accidentally puts on the Ring while singing a song, causing him to disappear. This draws unwanted attention. A weather-beaten Ranger known as Strider approaches Frodo and warns him about his carelessness. Butterbur remembers a letter from Gandalf that he was supposed to send to Frodo months ago but forgot. The letter warns Frodo to leave the Shire immediately and says that Strider (whose real name is given as Aragorn) is an ally.',
      order: 9,
      dateModified: formattedDate,
      summary: 'The hobbits reach Bree and meet Aragorn, who calls himself Strider.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-10',
      title: 'Strider',
      content: 'Strider warns the hobbits that the Black Riders (Ringwraiths) are in Bree and offers to guide them to Rivendell. Though initially suspicious, the hobbits decide to trust him after reading Gandalf\'s letter. They learn that their rooms at the inn have been ransacked, so they spend the night in Strider\'s room for safety. Strider reveals more about the Ringwraiths: they were once great kings of Men who were corrupted by Rings of Power given to them by Sauron.',
      order: 10,
      dateModified: formattedDate,
      summary: 'Aragorn offers to guide the hobbits to Rivendell and explains more about the Ringwraiths.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-11',
      title: 'A Knife in the Dark',
      content: 'Strider leads the hobbits out of Bree the next morning. They learn that their ponies were stolen in the night, forcing them to buy a pack pony from Bill Ferny at an exorbitant price. They take an indirect route to avoid the main road. Several days into their journey, they reach Weathertop, an ancient watchtower. From there, they spot five Black Riders approaching. That night, the Ringwraiths attack their camp. The Witch-king, leader of the Ringwraiths, stabs Frodo with a Morgul blade before Strider drives them off with fire. Though the physical wound is small, it is a grievous magical wound that threatens to turn Frodo into a wraith.',
      order: 11,
      dateModified: formattedDate,
      summary: 'The Ringwraiths attack at Weathertop, and Frodo is wounded by a Morgul blade.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-12',
      title: 'Flight to the Ford',
      content: 'Strider and the hobbits continue toward Rivendell with increased urgency due to Frodo\'s worsening condition. Frodo is in great pain from his wound, which is slowly turning him into a wraith. They meet Glorfindel, an Elf-lord sent from Rivendell to find them. He puts Frodo on his swift horse, Asfaloth, and sends him ahead as the Ringwraiths approach. Frodo reaches the Ford of Bruinen just ahead of the pursuing Ringwraiths. As they enter the river to capture him, a great flood comes down the river, sweeping the Ringwraiths away. Frodo loses consciousness as Glorfindel and Strider catch up to him.',
      order: 12,
      dateModified: formattedDate,
      summary: 'The race to Rivendell as Frodo\'s wound worsens, culminating in the crossing of the Ford.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    
    // Book 2: The Fellowship of the Ring Part 2
    {
      id: 'chapter-13',
      title: 'Many Meetings',
      content: 'Frodo awakens in Rivendell to find Gandalf at his bedside. He learns that he has been unconscious for several days while Elrond, the lord of Rivendell, healed his wound. Gandalf explains that he was delayed in coming to the Shire because he was imprisoned by Saruman, the head of his order who has betrayed them and now desires the Ring for himself. Frodo is reunited with Bilbo, who has aged visibly since giving up the Ring. They attend a feast where Frodo meets many important people including Glóin the dwarf and Elrond himself.',
      order: 13,
      dateModified: formattedDate,
      summary: 'Frodo recovers in Rivendell and is reunited with Bilbo and Gandalf.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-14',
      title: 'The Council of Elrond',
      content: 'Elrond calls a council of representatives from the free peoples of Middle-earth. They share news and discuss the growing threat of Sauron. Gandalf reveals Saruman\'s betrayal. Glóin reports that a messenger from Mordor has approached the dwarves, seeking information about hobbits and Bilbo\'s ring. Boromir of Gondor describes his prophetic dream that led him to seek Elrond\'s counsel. The history of the One Ring is told in full, and they debate what to do with it. They conclude that the Ring must be destroyed by casting it into the fires of Mount Doom in Mordor, where it was forged. Frodo volunteers to take the Ring, and companions are chosen to accompany him: the Fellowship of the Ring, consisting of Frodo, Sam, Merry, Pippin, Gandalf, Aragorn, Boromir, Legolas the elf, and Gimli the dwarf.',
      order: 14,
      dateModified: formattedDate,
      summary: 'The fate of the Ring is decided, and the Fellowship of the Ring is formed.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-15',
      title: 'The Ring Goes South',
      content: 'The Fellowship prepares for their journey while scouts are sent out to gather news. They leave Rivendell two months after the Council, heading south. Gandalf plans to lead them over the Misty Mountains through the Redhorn Gate and then through the land of Hollin. As they travel, Gandalf and Aragorn express concern about spies and growing danger. They attempt to cross the mountains via the Redhorn Pass but are thwarted by a fierce snowstorm, which they suspect may be caused by some malevolent force. Unable to proceed, they are forced to turn back.',
      order: 15,
      dateModified: formattedDate,
      summary: 'The Fellowship begins their journey south but is thwarted by the weather in the mountains.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-16',
      title: 'A Journey in the Dark',
      content: 'With the mountain pass blocked, Gandalf reluctantly decides that they must take the dark path through the Mines of Moria, an ancient dwarf kingdom now abandoned. Aragorn warns against this route but agrees there is no alternative. As they approach the western gate of Moria, they are attacked by a tentacled creature in the water, the Watcher in the Water, which nearly captures Frodo. They find the doors to Moria, which are opened by Gandalf solving a riddle. Inside, they discover the remains of dwarves slain in a battle long ago. They realize they are trapped when the Watcher destroys the doors behind them, forcing them to journey through the dark mines.',
      order: 16,
      dateModified: formattedDate,
      summary: 'The Fellowship enters the dark Mines of Moria, where danger lurks in the shadows.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-17',
      title: 'The Bridge of Khazad-dûm',
      content: 'The Fellowship journeys through Moria for several days, guided by Gandalf\'s dim memory of the paths. They find the tomb of Balin, the dwarf lord who attempted to recolonize Moria, and discover from a damaged book that his colony was overrun by orcs. They are attacked by orcs and a cave troll but manage to fight them off and flee toward the eastern exit. As they approach the Bridge of Khazad-dûm, a narrow stone bridge over a deep chasm, they are confronted by a Balrog, an ancient demon of fire and shadow. Gandalf faces the Balrog on the bridge and breaks it with his staff, causing both the Balrog and himself to fall into the abyss. The rest of the Fellowship, grief-stricken, escapes from Moria.',
      order: 17,
      dateModified: formattedDate,
      summary: 'The Fellowship faces orcs and the Balrog, and Gandalf falls into the abyss.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-18',
      title: 'Lothlórien',
      content: 'The remaining Fellowship enters the forest of Lothlórien, an elven realm ruled by Lady Galadriel and Lord Celeborn. There is initial suspicion due to Gimli being a dwarf and the poor relations between elves and dwarves, but they are eventually welcomed. They mourn for Gandalf and rest from their journey. The elves give them shelter in a tree-city, and they meet with Galadriel and Celeborn, who offer them sanctuary. Galadriel tests each member of the Fellowship by showing them visions of what might be if they were to fail or succeed in their quest, tempting them with their deepest desires.',
      order: 18,
      dateModified: formattedDate,
      summary: 'The Fellowship finds sanctuary in the elven forest of Lothlórien.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-19',
      title: 'The Mirror of Galadriel',
      content: 'Lady Galadriel shows Frodo and Sam her Mirror, a basin of water in which one can see visions of things that were, things that are, and some things that may yet come to pass. Sam sees a vision of the Shire being industrialized and polluted, while Frodo sees the Eye of Sauron searching for the Ring. Galadriel tells Frodo that she knows he offers her the One Ring, and she confesses that she has desired it for a long time. However, she passes the test and refuses it, saying she will "diminish and go into the West, and remain Galadriel." Frodo then understands that, despite her power, she too has been fighting a long battle against Sauron.',
      order: 19,
      dateModified: formattedDate,
      summary: 'Frodo and Sam see visions in Galadriel\'s Mirror, and she refuses the Ring.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-20',
      title: 'Farewell to Lórien',
      content: 'After a month in Lothlórien, the Fellowship prepares to continue their journey. The elves provide them with boats, food, and gifts. Galadriel gives each member of the Fellowship a personal gift: to Aragorn, a sheath for his sword and a green stone; to Boromir, a gold belt; to Merry and Pippin, silver belts; to Legolas, a bow; to Sam, a box of earth from her garden; to Gimli, three strands of her hair; and to Frodo, a phial containing the light of Eärendil\'s star. They depart in boats down the River Anduin, with Sauron\'s realm of Mordor to the east and the realm of Gondor to the south.',
      order: 20,
      dateModified: formattedDate,
      summary: 'The Fellowship receives gifts from the elves and departs down the Great River.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-21',
      title: 'The Great River',
      content: 'The Fellowship travels south on the River Anduin in the elven boats. They are pursued by Gollum, who has been tracking them since Moria. They also spot a large winged creature, which Legolas shoots down but cannot identify in the darkness. As they approach the rapids of Sarn Gebir, they are attacked by orcs from the eastern shore, but manage to escape. Legolas spots and shoots down a winged Nazgûl, confirming that the Ringwraiths have returned in a new form. They pass the Argonath, two enormous statues of kings of old, marking the northern border of Gondor.',
      order: 21,
      dateModified: formattedDate,
      summary: 'The Fellowship faces dangers on the river, including pursuit by Gollum and attacks by orcs.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-22',
      title: 'The Breaking of the Fellowship',
      content: 'The Fellowship reaches Parth Galen, a grassy area near the foot of Amon Hen, and must decide whether to go to Mordor directly or to go to Minas Tirith in Gondor first. Boromir attempts to take the Ring from Frodo, driven by a desire to use it to defend his people. Frodo uses the Ring to escape and decides he must go to Mordor alone to protect the others from the Ring\'s influence. Sam deduces Frodo\'s plan and follows him. Meanwhile, the rest of the Fellowship is attacked by Uruk-hai, servants of Saruman seeking to capture the Ring-bearer. Boromir dies defending Merry and Pippin, who are captured. Aragorn, Legolas, and Gimli decide to pursue the orcs to rescue the hobbits, while Frodo and Sam set off for Mordor alone.',
      order: 22,
      dateModified: formattedDate,
      summary: 'Boromir tries to take the Ring, Frodo decides to go to Mordor alone with Sam, and the Fellowship is broken.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    
    // Book 3: The Two Towers Part 1
    {
      id: 'chapter-23',
      title: 'The Departure of Boromir',
      content: 'Aragorn finds Boromir dying, pierced by many arrows. Before he dies, Boromir confesses that he tried to take the Ring from Frodo and that the orcs have taken Merry and Pippin. He dies, and Aragorn, Legolas, and Gimli place his body in one of the elven boats with his weapons and the horn of Gondor, now cloven in two, and send it over the Falls of Rauros. They decide to pursue the orcs who have taken Merry and Pippin rather than follow Frodo, believing that he has gone with Sam to complete the quest alone.',
      order: 23,
      dateModified: formattedDate,
      summary: 'Boromir dies, and Aragorn, Legolas, and Gimli decide to pursue the orcs who captured Merry and Pippin.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-24',
      title: 'The Riders of Rohan',
      content: 'Aragorn, Legolas, and Gimli pursue the orcs across the plains of Rohan for three days. They encounter a company of Riders of Rohan led by Éomer, nephew of King Théoden. Éomer tells them that the Riders attacked and destroyed the orcs the previous night but saw no hobbits. He lends them horses and they ride to the edge of Fangorn Forest, where they find the remains of the orcs. They discover hobbit tracks leading into the forest and decide to follow, despite the forest\'s fearsome reputation.',
      order: 24,
      dateModified: formattedDate,
      summary: 'The three hunters meet the Riders of Rohan and track the hobbits to Fangorn Forest.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-25',
      title: 'The White Rider',
      content: 'In Fangorn Forest, Aragorn, Legolas, and Gimli encounter a figure in white whom they initially fear is Saruman. To their joy, it is revealed to be Gandalf, returned from death as Gandalf the White. He explains that he defeated the Balrog but also died, and was sent back with enhanced powers to complete his task. He tells them that Merry and Pippin are safe with Treebeard, the leader of the Ents (tree-shepherds). Gandalf plans to go to Edoras to aid King Théoden against Saruman\'s influence, and the others agree to accompany him.',
      order: 25,
      dateModified: formattedDate,
      summary: 'Aragorn, Legolas, and Gimli are reunited with Gandalf, now returned as Gandalf the White.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-26',
      title: 'The King of the Golden Hall',
      content: 'Gandalf, Aragorn, Legolas, and Gimli arrive at Edoras, the capital of Rohan, where they find King Théoden under the malevolent influence of his advisor, Gríma Wormtongue, who secretly serves Saruman. Gandalf frees Théoden from this influence, and the king regains his strength and will. Wormtongue is expelled from Edoras. Théoden decides to lead his people to the fortress of Helm\'s Deep, as war with Saruman is imminent. Gandalf leaves on a mysterious errand, promising to return.',
      order: 26,
      dateModified: formattedDate,
      summary: 'Gandalf frees King Théoden from Saruman\'s influence, and the people of Edoras prepare for war.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-27',
      title: 'Helm\'s Deep',
      content: 'The people of Edoras travel to Helm\'s Deep, a fortress in the mountains. On the way, they are attacked by Wargs (wolf-like creatures) ridden by orcs, but they fend off the attack. At Helm\'s Deep, they prepare for a siege as Saruman\'s army approaches. The battle begins, and despite their valor, the defenders are overwhelmed by the sheer numbers of the enemy. Just as all seems lost, Gandalf arrives with a large force of Riders led by Éomer, turning the tide of battle. Also, the mysterious Huorns (tree-like beings) from Fangorn Forest arrive and destroy the fleeing orcs.',
      order: 27,
      dateModified: formattedDate,
      summary: 'The Battle of Helm\'s Deep, where the forces of Rohan face Saruman\'s army.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-28',
      title: 'The Road to Isengard',
      content: 'After their victory at Helm\'s Deep, Gandalf leads Théoden, Aragorn, Legolas, and Gimli to Isengard, Saruman\'s stronghold. They find that the Ents, led by Treebeard, have destroyed Isengard, flooding it and trapping Saruman in the tower of Orthanc. They are happily reunited with Merry and Pippin, who are relaxing amidst the ruins, smoking and eating. The hobbits tell the story of their escape from the orcs and their role in the Ents\' decision to attack Isengard.',
      order: 28,
      dateModified: formattedDate,
      summary: 'After the battle, they journey to Isengard to find it destroyed by the Ents.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-29',
      title: 'Flotsam and Jetsam',
      content: 'Merry and Pippin provide a more detailed account of their adventures since being captured by the orcs. They describe their escape into Fangorn Forest, their meeting with Treebeard, and how they convinced the Ents to go to war against Saruman. They also explain how they found comfort in the storerooms of Isengard, including pipe-weed from the Shire, suggesting some connection between Saruman and the troubles brewing in the hobbits\' homeland.',
      order: 29,
      dateModified: formattedDate,
      summary: 'Merry and Pippin recount their adventures with the Ents and the attack on Isengard.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-30',
      title: 'The Voice of Saruman',
      content: 'Gandalf, Théoden, and their companions confront Saruman at the tower of Orthanc. Saruman attempts to sway them with his persuasive voice, first appealing to Théoden to make peace and then trying to manipulate Gandalf into sharing power. Gandalf rejects his false offers and breaks Saruman\'s staff, casting him from the order of wizards and the White Council. Wormtongue, who has been hiding in the tower with Saruman, throws down a heavy stone (the palantír, a seeing-stone) in an attempt to hit Gandalf, but misses. Pippin retrieves the palantír, but Gandalf quickly takes it from him. The company prepares to return to Edoras.',
      order: 30,
      dateModified: formattedDate,
      summary: 'The confrontation with Saruman at Orthanc, and the recovery of the palantír.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    
    // Book 4: The Two Towers Part 2 - Starting point for additional chapters if needed
    {
      id: 'chapter-31',
      title: 'The Taming of Sméagol',
      content: 'Frodo and Sam make their way through the rocky terrain of the Emyn Muil, trying to find a path to Mordor. They realize they are being followed by Gollum, who wants to reclaim the Ring. They capture Gollum, and Frodo makes him swear on the Ring to guide them to Mordor. Gollum, or Sméagol as Frodo calls him, reluctantly agrees, showing signs of an internal struggle between his desire for the Ring and a remnant of his former self that responds to Frodo\'s kindness.',
      order: 31,
      dateModified: formattedDate,
      summary: 'Frodo and Sam capture Gollum, who agrees to guide them to Mordor.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-32',
      title: 'The Passage of the Marshes',
      content: 'Gollum leads Frodo and Sam through the Dead Marshes, a treacherous swamp filled with the corpses of warriors who died in an ancient battle. The lights in the marshes (candles of corpses) attempt to lure travelers to their doom. A flying Nazgûl passes overhead, causing them to hide. Frodo notices that the Ring is becoming increasingly heavy, and he feels the Eye of Sauron searching for him.',
      order: 32,
      dateModified: formattedDate,
      summary: 'The dangerous journey through the Dead Marshes under Gollum\'s guidance.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    }
  ];
};

// Helper function to get chapters for The Hobbit campaign
const getHobbitChapters = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'chapter-01',
      title: 'An Unexpected Party',
      content: 'Bilbo Baggins is visited by Gandalf and a company of dwarves who seek a burglar for their quest to reclaim the Lonely Mountain.',
      order: 1,
      dateModified: formattedDate,
      summary: 'Bilbo joins the dwarves on their adventure.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-02',
      title: 'Roast Mutton',
      content: 'The company sets out on their journey. When Gandalf temporarily leaves them, they encounter three trolls who capture them. Gandalf returns just in time and tricks the trolls into staying outside until dawn, when they turn to stone. The company finds the trolls\' cave and takes valuable items from their hoard, including elvish swords.',
      order: 2,
      dateModified: formattedDate,
      summary: 'An encounter with trolls and the discovery of elvish weapons.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-03',
      title: 'A Short Rest',
      content: 'The company arrives at Rivendell, the Last Homely House East of the Sea, where they receive food, rest, advice, and supplies from Elrond. Elrond examines the swords from the trolls\' cave and identifies them as famous blades from Gondolin. He also reads the moon-letters on Thorin\'s map, revealing the secret entrance to the Lonely Mountain.',
      order: 3,
      dateModified: formattedDate,
      summary: 'Rest and guidance in Rivendell with the revelation of the secret door.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-04',
      title: 'Over Hill and Under Hill',
      content: 'The company crosses the Misty Mountains. During a thunderstorm, they take shelter in a cave that turns out to be the front porch of a goblin-town. The goblins capture the company, but Gandalf kills the Great Goblin and leads an escape. In the confusion, Bilbo is separated from the others.',
      order: 4,
      dateModified: formattedDate,
      summary: 'Capture by goblins in the Misty Mountains and Bilbo\'s separation from the group.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-05',
      title: 'Riddles in the Dark',
      content: 'Lost in the goblin tunnels, Bilbo finds a ring and puts it in his pocket. He encounters Gollum, a strange creature who challenges him to a riddle contest. If Bilbo wins, Gollum will show him the way out; if Gollum wins, he will eat Bilbo. After several riddles, Bilbo accidentally asks "What have I got in my pocket?" which Gollum cannot answer. Gollum realizes Bilbo has his precious ring and becomes hostile. Bilbo discovers the ring makes him invisible when worn and uses it to escape Gollum and the goblins, eventually rejoining the dwarves and Gandalf outside.',
      order: 5,
      dateModified: formattedDate,
      summary: 'Bilbo finds the One Ring and engages in a battle of riddles with Gollum.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-06',
      title: 'Out of the Frying-Pan into the Fire',
      content: 'The company is pursued by goblins and wargs (evil wolves). They climb trees to escape, but the goblins set the trees on fire. The eagles rescue them and carry them to their eyrie. The next day, the eagles fly them to the Carrock, a rock formation in the Great River.',
      order: 6,
      dateModified: formattedDate,
      summary: 'Escape from goblins and wargs with the help of the great eagles.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-07',
      title: 'Queer Lodgings',
      content: 'The company stays with Beorn, a skin-changer who can transform into a great bear. Initially suspicious, Beorn grows to like the company and provides them with food, advice, and ponies for their journey to Mirkwood. He warns them about the dangers of the forest and advises them not to stray from the path.',
      order: 7,
      dateModified: formattedDate,
      summary: 'Respite with Beorn and preparation for the journey through Mirkwood.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-08',
      title: 'Flies and Spiders',
      content: 'The company enters Mirkwood, a dark and dangerous forest. Gandalf leaves them at the forest-gate on urgent business elsewhere. They journey for days through the oppressive forest. When their food runs low, they leave the path against Beorn\'s advice to investigate lights in the forest. These turn out to be wood-elves feasting, but the elves disappear when approached. The company gets hopelessly lost and is attacked by giant spiders. Bilbo uses his ring to become invisible, names his sword Sting, and rescues the dwarves from the spiders. However, while fighting the spiders, the dwarves are captured by wood-elves. Invisible Bilbo follows them.',
      order: 8,
      dateModified: formattedDate,
      summary: 'Lost in Mirkwood, the company battles giant spiders before the dwarves are captured by elves.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-09',
      title: 'Barrels Out of Bond',
      content: 'The Wood-elves imprison the dwarves in their underground palace, but Bilbo, invisible with his ring, evades capture. After weeks of exploring the palace, Bilbo discovers that empty wine barrels are dropped through a trapdoor into the river to be floated to Lake-town. He helps the dwarves escape by packing them into barrels, which are then released through the trapdoor. Bilbo rides on top of a barrel as they float down the river.',
      order: 9,
      dateModified: formattedDate,
      summary: 'Bilbo\'s ingenious plan to help the dwarves escape from the Elvenking\'s halls.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-10',
      title: 'A Warm Welcome',
      content: 'The company arrives at Lake-town (Esgaroth), a town built on stilts in the middle of the Long Lake. The Master of Lake-town welcomes them, as the people recall old prophecies about the return of the King Under the Mountain and the resulting prosperity. The company rests and resupplies in Lake-town before setting out for the Lonely Mountain.',
      order: 10,
      dateModified: formattedDate,
      summary: 'Arrival at Lake-town where the people hope for wealth with the return of the dwarves.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    }
  ];
};

// Helper function to get chapters for The Silmarillion campaign
const getSilmarillionChapters = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'chapter-01',
      title: 'Ainulindalë - The Music of the Ainur',
      content: 'Eru Ilúvatar, the One, creates the Ainur, powerful spirits who sing before him. Their music creates a vision of Arda (the world). Melkor, the most powerful of the Ainur, introduces discord into the music, but Ilúvatar incorporates it into a greater theme. Some of the Ainur, including Melkor, descend into Arda to shape it according to the vision.',
      order: 1,
      dateModified: formattedDate,
      summary: 'The creation of the world through the Music of the Ainur.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-02',
      title: 'Valaquenta - Account of the Valar',
      content: 'A description of the Valar (the greatest of the Ainur who entered Arda) and the Maiar (lesser spirits). It details their powers and domains, from Manwë, King of the Valar and lord of air, to Melkor (later named Morgoth), the dark enemy who sought to dominate Arda.',
      order: 2,
      dateModified: formattedDate,
      summary: 'Introduction to the Valar and Maiar who shaped the world.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-03',
      title: 'The Beginning of Days',
      content: 'The Valar work to shape Arda, but Melkor repeatedly destroys their work. The Valar retreat to the continent of Aman, establishing the realm of Valinor. They create two lamps, Illuin and Ormal, to light the world, but Melkor destroys them, causing great catastrophes that reshape the world.',
      order: 3,
      dateModified: formattedDate,
      summary: 'The initial shaping of the world and Melkor\'s destructive influence.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-04',
      title: 'Of Aulë and Yavanna',
      content: 'Aulë, the smith of the Valar, creates the Dwarves in secret, eager for the coming of the Children of Ilúvatar (Elves and Men). Ilúvatar reprimands him but accepts the Dwarves, putting them to sleep until after the coming of the Elves. Yavanna, concerned about the impact of Dwarves on her plants and animals, asks Manwë for protection, leading to the creation of the Ents.',
      order: 4,
      dateModified: formattedDate,
      summary: 'The creation of the Dwarves by Aulë and the Ents by Yavanna.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-05',
      title: 'Of the Coming of the Elves',
      content: 'The Elves awaken at Cuiviénen, a bay of the Sea of Helcar. The Valar, learning of this, wage war on Melkor and capture him, taking him in chains to Valinor. Oromë invites the Elves to Valinor, and most accept, beginning the Great Journey. Some Elves are lost or choose to remain in Middle-earth, forming different elven kindreds.',
      order: 5,
      dateModified: formattedDate,
      summary: 'The awakening of the Elves and their journey to Valinor.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-06',
      title: 'Of Fëanor and the Silmarils',
      content: 'Fëanor, greatest of the Noldor Elves, creates the three Silmarils, jewels containing the light of the Two Trees of Valinor. Melkor, released after feigning reformation, spreads lies among the Noldor, creating strife. He particularly targets Fëanor, coveting the Silmarils. When his lies are discovered, Melkor flees.',
      order: 6,
      dateModified: formattedDate,
      summary: 'The crafting of the Silmarils by Fëanor and Melkor\'s deceit.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-07',
      title: 'Of the Darkening of Valinor',
      content: 'Melkor destroys the Two Trees with the help of Ungoliant, a great spider-like being. They flee to Middle-earth, where Melkor attacks the stronghold of Formenos, kills Fëanor\'s father Finwë, and steals the Silmarils. In Valinor, the Valar attempt to revive the Trees but only manage to create the Sun and Moon from their last flower and fruit.',
      order: 7,
      dateModified: formattedDate,
      summary: 'Melkor\'s destruction of the Two Trees and theft of the Silmarils.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-08',
      title: 'Of the Flight of the Noldor',
      content: 'Fëanor, enraged by the death of his father and the theft of the Silmarils, rebells against the Valar. He and his seven sons swear an oath to recover the Silmarils at any cost. Most of the Noldor follow Fëanor in exile from Valinor, despite warnings from the Valar. The Noldor commit the Kinslaying at Alqualondë, killing many Teleri Elves to take their ships. After crossing the sea, Fëanor burns the ships, forcing those who followed his half-brother Fingolfin to cross the deadly Helcaraxë (Grinding Ice) on foot.',
      order: 8,
      dateModified: formattedDate,
      summary: 'The rebellion of the Noldor, the Kinslaying, and their return to Middle-earth.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-09',
      title: 'Of the Return of the Noldor',
      content: 'Fëanor advances rapidly into Middle-earth and is killed in an early battle with Morgoth\'s forces, but his spirit burns away his body as it departs. His sons retreat to a defensible position and reconcile with Fingolfin\'s host when they finally arrive. The Noldor besiege Morgoth\'s fortress of Angband and establish realms throughout Beleriand. The sun rises for the first time, signaling the awakening of Men.',
      order: 9,
      dateModified: formattedDate,
      summary: 'The Noldor establish realms in Beleriand and begin the Siege of Angband.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-10',
      title: 'Of the Sindar',
      content: 'This chapter focuses on the Sindar, the Grey-elves who remained in Beleriand under the leadership of Thingol and his Maia wife Melian. It describes the establishment of the hidden kingdom of Doriath, protected by Melian\'s magical barrier, and the interactions between the Sindar and the Dwarves, from whom they learn smithcraft and receive magnificent treasures, including the necklace Nauglamír.',
      order: 10,
      dateModified: formattedDate,
      summary: 'The realm of Doriath and the Sindar elves who never journeyed to Valinor.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    }
  ];
};

// Helper function to get chapters for the Dúnedain campaign
const getDunedainChapters = (dmUid: string, formattedDate: string) => {
  return [
    {
      id: 'chapter-01',
      title: 'Heirs of Elendil',
      content: 'An introduction to the Dúnedain, descendants of Númenor who protect the North. After the fall of the North-kingdom of Arnor, the surviving Dúnedain became a wandering people, their chieftains the direct descendants of Elendil through Isildur. They maintain a vigilant watch against the forces of darkness, despite their diminishing numbers and the fading memory of their glory.',
      order: 1,
      dateModified: formattedDate,
      summary: 'The history and purpose of the Rangers of the North.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-02',
      title: 'Arathorn\'s Fall',
      content: 'The death of Arathorn II, father of Aragorn, in battle with orcs while serving as Chieftain of the Dúnedain. His wife Gilraen takes their two-year-old son Aragorn to Rivendell, where Elrond agrees to foster him. To protect the child, his identity is concealed, and he is renamed Estel (Hope). The Dúnedain continue their vigilance under the leadership of acting chieftains until Aragorn comes of age.',
      order: 2,
      dateModified: formattedDate,
      summary: 'The circumstances leading to Aragorn being raised in Rivendell under a secret identity.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-03',
      title: 'Coming of Age',
      content: 'Upon reaching his twentieth year, Aragorn is told of his true identity and heritage by Elrond, who gives him the shards of Narsil, the sword that cut the One Ring from Sauron\'s hand. Soon after, Aragorn meets Arwen, Elrond\'s daughter, in the woods of Rivendell and falls in love with her. He then leaves Rivendell to join his people and take up his duties as Chieftain of the Dúnedain.',
      order: 3,
      dateModified: formattedDate,
      summary: 'Aragorn learns his true identity and begins his life as a Ranger.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-04',
      title: 'Guardians of the Shire',
      content: 'The Rangers have long protected the borders of the Shire, though the hobbits remain largely unaware of their guardians. This chapter details a Ranger patrol along the borders, dealing with threats that never reach the hobbits\' attention. It portrays the Rangers\' dedication to protecting the innocent and preserving what remains good in the world, even without recognition or thanks.',
      order: 4,
      dateModified: formattedDate,
      summary: 'How the Rangers secretly protect the Shire from outside threats.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-05',
      title: 'Shadows in the East',
      content: 'Disturbing reports come from the eastern lands as darkness grows once more. The Rangers investigate increased orc activity in the mountains and strange messengers traveling the East Road. There are rumors that the Nazgûl have returned to Mordor, and the Rangers must determine what this means for the free peoples of the North.',
      order: 5,
      dateModified: formattedDate,
      summary: 'The Rangers respond to growing signs of evil from the East.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-06',
      title: 'The Hidden Refuge',
      content: 'A detailed description of a secret Ranger outpost where they gather, share information, train, and tend to their wounded. This haven is known only to the Dúnedain and a few trusted allies. Here, they maintain what they can of their heritage: maps, histories, heirlooms, and the traditions of Arnor and Númenor.',
      order: 6,
      dateModified: formattedDate,
      summary: 'The secret base where Rangers gather and preserve their heritage.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-07',
      title: 'Many Names, Many Lands',
      content: 'Aragorn\'s early travels beyond the lands of Eriador, where he adopts different names and identities. Known as Thorongil in Rohan and Gondor, he serves under King Thengel of Rohan and Steward Ecthelion II of Gondor, gaining experience in warfare and leadership. These years help him understand the wider world and the varied peoples he will one day hope to unite.',
      order: 7,
      dateModified: formattedDate,
      summary: 'Aragorn\'s adventures and aliases in lands far from the North.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-08',
      title: 'The Barrow-downs',
      content: 'The Rangers investigate disturbing activity in the ancient burial grounds of the Barrow-downs, where evil spirits are growing more active and dangerous. This chapter explores the connection between the Barrow-wights and the ancient kingdom of Angmar, providing insight into the Rangers\' role as keepers of forgotten knowledge about ancient evils.',
      order: 8,
      dateModified: formattedDate,
      summary: 'Confronting the ancient evil of the Barrow-wights in the old burial grounds.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-09',
      title: 'Council with the Wise',
      content: 'Aragorn meets with Gandalf and other members of the White Council to share information about the growing shadow. He reports on conditions in the North and the resurgence of evil creatures in places long thought safe. The Council discusses the possibility that the Enemy is searching for the One Ring and what this might mean for Middle-earth.',
      order: 9,
      dateModified: formattedDate,
      summary: 'Aragorn shares crucial intelligence with Gandalf and the White Council.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    },
    {
      id: 'chapter-10',
      title: 'The Hunt for Gollum',
      content: 'At Gandalf\'s request, Aragorn undertakes a dangerous mission to find and capture Gollum, who may have vital information about the One Ring. This long and difficult hunt takes him through wild and perilous regions, testing his skill as a tracker and woodsman. The chapter details the search, capture, and challenging journey to deliver Gollum to Mirkwood for questioning.',
      order: 10,
      dateModified: formattedDate,
      summary: 'Aragorn\'s difficult quest to capture Gollum at Gandalf\'s request.',
      createdBy: dmUid,
      modifiedBy: dmUid,
      createdByUsername: 'DungeonMaster',
      dateAdded: formattedDate
    }
  ];
};