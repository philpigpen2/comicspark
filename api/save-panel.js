export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, panelId, bookId } = req.body;

  if (!imageUrl || !panelId || !bookId) {
    return res.status(400).json({ error: 'imageUrl, panelId, and bookId are required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  try {
    // Download image from OpenAI URL
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      return res.status(500).json({ error: 'Failed to download image from OpenAI' });
    }
    const imageBuffer = await imgResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // Upload to Supabase Storage
    const fileName = `${bookId}/${panelId}.png`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/panels/${fileName}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: imageBytes,
    });

    if (!uploadResponse.ok) {
      const uploadErr = await uploadResponse.text();
      console.error('Supabase upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload to Supabase Storage' });
    }

    // Build the permanent public URL
    const permanentUrl = `${supabaseUrl}/storage/v1/object/public/panels/${fileName}`;

    // Update the panel record with the permanent URL
    const updateUrl = `${supabaseUrl}/rest/v1/panels?id=eq.${panelId}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ image_url: permanentUrl }),
    });

    if (!updateResponse.ok) {
      const updateErr = await updateResponse.text();
      console.error('Supabase update error:', updateErr);
      return res.status(500).json({ error: 'Failed to update panel record' });
    }

    return res.status(200).json({ permanentUrl });
  } catch (err) {
    console.error('save-panel error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
