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
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * POST /.netlify/functions/manageGCalEvent
 * Body: { lojaId, profissionalId?, eventId, action: 'delete'|'update', start?, end?, summary? }
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };

  try {
    const { lojaId, profissionalId, eventId, action, start, end, summary } = JSON.parse(event.body || '{}');

    if (!lojaId || !eventId || !action) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'lojaId, eventId e action são obrigatórios' }) };
    }

    const db = getDb();
    let refreshToken = null;

    const cleanProfId = (profissionalId && profissionalId !== 'null' && profissionalId !== 'undefined')
      ? profissionalId : null;

    if (cleanProfId) {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${cleanProfId}`)
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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Google Calendar não conectado' }) };
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (action === 'delete') {
      await calendar.events.delete({ calendarId: 'primary', eventId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'update') {
      if (!start || !end) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'start e end são obrigatórios para update' }) };
      }
      const patch = { start: { dateTime: start }, end: { dateTime: end } };
      if (summary) patch.summary = summary;
      await calendar.events.patch({ calendarId: 'primary', eventId, resource: patch });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'action inválido' }) };

  } catch (error) {
    console.error('manageGCalEvent error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
