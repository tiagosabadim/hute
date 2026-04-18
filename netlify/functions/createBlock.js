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
    const { lojaId, profissionalId, type, date, hora, duracao, horaInicio, horaFim, motivo } = body;

    if (!lojaId || !date || !type) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'lojaId, date e type são obrigatórios' }) };
    }

    const db = getDb();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    let refreshToken = null;

    if (profissionalId) {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );
      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        refreshToken = profCalDoc.data().googleRefreshToken;
      }
    }

    if (!refreshToken) {
      const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
      if (profileDoc.exists() && profileDoc.data().googleRefreshToken) {
        refreshToken = profileDoc.data().googleRefreshToken;
      }
    }

    if (!refreshToken) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, googleSync: false }) };
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    let resource;

    if (type === 'day_off') {
      // All-day event — Google Calendar uses exclusive end date (next day)
      const nextDay = new Date(`${date}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      resource = {
        summary: motivo || 'Folga',
        start: { date },
        end: { date: nextDayStr },
      };
    } else if (type === 'slot') {
      const inicio = new Date(`${date}T${hora}:00`);
      const duracaoMin = duracao ? Number(duracao) : 60;
      const fim = new Date(inicio.getTime() + duracaoMin * 60 * 1000);
      resource = {
        summary: motivo || 'Bloqueado',
        start: { dateTime: inicio.toISOString() },
        end: { dateTime: fim.toISOString() },
      };
    } else if (type === 'custom_hours') {
      // Mark the day with the custom hours info
      const nextDay = new Date(`${date}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      resource = {
        summary: motivo || `Horário especial: ${horaInicio}–${horaFim}`,
        start: { date },
        end: { date: nextDayStr },
      };
    }

    const eventResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, googleSync: true, eventId: eventResponse.data.id }),
    };

  } catch (error) {
    console.error('Erro createBlock:', error.message);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};
