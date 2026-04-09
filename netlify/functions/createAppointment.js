const { google } = require('googleapis');
const admin = require('firebase-admin');

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  }
  return admin.firestore();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const db = getDb();
    const data = JSON.parse(event.body);
    const { lojaId, clienteNome, clienteWhats, servico, dataHoraInternacional } = data;
    const APP_ID = 'hutex-saas';

    const secretsDoc = await db.doc(`artifacts/${APP_ID}/users/${lojaId}/secrets/google`).get();

    if (!secretsDoc.exists) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, googleSync: false, message: "Apenas guardado na plataforma local." })
      };
    }

    const tokens = secretsDoc.data();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const inicio = new Date(dataHoraInternacional);
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

    const eventResponse = await calendar.events.insert({
      calendarId: "primary",
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
    console.error("Erro na criação do evento:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao sincronizar com Google Agenda." })
    };
  }
};
