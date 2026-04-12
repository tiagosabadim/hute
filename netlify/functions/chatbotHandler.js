const { google } = require('googleapis');
const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, addDoc,
} = require('firebase/firestore/lite');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const APP_ID = 'hutex-saas';
const SESSION_TTL_MS = 30 * 60 * 1000;

// ── Emoji numbers ─────────────────────────────────────────
const NUM_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const numEmoji = i => NUM_EMOJIS[i] || `${i + 1}.`;

// ── Date helpers ──────────────────────────────────────────
function parseDateBR(str) {
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function fmtData(iso) {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-');
  return `${d}/${mo}/${y}`;
}

// ── Slot helpers ──────────────────────────────────────────
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toStr = n => `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;

function gerarSlots(horaInicio, horaFim, duracaoMin, busyIntervals) {
  const busy = busyIntervals.slice().sort((a, b) => a.start - b.start);
  const slots = [];
  let cur = toMin(horaInicio);
  const fim = toMin(horaFim);
  while (cur + duracaoMin <= fim) {
    const overlap = busy.find(b => cur < b.end && cur + duracaoMin > b.start);
    if (overlap) { cur = overlap.end; } else { slots.push(toStr(cur)); cur += duracaoMin; }
  }
  return slots;
}

function busyFromGoogleEvents(eventos) {
  return eventos.map(e => {
    const s  = new Date(e.start.dateTime || `${e.start.date}T00:00:00`);
    const en = new Date(e.end.dateTime   || `${e.end.date}T23:59:59`);
    return { start: s.getHours() * 60 + s.getMinutes(), end: en.getHours() * 60 + en.getMinutes() };
  });
}

async function fetchGoogleEvents(refreshToken, data) {
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

async function fetchSlots(db, lojaId, profile, data, duracaoMin, profissionalId) {
  const duracao    = duracaoMin || profile.intervalo || 60;
  const horaInicio = profile.horaInicio || '09:00';
  const horaFim    = profile.horaFim    || '18:00';

  // Blocks (day_off / custom_hours / slot)
  const blocksSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${lojaId}`));
  const relevantBlocks = blocksSnap.docs.map(d => d.data())
    .filter(b => b.date === data && (!b.profissionalId || b.profissionalId === profissionalId));

  if (relevantBlocks.some(b => b.type === 'day_off')) return [];

  const customHours = relevantBlocks.find(b => b.type === 'custom_hours');
  const hInicio = customHours ? customHours.horaInicio : horaInicio;
  const hFim    = customHours ? customHours.horaFim    : horaFim;

  const busyBlocks = relevantBlocks.filter(b => b.type === 'slot')
    .map(b => ({ start: toMin(b.hora), end: toMin(b.hora) + (b.duracao || duracao) }));

  // Firestore appointments
  const apptSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
  const marcacoes = apptSnap.docs.map(d => d.data())
    .filter(a => a.data === data && (!profissionalId || a.profissionalId === profissionalId))
    .map(a => ({ start: toMin(a.hora), end: toMin(a.hora) + (Number(a.duracao) || duracao) }));

  // Google Calendar — professional level
  if (profissionalId) {
    try {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );
      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        const eventos = await fetchGoogleEvents(profCalDoc.data().googleRefreshToken, data);
        const busy = [...busyFromGoogleEvents(eventos), ...busyBlocks];
        return gerarSlots(hInicio, hFim, duracao, busy);
      }
    } catch (err) {
      console.error('Google Calendar prof error:', err.message);
    }
    // Fallback: Firestore only
    return gerarSlots(hInicio, hFim, duracao, [...busyBlocks, ...marcacoes]);
  }

  // Google Calendar — establishment level
  if (profile.googleRefreshToken) {
    try {
      const eventos = await fetchGoogleEvents(profile.googleRefreshToken, data);
      const busy = [...busyFromGoogleEvents(eventos), ...busyBlocks];
      return gerarSlots(hInicio, hFim, duracao, busy);
    } catch (err) {
      console.error('Google Calendar estab error:', err.message);
    }
  }

  // Fallback: Firestore only
  return gerarSlots(hInicio, hFim, duracao, [...busyBlocks, ...marcacoes]);
}

// ── Session helpers ───────────────────────────────────────
function sessionKey(phone, lojaId) { return `${phone}_${lojaId}`; }

async function getSession(db, phone, lojaId) {
  const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chatSessions', sessionKey(phone, lojaId)));
  if (!snap.exists()) return null;
  const s = snap.data();
  if (Date.now() - new Date(s.lastActivity).getTime() > SESSION_TTL_MS) {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chatSessions', sessionKey(phone, lojaId)));
    return null;
  }
  return s;
}

async function saveSession(db, phone, lojaId, data) {
  await setDoc(
    doc(db, 'artifacts', APP_ID, 'public', 'data', 'chatSessions', sessionKey(phone, lojaId)),
    { phone, lojaId, ...data, lastActivity: new Date().toISOString() }
  );
}

async function clearSession(db, phone, lojaId) {
  await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chatSessions', sessionKey(phone, lojaId)));
}

// ── Menu ──────────────────────────────────────────────────
function menuText(nomeEstab) {
  return `Olá! Bem-vindo ao *${nomeEstab}* 👋\n\nComo posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Remarcar\n3️⃣ Cancelar\n4️⃣ Falar com atendente\n\nResponda com o número da opção.`;
}

// ── Handler ───────────────────────────────────────────────
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const { message = '' } = body;
  let { phone = '', connectedPhone = '' } = body;

  phone = phone.replace(/\D/g, '');
  if (phone && !phone.startsWith('55')) phone = `55${phone}`;
  const connectedNormalized = connectedPhone.replace(/\D/g, '');
  const msg = message.trim();

  try {
    const db = getDb();

    if (!phone || !connectedNormalized) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'phone e connectedPhone são obrigatórios' }) };
    }

    // Resolve connectedPhone → lojaId
    const whatsSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'whatsappNumbers', connectedNormalized));
    if (!whatsSnap.exists()) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado para este número' }) };
    }
    const lojaId = whatsSnap.data().lojaId;

    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }
    const profile = profileDoc.data();
    const slugFinal = profile.slug || lojaId;
    const nomeEstab = profile.nome || 'Estabelecimento';

    const reply = (message) => ({ statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message }) });

    // "0" always resets
    if (msg === '0') {
      await clearSession(db, phone, lojaId);
      return reply(menuText(nomeEstab));
    }

    let session = await getSession(db, phone, lojaId);

    // No session → show menu
    if (!session) {
      await saveSession(db, phone, lojaId, { step: 'menu' });
      return reply(menuText(nomeEstab));
    }

    const { step } = session;

    // ── MENU ─────────────────────────────────────────────
    if (step === 'menu') {
      if (msg === '1' || msg === '2') {
        const servicos = (profile.servicos || []).filter(s => s.nome);
        if (!servicos.length) {
          await clearSession(db, phone, lojaId);
          return reply(`Desculpe, ainda não há serviços cadastrados.\n\nDigite 0 para voltar.`);
        }

        // Check if client already has a name
        const clientSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone));
        const savedName = clientSnap.exists() ? clientSnap.data().nome : null;
        const hasName = savedName && savedName !== phone;

        const isRemarcar = msg === '2';

        if (!hasName) {
          await saveSession(db, phone, lojaId, { step: 'pedir_nome', isRemarcar, servicos });
          return reply(`Qual o seu nome? 😊`);
        }

        const lista = servicos.map((s, i) => `${numEmoji(i)} ${s.nome}${s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}`).join('\n');
        await saveSession(db, phone, lojaId, { step: 'escolher_servico', isRemarcar, servicos, clienteNome: savedName });
        return reply(`Qual serviço você deseja?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
      }

      if (msg === '3') {
        const apptSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
        const now = new Date();
        const futures = apptSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => {
            const [h, m] = (a.hora || '0:0').split(':').map(Number);
            const dt = new Date(`${a.data}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
            return dt > now && (a.clienteWhats || '').replace(/\D/g, '') === phone;
          })
          .sort((a, b) => (a.data + a.hora) > (b.data + b.hora) ? 1 : -1);

        if (!futures.length) {
          await saveSession(db, phone, lojaId, { step: 'menu' });
          return reply(`Não encontrei agendamentos futuros para o seu número.\n\nDigite 0 para voltar ao menu.`);
        }

        const lista = futures.map((a, i) => `${numEmoji(i)} ${a.servico} — ${fmtData(a.data)} às ${a.hora}`).join('\n');
        await saveSession(db, phone, lojaId, { step: 'cancelar_escolher', agendamentos: futures });
        return reply(`Qual agendamento deseja cancelar?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
      }

      if (msg === '4') {
        await clearSession(db, phone, lojaId);
        return reply(`Certo! Em breve um atendente entrará em contato. 😊`);
      }

      return reply(menuText(nomeEstab));
    }

    // ── PEDIR NOME ────────────────────────────────────────
    if (step === 'pedir_nome') {
      const clienteNome = msg.trim();
      if (!clienteNome || clienteNome.length < 2) {
        return reply(`Por favor, digite seu nome completo.`);
      }

      // Save name to Firestore client record
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone),
        { nome: clienteNome, whats: phone, totalVisitas: 0, ultimaVisita: '', primeiraVisita: '' },
        { merge: true }
      );

      const servicos = session.servicos || [];
      const lista = servicos.map((s, i) => `${numEmoji(i)} ${s.nome}${s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}`).join('\n');
      await saveSession(db, phone, lojaId, { ...session, step: 'escolher_servico', clienteNome });
      return reply(`Olá, *${clienteNome}*! 😊\n\nQual serviço você deseja?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
    }

    // ── ESCOLHER SERVIÇO ──────────────────────────────────
    if (step === 'escolher_servico') {
      const idx = parseInt(msg) - 1;
      const servicos = session.servicos || [];
      if (isNaN(idx) || idx < 0 || idx >= servicos.length) {
        const lista = servicos.map((s, i) => `${numEmoji(i)} ${s.nome}${s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}`).join('\n');
        return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`);
      }

      const servico = servicos[idx];
      const profissionals = (profile.profissionals || []).filter(p =>
        !p.servicos || !p.servicos.length || p.servicos.includes(servico.nome)
      );

      if (profissionals.length === 0) {
        await saveSession(db, phone, lojaId, { ...session, step: 'escolher_data', servico, profissional: null });
        return reply(`Ótimo! Agora digite a data desejada:\n\n📅 *dd/mm/aaaa*\n\nDigite 0 para voltar.`);
      }

      const lista = profissionals.map((p, i) => `${numEmoji(i)} ${p.nome}`).join('\n');
      await saveSession(db, phone, lojaId, { ...session, step: 'escolher_profissional', servico, profissionals });
      return reply(`Com qual profissional?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
    }

    // ── ESCOLHER PROFISSIONAL ─────────────────────────────
    if (step === 'escolher_profissional') {
      const idx = parseInt(msg) - 1;
      const profissionals = session.profissionals || [];
      if (isNaN(idx) || idx < 0 || idx >= profissionals.length) {
        const lista = profissionals.map((p, i) => `${numEmoji(i)} ${p.nome}`).join('\n');
        return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`);
      }

      const profissional = profissionals[idx];
      await saveSession(db, phone, lojaId, { ...session, step: 'escolher_data', profissional });
      return reply(`Ótimo! Agora digite a data desejada:\n\n📅 *dd/mm/aaaa*\n\nDigite 0 para voltar.`);
    }

    // ── ESCOLHER DATA ─────────────────────────────────────
    if (step === 'escolher_data') {
      const dataISO = parseDateBR(msg);
      if (!dataISO) {
        return reply(`Data inválida. Por favor, use o formato *dd/mm/aaaa*.\n\nExemplo: 25/04/2026`);
      }

      // Validate date is not in the past
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const dataDt = new Date(dataISO + 'T00:00:00');
      if (dataDt < hoje) {
        return reply(`😕 Essa data já passou. Digite uma data futura (dd/mm/aaaa):`);
      }

      const slots = await fetchSlots(
        db, lojaId, profile, dataISO,
        session.servico?.duracao || profile.intervalo || 60,
        session.profissional?.id || null
      );

      if (!slots.length) {
        const profText = session.profissional ? ` para ${session.profissional.nome}` : '';
        return reply(`😕 Não há horários disponíveis${profText} em ${fmtData(dataISO)}.\n\nDigite outra data (dd/mm/aaaa):`);
      }

      const lista = slots.map((s, i) => `${numEmoji(i)} ${s}`).join('\n');
      await saveSession(db, phone, lojaId, { ...session, step: 'escolher_horario', data: dataISO, slots });
      return reply(`Horários disponíveis em ${fmtData(dataISO)}:\n\n${lista}\n\nEscolha o horário. Digite 0 para voltar.`);
    }

    // ── ESCOLHER HORÁRIO ──────────────────────────────────
    if (step === 'escolher_horario') {
      const idx = parseInt(msg) - 1;
      const slots = session.slots || [];
      if (isNaN(idx) || idx < 0 || idx >= slots.length) {
        const lista = slots.map((s, i) => `${numEmoji(i)} ${s}`).join('\n');
        return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`);
      }

      const hora = slots[idx];
      const { servico, profissional, data, clienteNome } = session;

      const [h, m] = hora.split(':').map(Number);
      const dtInt = new Date(`${data}T00:00:00`);
      dtInt.setHours(h, m, 0, 0);

      const apptData = {
        clienteNome,
        clienteWhats: phone,
        clienteNascimento: '',
        servico: servico.nome,
        valor: servico.preco || null,
        duracao: servico.duracao || profile.intervalo || 60,
        profissionalId: profissional?.id || null,
        profissionalNome: profissional?.nome || null,
        data,
        hora,
        dataHoraInternacional: dtInt.toISOString(),
        createdAt: new Date().toISOString(),
        criadoPorChatbot: true,
      };

      const apptRef = await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`),
        apptData
      );

      const linkAgendamento = `https://hute.netlify.app/#${slugFinal}/agendamento/${apptRef.id}`;

      if (process.env.N8N_WEBHOOK_URL) {
        fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefoneCliente: phone,
            nomeCliente: clienteNome,
            servico: servico.nome,
            data,
            hora,
            profissionalNome: profissional?.nome || '',
            slug: slugFinal,
            lojaId,
            linkAgendamento,
          }),
        }).catch(() => {});
      }

      await clearSession(db, phone, lojaId);

      const profText = profissional ? ` com ${profissional.nome}` : '';
      return reply(`✅ Agendamento confirmado!\n\n📋 *${servico.nome}*${profText}\n📅 ${fmtData(data)} às ${hora}\n\nAcesse seus detalhes:\n${linkAgendamento}\n\nAté logo! 😊`);
    }

    // ── CANCELAR — ESCOLHER QUAL ──────────────────────────
    if (step === 'cancelar_escolher') {
      const idx = parseInt(msg) - 1;
      const agendamentos = session.agendamentos || [];
      if (isNaN(idx) || idx < 0 || idx >= agendamentos.length) {
        const lista = agendamentos.map((a, i) => `${numEmoji(i)} ${a.servico} — ${fmtData(a.data)} às ${a.hora}`).join('\n');
        return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`);
      }

      const appt = agendamentos[idx];
      await saveSession(db, phone, lojaId, { ...session, step: 'cancelar_confirmar', apptSelecionado: appt });
      return reply(`Confirma o cancelamento?\n\n*${appt.servico}* — ${fmtData(appt.data)} às ${appt.hora}\n\n1️⃣ Sim, cancelar\n2️⃣ Não\n\nDigite 0 para voltar.`);
    }

    // ── CANCELAR — CONFIRMAR ──────────────────────────────
    if (step === 'cancelar_confirmar') {
      if (msg === '1') {
        const appt = session.apptSelecionado;
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`, appt.id));

        if (process.env.N8N_CANCEL_WEBHOOK_URL) {
          fetch(process.env.N8N_CANCEL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telefoneCliente: phone,
              nomeCliente: appt.clienteNome || '',
              servico: appt.servico || '',
              data: appt.data || '',
              hora: appt.hora || '',
              profissionalNome: appt.profissionalNome || '',
              slug: slugFinal,
              lojaId,
            }),
          }).catch(() => {});
        }

        await clearSession(db, phone, lojaId);
        return reply(`✅ Agendamento cancelado com sucesso.\n\n*${appt.servico}* — ${fmtData(appt.data)} às ${appt.hora}\n\nDigite qualquer coisa para voltar ao menu.`);
      }

      if (msg === '2') {
        await clearSession(db, phone, lojaId);
        return reply(`Ok, nenhuma alteração foi feita. 😊\n\n${menuText(nomeEstab)}`);
      }

      return reply(`Responda 1️⃣ para confirmar ou 2️⃣ para cancelar. Digite 0 para voltar ao menu.`);
    }

    // Fallback
    await clearSession(db, phone, lojaId);
    return reply(menuText(nomeEstab));

  } catch (error) {
    console.error('Erro chatbotHandler:', error.message);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
