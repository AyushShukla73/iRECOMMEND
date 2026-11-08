const API_BASE = '/api';

let state = {
  user: null,
  movies: [],
  currentPage: 1,
  loading: false,
  liked: new Set(),
  watchlater: new Set(),
  watched: new Set()
};

const sections = ['home', 'movies', 'tv', 'toprated', 'liked', 'watchlater', 'watched'];

function getCurrentRoute() {
  const hash = window.location.hash || '#/';
  return hash.slice(2) || 'home';
}

function navigateTo(path) {
  window.location.hash = path;
}

function showSection(sectionName) {
  // Hide all sections
  sections.forEach(sec => {
    const el = document.getElementById(`${sec}-section`);
    if (el) el.classList.add('hidden');
  });

  // Show target section
  const targetEl = document.getElementById(`${sectionName}-section`);
  if (targetEl) targetEl.classList.remove('hidden');

  updateActiveNav();
}

function initAuthModal() {
  // Create modal once on page load and toggle mode within it
  const existingModal = document.getElementById('auth-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.setAttribute('aria-describedby', 'auth-error');

  // Set initial mode to 'login'
  let currentMode = 'login';

  // Build the modal HTML with both forms toggled by CSS class
  modal.innerHTML = `
    <div class="modal-overlay" role="button" tabindex="0" onclick="toggleAuthModalMode()">
      <div class="modal-content">
        <span class="close-btn" id="close-modal" role="button">&times;</span>
        <h2 id="modal-title">Sign In</h2>

        <form id="auth-form" data-mode="login">
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" name="email" required>
          </div>

          <div class="form-group">
            <label for="auth-password">Password</label>
            <input type="password" id="auth-password" name="password" required minlength="6">
          </div>

          <button type="submit" id="auth-submit">Sign In</button>

          <input type="text" id="reg-username" name="username" style="display:none; visibility:hidden; height:0;" required minlength="3">
        </form>

        <div class="modal-switch">
          <p id="modal-switch-text">Don't have an account?</p>
          <a href="#" id="auth-switch" data-mode="register">Register</a>
        </div>

        <div id="auth-error" class="error-message hidden"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Attach event listeners
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }

  const authSwitch = document.getElementById('auth-switch');
  if (authSwitch) {
    authSwitch.addEventListener('click', toggleAuthModalMode);
  }

  const closeBtn = document.getElementById('close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }

  // Close modal when clicking outside the modal content
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal' || e.target.classList.contains('modal-overlay')) {
      closeAuthModal();
    }
  });
}

function toggleAuthModalMode() {
  const authForm = document.getElementById('auth-form');
  const authSwitch = document.getElementById('auth-switch');
  const modalSwitchText = document.getElementById('modal-switch-text');
  const authError = document.getElementById('auth-error');

  if (!authForm || !authSwitch) return;

  const currentMode = authForm.dataset.mode;

  if (currentMode === 'login') {
    // Switch to register mode
    authForm.dataset.mode = 'register';

    // Swap form fields: hide email/password-only fields, add username
    // The register form already has username field (hidden but present), just show relevant fields
    const submitBtn = document.getElementById('auth-submit');
    if (submitBtn) {
      submitBtn.textContent = 'Register';
    }

    authSwitch.textContent = 'Sign In';
    authSwitch.dataset.mode = 'login';
    if (modalSwitchText) {
      modalSwitchText.textContent = 'Already have an account?';
    }

    // Show username field (was hidden)
    const regUsername = document.getElementById('reg-username');
    if (regUsername) {
      regUsername.style.display = 'block';
      regUsername.style.visibility = 'visible';
      regUsername.style.height = 'auto';
    }

    // Hide password or keep it - register also needs password
    // The form already has password field for both modes, so just update UI

    // Show error if present
    if (authError) authError.classList.add('hidden');
  } else {
    // Switch to login mode
    authForm.dataset.mode = 'login';

    const submitBtn = document.getElementById('auth-submit');
    if (submitBtn) {
      submitBtn.textContent = 'Sign In';
    }

    authSwitch.textContent = 'Register';
    authSwitch.dataset.mode = 'register';
    if (modalSwitchText) {
      modalSwitchText.textContent = "Don't have an account?";
    }

    // Hide username field
    const regUsername = document.getElementById('reg-username');
    if (regUsername) {
      regUsername.style.display = 'none';
      regUsername.style.visibility = 'hidden';
      regUsername.style.height = '0';
    }

    // Show error if present
    if (authError) authError.classList.add('hidden');
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.remove();
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const mode = document.getElementById('auth-form').dataset.mode || 'login';
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('reg-username')?.value.trim();

  const endpoint = mode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;

  try {
    const body = mode === 'login' ? { email, password } : { email, password, username };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.success) {
      state.user = data.data.user;
      updateAuthUI();
      closeAuthModal();
      await loadUserData();
      renderPage(getCurrentRoute());
    } else {
      showAuthError(data.error?.message || 'Authentication failed');
    }
  } catch (error) {
    showAuthError('Connection error. Please try again.');
  }
}

function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function handleSwitchMode(e) {
  e.preventDefault();
  toggleAuthModalMode();
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (e) {
    // Ignore errors on logout
  }
  state.user = null;
  state.liked.clear();
  state.watchlater.clear();
  state.watched.clear();
  updateAuthUI();
}

async function loadMe() {
  try {
    const response = await fetch(`${API_BASE}/users/me`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      state.user = data.data.user;
      return true;
    }
  } catch (e) {
    // Not authenticated or error
  }
  return false;
}

async function loadUserData() {
  try {
    const response = await fetch(`${API_BASE}/users/me`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      const userData = data.data;

      state.liked = new Set(userData.likes ? userData.likes.map(String) : []);
      state.watchlater = new Set(userData.watchlater ? userData.watchlater.map(String) : []);
      state.watched = new Set(userData.watched ? userData.watched.map(String) : []);
    }
  } catch (e) {
    console.error('Error loading user data:', e);
  }
}

function getGridForRoute(route) {
  const gridMap = {
    'home': 'home-grid',
    'movies': 'movies-grid',
    'tv': 'tv-grid',
    'toprated': 'toprated-grid',
    'liked': 'liked-grid',
    'watchlater': 'watchlater-grid',
    'watched': 'watched-grid'
  };
  return document.getElementById(gridMap[route]);
}

async function fetchMovies(type = null, page = 1, sort = null) {
  const route = getCurrentRoute();
  const grid = getGridForRoute(route);

  if (grid) {
    grid.innerHTML = '<p class="loading">Loading movies...</p>';
  }

  try {
    let url;
    if (type === 'toprated') {
      url = `${API_BASE}/movies?sort=rating&limit=20`;
    } else if (type === 'movie') {
      url = `${API_BASE}/movies?type=movie&limit=20`;
    } else if (type === 'tv') {
      url = `${API_BASE}/movies?type=tv&limit=20`;
    } else {
      url = `${API_BASE}/movies?limit=20`;
    }

    const response = await fetch(url, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      const targetGrid = grid || getGridForRoute('home');
      renderMovies(targetGrid, data.data);
    } else {
      const targetGrid = grid || getGridForRoute('home');
      const errorMsg = data.error?.message || data.error || 'Failed to load movies';
      targetGrid.innerHTML = `<p class="error">Error: ${errorMsg}</p>`;
    }
  } catch (error) {
    const targetGrid = grid || getGridForRoute('home');
    targetGrid.innerHTML = '<p class="error">Connection error. Make sure the server is running.</p>';
  }
}

function renderMovies(grid, movies) {
  if (!grid) return;

  if (!movies || movies.length === 0) {
    grid.innerHTML = '<p class="loading">No movies found.</p>';
    return;
  }

  grid.innerHTML = movies.map(movie => {
    const movieId = String(movie.id);
    const isLiked = state.liked.has(movieId);
    const isWatchlater = state.watchlater.has(movieId);
    const isWatched = state.watched.has(movieId);

    const likeBtnClass = isLiked ? 'btn like active' : 'btn like';
    const watchlaterBtnClass = isWatchlater ? 'btn watchlater active' : 'btn watchlater';
    const watchedBtnClass = isWatched ? 'btn watched active' : 'btn watched';

    return `
      <div class="movie-card" data-id="${movieId}">
        <img src="${movie.poster || 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
        <div class="movie-info">
          <h3 class="movie-title">${movie.title} (${movie.year})</h3>
          <div class="movie-genres">
            ${movie.genres && movie.genres.length ? movie.genres.map(g => `<span class="genre-badge">${g}</span>`).join('') : ''}
          </div>
          <div class="movie-meta">
            <span class="movie-rating">${movie.rating ? '⭐ ' + movie.rating : 'N/A'}</span>
            <span class="movie-type">${movie.type || 'movie'}</span>
          </div>
          <div class="movie-actions">
            <button class="${likeBtnClass}" onclick="toggleLike('${movieId}', this)">${isLiked ? '❤️ Liked' : '♡ Like'}</button>
            <button class="${watchlaterBtnClass}" onclick="toggleWatchLater('${movieId}', this)">${isWatchlater ? '✓ Watch Later' : '⏰ Watch Later'}</button>
            <button class="${watchedBtnClass}" onclick="toggleWatched('${movieId}', this)">${isWatched ? '✓ Watched' : '👁️ Watched'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleLike(movieId, btn) {
  if (!state.user) {
    initAuthModal();
    return;
  }

  const isLiked = btn.classList.contains('active');
  const movieIdStr = String(movieId);

  try {
    const response = await fetch(`${API_BASE}/users/me/likes/${movieIdStr}`, {
      method: isLiked ? 'DELETE' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      if (isLiked) {
        state.liked.delete(movieIdStr);
      } else {
        state.liked.add(movieIdStr);
      }
      btn.classList.toggle('active', !isLiked);
      btn.textContent = !isLiked ? '❤️ Liked' : '♡ Like';
    }
  } catch (e) {
    console.error('Error toggling like:', e);
  }
}

async function toggleWatchLater(movieId, btn) {
  if (!state.user) {
    initAuthModal();
    return;
  }

  const isWatchlater = btn.classList.contains('active');
  const movieIdStr = String(movieId);

  try {
    const response = await fetch(`${API_BASE}/users/me/watchlater/${movieIdStr}`, {
      method: isWatchlater ? 'DELETE' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      if (isWatchlater) {
        state.watchlater.delete(movieIdStr);
      } else {
        state.watchlater.add(movieIdStr);
      }
      btn.classList.toggle('active', !isWatchlater);
      btn.textContent = !isWatchlater ? '✓ Watch Later' : '⏰ Watch Later';
    }
  } catch (e) {
    console.error('Error toggling watch later:', e);
  }
}

async function toggleWatched(movieId, btn) {
  if (!state.user) {
    initAuthModal();
    return;
  }

  const isWatched = btn.classList.contains('active');
  const movieIdStr = String(movieId);

  try {
    const response = await fetch(`${API_BASE}/users/me/watched/${movieIdStr}`, {
      method: isWatched ? 'DELETE' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      if (isWatched) {
        state.watched.delete(movieIdStr);
      } else {
        state.watched.add(movieIdStr);
      }
      btn.classList.toggle('active', !isWatched);
      btn.textContent = !isWatched ? '✓ Watched' : '👁️ Watched';
    }
  } catch (e) {
    console.error('Error toggling watched:', e);
  }
}

function updateActiveNav() {
  const route = getCurrentRoute();
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href) {
      const linkRoute = href.startsWith('#/') ? href.slice(2) : href;
      if (linkRoute === route) {
        link.classList.add('active');
      }
    }
  });
}

async function loadLikedMovies() {
  const grid = getGridForRoute('liked');
  if (!grid) return;

  if (state.liked.size === 0) {
    grid.innerHTML = '<p class="loading">No movies liked yet. Start liking movies!</p>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/movies`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      const likedMovies = data.data.filter(m => state.liked.has(String(m.id)));
      renderMovies(grid, likedMovies);
    } else {
      grid.innerHTML = '<p class="error">Failed to load liked movies.</p>';
    }
  } catch (e) {
    grid.innerHTML = '<p class="error">Connection error loading liked movies.</p>';
  }
}

async function loadWatchLaterMovies() {
  const grid = getGridForRoute('watchlater');
  if (!grid) return;

  if (state.watchlater.size === 0) {
    grid.innerHTML = '<p class="loading">Your watch later list is empty. Add movies to watch later!</p>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/movies`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      const watchlaterMovies = data.data.filter(m => state.watchlater.has(String(m.id)));
      renderMovies(grid, watchlaterMovies);
    } else {
      grid.innerHTML = '<p class="error">Failed to load watch later list.</p>';
    }
  } catch (e) {
    grid.innerHTML = '<p class="error">Connection error loading watch later list.</p>';
  }
}

async function loadWatchedMovies() {
  const grid = getGridForRoute('watched');
  if (!grid) return;

  if (state.watched.size === 0) {
    grid.innerHTML = '<p class="loading">Your watched list is empty. Start watching movies!</p>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/movies`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      const watchedMovies = data.data.filter(m => state.watched.has(String(m.id)));
      renderMovies(grid, watchedMovies);
    } else {
      grid.innerHTML = '<p class="error">Failed to load watched list.</p>';
    }
  } catch (e) {
    grid.innerHTML = '<p class="error">Connection error loading watched list.</p>';
  }
}

function renderPage(route) {
  showSection(route);

  setTimeout(() => {
    observeMovieCards();
  }, 50);

  switch (route) {
    case 'home':
      fetchMovies();
      break;
    case 'movies':
      fetchMovies('movie');
      break;
    case 'tv':
      fetchMovies('tv');
      break;
    case 'toprated':
      fetchMovies('toprated');
      break;
    case 'liked':
      loadLikedMovies();
      break;
    case 'watchlater':
      loadWatchLaterMovies();
      break;
    case 'watched':
      loadWatchedMovies();
      break;
    default:
      fetchMovies();
  }
}

function handleNavClick(e) {
  e.preventDefault();
  const href = e.currentTarget.getAttribute('href');
  navigateTo(href.slice(1));
}

function handleHashChange() {
  renderPage(getCurrentRoute());
}

function updateAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) return;

  if (state.user) {
    loginBtn.classList.add('active');
    loginBtn.textContent = state.user.username;
    loginBtn.dataset.mode = 'logout';
  } else {
    loginBtn.classList.remove('active');
    loginBtn.textContent = 'Sign In';
    delete loginBtn.dataset.mode;
  }
}

// Theme toggle functionality
function initThemeToggle() {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.add(currentTheme);

  // Add theme toggle button if not exists
  if (!document.getElementById('theme-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'theme-toggle';
    toggleBtn.className = 'theme-toggle';
    toggleBtn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    document.querySelector('.nav').appendChild(toggleBtn);
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';

  body.classList.remove('dark', 'light');
  body.classList.add(newTheme);
  localStorage.setItem('theme', newTheme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
  }
}

function observeMovieCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px 50px 0px'
  });

  document.querySelectorAll('.movie-card').forEach(card => {
    observer.observe(card);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  updateActiveNav();

  const isAuth = await loadMe();
  if (isAuth) {
    await loadUserData();
  }

  renderPage(getCurrentRoute());
  observeMovieCards();

  window.addEventListener('hashchange', handleHashChange);

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', handleNavClick);
  });

  const loginBtn = document.getElementById('login-btn');
  loginBtn.addEventListener('click', async (e) => {
    if (loginBtn.dataset.mode === 'logout') {
      logout();
      renderPage('home');
    } else {
      initAuthModal();
      // If modal is already open and we're switching to login mode, ensure login form is shown
      setTimeout(() => {
        const mode = document.getElementById('auth-form')?.dataset.mode;
        if (mode !== 'login') {
          toggleAuthModalMode();
        }
      }, 10);
    }
  });
});