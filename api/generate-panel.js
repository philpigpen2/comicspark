export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, style, refined, layout } = req.body;

  if (!prompt || !style) {
    return res.status(400).json({ error: 'prompt and style are required' });
  }

  const styleDescriptions = {
    manga: 'black and white manga style, Japanese comic art, clean line art, screentone shading, expressive characters',
    western: 'Western comic book style, bold colours, dynamic action lines, Marvel/DC aesthetic, cel shaded, vivid ink outlines',
    watercolour: 'soft watercolour illustration, painterly washes, gentle blending, dreamy atmospheric colours, loose brushwork',
    noir: 'film noir style, dark moody shadows, high contrast black and white, chiaroscuro lighting, gritty urban atmosphere',
    cartoon: 'bright cartoon style, fun animated aesthetic, thick outlines, saturated cheerful colours, Cartoon Network inspired',
    realistic: 'photorealistic illustration, detailed rendering, cinematic lighting, highly detailed, professional concept art',
  };

  const stylePrompt = styleDescriptions[style] || style;

  const fullPrompt = refined
    ? `${refined}. Art style: ${stylePrompt}. Pure illustration only — absolutely no text, letters, words, speech bubbles, thought bubbles, caption boxes, dialogue, or any written elements of any kind anywhere in the image. Comic book panel artwork only.`
    : `${prompt}. Art style: ${stylePrompt}. Pure illustration only — absolutely no text, letters, words, speech bubbles, thought bubbles, caption boxes, dialogue, or any written elements of any kind anywhere in the image. Comic book panel artwork only.`;

  // Map page layout to the correct DALL-E image size
  const sizeMap = {
    'splash':   '1024x1792', // tall portrait — full-page splash
    'strip-3':  '1792x1024', // wide landscape — 3-panel strip
    'grid-2x2': '1024x1024', // square — 2x2 grid
    'duo':      '1024x1024', // square — side-by-side duo
  };
  const size = sizeMap[layout] || '1024x1024';

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size,
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('OpenAI error:', err);
      return res.status(500).json({ error: err.error?.message || 'OpenAI request failed' });
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;
    const revisedPrompt = data.data[0].revised_prompt;

    return res.status(200).json({ imageUrl, revisedPrompt });
  } catch (err) {
    console.error('generate-panel error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
