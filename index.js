const express = require("express");
const mysql = require("mysql2");
const { Readable } = require("stream"); 
const fs = require('fs')
const path = require('path')

const app = express();
app.use(express.json({ limit: "1000mb" }));

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



app.post("/api/fileUpload", async (req, res) => {
    try {
        const { fileData, fileName, fileType } = req.body;    
        const query = 'INSERT INTO file_storage (filename, filetype, filedata) VALUES (?, ?, ?)';

        const [results] = await db.promise().query(query, [fileName, fileType, Buffer.from(fileData, 'base64')]);


        // Check if the query was successful
        if (results.affectedRows > 0) {
            // Query was successful, send a response
            res.status(201).json({
                message: 'File uploaded successfully',
                fileId: results.insertId,
                affectedRows: results.affectedRows
            });
        } else {
            // Query did not affect any rows, possibly a failure
            res.status(400).json({
                message: 'File upload failed',
                error: 'No rows affected'
            });
        }

    } catch (error) {
        console.log(error);
    }
})

// Endpoint to download a file
app.get("/api/fileDownload/:id", async (req, res) => {
    try {
        const fileId = req.params.id;
        const query = "SELECT filename, filetype, filedata FROM file_storage WHERE id = ?";
        const [resuts] = await db.promise().query(query, [fileId]);

        if (resuts.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        const file = resuts[0];
        // Set the headers to indicate file type and prompt download
        res.setHeader("Content-Type", file.filetype);
        res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);

        // Create a readable stream from the file data buffer
        const fileStream = new Readable();
        fileStream._read = () => {}; // No-op
        fileStream.push(file.filedata);
        fileStream.push(null);

        // Pipe the file stream to the response
        fileStream.pipe(res);
    } catch (error) {
        console.error("Error downloading file:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Function to insert a file into the database
async function insertFile(filePath) {
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileType = path.extname(filePath).slice(1);

    const res = await fetch('http://localhost:3000/api/fileUpload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileData, fileName, fileType })
    });

    const data = await res.json();
    console.log(data);
}
// insertFile('tsetup-x64.5.3.1.exe');

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
