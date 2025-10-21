// ========= FINAL UPGRADED SEEDER SCRIPT V7 (Seeds in Patches) =========

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// --- Database Connection ---
// ❗️ IMPORTANT: Replace this with your actual Supabase Session Pooler string.
const pool = new Pool({
  connectionString: 'postgresql://postgres.hbhbkbumqmwuzfvbrpzf:Mirxaop%40263@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
});

// This function creates the tables and seeds the main Surah list.
// It will only run for the first patch.
async function setupDatabase(client) {
  console.log('Resetting tables for the first patch...');
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
  console.log('✅ Tables created successfully!');

  const surahInfoPath = path.join('source', 'surah.json');
  const surahsData = JSON.parse(fs.readFileSync(surahInfoPath, 'utf8'));
  
  console.log('Seeding Surahs table...');
  for (const surah of surahsData) { 
    await client.query(
      'INSERT INTO Surahs (id, name_arabic, name_english, revelation_type, total_ayahs) VALUES ($1, $2, $3, $4, $5)',
      [parseInt(surah.index), surah.titleAr, surah.title, surah.type, surah.count]
    );
  }
  console.log('✅ Surahs table seeded successfully!');
}

// THE MAIN FUNCTION
async function seedDatabase() {
  // Get start and end Surahs from the command line (e.g., "node seed.js 1 40")
  const startSurah = parseInt(process.argv[2]) || 1;
  const endSurah = parseInt(process.argv[3]) || 114;
  
  console.log(`Starting patch seeding process from Surah ${startSurah} to ${endSurah}... 🚀`);
  const client = await pool.connect();
  console.log('Database connected successfully!');

  try {
    // ONLY reset the tables if we are starting from Surah 1
    if (startSurah === 1) {
      await setupDatabase(client);
    } else {
      console.log('Skipping table setup for subsequent patch.');
    }

    // --- Seeding Ayahs and Translations for the specified patch ---
    console.log(`Seeding Ayahs and Translations from Surah ${startSurah} to ${endSurah}...`);
    for (let i = startSurah; i <= endSurah; i++) {
      const arabicFilePath = path.join('source', 'surah', `surah_${i}.json`);
      const translationFilePath = path.join('source', 'translation', 'en', `en_translation_${i}.json`);

      const arabicData = JSON.parse(fs.readFileSync(arabicFilePath, 'utf8'));
      const translationData = JSON.parse(fs.readFileSync(translationFilePath, 'utf8'));

      for (const [key, arabicText] of Object.entries(arabicData.verse)) {
        const ayahNumber = parseInt(key.split('_')[1]);

        const ayahResult = await client.query(
          'INSERT INTO Ayahs (surah_id, ayah_number, text_uthmani) VALUES ($1, $2, $3) RETURNING id',
          [i, ayahNumber, arabicText]
        );
        const newAyahId = ayahResult.rows[0].id;
        
        const translationText = translationData.verse[key];
        
        await client.query(
          'INSERT INTO Translations (ayah_id, translator_name, translation_text) VALUES ($1, $2, $3)',
          [newAyahId, 'Sahih International', translationText]
        );
      }
      console.log(` > Finished seeding Surah ${i}`);
    }
    console.log(`✅ Patch from Surah ${startSurah} to ${endSurah} seeded successfully!`);

  } catch (error) {
    console.error('❌ An error occurred during seeding:', error);
  } finally {
    await client.release();
    await pool.end();
    console.log('Patch seeding process finished. 🎉');
  }
}

// RUN THE SCRIPT
seedDatabase();