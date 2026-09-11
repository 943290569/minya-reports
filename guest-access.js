const crypto = require('crypto');

module.exports = function installGuestAccess(app, { db, requireRole, audit, COOKIE_SECURE }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_access_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT DEFAULT '',
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 0,
      use_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_guest_access_expires ON guest_access_links(expires_at);
  `);

  const hash = value => crypto.createHash('sha256').update(String(value || '')).digest('hex');
  const newToken = () => crypto.randomBytes(32).toString('hex');

  function ensureGuestViewer() {
    const username = '__guest_link_viewer';
    let user = db.prepare(`SELECT * FROM users WHERE username=?`).get(username);
    if (user) {
      if (user.role !== 'viewer' || !user.is_active) {
        db.prepare(`UPDATE users SET role='viewer',is_active=1,display_name='زائر عبر رابط' WHERE id=?`).run(user.id);
        user = db.prepare(`SELECT * FROM users WHERE id=?`).get(user.id);
      }
      return user;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync(crypto.randomBytes(32), salt, 64).toString('hex');
    const result = db.prepare(`INSERT INTO users (username,display_name,email,mobile,password_hash,salt,role,is_active) VALUES (?,?,?,?,?,?, 'viewer',1)`).run(username,'زائر عبر رابط','','',passwordHash,salt);
    return db.prepare(`SELECT * FROM users WHERE id=?`).get(result.lastInsertRowid);
  }

  app.get('/api/guest-links', requireRole('admin'), (req, res) => {
    db.prepare(`UPDATE guest_access_links SET is_active=0 WHERE is_active=1 AND expires_at<=?`).run(new Date().toISOString());
    const links = db.prepare(`SELECT id,label,expires_at,max_uses,use_count,is_active,created_at,last_used_at FROM guest_access_links ORDER BY id DESC LIMIT 100`).all();
    res.json({ ok: true, links });
  });

  app.post('/api/guest-links', requireRole('admin'), (req, res) => {
    const hours = Math.min(24 * 30, Math.max(1, Number.parseInt(req.body?.hours, 10) || 24));
    const maxUses = Math.min(1000, Math.max(0, Number.parseInt(req.body?.max_uses, 10) || 0));
    const label = String(req.body?.label || 'رابط قارئ').trim().slice(0, 80) || 'رابط قارئ';
    const token = newToken();
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`INSERT INTO guest_access_links (label,token_hash,expires_at,max_uses,created_by) VALUES (?,?,?,?,?)`).run(label, hash(token), expiresAt, maxUses, req.user.id);
    audit(req.user, 'CREATE_GUEST_LINK', 'guest_link', result.lastInsertRowid, `${label} | ${hours}h | max:${maxUses || 'unlimited'}`);
    res.json({ ok: true, id: result.lastInsertRowid, token, expires_at: expiresAt, max_uses: maxUses });
  });

  app.delete('/api/guest-links/:id', requireRole('admin'), (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare(`SELECT id,label FROM guest_access_links WHERE id=?`).get(id);
    if (!row) return res.status(404).json({ ok: false, message: 'الرابط غير موجود' });
    db.prepare(`UPDATE guest_access_links SET is_active=0 WHERE id=?`).run(id);
    audit(req.user, 'REVOKE_GUEST_LINK', 'guest_link', id, row.label || '');
    res.json({ ok: true, message: 'تم إلغاء الرابط' });
  });

  app.get('/access', (req, res) => {
    try {
      const token = String(req.query.token || '').trim();
      if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).send('رابط الدخول غير صالح');
      const row = db.prepare(`SELECT * FROM guest_access_links WHERE token_hash=?`).get(hash(token));
      if (!row || !row.is_active || new Date(row.expires_at).getTime() <= Date.now()) return res.status(410).send('انتهت صلاحية رابط الدخول أو تم إلغاؤه');
      if (Number(row.max_uses || 0) > 0 && Number(row.use_count || 0) >= Number(row.max_uses)) return res.status(410).send('تم استهلاك رابط الدخول');
      const guest = ensureGuestViewer();
      const sessionToken = newToken();
      const expiresAt = new Date(Math.min(new Date(row.expires_at).getTime(), Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString();
      db.transaction(() => {
        db.prepare(`UPDATE guest_access_links SET use_count=use_count+1,last_used_at=CURRENT_TIMESTAMP WHERE id=?`).run(row.id);
        db.prepare(`INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (?,?,?)`).run(guest.id, hash(sessionToken), expiresAt);
      })();
      audit(guest, 'GUEST_LINK_LOGIN', 'guest_link', row.id, row.label || '');
      const maxAge = Math.max(60, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      res.setHeader('Set-Cookie', `minya_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`);
      res.setHeader('Cache-Control', 'no-store');
      res.redirect(302, '/');
    } catch (error) {
      console.error('Guest access failed', error);
      res.status(500).send('تعذر فتح رابط الدخول');
    }
  });

  const requireAnyUser = requireRole('admin','editor','viewer');
  require('./maintenance-incidents')(app,{db,requireAuth:requireAnyUser,requireRole,audit});
  require('./incident-files')(app,{db,requireAuth:requireAnyUser,requireRole,audit});
  require('./fleet-environment')(app,{db,requireAuth:requireAnyUser,requireRole,audit});
};
