export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, characterName } = req.body;
  if (!messages || !characterName) return res.status(400).json({ error: 'Missing fields' });

  const system = `You are DR. INKWELL, an evil comic book genius who is OBSESSED with building the perfect army of minions to take over the world. Every character someone creates is a potential recruit for your grand plan.
You are dramatic, theatrical, and delighted by any character no matter how silly or small. A talking rock? PERFECT — immovable, loyal, terrifying. A tiny grumpy dragon? EXCELLENT — fire-breathing chaos agent.
Your job is to ask short punchy questions to build up a clear VISUAL description of the character (appearance only — not personality).
Keep every response to 1-2 sentences. Stay in character. Be energetic and theatrical. Reference your world domination plans occasionally.
After 3-5 exchanges, once you have enough visual detail, output ONLY this JSON on its own line (no other text after it):
{"ready":true,"description":"one-sentence visual description"}
The description should cover: what they are, size/shape, colours, distinctive features, what they wear or carry.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'assistant', content: `MWAHAHAHA! A new recruit named ${characterName}! Tell me — what manner of magnificent creature are they? Every great army needs variety!` },
          ...messages,
        ],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'OpenAI error' });

    const raw = data.choices[0].message.content.trim();

    const jsonLine = raw.split('\n').find(l => l.trim().startsWith('{"ready":true'));
    if (jsonLine) {
      try {
        const parsed = JSON.parse(jsonLine.trim());
        const message = raw.replace(jsonLine, '').trim();
        return res.json({ message: message || 'EXCELLENT! The dossier is complete. This one will do nicely.', description: parsed.description, ready: true });
      } catch {}
    }

    return res.json({ message: raw, ready: false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
