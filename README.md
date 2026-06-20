# Oyshee Watch — upload a video, share a link

A minimal working website: upload a video file, get a shareable link, anyone
who opens that link can stream and watch it in their browser (no download,
no account).

## What's inside

- `server.js` — Express backend. Handles uploads, stores video metadata in
  `videos.json`, and streams video files with HTTP Range support (so people
  can seek/scrub instead of waiting for a full download).
- `public/index.html` — Homepage: upload form + gallery of uploaded videos.
- `public/watch.html` — The shareable watch page with the video player.
- `uploads/` — Where uploaded video files are stored on disk.
- `videos.json` — Simple JSON "database" of video metadata (title, id, size, etc).

## Run it locally

You need [Node.js](https://nodejs.org) installed (version 18+).

```bash
npm install
node server.js
```

Then open **http://localhost:3000** in your browser. Upload a video, and
you'll get a link like `http://localhost:3000/watch/abc123`. Anyone on the
same network can use that link if you replace `localhost` with your
computer's local IP — but for a link that works for *anyone, anywhere*,
deploy it (next section).

## Put it online for free (so the link works for anyone)

Pick one — both have free tiers and take about 5 minutes:

### Option A: Render.com
1. Push this folder to a GitHub repo.
2. Go to render.com → New → Web Service → connect your repo.
3. Build command: `npm install`
4. Start command: `node server.js`
5. Deploy. You'll get a public URL like `https://your-app.onrender.com`.

### Option B: Railway.app
1. Push this folder to a GitHub repo.
2. Go to railway.app → New Project → Deploy from GitHub repo.
3. Railway auto-detects Node.js and runs `npm install` + `npm start`.
4. Deploy. You'll get a public URL.

Once deployed, your homepage and watch links become real public URLs, e.g.
`https://your-app.onrender.com/watch/abc123` — share that with anyone.

## Important limits to know about (this is a practice/demo app)

- **Storage is local disk.** On Render/Railway's free tier, disk storage is
  *not persistent* across redeploys/restarts — uploaded videos can disappear
  when the service restarts. Fine for practice/demo; for anything real,
  swap local storage for a cloud bucket (e.g. AWS S3, Cloudflare R2).
- **No authentication.** Anyone with the homepage URL can upload. Anyone with
  a watch link can watch. There's no password protection — don't put
  anything sensitive on it.
- **10GB upload limit** is set in `server.js` (`limits: { fileSize: ... }`) —
  adjust if you need bigger files, but note free hosting tiers often cap
  request size too.
- **No transcoding.** Videos stream in whatever format you uploaded. Most
  browsers play MP4/WebM natively; very old codecs inside a `.mov`/`.mkv`
  container might not play in every browser.

## How the streaming actually works

The `/stream/:id` route checks for an HTTP `Range` header (which browsers
send automatically when you seek in a video player) and responds with a
`206 Partial Content` status plus just the requested byte range. That's
the difference between "stream and seek instantly" and "wait for the whole
file to download first."
