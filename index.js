const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 4032;

app.use(cors());

// Configure Multer for file upload
const upload = multer({
    dest: 'uploads/', // Temporary storage for uploaded files
});

// Route to handle MP4 upload and conversion
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }
    console.log('Uploaded file:', file);

    const inputFilePath = path.join(__dirname, file.path);
    const outputDir = path.join(__dirname, 'hls', path.parse(file.originalname).name);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilePath = path.join(outputDir, 'index.m3u8');

    // Convert MP4 to HLS using FFmpeg
    ffmpeg(inputFilePath)
        .outputOptions([
            '-profile:v baseline', // HLS compatibility
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10', // Segment duration
            '-hls_list_size 0',
            '-f hls',
        ])
        .output(outputFilePath)
        .on('end', () => {
            // Cleanup the uploaded MP4 file
            fs.unlinkSync(inputFilePath);

            res.status(200).send({
                message: 'HLS conversion complete',
                hlsUrl: `/hls/${path.parse(file.originalname).name}/index.m3u8`,
            });
        })
        .on('error', (err) => {
            console.error('Error during HLS conversion:', err);
            res.status(500).send('Error during HLS conversion.');
        })
        .run();
});

// Serve the HLS files
app.use('/hls', express.static(path.join(__dirname, 'hls')));

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
