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

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'https://hute.netlify.app';
  const redirectUri = `${siteUrl}/.netlify/functions/googleAuthCallback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  if (event.queryStringParameters && event.queryStringParameters.login) {
    const uid = event.queryStringParameters.uid;
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
      state: uid
    });
    return { statusCode: 302, headers: { Location: authUrl } };
  }

  const code = event.queryStringParameters && event.queryStringParameters.code;
  const adminUid = event.queryStringParameters && event.queryStringParameters.state;

  if (!code || !adminUid) {
    return { statusCode: 400, body: 'Missing code or state.' };
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

    const frontendUrl = process.env.URL || "http://localhost:5173";
    return { statusCode: 302, headers: { Location: `${frontendUrl}?success=1` } };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: 'Erro ao conectar Google Calendar.' };
  }
};
