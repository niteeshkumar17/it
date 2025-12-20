// ads.js - PropellerAds/Adsterra Integration with Rate Limiting

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const POPUNDER_COOLDOWN = 60 * 1000; // 1 minute
    const ADSTERRA_POPUNDER_URL = 'https://zoologicalmanufacture.com/90/0b/f0/900bf089181de5a48c5513802b96b571.js';

    // [NEW] Mobile Banner Configuration
    // Go to Adsterra -> Create Ad Unit -> Select "300x250" or "Social Bar" -> Get the Script URL (src="...")
    // Paste the URL inside the quotes below:
    const MOBILE_BANNER_SCRIPT_URL = 'https://zoologicalmanufacture.com/5e/e7/07/5ee70790e1828830343369cc1131861d.js'; // Social Bar

    // --- 1. Rate Limited Popunder Logic ---
    const originalOpen = window.open;
    let lastPopunderTime = parseInt(localStorage.getItem('lastPopunderTime') || '0');

    // Override window.open to enforcing rate limits
    window.open = function (url, target, features) {
        const now = Date.now();
        // Check if we are within the cooldown period
        if (now - lastPopunderTime < POPUNDER_COOLDOWN) {
            console.log('Antigravity: Popunder blocked by rate limiter (Cooldown active)');
            return null; // Block the popunder
        }

        // Allow the popunder and start cooldown
        console.log('Antigravity: Popunder allowed');
        lastPopunderTime = now;
        localStorage.setItem('lastPopunderTime', now.toString());
        return originalOpen.apply(this, arguments);
    };

    // Inject the Popunder Script dynamically
    if (ADSTERRA_POPUNDER_URL) {
        const popunderScript = document.createElement('script');
        popunderScript.type = 'text/javascript';
        popunderScript.src = ADSTERRA_POPUNDER_URL;
        document.body.appendChild(popunderScript);
        console.log('Popunder Script Injected with Rate Limiting');
    }


    // --- 2. Top Banner Ad ---
    const topBanner = document.getElementById('ad-banner-top');
    if (topBanner) {
        // Example: topBanner.innerHTML = `<iframe src="..." ...></iframe>`; 
        console.log('Top Banner Ad Zone Ready');
    }

    // --- 3. Middle Banner Ad (Intermission) ---
    const middleBanner = document.getElementById('ad-banner-middle');
    if (middleBanner) {
        // Adsterra Native Banner
        const containerDiv = document.createElement('div');
        containerDiv.id = "container-588222232af6cc574ea3617b0afa49a3";
        middleBanner.appendChild(containerDiv);

        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = "false";
        script.src = "https://zoologicalmanufacture.com/588222232af6cc574ea3617b0afa49a3/invoke.js";
        middleBanner.appendChild(script);

        console.log('Middle Banner Ad Zone Ready');
    }

    // --- 4. Mobile Banner Ad (Footer) ---
    const bottomBanner = document.getElementById('ad-banner-bottom');
    if (bottomBanner) {
        const isMobile = window.innerWidth < 1024; // Tailwind lg breakpoint

        if (isMobile) {
            console.log('Mobile View Detected. Attempting to load mobile banner...');
            const bannerContainer = bottomBanner.querySelector('div') || bottomBanner;

            if (MOBILE_BANNER_SCRIPT_URL) {
                // Clear the container logic - Social Bar works best appended to body
                bannerContainer.innerHTML = '';

                // Inject the mobile banner script directly to body
                // This matches "Insert it right above the closing </body> tag"
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = MOBILE_BANNER_SCRIPT_URL;
                script.async = true;
                document.body.appendChild(script);

                console.log('Mobile Banner (Social Bar) Script Injected to Body');
            } else {
                // Placeholder to correct layout if no ad is set
                bannerContainer.innerHTML = `
                    <div style="background: #2d3748; color: #cbd5e0; padding: 10px; font-size: 12px; border-top: 2px solid #e53e3e; text-align: center;">
                       Add Mobile Banner URL in ads.js to activate
                    </div>`;
            }
        }
    }
});
