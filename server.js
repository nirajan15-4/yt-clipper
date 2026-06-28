const express = require('express');
const cors = require('cors');
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ytDlpWrap = new YTDlpWrap();

app.post('/api/clip', async (req, res) => {
    const { url, startTime, endTime } = req.body;
    if (!url || !startTime || !endTime) return res.status(400).json({ error: 'Missing parameters' });

    const outputFilename = `clip-${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'downloads', outputFilename);

    const fs = require('fs');
    if (!fs.existsSync(path.join(__dirname, 'downloads'))) fs.mkdirSync(path.join(__dirname, 'downloads'));

    console.log(`🌐 Cloud Processing Ready: ${url} [${startTime} - ${endTime}]`);

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
                try { fs.unlinkSync(outputPath); } catch(e){}
            });
        } else {
            throw new Error('File validation check failed.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Extraction failed.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
