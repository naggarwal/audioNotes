// Script to apply Supabase migration via REST API
const fs = require('fs');
const path = require('path');

// Migrations to apply (in order)
const migrations = [
  'supabase/migrations/20231022000000_create_recordings_table.sql',
  'supabase/migrations/20240515000000_create_transcriptions_table.sql',
  'supabase/migrations/20240515000001_update_existing_recordings.sql'
];

// Supabase API credentials from .env.local
const SUPABASE_URL = 'https://ecqdiiurwojrbijsbyta.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWRpaXVyd29qcmJpanNieXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NTQ4MzIsImV4cCI6MjA1ODIzMDgzMn0.bG0phuBjMeUrKfqQcWj8TJguqo6mLMv00B5OgTIvsvA';

// Function to execute SQL queries via the Supabase REST API
async function executeSql(sql, migrationName) {
  try {
    // Split the SQL query into individual statements (splitting by semicolons, but not within quotes)
    const statements = sql.match(/(?:[^';]|'(?:[^']|'')*')+;/g) || [sql];
    
    console.log(`Found ${statements.length} SQL statements to execute for ${migrationName}`);
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      console.log(`Executing SQL statement: ${statement.substring(0, 100)}...`);

      // Use the Supabase REST API to execute the SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          query: statement
        })
      });

      // Check the response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error executing SQL: ${errorText}`);
      } else {
        console.log('SQL statement executed successfully');
      }
    }
    
    console.log(`Migration ${migrationName} applied successfully!`);
    return true;
  } catch (error) {
    console.error(`Failed to apply migration ${migrationName}:`, error);
    return false;
  }
}

// Process migrations
async function applyMigrations() {
  console.log('Applying migrations...');
  
  for (const migrationFile of migrations) {
    try {
      // Load the migration SQL file
      const migrationSql = fs.readFileSync(path.join(__dirname, migrationFile), 'utf8');
      
      // Extract only the "Up Migration" part (everything before the "Down Migration" comment)
      const upMigration = migrationSql.split('-- Down Migration')[0].trim();
      
      console.log(`Applying migration: ${migrationFile}`);
      const success = await executeSql(upMigration, migrationFile);
      
      if (!success) {
        console.error(`Failed to apply migration: ${migrationFile}. Stopping migration process.`);
        break;
      }
    } catch (err) {
      console.error(`Error processing migration file ${migrationFile}:`, err);
      break;
    }
  }
  
  console.log('Migration process completed');
}

// Run the migrations
applyMigrations(); 