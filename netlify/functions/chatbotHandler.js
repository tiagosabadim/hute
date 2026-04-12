const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, addDoc,
} = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const APP_ID = 'hutex-saas';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Slot helpers (same logic as getSlots.js) ──────────────
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

async function fetchSlots(db, lojaId, profile, data, duracaoMin, profissionalId) {
  const intervalo = profile.intervalo || 60;
  const duracao = duracaoMin || intervalo;
  const horaInicio = profile.horaInicio || '09:00';
  const horaFim    = profile.horaFim    || '18:00';

  const blocksSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${lojaId}`));
  const relevantBlocks = blocksSnap.docs.map(d => d.data())
    .filter(b => b.date === data && (!b.profissionalId || b.profissionalId === profissionalId));

  if (relevantBlocks.some(b => b.type === 'day_off')) return [];

  const customHours = relevantBlocks.find(b => b.type === 'custom_hours');
  const hInicio = customHours ? customHours.horaInicio : horaInicio;
  const hFim    = customHours ? customHours.horaFim    : horaFim;

  const busyBlocks = relevantBlocks.filter(b => b.type === 'slot')
    .map(b => ({ start: toMin(b.hora), end: toMin(b.hora) + (b.duracao || duracao) }));

  const apptSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
  const marcacoes = apptSnap.docs.map(d => d.data())
    .filter(a => a.data === data && (!profissionalId || a.profissionalId === profissionalId))
    .map(a => ({ start: toMin(a.hora), end: toMin(a.hora) + (Number(a.duracao) || duracao) }));

  return gerarSlots(hInicio, hFim, duracao, [...busyBlocks, ...marcacoes]);
}

function toDateISO(date) {
  return date.toISOString().split('T')[0];
}

function fmtData(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

// ── Menu text ─────────────────────────────────────────────
function menuText(nomeEstabelecimento) {
  return `Olá! Bem-vindo ao *${nomeEstabelecimento}* 👋\n\nComo posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Remarcar\n3️⃣ Cancelar\n4️⃣ Falar com atendente\n\nResponda com o número da opção.`;
}

// ── Handler ───────────────────────────────────────────────
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { message = '' } = body;
  let { phone = '', lojaId = '', slug = '' } = body;

  phone = phone.replace(/\D/g, '');
  if (phone && !phone.startsWith('55')) phone = `55${phone}`;

  const msg = message.trim();

  try {
    const db = getDb();

    // Resolve slug → lojaId if needed
    if (!lojaId && slug) {
      const slugSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', slug.toLowerCase()));
      if (!slugSnap.exists()) {
        return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
      }
      lojaId = slugSnap.data().uid;
    }

    if (!phone || !lojaId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'phone e lojaId (ou slug) são obrigatórios' }) };
    }

    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }
    const profile = profileDoc.data();
    const slugFinal = profile.slug || lojaId;
    const nomeEstab = profile.nome || 'Estabelecimento';

    // "0" always resets
    if (msg === '0') {
      await clearSession(db, phone, lojaId);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: menuText(nomeEstab) }) };
    }

    let session = await getSession(db, phone, lojaId);

    // ── No session → show menu ────────────────────────────
    if (!session) {
      await saveSession(db, phone, lojaId, { step: 'menu' });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: menuText(nomeEstab) }) };
    }

    const { step } = session;

    // ── MENU ─────────────────────────────────────────────
    if (step === 'menu') {
      if (msg === '1' || msg === '2') {
        const servicos = (profile.servicos || []).filter(s => s.nome);
        if (!servicos.length) {
          await clearSession(db, phone, lojaId);
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Desculpe, ainda não há serviços cadastrados. Digite 0 para voltar.` }) };
        }
        const lista = servicos.map((s, i) => `${i + 1}. ${s.nome}${s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}`).join('\n');
        const isRemarcar = msg === '2';
        await saveSession(db, phone, lojaId, { step: 'escolher_servico', isRemarcar, servicos });
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Qual serviço você deseja?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.` }) };
      }

      if (msg === '3') {
        // Cancelar — find future appointments for this phone
        const apptSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
        const now = new Date();
        const futures = apptSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => {
            const [h, m] = (a.hora || '0:0').split(':').map(Number);
            const dt = new Date(`${a.data}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
            const phoneNorm = (a.clienteWhats || '').replace(/\D/g, '');
            return dt > now && phoneNorm === phone.replace(/\D/g, '');
          })
          .sort((a, b) => (a.data + a.hora) > (b.data + b.hora) ? 1 : -1);

        if (!futures.length) {
          await saveSession(db, phone, lojaId, { step: 'menu' });
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Não encontrei agendamentos futuros para o seu número.\n\nDigite 0 para voltar ao menu.` }) };
        }

        const lista = futures.map((a, i) => `${i + 1}. ${a.servico} — ${fmtData(a.data)} às ${a.hora}`).join('\n');
        await saveSession(db, phone, lojaId, { step: 'cancelar_escolher', agendamentos: futures });
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Qual agendamento deseja cancelar?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.` }) };
      }

      if (msg === '4') {
        await clearSession(db, phone, lojaId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Certo! Em breve um atendente entrará em contato. 😊` }) };
      }

      // Invalid option
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: menuText(nomeEstab) }) };
    }

    // ── ESCOLHER SERVIÇO ──────────────────────────────────
    if (step === 'escolher_servico') {
      const idx = parseInt(msg) - 1;
      const servicos = session.servicos || [];
      if (isNaN(idx) || idx < 0 || idx >= servicos.length) {
        const lista = servicos.map((s, i) => `${i + 1}. ${s.nome}${s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}`).join('\n');
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.` }) };
      }

      const servico = servicos[idx];
      const profissionals = (profile.profissionals || []).filter(p => {
        if (!p.servicos || !p.servicos.length) return true;
        return p.servicos.includes(servico.nome);
      });

      if (profissionals.length === 0) {
        // No professionals — go straight to horário
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const dataISO = toDateISO(tomorrow);
        const slots = await fetchSlots(db, lojaId, profile, dataISO, servico.duracao || profile.intervalo || 60, null);

        if (!slots.length) {
          await clearSession(db, phone, lojaId);
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Não há horários disponíveis para amanhã (${fmtData(dataISO)}). Entre em contato para verificar outros dias. Digite 0 para voltar.` }) };
        }

        const lista = slots.map((s, i) => `${i + 1}. ${s}`).join('\n');
        await saveSession(db, phone, lojaId, { ...session, step: 'escolher_horario', servico, profissional: null, data: dataISO, slots });
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Horários disponíveis para amanhã (${fmtData(dataISO)}):\n\n${lista}\n\nEscolha o horário. Digite 0 para voltar.` }) };
      }

      const lista = profissionals.map((p, i) => `${i + 1}. ${p.nome}`).join('\n');
      await saveSession(db, phone, lojaId, { ...session, step: 'escolher_profissional', servico, profissionals });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Com qual profissional?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.` }) };
    }

    // ── ESCOLHER PROFISSIONAL ─────────────────────────────
    if (step === 'escolher_profissional') {
      const idx = parseInt(msg) - 1;
      const profissionals = session.profissionals || [];
      if (isNaN(idx) || idx < 0 || idx >= profissionals.length) {
        const lista = profissionals.map((p, i) => `${i + 1}. ${p.nome}`).join('\n');
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.` }) };
      }

      const profissional = profissionals[idx];
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const dataISO = toDateISO(tomorrow);
      const slots = await fetchSlots(db, lojaId, profile, dataISO, session.servico?.duracao || profile.intervalo || 60, profissional.id);

      if (!slots.length) {
        await clearSession(db, phone, lojaId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `${profissional.nome} não tem horários disponíveis amanhã (${fmtData(dataISO)}). Entre em contato para verificar outros dias. Digite 0 para voltar.` }) };
      }

      const lista = slots.map((s, i) => `${i + 1}. ${s}`).join('\n');
      await saveSession(db, phone, lojaId, { ...session, step: 'escolher_horario', profissional, data: dataISO, slots });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Horários disponíveis para amanhã (${fmtData(dataISO)}) com ${profissional.nome}:\n\n${lista}\n\nEscolha o horário. Digite 0 para voltar.` }) };
    }

    // ── ESCOLHER HORÁRIO ──────────────────────────────────
    if (step === 'escolher_horario') {
      const idx = parseInt(msg) - 1;
      const slots = session.slots || [];
      if (isNaN(idx) || idx < 0 || idx >= slots.length) {
        const lista = slots.map((s, i) => `${i + 1}. ${s}`).join('\n');
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.` }) };
      }

      const hora = slots[idx];
      const { servico, profissional, data } = session;

      // Lookup client name from previous visits
      const clientSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone.replace(/\D/g, '')));
      const clienteNome = clientSnap.exists() ? clientSnap.data().nome : phone;

      const [h, m] = hora.split(':').map(Number);
      const dtInt = new Date(`${data}T00:00:00`);
      dtInt.setHours(h, m, 0, 0);

      const apptData = {
        clienteNome,
        clienteWhats: phone,
        clienteNascimento: clientSnap.exists() ? (clientSnap.data().nascimento || '') : '',
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

      // Trigger n8n webhook if configured
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
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: `✅ Agendamento confirmado!\n\n📋 *${servico.nome}*${profText}\n📅 ${fmtData(data)} às ${hora}\n\nAcesse seus detalhes:\n${linkAgendamento}\n\nAté logo! 😊`,
        }),
      };
    }

    // ── CANCELAR — ESCOLHER QUAL ──────────────────────────
    if (step === 'cancelar_escolher') {
      const idx = parseInt(msg) - 1;
      const agendamentos = session.agendamentos || [];
      if (isNaN(idx) || idx < 0 || idx >= agendamentos.length) {
        const lista = agendamentos.map((a, i) => `${i + 1}. ${a.servico} — ${fmtData(a.data)} às ${a.hora}`).join('\n');
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.` }) };
      }

      const appt = agendamentos[idx];
      await saveSession(db, phone, lojaId, { ...session, step: 'cancelar_confirmar', apptSelecionado: appt });
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: `Confirma o cancelamento?\n\n*${appt.servico}* — ${fmtData(appt.data)} às ${appt.hora}\n\n1. Sim, cancelar\n2. Não\n\nDigite 0 para voltar.` }),
      };
    }

    // ── CANCELAR — CONFIRMAR ──────────────────────────────
    if (step === 'cancelar_confirmar') {
      if (msg === '1') {
        const appt = session.apptSelecionado;
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`, appt.id));

        // Trigger n8n cancel webhook
        if (process.env.N8N_CANCEL_WEBHOOK_URL) {
          const digits = phone.replace(/\D/g, '');
          fetch(process.env.N8N_CANCEL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telefoneCliente: digits.startsWith('55') ? digits : `55${digits}`,
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
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `✅ Agendamento cancelado com sucesso.\n\n${appt.servico} — ${fmtData(appt.data)} às ${appt.hora}\n\nDigite qualquer coisa para voltar ao menu.` }) };
      }

      if (msg === '2') {
        await clearSession(db, phone, lojaId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Ok, nenhuma alteração foi feita. 😊\n\n${menuText(nomeEstab)}` }) };
      }

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: `Responda 1 para confirmar ou 2 para cancelar. Digite 0 para voltar ao menu.` }) };
    }

    // Fallback — reset
    await clearSession(db, phone, lojaId);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: menuText(nomeEstab) }) };

  } catch (error) {
    console.error('Erro chatbotHandler:', error.message);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
