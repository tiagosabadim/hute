const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, addDoc,
} = require('firebase/firestore/lite');
const { computeSlots } = require('./utils/slotEngine');

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
const MAX_HISTORY = 20; // 10 turns × 2 roles
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

// ── Emoji numbers (fallback menu) ─────────────────────────
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

// ── Fallback menu ─────────────────────────────────────────
function menuText(nomeEstab) {
  return `Olá! Bem-vindo ao *${nomeEstab}* 👋\n\nComo posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Remarcar\n3️⃣ Cancelar\n4️⃣ Falar com atendente\n\nResponda com o número da opção.`;
}

// ─────────────────────────────────────────────────────────
// ── CLAUDE AI PATH ────────────────────────────────────────
// ─────────────────────────────────────────────────────────

const AI_TOOLS = [
  {
    name: 'buscarHorarios',
    description: 'Busca horários disponíveis para um serviço em uma data específica. Use sempre antes de sugerir horários ao cliente.',
    input_schema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        servicoNome: { type: 'string', description: 'Nome do serviço (para calcular duração correta)' },
        profissionalNome: { type: 'string', description: 'Nome do profissional preferido (opcional)' },
      },
      required: ['data'],
    },
  },
  {
    name: 'buscarAgendamentosCliente',
    description: 'Busca todos os agendamentos futuros do cliente. Use quando o cliente quiser remarcar ou cancelar.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'criarAgendamento',
    description: 'Cria o agendamento. Use SOMENTE após o cliente confirmar explicitamente todos os detalhes (serviço, data, hora e, se houver, profissional) E após oferecer os extras disponíveis (se houver). Os extras aceitos devem ser incluídos no campo extras.',
    input_schema: {
      type: 'object',
      properties: {
        clienteNome: { type: 'string', description: 'Nome completo do cliente' },
        servicoNome: { type: 'string', description: 'Nome exato do serviço' },
        profissionalNome: { type: 'string', description: 'Nome do profissional (omitir se não houver preferência)' },
        data: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        hora: { type: 'string', description: 'Horário no formato HH:MM' },
        reagendamento: { type: 'boolean', description: 'true se o cliente estiver remarcando um horário existente' },
        extras: {
          type: 'array',
          description: 'Lista de extras/complementares aceitos pelo cliente. Deixar vazio se recusou ou não havia extras.',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string' },
              tipo: { type: 'string', description: 'servico ou produto' },
              preco: { type: 'number' },
              precoDesconto: { type: 'number' },
              desconto: { type: 'number' },
            },
          },
        },
      },
      required: ['clienteNome', 'servicoNome', 'data', 'hora'],
    },
  },
  {
    name: 'cancelarAgendamento',
    description: 'Cancela um agendamento. Use somente após o cliente confirmar que quer cancelar.',
    input_schema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'ID do agendamento a cancelar' },
      },
      required: ['appointmentId'],
    },
  },
];

async function executeTool(toolName, toolInput, ctx) {
  const { db, lojaId, phone, profile, slugFinal, session } = ctx;

  // ── buscarHorarios ──────────────────────────────────────
  if (toolName === 'buscarHorarios') {
    const { data, servicoNome, profissionalNome } = toolInput;

    const servico = servicoNome
      ? (profile.servicos || []).find(s => s.nome.toLowerCase().includes(servicoNome.toLowerCase()))
      : null;
    const duracao = servico?.duracao || profile.intervalo || 60;

    const prof = profissionalNome
      ? (profile.profissionals || []).find(p => p.nome.toLowerCase().includes(profissionalNome.toLowerCase()))
      : null;

    const { slots, blocked } = await computeSlots(db, lojaId, profile, data, duracao, prof?.id || null);

    // Build cross-sell / upsell offers for this service
    const ofertas = [];
    if (servico) {
      for (const cs of (servico.crossSell || [])) {
        const svc = (profile.servicos || []).find(s => s.nome === cs.servicoNome);
        if (!svc) continue;
        const precoDesconto = svc.preco ? Math.round(svc.preco * (1 - cs.desconto / 100) * 100) / 100 : null;
        ofertas.push({ tipo: 'servico', nome: svc.nome, precoOriginal: svc.preco || null, precoDesconto, desconto: cs.desconto, duracao: svc.duracao || 0 });
      }
      for (const u of (servico.upsell || [])) {
        ofertas.push({ tipo: 'produto', nome: u.nome, preco: u.preco || null, precoDesconto: null, desconto: 0, duracao: 0 });
      }
    }

    return { data, servico: servico?.nome || null, profissional: prof?.nome || null, horarios: slots, fechado: blocked || slots.length === 0, ofertas };
  }

  // ── buscarAgendamentosCliente ───────────────────────────
  if (toolName === 'buscarAgendamentosCliente') {
    const apptSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
    const now = new Date();
    const futures = apptSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => {
        const [h, m] = (a.hora || '0:0').split(':').map(Number);
        const dt = new Date(`${a.data}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
        return dt > now && (a.clienteWhats || '').replace(/\D/g, '') === phone.replace(/\D/g, '');
      })
      .sort((a, b) => (a.data + a.hora) > (b.data + b.hora) ? 1 : -1)
      .map(a => ({ id: a.id, servico: a.servico, data: a.data, hora: a.hora, profissionalNome: a.profissionalNome || null }));

    return { agendamentos: futures };
  }

  // ── criarAgendamento ────────────────────────────────────
  if (toolName === 'criarAgendamento') {
    const { clienteNome, servicoNome, profissionalNome, data, hora, reagendamento, extras = [] } = toolInput;

    const servico = (profile.servicos || []).find(s => s.nome.toLowerCase().includes(servicoNome.toLowerCase())) || { nome: servicoNome };
    const prof = profissionalNome
      ? (profile.profissionals || []).find(p => p.nome.toLowerCase().includes(profissionalNome.toLowerCase()))
      : null;

    // Save/update client profile
    const clientRef = doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone);
    const clientSnap = await getDoc(clientRef);
    const existingVisitas = clientSnap.exists() ? (clientSnap.data().totalVisitas || 0) : 0;
    await setDoc(clientRef, {
      nome: clienteNome,
      whats: phone,
      ultimaVisita: data,
      ultimoServico: servico.nome,
      ultimoProfissional: prof?.nome || null,
      totalVisitas: existingVisitas + 1,
    }, { merge: true });

    const [h, m] = hora.split(':').map(Number);
    const dtInt = new Date(`${data}T00:00:00`);
    dtInt.setHours(h, m, 0, 0);

    // Calculate total duration including extra services
    const duracaoBase = servico.duracao || profile.intervalo || 60;
    const duracaoExtras = extras.reduce((sum, e) => {
      if (e.tipo === 'servico') {
        const svc = (profile.servicos || []).find(s => s.nome === e.nome);
        return sum + (svc?.duracao || 0);
      }
      return sum;
    }, 0);
    const duracaoTotal = duracaoBase + duracaoExtras;

    const apptData = {
      clienteNome,
      clienteWhats: phone,
      clienteNascimento: '',
      servico: servico.nome,
      valor: servico.preco || null,
      duracao: duracaoTotal,
      profissionalId: prof?.id || null,
      profissionalNome: prof?.nome || null,
      data,
      hora,
      dataHoraInternacional: dtInt.toISOString(),
      createdAt: new Date().toISOString(),
      criadoPorChatbot: true,
      ...(extras.length > 0 ? { extras } : {}),
      ...(reagendamento ? { reagendamento: true } : {}),
      ...(session.origemAviso ? { origemAviso: session.origemAviso } : {}),
    };

    const accessToken = crypto.randomUUID();
    const apptRef = await addDoc(
      collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`),
      { ...apptData, accessToken }
    );

    const linkAgendamento = `https://hute.netlify.app/#${slugFinal}/agendamento/${apptRef.id}?token=${accessToken}`;

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
          profissionalNome: prof?.nome || '',
          slug: slugFinal,
          lojaId,
          connectedPhone: profile.whatsappNumber || '',
          linkAgendamento,
        }),
      }).catch(() => {});
    }

    if (profile.fcmToken) {
      const { sendFCMPush } = require('./fcmHelper');
      sendFCMPush(profile.fcmToken, 'Novo agendamento! 🗓️', `${clienteNome} — ${servico.nome} às ${hora}`, { type: 'new', lojaId }).catch(() => {});
    }

    return { success: true, appointmentId: apptRef.id, linkAgendamento, servico: servico.nome, profissional: prof?.nome || null, data, hora, valor: servico.preco || null, extras };
  }

  // ── cancelarAgendamento ─────────────────────────────────
  if (toolName === 'cancelarAgendamento') {
    const { appointmentId } = toolInput;

    const apptDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`, appointmentId));
    if (!apptDoc.exists()) return { success: false, error: 'Agendamento não encontrado' };
    const appt = apptDoc.data();

    // Record cancellation
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', `cancellations_${lojaId}`), {
      appointmentId,
      nomeCliente: appt.clienteNome || '',
      clienteWhats: appt.clienteWhats || '',
      servico: appt.servico || '',
      data: appt.data || '',
      hora: appt.hora || '',
      profissionalNome: appt.profissionalNome || '',
      cancelledAt: new Date().toISOString(),
    });

    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`, appointmentId));

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
          connectedPhone: profile.whatsappNumber || '',
        }),
      }).catch(() => {});
    }

    if (profile.fcmToken) {
      const { sendFCMPush } = require('./fcmHelper');
      sendFCMPush(profile.fcmToken, 'Agendamento cancelado', `${appt.clienteNome || 'Cliente'} cancelou ${appt.servico || ''} em ${appt.data || ''}`, { type: 'cancel', lojaId }).catch(() => {});
    }

    return { success: true, servico: appt.servico, data: appt.data, hora: appt.hora };
  }

  return { error: 'Ferramenta desconhecida' };
}

async function callClaude(messages, systemPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s hard limit
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${errText}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function handleAI(msg, phone, session, profile, db, lojaId, slugFinal, origemAviso) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const weekdays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

  const servicos = (profile.servicos || []).filter(s => s.nome);
  const servicosText = servicos.length
    ? servicos.map(s => `- ${s.nome}${s.preco ? ` (R$ ${Number(s.preco).toFixed(2)})` : ''}${s.duracao ? ` — ${s.duracao}min` : ''}`).join('\n')
    : 'Nenhum serviço cadastrado';

  const profissionals = profile.profissionals || [];
  const profText = profissionals.length
    ? profissionals.map(p => `- ${p.nome}${p.servicos?.length ? ` (serviços: ${p.servicos.join(', ')})` : ''}`).join('\n')
    : 'Nenhum profissional específico';

  // ── Fetch client name only (single doc read) ──────────────
  const clientDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone));
  const clientData = clientDoc.exists() ? clientDoc.data() : {};
  const savedClientName = (clientData.nome && clientData.nome !== phone) ? clientData.nome : null;
  const isReturning = !!savedClientName;

  const clienteContext = savedClientName
    ? `Nome: ${savedClientName} (cliente conhecido — chame pelo nome)`
    : `Nome: desconhecido (pergunte o nome ao criar agendamento)`;

  // ── Working hours ─────────────────────────────────────────
  const diasSemana = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const diasFunc = profile.diasFuncionamento || [];
  let horarioText = '';
  if (diasFunc.length > 0) {
    const abertos = diasFunc.map(d => `${diasSemana[d.dia]}: ${d.abertura}–${d.fechamento}`).join(', ');
    const fechados = [0,1,2,3,4,5,6].filter(d => !diasFunc.find(df => df.dia === d)).map(d => diasSemana[d]);
    horarioText = `Aberto: ${abertos}.\nFechado: ${fechados.length > 0 ? fechados.join(', ') : 'nenhum'}.`;
  } else if (profile.horaInicio && profile.horaFim) {
    horarioText = `Horário: ${profile.horaInicio}–${profile.horaFim}.`;
  }

  // ── Build returning-client opening instructions ───────────
  // Detect greeting in current message
  const isGreeting = /^\s*(oi|olá|ola|bom\s*dia|boa\s*tarde|boa\s*noite|hey|hello|e\s*ai|eai|tudo\s*bem|tudo\s*bom)\W*\s*$/i.test(msg.trim());

  // Build professional list with their services for context
  const profListText = profissionals.length
    ? profissionals.map(p => `- ${p.nome}${p.servicos?.length ? ` → serviços: ${p.servicos.join(', ')}` : ' → todos os serviços'}`).join('\n')
    : 'Atendimento sem profissional fixo.';

  const saudacao = /boa\s*tarde/i.test(msg) ? 'Boa tarde' : /boa\s*noite/i.test(msg) ? 'Boa noite' : 'Bom dia';

  const systemPrompt = `Você é a Hute, secretária virtual do *${profile.nome || 'Estabelecimento'}*. Sempre se apresente como "Hute" — nunca como o nome do estabelecimento. Responda em português brasileiro de forma calorosa e objetiva. Emojis com moderação. Mensagens curtas.

DATA ATUAL: ${today} (${weekdays[now.getDay()]})
AMANHÃ: ${tomorrow}

HORÁRIO DE FUNCIONAMENTO:
${horarioText || 'Não configurado.'}

SERVIÇOS DISPONÍVEIS:
${servicosText}

PROFISSIONAIS (com seus serviços):
${profListText}

CLIENTE: ${savedClientName ? `${savedClientName} (cliente conhecido — chame pelo nome desde a primeira mensagem)` : 'desconhecido (pergunte o nome ao agendar)'}

${isGreeting ? `ESTA MENSAGEM É UMA SAUDAÇÃO. Responda apresentando-se como Hute, secretária do ${profile.nome || 'estabelecimento'}, usando "${saudacao}" e perguntando como pode ajudar. ${savedClientName ? `Inclua o nome: ${savedClientName}.` : ''}` : ''}

═══ REGRAS ABSOLUTAS (nunca quebre estas regras) ═══
• Faça UMA pergunta por mensagem. Espere a resposta antes de continuar.
• NUNCA invente horários. Sempre chame buscarHorarios.
• NUNCA mostre menus numéricos.
• NUNCA chame criarAgendamento sem o cliente ter confirmado explicitamente.
• NUNCA repita a pergunta "Confirma?" se já fez uma vez — se o cliente disse qualquer variante de "sim" (isso, ok, pode, perfeito, confirmo, fechou, tá bom, 👍, ✅, claro, com certeza), CHAME criarAgendamento IMEDIATAMENTE.

═══ FLUXO DE AGENDAMENTO (siga em ordem) ═══

PASSO 1 — SERVIÇO: Identifique o serviço. "Cabelo", "corte", "escova" → mapeie para o serviço mais próximo da lista.

PASSO 2 — PROFISSIONAL: Filtre os profissionais que atendem o serviço.
  • Se houver 2 ou mais: liste-os pelo nome e pergunte qual prefere. Exemplo: "Temos o João e a Maria especializados em corte — qual você prefere? 😊" → PARE e aguarde resposta.
  • Se houver apenas 1: use-o sem perguntar.
  • Se nenhum tiver serviços definidos: liste todos e pergunte.

PASSO 3 — DIA: Pergunte o dia preferido. Se o cliente já mencionou ("amanhã", "hoje", "sexta", uma data) — use esse dia diretamente, não pergunte de novo.

PASSO 4 — HORÁRIOS: Chame buscarHorarios com o dia e profissional. Se fechado/sem horários, informe e peça outro dia. Apresente os horários disponíveis e pergunte qual prefere → PARE e aguarde.

PASSO 5 — UPSELL (OBRIGATÓRIO se houver ofertas): Se buscarHorarios retornou "ofertas" com itens, apresente-as ANTES de mostrar o resumo. Exemplo: "Aproveitando a visita, temos também [nome do extra] por R$ [valor] — quer incluir? 😊" → PARE e aguarde resposta do cliente (aceitar ou recusar).

PASSO 6 — RESUMO: Mostre um resumo em uma única mensagem:
  ✅ *[Serviço]* com [Profissional]
  📅 [Data por extenso] às [Hora]
  💰 R$ [Valor total]
  Confirma?
  → PARE. Aguarde resposta. NÃO repita o resumo.

PASSO 7 — CONFIRMAR: Quando o cliente confirmar → chame criarAgendamento → responda com sucesso e o link.

═══ OUTROS FLUXOS ═══
REMARCAR: buscarAgendamentosCliente → mostra o que tem → coleta nova data/hora → resumo → confirma → criarAgendamento (reagendamento: true).
CANCELAR: buscarAgendamentosCliente → mostra opções → confirma → cancelarAgendamento.
ATENDENTE: "Vou transferir você para um atendente agora! 😊"`;

  const history = session.history || [];
  let currentMessages = [
    ...history,
    { role: 'user', content: msg },
  ];

  let finalText = null;

  // Agentic loop — up to 4 tool call rounds
  for (let turn = 0; turn < 4; turn++) {
    const response = await callClaude(currentMessages, systemPrompt);

    if (response.stop_reason === 'end_turn') {
      finalText = response.content.find(b => b.type === 'text')?.text || '';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolBlocks = response.content.filter(b => b.type === 'tool_use');

      // Add assistant's tool_use message
      currentMessages.push({ role: 'assistant', content: response.content });

      // Execute tools and collect results
      const toolResults = [];
      for (const tb of toolBlocks) {
        console.log(`[AI tool] ${tb.name}`, JSON.stringify(tb.input));
        const result = await executeTool(tb.name, tb.input, { db, lojaId, phone, profile, slugFinal, session });
        console.log(`[AI tool result] ${tb.name}`, JSON.stringify(result));
        toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) });
      }

      currentMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop
    finalText = response.content.find(b => b.type === 'text')?.text || 'Desculpe, ocorreu um erro interno.';
    break;
  }

  if (!finalText) finalText = 'Desculpe, não consegui processar sua mensagem. Tente novamente.';

  // Persist history — only text turns (user + assistant final text), max MAX_HISTORY messages
  const newHistory = [
    ...history,
    { role: 'user', content: msg },
    { role: 'assistant', content: finalText },
  ].slice(-MAX_HISTORY);

  await saveSession(db, phone, lojaId, {
    mode: 'ai',
    history: newHistory,
    ...(origemAviso ? { origemAviso } : session.origemAviso ? { origemAviso: session.origemAviso } : {}),
  });

  return finalText;
}

// ─────────────────────────────────────────────────────────
// ── FALLBACK MENU PATH (sem API key ou em caso de erro) ──
// ─────────────────────────────────────────────────────────
async function handleMenu(msg, phone, session, profile, db, lojaId, slugFinal, origemAviso) {
  const reply = (text) => text;

  const nomeEstab = profile.nome || 'Estabelecimento';
  const step = session?.step || 'menu';

  if (step === 'menu') {
    if (msg === '1' || msg === '2') {
      const servicos = (profile.servicos || []).filter(s => s.nome);
      if (!servicos.length) {
        await clearSession(db, phone, lojaId);
        return reply(`Desculpe, ainda não há serviços cadastrados.\n\nDigite 0 para voltar.`);
      }
      const clientSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone));
      const savedName = clientSnap.exists() ? clientSnap.data().nome : null;
      const hasName = savedName && savedName !== phone;
      const isRemarcar = msg === '2';
      if (!hasName) {
        await saveSession(db, phone, lojaId, { step: 'pedir_nome', isRemarcar, servicos, ...(origemAviso ? { origemAviso } : {}) });
        return reply(`Qual o seu nome? 😊`);
      }
      const lista = servicos.map((s, i) => `${numEmoji(i)} ${s.nome}${s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}`).join('\n');
      await saveSession(db, phone, lojaId, { step: 'escolher_servico', isRemarcar, servicos, clienteNome: savedName, ...(origemAviso ? { origemAviso } : {}) });
      return reply(`Qual serviço você deseja?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
    }
    if (msg === '3') {
      const apptSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
      const now = new Date();
      const futures = apptSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(a => { const [h,m] = (a.hora||'0:0').split(':').map(Number); const dt=new Date(`${a.data}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`); return dt>now&&(a.clienteWhats||'').replace(/\D/g,'')===phone; })
        .sort((a,b)=>(a.data+a.hora)>(b.data+b.hora)?1:-1);
      if (!futures.length) { await saveSession(db,phone,lojaId,{step:'menu'}); return reply(`Não encontrei agendamentos futuros.\n\nDigite 0 para voltar ao menu.`); }
      const lista = futures.map((a,i)=>`${numEmoji(i)} ${a.servico} — ${fmtData(a.data)} às ${a.hora}`).join('\n');
      await saveSession(db,phone,lojaId,{step:'cancelar_escolher',agendamentos:futures});
      return reply(`Qual agendamento deseja cancelar?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
    }
    if (msg === '4') { await clearSession(db,phone,lojaId); return reply(`Certo! Em breve um atendente entrará em contato. 😊`); }
    return reply(menuText(nomeEstab));
  }

  if (step === 'pedir_nome') {
    const clienteNome = msg.trim();
    if (!clienteNome || clienteNome.length < 2) return reply(`Por favor, digite seu nome completo.`);
    await setDoc(doc(db,'artifacts',APP_ID,'public','data',`clients_${lojaId}`,phone),{ nome:clienteNome,whats:phone,totalVisitas:0,ultimaVisita:'',primeiraVisita:'' },{merge:true});
    const servicos = session.servicos || [];
    const lista = servicos.map((s,i)=>`${numEmoji(i)} ${s.nome}${s.preco?` — R$ ${Number(s.preco).toFixed(2)}`:''}`).join('\n');
    await saveSession(db,phone,lojaId,{...session,step:'escolher_servico',clienteNome});
    return reply(`Olá, *${clienteNome}*! 😊\n\nQual serviço você deseja?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
  }

  if (step === 'escolher_servico') {
    const idx = parseInt(msg) - 1;
    const servicos = session.servicos || [];
    if (isNaN(idx)||idx<0||idx>=servicos.length) { const lista=servicos.map((s,i)=>`${numEmoji(i)} ${s.nome}${s.preco?` — R$ ${Number(s.preco).toFixed(2)}`:''}`).join('\n'); return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`); }
    const servico = servicos[idx];
    const profissionals = (profile.profissionals||[]).filter(p=>!p.servicos||!p.servicos.length||p.servicos.includes(servico.nome));
    if (!profissionals.length) { await saveSession(db,phone,lojaId,{...session,step:'escolher_data',servico,profissional:null}); return reply(`Ótimo! Agora digite a data desejada:\n\n📅 *dd/mm/aaaa*\n\nDigite 0 para voltar.`); }
    const lista = profissionals.map((p,i)=>`${numEmoji(i)} ${p.nome}`).join('\n');
    await saveSession(db,phone,lojaId,{...session,step:'escolher_profissional',servico,profissionals});
    return reply(`Com qual profissional?\n\n${lista}\n\nResponda com o número. Digite 0 para voltar.`);
  }

  if (step === 'escolher_profissional') {
    const idx = parseInt(msg) - 1;
    const profissionals = session.profissionals || [];
    if (isNaN(idx)||idx<0||idx>=profissionals.length) { const lista=profissionals.map((p,i)=>`${numEmoji(i)} ${p.nome}`).join('\n'); return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`); }
    const profissional = profissionals[idx];
    await saveSession(db,phone,lojaId,{...session,step:'escolher_data',profissional});
    return reply(`Ótimo! Agora digite a data desejada:\n\n📅 *dd/mm/aaaa*\n\nDigite 0 para voltar.`);
  }

  if (step === 'escolher_data') {
    const dataISO = parseDateBR(msg);
    if (!dataISO) return reply(`Data inválida. Por favor, use o formato *dd/mm/aaaa*.\n\nExemplo: 25/04/2026`);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dataDt = new Date(dataISO+'T00:00:00');
    if (dataDt<hoje) return reply(`😕 Essa data já passou. Digite uma data futura (dd/mm/aaaa):`);
    const { slots } = await computeSlots(db,lojaId,profile,dataISO,profile.intervalo||60,session.profissional?.id||null);
    if (!slots.length) { const profText=session.profissional?` para ${session.profissional.nome}`:''; return reply(`😕 Não há horários disponíveis${profText} em ${fmtData(dataISO)}.\n\nDigite outra data (dd/mm/aaaa):`); }
    const lista = slots.map((s,i)=>`${numEmoji(i)} ${s}`).join('\n');
    await saveSession(db,phone,lojaId,{...session,step:'escolher_horario',data:dataISO,slots});
    return reply(`Horários disponíveis em ${fmtData(dataISO)}:\n\n${lista}\n\nEscolha o horário. Digite 0 para voltar.`);
  }

  if (step === 'escolher_horario') {
    const idx = parseInt(msg) - 1;
    const slots = session.slots || [];
    if (isNaN(idx)||idx<0||idx>=slots.length) { const lista=slots.map((s,i)=>`${numEmoji(i)} ${s}`).join('\n'); return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`); }
    const hora = slots[idx];
    const { servico, profissional, data, clienteNome } = session;
    const [h, m] = hora.split(':').map(Number);
    const dtInt = new Date(`${data}T00:00:00`); dtInt.setHours(h,m,0,0);
    const pendingAppt = { clienteNome, clienteWhats:phone, clienteNascimento:'', servico:servico.nome, valor:servico.preco||null, duracao:servico.duracao||profile.intervalo||60, profissionalId:profissional?.id||null, profissionalNome:profissional?.nome||null, data, hora, dataHoraInternacional:dtInt.toISOString(), createdAt:new Date().toISOString(), criadoPorChatbot:true, ...(session.isRemarcar?{reagendamento:true}:{}), ...(session.origemAviso?{origemAviso:session.origemAviso}:{}) };
    const allOffers = [];
    for (const cs of (servico.crossSell||[])) { const svc=(profile.servicos||[]).find(s=>s.nome===cs.servicoNome); if(!svc) continue; const precoDesconto=svc.preco?Math.round(svc.preco*(1-cs.desconto/100)*100)/100:null; allOffers.push({tipo:'servico',nome:svc.nome,precoOriginal:svc.preco||null,precoDesconto,desconto:cs.desconto}); }
    for (const u of (servico.upsell||[])) { allOffers.push({tipo:'produto',nome:u.nome,preco:u.preco||null}); }
    if (allOffers.length > 0) {
      const offerLines = allOffers.map((o,i)=>{ if(o.tipo==='servico'){const pt=o.precoDesconto?`R$ ${o.precoDesconto.toFixed(2)} (${o.desconto}% off)`:''; return `${numEmoji(i)} ${o.nome}${pt?` — ${pt}`:''}`; } return `${numEmoji(i)} ${o.nome}${o.preco?` — R$ ${Number(o.preco).toFixed(2)}`:''}`;});
      offerLines.push(`${numEmoji(allOffers.length)} Não, obrigado`);
      await saveSession(db,phone,lojaId,{...session,step:'oferta_upsell',pendingAppt,allOffers});
      return reply(`✨ *Aproveite antes de confirmar!*\n\n${offerLines.join('\n')}\n\nEscolha uma opção:`);
    }
    const accessToken = crypto.randomUUID();
    const apptRef = await addDoc(collection(db,'artifacts',APP_ID,'public','data',`appointments_${lojaId}`),{...pendingAppt,accessToken});
    const linkAgendamento = `https://hute.netlify.app/#${slugFinal}/agendamento/${apptRef.id}?token=${accessToken}`;
    if (process.env.N8N_WEBHOOK_URL) { fetch(process.env.N8N_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefoneCliente:phone,nomeCliente:clienteNome,servico:servico.nome,data,hora,profissionalNome:profissional?.nome||'',slug:slugFinal,lojaId,connectedPhone:profile.whatsappNumber||'',linkAgendamento})}).catch(()=>{}); }
    if (profile.fcmToken) { const {sendFCMPush}=require('./fcmHelper'); sendFCMPush(profile.fcmToken,'Novo agendamento! 🗓️',`${clienteNome} — ${servico.nome} às ${hora}`,{type:'new',lojaId}).catch(()=>{}); }
    await clearSession(db,phone,lojaId);
    const profText = profissional?` com ${profissional.nome}`:'';
    return reply(`✅ Agendamento confirmado!\n\n📋 *${servico.nome}*${profText}\n📅 ${fmtData(data)} às ${hora}\n\nAcesse seus detalhes:\n${linkAgendamento}\n\nAté logo! 😊`);
  }

  if (step === 'oferta_upsell') {
    const { allOffers, pendingAppt } = session;
    const idx = parseInt(msg) - 1;
    if (isNaN(idx)||idx<0||idx>allOffers.length) { const offerLines=allOffers.map((o,i)=>{if(o.tipo==='servico'){const pt=o.precoDesconto?`R$ ${o.precoDesconto.toFixed(2)} (${o.desconto}% off)`:'';return `${numEmoji(i)} ${o.nome}${pt?` — ${pt}`:''}`;}return `${numEmoji(i)} ${o.nome}${o.preco?` — R$ ${Number(o.preco).toFixed(2)}`:''}`;}); offerLines.push(`${numEmoji(allOffers.length)} Não, obrigado`); return reply(`Opção inválida. Escolha:\n\n${offerLines.join('\n')}`); }
    const extras = idx < allOffers.length ? [allOffers[idx]] : [];
    const accessToken = crypto.randomUUID();
    const apptData = { ...pendingAppt, ...(extras.length>0?{extras}:{}), accessToken };
    const apptRef = await addDoc(collection(db,'artifacts',APP_ID,'public','data',`appointments_${lojaId}`),apptData);
    const linkAgendamento = `https://hute.netlify.app/#${slugFinal}/agendamento/${apptRef.id}?token=${accessToken}`;
    if (process.env.N8N_WEBHOOK_URL) { fetch(process.env.N8N_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefoneCliente:phone,nomeCliente:pendingAppt.clienteNome,servico:pendingAppt.servico,data:pendingAppt.data,hora:pendingAppt.hora,profissionalNome:pendingAppt.profissionalNome||'',slug:slugFinal,lojaId,connectedPhone:profile.whatsappNumber||'',linkAgendamento})}).catch(()=>{}); }
    if (profile.fcmToken) { const {sendFCMPush}=require('./fcmHelper'); sendFCMPush(profile.fcmToken,'Novo agendamento! 🗓️',`${pendingAppt.clienteNome} — ${pendingAppt.servico} às ${pendingAppt.hora}`,{type:'new',lojaId}).catch(()=>{}); }
    await clearSession(db,phone,lojaId);
    const profText = pendingAppt.profissionalNome?` com ${pendingAppt.profissionalNome}`:'';
    const extrasText = extras.length>0?`\n➕ *${extras[0].nome}* adicionado!`:'';
    return reply(`✅ Agendamento confirmado!${extrasText}\n\n📋 *${pendingAppt.servico}*${profText}\n📅 ${fmtData(pendingAppt.data)} às ${pendingAppt.hora}\n\nAcesse seus detalhes:\n${linkAgendamento}\n\nAté logo! 😊`);
  }

  if (step === 'cancelar_escolher') {
    const idx = parseInt(msg) - 1;
    const agendamentos = session.agendamentos || [];
    if (isNaN(idx)||idx<0||idx>=agendamentos.length) { const lista=agendamentos.map((a,i)=>`${numEmoji(i)} ${a.servico} — ${fmtData(a.data)} às ${a.hora}`).join('\n'); return reply(`Opção inválida. Escolha:\n\n${lista}\n\nDigite 0 para voltar.`); }
    const appt = agendamentos[idx];
    await saveSession(db,phone,lojaId,{...session,step:'cancelar_confirmar',apptSelecionado:appt});
    return reply(`Confirma o cancelamento?\n\n*${appt.servico}* — ${fmtData(appt.data)} às ${appt.hora}\n\n1️⃣ Sim, cancelar\n2️⃣ Não\n\nDigite 0 para voltar.`);
  }

  if (step === 'cancelar_confirmar') {
    if (msg === '1') {
      const appt = session.apptSelecionado;
      await addDoc(collection(db,'artifacts',APP_ID,'public','data',`cancellations_${lojaId}`),{ appointmentId:appt.id, nomeCliente:appt.clienteNome||'', clienteWhats:appt.clienteWhats||'', servico:appt.servico||'', data:appt.data||'', hora:appt.hora||'', profissionalNome:appt.profissionalNome||'', cancelledAt:new Date().toISOString() });
      await deleteDoc(doc(db,'artifacts',APP_ID,'public','data',`appointments_${lojaId}`,appt.id));
      if (process.env.N8N_CANCEL_WEBHOOK_URL) { fetch(process.env.N8N_CANCEL_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefoneCliente:phone,nomeCliente:appt.clienteNome||'',servico:appt.servico||'',data:appt.data||'',hora:appt.hora||'',profissionalNome:appt.profissionalNome||'',slug:slugFinal,lojaId})}).catch(()=>{}); }
      if (profile.fcmToken) { const {sendFCMPush}=require('./fcmHelper'); sendFCMPush(profile.fcmToken,'Agendamento cancelado',`${appt.clienteNome||'Cliente'} cancelou ${appt.servico||''} em ${appt.data||''}`,{type:'cancel',lojaId}).catch(()=>{}); }
      await clearSession(db,phone,lojaId);
      return reply(`✅ Agendamento cancelado com sucesso.\n\n*${appt.servico}* — ${fmtData(appt.data)} às ${appt.hora}\n\nDigite qualquer coisa para voltar ao menu.`);
    }
    if (msg === '2') { await clearSession(db,phone,lojaId); return reply(`Ok, nenhuma alteração foi feita. 😊\n\n${menuText(nomeEstab)}`); }
    return reply(`Responda 1️⃣ para confirmar ou 2️⃣ para cancelar. Digite 0 para voltar ao menu.`);
  }

  await clearSession(db, phone, lojaId);
  return reply(menuText(nomeEstab));
}

// ─────────────────────────────────────────────────────────
// ── MAIN HANDLER ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const { message = '', origemAviso = null } = body;
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

    const whatsSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'whatsappNumbers', connectedNormalized));
    if (!whatsSnap.exists()) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado para este número' }) };
    const lojaId = whatsSnap.data().lojaId;

    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    const profile = profileDoc.data();
    const slugFinal = profile.slug || lojaId;

    const reply = (text) => ({ statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: text }) });

    // "0" always resets to fresh session
    if (msg === '0') {
      await clearSession(db, phone, lojaId);
      const session = { ...(origemAviso ? { origemAviso } : {}) };
      await saveSession(db, phone, lojaId, { step: 'menu', ...session });
      if (!process.env.ANTHROPIC_API_KEY) return reply(menuText(profile.nome || 'Estabelecimento'));
      // AI path: treat "0" as greeting
      const text = await handleAI('Olá', phone, session, profile, db, lojaId, slugFinal, origemAviso);
      return reply(text);
    }

    let session = await getSession(db, phone, lojaId);

    // No session → init
    if (!session) {
      session = { ...(origemAviso ? { origemAviso } : {}) };
    }

    // ── AI PATH ─────────────────────────────────────────────
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const text = await handleAI(msg, phone, session, profile, db, lojaId, slugFinal, origemAviso);
        return reply(text);
      } catch (aiErr) {
        console.error('AI path failed, falling back to menu:', aiErr.message);
        // Fall through to menu path
        if (!session.step) {
          await saveSession(db, phone, lojaId, { step: 'menu', ...(origemAviso ? { origemAviso } : {}) });
          session = { step: 'menu', ...(origemAviso ? { origemAviso } : {}) };
        }
      }
    }

    // ── FALLBACK MENU PATH ───────────────────────────────────
    if (!session.step) {
      await saveSession(db, phone, lojaId, { step: 'menu', ...(origemAviso ? { origemAviso } : {}) });
      session = { step: 'menu' };
      return reply(menuText(profile.nome || 'Estabelecimento'));
    }

    const text = await handleMenu(msg, phone, session, profile, db, lojaId, slugFinal, origemAviso);
    return reply(text);

  } catch (error) {
    console.error('Erro chatbotHandler:', error.message);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
