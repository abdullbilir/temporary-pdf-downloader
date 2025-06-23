import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// DB setup
const adapter = new JSONFile('./db.json');
const db = new Low(adapter);

await db.read().catch(() => {
  db.data = { downloadedIPs: [] };
});
db.data ||= { downloadedIPs: [] };

// PDF indirme endpoint'i
app.get('/download', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  await db.read();
  const alreadyDownloaded = db.data.downloadedIPs.includes(ip);

  if (alreadyDownloaded) {
    return res.status(403).send('Bu cihaz zaten dosyayı indirdi.');
  }

  db.data.downloadedIPs.push(ip);
  await db.write();

  const filePath = path.join(__dirname, 'uploads', 'kitap.pdf');
  res.download(filePath);
});

app.listen(port, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${port}`);
});
