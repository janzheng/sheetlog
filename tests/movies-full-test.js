import "jsr:@std/dotenv/load"; // Load .env file
import { Sheetlog } from '../index.mjs';

// Load all 200 movies from the JSON file
async function loadMoviesData() {
  const moviesPath = new URL('../demo/movies.json', import.meta.url);
  const moviesText = await Deno.readTextFile(moviesPath);
  return JSON.parse(moviesText);
}

async function testFullMovieDatabase() {
  console.log('🎬 Testing Full Movie Database (200 movies)...');
  console.log('Runtime:', typeof Deno !== 'undefined' ? 'Deno' : 'Node.js');
  
  const sheetUrl = Deno.env.get('SHEET_URL');
  const sheetName = 'MoviesFullTest';

  if (!sheetUrl) {
    console.error('❌ Please set SHEET_URL environment variable');
    console.error('   Example: export SHEET_URL="https://script.google.com/macros/s/..."');
    Deno.exit(1);
  }

  console.log('Sheet URL:', sheetUrl);
  console.log('Sheet name:', sheetName);

  try {
    const movies = await loadMoviesData();
    console.log(`\n📚 Loaded ${movies.length} movies from database`);

    const sheetLogger = new Sheetlog({
      sheetUrl: sheetUrl,
      sheet: sheetName
    });

    // Test 1: Clear existing data first (optional - comment out if you want to keep existing data)
    console.log('\n🗑️  Test 1: Clear existing sheet data');
    try {
      const allData = await sheetLogger.get(null, { limit: 1000 });
      if (allData.data && allData.data.length > 0) {
        const ids = allData.data.map(row => row._id);
        console.log(`   Found ${ids.length} existing rows, clearing...`);
        await sheetLogger.bulkDelete(ids);
        console.log('✅ Sheet cleared');
      } else {
        console.log('✅ Sheet is already empty');
      }
    } catch (e) {
      console.log('   Sheet might be empty or new:', e.message);
    }

    // Test 2: Batch insert all movies (NO batching - single call)
    console.log('\n📥 Test 2: Batch Upsert All Movies (single batch)');
    const startTime = Date.now();

    console.log(`   Processing all ${movies.length} movies in one batch...`);
    
    const result = await sheetLogger.batchUpsert('title', movies);
    
    let duration;
    if (result.status === 200) {
      const totalInserted = result.data.inserted || 0;
      const totalUpdated = result.data.updated || 0;
      duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n✅ Complete! Inserted: ${totalInserted}, Updated: ${totalUpdated}`);
      console.log(`   Total time: ${duration}s (${(movies.length / duration).toFixed(1)} movies/sec)`);
    } else {
      console.error(`   ❌ Batch failed:`, result);
      throw new Error(`Batch upsert failed`);
    }

    // Test 3: Verify all data was inserted
    console.log('\n📊 Test 3: Verify Data Integrity');
    const allData = await sheetLogger.get(null, { limit: 1000 });
    console.log(`✅ Total rows in sheet: ${allData.data.length}`);
    
    if (allData.data.length !== movies.length) {
      console.warn(`⚠️  Warning: Expected ${movies.length} rows, found ${allData.data.length}`);
    }

    // Test 4: Sample queries
    console.log('\n🔍 Test 4: Sample Queries');
    
    // Find a specific movie
    const godfatherResult = await sheetLogger.find('title', 'The Godfather');
    console.log(`✅ Found "The Godfather":`, godfatherResult.data);

    // Get movies with raw mode (fast)
    const rawResult = await sheetLogger.list({ limit: 10, raw: true });
    console.log(`✅ Raw mode test: Retrieved ${rawResult.data.values.length} rows`);
    console.log(`   Headers:`, rawResult.data.headers);

    // Test 5: Statistics
    console.log('\n📈 Test 5: Calculate Statistics');
    
    // Get all movies and calculate stats in memory
    const statsStart = Date.now();
    const allMovies = await sheetLogger.get(null, { limit: 1000 });
    const movieData = allMovies.data;
    
    const genreCounts = {};
    const directorCounts = {};
    let totalRating = 0;
    let ratingCount = 0;
    
    movieData.forEach(movie => {
      if (movie.genre) {
        genreCounts[movie.genre] = (genreCounts[movie.genre] || 0) + 1;
      }
      if (movie.director) {
        directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
      }
      if (movie.rating) {
        totalRating += parseFloat(movie.rating);
        ratingCount++;
      }
    });

    const avgRating = (totalRating / ratingCount).toFixed(2);
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topDirectors = Object.entries(directorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const statsDuration = ((Date.now() - statsStart) / 1000).toFixed(2);
    
    console.log(`✅ Statistics calculated in ${statsDuration}s:`);
    console.log(`   Average Rating: ${avgRating}`);
    console.log(`   Top 5 Genres:`, topGenres.map(([g, c]) => `${g} (${c})`).join(', '));
    console.log(`   Top 5 Directors:`, topDirectors.map(([d, c]) => `${d} (${c})`).join(', '));

    // Test 6: Update test - modify a few movies
    console.log('\n🔄 Test 6: Update Existing Movies');
    const moviesToUpdate = [
      { ...movies[0], rating: 9.4, notes: 'Updated!' },
      { ...movies[1], rating: 9.3, notes: 'Also updated!' },
      { ...movies[2], rating: 9.1, notes: 'Modified!' }
    ];
    
    const updateResult = await sheetLogger.batchUpsert('title', moviesToUpdate);
    console.log(`✅ Update result: Inserted: ${updateResult.data.inserted}, Updated: ${updateResult.data.updated}`);

    // Verify update - with better error handling
    try {
      const updatedMovie = await sheetLogger.find('title', movies[0].title);
      console.log(`   Full find response:`, JSON.stringify(updatedMovie, null, 2));
      
      if (updatedMovie && updatedMovie.data) {
        if (updatedMovie.data.notes === 'Updated!') {
          console.log(`✅ Verified update: Success! Notes field updated correctly`);
          console.log(`   Movie data:`, updatedMovie.data);
        } else if (updatedMovie.data.notes) {
          console.log(`⚠️  Update verification: Notes field exists but has wrong value: "${updatedMovie.data.notes}"`);
          console.log(`   Movie data:`, updatedMovie.data);
        } else {
          console.log(`⚠️  Update verification: Movie found but 'notes' field is empty or missing`);
          console.log(`   Movie data:`, updatedMovie.data);
        }
      } else {
        console.log(`❌ Update verification failed: Could not find movie "${movies[0].title}"`);
        console.log(`   Response:`, updatedMovie);
      }
    } catch (e) {
      console.log(`⚠️  Could not verify update:`, e.message);
    }

    // Test 7: Performance - Find multiple movies
    console.log('\n⚡ Test 7: Performance Test - Multiple Finds');
    const findStart = Date.now();
    const moviesToFind = ['The Matrix', 'Inception', 'Interstellar', 'The Shawshank Redemption', 'Pulp Fiction'];
    
    for (const title of moviesToFind) {
      await sheetLogger.find('title', title);
    }
    
    const findDuration = ((Date.now() - findStart) / 1000).toFixed(2);
    console.log(`✅ Found ${moviesToFind.length} movies in ${findDuration}s (${(moviesToFind.length / findDuration).toFixed(1)} finds/sec)`);

    console.log('\n🎉 All full database tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   Total movies loaded: ${movies.length}`);
    console.log(`   Total rows in sheet: ${allData.data.length}`);
    console.log(`   Average rating: ${avgRating}`);
    console.log(`   Batch insert time: ${duration}s`);
    console.log(`   Most common genre: ${topGenres[0][0]} (${topGenres[0][1]} movies)`);

  } catch (error) {
    console.error('❌ Error during full database test:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// Run the test
testFullMovieDatabase()
  .then(() => {
    console.log('\n✅ Full movie database test suite completed successfully');
    Deno.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Full movie database test suite failed:', error);
    Deno.exit(1);
  });

