const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = 5001;

const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL UNIQUE,
    report_no TEXT NOT NULL UNIQUE,
    weather TEXT DEFAULT '',
    temperature REAL DEFAULT 0,
    start_time TEXT DEFAULT '04:00',
    end_time TEXT DEFAULT '19:00',
    total_trucks INTEGER DEFAULT 0,
    total_waste_tons REAL DEFAULT 0,
    total_diesel REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS crews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    crew_name TEXT NOT NULL,
    crew_count INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id)
      REFERENCES daily_reports(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    operation_name TEXT NOT NULL,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    vehicle_count REAL DEFAULT 0,
    quantity REAL DEFAULT 0,
    unit TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id)
      REFERENCES daily_reports(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transfer_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    station_name TEXT NOT NULL,
    truck_count INTEGER DEFAULT 0,
    waste_tons REAL DEFAULT 0,
    unit TEXT DEFAULT 'طن',
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id)
      REFERENCES daily_reports(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    equipment_name TEXT NOT NULL,
    operating_status TEXT DEFAULT 'يعمل',
    status_description TEXT DEFAULT '',
    working_hours REAL DEFAULT 0,
    diesel_liters REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id)
      REFERENCES daily_reports(id)
      ON DELETE CASCADE
  );
`);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));

function generateReportNo(reportDate) {
  return `MINYA-${reportDate}`;
}

function insertChildren(reportId, crews, operations, stations, equipment) {
  const crewInsert = db.prepare(`
    INSERT INTO crews
    (
      report_id,
      crew_name,
      crew_count,
      notes
    )
    VALUES (?, ?, ?, ?)
  `);

  for (const crew of crews) {
    crewInsert.run(
      reportId,
      crew.crew_name || "",
      Number(crew.crew_count || 0),
      crew.notes || ""
    );
  }

  const operationInsert = db.prepare(`
    INSERT INTO operations
    (
      report_id,
      operation_name,
      start_time,
      end_time,
      vehicle_count,
      quantity,
      unit,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const operation of operations) {
    operationInsert.run(
      reportId,
      operation.operation_name || "",
      operation.start_time || "",
      operation.end_time || "",
      Number(operation.vehicle_count || 0),
      Number(operation.quantity || 0),
      operation.unit || "",
      operation.notes || ""
    );
  }

  const stationInsert = db.prepare(`
    INSERT INTO transfer_stations
    (
      report_id,
      station_name,
      truck_count,
      waste_tons,
      unit,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const station of stations) {
    stationInsert.run(
      reportId,
      station.station_name || "",
      Number(station.truck_count || 0),
      Number(station.waste_tons || 0),
      station.unit || "طن",
      station.notes || ""
    );
  }

  const equipmentInsert = db.prepare(`
    INSERT INTO equipment
    (
      report_id,
      equipment_name,
      operating_status,
      status_description,
      working_hours,
      diesel_liters,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of equipment) {
    equipmentInsert.run(
      reportId,
      item.equipment_name || "",
      item.operating_status || "",
      item.status_description || "",
      Number(item.working_hours || 0),
      Number(item.diesel_liters || 0),
      item.notes || ""
    );
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    system: "Minya Landfill System V2",
    database: "SQLite",
    version: "2.0.0",
  });
});

app.get("/api/reports", (req, res) => {
  try {
    const reports = db
      .prepare(`
        SELECT *
        FROM daily_reports
        ORDER BY report_date DESC
      `)
      .all();

    res.json({
      ok: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "فشل تحميل التقارير",
      error: error.message,
    });
  }
});

app.get("/api/reports/:id", (req, res) => {
  try {
    const reportId = Number(req.params.id);

    const report = db
      .prepare(`
        SELECT *
        FROM daily_reports
        WHERE id = ?
      `)
      .get(reportId);

    if (!report) {
      return res.status(404).json({
        ok: false,
        message: "التقرير غير موجود",
      });
    }

    const crews = db
      .prepare(`
        SELECT *
        FROM crews
        WHERE report_id = ?
        ORDER BY id
      `)
      .all(reportId);

    const operations = db
      .prepare(`
        SELECT *
        FROM operations
        WHERE report_id = ?
        ORDER BY id
      `)
      .all(reportId);

    const stations = db
      .prepare(`
        SELECT *
        FROM transfer_stations
        WHERE report_id = ?
        ORDER BY id
      `)
      .all(reportId);

    const equipment = db
      .prepare(`
        SELECT *
        FROM equipment
        WHERE report_id = ?
        ORDER BY id
      `)
      .all(reportId);

    res.json({
      ok: true,
      report,
      crews,
      operations,
      stations,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "فشل فتح التقرير",
      error: error.message,
    });
  }
});

app.post("/api/reports", (req, res) => {
  try {
    const {
      report_date,
      weather,
      temperature,
      start_time,
      end_time,
      total_trucks,
      total_waste_tons,
      total_diesel,
      notes,
      crews = [],
      operations = [],
      stations = [],
      equipment = [],
    } = req.body;

    if (!report_date) {
      return res.status(400).json({
        ok: false,
        message: "تاريخ التقرير مطلوب",
      });
    }

    const existing = db
      .prepare(`
        SELECT id
        FROM daily_reports
        WHERE report_date = ?
      `)
      .get(report_date);

    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "يوجد تقرير محفوظ مسبقًا لنفس التاريخ",
      });
    }

    const reportNo = generateReportNo(report_date);

    const transaction = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO daily_reports
          (
            report_date,
            report_no,
            weather,
            temperature,
            start_time,
            end_time,
            total_trucks,
            total_waste_tons,
            total_diesel,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          report_date,
          reportNo,
          weather || "",
          Number(temperature || 0),
          start_time || "",
          end_time || "",
          Number(total_trucks || 0),
          Number(total_waste_tons || 0),
          Number(total_diesel || 0),
          notes || ""
        );

      const reportId = result.lastInsertRowid;

      insertChildren(
        reportId,
        crews,
        operations,
        stations,
        equipment
      );

      return {
        id: reportId,
        report_no: reportNo,
      };
    });

    const report = transaction();

    res.json({
      ok: true,
      message: "تم حفظ التقرير بنجاح",
      report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "فشل حفظ التقرير",
      error: error.message,
    });
  }
});

app.put("/api/reports/:id", (req, res) => {
  try {
    const reportId = Number(req.params.id);

    const {
      report_date,
      weather,
      temperature,
      start_time,
      end_time,
      total_trucks,
      total_waste_tons,
      total_diesel,
      notes,
      crews = [],
      operations = [],
      stations = [],
      equipment = [],
    } = req.body;

    const current = db
      .prepare(`
        SELECT *
        FROM daily_reports
        WHERE id = ?
      `)
      .get(reportId);

    if (!current) {
      return res.status(404).json({
        ok: false,
        message: "التقرير غير موجود",
      });
    }

    if (!report_date) {
      return res.status(400).json({
        ok: false,
        message: "تاريخ التقرير مطلوب",
      });
    }

    const duplicate = db
      .prepare(`
        SELECT id
        FROM daily_reports
        WHERE report_date = ?
        AND id <> ?
      `)
      .get(report_date, reportId);

    if (duplicate) {
      return res.status(409).json({
        ok: false,
        message: "يوجد تقرير آخر محفوظ بنفس التاريخ",
      });
    }

    const reportNo = generateReportNo(report_date);

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE daily_reports
        SET
          report_date = ?,
          report_no = ?,
          weather = ?,
          temperature = ?,
          start_time = ?,
          end_time = ?,
          total_trucks = ?,
          total_waste_tons = ?,
          total_diesel = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        report_date,
        reportNo,
        weather || "",
        Number(temperature || 0),
        start_time || "",
        end_time || "",
        Number(total_trucks || 0),
        Number(total_waste_tons || 0),
        Number(total_diesel || 0),
        notes || "",
        reportId
      );

      db.prepare(`
        DELETE FROM crews
        WHERE report_id = ?
      `).run(reportId);

      db.prepare(`
        DELETE FROM operations
        WHERE report_id = ?
      `).run(reportId);

      db.prepare(`
        DELETE FROM transfer_stations
        WHERE report_id = ?
      `).run(reportId);

      db.prepare(`
        DELETE FROM equipment
        WHERE report_id = ?
      `).run(reportId);

      insertChildren(
        reportId,
        crews,
        operations,
        stations,
        equipment
      );
    });

    transaction();

    res.json({
      ok: true,
      message: "تم تعديل التقرير بنجاح",
      report: {
        id: reportId,
        report_no: reportNo,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "فشل تعديل التقرير",
      error: error.message,
    });
  }
});

app.delete("/api/reports/:id", (req, res) => {
  try {
    const reportId = Number(req.params.id);

    const report = db
      .prepare(`
        SELECT id
        FROM daily_reports
        WHERE id = ?
      `)
      .get(reportId);

    if (!report) {
      return res.status(404).json({
        ok: false,
        message: "التقرير غير موجود",
      });
    }

    db.prepare(`
      DELETE FROM daily_reports
      WHERE id = ?
    `).run(reportId);

    res.json({
      ok: true,
      message: "تم حذف التقرير بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "فشل حذف التقرير",
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log(" Minya Landfill System V2");
  console.log("======================================");
  console.log(` http://localhost:${PORT}`);
  console.log(` Database: ${dbPath}`);
  console.log("======================================");
  console.log("");
});