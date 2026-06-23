const SUPABASE_URL = "https://wsccyyzbdfxeqdlldaaz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2N5eXpiZGZ4ZXFkbGxkYWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2OTUzNCwiZXhwIjoyMDkxOTQ1NTM0fQ.pJ2ziPQROz15m_salOnkgL0Pyz8ITyeQtkrjI3mTPWc";

async function main() {
  console.log('Sending REST request to Supabase using global fetch...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?select=id,number`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Data sample:', data.slice(0, 3));
  } catch (err) {
    console.error('REST request failed:', err);
  }
}

main();
