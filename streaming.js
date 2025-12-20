// --- API Configuration ---
const API_KEY = '210d6a5dd3f16419ce349c9f1b200d6d'; // Public TMDB read-only key
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const STREAM_PROVIDERS = [
    {
        name: 'Server 1',
        id: 'vidsrcvip',
        getUrl: (type, id, s, e) => {
            if (type === 'movie') return `https://vidsrc.vip/embed/movie/${id}`;
            return `https://vidsrc.vip/embed/tv/${id}/${s}/${e}`;
        }
    },

    {
        name: 'Server 2',
        id: 'vidlink',
        getUrl: (type, id, s, e) => {
            if (type === 'movie') return `https://vidlink.pro/movie/${id}`;
            return `https://vidlink.pro/tv/${id}/${s}/${e}`;
        }
    },
    {
        name: 'Server 3',
        id: 'vidsrcme',
        getUrl: (type, id, s, e) => {
            if (type === 'movie') return `https://vidsrc.me/embed/movie?tmdb=${id}`;
            return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
        }
    },
    {
        name: 'Server 4',
        id: 'vidsrc1',
        getUrl: (type, id, s, e) => {
            if (type === 'movie') return `https://vidsrc.xyz/embed/movie?tmdb=${id}`;
            return `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
        }
    }
];

const STREAM_BASE_URLS = {
    movie: 'https://vidsrc.xyz/embed/movie?tmdb=',
    tv: 'https://vidsrc.xyz/embed/tv?tmdb='
};

// --- IPTV API Configuration ---
const IPTV_API = {
    channels: 'https://iptv-org.github.io/api/channels.json',
    countries: 'https://iptv-org.github.io/api/countries.json',
    languages: 'https://iptv-org.github.io/api/languages.json',
    streams: 'https://iptv-org.github.io/api/streams.json',
    categories: 'https://iptv-org.github.io/api/categories.json',
    logos: 'https://iptv-org.github.io/api/logos.json'
};

// --- Radio Browser API Configuration ---
// Using multiple servers for fallback
const RADIO_API_SERVERS = [
    'https://all.api.radio-browser.info',
    'https://fi1.api.radio-browser.info',
    'https://fr1.api.radio-browser.info'
];
let currentRadioServer = RADIO_API_SERVERS[0];

// --- IPTV State ---
let iptvChannels = [];
let iptvCountries = [];
let iptvLanguages = [];
let iptvStreams = [];
let iptvCategories = [];
let selectedCountry = '';
let selectedCategory = '';
let iptvSearchQuery = '';
let isLiveTVMode = false;

// --- Radio State ---
let radioStations = [];
let radioCountries = [];
let selectedRadioCountry = '';
let radioSearchQuery = '';
let isRadioMode = false;

// --- Fuzzy Search Helper ---
function fuzzyMatch(str, query) {
    if (!query) return true;
    if (!str) return false;

    str = str.toLowerCase();
    query = query.toLowerCase();

    // Direct contains match
    if (str.includes(query)) return true;

    // Calculate similarity using Levenshtein-like approach
    const strWords = str.split(/\s+/);

    for (const word of strWords) {
        // Check if query is similar to any word in the string
        const similarity = calculateSimilarity(word, query);
        if (similarity >= 0.6) return true; // 60% match threshold
    }

    return false;
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Simple character matching approach for performance
    let matches = 0;
    const shorterChars = shorter.split('');
    const longerChars = longer.split('');

    for (let i = 0; i < shorterChars.length; i++) {
        if (longerChars.includes(shorterChars[i])) {
            matches++;
            // Remove matched char to prevent double counting
            const idx = longerChars.indexOf(shorterChars[i]);
            longerChars.splice(idx, 1);
        }
    }

    return matches / longer.length;
}

// --- DOM Elements ---
const mainContent = document.getElementById('main-content');
const mediaGrid = document.getElementById('media-grid');
const searchInput = document.getElementById('search-input');
const pageTitle = document.getElementById('page-title');
const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menu-button');
const homeLogoButton = document.getElementById('home-logo-button');
const infiniteLoader = document.getElementById('infinite-loader');
const genreDropdownBtn = document.getElementById('genre-dropdown-btn');
const genreList = document.getElementById('genre-list');
const genreArrow = document.getElementById('genre-arrow');
const overlay = document.getElementById('overlay');
const watchPage = document.getElementById('watch-page');
const watchIframe = document.getElementById('watch-iframe');
const mediaDetails = document.getElementById('media-details');
const recommendationsGrid = document.getElementById('recommendations-grid');
const recommendationTitle = document.getElementById('recommendation-title');

const tvSeasonSelector = document.getElementById('tv-season-selector');
const serverContainer = document.getElementById('server-container');

// --- App State ---
let currentPage = 1, totalPages = 1, currentApiUrl = '', currentMediaType = 'movie', isLoading = false;
let currentProvider = STREAM_PROVIDERS[0];
let currentSeason = 1;
let currentEpisode = 1;

// --- URL State Management ---
function updateUrlState(mediaId, mediaType, season = null, episode = null) {
    let hash = `#${mediaType}/${mediaId}`;
    if (mediaType === 'tv' && season && episode) {
        hash += `/${season}/${episode}`;
    }
    history.pushState({ mediaId, mediaType, season, episode }, '', hash);
}

function clearUrlState() {
    history.pushState(null, '', window.location.pathname);
}

function getStateFromUrl() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return null;
    const parts = hash.split('/');
    return {
        mediaType: parts[0] || null,
        mediaId: parts[1] || null,
        season: parts[2] || null,
        episode: parts[3] || null
    };
}

// --- API & View Management ---
function getFullApiUrl(baseUrl, page = 1) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}api_key=${API_KEY}&page=${page}`;
}

// Home page category configuration
const HOME_CATEGORIES = [
    { title: 'Hindi Movies', url: `${BASE_URL}/discover/movie?with_original_language=hi&sort_by=popularity.desc`, type: 'movie' },
    { title: 'Top Rated Movies', url: `${BASE_URL}/movie/top_rated`, type: 'movie' },
    { title: 'Upcoming Movies', url: `${BASE_URL}/movie/upcoming`, type: 'movie' },
    { title: 'Popular TV Shows', url: `${BASE_URL}/tv/popular`, type: 'tv' },
    { title: 'Top Rated TV Shows', url: `${BASE_URL}/tv/top_rated`, type: 'tv' },
    { title: 'Airing Today', url: `${BASE_URL}/tv/airing_today`, type: 'tv' }
];

let isHomePage = false;

async function showHomePage() {
    isLiveTVMode = false;
    isHomePage = true;

    // Hide IPTV filters
    const filtersContainer = document.getElementById('iptv-filters');
    if (filtersContainer) {
        filtersContainer.style.display = 'none';
    }

    showGridView();
    pageTitle.textContent = '';
    mediaGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;

    // Fetch all categories in parallel
    try {
        const categoryPromises = HOME_CATEGORIES.map(async (category) => {
            const url = getFullApiUrl(category.url, 1);
            const res = await fetch(url);
            const data = await res.json();
            return { ...category, results: data.results.slice(0, 10) };
        });

        const categories = await Promise.all(categoryPromises);

        // Render all category rows
        mediaGrid.innerHTML = categories.map((category, index) => `
            <div class="col-span-full mb-6">
                <div class="flex justify-between items-center mb-3 px-1">
                    <h3 class="text-lg sm:text-xl font-bold text-white">${category.title}</h3>
                    <button class="view-more-btn text-sm text-red-400 hover:text-red-300 transition-colors" 
                            data-category-index="${index}">
                        View More →
                    </button>
                </div>
                <div class="relative">
                    <div class="flex overflow-x-auto gap-3 pb-3 no-scrollbar">
                        ${category.results.map(item => createHorizontalCard(item, category.type)).join('')}
                    </div>
                    <div class="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-[#0f0f0f] to-transparent pointer-events-none hidden lg:block"></div>
                </div>
            </div>
        `).join('');

        // Add click handlers for movie cards
        mediaGrid.querySelectorAll('.home-card').forEach(card => {
            card.addEventListener('click', () => {
                const mediaId = card.dataset.mediaId;
                const type = card.dataset.mediaType;
                showWatchPage(mediaId, type);
            });
        });

        // Add click handlers for View More buttons
        mediaGrid.querySelectorAll('.view-more-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.categoryIndex);
                const category = categories[index];
                fetchMedia(category.url, category.title, category.type);
            });
        });

    } catch (error) {
        console.error('Failed to load home page:', error);
        mediaGrid.innerHTML = `<div class="col-span-full text-center text-red-500"><p>Failed to load content.</p></div>`;
    }
}

function createHorizontalCard(item, mediaType) {
    const title = item.title || item.name;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://placehold.co/500x750/0f0f0f/ffffff?text=No+Image';
    return `
        <div class="home-card flex-shrink-0 w-32 sm:w-40 cursor-pointer group" data-media-id="${item.id}" data-media-type="${mediaType}">
            <div class="relative overflow-hidden rounded-lg shadow-lg">
                <img src="${poster}" alt="${title}" class="w-full h-auto object-cover aspect-[2/3] group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://placehold.co/500x750/0f0f0f/ffffff?text=Error';">
                <div class="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</div>
            </div>
            <h4 class="text-xs sm:text-sm font-medium text-gray-200 mt-2 line-clamp-2">${title}</h4>
        </div>
    `;
}


async function fetchMedia(url, title, mediaType) {
    isLiveTVMode = false;
    isHomePage = false;
    // Hide IPTV filters when switching to movie/TV mode
    const filtersContainer = document.getElementById('iptv-filters');
    if (filtersContainer) {
        filtersContainer.style.display = 'none';
    }
    showGridView();
    mediaGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;
    pageTitle.textContent = title;
    currentPage = 1;
    currentApiUrl = url;
    currentMediaType = mediaType;
    try {
        const fullUrl = getFullApiUrl(currentApiUrl, currentPage);
        const res = await fetch(fullUrl);
        const data = await res.json();
        totalPages = data.total_pages;
        displayMedia(data.results, mediaType);
    } catch (error) {
        mediaGrid.innerHTML = `<div class="col-span-full text-center text-red-500"><p>Failed to load content.</p></div>`;
    }
}

async function fetchMoreMedia() {
    // Don't load more movies when in Live TV mode
    if (isLiveTVMode) return;
    if (isLoading || currentPage >= totalPages) return;
    isLoading = true;
    infiniteLoader.style.display = 'flex';
    currentPage++;
    try {
        const fullUrl = getFullApiUrl(currentApiUrl, currentPage);
        const res = await fetch(fullUrl);
        const data = await res.json();
        appendMedia(data.results, currentMediaType);
    } catch (error) {
        console.error("Failed to load more content", error);
    } finally {
        isLoading = false;
        infiniteLoader.style.display = 'none';
    }
}

function showGridView() {
    watchPage.style.display = 'none';
    mainContent.style.display = 'block';
    watchIframe.src = ""; // Stop video playback
    clearUrlState(); // Clear URL hash when going back to grid
}

async function showWatchPage(mediaId, mediaType, restoreSeason = null, restoreEpisode = null) {
    mainContent.style.display = 'none';
    watchPage.style.display = 'block';
    watchPage.scrollTop = 0;
    watchIframe.src = "about:blank";
    mediaDetails.innerHTML = '<div class="loader mx-auto"></div>';
    recommendationsGrid.innerHTML = '<div class="loader mx-auto"></div>';
    tvSeasonSelector.style.display = 'none';
    tvSeasonSelector.innerHTML = '';

    // Reset state
    currentSeason = restoreSeason ? parseInt(restoreSeason) : 1;
    currentEpisode = restoreEpisode ? parseInt(restoreEpisode) : 1;

    // Render Server Selector
    renderServerSelector(mediaId, mediaType);

    // Initial Load
    updateVideoSource(mediaId, mediaType);
    updateUrlState(mediaId, mediaType, mediaType === 'tv' ? currentSeason : null, mediaType === 'tv' ? currentEpisode : null);

    const mediaData = await fetchMediaDetails(mediaId, mediaType);
    if (mediaData) {
        if (mediaType === 'tv') {
            displaySeasonSelector(mediaData, mediaId, currentSeason, currentEpisode);
        }
        await fetchRecommendations(mediaId, mediaType, mediaData.genres);
    }
}

function renderServerSelector(mediaId, mediaType) {
    serverContainer.innerHTML = `
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <span class="text-xs sm:text-sm text-gray-400 font-medium whitespace-nowrap">Switch Server:</span>
            ${STREAM_PROVIDERS.map(provider => `
                <button 
                    class="server-btn px-3 py-1.5 rounded-full text-xs sm:text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-transparent whitespace-nowrap transition-all ${provider.id === currentProvider.id ? 'bg-red-600 text-white border-red-500' : ''}"
                    data-id="${provider.id}">
                    ${provider.name}
                </button>
            `).join('')}
        </div>
    `;

    serverContainer.querySelectorAll('.server-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const providerId = btn.dataset.id;
            currentProvider = STREAM_PROVIDERS.find(p => p.id === providerId);

            // Update UI active state
            serverContainer.querySelectorAll('.server-btn').forEach(b => {
                b.classList.remove('bg-red-600', 'text-white', 'border-red-500');
                b.classList.add('bg-gray-800', 'text-gray-300');
            });
            btn.classList.remove('bg-gray-800', 'text-gray-300');
            btn.classList.add('bg-red-600', 'text-white', 'border-red-500');

            updateVideoSource(mediaId, mediaType);
        });
    });
}

function updateVideoSource(mediaId, mediaType) {
    const url = currentProvider.getUrl(mediaType, mediaId, currentSeason, currentEpisode);
    watchIframe.src = url;
}

async function fetchMediaDetails(mediaId, mediaType) {
    const url = `${BASE_URL}/${mediaType}/${mediaId}?api_key=${API_KEY}&append_to_response=credits,production_countries`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        displayMediaDetails(data);
        return data;
    } catch (error) {
        mediaDetails.innerHTML = `<p class="text-red-500">Could not load details.</p>`;
        return null;
    }
}

async function fetchRecommendations(mediaId, mediaType, genres) {
    const url = `${BASE_URL}/${mediaType}/${mediaId}/recommendations?api_key=${API_KEY}`;
    try {
        let res = await fetch(url);
        let data = await res.json();
        if (data.results.length === 0 && genres && genres.length > 0) {
            const firstGenreId = genres[0].id;
            recommendationTitle.textContent = `Similar in ${genres[0].name}`;
            const fallbackUrl = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&with_genres=${firstGenreId}&sort_by=popularity.desc`;
            res = await fetch(fallbackUrl);
            data = await res.json();
            const filteredResults = data.results.filter(item => item.id != mediaId);
            displayRecommendations(filteredResults, mediaType);
        } else {
            recommendationTitle.textContent = 'You may also like';
            displayRecommendations(data.results, mediaType);
        }
    } catch (error) {
        recommendationsGrid.innerHTML = `<p class="text-red-500">Could not load recommendations.</p>`;
    }
}

async function fetchAndDisplayGenres() {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        genreList.innerHTML = data.genres.map(genre =>
            `<a href="#" class="flex items-center p-2 mt-1 rounded-lg hover:bg-gray-800 category-link genre-link" data-genre-id="${genre.id}" data-genre-name="${genre.name}">
                <span class="font-medium text-sm">${genre.name}</span>
            </a>`
        ).join('');
        document.querySelectorAll('.genre-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                handleCategoryClick(link);
                const genreId = link.dataset.genreId;
                const genreName = link.dataset.genreName;
                const url = `${BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`;
                fetchMedia(url, `${genreName} Movies`, 'movie');
            });
        });
    } catch (error) {
        genreList.innerHTML = `<p class="p-3 text-red-500 text-xs">Could not load genres.</p>`;
    }
}


// --- UI Display Functions ---

function displayMedia(mediaItems, mediaType) {
    mediaGrid.innerHTML = '';
    // Filter out people from search results, if any
    const validMedia = mediaItems.filter(item => item.media_type !== 'person');
    if (validMedia.length === 0) {
        mediaGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">No results found.</p>`;
        return;
    }
    appendMedia(validMedia, mediaType);
}

function appendMedia(mediaItems, mediaType) {
    // Don't append movies when in Live TV mode
    if (isLiveTVMode) return;

    const mediaHtml = mediaItems.map(item => createMediaCard(item, item.media_type || mediaType)).join('');
    mediaGrid.insertAdjacentHTML('beforeend', mediaHtml);
    document.querySelectorAll('.media-card').forEach(card => {
        if (!card.hasClickListener) {
            card.addEventListener('click', () => {
                const mediaId = card.dataset.mediaId;
                const type = card.dataset.mediaType;
                showWatchPage(mediaId, type);
            });
            card.hasClickListener = true;
        }
    });
}

function createMediaCard(item, mediaType) {
    const title = item.title || item.name;
    const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://placehold.co/500x750/0f0f0f/ffffff?text=No+Image';
    return `
        <div class="flex flex-col cursor-pointer media-card group" data-media-id="${item.id}" data-media-type="${mediaType}">
            <div class="relative overflow-hidden rounded-md sm:rounded-lg shadow-lg">
                <img src="${poster}" alt="${title}" class="w-full h-auto object-cover aspect-[2/3] group-hover:opacity-90 transition-opacity" onerror="this.src='https://placehold.co/500x750/0f0f0f/ffffff?text=Error';">
                <div class="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black bg-opacity-80 text-white text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">${item.vote_average.toFixed(1)}</div>
            </div>
            <h3 class="text-xs sm:text-sm md:text-base font-medium leading-tight text-gray-200 mt-1.5 sm:mt-2 line-clamp-2">${title}</h3>
        </div>`;
}

function displayMediaDetails(data) {
    const title = data.title || data.name;
    const releaseDate = data.release_date || data.first_air_date;
    const year = releaseDate ? releaseDate.split('-')[0] : 'N/A';
    const country = data.production_countries && data.production_countries.length > 0 ? data.production_countries[0].name : '';
    const genres = data.genres.map(genre => `<span class="bg-gray-800 px-2 py-1 rounded-md text-xs">${genre.name}</span>`).join(' ');

    mediaDetails.innerHTML = `
        <h1 class="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-2">${title}</h1>
        <div class="flex items-center flex-wrap gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm text-gray-400">
            <span class="flex items-center">
                <svg class="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                ${data.vote_average.toFixed(1)}
            </span>
            <span>${year}</span>
            ${country ? `<span>${country}</span>` : ''}
        </div>
        <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">${genres}</div>
        <p class="text-xs sm:text-sm text-gray-400 leading-relaxed">${data.overview}</p>
    `;
}

function displayRecommendations(mediaItems, mediaType) {
    if (mediaItems.length === 0) {
        recommendationsGrid.innerHTML = `<p class="text-gray-500 text-sm">No recommendations available.</p>`;
        return;
    }
    recommendationsGrid.innerHTML = mediaItems.slice(0, 10).map(item => {
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date;
        const year = releaseDate ? releaseDate.split('-')[0] : 'N/A';
        const imagePath = item.backdrop_path ? IMG_URL + item.backdrop_path : (item.poster_path ? IMG_URL + item.poster_path : 'https://placehold.co/320x180/0f0f0f/ffffff?text=N/A');

        return `
            <div class="flex items-start space-x-2 sm:space-x-3 cursor-pointer p-1.5 sm:p-2 rounded-lg recommendation-card hover:bg-gray-800" data-media-id="${item.id}" data-media-type="${mediaType}">
                <img src="${imagePath}" alt="${title}" class="w-24 sm:w-28 md:w-32 flex-shrink-0 h-auto object-cover rounded-md aspect-video">
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-white text-xs sm:text-sm leading-tight line-clamp-2">${title}</h4>
                    <p class="text-gray-400 text-xs mt-0.5 sm:mt-1">${year}</p>
                </div>
            </div>
        `;
    }).join('');
    document.querySelectorAll('.recommendation-card').forEach(card => {
        card.addEventListener('click', () => {
            const mediaId = card.dataset.mediaId;
            const type = card.dataset.mediaType;
            showWatchPage(mediaId, type);
        });
    });
}

function displaySeasonSelector(seriesData, seriesId, restoreSeason = 1, restoreEpisode = 1) {
    tvSeasonSelector.style.display = 'block';
    const seasons = seriesData.seasons.filter(s => s.episode_count > 0 && s.season_number > 0);

    let seasonOptionsHtml = seasons.map(season =>
        `<option value="${season.season_number}" data-episode-count="${season.episode_count}" ${season.season_number === restoreSeason ? 'selected' : ''}>${season.name}</option>`
    ).join('');

    tvSeasonSelector.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
            <h4 class="text-sm sm:text-base lg:text-lg font-semibold text-gray-300">Episodes</h4>
            <select id="season-dropdown" class="bg-gray-800 border border-gray-700 text-white text-xs sm:text-sm rounded-lg focus:ring-red-500 focus:border-red-500 p-2 w-full sm:w-auto">
                ${seasonOptionsHtml}
            </select>
        </div>
        <div id="episode-list-container" class="pb-2"></div>
    `;

    const seasonDropdown = document.getElementById('season-dropdown');
    seasonDropdown.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const episodeCount = parseInt(selectedOption.dataset.episodeCount);
        displayEpisodeList(seriesId, e.target.value, episodeCount, 1); // Reset to episode 1 on season change
    });

    // Find the episode count for the restore season
    const selectedSeason = seasons.find(s => s.season_number === restoreSeason) || seasons[0];
    if (selectedSeason) {
        displayEpisodeList(seriesId, selectedSeason.season_number, selectedSeason.episode_count, restoreEpisode);
    }
}

function displayEpisodeList(seriesId, seasonNumber, episodeCount, restoreEpisode = 1) {
    const container = document.getElementById('episode-list-container');
    let episodeButtonsHtml = '';
    for (let i = 1; i <= episodeCount; i++) {
        episodeButtonsHtml += `<button class="episode-btn flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-sm flex items-center justify-center font-medium text-gray-300 bg-gray-800 rounded-md border-2 border-transparent hover:bg-gray-700" data-episode-number="${i}">${i}</button>`;
    }
    container.innerHTML = `<div class="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">${episodeButtonsHtml}</div>`;

    const episodeButtons = container.querySelectorAll('.episode-btn');
    episodeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            episodeButtons.forEach(b => b.classList.remove('btn-active'));
            btn.classList.add('btn-active');

            const episodeNum = parseInt(btn.dataset.episodeNumber);
            currentSeason = parseInt(seasonNumber);
            currentEpisode = episodeNum;

            updateVideoSource(seriesId, 'tv');
            updateUrlState(seriesId, 'tv', currentSeason, currentEpisode);
        });
    });

    // Click the restore episode or first episode
    const targetEpisode = Math.min(restoreEpisode, episodeCount);
    if (episodeButtons.length > 0) {
        episodeButtons[targetEpisode - 1].click();
    }
}


// --- Event Listeners & Handlers ---
function handleCategoryClick(linkElement) {
    document.querySelectorAll('.category-link').forEach(l => l.classList.remove('bg-gray-800'));
    linkElement.classList.add('bg-gray-800');
    closeGenreDropdown();
    if (window.innerWidth < 1024) closeSidebar();
}

function closeGenreDropdown() {
    if (!genreList.style.maxHeight || genreList.style.maxHeight === '0px') return;
    genreArrow.classList.remove('rotate-180');
    genreList.style.maxHeight = '0px';
}

mainContent.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = mainContent;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
        fetchMoreMedia();
    }
});

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.trim();
    searchTimeout = setTimeout(() => {
        // If in Live TV mode, redirect search to IPTV search instead
        if (isLiveTVMode) {
            const iptvSearchInput = document.getElementById('iptv-search');
            if (iptvSearchInput) {
                iptvSearchInput.value = searchTerm;
                iptvSearchQuery = searchTerm;
                displayIPTVChannels();
            }
            return;
        }

        document.querySelectorAll('.category-link').forEach(l => l.classList.remove('bg-gray-800'));
        closeGenreDropdown();
        if (searchTerm) {
            const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(searchTerm)}`;
            fetchMedia(url, `Results for "${searchTerm}"`, 'multi');
        } else {
            document.querySelector('.category-link[data-category="popular"][data-type="movie"]').click();
        }
    }, 500);
});

document.querySelectorAll('.category-link[data-category]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        handleCategoryClick(link);
        const category = link.dataset.category;
        const mediaType = link.dataset.type;
        const title = link.querySelector('span').textContent;

        // Home button - show multi-row home page
        if (category === 'hindi') {
            showHomePage();
            return;
        }

        const url = `${BASE_URL}/${mediaType}/${category}`;
        fetchMedia(url, title, mediaType);
    });
});

genreDropdownBtn.addEventListener('click', () => {
    genreArrow.classList.toggle('rotate-180');
    genreList.style.maxHeight = genreList.style.maxHeight && genreList.style.maxHeight !== '0px' ? '0px' : genreList.scrollHeight + "px";
});

homeLogoButton.addEventListener('click', () => {
    showHomePage();
});

// --- Mobile Sidebar Logic ---
function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
}
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}
menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.innerWidth < 1024) {
        // Mobile logic
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    } else {
        // Desktop logic
        sidebar.classList.toggle('desktop-collapsed');
    }
});
overlay.addEventListener('click', closeSidebar);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    // Always fetch genres
    fetchAndDisplayGenres();

    // Check for saved state in URL hash
    const state = getStateFromUrl();

    if (state && state.mediaId && state.mediaType) {
        if (state.mediaType === 'livetv') {
            // Restore Live TV channel - need to fetch IPTV data first
            const success = await fetchIPTVData();
            if (success) {
                const channelId = decodeURIComponent(state.mediaId);
                playIPTVChannel(channelId);
            } else {
                showHomePage();
            }
        } else {
            // Restore the movie/TV watch page from URL state
            await showWatchPage(state.mediaId, state.mediaType, state.season, state.episode);
        }
    } else {
        // Default: show home page with multiple category rows
        showHomePage();
    }
});

// --- IPTV Functions ---
async function fetchIPTVData() {
    try {
        const [channelsRes, countriesRes, languagesRes, streamsRes, categoriesRes, logosRes] = await Promise.all([
            fetch(IPTV_API.channels),
            fetch(IPTV_API.countries),
            fetch(IPTV_API.languages),
            fetch(IPTV_API.streams),
            fetch(IPTV_API.categories),
            fetch(IPTV_API.logos)
        ]);

        iptvChannels = await channelsRes.json();
        iptvCountries = await countriesRes.json();
        iptvLanguages = await languagesRes.json();
        iptvStreams = await streamsRes.json();
        iptvCategories = await categoriesRes.json();
        const iptvLogos = await logosRes.json();

        // Create a map of channel ID to logo URL for quick lookup
        const logoMap = {};
        iptvLogos.forEach(logo => {
            if (logo.channel && logo.url) {
                // Use the first logo for each channel (they're sorted by quality)
                if (!logoMap[logo.channel]) {
                    logoMap[logo.channel] = logo.url;
                }
            }
        });

        // Merge logos with channels
        iptvChannels = iptvChannels.map(channel => ({
            ...channel,
            logo: logoMap[channel.id] || null
        }));

        return true;
    } catch (error) {
        console.error('Failed to fetch IPTV data:', error);
        return false;
    }
}


function populateIPTVFilters() {
    const countryFilter = document.getElementById('iptv-country-filter');
    const categoryFilter = document.getElementById('iptv-category-filter');

    if (!countryFilter) return;

    // Restore saved selections from localStorage
    selectedCountry = localStorage.getItem('iptv-country') || '';
    selectedCategory = localStorage.getItem('iptv-category') || '';

    // Populate countries
    const sortedCountries = [...iptvCountries].sort((a, b) => a.name.localeCompare(b.name));
    countryFilter.innerHTML = '<option value="">All Countries</option>' +
        sortedCountries.map(c => `<option value="${c.code}" ${c.code === selectedCountry ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('');

    // Populate categories
    if (categoryFilter) {
        let categoriesToDisplay = [];

        // Try using official category list first
        if (iptvCategories && iptvCategories.length > 0) {
            categoriesToDisplay = [...iptvCategories];
        }

        // Fallback: Extract from channels if list is empty
        if (categoriesToDisplay.length === 0 && iptvChannels.length > 0) {
            const uniqueCats = new Set();
            iptvChannels.forEach(c => {
                if (c.categories && c.categories.length) {
                    c.categories.forEach(cat => uniqueCats.add(cat));
                }
            });
            categoriesToDisplay = Array.from(uniqueCats).map(cat => ({
                id: cat,
                name: cat.charAt(0).toUpperCase() + cat.slice(1)
            }));
        }

        if (categoriesToDisplay.length > 0) {
            const sortedCategories = categoriesToDisplay.sort((a, b) => a.name.localeCompare(b.name));
            categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                sortedCategories.map(c => `<option value="${c.id}" ${c.id === selectedCategory ? 'selected' : ''}>${c.name}</option>`).join('');
        }
    }
}



function getChannelStreamUrl(channelId) {
    const stream = iptvStreams.find(s => s.channel === channelId);
    return stream ? stream.url : null;
}

function displayIPTVChannels() {
    let filteredChannels = [...iptvChannels];

    // Filter by country
    if (selectedCountry) {
        filteredChannels = filteredChannels.filter(c => c.country === selectedCountry);
    }

    // Filter by category
    if (selectedCategory) {
        filteredChannels = filteredChannels.filter(c =>
            c.categories && c.categories.includes(selectedCategory)
        );
    }

    // Filter by search query (fuzzy match)
    if (iptvSearchQuery) {
        filteredChannels = filteredChannels.filter(c =>
            fuzzyMatch(c.name, iptvSearchQuery) ||
            fuzzyMatch(c.id, iptvSearchQuery)
        );
    }


    // Filter to only channels with streams
    const channelsWithStreams = filteredChannels.filter(channel => {
        return iptvStreams.some(s => s.channel === channel.id);
    });

    // Limit to first 100 for performance
    const displayChannels = channelsWithStreams.slice(0, 100);

    if (displayChannels.length === 0) {
        mediaGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-400 text-lg">No channels found matching your filters.</p>
                <p class="text-gray-500 text-sm mt-2">Try adjusting your country or language filters.</p>
            </div>
        `;
        return;
    }

    mediaGrid.innerHTML = displayChannels.map(channel => {
        const country = iptvCountries.find(c => c.code === channel.country);
        const countryFlag = country ? country.flag : '🌐';
        const logo = channel.logo;
        const initial = channel.name.charAt(0).toUpperCase();
        // Generate a consistent color based on channel name
        const colors = ['from-red-600 to-pink-600', 'from-blue-600 to-purple-600', 'from-green-600 to-teal-600', 'from-orange-600 to-red-600', 'from-indigo-600 to-blue-600', 'from-pink-600 to-rose-600'];
        const colorIndex = channel.name.charCodeAt(0) % colors.length;
        const gradientClass = colors[colorIndex];

        return `
            <div class="media-card group cursor-pointer bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                 data-channel-id="${channel.id}">
                <div class="relative aspect-video bg-gray-800">
                    ${logo ?
                `<img src="${logo}" alt="${channel.name}" 
                             class="w-full h-full object-contain p-2"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="absolute inset-0 bg-gradient-to-br ${gradientClass} items-center justify-center" style="display: none;">
                             <span class="text-4xl font-bold text-white">${initial}</span>
                         </div>`
                :
                `<div class="absolute inset-0 bg-gradient-to-br ${gradientClass} flex items-center justify-center">
                             <span class="text-4xl font-bold text-white">${initial}</span>
                         </div>`
            }
                    <div class="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                    </div>
                    <div class="absolute bottom-2 right-2 text-lg">${countryFlag}</div>
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-sm text-white truncate group-hover:text-red-400 transition-colors">${channel.name}</h3>
                    <p class="text-xs text-gray-400 mt-1">${channel.categories ? channel.categories.join(', ') : 'General'}</p>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers for channels
    mediaGrid.querySelectorAll('.media-card[data-channel-id]').forEach(card => {
        card.addEventListener('click', () => {
            const channelId = card.dataset.channelId;
            playIPTVChannel(channelId);
        });
    });
}

function playIPTVChannel(channelId, addToHistory = true) {
    const channel = iptvChannels.find(c => c.id === channelId);
    const streamUrl = getChannelStreamUrl(channelId);

    if (!channel || !streamUrl) {
        alert('Stream not available for this channel.');
        return;
    }

    // Only update history if explicitly requested (not from popstate)
    if (addToHistory) {
        history.pushState({ mediaType: 'livetv', channelId }, '', `#livetv/${encodeURIComponent(channelId)}`);
    }

    displayIPTVChannelContent(channel, streamUrl);
}

function displayIPTVChannelContent(channel, streamUrl) {
    const country = iptvCountries.find(c => c.code === channel.country);
    const countryName = country ? country.name : 'Unknown';

    mainContent.style.display = 'none';
    watchPage.style.display = 'block';
    watchPage.scrollTop = 0;

    // Use local HLS player page
    watchIframe.src = `hls-player.html?url=${encodeURIComponent(streamUrl)}`;

    // Update media details
    mediaDetails.innerHTML = `
        <h1 class="text-xl sm:text-2xl font-bold text-white mb-2">${channel.name}</h1>
        <div class="flex items-center gap-3 text-sm text-gray-400 mb-4">
            <span class="bg-red-600 text-white px-2 py-0.5 rounded text-xs">LIVE TV</span>
            <span>${countryName}</span>
            <span>${channel.categories ? channel.categories.join(', ') : 'General'}</span>
        </div>
        ${channel.website ? `<a href="${channel.website}" target="_blank" class="text-red-400 hover:underline text-sm">Visit Channel Website</a>` : ''}
    `;

    // Hide TV-specific controls
    tvSeasonSelector.style.display = 'none';
    serverContainer.innerHTML = '';

    // Show related channels as recommendations
    displayIPTVRecommendations(channel);
}

function displayIPTVRecommendations(currentChannel) {
    let relatedChannels = [];

    // FIRST: Find channels from the same CATEGORY (most relevant for content)
    if (currentChannel.categories && currentChannel.categories.length > 0) {
        const categoryChannels = iptvChannels.filter(c =>
            c.id !== currentChannel.id &&
            c.categories &&
            c.categories.some(cat => currentChannel.categories.includes(cat)) &&
            iptvStreams.some(s => s.channel === c.id)
        );

        // Prioritize same category + same country
        const sameCountryCategoryChannels = categoryChannels.filter(c => c.country === currentChannel.country);
        const otherCategoryChannels = categoryChannels.filter(c => c.country !== currentChannel.country);

        relatedChannels = [...sameCountryCategoryChannels, ...otherCategoryChannels];
    }

    // SECOND: If not enough, add more from same country (any category)
    if (relatedChannels.length < 15) {
        const countryChannels = iptvChannels.filter(c =>
            c.id !== currentChannel.id &&
            c.country === currentChannel.country &&
            iptvStreams.some(s => s.channel === c.id) &&
            !relatedChannels.find(rc => rc.id === c.id)
        );
        relatedChannels = [...relatedChannels, ...countryChannels];
    }

    // Limit to 15 recommendations
    relatedChannels = relatedChannels.slice(0, 15);

    if (relatedChannels.length === 0) {
        recommendationsGrid.innerHTML = '<p class="text-gray-500 text-sm">No related channels found.</p>';
        return;
    }

    // Update title to show category
    const categoryName = currentChannel.categories && currentChannel.categories.length > 0
        ? currentChannel.categories[0].charAt(0).toUpperCase() + currentChannel.categories[0].slice(1)
        : 'More';
    recommendationTitle.textContent = `More ${categoryName} Channels`;

    recommendationsGrid.innerHTML = relatedChannels.map(channel => {
        const country = iptvCountries.find(c => c.code === channel.country);
        const countryFlag = country ? country.flag : '🌐';
        const logo = channel.logo || '';

        return `
            <div class="recommendation-card flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors" 
                 data-rec-channel-id="${channel.id}">
                <div class="w-16 h-10 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                    ${logo ? `<img src="${logo}" alt="${channel.name}" class="w-full h-full object-contain p-1" onerror="this.parentElement.innerHTML='${countryFlag}'">` : `<span class="text-lg">${countryFlag}</span>`}
                </div>
                <div class="ml-3 flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-white truncate">${channel.name}</h4>
                    <p class="text-xs text-gray-400">${channel.categories ? channel.categories[0] : 'General'}</p>
                </div>
                <span class="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded ml-2">LIVE</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    recommendationsGrid.querySelectorAll('.recommendation-card[data-rec-channel-id]').forEach(card => {
        card.addEventListener('click', () => {
            playIPTVChannel(card.dataset.recChannelId);
        });
    });
}

async function showLiveTV() {
    isLiveTVMode = true;
    showGridView();
    pageTitle.textContent = 'Live TV Channels';
    mediaGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;

    // Show filters
    const filtersContainer = document.getElementById('iptv-filters');
    if (filtersContainer) {
        filtersContainer.style.display = 'flex';
        // Ensure category filter is visible for Live TV (might be hidden by radio)
        const categoryFilter = document.getElementById('iptv-category-filter');
        if (categoryFilter) {
            categoryFilter.parentElement.style.display = 'block';
        }
    }

    // Sidebar active state
    document.querySelectorAll('.category-link, #radio-link').forEach(link => link.classList.remove('bg-gray-800'));
    document.getElementById('live-tv-link')?.classList.add('bg-gray-800');

    if (iptvChannels.length === 0) {
        const success = await fetchIPTVData();
        if (!success) {
            mediaGrid.innerHTML = `<div class="col-span-full text-center text-red-500"><p>Failed to load channels.</p></div>`;
            return;
        }
        populateIPTVFilters();
    }

    displayIPTVChannels();
}

// Initialize IPTV filter event listeners
document.addEventListener('DOMContentLoaded', () => {
    const countryFilter = document.getElementById('iptv-country-filter');
    const categoryFilter = document.getElementById('iptv-category-filter');

    if (countryFilter) {
        countryFilter.addEventListener('change', (e) => {
            selectedCountry = e.target.value;
            localStorage.setItem('iptv-country', selectedCountry);
            displayIPTVChannels();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            selectedCategory = e.target.value;
            localStorage.setItem('iptv-category', selectedCategory);
            displayIPTVChannels();
        });
    }

    // IPTV Search input handler with debounce
    const iptvSearchInput = document.getElementById('iptv-search');
    let searchTimeout;
    if (iptvSearchInput) {
        iptvSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                iptvSearchQuery = e.target.value.trim();
                displayIPTVChannels();
            }, 300); // 300ms debounce
        });
    }

    // Live TV sidebar link handler
    const liveTVLink = document.getElementById('live-tv-link');
    if (liveTVLink) {
        liveTVLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLiveTV();

            // Update sidebar active states
            document.querySelectorAll('.category-link').forEach(link => {
                link.classList.remove('bg-gray-800');
            });
            liveTVLink.classList.add('bg-gray-800');

            // Close sidebar on mobile
            if (window.innerWidth < 1024) {
                closeSidebar();
            }
        });
    }
});

// --- Handle Browser Back/Forward Button ---
window.addEventListener('popstate', async (event) => {
    const state = getStateFromUrl();

    if (state && state.mediaId && state.mediaType) {
        if (state.mediaType === 'livetv') {
            // Restore Live TV channel (without adding to history)
            if (iptvChannels.length === 0) {
                await fetchIPTVData();
            }
            const channelId = decodeURIComponent(state.mediaId);
            // Use playIPTVChannel with addToHistory=false to fully restore channel
            playIPTVChannel(channelId, false);
        } else {
            // Restore movie/TV watch page without modifying history
            mainContent.style.display = 'none';
            watchPage.style.display = 'block';
            watchPage.scrollTop = 0;

            // Reset state
            currentSeason = state.season ? parseInt(state.season) : 1;
            currentEpisode = state.episode ? parseInt(state.episode) : 1;

            // Render server selector and update video
            renderServerSelector(state.mediaId, state.mediaType);
            updateVideoSource(state.mediaId, state.mediaType);
            // Note: NOT calling updateUrlState here to avoid adding to history

            const mediaData = await fetchMediaDetails(state.mediaId, state.mediaType);
            if (mediaData) {
                if (state.mediaType === 'tv') {
                    displaySeasonSelector(mediaData, state.mediaId, currentSeason, currentEpisode);
                }
                await fetchRecommendations(state.mediaId, state.mediaType, mediaData.genres);
            }
        }
    } else {
        // No hash - show home page
        watchPage.style.display = 'none';
        mainContent.style.display = 'block';
        watchIframe.src = "";

        // Only trigger content load if grid is empty or has home page content
        if (mediaGrid.children.length === 0 || mediaGrid.querySelector('.loader') || !isHomePage) {
            showHomePage();
        }
    }
});

// --- Radio Functions ---
async function fetchRadioData() {
    // Try each server until one works
    for (const server of RADIO_API_SERVERS) {
        try {
            const countriesRes = await fetch(`${server}/json/countries`, {
                headers: {
                    'User-Agent': 'MovieStreamingApp/1.0'
                }
            });

            if (!countriesRes.ok) continue;

            radioCountries = await countriesRes.json();
            currentRadioServer = server;

            // Sort countries by station count (most popular first)
            radioCountries.sort((a, b) => b.stationcount - a.stationcount);

            console.log('Radio API connected to:', server);
            return true;
        } catch (error) {
            console.warn(`Radio server ${server} failed:`, error.message);
            continue;
        }
    }

    console.error('All radio servers failed');
    return false;
}

async function fetchRadioStations(countryCode = '', searchQuery = '') {
    try {
        let url;

        if (searchQuery) {
            url = `${currentRadioServer}/json/stations/byname/${encodeURIComponent(searchQuery)}?limit=100&hidebroken=true&order=votes&reverse=true`;
        } else if (countryCode) {
            url = `${currentRadioServer}/json/stations/bycountrycodeexact/${countryCode}?limit=100&hidebroken=true&order=votes&reverse=true`;
        } else {
            url = `${currentRadioServer}/json/stations/topvote/100`;
        }

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'MovieStreamingApp/1.0'
            }
        });

        if (!res.ok) throw new Error('Failed to fetch stations');
        radioStations = await res.json();

        return true;
    } catch (error) {
        console.error('Failed to fetch radio stations:', error);
        return false;
    }
}

function populateRadioFilters() {
    const countryFilter = document.getElementById('iptv-country-filter');

    if (!countryFilter) return;

    // Restore saved selection from localStorage
    selectedRadioCountry = localStorage.getItem('radio-country') || '';

    // Populate countries - top 50 by station count
    const topCountries = radioCountries.slice(0, 50);
    countryFilter.innerHTML = '<option value="">All Countries (Top Stations)</option>' +
        topCountries.map(c => `<option value="${c.iso_3166_1}" ${c.iso_3166_1 === selectedRadioCountry ? 'selected' : ''}>${c.name} (${c.stationcount})</option>`).join('');
}

function displayRadioStations() {
    let displayStations = [...radioStations];

    // Filter by search query (fuzzy match)
    if (radioSearchQuery) {
        displayStations = displayStations.filter(s =>
            fuzzyMatch(s.name, radioSearchQuery) ||
            fuzzyMatch(s.tags, radioSearchQuery)
        );
    }

    // Limit for performance
    displayStations = displayStations.slice(0, 100);

    if (displayStations.length === 0) {
        mediaGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-400 text-lg">No radio stations found.</p>
                <p class="text-gray-500 text-sm mt-2">Try adjusting your search or country filter.</p>
            </div>
        `;
        return;
    }

    mediaGrid.innerHTML = displayStations.map(station => {
        const initial = station.name.charAt(0).toUpperCase();
        // Generate a consistent color based on station name
        const colors = ['from-purple-600 to-pink-600', 'from-blue-600 to-indigo-600', 'from-green-600 to-emerald-600', 'from-orange-600 to-amber-600', 'from-red-600 to-rose-600', 'from-cyan-600 to-blue-600'];
        const colorIndex = station.name.charCodeAt(0) % colors.length;
        const gradientClass = colors[colorIndex];
        const tags = station.tags ? station.tags.split(',').slice(0, 3).join(', ') : 'Radio';

        return `
            <div class="media-card group cursor-pointer bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                 data-radio-id="${station.stationuuid}">
                <div class="relative aspect-square bg-gray-800">
                    ${station.favicon ?
                `<img src="${station.favicon}" alt="${station.name}" 
                             class="w-full h-full object-contain p-4"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="absolute inset-0 bg-gradient-to-br ${gradientClass} items-center justify-center" style="display: none;">
                             <span class="text-4xl font-bold text-white">${initial}</span>
                         </div>`
                :
                `<div class="absolute inset-0 bg-gradient-to-br ${gradientClass} flex items-center justify-center">
                             <span class="text-4xl font-bold text-white">${initial}</span>
                         </div>`
            }
                    <div class="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                    </div>
                    ${station.countrycode ? `<div class="absolute bottom-2 right-2 text-sm bg-black/50 px-1.5 rounded">${station.countrycode}</div>` : ''}
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-sm text-white truncate group-hover:text-purple-400 transition-colors">${station.name}</h3>
                    <p class="text-xs text-gray-400 mt-1 truncate">${tags}</p>
                    ${station.bitrate ? `<p class="text-xs text-gray-500 mt-0.5">${station.bitrate} kbps</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers for stations
    mediaGrid.querySelectorAll('.media-card[data-radio-id]').forEach(card => {
        card.addEventListener('click', () => {
            const stationId = card.dataset.radioId;
            playRadioStation(stationId);
        });
    });
}

function playRadioStation(stationId, addToHistory = true) {
    const station = radioStations.find(s => s.stationuuid === stationId);

    if (!station || !station.url_resolved) {
        alert('Stream not available for this station.');
        return;
    }

    // Only update history if explicitly requested
    if (addToHistory) {
        history.pushState({ mediaType: 'radio', stationId }, '', `#radio/${encodeURIComponent(stationId)}`);
    }

    displayRadioContent(station);
}

function displayRadioContent(station) {
    mainContent.style.display = 'none';
    watchPage.style.display = 'block';
    watchPage.scrollTop = 0;

    // Use the HLS player for audio streams (pass station name and type for display)
    watchIframe.src = `hls-player.html?url=${encodeURIComponent(station.url_resolved)}&name=${encodeURIComponent(station.name)}&type=radio`;

    // Update media details
    const tags = station.tags ? station.tags.split(',').slice(0, 5).join(', ') : 'Radio';
    mediaDetails.innerHTML = `
        <h1 class="text-xl sm:text-2xl font-bold text-white mb-2">${station.name}</h1>
        <div class="flex items-center gap-3 text-sm text-gray-400 mb-4 flex-wrap">
            <span class="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">RADIO</span>
            ${station.country ? `<span>${station.country}</span>` : ''}
            ${station.bitrate ? `<span>${station.bitrate} kbps</span>` : ''}
            ${station.codec ? `<span>${station.codec}</span>` : ''}
        </div>
        <p class="text-sm text-gray-400 mb-4">${tags}</p>
        ${station.homepage ? `<a href="${station.homepage}" target="_blank" class="text-purple-400 hover:underline text-sm">Visit Station Website</a>` : ''}
    `;

    // Hide TV-specific controls
    tvSeasonSelector.style.display = 'none';
    serverContainer.innerHTML = '';

    // Show related stations
    displayRadioRecommendations(station);
}

function displayRadioRecommendations(currentStation) {
    // Find related stations by tags or country
    let relatedStations = [];

    if (currentStation.tags) {
        const currentTags = currentStation.tags.split(',').map(t => t.trim().toLowerCase());
        relatedStations = radioStations.filter(s =>
            s.stationuuid !== currentStation.stationuuid &&
            s.tags &&
            s.tags.split(',').some(t => currentTags.includes(t.trim().toLowerCase()))
        );
    }

    // If not enough, add more from same country
    if (relatedStations.length < 10) {
        const countryStations = radioStations.filter(s =>
            s.stationuuid !== currentStation.stationuuid &&
            s.countrycode === currentStation.countrycode &&
            !relatedStations.find(rs => rs.stationuuid === s.stationuuid)
        );
        relatedStations = [...relatedStations, ...countryStations];
    }

    relatedStations = relatedStations.slice(0, 15);

    if (relatedStations.length === 0) {
        recommendationsGrid.innerHTML = '<p class="text-gray-500 text-sm">No related stations found.</p>';
        return;
    }

    recommendationTitle.textContent = 'Similar Stations';

    recommendationsGrid.innerHTML = relatedStations.map(station => {
        const initial = station.name.charAt(0).toUpperCase();

        return `
            <div class="recommendation-card flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors" 
                 data-rec-radio-id="${station.stationuuid}">
                <div class="w-12 h-12 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                    ${station.favicon ?
                `<img src="${station.favicon}" alt="${station.name}" class="w-full h-full object-contain p-1" onerror="this.parentElement.innerHTML='<span class=\\'text-lg font-bold text-purple-400\\'>${initial}</span>'">`
                : `<span class="text-lg font-bold text-purple-400">${initial}</span>`
            }
                </div>
                <div class="ml-3 flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-white truncate">${station.name}</h4>
                    <p class="text-xs text-gray-400">${station.countrycode || 'Radio'}</p>
                </div>
                <span class="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded ml-2">LIVE</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    recommendationsGrid.querySelectorAll('.recommendation-card[data-rec-radio-id]').forEach(card => {
        card.addEventListener('click', () => {
            playRadioStation(card.dataset.recRadioId);
        });
    });
}

async function showRadio() {
    isRadioMode = true;
    isLiveTVMode = false;
    isHomePage = false;
    showGridView();
    pageTitle.textContent = 'Radio Stations';
    mediaGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;

    // Show filters (reuse IPTV filters container)
    const filtersContainer = document.getElementById('iptv-filters');
    if (filtersContainer) {
        filtersContainer.style.display = 'flex';
        // Hide category filter for radio
        const categoryFilter = document.getElementById('iptv-category-filter');
        if (categoryFilter) {
            categoryFilter.parentElement.style.display = 'none';
        }
    }

    // Sidebar active state
    document.querySelectorAll('.category-link, #live-tv-link').forEach(link => link.classList.remove('bg-gray-800'));
    document.getElementById('radio-link')?.classList.add('bg-gray-800');

    // Fetch radio data if not already fetched

    // Fetch radio data if not already fetched
    if (radioCountries.length === 0) {
        const success = await fetchRadioData();
        if (!success) {
            mediaGrid.innerHTML = `<div class="col-span-full text-center text-red-500"><p>Failed to load radio data.</p></div>`;
            return;
        }
    }

    populateRadioFilters();

    // Fetch stations
    await fetchRadioStations(selectedRadioCountry, radioSearchQuery);
    displayRadioStations();
}

// Initialize Radio event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Radio sidebar link handler
    const radioLink = document.getElementById('radio-link');
    if (radioLink) {
        radioLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRadio();

            // Update sidebar active states
            document.querySelectorAll('.category-link').forEach(link => {
                link.classList.remove('bg-gray-800');
            });
            const liveTVLink = document.getElementById('live-tv-link');
            if (liveTVLink) liveTVLink.classList.remove('bg-gray-800');
            radioLink.classList.add('bg-gray-800');

            // Close sidebar on mobile
            if (window.innerWidth < 1024) {
                closeSidebar();
            }
        });
    }

    // Override filter handlers when in radio mode
    const countryFilter = document.getElementById('iptv-country-filter');
    if (countryFilter) {
        // Remove existing and add new handler that checks mode
        countryFilter.addEventListener('change', async (e) => {
            if (isRadioMode) {
                selectedRadioCountry = e.target.value;
                localStorage.setItem('radio-country', selectedRadioCountry);
                mediaGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;
                await fetchRadioStations(selectedRadioCountry, radioSearchQuery);
                displayRadioStations();
            }
        });
    }

    // Override search handler for radio mode
    const iptvSearchInput = document.getElementById('iptv-search');
    if (iptvSearchInput) {
        let radioSearchTimeout;
        iptvSearchInput.addEventListener('input', async (e) => {
            if (isRadioMode) {
                clearTimeout(radioSearchTimeout);
                radioSearchTimeout = setTimeout(async () => {
                    radioSearchQuery = e.target.value.trim();
                    if (radioSearchQuery) {
                        mediaGrid.innerHTML = `<div class="col-span-full h-96 flex items-center justify-center"><div class="loader"></div></div>`;
                        await fetchRadioStations('', radioSearchQuery);
                        displayRadioStations();
                    } else {
                        await fetchRadioStations(selectedRadioCountry, '');
                        displayRadioStations();
                    }
                }, 300);
            }
        });
    }
});

// Update popstate handler to support radio
const originalPopstateHandler = window.onpopstate;
window.addEventListener('popstate', async (event) => {
    const state = getStateFromUrl();

    if (state && state.mediaId && state.mediaType === 'radio') {
        // Restore Radio station
        if (radioStations.length === 0) {
            await fetchRadioData();
            await fetchRadioStations();
        }
        const stationId = decodeURIComponent(state.mediaId);
        const station = radioStations.find(s => s.stationuuid === stationId);
        if (station) {
            playRadioStation(stationId, false);
        } else {
            // Station not in current list, try to fetch it
            try {
                const res = await fetch(`${currentRadioServer}/json/stations/byuuid/${stationId}`);
                const stations = await res.json();
                if (stations.length > 0) {
                    radioStations.push(stations[0]);
                    playRadioStation(stationId, false);
                } else {
                    showRadio();
                }
            } catch (e) {
                showRadio();
            }
        }
    }
});
