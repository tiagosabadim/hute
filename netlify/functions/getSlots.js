const { google } = require('googleapis');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

const APP_ID = 'hutex-saas';

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

function gerarSlots(horaInicio, horaFim, intervaloMin) {
  const slots = [];
  let [h, m] = horaInicio.split(':').map(Number);
  const [hf, mf] = horaFim.split(':').map(Number);
  while (h < hf || (h === hf && m < mf)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += intervaloMin;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

function slotOcupado(slotStr, dataStr, duracaoMin, eventos) {
  const slotInicio = new Date(`${dataStr}T${slotStr}:00`);
  const slotFim = new Date(slotInicio.getTime() + duracaoMin * 60 * 1000);
  return eventos.some(evento => {
    const eventoInicio = new Date(evento.start.dateTime || `${evento.start.date}T00:00:00`);
    const eventoFim = new Date(evento.end.dateTime || `${evento.end.date}T23:59:59`);
    return slotInicio < eventoFim && slotFim > eventoInicio;
  });
}

function slotOcupadoNativo(slotStr, dataStr, duracaoMin, marcacoes) {
  const slotInicio = new Date(`${dataStr}T${slotStr}:00`);
  const slotFim = new Date(slotInicio.getTime() + duracaoMin * 60 * 1000);
  return marcacoes.some(m => {
    if (m.data !== dataStr) return false;
    const mInicio = new Date(`${dataStr}T${m.hora}:00`);
    const mDuracao = m.duracao ? Number(m.duracao) : duracaoMin;
    const mFim = new Date(mInicio.getTime() + mDuracao * 60 * 1000);
    return slotInicio < mFim && slotFim > mInicio;
  });
}

function slotBloqueado(slotStr, dataStr, duracaoMin, blockedSlots) {
  const slotInicio = new Date(`${dataStr}T${slotStr}:00`);
  const slotFim = new Date(slotInicio.getTime() + duracaoMin * 60 * 1000);
  return blockedSlots.some(b => {
    const bInicio = new Date(`${dataStr}T${b.hora}:00`);
    const bFim = new Date(bInicio.getTime() + (b.duracao || 60) * 60 * 1000);
    return slotInicio < bFim && slotFim > bInicio;
  });
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
    const intervalo = profile.intervalo || 60;
    const duracaoServico = duracao ? Number(duracao) : intervalo;

    // ── Fetch and apply blocks ──────────────────────────────
    const blocksSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${lojaId}`));
    const allBlocks = blocksSnap.docs.map(d => d.data()).filter(b => b.date === data);
    const relevantBlocks = allBlocks.filter(b => !b.profissionalId || b.profissionalId === profissionalId);

    // Full day off → no slots
    if (relevantBlocks.some(b => b.type === 'day_off')) {
      return { statusCode: 200, headers, body: JSON.stringify({ slots: [], googleSync: false, blocked: true }) };
    }

    // Custom hours override
    const customHours = relevantBlocks.find(b => b.type === 'custom_hours');
    const horaInicio = customHours ? customHours.horaInicio : (profile.horaInicio || '09:00');
    const horaFim    = customHours ? customHours.horaFim    : (profile.horaFim    || '18:00');

    const slotBlockList = relevantBlocks.filter(b => b.type === 'slot');
    // Use the requested service duration as the step so a 30-min service
    // generates slots at 09:00, 09:30, 10:00… instead of just 09:00, 10:00…
    const todosSlots = gerarSlots(horaInicio, horaFim, duracaoServico);

    // ── Per-professional logic ──────────────────────────────
    if (profissionalId) {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );

      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        const refreshToken = profCalDoc.data().googleRefreshToken;
        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const inicioDia = new Date(`${data}T00:00:00`).toISOString();
        const fimDia    = new Date(`${data}T23:59:59`).toISOString();

        const resposta = await calendar.events.list({
          calendarId: 'primary',
          timeMin: inicioDia,
          timeMax: fimDia,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const eventos = resposta.data.items || [];
        const slotsLivres = todosSlots.filter(slot =>
          !slotOcupado(slot, data, duracaoServico, eventos) &&
          !slotBloqueado(slot, data, duracaoServico, slotBlockList)
        );

        return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: true }) };
      } else {
        const apptCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`);
        const apptSnap = await getDocs(apptCollection);
        const marcacoes = apptSnap.docs
          .map(d => d.data())
          .filter(a => a.profissionalId === profissionalId && a.data === data);

        const slotsLivres = todosSlots.filter(slot =>
          !slotOcupadoNativo(slot, data, duracaoServico, marcacoes) &&
          !slotBloqueado(slot, data, duracaoServico, slotBlockList)
        );

        return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: false, nativa: true }) };
      }
    }

    // ── Establishment-level logic ───────────────────────────
    if (!profile.googleRefreshToken) {
      const slotsLivres = todosSlots.filter(slot =>
        !slotBloqueado(slot, data, duracaoServico, slotBlockList)
      );
      return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: false }) };
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: profile.googleRefreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const inicioDia = new Date(`${data}T00:00:00`).toISOString();
    const fimDia    = new Date(`${data}T23:59:59`).toISOString();

    const resposta = await calendar.events.list({
      calendarId: 'primary',
      timeMin: inicioDia,
      timeMax: fimDia,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const eventos = resposta.data.items || [];
    const slotsLivres = todosSlots.filter(slot =>
      !slotOcupado(slot, data, duracaoServico, eventos) &&
      !slotBloqueado(slot, data, duracaoServico, slotBlockList)
    );

    return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: true }) };

  } catch (error) {
    console.error('Erro getSlots:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
