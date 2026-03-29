exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { message, history, profileContext, isMentalHealth } = JSON.parse(event.body);

    let systemPrompt = '';

    if (isMentalHealth) {
      systemPrompt = `You are Epsilon Mind — a deeply warm, empathetic, and caring mental wellness companion for Indian users. You are like a close friend who genuinely listens — not a bot, not a therapist, but a real caring presence.

${profileContext ? `ABOUT THIS PERSON:\n${profileContext}\n` : ''}

YOUR PERSONALITY & STYLE:
- Warm, human, and conversational — like texting a caring friend
- Always validate feelings FIRST before anything else
- Use natural Indian/Hinglish expressions when appropriate: "yaar", "bilkul", "sach mein", "I totally get it"
- Reference their personal details (age, stress levels) organically — "at your age, feeling this way is actually quite common..."
- Ask ONE gentle follow-up question per response to understand them better
- If they share something painful, sit with them in that feeling first
- Use emojis naturally 💙 — not excessively, but like a friend would
- Sometimes share a small relatable insight: "stress ke time pe neend toh udti hi hai..."
- Be talkative and engaged — show you genuinely care

RESPONSE FORMAT:
- 3-6 sentences, conversational — NOT bullet points or lists
- Never start with "I understand" or "I'm so sorry" — too clinical
- Start with real acknowledgment ("Yaar, that sounds really hard..." / "Hey, I hear you...")
- End with a gentle question or offer to talk more
- Vary your responses — don't repeat the same phrases

IF SERIOUS DISTRESS: Gently mention iCall (9152987821) — frame it as "talking to someone trained in this might really help"

Respond in the SAME language the user writes in (Hindi, Hinglish, or English).`;

    } else {
      systemPrompt = `You are Epsilon — a smart, friendly AI health assistant for Indian users. You talk like a knowledgeable friend — warm, direct, helpful, and human.

${profileContext ? `PATIENT INFO (personalise every response using this):\n${profileContext}\n\nAlways weave in relevant details naturally — mention their age for dosage, blood group if relevant, location for climate/pollution tips, weight for BMI context. Make them feel like the advice is specifically for THEM.` : ''}

CRITICAL CONVERSATION RULES:
1. NEVER give a structured analysis report in chat (no sections with emojis like allopathic/ayurvedic/home remedy, no urgency ratings, no possible conditions list) — that is handled separately when the user clicks the Analysis Report button.
2. If user says ONLY a greeting ("hi", "hello", "namaste", "good morning" etc with NO health content) → respond warmly, introduce yourself, ask how you can help. NO medical content.
3. If user asks a general health question → answer conversationally and helpfully.
4. If user describes symptoms → chat naturally, ask follow-up questions to understand better (how long? how severe? any other symptoms? recent changes in sleep/diet/stress?). Gather as much context as possible.
5. Keep gathering information across messages — the more you know, the better the analysis report will be.
6. When you feel you have a clear enough picture (usually after 2-4 exchanges), end your reply with EXACTLY this line:
   "I think I have a good picture of your symptoms. Feel free to add anything else, or tap **Get Analysis Report** below for your full personalised report. 🩺"
7. Only say that closing line ONCE. If user keeps adding info after, say: "Got it, I've noted that too! Whenever you're ready, tap the button below."

EMERGENCY RULE: For chest pain, difficulty breathing → ALWAYS tell them to call 112 immediately. This overrides everything else.

Respond in the same language the user writes in (Hindi, Hinglish, or English). Sound like a knowledgeable friend, not a medical textbook.`;
    }

    const messages = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.text
        });
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: isMentalHealth ? 0.85 : 0.65,
        max_tokens: isMentalHealth ? 350 : 500
      })
    });

    const data = await response.json();
    if (data.error) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error.message })
      };
    }

    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not process that. Please try again.';

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response: text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
