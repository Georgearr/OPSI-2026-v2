const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 8080;

// ====== Inisialisasi Database SQLite Lokal ======
// Membuat file database dev.db secara otomatis di dalam folder prisma Anda
const db = new Database(path.join(__dirname, 'prisma', 'dev.db'));

// Membuat struktur tabel multi-gas secara otomatis jika belum terbuat
db.prepare(`
    CREATE TABLE IF NOT EXISTS sensor_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        co_ppm REAL NOT NULL,
        h2s_ppm REAL NOT NULL,
        nh3_ppm REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// ====== Middleware ======
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== API Endpoint untuk ESP32 (POST) ======
app.post('/api/sensors', (req, res) => {
    const { co_ppm, h2s_ppm, nh3_ppm } = req.body;

    if (co_ppm === undefined || h2s_ppm === undefined || nh3_ppm === undefined) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Missing parameters (co_ppm, h2s_ppm, or nh3_ppm)' 
        });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO sensor_logs (co_ppm, h2s_ppm, nh3_ppm) 
            VALUES (?, ?, ?)
        `);
        const info = stmt.run(parseFloat(co_ppm), parseFloat(h2s_ppm), parseFloat(nh3_ppm));

        console.log(`[Data Masuk] ID: ${info.lastInsertRowId} | CO: ${co_ppm} ppm | H2S: ${h2s_ppm} ppm | NH3: ${nh3_ppm} ppm`);
        res.status(201).json({ status: 'success', id: info.lastInsertRowId });
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Database failure' });
    }
});

// ====== API Endpoint untuk Frontend Dashboard (GET) ======
app.get('/api/sensors/logs', (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT id, co_ppm, h2s_ppm, nh3_ppm, created_at as createdAt 
            FROM sensor_logs 
            ORDER BY id DESC 
            LIMIT 20
        `).all();

        // Balikkan urutan array agar visualisasi grafik mengalir dari kiri ke kanan
        res.json(logs.reverse());
    } catch (err) {
        console.error('Server Fetch Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ====== Menjalankan Server ======
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 Backend Cloud Server (Native) berjalan di port ${PORT}`);
    console.log(`📊 Dashboard siap memproses data sensor PCO!`);
    console.log(`==================================================`);
});