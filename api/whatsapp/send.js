// WhatsApp Business API integration for Vercel
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, message } = req.body;

  try {
    // Example using WhatsApp Business API
    // You'll need to replace with your actual API credentials
    const response = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({ success: true, messageId: data.messages[0].id });
    } else {
      res.status(400).json({ success: false, error: data.error });
    }
  } catch (error) {
    console.error('WhatsApp API error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}