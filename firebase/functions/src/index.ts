// functions/src/index.ts
import { deleteUser, removeUserFromGroup } from './userManagement';
import { sendContactEmail } from './contact';
import { extractEntities } from './entityExtraction';

// Export all functions
export { 
  deleteUser, 
  removeUserFromGroup,
  sendContactEmail,
  extractEntities
};