const cors = require('cors');

const corsMiddleware = cors({ methods: ['POST', 'OPTIONS'] });

module.exports = async (req, res) => {
    // Enable CORS
    await new Promise((resolve) => corsMiddleware(req, res, resolve));

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { url, startTime, endTime } = req.body;

    try {
        console.log("Attempting to fetch from Cobalt for URL:", url);

        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0' // Cobalt sometimes blocks requests without a browser header
            },
            body: JSON.stringify({
                url: url,
                vQuality: '720',
                isAudioOnly: false
            })
        });

        const data = await response.json();

        // This log will appear in your Vercel Logs tab
        console.log("Cobalt API Raw Response:", JSON.stringify(data));

        if (!response.ok || !data.url) {
            return res.status(500).json({ error: 'Cobalt rejected the request', details: data });
        }

        return res.status(200).json({ success: true, streamUrl: data.url });

    } catch (err) {
        console.error("Critical Failure:", err.message);
        return res.status(500).json({ error: 'System error', details: err.message });
    }
};