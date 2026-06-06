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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Método não permitido' };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      lojaId,
      clienteNome,
      clienteWhats,
      clienteNascimento,
      servico,
      valor,
      duracao,
      profissionalId,
      profissionalNome,
      data,
      hora,
      dataHoraInternacional,
      appointmentId,
      accessToken,
      source,
    } = body;

    if (!lojaId || !dataHoraInternacional) {
      return { statusCode: 400, body: JSON.stringify({ error: 'lojaId e dataHoraInternacional são obrigatórios' }) };
    }

    const db = getDb();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Always fetch profile to get slug + fallback refresh token
    const profileDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', lojaId));
    const profileData = profileDoc.exists() ? profileDoc.data() : {};
    const slug = profileData.slug || lojaId;
    const connectedPhone = profileData.whatsappNumber || '';

    let refreshToken = null;

    // Prefer professional's Google token
    if (profissionalId) {
      const profCalDoc = await getDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${lojaId}_${profissionalId}`)
      );
      if (profCalDoc.exists() && profCalDoc.data().googleCalendarConnected && profCalDoc.data().googleRefreshToken) {
        refreshToken = profCalDoc.data().googleRefreshToken;
      }
    }

    // Fallback to establishment-level token
    if (!refreshToken && profileData.googleRefreshToken) {
      refreshToken = profileData.googleRefreshToken;
    }

    // ── Google Calendar sync (optional) ────────────────────
    let googleSync = false;
    let eventId = null;

    if (refreshToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const inicio = new Date(dataHoraInternacional);
        const duracaoMin = duracao ? Number(duracao) : 60;
        const fim = new Date(inicio.getTime() + duracaoMin * 60 * 1000);

        const descLines = [
          clienteWhats ? `WhatsApp: ${clienteWhats}` : null,
          clienteNascimento ? `Nascimento: ${clienteNascimento}` : null,
          `Serviço: ${servico || ''}`,
          valor ? `Preço: R$ ${valor}` : null,
          `Duração: ${duracaoMin} min`,
          profissionalNome ? `Profissional: ${profissionalNome}` : null,
          '\nMarcação via Hute',
        ].filter(Boolean).join('\n');

        const eventResponse = await calendar.events.insert({
          calendarId: 'primary',
          resource: {
            summary: `${servico || 'Marcação'} - ${clienteNome || 'Cliente'}`,
            description: descLines,
            start: { dateTime: inicio.toISOString() },
            end: { dateTime: fim.toISOString() },
          },
        });

        googleSync = true;
        eventId = eventResponse.data.id;
      } catch (calErr) {
        console.error('Google Calendar sync error:', calErr.message);
      }
    }

    // ── Normaliza telefone ─────────────────────────────────
    const telefoneNormalizado = (() => {
      const digits = (clienteWhats || '').replace(/\D/g, '');
      return digits.startsWith('55') ? digits : `55${digits}`;
    })();

    const linkAgendamento = appointmentId
      ? `https://hute.netlify.app/#${slug}/agendamento/${appointmentId}${accessToken ? `?token=${accessToken}` : ''}`
      : '';

    // ── Envio WhatsApp direto (sem n8n) ────────────────────
    // Só envia se não veio da IA (a IA já enviou a confirmação)
    if (source !== 'ai' && telefoneNormalizado && connectedPhone) {
      try {
        const baseUrl = process.env.URL || 'https://hute.netlify.app';
        await fetch(`${baseUrl}/.netlify/functions/sendWhatsApp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectedPhone,
            phone: telefoneNormalizado,
            message: `✅ Agendamento confirmado!\n\n${servico || ''}\nData: ${data ? data.split('-').reverse().join('/') : ''}\nHora: ${hora || ''}\nProfissional: ${profissionalNome || ''}\n\nVer ou alterar:\n${linkAgendamento}`,
          }),
        }).catch(err => console.error('Erro sendWhatsApp:', err));
      } catch (err) {
        console.error('Erro envio WhatsApp:', err.message);
      }
    }

    // ── FCM push notification ───────────────────────────────
    if (profileData.fcmToken) {
      const { sendFCMPush } = require('./fcmHelper');
      await sendFCMPush(
        profileData.fcmToken,
        'Novo agendamento! 🗓️',
        `${clienteNome || 'Cliente'} — ${servico || ''} às ${hora || ''}`,
        { type: 'new', lojaId }
      );
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, googleSync, eventId }),
    };

  } catch (error) {
    console.error('Erro createAppointment:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
