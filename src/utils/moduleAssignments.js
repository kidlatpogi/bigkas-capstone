export const MODULE_ASSIGNMENT_ACTIVITY_COUNT = 6;

export function getModuleAssignmentRange(module) {
  const levelNumber = Number(module?.level_number);
  const lessonNumber = String(module?.lesson_number || '');
  const [, lessonPartRaw] = lessonNumber.split('.');
  const lessonPart = Number(lessonPartRaw);

  if (!Number.isFinite(levelNumber) || levelNumber < 1 || !Number.isFinite(lessonPart) || lessonPart < 1) {
    return null;
  }

  const start = ((lessonPart - 1) * MODULE_ASSIGNMENT_ACTIVITY_COUNT) + 1;
  return {
    start,
    end: start + MODULE_ASSIGNMENT_ACTIVITY_COUNT - 1,
  };
}

export function getModuleAssignmentActivities(module, activities) {
  const range = getModuleAssignmentRange(module);
  if (!range) return [];

  return (Array.isArray(activities) ? activities : [])
    .filter((activity) => {
      const order = Number(activity?.activity_order);
      return Number.isFinite(order) && order >= range.start && order <= range.end;
    })
    .sort((a, b) => Number(a.activity_order) - Number(b.activity_order));
}

export function getModuleAssignmentStatus(module, activities, completedActivityIds = []) {
  const range = getModuleAssignmentRange(module);
  const assignmentActivities = getModuleAssignmentActivities(module, activities);
  const completedSet = new Set((Array.isArray(completedActivityIds) ? completedActivityIds : []).map(String));
  const completedCount = assignmentActivities.filter((activity) => completedSet.has(String(activity.id))).length;
  const nextActivity = assignmentActivities.find((activity) => !completedSet.has(String(activity.id))) || null;
  const prerequisiteActivities = range
    ? (Array.isArray(activities) ? activities : [])
      .filter((activity) => {
        const order = Number(activity?.activity_order);
        return Number.isFinite(order) && order >= 1 && order < range.start;
      })
      .sort((a, b) => Number(a.activity_order) - Number(b.activity_order))
    : [];
  const prerequisiteCompletedCount = prerequisiteActivities
    .filter((activity) => completedSet.has(String(activity.id))).length;
  const firstIncompletePrerequisite = prerequisiteActivities
    .find((activity) => !completedSet.has(String(activity.id))) || null;
  const isLocked = prerequisiteActivities.length > 0
    && prerequisiteCompletedCount < prerequisiteActivities.length;

  return {
    assignmentActivities,
    completedCount,
    firstIncompletePrerequisite,
    isLocked,
    prerequisiteActivities,
    prerequisiteCompletedCount,
    prerequisiteTotalCount: prerequisiteActivities.length,
    totalCount: assignmentActivities.length,
    nextActivity: isLocked ? null : nextActivity,
    isCompleted: assignmentActivities.length > 0 && completedCount >= assignmentActivities.length,
  };
}
