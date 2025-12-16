import "jsr:@std/dotenv/load";
import { Sheetlog } from '../index.mjs';

async function testGetLast() {
  console.log('⚡ Testing GET_LAST (Fast Bottom Rows)...');
  
  const sheetUrl = 'https://script.google.com/macros/s/AKfycbyYpqvlHHEZN9U72pBznMgjthpo_Z37RRIiw0gdbZbsYJPLLWtKChI4DOJJKo34RH3b/exec';
  const sheetName = 'yawnxyz';

  console.log('Sheet URL:', sheetUrl);
  console.log('Sheet name:', sheetName);

  const sheetLogger = new Sheetlog({
    sheetUrl: sheetUrl,
    sheet: sheetName
  });

  try {
    // Test 1: Get last 10 rows
    console.log('\n📥 Test 1: Get last 10 rows');
    const startTime1 = Date.now();
    const result1 = await sheetLogger.getLast(10);
    const duration1 = ((Date.now() - startTime1) / 1000).toFixed(2);
    console.log('   Full response:', JSON.stringify(result1, null, 2).substring(0, 500));
    
    if (result1 && result1.data) {
      const data = Array.isArray(result1.data) ? result1.data : [];
      console.log(`✅ Got ${data.length} rows in ${duration1}s`);
      console.log('   Start row:', result1.startRow);
      console.log('   End row:', result1.endRow);
      console.log('   Total rows in sheet:', result1.total);
      if (data.length > 0) {
        console.log('   Last row:', data[data.length - 1]);
      }
    } else {
      console.log('   Response:', result1);
    }

    // Test 2: Get last 50 rows in raw mode
    console.log('\n📥 Test 2: Get last 50 rows (raw mode)');
    const startTime2 = Date.now();
    const result2 = await sheetLogger.getLast(50, { raw: true });
    const duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);
    console.log('   Full response structure:', Object.keys(result2 || {}));
    
    if (result2 && result2.data && result2.data.values) {
      console.log(`✅ Got ${result2.data.values.length} rows in ${duration2}s`);
      console.log('   Headers:', result2.data.headers);
      console.log('   Start row:', result2.data.startRow);
      console.log('   End row:', result2.data.endRow);
    } else {
      console.log('   Response:', JSON.stringify(result2, null, 2).substring(0, 500));
    }

    // Test 3: Get last 100 rows
    console.log('\n📥 Test 3: Get last 100 rows');
    const startTime3 = Date.now();
    const result3 = await sheetLogger.getLast(100);
    const duration3 = ((Date.now() - startTime3) / 1000).toFixed(2);
    
    if (result3 && result3.data) {
      const data3 = Array.isArray(result3.data) ? result3.data : [];
      console.log(`✅ Got ${data3.length} rows in ${duration3}s`);
      console.log('   Total rows in sheet:', result3.total);
    }

    console.log('\n🎉 All GET_LAST tests completed!');
    console.log('\n📊 Performance Summary:');
    console.log(`   10 rows: ${duration1}s`);
    console.log(`   50 rows (raw): ${duration2}s`);
    console.log(`   100 rows: ${duration3}s`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  }
}

testGetLast()
  .then(() => Deno.exit(0))
  .catch(() => Deno.exit(1));
