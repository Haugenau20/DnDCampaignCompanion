// src/utils/__dev__/generateSampleData.ts

import { generateSampleData } from "./dndSampleDataGenerator";

console.log('=== DnD Campaign Companion Sample Data Generator ===');
console.log('This will populate your Firebase emulator with interconnected sample data');
console.log('including groups, campaigns, NPCs, locations, quests, rumors, etc.');
console.log('Make sure your emulators are running first!');
console.log('');

generateSampleData()
  .then(() => {
    console.log('Sample data generation completed successfully!');
    console.log('You can now access this data in your development environment.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to generate sample data:', error);
    process.exit(1);
  });