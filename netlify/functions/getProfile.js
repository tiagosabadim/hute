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

/**
 * GET /.netlify/functions/getProfile?lojaId=UID
 * GET /.netlify/functions/getProfile?slug=meu-salao
 *
 * Returns establishment profile for N8N / WhatsApp bot flows.
 * Response:
 *   { lojaId, nome, subtitulo, slug, horaInicio, horaFim, intervalo,
 *     servicos: [{ nome, preco, duracao }],
 *     profissionals: [{ id, nome, servicos, agendaTipo, googleCalendarConnected }] }
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const { lojaId, slug } = event.queryStringParameters || {};

  try {
    const db = getDb();
    let uid = lojaId;

    if (!uid && slug) {
      const slugDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', slug));
      if (!slugDoc.exists()) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
      }
      uid = slugDoc.data().uid;
    }

    if (!uid) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Forneça lojaId ou slug' }) };
    }

    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Perfil não encontrado' }) };
    }

    const p = profileDoc.data();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        lojaId: uid,
        nome: p.nome || '',
        subtitulo: p.subtitulo || '',
        slug: p.slug || '',
        horaInicio: p.horaInicio || '09:00',
        horaFim: p.horaFim || '18:00',
        intervalo: p.intervalo || 60,
        servicos: (p.servicos || []).map(s => ({
          nome: s.nome,
          preco: s.preco || null,
          duracao: s.duracao || (p.intervalo || 60),
        })),
        profissionals: (p.profissionals || []).map(prof => ({
          id: prof.id,
          nome: prof.nome,
          servicos: prof.servicos || [],
          agendaTipo: prof.agendaTipo || 'nativa',
          googleCalendarConnected: !!prof.googleCalendarConnected,
        })),
      }),
    };

  } catch (error) {
    console.error('Erro getProfile:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
