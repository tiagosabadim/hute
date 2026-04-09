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

    let tokens;
    try {
      const result = await oauth2Client.getToken(code);
      tokens = result.tokens;
    } catch (tokenError) {
      console.error('ERRO ao trocar code por tokens:', tokenError.message);
      return { statusCode: 302, headers: { Location: `https://hute.netlify.app?error=token&msg=${encodeURIComponent(tokenError.message)}` } };
    }

    if (!tokens.refresh_token) {
      console.error('ERRO: refresh_token não recebido. Tokens:', JSON.stringify(tokens));
      return { statusCode: 302, headers: { Location: 'https://hute.netlify.app?error=no_refresh_token' } };
    }

    await db.doc(`artifacts/${APP_ID}/users/${adminUid}/secrets/google`).set({
      refresh_token: tokens.refresh_token,
      connectedAt: new Date().toISOString()
    }, { merge: true });

    await db.doc(`artifacts/${APP_ID}/public/data/profiles/${adminUid}`).set({
      googleCalendarConnected: true
    }, { merge: true });

    return { statusCode: 302, headers: { Location: 'https://hute.netlify.app?success=1' } };

  } catch (error) {
    console.error('ERRO GERAL na function:', error.message);
    return { statusCode: 302, headers: { Location: `https://hute.netlify.app?error=geral&msg=${encodeURIComponent(error.message)}` } };
  }
};
