// Function for exporting chapter content - can be added to a utilities file
// src/utils/export-utils.ts

import { Chapter } from "../types/story";

/**
 * Generates a text file containing all chapter content in order
 * @param chapters Array of chapters to export
 * @returns void - Triggers a file download
 */
export const exportChaptersAsText = (chapters: Chapter[]): void => {
    // Sort chapters by order
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
    
    let content = "# Campaign Chapter Content\n\n";
    
    // Add each chapter with title and content
    sortedChapters.forEach(chapter => {
      content += `## Chapter ${chapter.order}: ${chapter.title}\n\n`;
      content += `${chapter.content}\n\n`;
      
      // Add separator between chapters
      content += "-----\n\n";
    });
    
    // Create a blob from the content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-chapters.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };