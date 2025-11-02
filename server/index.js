import express from 'express';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
import mime from 'mime';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change_me_now';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'files.json');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '[]', 'utf8');

app.use(cors({ origin: true }));
app.use(express.json());

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && token === ADMIN_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

async function readDB() {
  const data = await fsp.readFile(DB_PATH, 'utf8');
  return JSON.parse(data);
}
async function writeDB(list) {
  await fsp.writeFile(DB_PATH, JSON.stringify(list, null, 2), 'utf8');
}

app.post('/api/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const id = nanoid(10);
    const newName = id + '.pdf';
    await fsp.rename(req.file.path, path.join(UPLOAD_DIR, newName));

    const entry = {
      id,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    const list = await readDB();
    list.unshift(entry);
    await writeDB(list);

    res.json({ ok: true, file: entry });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/files', async (req, res) => {
  const list = await readDB();
  res.json(list);
});

app.get('/api/files/:id', async (req, res) => {
  const { id } = req.params;
  const list = await readDB();
  const item = list.find(f => f.id === id);
  if (!item) return res.status(404).send('Not found');

  const filePath = path.join(UPLOAD_DIR, `${id}.pdf`);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

  res.setHeader('Content-Type', mime.getType('pdf') || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${item.originalName.replace(/"/g, '')}"`);
  fs.createReadStream(filePath).pipe(res);
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on :${PORT}`));
