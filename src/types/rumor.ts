// types/rumor.ts

export type RumorStatus = 'confirmed' | 'unconfirmed' | 'false';
export type SourceType = 'npc' | 'tavern' | 'notice' | 'traveler' | 'other';

export interface RumorNote {
  id: string;
  content: string;
  dateAdded: string;
  addedBy: string;
  addedByUsername: string;
}

export interface Rumor {
  id: string;
  title: string;
  content: string;
  status: RumorStatus;
  sourceType: SourceType;
  sourceName: string;
  sourceNpcId?: string; // Optional reference to NPC if source is an NPC
  location?: string;
  locationId?: string; // Optional reference to location in system
  dateAdded: string;
  dateModified: string;
  createdBy: string; // User UID
  createdByUsername: string; // Username for display
  modifiedBy: string; // User UID of last modifier
  modifiedByUsername: string; // Username for display
  relatedNPCs: string[]; // Array of NPC IDs
  relatedLocations: string[]; // Array of location IDs
  notes: RumorNote[];
  convertedToQuestId?: string; // If rumor was converted to quest
}

// Context types
export interface RumorContextState {
  rumors: Rumor[];
  isLoading: boolean;
  error: string | null;
}

export interface RumorContextValue extends RumorContextState {
  getRumorById: (id: string) => Rumor | undefined;
  getRumorsByStatus: (status: RumorStatus) => Rumor[];
  getRumorsByLocation: (locationId: string) => Rumor[];
  getRumorsByNPC: (npcId: string) => Rumor[];
  updateRumorStatus: (rumorId: string, status: RumorStatus) => Promise<void>;
  updateRumorNote: (rumorId: string, note: RumorNote) => Promise<void>;
  addRumor: (rumor: Omit<Rumor, 'id'>) => Promise<string>;
  updateRumor: (rumor: Rumor) => Promise<void>;
  deleteRumor: (rumorId: string) => Promise<void>;
  combineRumors: (rumorIds: string[], newRumor: Partial<Rumor>) => Promise<string>;
  convertToQuest: (rumorIds: string[], questData: any) => Promise<string>;
}