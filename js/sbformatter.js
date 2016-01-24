/**
 * Our content script, which is loaded into every page. Unfortunately, we can't directly inject the CSS
 * from here (at least without doing some hacky and unstable HTML appending), so we need to tell the
 * background page to do it for us.
 */

// Tell background.js to inject our CSS!
chrome.extension.sendRequest({ message: "perform_css_injection" });