// 1. Import necessary tools
const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// 2. Create the Express App
const app = express();
const port = 3000;

// 3. Configure the database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'islam360_db',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// 4. API Endpoints

// Root endpoint for a welcome message
app.get('/', (req, res) => {
  res.send('Welcome to the Islam360 API!');
});

// Endpoint to get the list of all Surahs
app.get('/api/surahs', async (req, res) => {
  try {
    const sqlQuery = 'SELECT id, name_english, name_arabic, revelation_type, total_ayahs FROM Surahs ORDER BY id;';
    const { rows } = await pool.query(sqlQuery);
    res.json(rows);
  } catch (err) {
    console.error("Error executing query", err.stack);
    res.status(500).send('Server error');
  }
});

// ========= NEW, MORE POWERFUL ENDPOINT STARTS HERE =========

// Endpoint to get a specific Surah by its ID, including all its Ayahs and translations
app.get('/api/surahs/:id', async (req, res) => {
  try {
    // Get the Surah ID from the URL (e.g., '1' from '/api/surahs/1')
    const surahId = parseInt(req.params.id);

    // SQL query to get Surah details
    const surahQuery = 'SELECT id, name_english, name_arabic, revelation_type FROM Surahs WHERE id = $1;';
    const surahResult = await pool.query(surahQuery, [surahId]);
    
    // If no Surah is found, send a 404 Not Found error
    if (surahResult.rows.length === 0) {
      return res.status(404).send('Surah not found.');
    }

    // SQL query to get all Ayahs and their translations for this Surah
    const ayahsQuery = `
      SELECT a.ayah_number, a.text_uthmani, t.translation_text
      FROM Ayahs a
      JOIN Translations t ON a.id = t.ayah_id
      WHERE a.surah_id = $1
      ORDER BY a.ayah_number;
    `;
    const ayahsResult = await pool.query(ayahsQuery, [surahId]);

    // Combine the results into a single, clean JSON object
    const response = {
      surah: surahResult.rows[0],
      ayahs: ayahsResult.rows
    };

    // Send the combined data back
    res.json(response);

  } catch (err) {
    console.error("Error executing query", err.stack);
    res.status(500).send('Server error');
  }
});

// ========= NEW ENDPOINT ENDS HERE =========

// 5. Start the server
app.listen(port, () => {
  console.log(`✅ Server is running successfully on http://localhost:${port}`);
});