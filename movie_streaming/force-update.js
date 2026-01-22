// force-update.js - Force Update System
// Blocks app usage if version is outdated

const ForceUpdate = {
    // Current app version (UPDATE THIS WITH EACH RELEASE)
    APP_VERSION: '1.0.0',
    
    // Remote version config URL (GitHub raw file)
    VERSION_URL: 'https://raw.githubusercontent.com/niteeshkumar17/movie-streaming/main/version.json',
    
    // Fallback: Use local version.json for testing
    LOCAL_VERSION_URL: 'version.json',
    
    // Use local or remote version check
    USE_REMOTE: true, // Enabled - checks GitHub for version
    
    async init() {
        console.log('🔄 Checking for updates...');
        console.log(`📱 Current app version: ${this.APP_VERSION}`);
        
        try {
            const versionInfo = await this.fetchVersionInfo();
            
            if (!versionInfo) {
                console.log('⚠️ Could not fetch version info, allowing app to continue');
                return true;
            }
            
            const needsUpdate = this.compareVersions(this.APP_VERSION, versionInfo.minVersion) < 0;
            
            if (needsUpdate && versionInfo.forceUpdate) {
                console.log('🚫 App is outdated, forcing update');
                this.showUpdateScreen(versionInfo);
                return false;
            } else if (needsUpdate) {
                console.log('ℹ️ Update available but not forced');
                this.showUpdateBanner(versionInfo);
                return true;
            }
            
            console.log('✅ App is up to date');
            return true;
            
        } catch (error) {
            console.error('❌ Version check failed:', error);
            // Allow app to continue if version check fails
            return true;
        }
    },
    
    async fetchVersionInfo() {
        const url = this.USE_REMOTE ? this.VERSION_URL : this.LOCAL_VERSION_URL;
        
        try {
            const response = await fetch(url, {
                cache: 'no-store', // Always get fresh version
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch version info:', error);
            return null;
        }
    },
    
    // Compare semantic versions: returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }
        
        return 0;
    },
    
    // Show full-screen update blocker
    showUpdateScreen(versionInfo) {
        // Remove all existing content
        document.body.innerHTML = '';
        document.body.style.cssText = `
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="
                text-align: center;
                padding: 40px;
                max-width: 400px;
            ">
                <div style="
                    font-size: 80px;
                    margin-bottom: 20px;
                ">🔄</div>
                
                <h1 style="
                    color: #ffffff;
                    font-size: 28px;
                    margin: 0 0 15px 0;
                    font-weight: 600;
                ">Update Required</h1>
                
                <p style="
                    color: #a0a0a0;
                    font-size: 16px;
                    line-height: 1.6;
                    margin: 0 0 10px 0;
                ">${versionInfo.message || 'Please update to the latest version to continue.'}</p>
                
                <p style="
                    color: #666;
                    font-size: 14px;
                    margin: 0 0 30px 0;
                ">
                    Your version: <span style="color: #ef4444;">${this.APP_VERSION}</span><br>
                    Required version: <span style="color: #22c55e;">${versionInfo.minVersion}</span>
                </p>
                
                <button onclick="ForceUpdate.openUpdateLink('${versionInfo.updateUrl}')" style="
                    background: linear-gradient(135deg, #e50914 0%, #b20710 100%);
                    color: white;
                    border: none;
                    padding: 16px 48px;
                    font-size: 18px;
                    font-weight: 600;
                    border-radius: 30px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4);
                    transition: transform 0.2s, box-shadow 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Update Now
                </button>
                
                <p style="
                    color: #555;
                    font-size: 12px;
                    margin-top: 30px;
                ">You cannot use the app without updating</p>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Prevent any interaction with the app
        this.blockApp();
    },
    
    // Show optional update banner (non-blocking)
    showUpdateBanner(versionInfo) {
        const banner = document.createElement('div');
        banner.id = 'update-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                color: white;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                z-index: 99999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">
                <span style="font-size: 14px;">
                    🆕 New version ${versionInfo.version} available!
                </span>
                <div>
                    <button onclick="ForceUpdate.openUpdateLink('${versionInfo.updateUrl}')" style="
                        background: white;
                        color: #1e40af;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-weight: 600;
                        cursor: pointer;
                        margin-right: 10px;
                    ">Update</button>
                    <button onclick="document.getElementById('update-banner').remove()" style="
                        background: transparent;
                        color: white;
                        border: 1px solid rgba(255,255,255,0.5);
                        padding: 8px 16px;
                        border-radius: 20px;
                        cursor: pointer;
                    ">Later</button>
                </div>
            </div>
        `;
        document.body.prepend(banner);
    },
    
    openUpdateLink(url) {
        // Try to open in system browser (for Capacitor)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
            window.Capacitor.Plugins.Browser.open({ url: url });
        } else {
            window.open(url, '_blank');
        }
    },
    
    blockApp() {
        // Block all keyboard/mouse events
        document.addEventListener('keydown', e => e.preventDefault(), true);
        document.addEventListener('keyup', e => e.preventDefault(), true);
        
        // Clear any intervals/timeouts that might be running
        const highestId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            clearTimeout(i);
            clearInterval(i);
        }
    }
};

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    ForceUpdate.init();
});

// Export for use in other scripts
window.ForceUpdate = ForceUpdate;
