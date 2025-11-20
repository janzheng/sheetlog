import "jsr:@std/dotenv/load"; // Load .env file
import { Sheetlog } from '../index.mjs';

// Sample movies dataset - first 5 movies
const movies = [
  { "title": "The Shawshank Redemption", "year": 1994, "director": "Frank Darabont", "genre": "Drama", "rating": 9.3 },
  { "title": "The Godfather", "year": 1972, "director": "Francis Ford Coppola", "genre": "Crime", "rating": 9.2 },
  { "title": "The Dark Knight", "year": 2008, "director": "Christopher Nolan", "genre": "Action", "rating": 9.0 },
  { "title": "Pulp Fiction", "year": 1994, "director": "Quentin Tarantino", "genre": "Crime", "rating": 8.9 },
  { "title": "Forrest Gump", "year": 1994, "director": "Robert Zemeckis", "genre": "Drama", "rating": 8.8 }
];

async function testMoviesBatchUpsert() {
  console.log('🎬 Testing Movies Batch Upsert...');
  console.log('Runtime:', typeof Deno !== 'undefined' ? 'Deno' : 'Node.js');
  
  // Use your sheet URL here
  const sheetUrl = Deno.env.get('SHEET_URL') || 'YOUR_SHEET_URL_HERE';
  const sheetName = 'Demo';

  if (sheetUrl === 'YOUR_SHEET_URL_HERE') {
    console.error('❌ Please set SHEET_URL environment variable or update the sheetUrl in the test');
    console.error('   Example: export SHEET_URL="https://script.google.com/macros/s/..."');
    if (typeof Deno !== 'undefined') {
      Deno.exit(1);
    } else {
      process.exit(1);
    }
  }

  console.log('Sheet URL:', sheetUrl);
  console.log('Sheet name:', sheetName);
  console.log(`Loading ${movies.length} movies...`);

  try {
    const sheetLogger = new Sheetlog({
      sheetUrl: sheetUrl,
      sheet: sheetName
    });

    // Test 1: Batch Upsert (insert new movies)
    console.log('\n📥 Test 1: Batch Upsert (Initial Insert)');
    const result1 = await sheetLogger.batchUpsert('title', movies);
    console.log('✅ Batch upsert result:', result1);
    console.log(`   Inserted: ${result1.data.inserted}, Updated: ${result1.data.updated}`);

    // Test 2: Batch Upsert again (should update existing)
    console.log('\n🔄 Test 2: Batch Upsert (Update Existing)');
    const updatedMovies = movies.map(m => ({
      ...m,
      rating: m.rating + 0.1 // Slightly increase rating
    }));
    const result2 = await sheetLogger.batchUpsert('title', updatedMovies);
    console.log('✅ Batch upsert result:', result2);
    console.log(`   Inserted: ${result2.data.inserted}, Updated: ${result2.data.updated}`);

    // Test 3: Read back the data
    console.log('\n📖 Test 3: Read Back Movies');
    const result3 = await sheetLogger.get(null, { limit: 10 });
    console.log('✅ Retrieved movies:', result3.data.length, 'rows');
    if (result3.data.length > 0) {
      console.log('   First movie:', result3.data[0]);
    }

    // Test 4: Find a specific movie
    console.log('\n🔍 Test 4: Find Specific Movie');
    const result4 = await sheetLogger.find('title', 'The Godfather');
    console.log('✅ Found movie:', result4.data);

    // Test 5: Dynamic Post (add a new field)
    console.log('\n➕ Test 5: Dynamic Post (Add New Field)');
    const newMovie = {
      title: "Inception",
      year: 2010,
      director: "Christopher Nolan",
      genre: "Sci-Fi",
      rating: 8.8,
      awards: "4 Oscars" // New field
    };
    const result5 = await sheetLogger.dynamicPost(newMovie);
    console.log('✅ Dynamic post result:', result5);

    // Test 6: Get all data in raw format (faster)
    console.log('\n⚡ Test 6: Get Raw Data (Fast Mode)');
    const result6 = await sheetLogger.list({ limit: 5, raw: true });
    console.log('✅ Raw data result:');
    console.log('   Headers:', result6.data.headers);
    console.log('   Rows:', result6.data.values.length);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    throw error;
  }
}

// Run the test
testMoviesBatchUpsert()
  .then(() => {
    console.log('\n✅ Movie test suite completed successfully');
    if (typeof Deno !== 'undefined') {
      Deno.exit(0);
    } else {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n❌ Movie test suite failed:', error);
    if (typeof Deno !== 'undefined') {
      Deno.exit(1);
    } else {
      process.exit(1);
    }
  });

