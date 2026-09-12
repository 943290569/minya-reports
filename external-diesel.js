const path = require("path");

module.exports = function installExternalDiesel(app, { db, requireAuth, requireRole, audit, writeAutomaticBackup }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_diesel_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      quantity_liters REAL NOT NULL,
      receipt_number TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_external_diesel_source_date ON external_diesel_entries(source_name, entry_date);
    CREATE INDEX IF NOT EXISTS idx_external_diesel_date ON external_diesel_entries(entry_date);
  `);

  const cleanText = (value, maximum) => String(value ?? "").trim().slice(0, maximum);
  const validDate = (value) => {
    const text = String(value || "");
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 2000 && year <= 2100
      && date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  };

  function normalizeEntry(input = {}) {
    const entry = {
      source_name: cleanText(input.source_name, 120),
      entry_date: cleanText(input.entry_date, 10),
      driver_name: cleanText(input.driver_name, 120),
      vehicle_number: cleanText(input.vehicle_number, 40),
      quantity_liters: Number(input.quantity_liters),
      receipt_number: cleanText(input.receipt_number, 50),
      notes: cleanText(input.notes, 500)
    };
    const errors = [];
    if (!entry.source_name) errors.push("المصدر الخارجي مطلوب");
    if (!validDate(entry.entry_date)) errors.push("تاريخ التعبئة غير صالح");
    if (!entry.driver_name) errors.push("اسم السائق مطلوب");
    if (!entry.vehicle_number) errors.push("رقم المركبة مطلوب");
    if (!Number.isFinite(entry.quantity_liters) || entry.quantity_liters <= 0 || entry.quantity_liters > 50000) errors.push("كمية السولار يجب أن تكون أكبر من صفر");
    entry.quantity_liters = Number.isFinite(entry.quantity_liters) ? Number(entry.quantity_liters.toFixed(2)) : 0;
    return { entry, errors };
  }

  function duplicateReceipt(entry, excludedId = 0) {
    if (!entry.receipt_number) return null;
    return db.prepare(`SELECT id FROM external_diesel_entries WHERE source_name=? AND receipt_number=? AND id<>? LIMIT 1`)
      .get(entry.source_name, entry.receipt_number, Number(excludedId || 0));
  }

  app.get("/external-diesel", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "external-diesel.html"));
  });

  app.get("/api/external-diesel/sources", requireAuth, (req, res) => {
    const sources = db.prepare(`
      SELECT source_name, COUNT(*) AS entries_count, COALESCE(SUM(quantity_liters),0) AS total_liters, MAX(entry_date) AS latest_date
      FROM external_diesel_entries
      GROUP BY source_name
      ORDER BY MAX(entry_date) DESC, source_name
    `).all();
    res.json({ ok: true, sources });
  });

  app.get("/api/external-diesel", requireAuth, (req, res) => {
    try {
      const source = cleanText(req.query.source, 120);
      const month = cleanText(req.query.month, 7);
      if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ ok: false, message: "الشهر والسنة غير صالحين" });
      let sql = `SELECT e.*,u.display_name AS created_by_name FROM external_diesel_entries e LEFT JOIN users u ON u.id=e.created_by WHERE 1=1`;
      const params = [];
      if (source) { sql += ` AND e.source_name=?`; params.push(source); }
      if (month) { sql += ` AND e.entry_date LIKE ?`; params.push(`${month}-%`); }
      sql += ` ORDER BY e.entry_date ASC,e.id ASC`;
      const entries = db.prepare(sql).all(...params);
      const daily = new Map();
      entries.forEach((entry) => daily.set(entry.entry_date, Number(daily.get(entry.entry_date) || 0) + Number(entry.quantity_liters || 0)));
      const totalLiters = entries.reduce((sum, entry) => sum + Number(entry.quantity_liters || 0), 0);
      res.json({
        ok: true,
        entries,
        summary: {
          entries_count: entries.length,
          days_count: daily.size,
          total_liters: Number(totalLiters.toFixed(2)),
          daily_average: daily.size ? Number((totalLiters / daily.size).toFixed(2)) : 0
        },
        daily_totals: [...daily].map(([entry_date, quantity_liters]) => ({ entry_date, quantity_liters: Number(quantity_liters.toFixed(2)) }))
      });
    } catch (error) {
      res.status(500).json({ ok: false, message: "تعذر تحميل كشف السولار الخارجي", error: error.message });
    }
  });

  app.post("/api/external-diesel", requireRole("admin", "editor"), (req, res) => {
    try {
      const { entry, errors } = normalizeEntry(req.body);
      if (errors.length) return res.status(400).json({ ok: false, message: errors[0], errors });
      if (duplicateReceipt(entry)) return res.status(409).json({ ok: false, message: "رقم الوصل مسجل مسبقاً لهذا المصدر" });
      const result = db.prepare(`
        INSERT INTO external_diesel_entries (source_name,entry_date,driver_name,vehicle_number,quantity_liters,receipt_number,notes,created_by)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(entry.source_name, entry.entry_date, entry.driver_name, entry.vehicle_number, entry.quantity_liters, entry.receipt_number, entry.notes, req.user.id);
      audit(req.user, "CREATE_EXTERNAL_DIESEL", "external_diesel", result.lastInsertRowid, `${entry.source_name} | ${entry.entry_date} | ${entry.quantity_liters} لتر`);
      writeAutomaticBackup("external-diesel-create");
      res.json({ ok: true, id: result.lastInsertRowid, message: "تم حفظ تعبئة السولار الخارجي" });
    } catch (error) {
      res.status(500).json({ ok: false, message: "فشل حفظ تعبئة السولار الخارجي", error: error.message });
    }
  });

  app.post("/api/external-diesel/import", requireRole("admin", "editor"), (req, res) => {
    try {
      const rows = Array.isArray(req.body?.entries) ? req.body.entries.slice(0, 1000) : [];
      if (!rows.length) return res.status(400).json({ ok: false, message: "لا توجد صفوف صالحة للاستيراد" });
      let created = 0;
      let skipped = 0;
      const errors = [];
      const insert = db.prepare(`
        INSERT INTO external_diesel_entries (source_name,entry_date,driver_name,vehicle_number,quantity_liters,receipt_number,notes,created_by)
        VALUES (?,?,?,?,?,?,?,?)
      `);
      db.transaction(() => {
        rows.forEach((row, index) => {
          const normalized = normalizeEntry(row);
          if (normalized.errors.length) {
            errors.push(`الصف ${index + 1}: ${normalized.errors.join("، ")}`);
            return;
          }
          const entry = normalized.entry;
          if (duplicateReceipt(entry)) { skipped += 1; return; }
          insert.run(entry.source_name, entry.entry_date, entry.driver_name, entry.vehicle_number, entry.quantity_liters, entry.receipt_number, entry.notes, req.user.id);
          created += 1;
        });
      })();
      if (created) {
        audit(req.user, "IMPORT_EXTERNAL_DIESEL", "external_diesel", "batch", `created:${created} | skipped:${skipped} | invalid:${errors.length}`);
        writeAutomaticBackup("external-diesel-import");
      }
      res.json({ ok: true, created, skipped, invalid: errors.length, errors: errors.slice(0, 20), message: `تم استيراد ${created} سجل` });
    } catch (error) {
      res.status(500).json({ ok: false, message: "فشل استيراد كشف السولار الخارجي", error: error.message });
    }
  });

  app.put("/api/external-diesel/:id", requireRole("admin", "editor"), (req, res) => {
    try {
      const id = Number(req.params.id);
      const current = db.prepare(`SELECT id FROM external_diesel_entries WHERE id=?`).get(id);
      if (!current) return res.status(404).json({ ok: false, message: "سجل السولار غير موجود" });
      const { entry, errors } = normalizeEntry(req.body);
      if (errors.length) return res.status(400).json({ ok: false, message: errors[0], errors });
      if (duplicateReceipt(entry, id)) return res.status(409).json({ ok: false, message: "رقم الوصل مسجل مسبقاً لهذا المصدر" });
      db.prepare(`
        UPDATE external_diesel_entries SET source_name=?,entry_date=?,driver_name=?,vehicle_number=?,quantity_liters=?,receipt_number=?,notes=?,updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(entry.source_name, entry.entry_date, entry.driver_name, entry.vehicle_number, entry.quantity_liters, entry.receipt_number, entry.notes, id);
      audit(req.user, "UPDATE_EXTERNAL_DIESEL", "external_diesel", id, `${entry.source_name} | ${entry.entry_date}`);
      writeAutomaticBackup("external-diesel-update");
      res.json({ ok: true, message: "تم تعديل سجل السولار الخارجي" });
    } catch (error) {
      res.status(500).json({ ok: false, message: "فشل تعديل سجل السولار الخارجي", error: error.message });
    }
  });

  app.delete("/api/external-diesel/:id", requireRole("admin"), (req, res) => {
    try {
      const id = Number(req.params.id);
      const current = db.prepare(`SELECT * FROM external_diesel_entries WHERE id=?`).get(id);
      if (!current) return res.status(404).json({ ok: false, message: "سجل السولار غير موجود" });
      writeAutomaticBackup("pre-external-diesel-delete", true);
      db.prepare(`DELETE FROM external_diesel_entries WHERE id=?`).run(id);
      audit(req.user, "DELETE_EXTERNAL_DIESEL", "external_diesel", id, `${current.source_name} | ${current.entry_date}`);
      res.json({ ok: true, message: "تم حذف سجل السولار الخارجي" });
    } catch (error) {
      res.status(500).json({ ok: false, message: "فشل حذف سجل السولار الخارجي", error: error.message });
    }
  });
};
