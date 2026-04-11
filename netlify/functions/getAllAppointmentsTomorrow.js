const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const APP_ID = 'hutex-saas';

function normalizePhone(whats) {
  const digits = (whats || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const db = getDb();

    // Fetch all establishment profiles
    const profilesSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'));
    const profiles = profilesSnap.docs.map(d => ({ lojaId: d.id, ...d.data() }));

    // Fetch tomorrow's appointments for all lojas in parallel
    const results = await Promise.all(
      profiles.map(async (prof) => {
        const { lojaId, slug, nome: nomeEstabelecimento } = prof;
        const slugFinal = slug || lojaId;
        try {
          const snap = await getDocs(
            collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`)
          );
          return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => a.data === tomorrowISO)
            .map(a => ({
              telefoneCliente: normalizePhone(a.clienteWhats),
              nomeCliente: a.clienteNome || '',
              servico: a.servico || '',
              data: a.data || '',
              hora: a.hora || '',
              profissionalNome: a.profissionalNome || '',
              nomeEstabelecimento: nomeEstabelecimento || '',
              linkAgendamento: `https://hute.netlify.app/#${slugFinal}/agendamento/${a.id}`,
            }));
        } catch {
          return [];
        }
      })
    );

    const appointments = results.flat().sort((a, b) => a.hora > b.hora ? 1 : -1);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ appointments }),
    };

  } catch (error) {
    console.error('Erro getAllAppointmentsTomorrow:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
