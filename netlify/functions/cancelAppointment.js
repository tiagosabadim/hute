const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc, deleteDoc } = require('firebase/firestore/lite');

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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Método não permitido' };
  }

  try {
    const body = JSON.parse(event.body);
    const { lojaId, appointmentId, clienteWhats, nomeCliente, servico, data, hora, profissionalNome } = body;

    if (!lojaId || !appointmentId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'lojaId e appointmentId são obrigatórios' }) };
    }

    const db = getDb();

    // Get slug from profile
    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    const profileData = profileDoc.exists() ? profileDoc.data() : {};
    const slug = profileData.slug || lojaId;
    const connectedPhone = profileData.whatsappNumber || '';

    // Delete appointment from Firestore
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`, appointmentId));

    // ── n8n cancel webhook ─────────────────────────────────
    const telefoneNormalizado = (() => {
      const digits = (clienteWhats || '').replace(/\D/g, '');
      return digits.startsWith('55') ? digits : `55${digits}`;
    })();

    if (process.env.N8N_CANCEL_WEBHOOK_URL) {
      await fetch(process.env.N8N_CANCEL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefoneCliente: telefoneNormalizado,
          nomeCliente: nomeCliente || '',
          servico: servico || '',
          data: data || '',
          hora: hora || '',
          profissionalNome: profissionalNome || '',
          slug,
          lojaId,
          connectedPhone,
        }),
      }).catch(err => console.error('n8n cancel webhook error:', err.message));
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    console.error('Erro cancelAppointment:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
