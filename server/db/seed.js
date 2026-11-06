import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOVIES_PATH = path.resolve(__dirname, '../../data/movies.json');

const genresList = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History",
  "Horror", "Music", "Mystery", "Romance", "Sci-Fi",
  "TV Movie", "Thriller", "War", "Western"
];

const directorsList = [
  "Christopher Nolan", "Quentin Tarantino", "Martin Scorsese", "Steven Spielberg",
  "Denis Villeneuve", "David Fincher", "Stanley Kubrick", "Francis Ford Coppola",
  "Ridley Scott", "Bong Joon Ho", "Hayao Miyazaki", "Greta Gerwig",
  "Wes Anderson", "Damien Chazelle", "Pooja Kumar", "Guillermo del Toro",
  "The Russo Brothers", "James Cameron", "Peter Jackson", "Tim Burton"
];

const baseTitles = [
  "The Shadow of", "Beyond the", "Echoes of", "Chronicles of", "The Last",
  "Secrets in", "Return to", "Mystery of", "Rise of", "Fall of",
  "Kingdom of", "Path of", "Guardians of", "Journey to", "Dreams of",
  "Legends of", "Visions of", "Operation:", "Project:", "Starlight"
];

const nounList = [
  "Tomorrow", "Infinity", "Eternity", "Galaxy", "Horizon",
  "Destiny", "Shadow", "Silence", "Storm", "Legacy",
  "Empire", "Revolution", "Paradox", "Symphony", "Citadel",
  "Labyrinth", "Oasis", "Genesis", "Matrix", "Solstice"
];

function generate500Movies() {
  const movies = [];
  const seenIds = new Set();

  // Hand-curated master list of top classics
  const classics = [
    { id: "tt0111161", title: "The Shawshank Redemption", year: 1994, type: "movie", genres: ["Drama"], rating: 9.3, poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", director: "Frank Darabont", overview: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.", tmdbId: 278 },
    { id: "tt0068646", title: "The Godfather", year: 1972, type: "movie", genres: ["Crime", "Drama"], rating: 9.2, poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", director: "Francis Ford Coppola", overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.", tmdbId: 238 },
    { id: "tt0071562", title: "The Godfather Part II", year: 1974, type: "movie", genres: ["Crime", "Drama"], rating: 9.0, poster: "https://image.tmdb.org/t/p/w500/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg", director: "Francis Ford Coppola", overview: "The early life and career of Vito Corleone in 1920s New York City is portrayed, while his son, Michael, expands and tightens his grip on the family crime syndicate.", tmdbId: 240 },
    { id: "tt0468569", title: "The Dark Knight", year: 2008, type: "movie", genres: ["Action", "Crime", "Drama"], rating: 9.0, poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", director: "Christopher Nolan", overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.", tmdbId: 155 },
    { id: "tt0110912", title: "Pulp Fiction", year: 1994, type: "movie", genres: ["Crime", "Drama"], rating: 8.9, poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbX.jpg", director: "Quentin Tarantino", overview: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.", tmdbId: 680 },
    { id: "tt0167260", title: "The Lord of the Rings: The Return of the King", year: 2003, type: "movie", genres: ["Adventure", "Drama", "Fantasy"], rating: 8.9, poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm4NUPOTrW.jpg", director: "Peter Jackson", overview: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.", tmdbId: 122 },
    { id: "tt0108052", title: "Schindler's List", year: 1993, type: "movie", genres: ["Biography", "Drama", "History"], rating: 8.9, poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHltYjU98CgXy9nMi.jpg", director: "Steven Spielberg", overview: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.", tmdbId: 424 },
    { id: "tt0167261", title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, type: "movie", genres: ["Adventure", "Drama", "Fantasy"], rating: 8.8, poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJI6vbzMc8fE6yC.jpg", director: "Peter Jackson", overview: "A young hobbit, Frodo, who has found the One Ring that belongs to the Dark Lord Sauron, begins his journey with eight companions to Mount Doom, the only place where it can be destroyed.", tmdbId: 120 },
    { id: "tt0137523", title: "Fight Club", year: 1999, type: "movie", genres: ["Drama"], rating: 8.8, poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", director: "David Fincher", overview: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.", tmdbId: 550 },
    { id: "tt0109830", title: "Forrest Gump", year: 1994, type: "movie", genres: ["Drama", "Romance"], rating: 8.8, poster: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", director: "Robert Zemeckis", overview: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.", tmdbId: 13 },
    { id: "tt0133093", title: "The Matrix", year: 1999, type: "movie", genres: ["Action", "Sci-Fi"], rating: 8.7, poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", director: "Lana Wachowski, Lilly Wachowski", overview: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.", tmdbId: 603 },
    { id: "tt0167259", title: "The Lord of the Rings: The Two Towers", year: 2002, type: "movie", genres: ["Adventure", "Drama", "Fantasy"], rating: 8.7, poster: "https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGnJYN9l.jpg", director: "Peter Jackson", overview: "While Frodo and Sam edge closer to Mordor with the help of the shifty Gollum, the divided fellowship makes a stand against Sauron's new ally, Saruman.", tmdbId: 121 },
    { id: "tt0080684", title: "Star Wars: Episode V - The Empire Strikes Back", year: 1980, type: "movie", genres: ["Action", "Adventure", "Fantasy", "Sci-Fi"], rating: 8.7, poster: "https://image.tmdb.org/t/p/w500/nNAeTmFm8N5v9Yh5Kq7UdL5YNtG.jpg", director: "Irvin Kershner", overview: "After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.", tmdbId: 1891 },
    { id: "tt0076759", title: "Star Wars", year: 1977, type: "movie", genres: ["Action", "Adventure", "Fantasy", "Sci-Fi"], rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg", director: "George Lucas", overview: "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle station.", tmdbId: 11 },
    { id: "tt0118799", title: "Life Is Beautiful", year: 1997, type: "movie", genres: ["Comedy", "Drama", "Romance"], rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/3OYC4P5PSumR5y2L7eQyJ4KQmzU.jpg", director: "Roberto Benigni", overview: "When an open-minded Jewish librarian and his son become victims of the Holocaust, he uses a perfect mixture of will, humor, and imagination to protect his son from the dangers around their camp.", tmdbId: 637 },
    { id: "tt0103064", title: "Terminator 2: Judgment Day", year: 1991, type: "movie", genres: ["Action", "Sci-Fi"], rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/7QhMKYvZBtUHgMVPwXM2Ue2BnRz.jpg", director: "James Cameron", overview: "A cyborg, identical to the one who failed to kill Sarah Connor, must now protect her teenage son, John Connor, from a more advanced and powerful cyborg.", tmdbId: 280 },
    { id: "tt0062622", title: "2001: A Space Odyssey", year: 1968, type: "movie", genres: ["Adventure", "Sci-Fi"], rating: 8.3, poster: "https://image.tmdb.org/t/p/w500/4gHKRgZckXBzUpkTm5wUG5qZsBk.jpg", director: "Stanley Kubrick", overview: "After discovering a mysterious artifact buried beneath the Lunar surface, mankind sets off on a quest to find its origins with help from intelligent supercomputer H.A.L. 9000.", tmdbId: 62 },
    { id: "tt0073195", title: "Jaws", year: 1975, type: "movie", genres: ["Adventure", "Thriller"], rating: 8.1, poster: "https://image.tmdb.org/t/p/w500/l1yltv9p8lbpVdHABWk0sYkqE6s.jpg", director: "Steven Spielberg", overview: "When a killer shark unleashes chaos on a beach community, a local sheriff, a marine biologist, and an old seafarer team up to hunt it down.", tmdbId: 578 },
    { id: "tt0107290", title: "Jurassic Park", year: 1993, type: "movie", genres: ["Adventure", "Sci-Fi"], rating: 8.2, poster: "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg", director: "Steven Spielberg", overview: "A pragmatic paleontologist visiting an almost complete theme park is tasked with protecting a couple of kids after a power failure causes the park's cloned dinosaurs to run loose.", tmdbId: 329 },
    { id: "tt0110357", title: "The Lion King", year: 1994, type: "movie", genres: ["Animation", "Adventure", "Drama", "Family", "Musical"], rating: 8.5, poster: "https://image.tmdb.org/t/p/w500/sKCr78MLSLry5Y9lG2eCVw3zQcO.jpg", director: "Roger Allers, Rob Minkoff", overview: "Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.", tmdbId: 8587 },
    { id: "tt0081505", title: "The Shining", year: 1980, type: "movie", genres: ["Drama", "Horror"], rating: 8.4, poster: "https://image.tmdb.org/t/p/w500/4fBLO3qSe7qvMqxB6R3q6x7p8QH.jpg", director: "Stanley Kubrick", overview: "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence.", tmdbId: 694 },
    { id: "tt0114369", title: "Se7en", year: 1995, type: "movie", genres: ["Crime", "Drama", "Mystery", "Thriller"], rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/6yoghtyTpZy86LzH5UPRCmPJv4w.jpg", director: "David Fincher", overview: "Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.", tmdbId: 807 },
    { id: "tt0095016", title: "Die Hard", year: 1988, type: "movie", genres: ["Action", "Thriller"], rating: 8.2, poster: "https://image.tmdb.org/t/p/w500/yF1V4qXHQkySX86GT3X8o6G5Jk4.jpg", director: "John McTiernan", overview: "An NYPD officer tries to save his wife and several others taken hostage by German terrorists during a Christmas party at the Nakatomi Plaza in Los Angeles.", tmdbId: 562 },
    { id: "tt0118715", title: "The Big Lebowski", year: 1998, type: "movie", genres: ["Comedy", "Crime"], rating: 8.1, poster: "https://image.tmdb.org/t/p/w500/qJ5nELAJ0kT84JdVVz8gZaV6MHi.jpg", director: "Joel Coen, Ethan Coen", overview: "Jeff 'The Dude' Lebowski, mistaken for a millionaire of the same name, seeks restitution for his ruined rug and enlists his bowling buddies to help get it.", tmdbId: 115 },
    { id: "tt0120689", title: "The Green Mile", year: 1999, type: "movie", genres: ["Crime", "Drama", "Fantasy", "Mystery"], rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/velWPhVMQeQKqd3KE7J6wJq3Pw5.jpg", director: "Frank Darabont", overview: "The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.", tmdbId: 497 }
  ];

  for (const c of classics) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      movies.push(c);
    }
  }

  // Generate up to 500 unique movies/shows
  let targetCount = 500;
  let counter = 1000;

  while (movies.length < targetCount) {
    counter++;
    const id = `tt${String(counter).padStart(7, '0')}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const titlePrefix = baseTitles[Math.floor(Math.random() * baseTitles.length)];
    const titleNoun = nounList[Math.floor(Math.random() * nounList.length)];
    const title = `${titlePrefix} ${titleNoun} ${counter}`;

    const year = 1970 + Math.floor(Math.random() * 55); // 1970 - 2025
    const type = Math.random() > 0.2 ? 'movie' : 'tv';

    // Pick 1-3 random genres
    const shuffledGenres = [...genresList].sort(() => 0.5 - Math.random());
    const genres = shuffledGenres.slice(0, 1 + Math.floor(Math.random() * 3));

    const rating = parseFloat((6.0 + Math.random() * 3.3).toFixed(1)); // 6.0 - 9.3
    const director = directorsList[Math.floor(Math.random() * directorsList.length)];

    const overviews = [
      "A thrilling adventure that unfolds across uncharted territories, testing the limits of human endurance and friendship.",
      "In a world on the brink of collapse, one extraordinary individual must rise to challenge the established order.",
      "An emotional journey of love, loss, and self-discovery set against the backdrop of a changing society.",
      "Detectives race against time to unravel a complex web of deceit before it's too late.",
      "A heartwarming tale of family bonds, unexpected laughter, and unforgettable moments."
    ];
    const overview = overviews[Math.floor(Math.random() * overviews.length)];
    const tmdbId = 10000 + counter;

    // Use a reliable default poster fallback or sample TMDB poster
    const posters = [
      "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbX.jpg",
      "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm4NUPOTrW.jpg",
      "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJI6vbzMc8fE6yC.jpg",
      "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
    ];
    const poster = posters[Math.floor(Math.random() * posters.length)];

    movies.push({
      id,
      title,
      year,
      type,
      genres,
      rating,
      poster,
      director,
      overview,
      tmdbId
    });
  }

  return movies;
}

const allMovies = generate500Movies();
fs.writeFileSync(MOVIES_PATH, JSON.stringify(allMovies, null, 2));
console.log(`Successfully generated and seeded ${allMovies.length} movies to ${MOVIES_PATH}`);
