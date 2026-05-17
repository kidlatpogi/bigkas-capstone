ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS achievement_key text,
ADD COLUMN IF NOT EXISTS journey_number integer,
ADD COLUMN IF NOT EXISTS stage_number integer;

CREATE UNIQUE INDEX IF NOT EXISTS achievements_achievement_key_key
ON public.achievements (achievement_key);

WITH seed (
  achievement_key,
  journey_number,
  stage_number,
  name,
  description,
  unlock_description,
  unlock_requirements
) AS (
  VALUES
    ('journey-1-stage-01', 1, 1, 'First Words', 'You took the brave first step in establishing your natural speaking baseline.', 'Complete Journey 1, Stage 01 by submitting Identity Baseline with your baseline eye contact captured.', '{"journey_stage_completed":{"journey":1,"stage":1}}'::jsonb),
    ('journey-1-stage-05', 1, 5, 'Logical Thinker', 'You successfully built simple, logical sentences on the spot.', 'Complete Journey 1, Stage 05 by explaining why you like your favorite color in a clear, natural answer.', '{"journey_stage_completed":{"journey":1,"stage":5}}'::jsonb),
    ('journey-1-stage-10', 1, 10, 'The Comfort Zone', 'You achieved a clean, relaxed vocal state.', 'Complete Journey 1, Stage 10 by talking about your go-to comfort food with a relaxed, steady voice.', '{"journey_stage_completed":{"journey":1,"stage":10}}'::jsonb),
    ('journey-1-stage-15', 1, 15, 'Rule of Three', 'You demonstrated the ability to structure your thoughts concisely.', 'Complete Journey 1, Stage 15 by describing a favorite movie or series in three simple sentences.', '{"journey_stage_completed":{"journey":1,"stage":15}}'::jsonb),
    ('journey-1-stage-20', 1, 20, 'Pacesetter', 'You proved you can control your speaking speed even when the topic brings high energy.', 'Complete Journey 1, Stage 20 by discussing a sport or physical activity while keeping your speed under control.', '{"journey_stage_completed":{"journey":1,"stage":20}}'::jsonb),
    ('journey-1-stage-25', 1, 25, 'Humble Brag', 'You projected visual and vocal confidence naturally.', 'Complete Journey 1, Stage 25 by describing a talent or skill you are proud of with natural confidence.', '{"journey_stage_completed":{"journey":1,"stage":25}}'::jsonb),
    ('journey-1-stage-30', 1, 30, 'The Unbroken Minute', 'You proved you can handle a continuous speaking load with steady eye contact, posture, and a clear voice.', 'Defeat Journey 1, Stage 30 with a 60-second self-introduction about communication skills.', '{"journey_stage_completed":{"journey":1,"stage":30}}'::jsonb),

    ('journey-2-stage-01', 2, 1, 'Room Filler', 'You visualized a large space and successfully projected your voice.', 'Complete Journey 2, Stage 01 by describing a campus event with classroom-ready projection.', '{"journey_stage_completed":{"journey":2,"stage":1}}'::jsonb),
    ('journey-2-stage-05', 2, 5, 'Vocal Architect', 'You kept your voice consistently loud while engaged in an imaginative topic.', 'Complete Journey 2, Stage 05 by describing your dream house while maintaining strong volume.', '{"journey_stage_completed":{"journey":2,"stage":5}}'::jsonb),
    ('journey-2-stage-10', 2, 10, 'Unbroken Chain', 'You sustained a consistent volume throughout an entire story.', 'Complete Journey 2, Stage 10 by telling a group-project story without letting your volume fade.', '{"journey_stage_completed":{"journey":2,"stage":10}}'::jsonb),
    ('journey-2-stage-15', 2, 15, 'Grace Under Pressure', 'You maintained a calm speaking pace despite discussing a tense topic.', 'Complete Journey 2, Stage 15 by describing a stressful commute with a slow, calm pace.', '{"journey_stage_completed":{"journey":2,"stage":15}}'::jsonb),
    ('journey-2-stage-20', 2, 20, 'The Steady Tour Guide', 'You maintained a steady pace and refused to rush through familiar details.', 'Complete Journey 2, Stage 20 by describing a quiet study place without speeding through the details.', '{"journey_stage_completed":{"journey":2,"stage":20}}'::jsonb),
    ('journey-2-stage-25', 2, 25, 'Heartfelt Speaker', 'You trained your voice to sound warm, sincere, and grateful.', 'Complete Journey 2, Stage 25 by speaking about someone who helped you with a warm and sincere tone.', '{"journey_stage_completed":{"journey":2,"stage":25}}'::jsonb),
    ('journey-2-stage-30', 2, 30, 'The Vocal Conductor', 'You juggled projection, pacing, tone, and eye contact without dropping your volume.', 'Defeat Journey 2, Stage 30 with a 90-second speech on adjusting to your grade level.', '{"journey_stage_completed":{"journey":2,"stage":30}}'::jsonb),

    ('journey-3-stage-01', 3, 1, 'The Sound of Silence', 'You embraced silent pauses instead of relying on filler words.', 'Complete Journey 3, Stage 01 by talking about your commute while using pauses instead of fillers.', '{"journey_stage_completed":{"journey":3,"stage":1}}'::jsonb),
    ('journey-3-stage-05', 3, 5, 'Smooth Recovery', 'You built the confidence to recover smoothly after an accidental slip-up.', 'Complete Journey 3, Stage 05 by discussing a new skill and recovering confidently from any slip.', '{"journey_stage_completed":{"journey":3,"stage":5}}'::jsonb),
    ('journey-3-stage-10', 3, 10, 'Clean Communicator', 'You locked in the habit of deliberate and clean speaking.', 'Complete Journey 3, Stage 10 by describing your school bag with deliberate, clean delivery.', '{"journey_stage_completed":{"journey":3,"stage":10}}'::jsonb),
    ('journey-3-stage-15', 3, 15, 'The Storyteller', 'You built your skill in creating relatable storytelling analogies.', 'Complete Journey 3, Stage 15 by explaining Wi-Fi to a child with a simple analogy.', '{"journey_stage_completed":{"journey":3,"stage":15}}'::jsonb),
    ('journey-3-stage-20', 3, 20, 'Empathetic Explainer', 'You built empathy into your communication style when explaining complex topics.', 'Complete Journey 3, Stage 20 by explaining Artificial Intelligence clearly and kindly to a grandparent.', '{"journey_stage_completed":{"journey":3,"stage":20}}'::jsonb),
    ('journey-3-stage-25', 3, 25, 'The Debater', 'You locked in foundational argumentative skills using structured reasoning.', 'Complete Journey 3, Stage 25 by explaining time management using I believe, because, and for example.', '{"journey_stage_completed":{"journey":3,"stage":25}}'::jsonb),
    ('journey-3-stage-30', 3, 30, 'The Flawless Timeline', 'You structured a complex narrative across the past, present, and future with precision.', 'Defeat Journey 3, Stage 30 with a 90-second past-present-future student journey speech.', '{"journey_stage_completed":{"journey":3,"stage":30}}'::jsonb),

    ('journey-4-stage-01', 4, 1, 'Unwavering Focus', 'You proved your ability to maintain constant volume without fading or looking away.', 'Complete Journey 4, Stage 01 by introducing yourself for 30 seconds with steady eye contact and constant volume.', '{"journey_stage_completed":{"journey":4,"stage":1}}'::jsonb),
    ('journey-4-stage-05', 4, 5, 'Commanding Presence', 'You filled the room vocally while maintaining upright posture.', 'Complete Journey 4, Stage 05 by stating your academic goals with upright posture and a clear voice.', '{"journey_stage_completed":{"journey":4,"stage":5}}'::jsonb),
    ('journey-4-stage-10', 4, 10, 'Absolute Certainty', 'You left no room for audience doubt through strong posture and vocal delivery.', 'Complete Journey 4, Stage 10 by stating your greatest personal strength with strong posture and voice.', '{"journey_stage_completed":{"journey":4,"stage":10}}'::jsonb),
    ('journey-4-stage-15', 4, 15, 'Measured Emotion', 'You used controlled gestures to stay composed during moments of frustration.', 'Complete Journey 4, Stage 15 by discussing a frustrating moment with controlled gestures and measured tone.', '{"journey_stage_completed":{"journey":4,"stage":15}}'::jsonb),
    ('journey-4-stage-20', 4, 20, 'The Embodiment of Excellence', 'You showed excellence through integrated visual and vocal mastery.', 'Complete Journey 4, Stage 20 by describing excellence through both visual and vocal delivery.', '{"journey_stage_completed":{"journey":4,"stage":20}}'::jsonb),
    ('journey-4-stage-25', 4, 25, 'The Diplomat', 'You delivered criticism while testing your professional posture and tact.', 'Complete Journey 4, Stage 25 by giving constructive criticism with a kind tone and professional posture.', '{"journey_stage_completed":{"journey":4,"stage":25}}'::jsonb),
    ('journey-4-stage-30', 4, 30, 'The Synchronized Catalyst', 'You synchronized dynamic gestures and a commanding voice to argue persuasively for change.', 'Defeat Journey 4, Stage 30 with a persuasive school-change speech using strong visual and vocal delivery.', '{"journey_stage_completed":{"journey":4,"stage":30}}'::jsonb),

    ('journey-5-stage-01', 5, 1, 'Quick Thinker', 'You proved rapid thinking and natural fluency under the pressure of a surprise prompt.', 'Complete Journey 5, Stage 01 by speaking fluently for 30 seconds on a surprise topic after short preparation.', '{"journey_stage_completed":{"journey":5,"stage":1}}'::jsonb),
    ('journey-5-stage-05', 5, 5, 'The Ultimate Advocate', 'You mastered self-advocacy and pitching your value proposition.', 'Complete Journey 5, Stage 05 by convincing a university or company that you are the solution they need.', '{"journey_stage_completed":{"journey":5,"stage":5}}'::jsonb),
    ('journey-5-stage-10', 5, 10, 'The Fade Master', 'You demonstrated mastery over intentional vocal drops and fading volume.', 'Complete Journey 5, Stage 10 by intentionally moving from a loud start to a controlled near whisper.', '{"journey_stage_completed":{"journey":5,"stage":10}}'::jsonb),
    ('journey-5-stage-15', 5, 15, 'The Executive Brief', 'You mastered concise, status-driven executive reporting.', 'Complete Journey 5, Stage 15 by giving a concise project update with status, progress, and next steps.', '{"journey_stage_completed":{"journey":5,"stage":15}}'::jsonb),
    ('journey-5-stage-20', 5, 20, 'Transparent Leader', 'You trained accountable, forward-focused transparency when dealing with mistakes.', 'Complete Journey 5, Stage 20 by addressing a group mistake with accountability and a forward plan.', '{"journey_stage_completed":{"journey":5,"stage":20}}'::jsonb),
    ('journey-5-stage-25', 5, 25, 'Honest Problem Solver', 'You proved honest, solution-focused accountability when facing critical errors.', 'Complete Journey 5, Stage 25 by explaining a critical project issue honestly while focusing on the solution.', '{"journey_stage_completed":{"journey":5,"stage":25}}'::jsonb),
    ('journey-5-stage-30', 5, 30, 'The Ironclad Defense', 'You demonstrated executive presence and professional polish while defending your hardest academic project.', 'Defeat Journey 5, Stage 30 with a 120-second final presentation to a strict panel.', '{"journey_stage_completed":{"journey":5,"stage":30}}'::jsonb)
)
INSERT INTO public.achievements (
  achievement_key,
  journey_number,
  stage_number,
  name,
  description,
  unlock_description,
  unlock_requirements,
  badge_url
)
SELECT
  achievement_key,
  journey_number,
  stage_number,
  name,
  description,
  unlock_description,
  unlock_requirements,
  'https://assets.bigkas.site/Sprites/Badges/Badge.png'
FROM seed
ON CONFLICT (achievement_key) DO UPDATE
SET
  journey_number = EXCLUDED.journey_number,
  stage_number = EXCLUDED.stage_number,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unlock_description = EXCLUDED.unlock_description,
  unlock_requirements = EXCLUDED.unlock_requirements,
  badge_url = COALESCE(public.achievements.badge_url, EXCLUDED.badge_url);
