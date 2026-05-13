import { supabase } from '../lib/supabase';

const DEFAULT_MODULES = [
  // LEVEL 0: TUTORIAL
  { 
    level_number: 0, 
    level_name: 'Tutorial', 
    lesson_number: '0.1', 
    title: 'Home Screen Walkthrough', 
    content: 'Welcome back! Whenever you need a gentle refresher on how to navigate your speaking dashboard, this guide is here to assist you. On your Home Screen, you will find your primary learning path where your real-time progress is tracked. The "Practice" widget instantly unlocks impromptu speaking modes, including the Randomizer and Free Speech rooms, allowing you to build confidence at any time. Your current speaking streak and session summaries are conveniently displayed at the top to keep you inspired. Please feel free to explore each section at your own comfortable pace—we are always here to support your growth as an exceptional speaker!',
    date_started: new Date().toISOString(),
    date_ended: null
  },

  // LEVEL 1: FOUNDATION
  { level_number: 1, level_name: 'Foundation', lesson_number: '1.1', title: 'The Visual Anchor', content: 'Did you know that 55% of communication is visual? When presenting in class, looking directly at the camera lens or your audience creates a strong connection. Let\'s practice maintaining steady eye contact.' },
  { level_number: 1, level_name: 'Foundation', lesson_number: '1.2', title: 'Academic Posture', content: 'Your body language speaks before you do. Sit or stand straight and relax your shoulders. This helps you breathe properly and look confident. Let\'s build your physical presence.' },
  { level_number: 1, level_name: 'Foundation', lesson_number: '1.3', title: 'Vocal Stability', content: 'When students get nervous during recitations, their volume tends to drop. Speak from your chest, not your throat. Keep your volume consistent from the first word to the last.' },
  { level_number: 1, level_name: 'Foundation', lesson_number: '1.4', title: 'Pace and Breathing', content: 'Don\'t rush! When you speak too fast, you lose your audience. Take a deliberate breath between sentences to keep a steady, natural rhythm.' },
  { level_number: 1, level_name: 'Foundation', lesson_number: '1.5', title: 'Verbal Flow', content: 'A great speaker flows naturally. Don\'t overthink your grammar right now; just focus on keeping your sentences moving forward smoothly without stopping.' },

  // LEVEL 2: APPRENTICE SPEAKER
  { level_number: 2, level_name: 'Apprentice Speaker', lesson_number: '2.1', title: 'Classroom Projection', content: 'Projecting is not shouting. It is speaking clearly so that the person at the very back of the room can hear you. Imagine sending your words across a large space.' },
  { level_number: 2, level_name: 'Apprentice Speaker', lesson_number: '2.2', title: 'The Power of the Pause', content: 'Speed is your biggest enemy when nervous. Instead of rushing to finish your report, use silent pauses to gather your thoughts. It makes you look thoughtful and in control.' },
  { level_number: 2, level_name: 'Apprentice Speaker', lesson_number: '2.3', title: 'Tone Variation', content: 'Nobody likes a monotone reporter. Match your emotion to your topic. If it\'s exciting, sound energetic. If it\'s serious, sound firm.' },
  { level_number: 2, level_name: 'Apprentice Speaker', lesson_number: '2.4', title: 'Vocal-Visual Sync', content: 'Your face and your voice must match. If you are sharing a happy memory, smile naturally. If you are explaining a strict rule, keep your face serious and your voice steady.' },
  { level_number: 2, level_name: 'Apprentice Speaker', lesson_number: '2.5', title: 'Expressive Conviction', content: 'When you defend an opinion, you must sound like you 100% believe it. Speak with absolute conviction and do not let your voice shake.' },

  // LEVEL 3: PRACTITIONER
  { level_number: 3, level_name: 'Practitioner', lesson_number: '3.1', title: 'The Zero-Filler Rule', content: 'Words like "um", "uh", and "like" make you sound unsure during graded recitations. To eliminate them, embrace the silence. If you need to think, just pause silently.' },
  { level_number: 3, level_name: 'Practitioner', lesson_number: '3.2', title: 'Vocabulary Precision', content: 'Don\'t use complicated words to sound smart. If you are explaining a complex IT concept, avoid jargon. Use simple analogies so anyone can understand you.' },
  { level_number: 3, level_name: 'Practitioner', lesson_number: '3.3', title: 'The PREP Framework', content: 'Want to answer questions logically? Use PREP: Point, Reason, Example, Point. State your point, give a reason, provide a quick example, and restate your point.' },
  { level_number: 3, level_name: 'Practitioner', lesson_number: '3.4', title: 'The PPF Framework', content: 'When asked about your background or project progress, use the Past-Present-Future framework. It organizes your thoughts into a clear timeline that panelists can easily follow.' },
  { level_number: 3, level_name: 'Practitioner', lesson_number: '3.5', title: 'Problem-Solution Structure', content: 'When pitching an idea, always start with the pain point. Clearly state "The Problem is...", then confidently follow up with "My Solution is...".' },

  // LEVEL 4: SPECIALIST
  { level_number: 4, level_name: 'Specialist', lesson_number: '4.1', title: 'Executive Presence', content: 'Welcome to the Specialist level. To own the room during future job interviews, plant your feet firmly, open your chest, and keep unbroken eye contact to project authority.' },
  { level_number: 4, level_name: 'Specialist', lesson_number: '4.2', title: 'Purposeful Gestures', content: 'Your hands are powerful tools. Use them to emphasize points, but avoid nervous fidgeting. Your gestures must naturally match the timing of your words.' },
  { level_number: 4, level_name: 'Specialist', lesson_number: '4.3', title: 'Persuasive Storytelling', content: 'Data informs, but stories inspire. Hook your audience by describing a conflict, then deliver a satisfying resolution. Pull them into your narrative.' },
  { level_number: 4, level_name: 'Specialist', lesson_number: '4.4', title: 'Conflict & Calmness', content: 'When handling a difficult Q&A or a group conflict, your tone is your shield. Remain completely calm. A steady, low-pitched voice diffuses tension.' },
  { level_number: 4, level_name: 'Specialist', lesson_number: '4.5', title: 'Dynamic Energy Shifts', content: 'A master speaker knows when to be loud and when to whisper. Practice dropping your volume to draw the audience in, then raising it to deliver a strong conclusion.' },

  // LEVEL 5: EXPERT
  { level_number: 5, level_name: 'Expert', lesson_number: '5.1', title: 'Impromptu Mastery', content: 'The ultimate test is thinking on your feet. When given a surprise topic, don\'t panic. Trust your baseline: eye contact, slow pace, and smooth delivery.' },
  { level_number: 5, level_name: 'Expert', lesson_number: '5.2', title: 'Crisis Recovery', content: 'If your mic fails or you forget your next point during a Capstone Defense, do not apologize excessively. Pause, recover seamlessly, and continue with confidence.' },
  { level_number: 5, level_name: 'Expert', lesson_number: '5.3', title: 'Defending Methodology', content: 'In a hostile panel defense, you must stand your ground politely. Defend your technical choices with logic, facts, and a firm but respectful tone.' },
  { level_number: 5, level_name: 'Expert', lesson_number: '5.4', title: 'Admitting Limitations', content: 'No project is perfect. If a panelist points out a missing feature, admit the limitation confidently and frame it intelligently as a recommendation for future work.' },
  { level_number: 5, level_name: 'Expert', lesson_number: '5.5', title: 'The Ultimate Pitch', content: 'Your final elevator pitch is your closing argument. Combine zero fillers, dynamic gestures, and unwavering eye contact to prove you are ready for the real world.' }
];

/**
 * Fetches all learning modules from the database, ordered by lesson number.
 * Gracefully falls back to integrated dataset if remote table is unseeded or offline.
 * @returns {Promise<Array>} Array of module rows.
 */
export async function fetchModules() {
  try {
    // Attempt query with timestamps enabled
    const { data, error } = await supabase
      .from('modules')
      .select('level_number, level_name, lesson_number, title, content, date_started, date_ended')
      .order('lesson_number', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    try {
      // Graceful column fallback if the database has not yet executed the ALTER migration
      const { data, error } = await supabase
        .from('modules')
        .select('level_number, level_name, lesson_number, title, content')
        .order('lesson_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (fallbackErr) {
      // Ignore
    }
  }
  
  return DEFAULT_MODULES;
}
