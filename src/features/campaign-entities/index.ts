// src/features/campaign-entities/index.ts
export { NPCProvider, useNPCs } from './npcs/context/NPCContext';
export { useNPCData } from './npcs/hooks/useNPCData';
// Components consumed by pages/npcs/* and other external consumers
export { default as NPCDirectory } from './npcs/components/NPCDirectory';
export { default as NPCEditForm } from './npcs/components/NPCEditForm';
export { default as NPCForm } from './npcs/components/NPCForm';
export { default as NPCCard } from './npcs/components/NPCCard';
export { default as NPCLegend } from './npcs/components/NPCLegend';
// NPC types
export type { NPC, NPCStatus, NPCRelationship, NPCNote, NPCConnections, NPCContextState, NPCContextValue } from './npcs/types';
