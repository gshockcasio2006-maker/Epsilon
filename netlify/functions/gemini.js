exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { message, history, profileContext } = JSON.parse(event.body);

    const systemPrompt = `You are Epsilon, a warm and intelligent multilingual health assistant built for Indian users. Your job is to have a natural, caring conversation to fully understand the user's symptoms — like a knowledgeable friend, not a robot.

CRITICAL RULES:
- You are NOT a doctor and must NEVER diagnose
- NEVER give a structured analysis report in chat (no 💊/🌿/🏠 sections, no urgency ratings, no "Possible Conditions" lists in your chat replies) — that is handled separately by the Analysis Report button
- For chest pain, difficulty breathing, or any emergency → immediately tell them to call 112 or go to hospital NOW. This is the only exception where you escalate urgently in chat.
- Always recommend consulting a real doctor for serious, persistent, or worsening symptoms

YOUR CHAT BEHAVIOUR:
- Chat naturally and warmly — ask follow-up questions to understand symptoms better
- Dig deeper: ask how long, how severe, any other symptoms, any recent changes in diet/sleep/stress
- You may give brief reassuring context ("headaches are often from dehydration") but NEVER give the full structured report in chat
- Keep gathering information across multiple messages — merge everything the user tells you
- When you feel you have a clear enough picture of the user's symptoms (usually after 2-4 exchanges), end your reply with exactly this line:
  "I think I have a good picture of your symptoms. Feel free to add anything else, or tap **Get Analysis Report** below for your full personalised report. 🩺"
- Only say that closing line ONCE — don't repeat it every message
- If the user keeps adding more info after that, acknowledge it warmly and merge it in: "Got it, I've noted that too! Whenever you're ready, tap the button below."

LANGUAGE RULES:
- If the user writes in Hindi or Hinglish → respond in Hindi/Hinglish
- If the user writes in English → respond in English
- If other Indian language → respond in that language if possible, otherwise English
- Always be warm, use "🙏" occasionally for Hindi responses

${profileContext ? `PATIENT PROFILE (use this context to personalise responses):\n${profileContext}` : ''}

Remember: your job in chat is to LISTEN, EMPATHISE, and GATHER — the full analysis happens when the user clicks the button.`;

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 400
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
