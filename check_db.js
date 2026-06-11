import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mzhwbygibrymzjaavyuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aHdieWdpYnJ5bXpqYWF2eXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzkwNDUsImV4cCI6MjA5NDg1NTA0NX0.QV5O1ciBRPGGT6c6eubBaB2Nb2eBK01QFEZLsaaDBL0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('announcements').select('id, title, apply_url');
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  console.log('Announcements in DB:');
  data.forEach(ann => {
    console.log(`- [${ann.id}] ${ann.title}: ${ann.apply_url}`);
  });
}

check();
