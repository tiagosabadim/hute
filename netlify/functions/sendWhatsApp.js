const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore/lite');

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

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  let { lojaId, connectedPhone, phone, message } = body;

  if (!phone || !message) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'phone e message são obrigatórios' }) };
  }

  // Normalize destination phone
  phone = phone.replace(/\D/g, '');
  if (phone && !phone.startsWith('55')) phone = `55${phone}`;

  try {
    const db = getDb();

    // Resolve lojaId from connectedPhone if needed
    if (!lojaId && connectedPhone) {
      const normalized = connectedPhone.replace(/\D/g, '');
      const whatsSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'whatsappNumbers', normalized));
      if (!whatsSnap.exists()) {
        return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado para connectedPhone' }) };
      }
      lojaId = whatsSnap.data().lojaId;
    }

    if (!lojaId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'lojaId ou connectedPhone é obrigatório' }) };
    }

    // Fetch Z-API credentials from profile
    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }

    const { zapiInstanceId, zapiToken, zapiClientToken } = profileDoc.data();

    if (!zapiInstanceId || !zapiToken || !zapiClientToken) {
      return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ error: 'Credenciais Z-API não configuradas para este estabelecimento' }) };
    }

    // Send via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`;
    const zapiRes = await fetch(zapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': zapiClientToken,
      },
      body: JSON.stringify({ phone, message }),
    });

    const zapiBody = await zapiRes.json().catch(() => ({}));

    if (!zapiRes.ok) {
      console.error('Z-API error:', zapiRes.status, JSON.stringify(zapiBody));
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Falha ao enviar via Z-API', detail: zapiBody }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, zapiResponse: zapiBody }) };

  } catch (error) {
    console.error('Erro sendWhatsApp:', error.message);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
