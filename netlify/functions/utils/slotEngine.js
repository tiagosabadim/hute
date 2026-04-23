/**
 * slotEngine.js — shared slot calculation logic
 * Used by getSlots.js and chatbotHandler.js — single source of truth.
 *
 * Slot generation rules:
 *  - intervalBase: spacing between consecutive free slots
 *  - duracaoServico: the service being booked; a slot is only valid if
 *    [slot, slot+duracaoServico] fits within working hours + tolerance
 *  - After a busy interval ends, next slot starts at overlap.end (real service end),
 *    then continues with intervalBase spacing
 *  - Pause (almoço): if [slot, slot+dur] would enter pause → skip to after pause
 *  - Tolerance: extends the accept window past horaFim; slots that end after
 *    horaFim are marked "extended". Also adds one boundary slot at
 *    horaFim+tolerancia-duracaoServico if not already on the grid.
 */

const { google } = require('googleapis');
const { doc, getDoc, collection, getDocs } = require('firebase/firestore/lite');

const APP_ID = 'hutex-saas';
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// ── Time helpers ──────────────────────────────────────────────────────────────

const toMin = s => { const [h, m] = (s || '00:00').split(':').map(Number); return h * 60 + m; };
const toStr = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/**
 * Core slot generator.
 *
 * @param {number} inicioMin       - working day start in minutes from midnight
 * @param {number} fimMin          - working day end in minutes
 * @param {number} tolerancia      - extra minutes beyond fimMin where services may still end
 * @param {number} intervalBase    - spacing between consecutive free slots
 * @param {number} duracao         - duration of the service being booked
 * @param {{ start: number, end: number }[]} busy - busy intervals in minutes
 * @param {{ inicio: number, fim: number } | null} pausa - lunch/break in minutes
 * @returns {{ hora: string, extended: boolean }[]}
 */
function gerarSlots(inicioMin, fimMin, tolerancia, intervalBase, duracao, busy, pausa) {
  const sortedBusy = busy.slice().sort((a, b) => a.start - b.start);
  const limit = fimMin + tolerancia; // absolute end of accepted window
  const slots = [];
  let cur = inicioMin;

  while (cur + duracao <= limit) {
    // 1. Skip if cursor is inside the pause window
    if (pausa && cur >= pausa.inicio && cur < pausa.fim) {
      cur = pausa.fim;
      continue;
    }
    // 2. Skip if the service window [cur, cur+dur] would enter the pause
    if (pausa && cur < pausa.fim && cur + duracao > pausa.inicio) {
      cur = pausa.fim;
      continue;
    }
    // 3. Check busy overlap
    const overlap = sortedBusy.find(b => cur < b.end && cur + duracao > b.start);
    if (overlap) {
      cur = overlap.end; // jump to exact end of busy interval (real service end time)
      continue;
    }
    // 4. Valid slot
    slots.push({ hora: toStr(cur), extended: cur + duracao > fimMin });
    cur += intervalBase;
  }

  // 5. Tolerance boundary slot — the latest possible start within the tolerance window.
  //    Only relevant when tolerancia > 0 AND the boundary isn't already on the regular grid.
  if (tolerancia > 0) {
    const boundary = limit - duracao;
    if (
      boundary >= inicioMin &&
      boundary + duracao <= limit &&
      !slots.some(s => s.hora === toStr(boundary))
    ) {
      const inPause = pausa && (
        (boundary >= pausa.inicio && boundary < pausa.fim) ||
        (boundary < pausa.fim && boundary + duracao > pausa.inicio)
      );
      const blocked = sortedBusy.some(b => boundary < b.end && boundary + duracao > b.start);
      if (!inPause && !blocked) {
        slots.push({ hora: toStr(boundary), extended: true });
        slots.sort((a, b) => toMin(a.hora) - toMin(b.hora));
      }
    }
  }

  return slots;
}

// ── Busy interval builders ────────────────────────────────────────────────────

function busyFromGoogleEvents(eventos) {
  const toLocalMin = str => {
    const m = (str || '').match(/T(\d{2}):(\d{2})/);
    return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
  };
  return eventos.map(e => ({
    start: toLocalMin(e.start.dateTime || e.start.date),
    end:   toLocalMin(e.end.dateTime   || e.end.date),
  }));
}

function busyFromMarcacoes(marcacoes, fallbackDuracao) {
  return marcacoes.map(m => {
    const start = toMin(m.hora);
    // duracaoTotal includes main service + all extra services booked via upsell
    const dur = m.duracaoTotal ? Number(m.duracaoTotal) : (m.duracao ? Number(m.duracao) : fallbackDuracao);
    return { start, end: start + dur };
  });
}

function busyFromBlocks(blocks, fallbackDuracao) {
  return blocks.map(b => {
    const start = toMin(b.hora);
    return { start, end: start + (b.duracao || fallbackDuracao) };
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns day of week (0=Sun…6=Sat) from a YYYY-MM-DD string without timezone issues */
function diaDaSemana(data) {
  const [y, m, d] = data.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Returns { abertura, fechamento } for the given day from diasFuncionamento,
 * or falls back to horaInicio/horaFim. Returns null if the establishment is
 * closed that day and diasFuncionamento is explicitly configured.
 */
function getEstabHours(profile, dia) {
  if (profile.diasFuncionamento && profile.diasFuncionamento.length > 0) {
    const conf = profile.diasFuncionamento.find(d => d.dia === dia);
    if (!conf) return null; // closed this day
    return { abertura: conf.abertura, fechamento: conf.fechamento };
  }
  // Backward compat — no diasFuncionamento means always open with flat hours
  return { abertura: profile.horaInicio || '09:00', fechamento: profile.horaFim || '18:00' };
}

// ── Main exported function ────────────────────────────────────────────────────

/**
 * Computes available slots for a given date, professional, and service duration.
 *
 * @param {object} db
 * @param {string} lojaId
 * @param {object} profile
 * @param {string} data           - YYYY-MM-DD
 * @param {number} duracaoServico - service duration in minutes
 * @param {string|null} profissionalId
 * @returns {{ slots: string[], extendedSlots: string[], googleSync: boolean, blocked?: boolean }}
 */
async function computeSlots(db, lojaId, profile, data, duracaoServico, profissionalId) {
  const duracao     = Number(duracaoServico) || 60;
  const intervalBase = Number(profile.intervaloBase || profile.intervalo) || 60;
  const tolerancia  = Number(profile.toleranciaFechamento) || 0;
  const dia         = diaDaSemana(data);

  // ── Establishment hours ──────────────────────────────────────────────────────
  const estabHours = getEstabHours(profile, dia);
  if (!estabHours) {
    return { slots: [], extendedSlots: [], googleSync: false, blocked: true };
  }
  let horaInicio = estabHours.abertura;
  let horaFim    = estabHours.fechamento;

  // ── Blocks (day_off, custom_hours, slot blocks) ──────────────────────────────
  const blocksSnap = await getDocs(
    collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${lojaId}`)
  );
  const relevantBlocks = blocksSnap.docs
    .map(d => d.data())
    .filter(b => b.date === data && (!b.profissionalId || b.profissionalId === profissionalId));

  if (relevantBlocks.some(b => b.type === 'day_off')) {
    return { slots: [], extendedSlots: [], googleSync: false, blocked: true };
  }

  const customHours = relevantBlocks.find(b => b.type === 'custom_hours');
  if (customHours) {
    horaInicio = customHours.horaInicio;
    horaFim    = customHours.horaFim;
  }

  const busyBlocks = busyFromBlocks(relevantBlocks.filter(b => b.type === 'slot'), intervalBase);

  // ── Professional schedule ────────────────────────────────────────────────────
  let pausa = null;

  if (profissionalId) {
    const profData = (profile.profissionals || []).find(p => p.id === profissionalId);
    if (profData) {
      // Check if professional works this day
      if (profData.diasTrabalho && profData.diasTrabalho.length > 0) {
        if (!profData.diasTrabalho.includes(dia)) {
          return { slots: [], extendedSlots: [], googleSync: false, blocked: true };
        }
      }
      // Professional's own hours override establishment hours
      if (profData.horarioProprio && profData.horarioProprio.abertura) {
        horaInicio = profData.horarioProprio.abertura;
        horaFim    = profData.horarioProprio.fechamento;
      }
      // Lunch break / pause
      if (profData.pausa && profData.pausa.inicio && profData.pausa.fim) {
        pausa = { inicio: toMin(profData.pausa.inicio), fim: toMin(profData.pausa.fim) };
      }
    }
  }

  const inicioMin = toMin(horaInicio);
  const fimMin    = toMin(horaFim);

  // ── Firestore appointments ───────────────────────────────────────────────────
  const apptSnap = await getDocs(
    collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`)
  );
  const marcacoes = apptSnap.docs
    .map(d => d.data())
    // Include: no prof filter (view all) OR appointment has no prof (general) OR exact prof match
    .filter(a => a.data === data && (!profissionalId || !a.profissionalId || a.profissionalId === profissionalId));
  const busyMarcacoes = busyFromMarcacoes(marcacoes, intervalBase);

  const _finish = (slotsData, googleSync) => ({
    slots:         slotsData.map(s => s.hora),
    extendedSlots: slotsData.filter(s => s.extended).map(s => s.hora),
    googleSync,
  });

  // ── Per-professional Google Calendar ────────────────────────────────────────
  if (profissionalId) {
    try {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );
      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        const eventos = await fetchGCalEvents(profCalDoc.data().googleRefreshToken, data);
        const allBusy = [...busyFromGoogleEvents(eventos), ...busyBlocks, ...busyMarcacoes];
        return _finish(gerarSlots(inicioMin, fimMin, tolerancia, intervalBase, duracao, allBusy, pausa), true);
      }
    } catch (err) {
      console.error('slotEngine GCal prof error:', err.message);
    }
    return _finish(gerarSlots(inicioMin, fimMin, tolerancia, intervalBase, duracao, [...busyBlocks, ...busyMarcacoes], pausa), false);
  }

  // ── Establishment-level Google Calendar ─────────────────────────────────────
  if (profile.googleRefreshToken) {
    try {
      const eventos = await fetchGCalEvents(profile.googleRefreshToken, data);
      const allBusy = [...busyFromGoogleEvents(eventos), ...busyBlocks, ...busyMarcacoes];
      return _finish(gerarSlots(inicioMin, fimMin, tolerancia, intervalBase, duracao, allBusy, pausa), true);
    } catch (err) {
      console.error('slotEngine GCal estab error:', err.message);
    }
  }

  return _finish(gerarSlots(inicioMin, fimMin, tolerancia, intervalBase, duracao, [...busyBlocks, ...busyMarcacoes], pausa), false);
}

module.exports = { computeSlots };
