import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching up to 10 latest projects...");
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) {
    console.error("Fetch Error:", error);
  } else {
    console.log("Projects Found:", data?.length);
    data?.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.project_name} | Results: ${typeof p.results} | Results Length: ${p.results ? p.results.length : 'NULL'} | Total HT: ${p.total_ht}`);
      if (p.results && Array.isArray(p.results) && p.results.length > 0) {
        console.log("Sample Result Lot[0]:", JSON.stringify(p.results[0]));
      }
    });
  }

  if (data && data.length > 0) {
    const target = data[0].id;
    console.log(`\nAttempting to delete project ID: ${target}`);
    const { error: delErr } = await supabase.from('projects').delete().eq('id', target);
    if (delErr) {
      console.error("Delete Error:", delErr);
    } else {
      console.log("Delete SUCCESS on", target);
    }
  }
}

check();
