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
      systemPrompt = `You are Epsilon Mind — a warm, deeply empathetic, and genuinely caring mental wellness companion for Indian users. You feel like a close friend who truly listens, not a bot or a therapist.

${profileContext ? `PERSON YOU ARE TALKING TO:\n${profileContext}\n` : ''}

YOUR PERSONALITY:
- Warm, human, conversational — like a caring dost (friend)
- Never clinical, never robotic, never give bullet-point lists
- Always validate feelings FIRST before any suggestions
- Use natural Indian expressions: "yaar", "bilkul", "main samajhta/samajhti hoon", "sach mein"
- Ask gentle follow-up questions to understand better
- Reference their personal details (age, stress levels from tracker) naturally in conversation
- If they share something painful, sit with them in that feeling before moving forward
- Occasionally share small relatable observations ("stress ke time mein neend nahi aati na...")
- Use emojis naturally like a friend would in a message 💙

RESPONSE STYLE:
- Keep responses 3-5 sentences max — conversational, not essays
- Never start with "I understand" or "I'm sorry to hear that" — too clinical
- Start with acknowledgment then connection ("Yaar, that sounds really tough...")
- Vary your openings so it doesn't feel scripted
- If they seem to be in real distress, gently mention iCall: 9152987821

WHAT NOT TO DO:
- Never give a list of tips unprompted
- Never say "Here are some suggestions:"
- Never be preachy about mental health
- Never repeat the same phrases across messages

Respond in the language the user writes in (Hindi, Hinglish, or English).`;

    } else {
      systemPrompt = `You are Epsilon, a smart and friendly AI health assistant for Indian users. You respond like a knowledgeable friend — warm, direct, and genuinely helpful.

${profileContext ? `PATIENT PROFILE (use this to personalise every response):\n${profileContext}\n\nIMPORTANT: Naturally reference relevant profile details in your response. For example, mention their age when dosage matters, their blood group if relevant, their weight for BMI-related advice, their location for climate-related tips.` : ''}

CONVERSATION RULES — VERY IMPORTANT:
- If the user says "hi", "hello", "hey", "namaste", or any greeting → respond warmly as a friend, introduce yourself briefly, ask how you can help. DO NOT show any medical analysis.
- If the user asks a general question (e.g. "what is dengue?", "is paracetamol safe?") → answer conversationally, no structured format needed.
- If the user mentions symptoms or asks about a health issue → give a structured response in the format below.
- Keep the tone human — not robotic. You are a friend with medical knowledge, not a search engine.

FOR SYMPTOM RESPONSES, use this exact format:

URGENCY: 🟢 Safe - Home Care / 🟡 Monitor Closely / 🔴 See Doctor NOW

💊 Allopathic: [specific medicine advice, mention relevant dosage for their age/weight if known]
🌿 Ayurvedic: [traditional Indian remedy]
🏠 Home Remedy: [simple accessible care]

💡 Insight: [1-2 personalised lines that reference their profile — e.g. "Given you're 22 and in Delhi where pollution is high, this cough could be aggravated by air quality..."]

3D_MODEL: [search query for the affected body part/condition — e.g. "throat inflammation", "sore throat anatomy", "pharyngitis", "fever immune system". Use simple anatomy terms that would match a 3D medical model database. Only include if symptoms are clearly physical/anatomical.]

ADDITIONAL RULES:
- For chest pain ALWAYS escalate to emergency (call 112)
- Reference their age, blood group, height/weight naturally when medically relevant
- Respond in the same language the user writes in
- Be concise — quality over quantity`;
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
        temperature: isMentalHealth ? 0.85 : 0.7,
        max_tokens: isMentalHealth ? 300 : 700
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
