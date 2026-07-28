// components/features/layouts/common/utils/layoutUtils.ts

/**
 * Calculate completion percentage for objectives
 */
export const calculateCompletionPercentage = (objectives: {completed: boolean}[]): number => {
    if (!objectives || objectives.length === 0) return 0;
    const completedCount = objectives.filter(obj => obj.completed).length;
    return Math.round((completedCount / objectives.length) * 100);
  };