/*

Rescroller Chrome Extension
Author: David Watkins (@dwat91)

Special thanks to the following:

-Alte Mo for background image: http://subtlepatterns.com/?p=1293
-jQuery for options page functionality: http://jquery.com/
-jQuery UI for slider widgets on options page: http://jqueryui.com/
-MiniColors for image selector widgets on options page: https://github.com/claviska/jquery-miniColors/
-"Righteous" font: http://www.google.com/webfonts/specimen/Righteous

Redistribution or reuse of this code is permitted for non-profit purposes, as long as the original author is credited.
*/

//If this is the first time running the extension (if it's just been installed), open options page
if (!localStorage.getItem("install_time")) {
	var now = new Date().getTime();
	localStorage["install_time"] = now;
	chrome.tabs.create({ url: "options.html" });
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
	//console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
	if (request.message == "css_string") {
		
		sendResponse({ css_string: getCSSString(), restricted_sites: getListOfDisabledSites() });
	}
});


function getListOfDisabledSites() {
	var rawString = localStorage["sb-excludedsites"];
	
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

function saveCSS(css) {
	
	//alert("saving CSS");
	
	for(var key in css){
		var attrName = key;
		var attrValue = css[key];
		
		//alert("writing " + attrValue + " to " + attrName + " in localStorage");
		localStorage[attrName] = attrValue;
	}
}

//Get number of pixels from percentage
function pixels(percentage, doNotReduceByHalf) {
	//console.log("Converting " + percentage + "% to " + result + "px");
	if (!doNotReduceByHalf) { return ((percentage / 100) * localStorage["sb-size"]) / 2; }
	else { return (percentage / 100) * localStorage["sb-size"]; }
}

//Grab data from local storage and convert it into a CSS string
function getCSSString() {
	
	//If user has chosen to specify his own CSS, just return that
	if (localStorage["sb-usecustomcss"] == "checked") { return localStorage["sb-customcss"]; }
		  
	//Because Javascript has no "heredoc" function, the "\"s escape the newlines
	var newCSS = "\
	\
	::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical {\
		width: " + localStorage["sb-size"] + "px !important;\
		height: " + localStorage["sb-size"] + "px !important;\
		background-color: " + localStorage["sb-subbackground-color"] + " !important;\
	}";
		
	if (localStorage["sb-showbuttons"] == "checked") {
		newCSS += "\
		::-webkit-scrollbar-button {\
			background-color: " + localStorage["sb-buttons-color"] + " !important;\
			border-radius: " + pixels(localStorage["sb-buttons-radius"]) + "px !important;\
			box-shadow: inset 0 0 " + pixels(localStorage["sb-buttons-shadow-size"], true) + "px " + localStorage["sb-buttons-shadow-color"] + "; !important\
			border: " + pixels(localStorage["sb-buttons-border-size"]) + "px " + localStorage["sb-buttons-border-style"] + " " + localStorage["sb-buttons-border-color"] + " !important;\
			display: block !important;\
		}\
		::-webkit-scrollbar-button:vertical {\
			height: " + localStorage["sb-buttons-size"] + "px !important;\
		}\
		::-webkit-scrollbar-button:horizontal {\
			width: " + localStorage["sb-buttons-size"] + "px !important;\
		}\
		::-webkit-scrollbar-button:vertical:decrement {\
			background-image: url('" + localStorage["sb-buttons-background-image-up"] + "') !important;\
		}\
		::-webkit-scrollbar-button:vertical:increment {\
			background-image: url('" + localStorage["sb-buttons-background-image-down"] + "') !important;\
		}\
		::-webkit-scrollbar-button:horizontal:increment {\
			background-image: url('" + localStorage["sb-buttons-background-image-right"] + "') !important;\
		}\
		::-webkit-scrollbar-button:horizontal:decrement {\
			background-image: url('" + localStorage["sb-buttons-background-image-left"] + "') !important;\
		}";
		
		if (localStorage["sb-buttons-use-hover"] == "checked") {
			newCSS += "::-webkit-scrollbar-button:vertical:decrement:hover {\
				background-image: url('" + localStorage["sb-buttons-background-image-up-hover"] + "') !important;\
			}\
			::-webkit-scrollbar-button:vertical:increment:hover {\
				background-image: url('" + localStorage["sb-buttons-background-image-down-hover"] + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:increment:hover {\
				background-image: url('" + localStorage["sb-buttons-background-image-right-hover"] + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:decrement:hover {\
				background-image: url('" + localStorage["sb-buttons-background-image-left-hover"] + "') !important;\
			}\
			::-webkit-scrollbar-button:hover {\
			background-color: " + localStorage["sb-buttons-color-hover"] + " !important;\
				box-shadow: inset 0 0 " + pixels(localStorage["sb-buttons-shadow-size-hover"], true) + "px " + localStorage["sb-buttons-shadow-color-hover"] + "; !important\
			}";
		}
		
		if (localStorage["sb-buttons-use-active"] == "checked") {
			newCSS += "::-webkit-scrollbar-button:vertical:decrement:active {\
				background-image: url('" + localStorage["sb-buttons-background-image-up-active"] + "') !important;\
			}\
			::-webkit-scrollbar-button:vertical:increment:active {\
				background-image: url('" + localStorage["sb-buttons-background-image-down-active"] + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:increment:active {\
				background-image: url('" + localStorage["sb-buttons-background-image-right-active"] + "') !important;\
			}\
			::-webkit-scrollbar-button:horizontal:decrement:active {\
				background-image: url('" + localStorage["sb-buttons-background-image-left-active"] + "') !important;\
			}\
			::-webkit-scrollbar-button:active {\
				background-color: " + localStorage["sb-buttons-color-active"] + " !important;\
				box-shadow: inset 0 0 " + pixels(localStorage["sb-buttons-shadow-size-active"], true) + "px " + localStorage["sb-buttons-shadow-color-active"] + "; !important\
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
		background-color: " + localStorage["sb-background-color"] + " !important;\
		box-shadow: inset 0 0 " + pixels(localStorage["sb-background-shadow-size"], true) + "px " + localStorage["sb-background-shadow-color"] + " !important;\
		border: " + pixels(localStorage["sb-background-border-size"]) + "px " + localStorage["sb-background-border-style"] + " " + localStorage["sb-background-border-color"] + " !important;\
		border-radius: " + pixels(localStorage["sb-background-radius"]) + "px !important;\
	}\
	::-webkit-scrollbar-track-piece:vertical {\
		background-image: url('" + localStorage["sb-background-background-image-vertical"] + "') !important;\
	}\
	::-webkit-scrollbar-track-piece:horizontal {\
		background-image: url('" + localStorage["sb-background-background-image-horizontal"] + "') !important;\
	}";
	
	if (localStorage["sb-background-use-hover"] == "checked") {
		newCSS += "::-webkit-scrollbar-track-piece:vertical:hover {\
			background-image: url('" + localStorage["sb-background-background-image-vertical-hover"] + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:horizontal:hover {\
			background-image: url('" + localStorage["sb-background-background-image-horizontal-hover"] + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:hover {\
			background-color: " + localStorage["sb-background-color-hover"] + " !important;\
			box-shadow: inset 0 0 " + pixels(localStorage["sb-background-shadow-size-hover"], true) + "px " + localStorage["sb-background-shadow-color-hover"] + " !important;\
		}";
	}
	
	if (localStorage["sb-background-use-active"] == "checked") {
		newCSS += "::-webkit-scrollbar-track-piece:vertical:active {\
			background-image: url('" + localStorage["sb-background-background-image-vertical-active"] + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:horizontal:active {\
			background-image: url('" + localStorage["sb-background-background-image-horizontal-active"] + "') !important;\
		}\
		::-webkit-scrollbar-track-piece:active {\
			background-color: " + localStorage["sb-background-color-active"] + " !important;\
			box-shadow: inset 0 0 " + pixels(localStorage["sb-background-shadow-size-active"], true) + "px " + localStorage["sb-background-shadow-color-active"] + " !important;\
		}";
	}
	
	newCSS += "::-webkit-scrollbar-thumb {\
		background-color: " + localStorage["sb-slider-color"] + " !important;\
		box-shadow: inset 0 0 " + pixels(localStorage["sb-slider-shadow-size"], true) + "px " + localStorage["sb-slider-shadow-color"] + " !important;\
		border-radius: " + pixels(localStorage["sb-slider-radius"]) + "px !important;\
		border: " + pixels(localStorage["sb-slider-border-size"]) + "px " + localStorage["sb-slider-border-style"] + " " + localStorage["sb-slider-border-color"] + " !important;\
	}\
	::-webkit-scrollbar-thumb:vertical {\
		background-image: url('" + localStorage["sb-slider-background-image-vertical"] + "') !important;\
	}\
	::-webkit-scrollbar-thumb:horizontal {\
		background-image: url('" + localStorage["sb-slider-background-image-horizontal"] + "') !important;\
	}";
	
	if (localStorage["sb-slider-use-hover"] == "checked") {
		newCSS += "::-webkit-scrollbar-thumb:hover {\
			background-color: " + localStorage["sb-slider-color-hover"] + " !important;\
			box-shadow: inset 0 0 " + pixels(localStorage["sb-slider-shadow-size-hover"], true) + "px " + localStorage["sb-slider-shadow-color-hover"] + " !important;\
		}\
		::-webkit-scrollbar-thumb:vertical:hover {\
			background-image: url('" + localStorage["sb-slider-background-image-vertical-hover"] + "') !important;\
		}\
		::-webkit-scrollbar-thumb:horizontal:hover {\
			background-image: url('" + localStorage["sb-slider-background-image-horizontal-hover"] + "') !important;\
		}";
	}
	
	if (localStorage["sb-slider-use-active"] == "checked") {
		newCSS += "::-webkit-scrollbar-thumb:active {\
			background-color: " + localStorage["sb-slider-color-active"] + " !important;\
			box-shadow: inset 0 0 " + pixels(localStorage["sb-slider-shadow-size-active"], true) +  "px " + localStorage["sb-slider-shadow-color-active"] + " !important;\
		}\
		::-webkit-scrollbar-thumb:vertical:active {\
			background-image: url('" + localStorage["sb-slider-background-image-vertical-active"] + "') !important;\
		}\
		\
		::-webkit-scrollbar-thumb:horizontal:active {\
			background-image: url('" + localStorage["sb-slider-background-image-horizontal-active"] + "') !important;\
		}";
	}
	
	
	newCSS += "::-webkit-scrollbar-corner {\
		background-color: " + localStorage["sb-corner-background"] + " !important;\
	}"; /*
	::-webkit-resizer {\
		background-color: " + localStorage["sb-resizer-background"] + " !important;\
	}"; */
			
	return newCSS;
	
	// Not super necesssary, but: perhaps create a "cached css string" in local storage that's
	// calculated every time the settings are saved, so the browser doesn't have to compile the string EVERY
	// page load...?
	
}