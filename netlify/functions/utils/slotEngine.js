/**
 * slotEngine.js — shared slot calculation logic
 * Used by getSlots.js (HTTP handler) and chatbotHandler.js (chatbot flow).
 * Single source of truth: fix here, fixed everywhere.
 */

const { google } = require('googleapis');
const { doc, getDoc, collection, getDocs } = require('firebase/firestore/lite');

const APP_ID = 'hutex-saas';
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

// ── Time helpers ──────────────────────────────────────────────────────────────

const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toStr = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/**
 * Generates available time slots, jumping past busy intervals.
 * @param {string} horaInicio - e.g. "09:00"
 * @param {string} horaFim    - e.g. "18:00"
 * @param {number} duracaoMin - slot duration in minutes
 * @param {{ start: number, end: number }[]} busyIntervals - in minutes from midnight
 */
function gerarSlots(horaInicio, horaFim, duracaoMin, busyIntervals) {
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

/**
 * Converts Google Calendar events to busy intervals.
 * Parses time directly from the ISO string to avoid UTC conversion on the server.
 */
function busyFromGoogleEvents(eventos) {
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
    return { start, end: start + (m.duracao ? Number(m.duracao) : duracaoDefault) };
  });
}

function busyFromBlocks(blocks, duracaoDefault) {
  return blocks.map(b => {
    const start = toMin(b.hora);
    return { start, end: start + (b.duracao || duracaoDefault) };
  });
}

async function fetchGCalEvents(refreshToken, data) {
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2 });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(`${data}T00:00:00`).toISOString(),
    timeMax: new Date(`${data}T23:59:59`).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

// ── Main exported function ────────────────────────────────────────────────────

/**
 * Computes available slots for a given date, professional, and service duration.
 *
 * @param {object} db             - Firestore instance
 * @param {string} lojaId         - establishment ID
 * @param {object} profile        - establishment profile data
 * @param {string} data           - ISO date string (YYYY-MM-DD)
 * @param {number} duracaoServico - service duration in minutes
 * @param {string|null} profissionalId
 * @returns {{ slots: string[], googleSync: boolean, blocked?: boolean }}
 */
async function computeSlots(db, lojaId, profile, data, duracaoServico, profissionalId) {
  // Ensure duration is always a number to prevent string concatenation bugs
  const duracao = Number(duracaoServico) || Number(profile.intervalo) || 60;

  console.log(`[slotEngine] computeSlots lojaId=${lojaId} data=${data} duracao=${duracao} profissionalId=${profissionalId}`);

  // ── Blocks ──────────────────────────────────────────────────────────────────
  const blocksSnap = await getDocs(
    collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${lojaId}`)
  );
  const relevantBlocks = blocksSnap.docs
    .map(d => d.data())
    .filter(b => b.date === data && (!b.profissionalId || b.profissionalId === profissionalId));

  if (relevantBlocks.some(b => b.type === 'day_off')) {
    console.log('[slotEngine] day_off block found → 0 slots');
    return { slots: [], googleSync: false, blocked: true };
  }

  const customHours = relevantBlocks.find(b => b.type === 'custom_hours');
  const horaInicio = customHours ? customHours.horaInicio : (profile.horaInicio || '09:00');
  const horaFim    = customHours ? customHours.horaFim    : (profile.horaFim    || '18:00');
  const busyBlocks = busyFromBlocks(relevantBlocks.filter(b => b.type === 'slot'), duracao);

  // ── Firestore appointments (always included, regardless of GCal) ────────────
  const apptSnap = await getDocs(
    collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`)
  );
  const marcacoes = apptSnap.docs
    .map(d => d.data())
    .filter(a => a.data === data && (!profissionalId || a.profissionalId === profissionalId));

  console.log(`[slotEngine] marcacoes encontradas: ${marcacoes.length}`, marcacoes.map(a => `${a.hora}(prof=${a.profissionalId})`));

  const busyMarcacoes = busyFromMarcacoes(marcacoes, duracao);

  // ── Per-professional Google Calendar ────────────────────────────────────────
  if (profissionalId) {
    try {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );
      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        const eventos = await fetchGCalEvents(profCalDoc.data().googleRefreshToken, data);
        console.log(`[slotEngine] GCal prof eventos: ${eventos.length}`, eventos.map(e => e.summary));
        const busy = [...busyFromGoogleEvents(eventos), ...busyBlocks, ...busyMarcacoes];
        console.log('[slotEngine] busy intervals:', JSON.stringify(busy));
        const slots = gerarSlots(horaInicio, horaFim, duracao, busy);
        console.log('[slotEngine] slots resultado (gcal prof):', slots);
        return { slots, googleSync: true };
      }
    } catch (err) {
      console.error('slotEngine GCal prof error:', err.message);
    }
    // Fallback: Firestore only
    const busy = [...busyBlocks, ...busyMarcacoes];
    console.log('[slotEngine] busy intervals (firestore only):', JSON.stringify(busy));
    const slots = gerarSlots(horaInicio, horaFim, duracao, busy);
    console.log('[slotEngine] slots resultado (firestore):', slots);
    return { slots, googleSync: false };
  }

  // ── Establishment-level Google Calendar ─────────────────────────────────────
  if (profile.googleRefreshToken) {
    try {
      const eventos = await fetchGCalEvents(profile.googleRefreshToken, data);
      const slots = gerarSlots(horaInicio, horaFim, duracao, [
        ...busyFromGoogleEvents(eventos),
        ...busyBlocks,
        ...busyMarcacoes,
      ]);
      return { slots, googleSync: true };
    } catch (err) {
      console.error('slotEngine GCal estab error:', err.message);
    }
  }

  // ── Firestore only fallback ──────────────────────────────────────────────────
  const slots = gerarSlots(horaInicio, horaFim, duracao, [...busyBlocks, ...busyMarcacoes]);
  return { slots, googleSync: false };
}

module.exports = { computeSlots };
