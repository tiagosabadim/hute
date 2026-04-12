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

const APP_ID   = 'hutex-saas';
const EVO_BASE = 'https://evolution-api-production-2290.up.railway.app';

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

    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }

    const profile = profileDoc.data();

    // ── Evolution API (primary) ────────────────────────────────────────────────
    if (profile.evolutionInstanceName && process.env.EVOLUTION_API_KEY) {
      const url = `${EVO_BASE}/message/sendText/${profile.evolutionInstanceName}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY,
        },
        body: JSON.stringify({ number: phone, text: message }),
      });

      const resBody = await res.json().catch(() => ({}));

      if (res.ok) {
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, provider: 'evolution', response: resBody }) };
      }

      console.error('Evolution API error:', res.status, JSON.stringify(resBody));
      // Fall through to Z-API fallback
    }

    // ── Z-API (fallback) ───────────────────────────────────────────────────────
    const { zapiInstanceId, zapiToken, zapiClientToken } = profile;

    if (zapiInstanceId && zapiToken && zapiClientToken) {
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

      if (zapiRes.ok) {
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, provider: 'zapi', response: zapiBody }) };
      }

      console.error('Z-API error:', zapiRes.status, JSON.stringify(zapiBody));
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Falha ao enviar via Z-API', detail: zapiBody }) };
    }

    return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ error: 'Nenhuma integração WhatsApp configurada para este estabelecimento' }) };

  } catch (error) {
    console.error('Erro sendWhatsApp:', error.message);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
