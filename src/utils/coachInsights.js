import { toFivePointScore } from './sessionFormatting';

/**
 * Generates dynamic coach insights based on user session history.
 * 
 * @param {Array} sessions - Array of session objects
 * @returns {Object} - { message: string, growth: number, strongestPillar: string }
 */
export function generateCoachInsights(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      message: "Welcome! Start your first session to see your progress insights here.",
      growth: 0,
      strongestPillar: null
    };
  }

  // Filter out pre-test and error sessions
  const validSessions = sessions
    .filter(s => s.status !== 'error' && s.is_error !== true)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (validSessions.length === 0) {
    return {
      message: "Ready to start? Complete your first training session to unlock performance tracking!",
      growth: 0,
      strongestPillar: null
    };
  }

  const latest = validSessions[0];
  const latestScore = toFivePointScore(latest.confidence_score || latest.overall_score || latest.score || 0);

  // 1. Calculate Growth (Weekly or overall)
  let growthMessage = "";
  let growthValue = 0;

  if (validSessions.length >= 2) {
    // Weekly comparison
    const now = new Date();
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    
    const previousWeekStart = new Date(lastWeekStart);
    previousWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeekSessions = validSessions.filter(s => new Date(s.created_at) >= lastWeekStart);
    const prevWeekSessions = validSessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= previousWeekStart && d < lastWeekStart;
    });

    if (thisWeekSessions.length > 0 && prevWeekSessions.length > 0) {
      const thisWeekAvg = thisWeekSessions.reduce((sum, s) => sum + toFivePointScore(s.confidence_score || s.overall_score || s.score || 0), 0) / thisWeekSessions.length;
      const prevWeekAvg = prevWeekSessions.reduce((sum, s) => sum + toFivePointScore(s.confidence_score || s.overall_score || s.score || 0), 0) / prevWeekSessions.length;
      
      const diff = thisWeekAvg - prevWeekAvg;
      growthValue = prevWeekAvg > 0 ? (diff / prevWeekAvg) * 100 : 0;
      
      if (growthValue > 0) {
        growthMessage = `Fantastic! Your delivery has grown by ${Math.abs(growthValue).toFixed(1)}% since last week. `;
      } else if (growthValue < 0) {
        growthMessage = `You're maintaining a great baseline, with just a ${Math.abs(growthValue).toFixed(1)}% difference from last week. Keep it up! `;
      } else {
        growthMessage = "Your performance is rock-solid and stable since last week! ";
      }
    } else {
      // Overall growth (latest vs first)
      const first = validSessions[validSessions.length - 1];
      const firstScore = toFivePointScore(first.confidence_score || first.overall_score || first.score || 0);
      
      const diff = latestScore - firstScore;
      growthValue = firstScore > 0 ? (diff / firstScore) * 100 : 0;

      if (growthValue > 0) {
        growthMessage = `Impressive! You've improved your score by ${Math.abs(growthValue).toFixed(1)}% since you started. `;
      } else {
        growthMessage = "You're building an incredible foundation for your speaking journey! ";
      }
    }
  } else {
    growthMessage = "What a great start! Keep practicing to see your improvement trends take flight. ";
  }

  // 2. Identify Strongest Pillar
  const pillars = [
    { name: 'Visual', score: validSessions.reduce((sum, s) => sum + (s.visual_avg || s.visual_score || 0), 0) / validSessions.length },
    { name: 'Vocal', score: validSessions.reduce((sum, s) => sum + (s.vocal_avg || s.acoustic_score || 0), 0) / validSessions.length },
    { name: 'Verbal', score: validSessions.reduce((sum, s) => sum + (s.verbal_avg || s.context_score || 0), 0) / validSessions.length },
  ];
  
  const strongest = pillars.sort((a, b) => b.score - a.score)[0];
  const strongestPillarMsg = strongest.score > 0 ? `Your ${strongest.name} skills are looking particularly strong.` : "Keep up the hard work!";

  return {
    message: `${growthMessage}${strongestPillarMsg}`,
    growth: growthValue,
    strongestPillar: strongest.name
  };
}
