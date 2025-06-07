/groups/{groupId}/  (Group metadata)
  ├─ name: string
  ├─ description: string
  ├─ createdAt: timestamp
  ├─ createdBy: userId
  
/groups/{groupId}/campaigns/{campaignId}/  (Campaign metadata)
  ├─ name: string
  ├─ description: string
  ├─ createdAt: timestamp
  ├─ createdBy: userId
  ├─ isActive: boolean
  
/groups/{groupId}/campaigns/{campaignId}/chapters/{chapterId}
  ├─ id: string
  ├─ title: string
  ├─ content: string
  ├─ order: number
  ├─ subChapters?: Chapter[] (optional)
  ├─ lastModified?: Date (optional)
  ├─ summary?: string (optional)

/groups/{groupId}/campaigns/{campaignId}/locations/{locationId}
  ├─ id: string
  ├─ name: string
  ├─ type: LocationType ("region", "city", "town", "village", "dungeon", "landmark", "building", "poi")
  ├─ status: LocationStatus ("known", "explored", "visited")
  ├─ description: string
  ├─ parentId?: string (optional)
  ├─ features?: string[] (optional)
  ├─ connectedNPCs?: string[] (optional)
  ├─ relatedQuests?: string[] (optional)
  ├─ notes?: LocationNote[] (optional)
  │   ├─ date: string
  │   └─ text: string
  ├─ tags?: string[] (optional)
  ├─ lastVisited?: string (optional)
  ├─ createdBy?: string (optional)
  ├─ createdByUsername?: string (optional)
  ├─ dateAdded?: string (optional)
  ├─ modifiedBy?: string (optional)
  ├─ modifiedByUsername?: string (optional)
  ├─ dateModified?: string (optional)

/groups/{groupId}/campaigns/{campaignId}/npcs/{npcId}
  ├─ id: string
  ├─ name: string
  ├─ title?: string (optional)
  ├─ status: NPCStatus ("alive", "deceased", "missing", "unknown")
  ├─ race?: string (optional)
  ├─ occupation?: string (optional)
  ├─ location?: string (optional)
  ├─ relationship: NPCRelationship ("friendly", "neutral", "hostile", "unknown")
  ├─ description: string
  ├─ appearance?: string (optional)
  ├─ personality?: string (optional)
  ├─ background?: string (optional)
  ├─ connections: NPCConnections
  │   ├─ relatedNPCs: string[]
  │   ├─ affiliations: string[]
  │   └─ relatedQuests: string[]
  ├─ notes: NPCNote[]
  │   ├─ date: string
  │   └─ text: string
  ├─ createdBy?: string (optional)
  ├─ createdByUsername?: string (optional)
  ├─ dateAdded?: string (optional)
  ├─ modifiedBy?: string (optional)
  ├─ modifiedByUsername?: string (optional)
  ├─ dateModified?: string (optional)

/groups/{groupId}/campaigns/{campaignId}/quests/{questId}
  ├─ id: string
  ├─ title: string
  ├─ description: string
  ├─ status: QuestStatus ("active", "completed", "failed")
  ├─ background?: string (optional)
  ├─ objectives: QuestObjective[]
  │   ├─ id: string
  │   ├─ description: string
  │   └─ completed: boolean
  ├─ leads?: string[] (optional)
  ├─ keyLocations?: QuestLocation[] (optional)
  │   ├─ name: string
  │   └─ description: string
  ├─ importantNPCs?: QuestNPC[] (optional)
  │   ├─ name: string
  │   └─ description: string
  ├─ relatedNPCIds?: string[] (optional)
  ├─ complications?: string[] (optional)
  ├─ rewards?: string[] (optional)
  ├─ location?: string (optional)
  ├─ levelRange?: string (optional)
  ├─ dateAdded?: string (optional)
  ├─ dateCompleted?: string (optional)
  ├─ createdBy?: string (optional)
  ├─ createdByUsername?: string (optional)
  ├─ dateModified?: string (optional)
  ├─ modifiedBy?: string (optional)
  ├─ modifiedByUsername?: string (optional)

/groups/{groupId}/campaigns/{campaignId}/rumors/{rumorId}
  ├─ id: string
  ├─ title: string
  ├─ content: string
  ├─ status: RumorStatus ("confirmed", "unconfirmed", "false")
  ├─ sourceType: SourceType ("npc", "tavern", "notice", "traveler", "other")
  ├─ sourceName: string
  ├─ sourceNpcId?: string (optional)
  ├─ location?: string (optional)
  ├─ locationId?: string (optional)
  ├─ dateAdded: string
  ├─ dateModified: string
  ├─ createdBy: string
  ├─ createdByUsername: string
  ├─ modifiedBy: string
  ├─ modifiedByUsername: string
  ├─ relatedNPCs: string[]
  ├─ relatedLocations: string[]
  ├─ notes: RumorNote[]
  │   ├─ id: string
  │   ├─ content: string
  │   ├─ dateAdded: string
  │   ├─ addedBy: string
  │   └─ addedByUsername: string
  ├─ convertedToQuestId?: string (optional)

/groups/{groupId}/campaigns/{campaignId}/saga/{sagaId}
  ├─ title: string
  ├─ content: string
  ├─ lastUpdated: string
  ├─ version: string

/groups/{groupId}/users/{userId}  (Group-specific user profiles)
  ├─ username: string  (unique within group)
  ├─ role: string  ("admin" or "member")
  ├─ joinedAt: timestamp
  ├─ characters: array
  ├─ activeCampaignId: string
  ├─ preferences: object

/groups/{groupId}/usernames/{username}  (Group-scoped usernames)
  ├─ userId: string
  ├─ originalUsername: string  (preserves case)
  ├─ createdAt: timestamp

/groups/{groupId}/registrationTokens/{tokenId}  (Group-specific tokens)
  ├─ token: string
  ├─ createdAt: timestamp
  ├─ createdBy: userId
  ├─ used: boolean
  ├─ usedAt: timestamp (optional)
  ├─ usedBy: userId (optional)
  ├─ notes: string (optional)

/users/{userId}  (Global user profiles)
  ├─ email: string
  ├─ groups: array of groupIds
  ├─ lastLoginAt: timestamp
  ├─ createdAt: timestamp
  ├─ activeGroupId: string (last selected group)