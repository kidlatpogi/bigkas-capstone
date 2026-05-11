const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pkshjglggqfuostxpllo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrc2hqZ2xnZ3FmdW9zdHhwbGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTA0NDcsImV4cCI6MjA4Njc4NjQ0N30.JHg-amPOe03p7WN92wIFn590BJw8La9KMC7We5VZbVE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateJourneys() {
  console.log('Fetching Journey 1 activities...');
  const { data: level1, error: fetchError } = await supabase
    .from('activities')
    .select('activity_order, title, phase_name, objective')
    .eq('target_level', 1);

  if (fetchError || !level1.length) {
    console.error('Error fetching Level 1:', fetchError || 'No data found');
    return;
  }

  console.log(`Found ${level1.length} activities in Journey 1.`);

  for (let level = 2; level <= 5; level++) {
    console.log(`Populating Journey ${level}...`);
    
    // Delete existing
    await supabase.from('activities').delete().eq('target_level', level);

    const rows = level1.map(row => ({
      ...row,
      target_level: level
    }));

    const { error: insertError } = await supabase
      .from('activities')
      .insert(rows);

    if (insertError) {
      console.error(`Error inserting Level ${level}:`, insertError);
    } else {
      console.log(`Successfully populated Journey ${level}.`);
    }
  }

  console.log('Done!');
}

populateJourneys();
