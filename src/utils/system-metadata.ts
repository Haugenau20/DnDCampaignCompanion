// src/utils/system-metadata.ts
import { SystemMetadata } from '../types/common';
import { getUserName, getActiveCharacterName } from './user-utils';

/**
 * Utility service for managing system metadata
 * This centralizes all attribution logic that contexts use
 */
export class SystemMetadataService {
  /**
   * Generate complete system metadata for entity creation
   */
  static createMetadata(
    user: any,
    userProfile: any,
    activeGroupUserProfile: any
  ): SystemMetadata {
    const now = new Date().toISOString();
    const username = getUserName(activeGroupUserProfile);
    const characterId = activeGroupUserProfile?.activeCharacterId || null;
    const characterName = getActiveCharacterName(activeGroupUserProfile);

    return {
      createdBy: user.uid,
      createdByUsername: username,
      createdByCharacterId: characterId,
      createdByCharacterName: characterName,
      createdAt: now,
      modifiedBy: user.uid,
      modifiedByUsername: username,
      modifiedByCharacterId: characterId,
      modifiedByCharacterName: characterName,
      modifiedAt: now,
    };
  }

  /**
   * Generate system metadata for entity updates
   */
  static updateMetadata(
    user: any,
    userProfile: any,
    activeGroupUserProfile: any
  ): Partial<SystemMetadata> {
    const now = new Date().toISOString();
    const username = getUserName(activeGroupUserProfile);
    const characterId = activeGroupUserProfile?.activeCharacterId || null;
    const characterName = getActiveCharacterName(activeGroupUserProfile);

    return {
      modifiedBy: user.uid,
      modifiedByUsername: username,
      modifiedByCharacterId: characterId,
      modifiedByCharacterName: characterName,
      modifiedAt: now,
    };
  }

  /**
   * Generate a unique ID for entities
   */
  static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}