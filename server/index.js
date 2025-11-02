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
  dest: UPLOAD_DIR,                             // auto uses tmp filenames
  limits: { fileSize: 15 * 1024 * 1024 },       // 15MB
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      (path.extname(file.originalname).toLowerCase() === '.pdf');
    if (!isPdf) return cb(new Error('Only PDF files are allowed'));
    cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && token === ADMIN_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

async function readDB() {
  try {
    const buf = await fsp.readFile(DB_PATH);
    let txt = buf.toString('utf8');

    // strip BOM & control chars that sometimes sneak in on Windows
    txt = txt.replace(/^\uFEFF/, '').replace(/[\u0000-\u001F]+/g, '').trim();

    // if empty, treat as []
    if (txt.length === 0) {
      await writeDB([]);
      return [];
    }

    // handle the common mistake: file contains the literal string "[]"
    // (with quotes) or smart quotes
    if (/^["“”']\s*\[\s*]\s*["“”']$/.test(txt)) {
      txt = '[]';
    }

    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // file missing or invalid -> reinitialize
    await writeDB([]);
    return [];
  }
}
async function writeDB(list) {
  const txt = JSON.stringify(Array.isArray(list) ? list : [], null, 2);
  await fsp.writeFile(DB_PATH, txt, { encoding: 'utf8' });
}

app.post('/api/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const id = nanoid(10);
    const src = req.file.path;                      // temp file path from multer
    const dest = path.join(UPLOAD_DIR, id + '.pdf');

    // Extra: verify uploaded tmp file actually exists
    if (!fs.existsSync(src)) {
      console.error('Uploaded temp file not found:', src);
      return res.status(500).json({ error: 'Temp file missing' });
    }

    await fsp.rename(src, dest);

    const entry = {
      id,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    const list = await readDB();        // if files.json got corrupted, this throws
    list.unshift(entry);
    await writeDB(list);

    res.json({ ok: true, file: entry });
  } catch (e) {
    console.error('UPLOAD_ERROR:', e);
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
