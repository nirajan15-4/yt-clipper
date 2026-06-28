const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SMART SWITCH: Automatically detects if it's running online (Linux) or local (Windows)
const isCloud = process.env.PORT || false;
let ytDlpWrap;

if (isCloud) {
    // Cloud Render Linux Environment configuration
    console.log("☁️ Running in Cloud Environment Mode");
    ytDlpWrap = new YTDlpWrap('/opt/render/project/src/node_modules/yt-dlp-wrap/dist/yt-dlp');
} else {
    // Local Windows Desktop configuration
    console.log("💻 Running in Local Desktop Mode");
    ytDlpWrap = new YTDlpWrap(path.join(__dirname, 'yt-dlp.exe'));
}

app.post('/api/clip', async (req, res) => {
    const { url, startTime, endTime } = req.body;
    if (!url || !startTime || !endTime) return res.status(400).json({ error: 'Missing parameters' });

    const outputFilename = `clip-${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', outputFilename);

    if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
        fs.mkdirSync(path.join(__dirname, 'downloads'));
    }

    console.log(`🎬 Processing Request: ${url} [${startTime} - ${endTime}]`);

    const args = [
        url,
        '--external-downloader', 'ffmpeg',
        '--external-downloader-args', `ffmpeg_i:-ss ${startTime} -to ${endTime}`,
        '--force-overwrites',
        '-f', 'b[ext=mp4]',
        '-o', outputPath
    ];

    try {
        await ytDlpWrap.execPromise(args);
        if (fs.existsSync(outputPath)) {
            res.download(outputPath, outputFilename, (err) => {
                try { fs.unlinkSync(outputPath); } catch (e) { }
            });
        } else {
            throw new Error('File execution mismatch - output empty.');
        }
    } catch (error) {
        console.error("Pipeline Error details:", error);
        res.status(500).json({ error: 'Extraction failed.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));