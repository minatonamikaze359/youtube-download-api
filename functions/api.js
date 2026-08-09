const express = require("express");
const serverless = require("serverless-http");
const ytdl = require("ytdl-core");
const cors = require("cors");

const app = express();
app.use(cors());

const router = express.Router();

// Root ping endpoint -> maps to /api/
router.get("/", (req, res) => {
    const ping = new Date();
    ping.setHours(ping.getHours() - 3);
    res.json({
        status: "Online",
        time: `${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`
    });
});

// Info endpoint -> maps to /api/info?url=...
router.get("/info", async (req, res) => {
    const { url } = req.query;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: "Invalid or missing URL" });
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        const title = videoDetails.title;
        const thumbnails = videoDetails.thumbnails;
        const thumbnail = thumbnails.length > 2 ? thumbnails[2].url : thumbnails[0]?.url;

        res.json({ title, thumbnail });
    } catch (error) {
        console.eror("Error fetching info:", error.message);
        res.status(500).json({ error: "Failed to fetch video information." });
    }
});

// MP4 endpoint -> maps to /api/mp4?url=...
router.get("/mp4", async (req, res) => {
    const { url } = req.query;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).send("Invalid or missing URL");
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoName = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, "");

        res.header(
            "Content-Disposition",
            `attachment; filename="${videoName}.mp4"`
        );

        const stream = ytdl(url, { quality: "highestvideo" });
        stream.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) res.status(500).send("Stream failed");
        });

        stream.pipe(res);
    } catch (error) {
        console.error("Error processing video:", error.message);
        if (!res.headersSent) res.status(500).send("Failed to process video.");
    }
});

// Hook router to express under '/api'
app.use("/api", router);

// Export serverless handler
exports.handler = serverless(app);
