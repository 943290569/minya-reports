const crypto = require('crypto');

module.exports = function installCloudFiles(app, { db, requireAuth, requireRole, audit }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cloud_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(parent_id,name),
      FOREIGN KEY(parent_id) REFERENCES cloud_folders(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS cloud_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      object_key TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      mime_type TEXT DEFAULT 'application/octet-stream',
      size_bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY(folder_id) REFERENCES cloud_folders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_folders_parent ON cloud_folders(parent_id,name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_folders_root_name ON cloud_folders(name) WHERE parent_id IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_folders_child_name ON cloud_folders(parent_id,name) WHERE parent_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_cloud_files_folder ON cloud_files(folder_id,status,created_at);
  `);

  const config = () => ({
    accountId: String(process.env.R2_ACCOUNT_ID || '').trim(),
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    bucket: String(process.env.R2_BUCKET || '').trim()
  });
  const configured = c => Boolean(c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket);
  const cleanName = value => String(value || '').trim().replace(/[\\/\0-\x1f\x7f]/g, '_').slice(0, 220);
  const folderExists = id => id == null || db.prepare('SELECT id FROM cloud_folders WHERE id=?').get(Number(id));
  const encodePath = value => String(value).split('/').map(encodeURIComponent).join('/');
  const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
  const hmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value).digest(encoding);

  function signedUrl(method, objectKey, expiresSeconds = 900) {
    const c = config();
    if (!configured(c)) throw new Error('لم يتم إعداد Cloudflare R2 بعد');
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const region = 'auto', service = 's3';
    const host = `${c.accountId}.r2.cloudflarestorage.com`;
    const uri = `/${encodeURIComponent(c.bucket)}/${encodePath(objectKey)}`;
    const scope = `${date}/${region}/${service}/aws4_request`;
    const params = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${c.accessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(Math.min(3600, Math.max(60, expiresSeconds))),
      'X-Amz-SignedHeaders': 'host'
    };
    const query = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const canonical = [method, uri, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
    const kDate = hmac(`AWS4${c.secretAccessKey}`, date);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = hmac(kSigning, stringToSign, 'hex');
    return `https://${host}${uri}?${query}&X-Amz-Signature=${signature}`;
  }

  app.get('/api/cloud-files/status', requireAuth, (req, res) => {
    const c = config();
    const stats = db.prepare("SELECT COUNT(*) file_count,COALESCE(SUM(size_bytes),0) total_bytes FROM cloud_files WHERE status='ready'").get();
    res.json({ ok: true, configured: configured(c), bucket: configured(c) ? c.bucket : '', ...stats, max_file_bytes: 1024 * 1024 * 1024 });
  });

  app.get('/api/cloud-files/list', requireAuth, (req, res) => {
    const folderId = req.query.folder_id ? Number(req.query.folder_id) : null;
    if (!folderExists(folderId)) return res.status(404).json({ ok: false, message: 'المجلد غير موجود' });
    const folders = folderId == null
      ? db.prepare('SELECT id,parent_id,name,created_at FROM cloud_folders WHERE parent_id IS NULL ORDER BY name').all()
      : db.prepare('SELECT id,parent_id,name,created_at FROM cloud_folders WHERE parent_id=? ORDER BY name').all(folderId);
    const files = folderId == null
      ? db.prepare("SELECT id,folder_id,original_name,mime_type,size_bytes,created_at FROM cloud_files WHERE folder_id IS NULL AND status='ready' ORDER BY created_at DESC").all()
      : db.prepare("SELECT id,folder_id,original_name,mime_type,size_bytes,created_at FROM cloud_files WHERE folder_id=? AND status='ready' ORDER BY created_at DESC").all(folderId);
    const current = folderId == null ? null : db.prepare('SELECT id,parent_id,name FROM cloud_folders WHERE id=?').get(folderId);
    res.json({ ok: true, current, folders, files });
  });

  app.post('/api/cloud-files/folders', requireRole('admin', 'editor'), (req, res) => {
    const parentId = req.body?.parent_id ? Number(req.body.parent_id) : null;
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ ok: false, message: 'اسم المجلد مطلوب' });
    if (!folderExists(parentId)) return res.status(404).json({ ok: false, message: 'المجلد الأب غير موجود' });
    try {
      const result = db.prepare('INSERT INTO cloud_folders(parent_id,name,created_by) VALUES(?,?,?)').run(parentId, name, req.user.id);
      audit(req.user, 'CREATE_CLOUD_FOLDER', 'cloud_folder', result.lastInsertRowid, name);
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) return res.status(409).json({ ok: false, message: 'يوجد مجلد بالاسم نفسه' });
      throw error;
    }
  });

  app.post('/api/cloud-files/upload-url', requireRole('admin', 'editor'), (req, res) => {
    try {
      const c = config();
      if (!configured(c)) return res.status(503).json({ ok: false, message: 'لم يتم ربط Cloudflare R2 بعد' });
      const folderId = req.body?.folder_id ? Number(req.body.folder_id) : null;
      const name = cleanName(req.body?.name);
      const size = Number(req.body?.size_bytes || 0);
      const requestedMime = String(req.body?.mime_type || 'application/octet-stream').slice(0, 120);
      const mime = /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(requestedMime) ? requestedMime : 'application/octet-stream';
      if (!folderExists(folderId)) return res.status(404).json({ ok: false, message: 'المجلد غير موجود' });
      if (!name || !Number.isSafeInteger(size) || size <= 0) return res.status(400).json({ ok: false, message: 'بيانات الملف غير صالحة' });
      if (size > 1024 * 1024 * 1024) return res.status(413).json({ ok: false, message: 'الحد الأقصى للملف 1GB' });
      const objectKey = `files/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}`;
      const result = db.prepare('INSERT INTO cloud_files(folder_id,object_key,original_name,mime_type,size_bytes,created_by) VALUES(?,?,?,?,?,?)').run(folderId, objectKey, name, mime, size, req.user.id);
      res.json({ ok: true, id: result.lastInsertRowid, upload_url: signedUrl('PUT', objectKey, 1800), expires_in: 1800 });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message || 'تعذر تجهيز رفع الملف' });
    }
  });

  app.post('/api/cloud-files/:id/complete', requireRole('admin', 'editor'), (req, res) => {
    const id = Number(req.params.id), file = db.prepare('SELECT * FROM cloud_files WHERE id=?').get(id);
    if (!file) return res.status(404).json({ ok: false, message: 'الملف غير موجود' });
    db.prepare("UPDATE cloud_files SET status='ready',completed_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    audit(req.user, 'UPLOAD_CLOUD_FILE', 'cloud_file', id, `${file.original_name}:${file.size_bytes}`);
    res.json({ ok: true });
  });

  app.get('/api/cloud-files/:id/download', requireAuth, (req, res) => {
    const file = db.prepare("SELECT * FROM cloud_files WHERE id=? AND status='ready'").get(Number(req.params.id));
    if (!file) return res.status(404).json({ ok: false, message: 'الملف غير موجود' });
    try { res.redirect(302, signedUrl('GET', file.object_key, 300)); }
    catch (error) { res.status(503).json({ ok: false, message: error.message }); }
  });

  app.delete('/api/cloud-files/:id', requireRole('admin'), async (req, res) => {
    const id = Number(req.params.id), file = db.prepare('SELECT * FROM cloud_files WHERE id=?').get(id);
    if (!file) return res.status(404).json({ ok: false, message: 'الملف غير موجود' });
    try {
      const response = await fetch(signedUrl('DELETE', file.object_key, 300), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error(`R2 HTTP ${response.status}`);
      db.prepare('DELETE FROM cloud_files WHERE id=?').run(id);
      audit(req.user, 'DELETE_CLOUD_FILE', 'cloud_file', id, file.original_name);
      res.json({ ok: true });
    } catch (error) { res.status(502).json({ ok: false, message: 'تعذر حذف الملف من التخزين' }); }
  });
};
