const API_KEY = '210d6a5dd3f16419ce349c9f1b200d6d'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const STREAM_BASE_URL = 'https://vidsrc.xyz/embed/movie?tmdb=';

const mainContent = document.getElementById('main-content');
const videoGrid = document.getElementById('video-grid');
const searchInput = document.getElementById('search-input');
const pageTitle = document.getElementById('page-title');
const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menu-button');
const sidebarTexts = document.querySelectorAll('.sidebar-text');
const homeLogoButton = document.getElementById('home-logo-button');
const infiniteLoader = document.getElementById('infinite-loader');
const genreDropdownBtn = document.getElementById('genre-dropdown-btn');
const genreList = document.getElementById('genre-list');
const genreArrow = document.getElementById('genre-arrow');

const watchPage = document.getElementById('watch-page');
const watchIframe = document.getElementById('watch-iframe');
const movieDetails = document.getElementById('movie-details');
const recommendationsGrid = document.getElementById('recommendations-grid');
const recommendationTitle = document.getElementById('recommendation-title');

let currentPage = 1;
let totalPages = 1;
let currentApiUrl = '';
let isLoading = false;

function getFullApiUrl(baseUrl, page = 1) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}api_key=${API_KEY}&page=${page}`;
}

function showGridView() {
    watchPage.style.display = 'none';
    mainContent.style.display = 'block';
    watchIframe.src = ""; 
}

async function showWatchPage(movieId) {
    mainContent.style.display = 'none';
    watchPage.style.display = 'flex';
    mainContent.scrollTop = 0; 

    watchIframe.src = "about:blank";
    movieDetails.innerHTML = '<div class="loader mx-auto"></div>';
    recommendationsGrid.innerHTML = '<div class="loader mx-auto"></div>';

    watchIframe.src = `${STREAM_BASE_URL}${movieId}`;

    const movieData = await fetchMovieDetails(movieId);
    if (movieData) {
        await fetchRecommendations(movieId, movieData.genres);
    }
}

async function fetchMovies(url, title) {
    showGridView();
    videoGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;
    pageTitle.textContent = title;

    currentPage = 1;
    currentApiUrl = url;

    try {
        const fullUrl = getFullApiUrl(currentApiUrl, currentPage);
        const res = await fetch(fullUrl);
        const data = await res.json();
        totalPages = data.total_pages;
        displayMovies(data.results);
    } catch (error) {
        videoGrid.innerHTML = `<div class="col-span-full text-center text-red-500"><p>Failed to load movies.</p></div>`;
    }
}

async function fetchMoreMovies() {
    if (isLoading || currentPage >= totalPages) return;
    isLoading = true;
    infiniteLoader.style.display = 'flex';
    currentPage++;

    try {
        const fullUrl = getFullApiUrl(currentApiUrl, currentPage);
        const res = await fetch(fullUrl);
        const data = await res.json();
        appendMovies(data.results);
    } catch (error) {
        console.error("Failed to load more movies", error);
    } finally {
        isLoading = false;
        infiniteLoader.style.display = 'none';
    }
}

async function fetchAndDisplayGenres() {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        genreList.innerHTML = data.genres.map(genre => `
                    <a href="#" class="flex items-center p-2 mt-1 rounded-lg hover:bg-gray-800 category-link genre-link" data-genre-id="${genre.id}" data-genre-name="${genre.name}">
                        <span class="font-medium sidebar-text text-sm">${genre.name}</span>
                    </a>
                `).join('');

        document.querySelectorAll('.genre-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.category-link').forEach(l => l.classList.remove('bg-gray-800'));
                link.classList.add('bg-gray-800');
                const genreId = link.dataset.genreId;
                const genreName = link.dataset.genreName;
                const url = `${BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`;
                fetchMovies(url, `${genreName} Movies`);
                closeGenreDropdown();
            });
        });
    } catch (error) {
        console.error("Failed to load genres", error);
        genreList.innerHTML = `<p class="p-3 text-red-500 text-xs">Could not load genres.</p>`;
    }
}

async function fetchMovieDetails(movieId) {
    const url = `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        displayMovieDetails(data);
        return data;
    } catch (error) {
        movieDetails.innerHTML = `<p class="text-red-500">Could not load movie details.</p>`;
        return null;
    }
}

async function fetchRecommendations(movieId, genres) {
    const url = `${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}`;
    try {
        let res = await fetch(url);
        let data = await res.json();
        let isFallback = false;

        if (data.results.length === 0 && genres && genres.length > 0) {
            const firstGenreId = genres[0].id;
            recommendationTitle.textContent = `Similar in ${genres[0].name}`;
            const fallbackUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${firstGenreId}&sort_by=popularity.desc`;
            res = await fetch(fallbackUrl);
            data = await res.json();
            isFallback = true;
        } else {
            recommendationTitle.textContent = 'You may also like';
        }

        const filteredResults = isFallback ? data.results.filter(movie => movie.id != movieId) : data.results;
        displayRecommendations(filteredResults);

    } catch (error) {
        recommendationsGrid.innerHTML = `<p class="text-red-500">Could not load recommendations.</p>`;
    }
}

function displayMovies(movies) {
    videoGrid.innerHTML = '';
    if (movies.length === 0) {
        videoGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">No movies found.</p>`;
        return;
    }
    appendMovies(movies);
}

function appendMovies(movies) {
    const moviesHtml = movies.map(movie => createMovieCard(movie)).join('');
    videoGrid.insertAdjacentHTML('beforeend', moviesHtml);
    document.querySelectorAll('.movie-card').forEach(card => {
        if (!card.hasClickListener) {
            card.addEventListener('click', () => showWatchPage(card.dataset.movieId));
            card.hasClickListener = true;
        }
    });
}

function displayMovieDetails(data) {
    const genres = data.genres.map(genre => `<span class="bg-gray-800 px-2 py-1 rounded-md text-xs">${genre.name}</span>`).join(' ');
    movieDetails.innerHTML = `
                <h1 class="text-3xl font-bold text-white mb-2">${data.title}</h1>
                <div class="flex items-center space-x-4 mb-4 text-sm text-gray-400">
                    <span>${data.release_date.split('-')[0]}</span>
                    <span class="flex items-center">
                        <svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ${data.vote_average.toFixed(1)}
                    </span>
                    <span>${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m</span>
                </div>
                <div class="flex items-center space-x-2 mb-4">
                    ${genres}
                </div>
                <p class="text-gray-400 leading-relaxed">${data.overview}</p>
            `;
}

function displayRecommendations(movies) {
    if (movies.length === 0) {
        recommendationsGrid.innerHTML = `<p class="text-gray-500">No recommendations available.</p>`;
        return;
    }
    recommendationsGrid.innerHTML = movies.slice(0, 10).map(movie => {
        const { title, poster_path, backdrop_path, id, release_date, vote_average, overview } = movie;
        const imagePath = backdrop_path ? IMG_URL + backdrop_path : (poster_path ? IMG_URL + poster_path : 'https://placehold.co/320x180/0f0f0f/ffffff?text=N/A');
        const truncatedOverview = overview.length > 80 ? overview.substring(0, 80) + '...' : overview;
        return `
                <div class="flex items-start space-x-4 cursor-pointer p-2 rounded-lg recommendation-card" data-movie-id="${id}">
                    <img src="${imagePath}" alt="${title}" class="w-32 h-auto object-cover rounded-md aspect-video">
                    <div class="flex-1">
                        <h4 class="font-semibold text-white text-sm leading-tight">${title}</h4>
                        <p class="text-gray-400 text-xs mt-1">${release_date ? release_date.split('-')[0] : 'N/A'}</p>
                        <div class="flex items-center text-xs text-gray-400 mt-2">
                            <svg class="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            <span>${vote_average.toFixed(1)}</span>
                        </div>
                        <p class="text-gray-500 text-xs mt-2 leading-snug">${truncatedOverview}</p>
                    </div>
                </div>
                `;
    }).join('');
    document.querySelectorAll('.recommendation-card').forEach(card => {
        card.addEventListener('click', () => showWatchPage(card.dataset.movieId));
    });
}

function createMovieCard(movie) {
    const { title, poster_path, vote_average, id } = movie;
    const poster = poster_path ? IMG_URL + poster_path : 'https://placehold.co/500x750/0f0f0f/ffffff?text=No+Image';
    return `
            <div class="flex flex-col space-y-2 cursor-pointer movie-card" data-movie-id="${id}">
                <div class="relative overflow-hidden rounded-xl">
                    <img src="${poster}" alt="${title}" class="w-full h-auto object-cover rounded-xl aspect-[2/3]" onerror="this.src='https://placehold.co/500x750/0f0f0f/ffffff?text=Error';">
                    <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs font-bold px-2 py-1 rounded-full">${vote_average.toFixed(1)}</div>
                </div>
                <h3 class="text-md font-medium leading-snug text-gray-200 pt-2">${title}</h3>
            </div>`;
}

function closeGenreDropdown() {
    if (!genreList.style.maxHeight || genreList.style.maxHeight === '0px') return;
    genreArrow.classList.remove('rotate-180');
    genreList.style.maxHeight = '0px';
}

mainContent.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = mainContent;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
        fetchMoreMovies();
    }
});

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.trim();
    searchTimeout = setTimeout(() => {
        document.querySelectorAll('.category-link').forEach(l => l.classList.remove('bg-gray-800'));
        closeGenreDropdown();
        const url = searchTerm ? `${BASE_URL}/search/movie?query=${encodeURIComponent(searchTerm)}` : `${BASE_URL}/movie/popular`;
        const title = searchTerm ? `Results for "${searchTerm}"` : 'Popular Movies';
        fetchMovies(url, title);
    }, 500);
});

document.querySelectorAll('.category-link').forEach(link => {
    if (link.dataset.category) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.category-link').forEach(l => l.classList.remove('bg-gray-800'));
            link.classList.add('bg-gray-800');
            closeGenreDropdown();

            const category = link.dataset.category;
            let url;
            const title = `${link.textContent} Movies`;

            if (category === 'adult') {
                url = `${BASE_URL}/discover/movie?include_adult=true&sort_by=popularity.desc`;
            } else {
                url = `${BASE_URL}/movie/${category}`;
            }
            fetchMovies(url, title);
        });
    }
});

genreDropdownBtn.addEventListener('click', () => {
    genreArrow.classList.toggle('rotate-180');
    if (genreList.style.maxHeight && genreList.style.maxHeight !== '0px') {
        genreList.style.maxHeight = '0px';
    } else {
        genreList.style.maxHeight = genreList.scrollHeight + "px";
    }
});

homeLogoButton.addEventListener('click', () => {
    const popularLink = document.querySelector('.category-link[data-category="popular"]');
    popularLink.click();
});

let isSidebarCollapsed = false;
function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed;
    sidebar.classList.toggle('w-64', !isSidebarCollapsed); sidebar.classList.toggle('w-20', isSidebarCollapsed);
    sidebarTexts.forEach(text => text.classList.toggle('hidden', isSidebarCollapsed));
}
function setInitialSidebarState() {
    if (window.innerWidth < 1024) {
        if (!isSidebarCollapsed) toggleSidebar();
    }
}
menuButton.addEventListener('click', toggleSidebar);

document.addEventListener('DOMContentLoaded', () => {
    fetchMovies(`${BASE_URL}/movie/popular`, 'Popular Movies');
    fetchAndDisplayGenres();
    setInitialSidebarState();

});
