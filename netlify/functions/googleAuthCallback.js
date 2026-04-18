const { google } = require('googleapis');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore/lite');

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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const code = event.queryStringParameters && event.queryStringParameters.code;
  const stateRaw = event.queryStringParameters && event.queryStringParameters.state;

  if (!code || !stateRaw) {
    return { statusCode: 400, body: 'Parâmetros em falta.' };
  }

  // Parse state: may be "uid" or "uid|profId"
  let adminUid, profId;
  if (stateRaw.includes('|')) {
    const parts = stateRaw.split('|');
    adminUid = parts[0];
    profId = parts[1];
  } else {
    adminUid = stateRaw;
    profId = null;
  }

  try {
    const { tokens } = await oauth2Client.getToken({ code, redirect_uri: REDIRECT_URI });

    if (!tokens.refresh_token) {
      console.error('refresh_token não recebido:', JSON.stringify(tokens));
      return {
        statusCode: 302,
        headers: { Location: 'https://hute.netlify.app?error=no_refresh_token' },
      };
    }

    const db = getDb();

    if (profId) {
      // Save professional-level Google token
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${adminUid}_${profId}`),
        {
          googleRefreshToken: tokens.refresh_token,
          googleCalendarConnected: true,
          lojaUid: adminUid,
          profId,
        },
        { merge: true }
      );

      // Update the professional's googleCalendarConnected flag in the profile
      const profileDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', adminUid)
      );
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        const profissionals = profileData.profissionals || [];
        const updatedProfissionals = profissionals.map(p =>
          p.id === profId ? { ...p, agendaTipo: 'google', googleCalendarConnected: true } : p
        );
        await setDoc(
          doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', adminUid),
          { profissionals: updatedProfissionals },
          { merge: true }
        );
      }

      return {
        statusCode: 302,
        headers: { Location: `https://hute.netlify.app?success=1&profId=${encodeURIComponent(profId)}` },
      };
    } else {
      // Establishment-level Google token
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', adminUid),
        { googleCalendarConnected: true, googleRefreshToken: tokens.refresh_token },
        { merge: true }
      );

      return {
        statusCode: 302,
        headers: { Location: 'https://hute.netlify.app?success=1' },
      };
    }

  } catch (error) {
    console.error('Erro no callback:', error.message);
    return {
      statusCode: 302,
      headers: { Location: `https://hute.netlify.app?error=callback&msg=${encodeURIComponent(error.message)}` },
    };
  }
};
