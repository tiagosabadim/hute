const { google } = require('googleapis');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const REDIRECT_URI = 'https://hute.netlify.app/.netlify/functions/googleAuthCallback';
const APP_ID = 'hutex-saas';

exports.handler = async (event) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  const code = event.queryStringParameters && event.queryStringParameters.code;
  const adminUid = event.queryStringParameters && event.queryStringParameters.state;

  if (!code || !adminUid) {
    return { statusCode: 400, body: 'Parâmetros em falta.' };
  }

  try {
    const { tokens } = await oauth2Client.getToken({ code, redirect_uri: REDIRECT_URI });

    if (!tokens.refresh_token) {
      console.error('refresh_token não recebido:', JSON.stringify(tokens));
      return { statusCode: 302, headers: { Location: 'https://hute.netlify.app?error=no_refresh_token' } };
    }

    const db = getDb();

    await setDoc(
      doc(db, 'artifacts', APP_ID, 'users', adminUid, 'secrets', 'google'),
      { refresh_token: tokens.refresh_token, connectedAt: new Date().toISOString() },
      { merge: true }
    );

    await setDoc(
      doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', adminUid),
      { googleCalendarConnected: true },
      { merge: true }
    );

    return { statusCode: 302, headers: { Location: 'https://hute.netlify.app?success=1' } };

  } catch (error) {
    console.error('Erro no callback:', error.message);
    return {
      statusCode: 302,
      headers: { Location: `https://hute.netlify.app?error=callback&msg=${encodeURIComponent(error.message)}` }
    };
  }
};
