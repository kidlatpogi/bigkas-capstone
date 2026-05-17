ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS passing_score jsonb NOT NULL DEFAULT '[{"metric":"overall_score","threshold":60}]'::jsonb;

UPDATE public.activities
SET passing_score = '[{"metric":"visual_score","threshold":60}]'::jsonb
WHERE target_level = 1 AND activity_order BETWEEN 1 AND 10;

UPDATE public.activities
SET passing_score = '[{"metric":"vocal_score","threshold":60}]'::jsonb
WHERE target_level = 1 AND activity_order BETWEEN 11 AND 20;

UPDATE public.activities
SET passing_score = '[{"metric":"verbal_score","threshold":60}]'::jsonb
WHERE target_level = 1 AND activity_order BETWEEN 21 AND 29;

UPDATE public.activities
SET passing_score = '[{"metric":"vocal_score","threshold":60}]'::jsonb
WHERE target_level = 2
  AND (
    activity_order BETWEEN 1 AND 22
    OR activity_order IN (24, 25, 29)
  );

UPDATE public.activities
SET passing_score = '[{"metric":"visual_score","threshold":60},{"metric":"vocal_score","threshold":60}]'::jsonb
WHERE target_level = 2 AND activity_order IN (23, 26, 27, 28);

UPDATE public.activities
SET passing_score = '[{"metric":"verbal_score","threshold":60}]'::jsonb
WHERE target_level = 3 AND activity_order BETWEEN 1 AND 29;

UPDATE public.activities
SET passing_score = '[{"metric":"visual_score","threshold":60},{"metric":"vocal_score","threshold":60}]'::jsonb
WHERE target_level = 4
  AND (
    activity_order BETWEEN 1 AND 22
    OR activity_order IN (24, 25, 27)
  );

UPDATE public.activities
SET passing_score = '[{"metric":"overall_score","threshold":60}]'::jsonb
WHERE (target_level = 1 AND activity_order = 30)
   OR (target_level = 2 AND activity_order = 30)
   OR (target_level = 3 AND activity_order = 30)
   OR (target_level = 4 AND activity_order IN (23, 26, 28, 29, 30))
   OR target_level = 5;
