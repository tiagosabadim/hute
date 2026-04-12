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

const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toStr = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/**
 * Generates available slots sequentially, jumping past busy intervals.
 * busyIntervals: [{ start: number, end: number }] in minutes from midnight
 */
function gerarSlotsDisponiveis(horaInicio, horaFim, duracaoMin, busyIntervals) {
  const busy = busyIntervals.slice().sort((a, b) => a.start - b.start);
  const slots = [];
  let cur = toMin(horaInicio);
  const fim = toMin(horaFim);
  while (cur + duracaoMin <= fim) {
    const overlap = busy.find(b => cur < b.end && cur + duracaoMin > b.start);
    if (overlap) {
      cur = overlap.end;
    } else {
      slots.push(toStr(cur));
      cur += duracaoMin;
    }
  }
  return slots;
}

function busyFromGoogleEvents(eventos) {
  // Parse time directly from ISO string to avoid UTC conversion on Netlify server
  const toLocalMin = (str) => {
    const m = (str || '').match(/T(\d{2}):(\d{2})/);
    return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
  };
  return eventos.map(e => ({
    start: toLocalMin(e.start.dateTime || e.start.date),
    end:   toLocalMin(e.end.dateTime   || e.end.date),
  }));
}

function busyFromMarcacoes(marcacoes, duracaoDefault) {
  return marcacoes.map(m => {
    const start = toMin(m.hora);
    const dur = m.duracao ? Number(m.duracao) : duracaoDefault;
    return { start, end: start + dur };
  });
}

function busyFromBlocks(blocks, duracaoDefault) {
  return blocks.map(b => {
    const start = toMin(b.hora);
    return { start, end: start + (b.duracao || duracaoDefault) };
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
    const busyBlocks = busyFromBlocks(slotBlockList, duracaoServico);

    // ── Per-professional logic ──────────────────────────────
    if (profissionalId) {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );

      const apptCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`);
      const apptSnap = await getDocs(apptCollection);
      const marcacoes = apptSnap.docs
        .map(d => d.data())
        .filter(a => a.profissionalId === profissionalId && a.data === data);
      const busyMarcacoes = busyFromMarcacoes(marcacoes, duracaoServico);

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
        // Always include Firestore appointments too (GCal may not have all bookings)
        const busy = [...busyFromGoogleEvents(eventos), ...busyBlocks, ...busyMarcacoes];
        const slotsLivres = gerarSlotsDisponiveis(horaInicio, horaFim, duracaoServico, busy);

        return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: true }) };
      } else {
        const busy = [...busyMarcacoes, ...busyBlocks];
        const slotsLivres = gerarSlotsDisponiveis(horaInicio, horaFim, duracaoServico, busy);

        return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: false, nativa: true }) };
      }
    }

    // ── Establishment-level logic ───────────────────────────
    if (!profile.googleRefreshToken) {
      const apptCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`);
      const apptSnap = await getDocs(apptCollection);
      const marcacoes = apptSnap.docs.map(d => d.data()).filter(a => a.data === data);

      const busy = [...busyFromMarcacoes(marcacoes, duracaoServico), ...busyBlocks];
      const slotsLivres = gerarSlotsDisponiveis(horaInicio, horaFim, duracaoServico, busy);
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

    // Always include Firestore appointments too (GCal may not have all bookings)
    const apptCollection2 = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`);
    const apptSnap2 = await getDocs(apptCollection2);
    const marcacoes2 = apptSnap2.docs.map(d => d.data()).filter(a => a.data === data);
    const busyMarcacoes2 = busyFromMarcacoes(marcacoes2, duracaoServico);

    const eventos = resposta.data.items || [];
    const busy = [...busyFromGoogleEvents(eventos), ...busyBlocks, ...busyMarcacoes2];
    const slotsLivres = gerarSlotsDisponiveis(horaInicio, horaFim, duracaoServico, busy);

    return { statusCode: 200, headers, body: JSON.stringify({ slots: slotsLivres, googleSync: true }) };

  } catch (error) {
    console.error('Erro getSlots:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
