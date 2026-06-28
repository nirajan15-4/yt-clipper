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

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    await runMiddleware(req, res, corsMiddleware);

    const { url, startTime, endTime } = req.body;
    if (!url || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                vQuality: '720',
                isAudioOnly: false
            })
        });

        const responseData = await response.json();

        if (!response.ok || !responseData.url) {
            return res.status(500).json({ error: 'Stream extraction failed.', details: responseData });
        }

        return res.status(200).json({
            success: true,
            streamUrl: responseData.url
        });

    } catch (err) {
        return res.status(500).json({ error: 'Serverless execution failure.', details: err.toString() });
    }
}
