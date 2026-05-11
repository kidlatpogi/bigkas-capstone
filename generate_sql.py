import re
import os
import json

md_file = r'd:\Codes\Capstone\bigkas-capstone\activities.md'
sql_file = r'd:\Codes\Capstone\bigkas-capstone\old_sql.txt'
out_sql_file = r'd:\Codes\Capstone\bigkas-capstone\supabase\populate_journeys.sql'
titles_file = r'd:\Codes\Capstone\bigkas-capstone\new_titles.json'

with open(md_file, 'r', encoding='utf-8') as f:
    text = f.read()

existing_titles = {}
try:
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_text = f.read()
    
    matches = re.findall(r"\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)'", sql_text)
    for lvl, ord_, phase, title in matches:
        existing_titles[(int(lvl), int(ord_))] = (phase, title)
except Exception as e:
    print(f"Error reading existing sql: {e}")

new_titles = {}
try:
    with open(titles_file, 'r', encoding='utf-8') as f:
        new_titles = json.load(f)
except Exception as e:
    print(f"Error reading new titles: {e}")

stages = []

# Split text by Journey
journeys = re.split(r'START OF JOURNEY', text)
for j_idx, j_text in enumerate(journeys):
    if j_idx == 0:
        continue # before first journey
    
    current_level = j_idx
    
    # Find all stages in this journey
    # Match: **Stage XX:** "Objective..."
    # Then: **B-01's Purpose:** Purpose...
    stage_blocks = re.split(r'\*\*Stage \d+.*?\*\*', j_text)
    
    order = 0
    for block in stage_blocks[1:]: # skip text before first stage
        order += 1
        
        # block contains "objective" and **B-01's Purpose:** purpose
        parts = re.split(r'\*\*B-01.*?Purpose:\*\*', block)
        objective_raw = parts[0].strip()
        
        # Remove surrounding quotes from objective if present
        if objective_raw.startswith('"'):
            objective_raw = objective_raw[1:]
        if objective_raw.endswith('"'):
            objective_raw = objective_raw[:-1]
            
        objective = objective_raw.replace("'", "''").strip().replace('\n', ' ')
        
        purpose_raw = parts[1].strip() if len(parts) > 1 else ''
        # clean up purpose (remove END OF JOURNEY etc)
        purpose_raw = purpose_raw.split('END OF JOURNEY')[0].split('---')[0].strip()
        purpose = purpose_raw.replace("'", "''").replace('\n', ' ')
        
        # Try to get from existing old_sql first
        phase_name, title = existing_titles.get((current_level, order), (None, None))
        
        if phase_name is None:
            # Try to get from new_titles.json
            lvl_str = str(current_level)
            ord_str = str(order)
            if lvl_str in new_titles and ord_str in new_titles[lvl_str]:
                phase_name, title = new_titles[lvl_str][ord_str]
            else:
                phase_name, title = ('Training', f'Stage {order}')
                
        stages.append({
            'level': current_level, 
            'order': order, 
            'phase_name': phase_name, 
            'title': title, 
            'objective': objective, 
            'purpose': purpose
        })

print(f'Parsed {len(stages)} stages.')
print("Levels parsed:")
for s in stages:
    print(f"L{s['level']} S{s['order']}")

# Now construct the SQL
sql_out = """-- Robust migration to (re)create the activities table and populate curriculum
-- Handles cases where the table may or may not exist.

BEGIN;

-- 1. Create table if not exists (or drop and recreate for a clean slate)
DROP TABLE IF EXISTS public.activities CASCADE;

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_level integer NOT NULL DEFAULT 1 CHECK (target_level >= 1 AND target_level <= 5),
  activity_order integer NOT NULL,
  phase_name text,
  title text,
  objective text NOT NULL,
  purpose text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT activities_pkey PRIMARY KEY (id)
);

-- 2. Populate the data (Levels 1-2 based on activities.md)
INSERT INTO public.activities (target_level, activity_order, phase_name, title, objective, purpose) VALUES
"""

values = []
for s in stages:
    v = f"({s['level']}, {s['order']}, '{s['phase_name']}', '{s['title']}', '{s['objective']}', '{s['purpose']}')"
    values.append(v)

sql_out += ",\n".join(values) + ";\n\n"

sql_out += """-- 3. Enable RLS and grant public read access
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.activities;
CREATE POLICY "Allow public read access" ON public.activities
  FOR SELECT
  USING (true);

COMMIT;
"""

with open(out_sql_file, 'w', encoding='utf-8') as f:
    f.write(sql_out)

print("SQL written successfully.")
