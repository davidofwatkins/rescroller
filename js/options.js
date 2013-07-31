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

/**********TODO******************
  * -(Next version) Figure out how to disable for sites that already have customized scrollbars (if even possible)
  * - TESTING Enable sync (using chrome.storage API instead of localStorage)
  * -Add "restore defaults" to images with defaults
  * - TESTING Show "saved" button so that people know it autosaves
  * -Update jQuery
  * - TESTING Example of site not working: http://answers.yahoo.com - fix by setting <html> tag to overflow: hidden and then reverting to what it was
  * - TESTING Add button in chrome for easy access to settings
*/

var startingLoadTimestamp = Date.now();
var showSaveConfirmation;
if (localStorage["showSaveConfirmation"] != 0 && localStorage["showSaveConfirmation"] != 1) {
	localStorage["showSaveConfirmation"] = 1;
}
var showSaveConfirmTime = 4000;
var saveconfirmationTimeout;

//Enable functionality of Confirm Box "Never Show Again" button
$(document).ready(function() {
	$("#save-confirm #hide-saved-confirm").click(function() {
		localStorage["showSaveConfirmation"] = 0;
		$("#save-confirm").fadeOut("slow");
		return false;
	});
});

function refreshScrollbars() {
	//location.reload(true);
	$("#rescroller").html(chrome.extension.getBackgroundPage().getCSSString());
	var originalOverflow = $("body").css("overflow");
	$("body").css("overflow", "hidden");
	setTimeout(function() { $("body").css("overflow", originalOverflow) }, 10);
}

//Following "plugin" function found here: http://stackoverflow.com/questions/10253663/how-to-detect-the-dragleave-event-in-firefox-when-dragging-outside-the-window/10310815#10310815
$.fn.draghover = function(options) {
	return this.each(function() {
		
		var collection = $(), self = $(this);
			
		self.on('dragenter', function(e) {
			if (collection.size() === 0) {
				self.trigger('draghoverstart');
			}
			collection = collection.add(e.target);
		});
			
		self.on('dragleave', function(e) {
			// timeout is needed because Firefox 3.6 fires the dragleave event on
			// the previous element before firing dragenter on the next one
			setTimeout( function() {
				collection = collection.not(e.target);
				if (collection.size() === 0) {
					self.trigger('draghoverend');
				}          
			}, 1);
		});
	});
};

function showErrorMessage(msg) {
	
	var errorBox = $("#errorbox");
	errorBox.html(msg);
	errorBox.slideDown("fast", function() {
		setTimeout(function() {
			//Hide the error message in 5 seconds
			hideErrorMessage();
		}, 5000);
	});
}

function hideErrorMessage() {
	$("#errorbox").slideUp("fast");
}

function restoreDefaults() {
	
	console.log("restoring defaults...");

	saveProperties({
		
		//General
		"sb-size" : 15,
		"sb-subbackground-color" : "#000000",
		"sb-corner-background" : "#D9D9D9",
		//"sb-excludedsites" : "",
		//"sb-resizer-background" : "#FFC31F",
		
		//Background
		"sb-background-color" : "#C9C9C9",
		"sb-background-shadow-color" : "#000000",
		"sb-background-shadow-size" : 20,
		"sb-background-border-size" : 0,
		"sb-background-border-color" : "#000000",
		"sb-background-border-style" : "solid",
		"sb-background-radius" : 0,
		//hovering
		"sb-background-color-hover" : "#D9D9D9",
		"sb-background-shadow-color-hover" : "#000000",
		"sb-background-shadow-size-hover" : 0,
		//active
		"sb-background-color-active" : "#D9D9D9",
		"sb-background-shadow-color-active" : "#000000",
		"sb-background-shadow-size-active" : 0,
		
		//Scrollbar piece/slider
		"sb-slider-color" : "#666666",
		"sb-slider-shadow-color" : "#000000",
		"sb-slider-shadow-size" : 35,
		"sb-slider-radius" : 0,
		"sb-slider-border-size" : 0,
		"sb-slider-border-color" : "#000000",
		"sb-slider-border-style" : "solid",
		//hovering
		"sb-slider-color-hover" : "#666",
		"sb-slider-shadow-color-hover" : "#000000",
		"sb-slider-shadow-size-hover" : 0,
		//active
		"sb-slider-color-active" : "#666",
		"sb-slider-shadow-color-active" : "#000000",
		"sb-slider-shadow-size-active" : 0,
		
		//Buttons
		"sb-showbuttons" : "off",
		"sb-buttons-size" : 20,
		"sb-buttons-color" : "#666666",
		"sb-buttons-shadow-color" : "#000000",
		"sb-buttons-shadow-size" : 0,
		"sb-buttons-radius" : 0,
		"sb-buttons-border-size" : 0,
		"sb-buttons-border-color" : "#666",
		"sb-buttons-border-style" : "solid",
		"sb-buttons-background-image-up" : chrome.extension.getURL("images/defaults/up.png"),
		"sb-buttons-background-image-down" : chrome.extension.getURL("images/defaults/down.png"),
		"sb-buttons-background-image-left" : chrome.extension.getURL("images/defaults/left.png"),
		"sb-buttons-background-image-right" : chrome.extension.getURL("images/defaults/right.png"),
		//hovering
		"sb-buttons-color-hover" : "#666666",
		"sb-buttons-shadow-color-hover" : "#000000",
		"sb-buttons-shadow-size-hover" : 0,
		"sb-buttons-background-image-up-hover" : chrome.extension.getURL("images/defaults/up.png"),
		"sb-buttons-background-image-down-hover" : chrome.extension.getURL("images/defaults/down.png"),
		"sb-buttons-background-image-left-hover" : chrome.extension.getURL("images/defaults/left.png"),
		"sb-buttons-background-image-right-hover" : chrome.extension.getURL("images/defaults/right.png"),
		//active
		"sb-buttons-color-active" : "#666666",
		"sb-buttons-shadow-color-active" : "#000000",
		"sb-buttons-shadow-size-active" : 0,
		"sb-buttons-background-image-up-active" : chrome.extension.getURL("images/defaults/up.png"),
		"sb-buttons-background-image-down-active" : chrome.extension.getURL("images/defaults/down.png"),
		"sb-buttons-background-image-left-active" : chrome.extension.getURL("images/defaults/left.png"),
		"sb-buttons-background-image-right-active" : chrome.extension.getURL("images/defaults/right.png"),
		
		//Custom CSS
		"sb-customcss" : "::-webkit-scrollbar {\
\n\n\
}\n\
::-webkit-scrollbar-button {\
\n\n\
}\n\
::-webkit-scrollbar-track {\
\n\n\
}\n\
::-webkit-scrollbar-track-piece {\
\n\n\
}\n\
::-webkit-scrollbar-thumb {\
\n\n\
}\n\
::-webkit-scrollbar-corner {\
\n\n\
}\n\
::-webkit-resizer {\
\n\n\
}"
	});
	
	
}

//Convert the styling stored in local storage into CSS:
var newCSS = chrome.extension.getBackgroundPage().getCSSString();

//Write the newly formatted CSS (from local storage) to the (beginning of the) page:
document.write('<style id="rescroller">' + newCSS + "</style>");

//If there is no previously-saved scrollbar CSS in local storage, save it!
if (!getProperty("sb-size") || getProperty("sb-size") == "") {
	restoreDefaults();
}

if (!getProperty("sb-excludedsites")) { saveProperty("sb-excludedsites", ""); }


//When the page has loaded:
$(document).ready(function() {
	
	refreshScrollbars();
	
	//show generated css in css div:
	$("#generatedcss").html(newCSS);
	
	//Fill the excludedsites textarea with the list of excluded sites:
	$("#excludedsites").val(getProperty("sb-excludedsites"));
	$("#excludedsites").change(function() {
		saveProperty("sb-excludedsites", $(this).val());
	});
	
	//Fill the custom CSS form with the custom CSS
	$("#customcss").val(getProperty("sb-customcss"));
	$("#customcss").change(function() {
		saveProperty("sb-customcss", $(this).val());
		refreshScrollbars();
	});
	
	//Fill the form elements with data from local storage:
	$("input").each(function(index, element) {
		
		if ($(this).attr("type") != "submit") { //Make sure we're not talking about the submit button here
			
			if ($(this).attr("type") == "checkbox") { //If it's a check box...
				
				//If local storage says this option should be checked, check it
				if (getProperty($(this).attr("id")) == "checked") {
					$(this).attr("checked", getProperty($(this).attr("id")));
				}
			}
			//If it's an ordinary input, just fill the input with the corresponding value from local storage
			else {
				$(this).val(getProperty($(this).attr("id")));
			}
		}
	});
});

function resetDragHoveringEventTriggering() {
	
	var originalBackground;
	var originalText;
	
	//Following is a pain using "dragenter" and "dragleave" events. draghover() plugin (above) makes it easy!
	$(window).draghover().on({
		"draghoverstart" : function() {
			//console.log("A file has been dragged into the window...");
			originalBackground = $(".selector-button").css("background");
			originalText = $(".selector-button").html();
			$(".selector-button").animate({ "background-color" : "#C91313" }, "slow");
			$(".selector-button").html("Drop Here");
		},
		"draghoverend" : function() {
			//console.log("A file has been dragged out of the window.");
			$(".selector-button").html(originalText);
			$(".selector-button").animate({ "background-color" : originalBackground }, "slow");
		}
	});
}
 
$(document).ready(function() {
	
	$("#expandcss").click(function() {
		$("#generatedcss").slideToggle("fast");
		return false;
	});
	
	//Reset formatting button
	$("#resetformatting").click(function() {
		restoreDefaults();
		location.reload(true);
	});
	
	//Expand/collapse all non-custom css areas when that checkbox is checked	
	if (getProperty("sb-usecustomcss") == "checked") {
		$(".section").not("#misc").not($("#general")).hide();
		$(".customcss-collapsible").hide();
	}
	
	$("#sb-usecustomcss").change(function() {
		if ($(this).is(":checked")) {
			$(".section").not("#misc").not($("#general")).slideUp("slow");
			$(".customcss-collapsible").slideUp("slow");
		}
		else {
			$(".section").slideDown("slow");
			$(".customcss-collapsible").slideDown("slow");
		}
	});
	
	//Clear picture buttons
	$(".clearimage").click(function() {
		var key = $(this).parent().parent().attr("id");
		removeProperty(key);
		$(this).siblings(".thumbframe .thumbcontainer").html("No Image Loaded");
		
		//Hide the thumbframe and restore it with the "Select Image" button
		$("#" + key).children(".thumbframe").hide();
		$("#" + key).children(".selector-button").show();
		
		refreshScrollbars();
		return false;
	});
	
	//Set correct value for <select>s
	$("select").each(function() {
		var thisProperty = $(this).attr('id');
		var thisPropertyValue = getProperty(thisProperty);
		$(this).children().each(function() {
			if($(this).val() == thisPropertyValue) {
				$(this).attr("selected", "selected");
			}
		});
	});
	
	//When <select> is changed, save it to local storage
	$("select").change(function() {
		var thisProperty = $(this).attr('id');
		var currentValue = $(this).val();
		saveProperty(thisProperty, currentValue);
		refreshScrollbars();
	});
	
	/***********Set up Sliders************/
	
	//Main slider (scrollbar size)
	$("#sb-size .slider").slider({
		animate: true,
		min: 0,
		max: 30
	});
	
	//All sliders
	$(".slider").not("#sb-size .slider").slider({
		animate: true,
		min: 0,
		max: 100
	});
	
	//Loop through all "property" classes and set up their inner sliders, etc.
	$(".slider-property").each(function() {
		
		var propertyName = $(this).attr('id');
		var theOrientation;
		if ($(this).children(".slider").hasClass("slider-v")) { theOrientation = "vertical"; }
		else { theOrientation = "horizontal"; }
		
		//If this is one of the few scrollbars that uses px instead of %, set the "units" to px
		var units;
		if (propertyName == "sb-size" || propertyName == "sb-buttons-size") { units = "px"; }
		else { units = "%"; }
		
		//Fill slider value with value from local storage
		$("#" + propertyName + " .slider-value").html(getProperty(propertyName) + units);
		
		//Set up slider for this property
		$("#" + propertyName + " .slider").slider({
			value: getProperty(propertyName),
			orientation: theOrientation,
			slide: function(event, ui) {
				$(this).siblings(".slider-value").html(ui.value + units);
			},
			change: function(event, ui) {
				console.log("The slider has been changed to " + ui.value);
				//Update value in local storage
				saveProperty(propertyName, ui.value);
				refreshScrollbars();
			}
		});
		
	});
	
	/***********Set up Color Pickers************/
	
	$(".colorselection").each(function() {
		
		var localStorageKey = $(this).parent().attr("id");
		var self = $(this);
		
		$(this).miniColors({
			change: function(hex, rgb) {
				//console.log("localStorage[" + localStorageKey + "] will be updated to " + hex);
				saveProperty(localStorageKey, hex);
				self.siblings(".colorvalue").val(hex);
			},
			"close": function() { refreshScrollbars(); }
		});
		
		//Set default color to whatever it's been saved to
		$(this).miniColors("value", getProperty($(this).parent().attr("id")));
	});
	
	//Loop through all image frames and fill them:
	var keys = [
		"sb-slider-background-image-vertical",
		"sb-slider-background-image-horizontal",
		"sb-slider-background-image-vertical-hover",
		"sb-slider-background-image-horizontal-hover",
		"sb-slider-background-image-vertical-active",
		"sb-slider-background-image-horizontal-active",
		
		"sb-background-background-image-vertical",
		"sb-background-background-image-horizontal",
		"sb-background-background-image-vertical-hover",
		"sb-background-background-image-horizontal-hover",
		"sb-background-background-image-vertical-active",
		"sb-background-background-image-horizontal-active",
		
		"sb-buttons-background-image-up",
		"sb-buttons-background-image-down",
		"sb-buttons-background-image-left",
		"sb-buttons-background-image-right",
		"sb-buttons-background-image-up-hover",
		"sb-buttons-background-image-down-hover",
		"sb-buttons-background-image-left-hover",
		"sb-buttons-background-image-right-hover",
		"sb-buttons-background-image-up-active",
		"sb-buttons-background-image-down-active",
		"sb-buttons-background-image-left-active",
		"sb-buttons-background-image-right-active"
	]
	
	for (var i = 0; i < keys.length; i++) {
		
		if (getProperty(keys[i])) {
			$("#" + keys[i] + " .thumbframe div.thumbcontainer").html('<img src="' + getProperty(keys[i]) + '" />');
			$("#" + keys[i] + " .thumbframe").css("display", "inline-block"); //show the image frame for this image
		}
		else {
			//otherwise, show the "upload image" button (instead of the thumbframe)
			$("#" + keys[i] + " .selector-button").css("display", "inline-block");
		}
	}
	
	//draghover() "plugin" stops working after being utilized once, so needed to be in function that can be recalled
	resetDragHoveringEventTriggering();
	
	//Fill "colorvalue" inputs with color values
	$(".colorvalue").each(function() {
		$(this).val(getProperty($(this).parent().attr("id")));
	});
	
	//Automatically select text when clicking a color value
	$(".colorvalue").focus(function() {
		var self = $(this);
		$(this).select(); //Select the value of the input form
		$(this).mouseup(function(e) { //Prevent the text from being unselected when you stop the click
			e.preventDefault();
			self.off("mouseup"); //Remove the mouseup function to restore normal functionality
		});
	});
	
	$(".colorvalue").change(function() {
		var val = $(this).val();
		//If the value is a hex value, save it
		if (val.indexOf("#") == 0 && (val.length == 4 || val.length == 7)) {
			$(this).siblings(".colorselection").miniColors("value", val);
			refreshScrollbars();
		}
		//If the user just forgot the #, add it automatically and save
		else if (val.indexOf("#") != 0 && (val.length == 3 || val.length == 6)) {
			$(this).siblings(".colorselection").miniColors("value", "#" + val);
			$(this).val("#" + val);
			refreshScrollbars();
		}
		//If it's just a bad value, restore original
		else {
			$(this).val(getProperty($(this).parent().attr("id")));
		}
		
	});
 
 /********** Collapsable Checkboxes *********************/
	 
	 //Scroll buttons
	 var showButtons = $("#sb-showbuttons");
	 
	 //Make sure wrapper is correctly expanded on load
	 if (showButtons.is(":checked")) { $("#buttons-toggleable").show(); }
	 else { $("#buttons-toggleable").hide(); }
	 
	 //When checkbox is changed:
	 showButtons.change(function() {

		//Expand/collapse wrapper & save value to local storage
		if ($(this).is(":checked")) {
			saveProperty($(this).attr("id"), "checked");
			$("#buttons-toggleable").slideDown("fast", function() { refreshScrollbars(); });
		}
		else {
			saveProperty($(this).attr("id"), "unchecked");
			$("#buttons-toggleable").slideUp("fast", function() { refreshScrollbars(); });
		}
	 });
	 
	 /************* Slider Hover/Active Checkboxes **************/
	 
	 //Make sure wrappers are correctly expanded/collapsed on load
	 $(".toggle-hover-active").each(function() {
		 
		 var targetWrapper = $("#" + $(this).attr("data-wrapperid"));
		 
		 if ($(this).is(":checked")) { targetWrapper.show(); }
		 else { targetWrapper.hide(); }
	 });
	 
	 //Expand/collapse and write to local Storage
	 $(".toggle-hover-active").change(function() {
		
		if ($(this).is(":checked")) {
			//alert("Checked!");
			saveProperty($(this).attr("id"), "checked");
			$("#" + $(this).attr("data-wrapperid")).slideDown("slow", function() { refreshScrollbars(); });
		}
		else {
			//alert("Unchecked!");
			saveProperty($(this).attr("id"), "unchecked");
			$("#" + $(this).attr("data-wrapperid")).slideUp("slow", function() { refreshScrollbars(); });
		}
		
		refreshScrollbars();
		
	 });
	 
 });
 
/***********Image selector functionality*****************/

function handleFiles(files, frame, key) {
	
	var file = files[0];
	var imageType = /image.*/;
	
	if (!file.type.match(imageType)) {
		showErrorMessage("Sorry, you must select an image file. Please try again.")
	}
		
	else {
		
		//hide any error messages
		hideErrorMessage();
		
		var img = document.createElement("img");
		img.classList.add("obj");
		img.file = file;
		
		frame.innerHTML = ""; //clear frame before putting new image in
		frame.appendChild(img);
		
		var reader = new FileReader();  
		reader.onload = (function(aImg) {
			return function(e) {
				aImg.src = e.target.result;
				
				//Save to local storage
				saveProperty(key, aImg.src);
				
				//Change the "Select Image" button to an image frame
				var container = $(frame).parents(".imagepicker-container");
				container.children(".selector-button").hide();
				container.children(".thumbframe").show();
				
				//Redraw scrollbars
				refreshScrollbars();
			};
		})(img);
		reader.readAsDataURL(file);
		
		
	}
}

$(document).ready(function() {
	
	//Whenever selectors (hidden <input type="file">s) are changed, save their valuese to local storage
	$(".selector").change(function() {
		handleFiles(this.files, $(this).siblings(".thumbframe").children("div.thumbcontainer").get()[0], $(this).parent().attr("id"))
	});
	
	//Whenever selector buttons are clicked, invoke their related selector's click function (i.e., save their contents to local storage)
	$(".selector-button").click(function() {
		$(this).siblings(".selector").get()[0].click();
		return false;
	});
	
	//Whenever a file is dropped on a dropbox, save the file to local storage with the associated value
	$(".selector-button").bind("drop", function(eventObj) {
		e = eventObj.originalEvent;
		e.stopPropagation();
		e.preventDefault();
		
		var dt = e.dataTransfer;  
		var files = dt.files;
		
		handleFiles(files, $(this).siblings(".thumbframe").children("div.thumbcontainer").get()[0], $(this).parent().attr("id"));
		
		//Hide the dropbox
		$(".selector-button").html("Select Image");
		$(".selector-button").animate({ "background-color" : "#333" }, "slow");
		resetDragHoveringEventTriggering();
		return false;
		
	});
});

//Show "saved" confirmation box
function showSaveConfirmationBox() {
	clearTimeout(saveconfirmationTimeout);
	if (localStorage["showSaveConfirmation"] == 1) {
		$("#save-confirm").fadeIn("slow");
		saveconfirmationTimeout = setTimeout(function() {
			$("#save-confirm").fadeOut("slow");
		}, showSaveConfirmTime)
	}
}

//Saves to local storage via localStorage[] and chrome.storage
function saveProperty(key, value) {
	console.log("Saving " + key + " -> " + value);
	localStorage[key] = value;
	queueExportLocalSettings();
	if ((Date.now() - 500) > startingLoadTimestamp) 
		showSaveConfirmationBox(); //Do not show this message if the page just loaded
}

function saveProperties(props) {
	for (var key in props) {
		var attrName = key;
		var attrValue = props[key];

		localStorage[attrName] = attrValue;
	}

	//Export to Chrome.storage
	queueExportLocalSettings();
}

function getProperty(key) {
	return localStorage[key];
}
function removeProperty(key) {
	localStorage.removeItem(key);
}

//Shortcut to queueExportLocalSettings() in background page
function queueExportLocalSettings() {
	chrome.extension.getBackgroundPage().queueExportLocalSettings();
}

/* TODO:
 
 - DONE - Add buffering mechanism to prevent several pushes to chrome.storage at once (maybe limit to once every 60 minutes)
 - NOT NECESSARY (?) - Detect when sync is incoming or outgoing - when incoming, save chrome.storage to localStorage (background page)
 - DONE - When installing for the first time, check chrome.storage before setting defaults to see if the user has already specified scrollbars from another computer

 */