const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/clip', async (req, res) => {
    const { url, startTime, endTime } = req.body;
    if (!url || !startTime || !endTime) return res.status(400).json({ error: 'Missing parameters' });

    console.log(`☁️ Cloud Processing via Cobalt Engine: ${url} [${startTime} - ${endTime}]`);

    const outputFilename = `clip-${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', outputFilename);

    if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
        fs.mkdirSync(path.join(__dirname, 'downloads'));
    }

    try {
        // Fetch the direct video stream URL using the Cobalt processing API
        const cobaltApiUrl = 'https://api.cobalt.tools/api/json';
        const fetchCmd = `curl -X POST -H "Content-Type: application/json" -H "Accept: application/json" -d '{"url":"${url}","vQuality":"720"}' ${cobaltApiUrl}`;

        exec(fetchCmd, (error, stdout, stderr) => {
            if (error) throw new Error('Failed to reach stream broker.');

            const responseData = JSON.parse(stdout);
            const directStreamUrl = responseData.url;

            if (!directStreamUrl) throw new Error('YouTube link parsing rejected.');

            // Use ffmpeg to cut the clip cleanly from the open network stream
            const ffmpegCmd = `ffmpeg -ss ${startTime} -to ${endTime} -i "${directStreamUrl}" -c:v libx264 -c:a aac -strict -2 -y ${outputPath}`;

            exec(ffmpegCmd, (ffError) => {
                if (ffError) {
                    console.error("FFmpeg error:", ffError);
                    return res.status(500).json({ error: 'Slicing failed.' });
                }

                if (fs.existsSync(outputPath)) {
                    res.download(outputPath, outputFilename, () => {
                        try { fs.unlinkSync(outputPath); } catch (e) { }
                    });
                }
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Extraction failed.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Production engine online on port ${PORT}`));