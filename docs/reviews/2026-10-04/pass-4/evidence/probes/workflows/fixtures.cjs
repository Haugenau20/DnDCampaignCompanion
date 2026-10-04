"use strict";

/** Synthetic ordinary campaign records; coordinator writes these only to emulators. */
module.exports = function buildFixtures({ groupId, campaignId, uid }) {
  const now = "2026-10-04T00:00:00.000Z";
  const base = { createdBy: uid, createdByUsername: "workflow-reader", dateAdded: now, dateModified: now };
  const campaignPath = `groups/${groupId}/campaigns/${campaignId}`;
  const notePath = `groups/${groupId}/users/${uid}/notes`;
  const names = { location: "Workflow Harbor", npc: "Workflow Ferryman", quest: "Workflow Crossing" };
  const ids = { location: "workflow-harbor", npc: "workflow-ferryman", quest: "workflow-crossing", chapter: "workflow-chapter" };
  const detected = (id, type, text, extraData) => ({ id, type, text, confidence: 0.9, isConverted: false, createdAt: now, extraData });
  const detections = [
    detected("detected-npc", "npc", "Converted Harbin", { name: "Converted Harbin", race: "human", occupation: "Guide", relationship: "friendly", location: names.location, description: "A guide who knows the harbor.", context: "Harbin met the party." }),
    detected("detected-location", "location", "Converted Lantern Inn", { name: "Converted Lantern Inn", locationType: "building", parentLocation: names.location, description: "An inn beside the harbor.", context: "The party stayed here." }),
    detected("detected-quest", "quest", "Converted Recover the Lantern", { title: "Converted Recover the Lantern", description: "Recover the stolen harbor lantern.", objectives: ["Ask the ferryman", "Find the lantern"], relatedNPCNames: [names.npc], locationName: names.location }),
    detected("detected-rumor", "rumor", "Converted East Road Rumour", { title: "Converted East Road Rumour", content: "The eastern road has a fallen bridge.", sourceType: "npc", sourceName: names.npc, status: "unconfirmed" }),
  ];
  const noteId = "workflow-detections";
  const documents = [
    { path: `${campaignPath}/locations/${ids.location}`, data: { ...base, id: ids.location, name: names.location, description: "A synthetic harbor for workflow review.", type: "town", status: "known", parentId: "", features: [], connectedNPCs: [], relatedQuests: [], notes: [], tags: [] } },
    { path: `${campaignPath}/npcs/${ids.npc}`, data: { ...base, id: ids.npc, name: names.npc, title: "", race: "human", occupation: "Ferryman", description: "A synthetic ferryman for workflow review.", location: "", locationId: "", appearance: "", personality: "", background: "", status: "alive", relationship: "neutral", connections: { relatedNPCs: [], relatedQuests: [], affiliations: [] }, notes: [], tags: [] } },
    { path: `${campaignPath}/quests/${ids.quest}`, data: { ...base, id: ids.quest, title: names.quest, description: "Cross the river safely.", background: "", status: "active", objectives: [], leads: [], complications: [], rewards: [], keyLocations: [], relatedNPCIds: [], location: "", locationId: "", levelRange: "" } },
    { path: `${campaignPath}/chapters/${ids.chapter}`, data: { ...base, id: ids.chapter, title: "Workflow Opening Chapter", content: "# The harbor\n\nThe party arrived at the synthetic harbor and met the ferryman.\n\nThey crossed the river safely.", summary: "The party arrives at the harbor.", order: 1 } },
    { path: `${notePath}/${noteId}`, data: { ...base, id: noteId, campaignId, title: "Workflow Conversion Session", content: "Converted Harbin guided the party to Converted Lantern Inn. They agreed to Converted Recover the Lantern. A traveler described Converted East Road Rumour. These are synthetic detections prepared without an AI request.", extractedEntities: detections, status: "active", tags: [], updatedAt: now } },
  ];
  return { campaignPath, notePath, noteId, documents, ids, names };
};
