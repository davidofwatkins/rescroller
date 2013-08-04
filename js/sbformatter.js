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
			
			//In case the scrollbars loaded before the custom style was injected, regenerate all scrollbars
			window.addEventListener("load", function() { //Add to window.onload "queue"
				
				var originalOverflow = document.getElementsByTagName("body")[0].style.overflow;
				/*if (document.getElementsByTagName("body")[0].style.overflow == "" || document.getElementsByTagName("body")[0].style.overflow == "scroll") {
					originalOverflow = "scroll";
				}
				else { originalOverflow = document.getElementsByTagName("body")[0].style.overflow; }*/
				
				document.getElementsByTagName("body")[0].style.overflow = "hidden";
				setTimeout(function() {
					document.getElementsByTagName("body")[0].style.overflow = originalOverflow;
				}, 10);
			}, false);
		}
	}
});

//Failsafe for pages that don't show redesigned scrollbars before page has loaded
document.addEventListener('DOMContentLoaded', function() { //like $(document).ready()
	redrawScrollbars();
}, false);

function redrawScrollbars() {
	//Get existing scrollbar properties
	var html = document.getElementsByTagName("html")[0];
	var body = document.getElementsByTagName("body")[0];

    var htmlCurrentOverflow = html.style.overflow
    var bodyCurrentOverflow = body.style.overflow

    //Hide <html> and <body> scrollbars
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    //Show <html> and <body> scrollbars again (using their previously set properties)
    setTimeout(function() {
    	html.style.overflow = htmlCurrentOverflow;
    	body.style.overflow = bodyCurrentOverflow;
    }, 1);
}