import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Leer .env manualmente
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=').map(part => part.trim()))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las variables de entorno de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomTime = () => {
  const h = randomInt(9, 17);
  const m = Math.random() > 0.5 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
};

async function generateAgendaData() {
  const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
  const numCitas = parseInt(process.argv[3] || '8', 10);
  
  console.log(`🚀 Generando ${numCitas} citas PENDIENTES (Agenda) para el día: ${targetDate}`);

  const { data: sucursales } = await supabase.from('sucursales').select('id').limit(1);
  if (!sucursales?.length) throw new Error('No hay sucursales');
  const sucursal_id = sucursales[0].id;

  const { data: podologos } = await supabase.from('podologos').select('id').limit(2);
  if (!podologos?.length) throw new Error('No hay podólogos');

  const { data: pacientes } = await supabase.from('pacientes').select('id').limit(10);
  if (!pacientes?.length) throw new Error('No hay pacientes. Crea al menos uno en la app.');

  for (let i = 0; i < numCitas; i++) {
    const paciente = pacientes[randomInt(0, pacientes.length - 1)];
    const podologo = podologos[randomInt(0, podologos.length - 1)];
    
    const { data: cita, error: citaError } = await supabase.from('citas').insert([{
      paciente_id: paciente.id,
      podologo_id: podologo.id,
      sucursal_id: sucursal_id,
      fecha_cita: targetDate,
      hora_cita: randomTime(),
      motivo: 'Cita de Agenda (Sin atención aún)',
      estado: 'Pendiente'
    }]).select().single();

    if (citaError) {
      console.error('❌ Error creando cita:', citaError);
      continue;
    }

    console.log(`✅ Cita ${cita.id.split('-')[0]} generada -> Estado: Pendiente`);
  }

  console.log('\n🎉 ¡Citas de agenda generadas!');
}

generateAgendaData().catch(console.error);
