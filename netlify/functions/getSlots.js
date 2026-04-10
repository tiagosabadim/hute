const { google } = require('googleapis');
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

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

// Gera todos os slots possíveis do dia com base no horário do estabelecimento
function gerarSlots(horaInicio, horaFim, intervaloMin) {
  const slots = [];
  let [h, m] = horaInicio.split(':').map(Number);
  const [hf, mf] = horaFim.split(':').map(Number);
  while (h < hf || (h === hf && m < mf)) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += intervaloMin;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

// Verifica se um slot colide com algum evento do Google Calendar
function slotOcupado(slotStr, dataStr, intervaloMin, eventos) {
  const slotInicio = new Date(`${dataStr}T${slotStr}:00`);
  const slotFim = new Date(slotInicio.getTime() + intervaloMin * 60 * 1000);

  return eventos.some(evento => {
    const eventoInicio = new Date(evento.start.dateTime || `${evento.start.date}T00:00:00`);
    const eventoFim = new Date(evento.end.dateTime || `${evento.end.date}T23:59:59`);
    // Colisão: o slot começa antes do evento acabar E acaba depois do evento começar
    return slotInicio < eventoFim && slotFim > eventoInicio;
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const { lojaId, data, duracao } = event.queryStringParameters || {};

  if (!lojaId || !data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'lojaId e data são obrigatórios' }) };
  }

  try {
    const db = getDb();
    const profileDoc = await getDoc(doc(db, 'artifacts', 'hutex-saas', 'public', 'data', 'profiles', lojaId));

    if (!profileDoc.exists()) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }

    const profile = profileDoc.data();
    const horaInicio = profile.horaInicio || '09:00';
    const horaFim = profile.horaFim || '18:00';
    const intervalo = profile.intervalo || 60;
    // duracao do serviço selecionado (pode diferir do intervalo base)
    const duracaoServico = duracao ? Number(duracao) : intervalo;

    // Se não tem Google Calendar ligado, devolve todos os slots sem filtrar
    if (!profile.googleRefreshToken) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ slots: gerarSlots(horaInicio, horaFim, intervalo), googleSync: false })
      };
    }

    // Busca eventos do Google Calendar para o dia
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: profile.googleRefreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const inicioDia = new Date(`${data}T00:00:00`).toISOString();
    const fimDia = new Date(`${data}T23:59:59`).toISOString();

    const resposta = await calendar.events.list({
      calendarId: 'primary',
      timeMin: inicioDia,
      timeMax: fimDia,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const eventos = resposta.data.items || [];

    // Filtra os slots livres usando a duração real do serviço
    const todosSlots = gerarSlots(horaInicio, horaFim, intervalo);
    const slotsLivres = todosSlots.filter(slot => !slotOcupado(slot, data, duracaoServico, eventos));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ slots: slotsLivres, googleSync: true })
    };

  } catch (error) {
    console.error('Erro getSlots:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
