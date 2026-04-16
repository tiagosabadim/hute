const { google } = require('googleapis');

const PROJECT_ID = 'hutex-2026';

async function sendFCMPush(token, title, body, extraData = {}) {
  if (!token) return;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) {
    console.warn('FCM: FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY not set, skipping push');
    return;
  }
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const accessToken = await auth.getAccessToken();
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(extraData).map(([k, v]) => [k, String(v)])
          ),
        },
      }),
    });
    if (!res.ok) {
      console.error('FCM v1 send error:', await res.text());
    }
  } catch (e) {
    console.error('sendFCMPush error:', e.message);
  }
}

module.exports = { sendFCMPush };
