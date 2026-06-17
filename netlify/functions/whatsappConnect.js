const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const APP_ID   = 'hutex-saas';
const EVO_BASE = process.env.EVOLUTION_API_URL || 'http://204.216.165.193:8080';

function evoHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': process.env.EVOLUTION_API_KEY || '',
  };
}

// Sanitize slug → valid Evolution instance name (alphanumeric + hyphens, max 32 chars)
function toInstanceName(slug, lojaId) {
  const base = (slug || lojaId).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return base.slice(0, 26) + '-' + lojaId.slice(0, 5);
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const action  = body.action  || (event.queryStringParameters || {}).action;
  const lojaId  = body.lojaId  || (event.queryStringParameters || {}).lojaId;

  if (!action || !lojaId) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'action e lojaId são obrigatórios' }) };
  }

  try {
    const db = getDb();
    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }
    const profile = profileDoc.data();

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const instanceName = toInstanceName(profile.slug, lojaId);
      const instanceToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const res = await fetch(`${EVO_BASE}/instance/create`, {
        method: 'POST',
        headers: evoHeaders(),
        body: JSON.stringify({
          instanceName,
          token: instanceToken,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 403) {
        // 403 = instance already exists — proceed to fetch QR anyway
        console.error('Evolution create error:', res.status, JSON.stringify(data));
        return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Falha ao criar instância', detail: data }) };
      }

      // Extract QR base64 from create response (present when status=403 means already exists, we need to call connect)
      let qrcode = data?.qrcode?.base64 || data?.base64 || null;

      // Persist to Firestore
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId),
        { evolutionInstanceName: instanceName, evolutionApiKey: instanceToken },
        { merge: true }
      );

      // If QR not in create response, fetch it via connect
      if (!qrcode) {
        const qrRes = await fetch(`${EVO_BASE}/instance/connect/${instanceName}`, { headers: evoHeaders() });
        const qrData = await qrRes.json().catch(() => ({}));
        qrcode = qrData?.base64 || qrData?.qrcode?.base64 || null;
      }

      return { statusCode: 200, headers: cors, body: JSON.stringify({ instanceName, qrcode }) };
    }

    // ── QRCODE ────────────────────────────────────────────────────────────────
    if (action === 'qrcode') {
      const instanceName = profile.evolutionInstanceName;
      if (!instanceName) {
        return { statusCode: 422, headers: cors, body: JSON.stringify({ error: 'Instância não criada' }) };
      }

      const res = await fetch(`${EVO_BASE}/instance/connect/${instanceName}`, { headers: evoHeaders() });
      const data = await res.json().catch(() => ({}));
      const qrcode = data?.base64 || data?.qrcode?.base64 || null;

      return { statusCode: 200, headers: cors, body: JSON.stringify({ qrcode }) };
    }

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (action === 'status') {
      const instanceName = profile.evolutionInstanceName;
      if (!instanceName) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ state: 'not_created' }) };
      }

      const res = await fetch(`${EVO_BASE}/instance/connectionState/${instanceName}`, { headers: evoHeaders() });
      const data = await res.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state || 'unknown';

      // If connected, ensure profile is marked
      if (state === 'open') {
        await setDoc(
          doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId),
          { whatsappConnected: true },
          { merge: true }
        );
      }

      return { statusCode: 200, headers: cors, body: JSON.stringify({ state, instanceName }) };
    }

    // ── PAIRING CODE ──────────────────────────────────────────────────────────
    if (action === 'pairingCode') {
      const instanceName = profile.evolutionInstanceName;
      if (!instanceName) {
        return { statusCode: 422, headers: cors, body: JSON.stringify({ error: 'Instância não criada. Clique em Conectar WhatsApp primeiro.' }) };
      }

      const number = (body.number || (event.queryStringParameters || {}).number || '').replace(/\D/g, '');
      if (!number) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'number é obrigatório para pairing code' }) };
      }

      const res = await fetch(
        `${EVO_BASE}/instance/connect/${instanceName}?number=${number}`,
        { headers: evoHeaders() }
      );
      const data = await res.json().catch(() => ({}));

      // Evolution API returns the pairing code in different fields depending on version
      const code = data?.code || data?.pairingCode || data?.pairing_code || null;

      if (!code) {
        console.error('pairingCode response:', JSON.stringify(data));
        return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Código não retornado pela API', detail: data }) };
      }

      // Start polling on server side is not needed — client polls status
      return { statusCode: 200, headers: cors, body: JSON.stringify({ code }) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Ação inválida: ${action}` }) };

  } catch (error) {
    console.error('Erro whatsappConnect:', error.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
  }
};
