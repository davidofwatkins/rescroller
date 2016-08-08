/**
 * Background Event page: this handles events for the extension between pages and performs the following:
 * 
 * - Handles browser action button click (opening of options.html)
 * - Handles first-time install by setting install_time in local storage and opening options.html
 * - Hanldes changes to chrome.sync and syncs down CSS updated remotely
 * - Hands generated CSS over to tabs when requested
 *
 * Note: because this is a non-persistent ('event') background page, this script will only load to run
 * event callbacks. Do not put any code outside of listeners!
 *
 * Note: Unfortunately, we need to load jquery.js and cssjson.js here, since they are needed when the CSS
 * hasn't been precomputed or needs to be regenerated.
 */

chrome.runtime.onInstalled.addListener(function(details) { // when extension installed/updated and chrome updated

    /**
     * If this is the first time running the extension, open options page
     * and Download latest Chrome Storage to Local Storage.
     */

     if (details.reason != 'install') { // no need to sync down if updating.
        Rescroller.performMigrations();
        return;
     }

    Rescroller.syncDown(function() {
        if (localStorage['install_time']) { return; } // only open options.html if this is the first install on any of the users' Chromes
        
        localStorage['install_time'] = new Date().getTime();
        chrome.tabs.create({ url: 'options.html' });
    });

});

/**
 * Listen for page states to change and set our custom CSS when tabs are loading
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status != 'loading') { return; }

    // Check to make sure this url isn't blacklisted. Exit early if so
    var restrictedSites = Rescroller.getListOfDisabledSites();
    for (var restricted in restrictedSites) {
        var restricted = restrictedSites[restricted];

        if (!restricted) { continue; }
        if (tab.url.indexOf(restricted) >= 0) { return; } // @todo this could probably be more accurate
    }

    // Aaaand, inject our customized CSS into the webpage!
    chrome.tabs.insertCSS(tabId, { // unfortunately, this requires the <all_urls> permission :/
        code: localStorage['generated-css'],
        allFrames: true,
        runAt: 'document_start'
    });
});

/**
 * Handle action button in Chrome toolbar
 */
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({ url: "options.html" });
})

/**
 * Detect changes to Chrome Storage, and import them into Local Storage
 */
chrome.storage.onChanged.addListener(function(changes, namespace) {
        
    // Convert these 'changes' into a key-val object, parallel to how localStorage is formatted (no need for change[].oldValue)
    var changesCleaned = {};
    for (var key in changes) {
        changesCleaned[key] = changes[key].newValue
    }

    Rescroller.mergeSyncWithLocalStorage(changesCleaned);
});