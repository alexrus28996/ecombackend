import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { config } from '../config/index.js';

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDirSync(config.UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_/]/g, '_');
    const ts = Date.now();
    const ext = path.extname(safe) || '';
    const base = path.basename(safe, ext);
    cb(null, `${base}-${ts}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image uploads allowed'));
  cb(null, true);
}

export const uploadImage = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

