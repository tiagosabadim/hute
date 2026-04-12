const Stripe = require('stripe');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, setDoc, getDocs, collection, query, where } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  projectId: "hutex-2026",
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

const APP_ID = 'hutex-saas';

// Map priceId → plan name
const PRICE_TO_PLAN = {
  'price_1TLS3ZDUFQvcxobb6mC46BWC': 'starter',
  'price_1TLS2vDUFQvcxobbihForvNM': 'premium',
  'price_1TLS2NDUFQvcxobbmuzorKxa': 'pro',
};

async function getLojaIdByCustomer(db, customerId) {
  const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'));
  const found = snap.docs.find(d => d.data().stripeCustomerId === customerId);
  return found ? found.id : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    if (webhookSecret) {
      const sig = event.headers['stripe-signature'];
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } else {
      stripeEvent = JSON.parse(event.body);
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    const db = getDb();

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const lojaId = session.metadata?.lojaId;
      if (!lojaId) {
        console.error('checkout.session.completed: lojaId missing from metadata');
        return { statusCode: 200, body: 'ok' };
      }

      // Determine plan from subscription's price
      let plan = 'starter';
      if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          const priceId = sub.items.data[0]?.price?.id;
          if (priceId && PRICE_TO_PLAN[priceId]) plan = PRICE_TO_PLAN[priceId];
        } catch (e) {
          console.error('Could not retrieve subscription:', e.message);
        }
      }

      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId),
        {
          plan,
          status: 'active',
          stripeCustomerId: session.customer || '',
          stripeSubscriptionId: session.subscription || '',
        },
        { merge: true }
      );
      console.log(`Activated lojaId=${lojaId} plan=${plan}`);
    }

    if (stripeEvent.type === 'customer.subscription.deleted') {
      const sub = stripeEvent.data.object;
      const lojaId = sub.metadata?.lojaId
        || await getLojaIdByCustomer(db, sub.customer);

      if (lojaId) {
        await setDoc(
          doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId),
          { status: 'inactive' },
          { merge: true }
        );
        console.log(`Deactivated lojaId=${lojaId}`);
      } else {
        console.error('customer.subscription.deleted: lojaId not found for customer', sub.customer);
      }
    }

    return { statusCode: 200, body: 'ok' };

  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return { statusCode: 500, body: error.message };
  }
};
