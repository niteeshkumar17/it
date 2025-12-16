// ads.js - PropellerAds Integration

document.addEventListener('DOMContentLoaded', () => {
    // 1. Top Banner Ad
    const topBanner = document.getElementById('ad-banner-top');
    if (topBanner) {
        // REPLACE with your actual Adsterra Banner Script for Top Banner
        // Example: topBanner.innerHTML = `<script async src="//..."></script>`;
        console.log('Top Banner Ad Zone Ready');
    }

    // 2. Middle Banner Ad (Intermission)
    const middleBanner = document.getElementById('ad-banner-middle');
    if (middleBanner) {
        // Adsterra Native Banner
        const containerDiv = document.createElement('div');
        containerDiv.id = "container-588222232af6cc574ea3617b0afa49a3";
        middleBanner.appendChild(containerDiv);

        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = "false";
        script.src = "https://pl28272667.effectivegatecpm.com/588222232af6cc574ea3617b0afa49a3/invoke.js";
        middleBanner.appendChild(script);

        console.log('Middle Banner Ad Zone Ready');
    }

    // 3. Footer Banner Ad
    const bottomBanner = document.getElementById('ad-banner-bottom');
    if (bottomBanner && bottomBanner.firstElementChild) {
        // REPLACE with your actual Adsterra Banner Script for Bottom Banner
        console.log('Bottom Banner Ad Zone Ready');
    }

    // 4. Popunder Ad
    // Popunder is now directly in index.html as per recommendations
    console.log('Popunder Script (Adsterra) Loaded via HTML');
});
