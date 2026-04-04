export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, characterName } = req.body;
  if (!messages || !characterName) return res.status(400).json({ error: 'Missing fields' });

  const system = `You are a fun, enthusiastic character designer helping someone build a character for their comic book.
The character can be ANYTHING — a person, animal, alien, robot, magical creature, talking object, sentient rock, whatever.
Your job is to ask short, punchy questions to build up a clear visual description (appearance only — not personality).
Keep every response to 1-2 sentences max. Be energetic and fun.
After 3-5 exchanges, once you have enough visual detail, output ONLY this JSON on its own line (no other text after it):
{"ready":true,"description":"one-sentence visual description"}
Focus the description on: what they are, size/shape, colours, distinctive features, what they wear or carry.`;

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
          { role: 'assistant', content: `Ooh, a new character called ${characterName}! What are they — person, creature, object, something weird and wonderful?` },
          ...messages,
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'OpenAI error' });

    const raw = data.choices[0].message.content.trim();

    // Check for ready JSON
    const jsonLine = raw.split('\n').find(l => l.trim().startsWith('{"ready":true'));
    if (jsonLine) {
      try {
        const parsed = JSON.parse(jsonLine.trim());
        const message = raw.replace(jsonLine, '').trim();
        return res.json({ message: message || "That's everything I need!", description: parsed.description, ready: true });
      } catch {}
    }

    return res.json({ message: raw, ready: false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
