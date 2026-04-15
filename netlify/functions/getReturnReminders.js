const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
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

// Days offset from noticeDate that trigger each aviso
const AVISO_OFFSETS = { 1: 0, 2: 3, 3: 7 };

const MENSAGENS = [
  null,
  (nome) => `Está na hora da sua manutenção de ${nome}!`,
  (nome) => `Lembrete: sua manutenção de ${nome} está pendente`,
  (nome) => `Último lembrete: não esqueça da manutenção dos seus ${nome}`,
];

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function normalizeTelefone(whats) {
  const digits = (whats || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: corsHeaders, body: 'Método não permitido' };

  try {
    const db = getDb();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = toISO(today);

    // Fetch all store profiles
    const profilesSnap = await getDocs(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles')
    );

    const reminders = [];

    for (const profileDoc of profilesSnap.docs) {
      const lojaId = profileDoc.id;
      const profile = profileDoc.data();

      // Filter services that have returnReminder configured
      const servicosComRetorno = (profile.servicos || []).filter(
        (s) => s.returnReminder && Number(s.returnReminder.dias) > 0
      );
      if (servicosComRetorno.length === 0) continue;

      // Fetch all appointments for this store once
      const apptSnap = await getDocs(
        collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`)
      );
      const allAppts = apptSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const slug = profile.slug || lojaId;
      const connectedPhone = profile.whatsappNumber || '';
      const nomeEstabelecimento = profile.nome || '';
      const linkEstabelecimento = `https://hute.netlify.app/#${slug}`;

      for (const servico of servicosComRetorno) {
        const { returnReminder } = servico;
        const diasRetorno = Number(returnReminder.dias);
        const tipoRetorno = returnReminder.tipo || '';
        const servicoSugerido = returnReminder.servicoSugerido || servico.nome;

        // Completed appointments for this service (date already past)
        const completed = allAppts.filter(
          (a) => a.servico === servico.nome && a.data && a.data < todayISO && a.clienteWhats
        );

        // Group by clienteWhats → keep only the most recent appointment per client
        const byClient = {};
        for (const appt of completed) {
          const key = appt.clienteWhats;
          if (!byClient[key] || appt.data > byClient[key].data) {
            byClient[key] = appt;
          }
        }

        for (const [clientKey, lastAppt] of Object.entries(byClient)) {
          // Calculate notice date: lastAppointment + diasRetorno
          const lastDate = new Date(lastAppt.data + 'T00:00:00');
          const noticeDate = new Date(lastDate.getTime() + diasRetorno * 86400000);
          const diffDays = Math.round((today.getTime() - noticeDate.getTime()) / 86400000);

          // Determine which aviso applies today (if any)
          const avisoNumero = Object.entries(AVISO_OFFSETS).find(
            ([, offset]) => diffDays === offset
          )?.[0];
          if (!avisoNumero) continue;
          const avisoNum = Number(avisoNumero);

          // If client already has a future appointment of this service or the suggested service → skip
          const hasFutureAppt = allAppts.some(
            (a) =>
              (a.servico === servico.nome || a.servico === servicoSugerido) &&
              a.clienteWhats === clientKey &&
              a.data >= todayISO
          );
          if (hasFutureAppt) continue;

          // Check if this exact aviso was already sent for this appointment
          const alreadySent = (lastAppt.returnRemindersSent || []).some(
            (r) => r.numero === avisoNum
          );
          if (alreadySent) continue;

          // Mark aviso as sent in Firestore
          const apptRef = doc(
            db,
            'artifacts', APP_ID, 'public', 'data',
            `appointments_${lojaId}`,
            lastAppt.id
          );
          await updateDoc(apptRef, {
            returnRemindersSent: arrayUnion({ numero: avisoNum, data: todayISO }),
          });

          // Build reminder entry
          const nomeServico = tipoRetorno || servico.nome;
          reminders.push({
            telefoneCliente: normalizeTelefone(lastAppt.clienteWhats),
            nomeCliente: lastAppt.clienteNome || '',
            servico: servico.nome,
            tipoRetorno,
            servicoSugerido,
            nomeEstabelecimento,
            connectedPhone,
            linkEstabelecimento,
            avisoNumero: avisoNum,
            mensagem: MENSAGENS[avisoNum](nomeServico),
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ reminders }),
    };
  } catch (error) {
    console.error('Erro getReturnReminders:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
