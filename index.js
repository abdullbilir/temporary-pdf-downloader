import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// DB setup
const adapter = new JSONFile('./db.json');
const db = new Low(adapter, { tokens: [] }); // Varsayılan veri buraya eklendi
await db.read();

// Statik klasör
app.use('/pdf', express.static(path.join(__dirname, 'uploads')));

// Token oluştur
app.get('/download', async (req, res) => {
  const token = uuidv4();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  db.data.tokens.push({
    token,
    createdAt: Date.now(),
    expiresAt,
    usedIPs: []
  });
  await db.write();

  res.json({ token, link: `/download/${token}` });
});

// İndirme linki
app.get('/download/:token', async (req, res) => {
  const token = req.params.token;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  await db.read();
  const record = db.data.tokens.find(t => t.token === token);

  if (!record) return res.status(404).send('Geçersiz bağlantı.');
  if (Date.now() > record.expiresAt) return res.status(410).send('Link süresi dolmuş.');

  if (record.usedIPs.includes(ip)) {
    return res.status(403).send('Bu cihaz zaten dosyayı indirdi.');
  }

  // IP’yi kaydet ve dosyayı gönder
  record.usedIPs.push(ip);
  await db.write();
  res.download(path.join(__dirname, 'uploads', 'kitap.pdf'));
});

app.listen(port, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${port}`);
});
