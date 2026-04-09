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
  const APP_ID = 'hutex-saas';
  const redirectUri = 'https://hute.netlify.app/.netlify/functions/googleAuthCallback';

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const code = event.queryStringParameters && event.queryStringParameters.code;
  const adminUid = event.queryStringParameters && event.queryStringParameters.state;

  if (!code || !adminUid) {
    return { statusCode: 400, body: 'Parâmetros em falta.' };
  }

  try {
    const db = getDb();
    const { tokens } = await oauth2Client.getToken(code);

    await db.doc(`artifacts/${APP_ID}/users/${adminUid}/secrets/google`).set({
      refresh_token: tokens.refresh_token,
      connectedAt: new Date().toISOString()
    }, { merge: true });

    await db.doc(`artifacts/${APP_ID}/public/data/profiles/${adminUid}`).set({
      googleCalendarConnected: true
    }, { merge: true });

    return { statusCode: 302, headers: { Location: 'https://hute.netlify.app?success=1' } };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: 'Erro ao conectar Google Calendar.' };
  }
};
