// Script to apply Supabase migration via REST API
const fs = require('fs');
const path = require('path');

// Load the migration SQL file
const migrationSql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20231022000000_create_recordings_table.sql'), 'utf8');

// Extract only the "Up Migration" part (everything before the "Down Migration" comment)
const upMigration = migrationSql.split('-- Down Migration')[0].trim();

// Supabase API credentials from .env.local
const SUPABASE_URL = 'https://ecqdiiurwojrbijsbyta.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWRpaXVyd29qcmJpanNieXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NTQ4MzIsImV4cCI6MjA1ODIzMDgzMn0.bG0phuBjMeUrKfqQcWj8TJguqo6mLMv00B5OgTIvsvA';

// Function to execute SQL queries via the Supabase REST API
async function executeSql(sql) {
  try {
    // Split the SQL query into individual statements (splitting by semicolons, but not within quotes)
    const statements = sql.match(/(?:[^';]|'(?:[^']|'')*')+;/g) || [sql];
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
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
    
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Failed to apply migration:', error);
  }
}

// Run the migration
console.log('Applying migration...');
executeSql(upMigration); 