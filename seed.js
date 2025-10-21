// ========= FINAL WORKING SEEDER SCRIPT V5 =========
// This version is matched to the real structure of ALL your JSON files.

// 1. IMPORT NECESSARY LIBRARIES
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 2. DATABASE CONNECTION CONFIGURATION
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'islam360_db',
  password: '123', // <-- Make sure this is correct
  port: 5432,
});

// 3. THE MAIN FUNCTION
async function seedDatabase() {
  console.log('Starting the seeding process with final V5 script... 🚀');
  const client = await pool.connect();
  console.log('Database connected successfully!');

  try {
    // --- Clean up old tables to start fresh ---
    console.log('Resetting tables...');
    await client.query('DROP TABLE IF EXISTS Translations, Ayahs, Surahs;');
    await client.query(`
      CREATE TABLE Surahs (
          id INT PRIMARY KEY, name_arabic VARCHAR(100) NOT NULL, name_english VARCHAR(100) NOT NULL,
          revelation_type VARCHAR(10) NOT NULL, total_ayahs INT NOT NULL
      );
      CREATE TABLE Ayahs (
          id SERIAL PRIMARY KEY, surah_id INT NOT NULL, ayah_number INT NOT NULL,
          text_uthmani TEXT NOT NULL, juz_number INT, FOREIGN KEY (surah_id) REFERENCES Surahs(id)
      );
      CREATE TABLE Translations (
          id SERIAL PRIMARY KEY, ayah_id INT NOT NULL, translator_name VARCHAR(100) NOT NULL,
          translation_text TEXT NOT NULL, FOREIGN KEY (ayah_id) REFERENCES Ayahs(id)
      );
    `);
    console.log('✅ Tables reset and re-created successfully!');

    // --- Seeding Surahs Table (from V4 - this part was correct) ---
    const surahInfoPath = path.join('source', 'surah.json');
    const surahsData = JSON.parse(fs.readFileSync(surahInfoPath, 'utf8'));
    
    console.log('Seeding Surahs table...');
    for (const surah of surahsData) { 
      await client.query(
        'INSERT INTO Surahs (id, name_arabic, name_english, revelation_type, total_ayahs) VALUES ($1, $2, $3, $4, $5)',
        [
          parseInt(surah.index), surah.titleAr, surah.title, 
          surah.type, surah.count
        ]
      );
    }
    console.log('✅ Surahs table seeded successfully!');

    // --- Seeding Ayahs and Translations (CORRECTED) ---
    console.log('Seeding Ayahs and Translations tables... (This will take a minute)');
    for (let i = 1; i <= 114; i++) {
      const arabicFilePath = path.join('source', 'surah', `surah_${i}.json`);
      const translationFilePath = path.join('source', 'translation', 'en', `en_translation_${i}.json`);

      const arabicData = JSON.parse(fs.readFileSync(arabicFilePath, 'utf8'));
      const translationData = JSON.parse(fs.readFileSync(translationFilePath, 'utf8'));

      // Loop through the 'verse' object using Object.entries
      for (const [key, arabicText] of Object.entries(arabicData.verse)) {
        const ayahNumber = parseInt(key.split('_')[1]);

        const ayahResult = await client.query(
          'INSERT INTO Ayahs (surah_id, ayah_number, text_uthmani) VALUES ($1, $2, $3) RETURNING id',
          [i, ayahNumber, arabicText]
        );
        const newAyahId = ayahResult.rows[0].id;
        
        // Find the matching translation using the same key (e.g., 'verse_1')
        const translationText = translationData.verse[key];
        
        await client.query(
          'INSERT INTO Translations (ayah_id, translator_name, translation_text) VALUES ($1, $2, $3)',
          [newAyahId, 'Sahih International', translationText]
        );
      }
      console.log(` > Finished seeding Surah ${i}`);
    }
    console.log('✅ Ayahs and Translations tables seeded successfully!');

  } catch (error) {
    console.error('❌ An error occurred during seeding:', error);
  } finally {
    await client.release();
    await pool.end();
    console.log('Database seeding process finished. Your database is now populated! 🎉');
  }
}

// 4. RUN THE SCRIPT
seedDatabase();