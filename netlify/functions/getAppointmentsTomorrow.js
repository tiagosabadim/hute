const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const APP_ID = 'hutex-saas';

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  const { lojaId } = event.queryStringParameters || {};
  if (!lojaId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'lojaId é obrigatório' }) };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const db = getDb();

    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    const slug = profileDoc.exists() ? (profileDoc.data().slug || lojaId) : lojaId;

    const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
    const appointments = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.data === tomorrowISO)
      .sort((a, b) => a.hora > b.hora ? 1 : -1)
      .map(a => ({
        telefoneCliente: (() => {
          const digits = (a.clienteWhats || '').replace(/\D/g, '');
          return digits.startsWith('55') ? digits : `55${digits}`;
        })(),
        nomeCliente: a.clienteNome || '',
        servico: a.servico || '',
        data: a.data || '',
        hora: a.hora || '',
        profissionalNome: a.profissionalNome || '',
        linkAgendamento: `https://hute.netlify.app/#${slug}/agendamento/${a.id}`,
      }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ appointments }),
    };

  } catch (error) {
    console.error('Erro getAppointmentsTomorrow:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
