// ad-blocker.js - uBlock Origin-style ad blocking for web apps
// This blocks known ad network domains and scripts

const AdBlocker = {
    // Common ad network domains (similar to uBlock Origin filter lists)
    blockedDomains: [
        'doubleclick.net',
        'googlesyndication.com',
        'googleadservices.com',
        'adservice.google.com',
        'pagead2.googlesyndication.com',
        'ads.google.com',
        'facebook.com/tr',
        'connect.facebook.net',
        'amazon-adsystem.com',
        'ads.yahoo.com',
        'ads.twitter.com',
        'adsrvr.org',
        'adnxs.com',
        'rubiconproject.com',
        'pubmatic.com',
        'openx.net',
        'criteo.com',
        'outbrain.com',
        'taboola.com',
        'popads.net',
        'popcash.net',
        'propellerads.com',
        'adsterra.com',
        'exoclick.com',
        'trafficjunky.com',
        'juicyads.com',
        'clickadu.com',
        'hilltopads.net',
        'adcash.com',
        'mgid.com',
        'revcontent.com',
    ],

    enabled: true,

    init() {
        if (!this.enabled) return;
        
        this.blockFetch();
        this.blockXHR();
        this.blockScripts();
        this.blockPopups();
        console.log('🛡️ AdBlocker initialized - blocking ad domains');
    },

    isBlocked(url) {
        if (!url) return false;
        const urlLower = url.toLowerCase();
        return this.blockedDomains.some(domain => urlLower.includes(domain));
    },

    // Block fetch requests to ad domains
    blockFetch() {
        const originalFetch = window.fetch;
        window.fetch = (url, options) => {
            if (this.isBlocked(url?.toString())) {
                console.log('🚫 Blocked fetch:', url);
                return Promise.reject(new Error('Blocked by AdBlocker'));
            }
            return originalFetch.apply(window, [url, options]);
        };
    },

    // Block XMLHttpRequest to ad domains
    blockXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (AdBlocker.isBlocked(url?.toString())) {
                console.log('🚫 Blocked XHR:', url);
                this._blocked = true;
            }
            return originalOpen.apply(this, [method, url, ...args]);
        };

        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
            if (this._blocked) {
                return;
            }
            return originalSend.apply(this, args);
        };
    },

    // Block dynamic script injections from ad domains
    blockScripts() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'SCRIPT' && this.isBlocked(node.src)) {
                        console.log('🚫 Blocked script:', node.src);
                        node.remove();
                    }
                    if (node.tagName === 'IFRAME' && this.isBlocked(node.src)) {
                        console.log('🚫 Blocked iframe:', node.src);
                        node.remove();
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    },

    // Block popup windows
    blockPopups() {
        window.open = function() {
            console.log('🚫 Blocked popup');
            return null;
        };
    },

    // Add custom domains to block
    addBlockedDomain(domain) {
        if (!this.blockedDomains.includes(domain)) {
            this.blockedDomains.push(domain);
        }
    },

    // Disable the blocker
    disable() {
        this.enabled = false;
        console.log('⚠️ AdBlocker disabled');
    }
};

// Auto-initialize
AdBlocker.init();

// Export for use in other scripts
window.AdBlocker = AdBlocker;
