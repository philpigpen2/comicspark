export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { description, name, style } = req.body;
  if (!description || !name) return res.status(400).json({ error: 'name and description required' });

  const styleDescriptions = {
    manga:       'black and white manga style, Japanese comic art, clean line art',
    western:     'Western comic book style, bold colours, Marvel/DC aesthetic, cel shaded, vivid ink outlines',
    watercolour: 'soft watercolour illustration, painterly washes, dreamy colours',
    noir:        'film noir style, high contrast black and white, chiaroscuro lighting',
    cartoon:     'bright cartoon style, thick outlines, saturated cheerful colours',
    realistic:   'photorealistic illustration, detailed rendering, cinematic lighting',
  };
  const stylePrompt = styleDescriptions[style] || styleDescriptions.western;

  const prompt = `Character reference sheet. The character is: ${description}. Full body view, ${stylePrompt}, plain white background, neutral standing pose, showing the complete character clearly from head to toe. Pure illustration — absolutely no text, letters, words, labels, speech bubbles, or any written elements anywhere in the image.`;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'OpenAI request failed' });
    }

    const data = await response.json();
    return res.status(200).json({ imageUrl: data.data[0].url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
