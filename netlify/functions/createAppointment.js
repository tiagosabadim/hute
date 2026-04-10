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

const APP_ID = 'hutex-saas';

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Método não permitido' };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      lojaId,
      clienteNome,
      clienteWhats,
      clienteNascimento,
      servico,
      valor,
      duracao,
      profissionalId,
      profissionalNome,
      dataHoraInternacional,
    } = body;

    if (!lojaId || !dataHoraInternacional) {
      return { statusCode: 400, body: JSON.stringify({ error: 'lojaId e dataHoraInternacional são obrigatórios' }) };
    }

    const db = getDb();

    const clientId = process.env.GOOGLE_CLIENT_ID || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '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';

    let refreshToken = null;

    // If profissionalId is provided, prefer professional's Google token
    if (profissionalId) {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );
      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        refreshToken = profCalDoc.data().googleRefreshToken;
      }
    }

    // Fallback to establishment-level token
    if (!refreshToken) {
      const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
      if (profileDoc.exists() && profileDoc.data().googleRefreshToken) {
        refreshToken = profileDoc.data().googleRefreshToken;
      }
    }

    if (!refreshToken) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, googleSync: false }),
      };
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const inicio = new Date(dataHoraInternacional);
    const duracaoMin = duracao ? Number(duracao) : 60;
    const fim = new Date(inicio.getTime() + duracaoMin * 60 * 1000);

    const descLines = [
      clienteWhats ? `WhatsApp: ${clienteWhats}` : null,
      clienteNascimento ? `Nascimento: ${clienteNascimento}` : null,
      `Serviço: ${servico || ''}`,
      valor ? `Preço: R$ ${valor}` : null,
      `Duração: ${duracaoMin} min`,
      profissionalNome ? `Profissional: ${profissionalNome}` : null,
      '\nMarcação via Hute',
    ].filter(Boolean).join('\n');

    const eventResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: `${servico || 'Marcação'} - ${clienteNome || 'Cliente'}`,
        description: descLines,
        start: { dateTime: inicio.toISOString() },
        end: { dateTime: fim.toISOString() },
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, googleSync: true, eventId: eventResponse.data.id }),
    };

  } catch (error) {
    console.error('Erro createAppointment:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
