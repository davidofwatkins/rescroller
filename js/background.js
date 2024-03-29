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

chrome.runtime.onInstalled.addListener((details) => {
  // when extension installed/updated and chrome updated

  /**
   * If this is the first time running the extension, open options page
   * and Download latest Chrome Storage to Local Storage.
   */

  if (details.reason !== 'install') {
    // no need to sync down if updating.
    return;
  }

  Rescroller.syncDown(() => {
    if (localStorage.install_time) {
      return;
    } // only open options.html if this is the first install on any of the users' Chromes

    localStorage.install_time = new Date().getTime();
    chrome.tabs.create({ url: 'options.html' });
  });
});

/**
 * Listen for page states to change and set our custom CSS when tabs are loading
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading') {
    return;
  }

  // Check to make sure this url isn't blacklisted. Exit early if so
  const disabledSites = Rescroller.getListOfDisabledSites();

  // @todo this could probably be more accurate
  const isDisabledSite = disabledSites.some((site) => tab.url.includes(site));

  if (isDisabledSite) {
    return;
  }

  // Aaaand, inject our customized CSS into the webpage!
  chrome.tabs.insertCSS(tabId, {
    // unfortunately, this requires the <all_urls> permission :/
    code: localStorage['generated-css'],
    allFrames: true,
    runAt: 'document_start',
  });
});

/**
 * Handle action button in Chrome toolbar
 */
chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'options.html' });
});

/**
 * Detect changes to Chrome Storage, and import them into Local Storage
 */
chrome.storage.onChanged.addListener((changes) => {
  // Convert these 'changes' into a key-val object, parallel to how localStorage is formatted (no need for change[].oldValue)
  const changesCleaned = Object.keys(changes).reduce(
    (accumulator, key) => ({
      ...accumulator,
      [key]: changes[key].newValue,
    }),
    {}
  );

  Rescroller.mergeSyncWithLocalStorage(changesCleaned);
});
