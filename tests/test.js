import "jsr:@std/dotenv/load"; // Load .env file
import { Sheetlog } from '../index.mjs';

async function testSheetlog() {
  console.log('Testing Sheetlog...');
  console.log('Runtime:', typeof Deno !== 'undefined' ? 'Deno' : 'Node.js');
  
  const sheetUrl = Deno.env.get('SHEET_URL');
  const sheetName = 'Signups';
  const testData = {
    Email: 'test@example.com'
  };

  if (!sheetUrl || sheetUrl.includes('YOUR_')) {
    console.error('❌ Please set SHEET_URL environment variable');
    console.error('   Example: export SHEET_URL="https://script.google.com/macros/s/..."');
    if (typeof Deno !== 'undefined') {
      Deno.exit(1);
    } else {
      process.exit(1);
    }
  }

  console.log('Sheet URL:', sheetUrl);
  console.log('Sheet name:', sheetName);
  console.log('Data:', testData);

  try {
    const sheetLogger = new Sheetlog({
      sheetUrl: sheetUrl,
      sheet: sheetName
    });

    const result = await sheetLogger.log(testData);
    console.log('✅ Successfully logged to sheet:', result);
  } catch (error) {
    console.error('❌ Error logging to sheet:', error.message);
    throw error;
  }
}

// Run the test
testSheetlog()
  .then(() => {
    console.log('✅ Test completed successfully');
    // Exit appropriately for both Deno and Node
    if (typeof Deno !== 'undefined') {
      Deno.exit(0);
    } else {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    if (typeof Deno !== 'undefined') {
      Deno.exit(1);
    } else {
      process.exit(1);
    }
  });

