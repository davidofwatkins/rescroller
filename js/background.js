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
 */

chrome.runtime.onInstalled.addListener(function() { // when extension installed/updated and chrome updated

    /**
     * If this is the first time running the extension, open options page
     * and Download latest Chrome Storage to Local Storage.
     */
    Rescroller.refreshLocalStorage(function() {
        if (localStorage['install_time']) { return; }
        
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
        if (tab.url.indexOf(restricted) >= 0) { return; }
    }

    /**
     * Aaaand, inject our customized CSS into the webpage!
     */
    chrome.tabs.insertCSS(tabId, { // unfortunately, this requires the <all_urls> permission :/
        code: localStorage['generated_css'],
        allFrames: true,
        runAt: 'document_start'
    });
});

// Handle action button in Chrome toolbar
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({ url: "options.html" });
})

// Detect changes to Chrome Storage, and import them into Local Storage
// @todo:david ummm how is this different from Rescroller.refreshLocalStorage()? I think this listens, while that checks.
// These two should probably share code if possible, and this should not overwrite newer data locally
chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (key in changes) {
    // Debugging:
    // var change = changes[key];
    // console.log('(Chrome Storage ' + namespace + ') "' + key + '": \t "' + change.oldValue + '" \t --> \t "' + change.newValue + '".');

    // Import these to localStorage
    localStorage[key] = changes[key].newValue;
  }
});