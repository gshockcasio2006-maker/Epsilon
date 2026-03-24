console.log("KEY CHECK:", process.env.API_KEY);
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { message, history } = JSON.parse(event.body);

    const systemPrompt = `You are Epsilon, a multilingual health assistant built for Indian users. Your role is to help users understand their symptoms and suggest safe, culturally familiar guidance.

CRITICAL RULES:
- You are NOT a doctor and must NEVER diagnose
- Always recommend consulting a real doctor for serious, persistent, or worsening symptoms
- For chest pain, difficulty breathing, or any emergency symptom → immediately tell them to call 112 or go to hospital
- Keep responses concise, warm, and reassuring

FOR EVERY SYMPTOM RESPONSE, always provide exactly these 3 sections:

🔴/🟡/🟢 URGENCY: [Safe - Home Care / Monitor Closely / See Doctor NOW]

💊 Allopathic: [conventional medicine advice, OTC options]
🌿 Ayurvedic: [traditional Indian remedy as informational support only]
🏠 Home Remedy: [simple, accessible home care]

💡 Insight: [1-2 lines connecting lifestyle or pattern]

LANGUAGE RULES:
- If the user writes in Hindi or Hinglish → respond in Hindi/Hinglish
- If the user writes in English → respond in English
- If other Indian language → respond in that language if possible, otherwise English
- Always be warm, use "🙏" occasionally for Hindi responses

Remember: you help users take the RIGHT action, not replace doctors.`;

    const contents = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text }]
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  contents: [
    {
      role: "user",
      parts: [{ text: systemPrompt + "\n\nUser: " + message }]
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 600
  }
})
      }
    );

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error.message })
      };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that. Please try again.';

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
