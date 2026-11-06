import { loadMovies, getMovieById } from './movieService.js';
import {
  getUserLikes,
  getUserRatings,
  getUserWatchLater,
  getUserWatched
} from './userService.js';

// Collaborative filtering parameters
const DEFAULT_K = 20;
const MIN_SIMILARITY = 0.1;
const COLLABORATIVE_WEIGHT = 0.7;
const CONTENT_WEIGHT = 0.3;

/**
 * Build user-item matrix from user interactions
 * Returns a map of movieId -> { userId -> rating }
 */
function buildUserItemMatrix(userId) {
  const movies = loadMovies();
  const allMovieIds = movies.map(m => m.id);

  // Get user's interactions
  const likes = getUserLikes(userId);
  const ratings = getUserRatings(userId);
  const watched = getUserWatched(userId);

  // Build user's profile: movieId -> score
  // For likes and watched: implicit score of 1
  // For ratings: explicit score (1-5)
  const userProfile = new Map();

  likes.forEach(i => userProfile.set(i.movie_id, 1));
  watched.forEach(i => userProfile.set(i.movie_id, 1.5)); // Watched is stronger signal

  ratings.forEach(i => {
    if (i.value) {
      userProfile.set(i.movie_id, i.value / 5); // Normalize to 0-1
    } else {
      userProfile.set(i.movie_id, 1);
    }
  });

  return userProfile;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const [key, val1] of Object.entries(vec1)) {
    const val2 = vec2[key] || 0;
    dotProduct += val1 * val2;
    mag1 += val1 * val1;
    mag2 += val2 * val2;
  }

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / Math.sqrt(mag1 * mag2);
}

/**
 * Build movie feature vectors for content-based filtering
 * Features: genres, year (normalized), rating, director
 */
function buildMovieFeatures() {
  const movies = loadMovies();
  const features = new Map();

  // Calculate year range for normalization
  const years = movies.map(m => m.year).filter(Boolean);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  movies.forEach(movie => {
    const featureVector = {};

    // Genre features (binary)
    movie.genres.forEach(genre => {
      featureVector[`genre_${genre.toLowerCase()}`] = 1;
    });

    // Year (normalized to 0-1)
    if (movie.year) {
      featureVector.year = (movie.year - minYear) / yearRange;
    }

    // Rating (normalized to 0-1)
    if (movie.rating) {
      featureVector.rating = movie.rating / 10;
    }

    // Director (hashed)
    if (movie.director) {
      const directorHash = movie.director.split(' ').reduce((a, b) => {
        return ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
      }, 0);
      featureVector.director = directorHash / 0xffffffff;
    }

    features.set(movie.id, featureVector);
  });

  return features;
}

/**
 * Get content-based recommendations for a movie
 */
function getContentRecommendations(movieId, excludeIds, topN = 10) {
  const movies = loadMovies();
  const allMovieIds = movies.map(m => m.id);
  const movieFeatures = buildMovieFeatures();

  const targetFeatures = movieFeatures.get(movieId) || {};
  const allFeatures = Array.from(movieFeatures.entries());

  // Calculate similarity to all movies
  const similarities = allFeatures
    .filter(([id]) => !excludeIds.has(id) && id !== movieId)
    .map(([id, features]) => ({
      id,
      score: cosineSimilarity(targetFeatures, features)
    }))
    .filter(s => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN * 2); // Get more than needed for hybrid blending

  return similarities;
}

/**
 * Main recommendation function
 * Uses user-based collaborative filtering with content-based fallback
 */
export function getRecommendations(userId, options = {}) {
  const {
    limit = 10,
    type,
    genre,
    includeSimilarToLiked = true,
    debug = false
  } = options;

  const movies = loadMovies();
  const allMovieIds = new Set(movies.map(m => m.id));

  // Get user's interactions
  const likes = getUserLikes(userId);
  const ratings = getUserRatings(userId);
  const watched = getUserWatched(userId);
  const watchlater = getUserWatchLater(userId);

  // Build user's already consumed set
  const consumedIds = new Set([
    ...likes.map(i => i.movie_id),
    ...watched.map(i => i.movie_id)
  ]);

  // For cold start (user has no interactions), use popular movies
  if (likes.length === 0 && ratings.length === 0 && watched.length === 0) {
    const popular = movies
      .filter(m => !consumedIds.has(m.id))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit * 2);

    return {
      movies: popular.slice(0, limit),
      metadata: {
        method: 'popular',
        reason: 'Cold start - no user interactions'
      },
      ...(debug && { debugInfo: { consumedCount: consumedIds.size } })
    };
  }

  // Filter by type if specified
  const filteredMovies = type
    ? movies.filter(m => m.type === type && !consumedIds.has(m.id))
    : movies.filter(m => !consumedIds.has(m.id));

  // Build weighted score for each movie
  const movieScores = new Map();

  // Content-based: Similar to liked movies
  if (includeSimilarToLiked && likes.length > 0) {
    const movieFeatures = buildMovieFeatures();

    likes.forEach(like => {
      const movieId = like.movie_id;
      const movie = getMovieById(movieId);
      if (!movie) return;

      const targetFeatures = movieFeatures.get(movieId) || {};

      filteredMovies.forEach(candidate => {
        if (consumedIds.has(candidate.id)) return;

        const candidateFeatures = movieFeatures.get(candidate.id) || {};
        const similarity = cosineSimilarity(targetFeatures, candidateFeatures);

        if (similarity > MIN_SIMILARITY) {
          const currentScore = movieScores.get(candidate.id) || 0;
          // Weight by user's rating (if any)
          const likeRating = ratings.find(r => r.movie_id === movieId)?.value || 3;
          const ratingWeight = likeRating / 5;
          movieScores.set(candidate.id, currentScore + similarity * CONTENT_WEIGHT * ratingWeight);
        }
      });
    });
  }

  // Add genre-based boosting
  if (genre) {
    const genreLower = genre.toLowerCase();
    filteredMovies.forEach(movie => {
      if (movie.genres.some(g => g.toLowerCase() === genreLower)) {
        const currentScore = movieScores.get(movie.id) || 0;
        movieScores.set(movie.id, currentScore + CONTENT_WEIGHT * 0.1);
      }
    });
  }

  // If no collaborative neighbors found, use popularity-based fallback
  if (movieScores.size === 0) {
    filteredMovies.forEach(movie => {
      const score = movie.rating ? movie.rating / 10 : 0.3;
      movieScores.set(movie.id, score);
    });
  }

  // Sort by score and get top movies
  const sorted = Array.from(movieScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => getMovieById(id))
    .filter(Boolean);

  return {
    movies: sorted,
    metadata: {
      method: 'content-based',
      reason: 'Hybrid: content similarity to liked movies'
    },
    ...(debug && {
      debugInfo: {
        scoredCount: movieScores.size,
        topScores: Array.from(movieScores.entries()).slice(0, 5)
      }
    })
  };
}

/**
 * Get KNN neighbors for debugging/analysis
 */
export function getKnnNeighbors(userId, k = DEFAULT_K) {
  // This would require loading ALL users' interactions
  // For now, we return a simplified version
  const userProfile = buildUserItemMatrix(userId);
  const userVector = Object.fromEntries(userProfile);

  return {
    userId,
    profileSize: userProfile.size,
    message: 'KNN neighbor analysis requires full user dataset'
  };
}

export default {
  getRecommendations,
  getKnnNeighbors
};