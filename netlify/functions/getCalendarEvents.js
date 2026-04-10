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
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

/**
 * GET /.netlify/functions/getCalendarEvents?lojaId=X&data=YYYY-MM-DD[&profissionalId=Y]
 * Returns all Google Calendar events for the given day.
 * Response: { events: [{ id, summary, start, end, allDay }], googleSync: bool }
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const { lojaId, data, profissionalId } = event.queryStringParameters || {};

  if (!lojaId || !data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'lojaId e data são obrigatórios' }) };
  }

  try {
    const db = getDb();
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
      return { statusCode: 200, headers, body: JSON.stringify({ events: [], googleSync: false }) };
    }

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

    const events = (resposta.data.items || []).map(e => ({
      id: e.id,
      summary: e.summary || 'Evento',
      start: e.start.dateTime || e.start.date,
      end:   e.end.dateTime   || e.end.date,
      allDay: !!e.start.date && !e.start.dateTime,
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ events, googleSync: true }) };

  } catch (error) {
    console.error('Erro getCalendarEvents:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
