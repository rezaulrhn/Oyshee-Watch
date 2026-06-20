const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "videos.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

function readVideos() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}
function writeVideos(videos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2));
}

// ---- Multer setup: store with a random ID + original extension ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime", // .mov
  "video/x-matroska", // .mkv
];

const ALLOWED_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".mkv"];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB cap, adjust as needed
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.includes(file.mimetype) || ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed (mp4, webm, ogg, mov, mkv)."));
    }
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---- Upload endpoint ----
app.post("/api/upload", (req, res) => {
  upload.single("video")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No video file uploaded." });

    const title = (req.body.title || req.file.originalname).slice(0, 200);
    const id = path.parse(req.file.filename).name; // id without extension
    const videos = readVideos();

    const entry = {
      id,
      filename: req.file.filename,
      title,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    videos.unshift(entry);
    writeVideos(videos);

    res.json({ success: true, id, watchUrl: `/watch/${id}` });
  });
});

// ---- List all videos (for homepage gallery) ----
app.get("/api/videos", (req, res) => {
  res.json(readVideos());
});

// ---- Get single video metadata ----
app.get("/api/videos/:id", (req, res) => {
  const video = readVideos().find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found." });
  res.json(video);
});

// ---- Stream video with HTTP Range support (critical for playback/seeking) ----
app.get("/stream/:id", (req, res) => {
  const video = readVideos().find((v) => v.id === req.params.id);
  if (!video) return res.status(404).send("Video not found.");

  const filePath = path.join(UPLOAD_DIR, video.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("File missing on server.");

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": video.mimetype,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": video.mimetype,
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
});

// ---- Watch page (shareable link) ----
app.get("/watch/:id", (req, res) => {
  res.sendFile && null; // noop
  res.sendFile(path.join(__dirname, "public", "watch.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
