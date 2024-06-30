import {
  generateScrollbarCSS,
  setFirstTimeData,
  getListOfDisabledSites,
  RESCROLLER_SETTINGS_KEY,
} from './utils/index.js';
import { getChromeStorageValue } from './utils/storage.js';

// Keep track of disabled sites in memory
let disabledSites = [];

// We can't check the tab URL without the "tabs" (or "activeTab") permission, so
// we need to catch errors like these after attempting to inject CSS
const isExpectedChromeError = (e) =>
  e.message.includes('Cannot access a chrome:// URL') ||
  e.message.includes(
    'Extension manifest must request permission to access the respective host'
  );

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

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const existingSettings = await getChromeStorageValue(RESCROLLER_SETTINGS_KEY);

  // If no existing data, assume we've just installed
  if (!existingSettings || !Object.keys(existingSettings).length) {
    await setFirstTimeData();

    if (reason === 'install') {
      // ooen settings page only if not an update
      chrome.tabs.create({ url: 'options.html' });
    }
  } else {
    // (Re-)generate CSS in case this is a fresh install on a new device
    await generateScrollbarCSS(existingSettings);
  }
});

/**
 * Listen for page states to change and set our custom CSS when tabs are loading
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') {
    return;
  }

  const isDisabledSite = disabledSites.some((site) => tab?.url?.includes(site));

  if (isDisabledSite) {
    return;
  }

  const generatedCss = await getChromeStorageValue('generated-css', 'local');

  if (!generatedCss) {
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      css: generatedCss,
      target: {
        allFrames: true,
        tabId,
      },
      origin: 'AUTHOR',
    });
  } catch (e) {
    if (isExpectedChromeError(e)) {
      return;
    }
    console.error('Failed to inject CSS:', e);
  }
});

/**
 * Handle action button in Chrome toolbar
 */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'options.html' });
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  disabledSites = await getListOfDisabledSites();

  // Update scrollbars when another device has updated them
  if (areaName === 'sync') {
    const existingSettings = await getChromeStorageValue(
      RESCROLLER_SETTINGS_KEY
    );
    await generateScrollbarCSS(existingSettings);
  }
});
