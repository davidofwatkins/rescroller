/*
Rescroller Chrome Extension
Author: David Watkins (@dwat91)

Redistribution or reuse of this code is permitted for non-profit purposes, as long as the original author is credited.
*/

var exportBuffer; //used to set/cancel setTimeouts for exporting localStorage to Chrome Storage
const EXPORT_BUFFER_TIME = 10000; //10 seconds
var version = chrome.app.getDetails().version;

//If this is the first time running the extension (if it's just been installed), open options page
// ...and Download latest Chrome Storage to Local Storage
refreshLocalStorage(function() {
	if (!getProperty("install_time")) {
		var now = new Date().getTime();
		localStorage["install_time"] = now;
		chrome.tabs.create({ url: "options.html" });
	}
});

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.message == "css_string") {
			sendResponse({ css_string: getCSSString(), restricted_sites: getListOfDisabledSites() });
		}
	}
);


//Handle action button in Chrome toolbar
chrome.browserAction.onClicked.addListener(function(tab) {
  	chrome.tabs.create({ url: "options.html" });
})

function getListOfDisabledSites() {
	var rawString = getProperty("sb-excludedsites");
	
	//Remove all spaces from the string, etc.
	rawString = replaceAll(rawString, " ", "");
	rawString = replaceAll(rawString, "https://", "");
	rawString = replaceAll(rawString, "http://", "");
	rawString = replaceAll(rawString, "www.", "");
	rawString = replaceAll(rawString, "*/", "");
	rawString = replaceAll(rawString, "*.", "");
	rawString = replaceAll(rawString, "*", "");
	
	return rawString.split(",");
}

function replaceAll(theString, toReplace, replaceWith) {
	
	while (theString.indexOf(toReplace) >= 0) {
		theString = theString.replace(toReplace, replaceWith);
	}
	return theString;
}

//Get number of pixels from percentage
function pixels(percentage, doNotReduceByHalf) {
	if (!doNotReduceByHalf) { return ((percentage / 100) * getProperty("sb-size")) / 2; }
	else { return (percentage / 100) * getProperty("sb-size"); }
}

//Grab data from local storage and convert it into a CSS string
function getCSSString() {
	
	//If user has chosen to specify his own CSS, just return that
	if (getProperty("sb-usecustomcss") == "checked") { return getProperty("sb-customcss"); }
		  
	//Because Javascript has no "heredoc" function, the "\"s escape the newlines
	var newCSS = "\
	\
	::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical {\
		width: " + getProperty("sb-size") + "px !important;\
		height: " + getProperty("sb-size") + "px !important;\
		background-color: " + getProperty("sb-subbackground-color") + " !important;\
	}";
		
	if (getProperty("sb-showbuttons") == "checked") {
		newCSS += "\
		::-webkit-scrollbar-button {\
			background-color: " + getProperty("sb-buttons-color") + " !important;\
			border-radius: " + pixels(getProperty("sb-buttons-radius")) + "px !important;\
			box-shadow: inset 0 0 " + pixels(getProperty("sb-buttons-shadow-size"), true) + "px " + getProperty("sb-buttons-shadow-color") + "; !important\
			border: " + pixels(getProperty("sb-buttons-border-size")) + "px " + getProperty("sb-buttons-border-style") + " " + getProperty("sb-buttons-border-color") + " !important;\
			display: block !important;\
		}\
		::-webkit-scrollbar-button:vertical {\
			height: " + getProperty("sb-buttons-size") + "px !important;\
		}\
		::-webkit-scrollbar-button:horizontal {\
			width: " + getProperty("sb-buttons-size") + "px !important;\
		}\
		::-webkit-scrollbar-button:vertical:decrement {\
			background-image: url('" + getProperty("sb-buttons-background-image-up") + "') !important;\
		}\
		::-webkit-scrollbar-button:vertical:increment {\
			background-image: url('" + getProperty("sb-buttons-background-image-down") + "') !important;\
		}\
		::-webkit-scrollbar-button:horizontal:increment {\
			background-image: url('" + getProperty("sb-buttons-background-image-right") + "') !important;\
		}\
		::-webkit-scrollbar-button:horizontal:decrement {\
			background-image: url('" + getProperty("sb-buttons-background-image-left") + "') !important;\
		}";
		
		if (getProperty("sb-buttons-use-hover") == "checked") {
			newCSS += "::-webkit-scrollbar-button:vertical:decrement:hover {\
				background-image: url('" + getProperty("sb-buttons-background-image-up-hover") + "') !important;\
			}\
			::-webkit-scrollbar-button:vertical:increment:hover {\
				background-image: url('" + getProperty("sb-buttons-background-image-down-hover") + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:increment:hover {\
				background-image: url('" + getProperty("sb-buttons-background-image-right-hover") + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:decrement:hover {\
				background-image: url('" + getProperty("sb-buttons-background-image-left-hover") + "') !important;\
			}\
			::-webkit-scrollbar-button:hover {\
			background-color: " + getProperty("sb-buttons-color-hover") + " !important;\
				box-shadow: inset 0 0 " + pixels(getProperty("sb-buttons-shadow-size-hover"), true) + "px " + getProperty("sb-buttons-shadow-color-hover") + "; !important\
			}";
		}
		
		if (getProperty("sb-buttons-use-active") == "checked") {
			newCSS += "::-webkit-scrollbar-button:vertical:decrement:active {\
				background-image: url('" + getProperty("sb-buttons-background-image-up-active") + "') !important;\
			}\
			::-webkit-scrollbar-button:vertical:increment:active {\
				background-image: url('" + getProperty("sb-buttons-background-image-down-active") + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:increment:active {\
				background-image: url('" + getProperty("sb-buttons-background-image-right-active") + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:decrement:active {\
				background-image: url('" + getProperty("sb-buttons-background-image-left-active") + "') !important;\
			}\
			::-webkit-scrollbar-button:active {\
				background-color: " + getProperty("sb-buttons-color-active") + " !important;\
				box-shadow: inset 0 0 " + pixels(getProperty("sb-buttons-shadow-size-active"), true) + "px " + getProperty("sb-buttons-shadow-color-active") + "; !important\
			}";
		}
		
		//Use single buttons (hide the doubles):
		newCSS += "\
		::-webkit-scrollbar-button:vertical:start:increment, ::-webkit-scrollbar-button:vertical:end:decrement, ::-webkit-scrollbar-button:horizontal:start:increment, ::-webkit-scrollbar-button:horizontal:end:decrement {\
			display: none !important;\
		}";
	}
	
	newCSS += "\
	::-webkit-scrollbar-track-piece {\
		background-color: " + getProperty("sb-background-color") + " !important;\
		box-shadow: inset 0 0 " + pixels(getProperty("sb-background-shadow-size"), true) + "px " + getProperty("sb-background-shadow-color") + " !important;\
		border: " + pixels(getProperty("sb-background-border-size")) + "px " + getProperty("sb-background-border-style") + " " + getProperty("sb-background-border-color") + " !important;\
		border-radius: " + pixels(getProperty("sb-background-radius")) + "px !important;\
	}\
	::-webkit-scrollbar-track-piece:vertical {\
		background-image: url('" + getProperty("sb-background-background-image-vertical") + "') !important;\
	}\
	::-webkit-scrollbar-track-piece:horizontal {\
		background-image: url('" + getProperty("sb-background-background-image-horizontal") + "') !important;\
	}";
	
	if (getProperty("sb-background-use-hover") == "checked") {
		newCSS += "::-webkit-scrollbar-track-piece:vertical:hover {\
			background-image: url('" + getProperty("sb-background-background-image-vertical-hover") + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:horizontal:hover {\
			background-image: url('" + getProperty("sb-background-background-image-horizontal-hover") + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:hover {\
			background-color: " + getProperty("sb-background-color-hover") + " !important;\
			box-shadow: inset 0 0 " + pixels(getProperty("sb-background-shadow-size-hover"), true) + "px " + getProperty("sb-background-shadow-color-hover") + " !important;\
		}";
	}
	
	if (getProperty("sb-background-use-active") == "checked") {
		newCSS += "::-webkit-scrollbar-track-piece:vertical:active {\
			background-image: url('" + getProperty("sb-background-background-image-vertical-active") + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:horizontal:active {\
			background-image: url('" + getProperty("sb-background-background-image-horizontal-active") + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:active {\
			background-color: " + getProperty("sb-background-color-active") + " !important;\
			box-shadow: inset 0 0 " + pixels(getProperty("sb-background-shadow-size-active"), true) + "px " + getProperty("sb-background-shadow-color-active") + " !important;\
		}";
	}
	
	newCSS += "::-webkit-scrollbar-thumb {\
		background-color: " + getProperty("sb-slider-color") + " !important;\
		box-shadow: inset 0 0 " + pixels(getProperty("sb-slider-shadow-size"), true) + "px " + getProperty("sb-slider-shadow-color") + " !important;\
		border-radius: " + pixels(getProperty("sb-slider-radius")) + "px !important;\
		border: " + pixels(getProperty("sb-slider-border-size")) + "px " + getProperty("sb-slider-border-style") + " " + getProperty("sb-slider-border-color") + " !important;\
	}\
	::-webkit-scrollbar-thumb:vertical {\
		background-image: url('" + getProperty("sb-slider-background-image-vertical") + "') !important;\
	}\
	::-webkit-scrollbar-thumb:horizontal {\
		background-image: url('" + getProperty("sb-slider-background-image-horizontal") + "') !important;\
	}";
	
	if (getProperty("sb-slider-use-hover") == "checked") {
		newCSS += "::-webkit-scrollbar-thumb:hover {\
			background-color: " + getProperty("sb-slider-color-hover") + " !important;\
			box-shadow: inset 0 0 " + pixels(getProperty("sb-slider-shadow-size-hover"), true) + "px " + getProperty("sb-slider-shadow-color-hover") + " !important;\
		}\
		::-webkit-scrollbar-thumb:vertical:hover {\
			background-image: url('" + getProperty("sb-slider-background-image-vertical-hover") + "') !important;\
		}\
		::-webkit-scrollbar-thumb:horizontal:hover {\
			background-image: url('" + getProperty("sb-slider-background-image-horizontal-hover") + "') !important;\
		}";
	}
	
	if (getProperty("sb-slider-use-active") == "checked") {
		newCSS += "::-webkit-scrollbar-thumb:active {\
			background-color: " + getProperty("sb-slider-color-active") + " !important;\
			box-shadow: inset 0 0 " + pixels(getProperty("sb-slider-shadow-size-active"), true) +  "px " + getProperty("sb-slider-shadow-color-active") + " !important;\
		}\
		::-webkit-scrollbar-thumb:vertical:active {\
			background-image: url('" + getProperty("sb-slider-background-image-vertical-active") + "') !important;\
		}\
		\
		::-webkit-scrollbar-thumb:horizontal:active {\
			background-image: url('" + getProperty("sb-slider-background-image-horizontal-active") + "') !important;\
		}";
	}
	
	
	newCSS += "::-webkit-scrollbar-corner {\
		background-color: " + getProperty("sb-corner-background") + " !important;\
	}"; /*
	::-webkit-resizer {\
		background-color: " + getProperty("sb-resizer-background") + " !important;\
	}"; */
			
	return newCSS;	
}


function saveProperty(key, value) {
	localStorage[key] = value;
}
function getProperty(key) {
	return localStorage[key];
}
function removeProperty(key) {
	localStorage.removeItem(key);
}

//Used for first-time install refresh from Chrome Storage -> Local Storage (or old localStorage -> Chrome Storage)
function refreshLocalStorage(callback) {

	//If this install is upgrading from version 1.0 (no support for Chrome Sync),
	//save the current localStorage data to Chrome Storage
	if (version <= 1.0) {
		queueExportLocalSettings();
		callback();
	}
	
	//Otherwise, if this is a fresh install or is an upgrade from a version that supports Chrome Sync,
	//check for settings from Chrome Storage
	else {
		chrome.storage.sync.get(function(items) {
			for (var key in items) {
				localStorage[key] = items[key];
			}
			callback();
		});
	}	
}

//Save the local settings to chrome.storage in 30 seconds.
function queueExportLocalSettings() {
	clearTimeout(exportBuffer);
	exportBuffer = setTimeout(function() {
		exportLocalSettings();
	}, EXPORT_BUFFER_TIME);
}

function exportLocalSettings() {

	var lsJSON = {};
	for (var mykey in localStorage) {
		lsJSON[mykey] = localStorage[mykey];
	}

	chrome.storage.sync.set(lsJSON);
}


//Detect changes to Chrome Storage, and import them into Local Storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (key in changes) {
  	//Debugging:
    /*var storageChange = changes[key];
    console.log('(Chrome Storage ' + namespace + ') "' + key + '": \t "' + storageChange.oldValue + '" \t --> \t "' + storageChange.newValue + '".');*/

    //Import these to localStorage
    var storageChange = changes[key];
    localStorage[key] = storageChange.newValue;
  }
});