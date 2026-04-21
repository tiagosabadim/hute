const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore/lite');
const { computeSlots } = require('./utils/slotEngine');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

const APP_ID = 'hutex-saas';

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const { lojaId, data, duracao, profissionalId } = event.queryStringParameters || {};

  if (!lojaId || !data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'lojaId e data são obrigatórios' }) };
  }

  try {
    const db = getDb();
    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));

    if (!profileDoc.exists()) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }

    const profile = profileDoc.data();
    const duracaoServico = duracao ? Number(duracao) : (profile.intervalo || 60);

    // Sanitize: URLSearchParams serialises null/undefined as the string "null"/"undefined"
    const cleanProfId = (profissionalId && profissionalId !== 'null' && profissionalId !== 'undefined')
      ? profissionalId : null;

    const result = await computeSlots(db, lojaId, profile, data, duracaoServico, cleanProfId);

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (error) {
    console.error('Erro getSlots:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
