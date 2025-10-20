import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Node.js script to save CSV content to file system
 * Called from frontend via child process
 */

// Read CSV content from stdin
let csvContent = '';

process.stdin.on('data', (chunk) => {
  csvContent += chunk.toString();
});

process.stdin.on('end', () => {
  try {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    try {
      mkdirSync(dataDir, { recursive: true });
    } catch (e) {
      // Directory already exists
    }
    
    // Write CSV file
    const filePath = join(dataDir, 'input.csv');
    writeFileSync(filePath, csvContent, 'utf-8');
    
    console.log(JSON.stringify({ 
      success: true, 
      path: filePath,
      size: csvContent.length 
    }));
  } catch (error) {
    console.error(JSON.stringify({ 
      success: false, 
      error: error.message 
    }));
    process.exit(1);
  }
});
