import "jsr:@std/dotenv/load";
import { Sheetlog } from '../index.mjs';

// Simple delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testUpdateRow() {
  console.log('⚡ Testing Row Update (Partial Upsert)...');
  
  const sheetUrl = 'https://script.google.com/macros/s/AKfycbyVqvxSVNadH2Ha8Mu0YJdWyl9OXzJIt2IfNltaq4Ljc67XEMs5S2dp8i5XeGbKeuvD/exec';
  const sheetName = 'yawnxyz';
  const targetId = '1695394251';

  console.log('Sheet URL:', sheetUrl);
  console.log('Sheet name:', sheetName);
  console.log('Target _id:', targetId);

  const sheetLogger = new Sheetlog({
    sheetUrl: sheetUrl,
    sheet: sheetName
  });

  try {
    // Test 1: Find the row first to see current state
    console.log('\n📥 Test 1: Find current row state');
    const startTime1 = Date.now();
    const findResult = await sheetLogger.find('_id', targetId);
    const duration1 = ((Date.now() - startTime1) / 1000).toFixed(2);
    
    if (findResult && findResult.data) {
      console.log(`✅ Found row in ${duration1}s`);
      console.log('   Current row:', JSON.stringify(findResult.data, null, 2));
    } else {
      console.log(`⚠️ Row not found, will create new entry`);
      console.log('   Response:', JSON.stringify(findResult, null, 2).substring(0, 500));
    }

    // Wait a bit before update to avoid rate limits
    console.log('\n⏳ Waiting 2s before update...');
    await delay(2000);

    // Test 2: Update the row with star and notes using partial upsert
    console.log('\n📝 Test 2: Update row with star and notes (partial upsert)');
    const updatePayload = {
      '⭐️': '⭐️',
      notes: 'Updated via sheetlog test at ' + new Date().toISOString()
    };
    console.log('   Update payload:', updatePayload);
    
    let updateResult;
    let duration2;
    const startTime2 = Date.now();
    
    // Retry up to 3 times on server errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        updateResult = await sheetLogger.upsert('_id', targetId, updatePayload, { partialUpdate: true });
        duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);
        console.log(`✅ Upsert completed in ${duration2}s`);
        console.log('   Result:', JSON.stringify(updateResult, null, 2));
        break;
      } catch (error) {
        console.log(`   ⚠️ Attempt ${attempt}/3 failed: ${error.message}`);
        if (attempt < 3) {
          console.log(`   Waiting ${attempt * 3}s before retry...`);
          await delay(attempt * 3000);
        } else {
          throw error;
        }
      }
    }

    // Test 3: Verify the update by finding the row again
    console.log('\n🔍 Test 3: Verify update by fetching row again');
    const startTime3 = Date.now();
    const verifyResult = await sheetLogger.find('_id', targetId);
    const duration3 = ((Date.now() - startTime3) / 1000).toFixed(2);
    
    let updateSucceeded = false;
    
    if (verifyResult && verifyResult.data) {
      console.log(`✅ Verification completed in ${duration3}s`);
      console.log('   Updated row:', JSON.stringify(verifyResult.data, null, 2));
      
      // Check if update was successful
      const row = verifyResult.data;
      const starOk = row['⭐️'] === '⭐️';
      const notesOk = row.notes && row.notes.includes('Updated via sheetlog test');
      
      if (starOk) {
        console.log('   ✅ Star was added successfully!');
      } else {
        console.log('   ❌ FAILED: Star field is empty or wrong:', row['⭐️']);
      }
      
      if (notesOk) {
        console.log('   ✅ Notes were updated successfully!');
      } else {
        console.log('   ❌ FAILED: Notes field is empty or wrong:', row.notes);
      }
      
      updateSucceeded = starOk && notesOk;
    } else {
      console.log('   ❌ FAILED: Could not verify update');
      console.log('   Response:', JSON.stringify(verifyResult, null, 2).substring(0, 500));
    }

    // Test 4: Update only notes (without changing star)
    // COMMENTED OUT - to preserve the star/notes from Test 2
    // console.log('\n📝 Test 4: Update only notes (star should remain)');
    // const notesOnlyPayload = {
    //   notes: 'Notes-only update at ' + new Date().toISOString()
    // };
    // 
    // const startTime4 = Date.now();
    // const notesResult = await sheetLogger.upsert('_id', targetId, notesOnlyPayload, { partialUpdate: true });
    // const duration4 = ((Date.now() - startTime4) / 1000).toFixed(2);
    // 
    // console.log(`✅ Notes-only update completed in ${duration4}s`);
    // console.log('   Result:', JSON.stringify(notesResult, null, 2));
    // 
    // // Verify star is still there
    // const verifyResult2 = await sheetLogger.find('_id', targetId);
    // if (verifyResult2 && verifyResult2.data) {
    //   const row = verifyResult2.data;
    //   if (row['⭐️'] === '⭐️') {
    //     console.log('   ✅ Star still present after notes-only update!!!');
    //   } else {
    //     console.log('   ⚠️ Star was cleared! Value:', row['⭐️']);
    //   }
    // }

    console.log('\n📊 Performance Summary:');
    console.log(`   Find row: ${duration1}s`);
    console.log(`   Partial upsert (star + notes): ${duration2}s`);
    console.log(`   Verify update: ${duration3}s`);
    
    if (!updateSucceeded) {
      console.log('\n❌ TEST FAILED: Update did not persist!');
      console.log('   The server returned success but data was not written.');
      console.log('   Possible causes:');
      console.log('   1. Google Apps Script not redeployed with latest sheetlog.js');
      console.log('   2. Row found by different _id than expected');
      console.log('   3. Column names mismatch (⭐️ or notes not matching headers)');
      throw new Error('Update verification failed - data not persisted');
    }
    
    console.log('\n🎉 All update tests PASSED!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  }
}

testUpdateRow()
  .then(() => Deno.exit(0))
  .catch(() => Deno.exit(1));

