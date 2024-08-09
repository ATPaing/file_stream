const express = require("express");
const mysql = require("mysql2");
const { Readable } = require("stream"); 

const app = express();

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "abc@123",
    database: "test",
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log("Connected to database");
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/video", async (req, res) => {
    try {
        const query = `SELECT videoBase64 FROM video_storage WHERE id = ?`;

        const [videos] = await db.promise().query(query, [1]);

        if (videos.length === 0) {
            res.status(404).send("No video found");
        }

        const videoBase64 = videos[0].videoBase64;
        const videoBuffer = Buffer.from(videoBase64, "base64");

        const range = req.headers.range;

        if (!range) {
            res.status(400).send("Requires Range header");
        }

        const videoSize = videoBuffer.length;

        const chunkSize = 10 ** 6;
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + chunkSize, videoSize - 1);
        const contentLength = end - start + 1;
        const headers = {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": contentLength,
            "Content-Type": "video/mp4",
        };
        res.writeHead(206, headers);
        // Create a readable stream from the video buffer
        const videoStream = new Readable({
            read() {
                this.push(videoBuffer.slice(start, end + 1));
                this.push(null); // Signal the end of the stream
            },
        });

        // Pipe the video stream to the response
        videoStream.pipe(res);
    } catch (error) {
        console.log(error);
    }
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
