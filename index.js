const express = require("express");
const ytdl = require("ytdl-core"); // Consider switching to @distube/ytdl-core if this breaks
const cors = require("cors");

const app = express();
app.use(cors());

// Ping Route
app.get("/", (req, res) => {
    const ping = new Date();
    ping.setHours(ping.getHours() - 3);
    console.log(
        `Ping at: ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`
    );
    res.sendStatus(200);
});

// Info Route
app.get("/info", async (req, res) => {
    const { url } = req.query;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).send("Invalid or missing URL");
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        const title = videoDetails.title;
        // Safely fallback to the first available thumbnail if index 2 doesn't exist
        const thumbnails = videoDetails.thumbnails;
        const thumbnail = thumbnails.length > 2 ? thumbnails[2].url : thumbnails[0]?.url;

        res.send({ title, thumbnail });
    } catch (error) {
        console.error("Error fetching info:", error.message);
        res.status(500).send("Failed to fetch video information.");
    }
});

// MP4 Route
app.get("/mp4", async (req, res) => {
    const { url } = req.query;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).send("Invalid or missing URL");
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoName = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, ""); // Sanitize filename

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

app.listen(process.env.PORT || 3500, () => {
    console.log(`Server running on port ${process.env.PORT || 3500}`);
});
