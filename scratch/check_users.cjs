
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jrltsopcreqgwrqrxzwg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_86cCWIeeRHzEG1_8UP_w6g_P3i2vTrd';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPendingUsers() {
  console.log('Consultando usuarios con ID "pending_"...');
  
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, email, nombres, apellidos, created_at')
    .like('id', 'pending_%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (data.length === 0) {
    console.log('No se encontraron usuarios con ID "pending_".');
  } else {
    console.log(`Se encontraron ${data.length} usuarios pendientes:`);
    data.forEach(u => {
      console.log(`- [${u.id}] ${u.nombres} ${u.apellidos} (${u.email}) - Creado: ${u.created_at}`);
    });
  }
}

checkPendingUsers();
