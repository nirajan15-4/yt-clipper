const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const isCloud = process.env.PORT || false;
let ytDlpWrap;

if (isCloud) {
    console.log("☁️ Running in Cloud Environment Mode");
    ytDlpWrap = new YTDlpWrap('/opt/render/project/src/node_modules/yt-dlp-wrap/dist/yt-dlp');
} else {
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

    // ADDED CLOUD NETWORK BYPASS FLAGS HERE
    const args = [
        url,
        '--no-cache-dir',
        '--no-check-certificates',
        '--external-downloader', 'ffmpeg',
        '--external-downloader-args', `ffmpeg_i:-ss ${startTime} -to ${endTime}`,
        '--force-overwrites',
        '-f', 'b[ext=mp4]',
        '-o', outputPath
    ];

    try {
        // Set a 45-second timeout safeguard so the browser doesn't spin forever
        const downloadPromise = ytDlpWrap.execPromise(args);

        await Promise.race([
            downloadPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cloud stream timeout')), 45000))
        ]);

        if (fs.existsSync(outputPath)) {
            res.download(outputPath, outputFilename, (err) => {
                try { fs.unlinkSync(outputPath); } catch (e) { }
            });
        } else {
            throw new Error('File not created.');
        }
    } catch (error) {
        console.error("Pipeline Error details:", error);
        res.status(500).json({ error: 'Extraction failed.', details: error.toString() });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));