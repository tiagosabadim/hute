// Webhook da Evolution API — recebe messages.upsert e processa via chatbotHandler
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Evolution API envia { event, data: { key, message, ... } }
  if (body.event !== 'messages.upsert') {
    return { statusCode: 200, body: JSON.stringify({ ignored: true }) };
  }

  const data = body.data || {};
  const key = data.key || {};

  // Ignora mensagens próprias e grupos
  if (key.fromMe) return { statusCode: 200, body: JSON.stringify({ ignored: 'fromMe' }) };
  if (key.remoteJid && key.remoteJid.endsWith('@g.us')) {
    return { statusCode: 200, body: JSON.stringify({ ignored: 'group' }) };
  }

  // Extrai número do remetente (remove @s.whatsapp.net)
  const phone = (key.remoteJid || '').replace('@s.whatsapp.net', '').replace(/\D/g, '');
  if (!phone) return { statusCode: 200, body: JSON.stringify({ ignored: 'no_phone' }) };

  // connectedPhone = número da instância (vem no body da Evolution)
  const connectedPhone = (body.instance || '').replace(/\D/g, '');

  // Detecta tipo e conteúdo da mensagem
  const msg = data.message || {};
  let message = '';
  let messageType = 'conversation';
  let audioUrl = '';

  if (msg.conversation) {
    message = msg.conversation;
    messageType = 'conversation';
  } else if (msg.extendedTextMessage) {
    message = msg.extendedTextMessage.text || '';
    messageType = 'extendedTextMessage';
  } else if (msg.audioMessage || msg.pttMessage) {
    messageType = msg.pttMessage ? 'pttMessage' : 'audioMessage';
    // URL do áudio (Evolution envia base64 ou url dependendo da config)
    audioUrl = data.mediaUrl || '';
  } else if (msg.imageMessage) {
    messageType = 'imageMessage';
  } else if (msg.documentMessage) {
    messageType = 'documentMessage';
  } else if (msg.stickerMessage) {
    messageType = 'stickerMessage';
  }

  // Chama chatbotHandler internamente
  const baseUrl = process.env.URL || 'https://hute.netlify.app';
  const chatbotPayload = { phone, connectedPhone, message, messageType, audioUrl };

  let botReply = null;
  try {
    const chatRes = await fetch(baseUrl + '/.netlify/functions/chatbotHandler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatbotPayload),
    });
    const chatJson = await chatRes.json();
    botReply = chatJson.message;
  } catch (err) {
    console.error('Erro ao chamar chatbotHandler:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  // Se não há resposta (ex: sticker ignorado), retorna 200 sem enviar nada
  if (!botReply) return { statusCode: 200, body: JSON.stringify({ sent: false }) };

  // Envia resposta via sendWhatsApp
  try {
    await fetch(baseUrl + '/.netlify/functions/sendWhatsApp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectedPhone, phone, message: botReply }),
    });
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err.message);
  }

  return { statusCode: 200, body: JSON.stringify({ sent: true }) };
};
