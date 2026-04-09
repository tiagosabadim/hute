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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const data = JSON.parse(event.body);
    const { lojaId, clienteNome, clienteWhats, servico, dataHoraInternacional } = data;

    const db = getDb();
    const secretsDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'users', lojaId, 'secrets', 'google'));

    if (!secretsDoc.exists()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, googleSync: false })
      };
    }

    const { refresh_token } = secretsDoc.data();

    const clientId = process.env.GOOGLE_CLIENT_ID || '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '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';

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const inicio = new Date(dataHoraInternacional);
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

    const eventResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: `${servico} - ${clienteNome}`,
        description: `WhatsApp: ${clienteWhats}\nServiço: ${servico}\n\nMarcação via Hutex SaaS`,
        start: { dateTime: inicio.toISOString() },
        end: { dateTime: fim.toISOString() },
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, googleSync: true, eventId: eventResponse.data.id })
    };

  } catch (error) {
    console.error('Erro createAppointment:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
