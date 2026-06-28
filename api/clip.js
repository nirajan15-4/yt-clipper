const cors = require('cors');

const corsMiddleware = cors({ methods: ['POST', 'OPTIONS'] });
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
}

module.exports = async (req, res) => {
    await runMiddleware(req, res, corsMiddleware);

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { url, startTime, endTime } = req.body;
    if (!url) return res.status(400).json({ error: 'URL missing' });

    try {
        console.log("Fetching stream for:", url);

        // Use a signal timeout to prevent Vercel from hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ url: url, vQuality: '720' }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        const data = await response.json();
        console.log("API Response Status:", response.status);

        if (!response.ok || !data.url) {
            return res.status(500).json({ error: 'API Error', details: data });
        }

        return res.status(200).json({ success: true, streamUrl: data.url });

    } catch (err) {
        console.error("Execution Exception:", err.message);
        return res.status(500).json({ error: 'Server Failure', details: err.message });
    }
};