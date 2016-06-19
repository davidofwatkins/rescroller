/*
Rescroller Chrome Extension
Author: David Watkins (@dwat91)

Redistribution or reuse of this code is permitted for non-profit purposes, as long as the original author is credited.
*/

/**
 * If this is the first time running the extension (if it's just been installed), open options page
 * and Download latest Chrome Storage to Local Storage
 */
Rescroller.refreshLocalStorage(function() {
    if (localStorage['install_time']) { return; }
    
    localStorage["install_time"] = new Date().getTime();
    chrome.tabs.create({ url: "options.html" });
});

/**
 * Listen for commands from our content script (sbformatter.js)
 */
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) { // @todo:david not sure we want to do this on EVERY request - just every page load...

    /**
     * Inject our customized CSS into the webpage.
     */
    if (request.message == 'perform_css_injection') {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) { // first, get current tab url
            var currentTab = tabs[0];

            // Check to make sure this url isn't blacklisted. Exit early if so
            var restrictedSites = Rescroller.getListOfDisabledSites();
            for (var restricted in restrictedSites) {
                var restricted = restrictedSites[restricted];

                if (!restricted) { continue; }
                if (currentTab.url.indexOf(restricted) >= 0) { return; }
            }

            // Aaaaand inject!
            chrome.tabs.insertCSS(null, { // null = current tab
                code: localStorage['generated_css'],
                allFrames: true,
                runAt: 'document_start'
            });
        });
    }
});


// Handle action button in Chrome toolbar
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({ url: "options.html" });
})

// Detect changes to Chrome Storage, and import them into Local Storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (key in changes) {
    // Debugging:
    // var change = changes[key];
    // console.log('(Chrome Storage ' + namespace + ') "' + key + '": \t "' + change.oldValue + '" \t --> \t "' + change.newValue + '".');

    // Import these to localStorage
    localStorage[key] = changes[key].newValue;
  }
});