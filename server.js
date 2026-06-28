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

    console.log(`🎬 Cloud Request Received: ${url} [${startTime} - ${endTime}]`);

    const outputFilename = `clip-${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', outputFilename);

    if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
        fs.mkdirSync(path.join(__dirname, 'downloads'));
    }

    try {
        // Native secure fetch request to bypass command-line injection/escaping bugs
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
            console.error("Cobalt API Engine Error response:", responseData);
            return res.status(500).json({ error: 'Stream extraction failed.', details: responseData });
        }

        const directStreamUrl = responseData.url;
        console.log("🔗 Direct stream URL extracted successfully. Commencing FFmpeg slice operation...");

        // Safely wrap the stream URL in double quotes to prevent shell execution errors
        const ffmpegCmd = `ffmpeg -ss ${startTime} -to ${endTime} -i "${directStreamUrl}" -c:v libx264 -c:a aac -strict -2 -y "${outputPath}"`;

        exec(ffmpegCmd, (ffError, stdout, stderr) => {
            if (ffError) {
                console.error("FFmpeg processing error context:", stderr);
                return res.status(500).json({ error: 'FFmpeg slicing failed.' });
            }

            if (fs.existsSync(outputPath)) {
                console.log("🚀 Slicing operation successful! Transporting file to client...");
                res.download(outputPath, outputFilename, () => {
                    try { fs.unlinkSync(outputPath); } catch (e) { }
                });
            } else {
                res.status(500).json({ error: 'File generation mismatch error.' });
            }
        });

    } catch (err) {
        console.error("Server Pipeline Exception:", err);
        res.status(500).json({ error: 'Server internal extraction failure.', details: err.toString() });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Production engine running on port ${PORT}`));