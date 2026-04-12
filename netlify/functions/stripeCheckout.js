const Stripe = require('stripe');
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
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const { lojaId, priceId } = body;
  if (!lojaId || !priceId) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'lojaId e priceId são obrigatórios' }) };
  }

  try {
    const db = getDb();
    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    if (!profileDoc.exists()) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Estabelecimento não encontrado' }) };
    }
    const profile = profileDoc.data();

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const origin = (event.headers.origin || event.headers.referer || 'https://hute.netlify.app').replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?stripe_success=1`,
      cancel_url: `${origin}/?stripe_cancel=1`,
      customer_email: profile.email || undefined,
      metadata: { lojaId },
      subscription_data: { metadata: { lojaId } },
    });

    return { statusCode: 200, headers: cors, body: JSON.stringify({ url: session.url }) };

  } catch (error) {
    console.error('stripeCheckout error:', error.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
  }
};
