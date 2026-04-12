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

  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  try {
    const db = getDb();

    const profilesSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'));
    const profiles = profilesSnap.docs.map(d => ({ lojaId: d.id, ...d.data() }));

    const results = await Promise.all(
      profiles.map(async (prof) => {
        const { lojaId, slug, nome: nomeEstabelecimento, whatsappNumber } = prof;
        const slugFinal = slug || lojaId;
        const connectedPhone = whatsappNumber || '';
        try {
          const snap = await getDocs(
            collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`)
          );
          return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => {
              if (!a.data || !a.hora) return false;
              const [h, m] = a.hora.split(':').map(Number);
              const apptTime = new Date(`${a.data}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
              return apptTime >= now && apptTime <= twoHoursLater;
            })
            .map(a => ({
              telefoneCliente: normalizePhone(a.clienteWhats),
              nomeCliente: a.clienteNome || '',
              servico: a.servico || '',
              data: a.data || '',
              hora: a.hora || '',
              profissionalNome: a.profissionalNome || '',
              nomeEstabelecimento: nomeEstabelecimento || '',
              connectedPhone,
              linkAgendamento: `https://hute.netlify.app/#${slugFinal}/agendamento/${a.id}`,
            }));
        } catch {
          return [];
        }
      })
    );

    const appointments = results.flat().sort((a, b) => {
      const dtA = `${a.data}${a.hora}`;
      const dtB = `${b.data}${b.hora}`;
      return dtA > dtB ? 1 : -1;
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ appointments }),
    };

  } catch (error) {
    console.error('Erro getAppointmentsNext2Hours:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
