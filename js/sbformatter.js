/*
Rescroller Chrome Extension
Author: David Watkins (@dwat91)

Redistribution or reuse of this code is permitted for non-profit purposes, as long as the original author is credited.
*/


var restrictedSites;
var customCSS;
var url = window.location.host + window.location.pathname;

//Ask background page for CSS (and array of disabled sites) stored in local storage
chrome.extension.sendRequest({ message: "css_string" }, function(response) {

	var proceed = true;

	customCSS = response.css_string;
	restrictedSites = response.restricted_sites;
	
	for (var site in restrictedSites) {
		
		//If there's a match for one of the restricted sites, don't proceed
		if (url.indexOf(restrictedSites[site]) >= 0 && restrictedSites[site].length > 0) { //don't care about empty strings ("")
			proceed = false;
		}
	}
	
	if (proceed) {
		//create a style tag at the head of the document
		if(document.getElementById('rescroller') == null){
			var headID = document.documentElement;
			var cssNode = document.createElement('style');
			cssNode.setAttribute('id', 'rescroller');
			
			//Fill the freshly created <style> tag with the generated CSS from the background page:
			cssNode.innerText = customCSS;
			headID.appendChild(cssNode);

			//Refresh the scrollbars
			document.addEventListener('DOMContentLoaded', function() { //like $(document).ready()
				redrawScrollbars();
				setTimeout(function() { redrawScrollbars(); }, 1000); //failsafe: draw them again in case it didn't work the first time
			}, false);

			/**
				Developer Note:

				The document.DOMContentLoaded event listener will work fine for most
				pages. However, it may fire before some pages have fully downloaded everything,
				causing it to fail. The window.load listener would solve this problem, but
				it does not refresh the scrollbars when the tab is not in focus (for some
				reason). Setting a window.onfocus event might fix this, but it would not be ideal
				to redraw the scrollbars every time the user leaves and comes back to the page.

				For now, the fix is to redrawScrollbars() at document.DOMContentLoaded, and then
				redrawScrollbars() again in 1 second. For most pages, this will be enough time before
				refreshing the bars, though for some (with slow connections), it may not be sufficient.
				Still, this is only a problem for pages that don't work the first time anyway.
			**/

		}
	}
});

function redrawScrollbars() {
	//Get existing scrollbar properties
	var html = document.getElementsByTagName("html")[0];
	var body = document.getElementsByTagName("body")[0];

    var htmlCurrentOverflow = getComputedStyle(html, null).overflow;
    var bodyCurrentOverflow = getComputedStyle(body, null).overflow;

    //Hide <html> and <body> scrollbars
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    //Show <html> and <body> scrollbars again (using their previously set properties)
    setTimeout(function() {
    	html.style.overflow = htmlCurrentOverflow;
    	body.style.overflow = bodyCurrentOverflow;
    }, 10);
}