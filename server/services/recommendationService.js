import getDb from '../db/init.js';
import { movies } from './movieService.js';

const K_NEIGHBORS = 10;
const SIMILARITY_THRESHOLD = 0.1;

const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  for (const key of allKeys) {
    const valA = vecA[key] || 0;
    const valB = vecB[key] || 0;
    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

const buildUserItemMatrix = () => {
  const db = getDb();
  const interactions = db.prepare('SELECT user_id, movie_id, type, value FROM user_interactions').all();

  const userMovies = {};
  const movieGenres = {};

  const dbMovies = db.prepare('SELECT id, title, genres, year, rating, type FROM movies').all();
  for (const m of dbMovies) {
    movieGenres[m.id] = m;
  }

  for (const interaction of interactions) {
    const userId = interaction.user_id;
    const movieId = interaction.movie_id;

    if (!userMovies[userId]) userMovies[userId] = {};

    let weight = 1;
    if (interaction.type === 'like') weight = 2;
    else if (interaction.type === 'watched') weight = 1.5;
    else if (interaction.type === 'rating') weight = interaction.value / 5;

    userMovies[userId][movieId] = weight;
  }

  return { userMovies, movieGenres };
};

const buildItemVector = (movie, allMovies, movieGenres) => {
  const vector = {};

  const genres = movie.genres || [];
  for (const genre of genres) {
    vector[`g_${genre}`] = 1;
  }

  vector[`year_${movie.year}`] = 1;
  vector[`type_${movie.type || 'movie'}`] = 1;

  if (movie.rating) {
    vector[`rating_${Math.floor(movie.rating)}`] = 1;
  }

  return vector;
};

const computeItemSimilarities = (allMovies, movieGenres) => {
  const itemVectors = {};
  const movieList = allMovies || (movieGenres ? Object.values(movieGenres) : []);

  for (const movie of movieList) {
    itemVectors[movie.id] = buildItemVector(movie, movieList, movieGenres);
  }

  const similarities = {};
  for (const id1 of Object.keys(itemVectors)) {
    similarities[id1] = {};
    for (const id2 of Object.keys(itemVectors)) {
      if (id1 !== id2) {
        similarities[id1][id2] = cosineSimilarity(itemVectors[id1], itemVectors[id2]);
      }
    }
  }

  return similarities;
};

const getCollaborativeRecommendations = (userId, K = K_NEIGHBORS, threshold = SIMILARITY_THRESHOLD) => {
  const db = getDb();
  const { userMovies, movieGenres } = buildUserItemMatrix();

  if (!userMovies[userId]) {
    return [];
  }

  const userVector = userMovies[userId];
  const otherUserIds = Object.keys(userMovies).filter(id => parseInt(id) !== userId);

  const similarities = {};
  for (const otherUserId of otherUserIds) {
    const otherVector = userMovies[otherUserId];
    const sim = cosineSimilarity(userVector, otherVector);
    if (sim >= threshold) {
      similarities[otherUserId] = sim;
    }
  }

  const sortedNeighbors = Object.entries(similarities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, K);

  const recommendedScores = {};
  const recommendedMovies = new Set();

  for (const movieId of Object.keys(userVector)) {
    recommendedMovies.add(movieId);
  }

  for (const [neighborId, similarity] of sortedNeighbors) {
    for (const [movieId, rating] of Object.entries(userMovies[neighborId])) {
      if (!recommendedMovies.has(movieId)) {
        if (!recommendedScores[movieId]) {
          recommendedScores[movieId] = 0;
        }
        recommendedScores[movieId] += similarity * rating;
      }
    }
  }

  const recommendations = Object.entries(recommendedScores)
    .map(([movieId, score]) => ({
      movieId,
      score: score / sortedNeighbors.length
    }))
    .sort((a, b) => b.score - a.score);

  return recommendations;
};

const getContentBasedRecommendations = (userId, movieList, limit = 10) => {
  const db = getDb();

  if (!movieList || movieList.length === 0) {
    const allMovies = db.prepare('SELECT id FROM movies').all();
    return allMovies.map(m => ({ movieId: m.id, score: 0.5 }));
  }

  const likedGenres = {};
  for (const movie of movieList) {
    const genres = movie.genres || [];
    for (const genre of genres) {
      likedGenres[genre] = (likedGenres[genre] || 0) + 1;
    }
  }

  const genreScores = {};
  for (const [genre, count] of Object.entries(likedGenres)) {
    genreScores[genre] = count / movieList.length;
  }

  const allMovies = db.prepare('SELECT id, genres FROM movies').all();
  const recommendations = [];

  for (const movie of allMovies) {
    const movieGenres = movie.genres || [];
    let score = 0;
    for (const genre of movieGenres) {
      score += genreScores[genre] || 0;
    }
    if (movieGenres.length > 0) {
      score /= movieGenres.length;
    }
    recommendations.push({ movieId: movie.id, score });
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const getRecommendations = (userId, options = {}) => {
  const limit = options.limit || 10;
  const page = options.page || 1;

  const db = getDb();

  const userLikes = db.prepare('SELECT movie_id FROM user_interactions WHERE user_id = ? AND type = ?', [userId, 'like']).all();
  const likedMovieIds = userLikes.map(i => i.movie_id);

  const allMovies = db.prepare('SELECT id, title, genres, year, rating, type FROM movies').all();

  const collabRecs = getCollaborativeRecommendations(userId, K_NEIGHBORS, SIMILARITY_THRESHOLD);

  let recommendations = collabRecs;

  if (recommendations.length < limit) {
    const contentRecs = getContentBasedRecommendations(
      userId,
      allMovies.filter(m => likedMovieIds.includes(m.id)),
      limit
    );

    const combined = {};

    for (const rec of collabRecs) {
      combined[rec.movieId] = { ...rec, source: 'collaborative' };
    }

    for (const rec of contentRecs) {
      if (!combined[rec.movieId]) {
        combined[rec.movieId] = { ...rec, source: 'content' };
      }
    }

    recommendations = Object.values(combined)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } else {
    recommendations = recommendations.slice(0, limit);
  }

  const movieMap = {};
  for (const m of allMovies) {
    movieMap[m.id] = m;
  }

  return recommendations.map(rec => {
    const movie = movieMap[rec.movieId] || { id: rec.movieId, title: 'Unknown', genres: [], year: null, rating: null, type: 'movie' };
    return {
      movie: {
        id: movie.id,
        title: movie.title,
        genres: movie.genres,
        year: movie.year,
        rating: movie.rating,
        type: movie.type
      },
      score: rec.score,
      source: rec.source || 'collaborative'
    };
  });
};

export const seedMoviesTable = () => {
  const db = getDb();

  const movies = [
    { id: '1', title: 'The Matrix', genres: ['Action', 'Sci-Fi'], year: 1999, rating: 8.7, type: 'movie' },
    { id: '2', title: 'Inception', genres: ['Action', 'Sci-Fi'], year: 2010, rating: 8.8, type: 'movie' },
    { id: '3', title: 'Interstellar', genres: ['Adventure', 'Drama', 'Sci-Fi'], year: 2014, rating: 8.6, type: 'movie' },
    { id: '4', title: 'Blade Runner 2049', genres: ['Action', 'Sci-Fi', 'Thriller'], year: 2017, rating: 8.0, type: 'movie' },
    { id: '5', title: 'Arrival', genres: ['Adventure', 'Sci-Fi'], year: 2016, rating: 7.9, type: 'movie' },
    { id: '6', title: 'The Notebook', genres: ['Drama', 'Romance'], year: 2004, rating: 7.3, type: 'movie' },
    { id: '7', title: 'Titanic', genres: ['Drama', 'Romance'], year: 1997, rating: 7.3, type: 'movie' },
    { id: '8', title: 'La La Land', genres: ['Drama', 'Music', 'Romance'], year: 2016, rating: 8.0, type: 'movie' },
    { id: '9', title: 'Die Hard', genres: ['Action', 'Crime', 'Thriller'], year: 1988, rating: 8.2, type: 'movie' },
    { id: '10', title: 'John Wick', genres: ['Action', 'Crime'], year: 2014, rating: 7.4, type: 'movie' }
  ];

  db.exec(`CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    genres TEXT,
    year INTEGER,
    rating REAL,
    type TEXT DEFAULT 'movie'
  )`);

  const insert = db.prepare(`INSERT OR REPLACE INTO movies (id, title, genres, year, rating, type) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertMany = db.transaction((movieList) => {
    for (const movie of movieList) {
      insert.run(movie.id, movie.title, JSON.stringify(movie.genres), movie.year, movie.rating, movie.type);
    }
  });

  insertMany(movies);
};