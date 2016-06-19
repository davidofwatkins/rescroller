/**
 * The Rescroller API
 */

window.Rescroller = {

    version: chrome.app.getDetails().version,
    EXPORT_BUFFER_TIME: 7000,                   // 7 seconds
    _exportBuffer: null,                        // used to set/cancel setTimeouts for exporting localStorage to Chrome Storage

    getListOfDisabledSites: function() {
        var rawString = this.getProperty("sb-excludedsites");
        
        //Remove all spaces from the string, etc.
        rawString = this._replaceAll(rawString, " ", "");
        rawString = this._replaceAll(rawString, "https://", "");
        rawString = this._replaceAll(rawString, "http://", "");
        rawString = this._replaceAll(rawString, "www.", "");
        rawString = this._replaceAll(rawString, "*/", "");
        rawString = this._replaceAll(rawString, "*.", "");
        rawString = this._replaceAll(rawString, "*", "");
        
        return rawString.split(",");
    },

    _replaceAll: function(theString, toReplace, replaceWith) {
        
        while (theString.indexOf(toReplace) >= 0) {
            theString = theString.replace(toReplace, replaceWith);
        }
        return theString;
    },

    /**
     * Get number of pixels from percentage
     */
    _precentageToPixels: function(percentage, doNotReduceByHalf) {
        if (!doNotReduceByHalf) {
            return ((percentage / 100) * this.getProperty("sb-size")) / 2;
        }

        return (percentage / 100) * this.getProperty("sb-size");
    },

    /**
     * Saves to local storage via localStorage[] and chrome.storage
     */
    saveProperty: function(key, value, callback) {
        localStorage[key] = value;
        if (callback)
            callback();

        this.queueExportLocalSettings();

        if ((Date.now() - 500) > startingLoadTimestamp) {
            showSaveConfirmationBox(); //Do not show this message if the page just loaded
        }
    },

    saveProperties: function(props) {
        for (var key in props) {
            var attrName = key;
            var attrValue = props[key];

            localStorage[attrName] = attrValue;
        }

        //Export to Chrome.storage
        this.queueExportLocalSettings();
    },

    getProperty: function(key) {
        return localStorage[key];
    },

    /**
     * Used for first-time install refresh from Chrome Storage -> Local Storage (or old localStorage -> Chrome Storage)
     */
    refreshLocalStorage: function(callback) {

        // If this install is upgrading from version 1.0 (no support for Chrome Sync),
        // save the current localStorage data to Chrome Storage
        if (this.version <= 1.0) {
            this.queueExportLocalSettings();
            callback();
            return;
        }
        
        // Otherwise, if this is a fresh install or is an upgrade from a version that supports Chrome Sync,
        // check for settings from Chrome Storage
        chrome.storage.sync.get(function(items) {
            for (var key in items) {
                localStorage[key] = items[key];
            }
            callback();
        });
    },

    /**
     * Save the local settings to chrome.storage in 30 seconds.
     */
    queueExportLocalSettings: function() {
        var that = this;
        clearTimeout(this._exportBuffer);
        this._exportBuffer = setTimeout(function() {
            that.exportLocalSettings();
        }, this.EXPORT_BUFFER_TIME);
    },

    exportLocalSettings: function() {

        var lsJSON = {};
        for (var mykey in localStorage) {
            lsJSON[mykey] = localStorage[mykey];
        }

        chrome.storage.sync.set(lsJSON);
    },

    /**
     * Grab data from local storage and convert it into a CSS string
     */
    getCSSString: function() {
        
        var value = null;

        // If user has chosen to specify his own CSS, just return that
        if (this.getProperty("sb-usecustomcss") == "checked") { return this.getProperty("sb-customcss"); }
              
        // Because Javascript has no "heredoc" function, the "\"s escape the newlines
        var newCSS = "\
        \
        ::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical {\
            width: " + this.getProperty("sb-size") + "px !important;\
            height: " + this.getProperty("sb-size") + "px !important;\
            background-color: " + this.getProperty("sb-subbackground-color") + " !important;\
        }";
            
        if (this.getProperty("sb-showbuttons") == "checked") {
            newCSS += "\
            ::-webkit-scrollbar-button {\
                background-color: " + this.getProperty("sb-buttons-color") + " !important;\
                border-radius: " + this._precentageToPixels(this.getProperty("sb-buttons-radius")) + "px !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-buttons-shadow-size"), true) + "px " + this.getProperty("sb-buttons-shadow-color") + "; !important\
                border: " + this._precentageToPixels(this.getProperty("sb-buttons-border-size")) + "px " + this.getProperty("sb-buttons-border-style") + " " + this.getProperty("sb-buttons-border-color") + " !important;\
                display: block !important;\
            }\
            ::-webkit-scrollbar-button:vertical {\
                height: " + this.getProperty("sb-buttons-size") + "px !important;\
            }\
            ::-webkit-scrollbar-button:horizontal {\
                width: " + this.getProperty("sb-buttons-size") + "px !important;\
            }\
            ::-webkit-scrollbar-button:vertical:decrement {";
                value =  this.getProperty("sb-buttons-background-image-up");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-button:vertical:increment {";
                value = this.getProperty("sb-buttons-background-image-down");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-button:horizontal:increment {";
                value = this.getProperty("sb-buttons-background-image-right");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-button:horizontal:decrement {";
                value = this.getProperty("sb-buttons-background-image-left");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }";
            
            if (this.getProperty("sb-buttons-use-hover") == "checked") {
                newCSS += "::-webkit-scrollbar-button:vertical:decrement:hover {";
                    value = this.getProperty("sb-buttons-background-image-up-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:vertical:increment:hover {";
                    value = this.getProperty("sb-buttons-background-image-down-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:increment:hover {";
                    value = this.getProperty("sb-buttons-background-image-right-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:decrement:hover {";
                    value = this.getProperty("sb-buttons-background-image-left-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:hover {\
                    background-color: " + this.getProperty("sb-buttons-color-hover") + " !important;\
                    box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-buttons-shadow-size-hover"), true) + "px " + this.getProperty("sb-buttons-shadow-color-hover") + "; !important\
                }";
            }
            
            if (this.getProperty("sb-buttons-use-active") == "checked") {
                newCSS += "::-webkit-scrollbar-button:vertical:decrement:active {";
                    value = this.getProperty("sb-buttons-background-image-up-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:vertical:increment:active {";
                    value = this.getProperty("sb-buttons-background-image-down-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:increment:active {";
                    value = this.getProperty("sb-buttons-background-image-right-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:decrement:active {";
                    value = this.getProperty("sb-buttons-background-image-left-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:active {\
                    background-color: " + this.getProperty("sb-buttons-color-active") + " !important;\
                    box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-buttons-shadow-size-active"), true) + "px " + this.getProperty("sb-buttons-shadow-color-active") + "; !important\
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
            background-color: " + this.getProperty("sb-background-color") + " !important;\
            box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-background-shadow-size"), true) + "px " + this.getProperty("sb-background-shadow-color") + " !important;\
            border: " + this._precentageToPixels(this.getProperty("sb-background-border-size")) + "px " + this.getProperty("sb-background-border-style") + " " + this.getProperty("sb-background-border-color") + " !important;\
            border-radius: " + this._precentageToPixels(this.getProperty("sb-background-radius")) + "px !important;\
        }\
        ::-webkit-scrollbar-track-piece:vertical {";
            value = this.getProperty("sb-background-background-image-vertical");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }\
        ::-webkit-scrollbar-track-piece:horizontal {";
            value = this.getProperty("sb-background-background-image-horizontal");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }";

        if (this.getProperty("sb-background-use-hover") == "checked") {
            newCSS += "::-webkit-scrollbar-track-piece:vertical:hover {";
                value = this.getProperty("sb-background-background-image-vertical-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:horizontal:hover {";
                value = this.getProperty("sb-background-background-image-horizontal-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:hover {\
                background-color: " + this.getProperty("sb-background-color-hover") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-background-shadow-size-hover"), true) + "px " + this.getProperty("sb-background-shadow-color-hover") + " !important;\
            }";
        }
        
        if (this.getProperty("sb-background-use-active") == "checked") {
            newCSS += "::-webkit-scrollbar-track-piece:vertical:active {";
                value = this.getProperty("sb-background-background-image-vertical-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:horizontal:active {";
                value = this.getProperty("sb-background-background-image-horizontal-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:active {\
                background-color: " + this.getProperty("sb-background-color-active") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-background-shadow-size-active"), true) + "px " + this.getProperty("sb-background-shadow-color-active") + " !important;\
            }";
        }
        
        newCSS += "::-webkit-scrollbar-thumb {\
            background-color: " + this.getProperty("sb-slider-color") + " !important;\
            box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-slider-shadow-size"), true) + "px " + this.getProperty("sb-slider-shadow-color") + " !important;\
            border-radius: " + this._precentageToPixels(this.getProperty("sb-slider-radius")) + "px !important;\
            border: " + this._precentageToPixels(this.getProperty("sb-slider-border-size")) + "px " + this.getProperty("sb-slider-border-style") + " " + this.getProperty("sb-slider-border-color") + " !important;\
        }\
        ::-webkit-scrollbar-thumb:vertical {";
            value = this.getProperty("sb-slider-background-image-vertical");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }\
        ::-webkit-scrollbar-thumb:horizontal {";
            value = this.getProperty("sb-slider-background-image-horizontal");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }";
        
        if (this.getProperty("sb-slider-use-hover") == "checked") {
            newCSS += "::-webkit-scrollbar-thumb:hover {\
                background-color: " + this.getProperty("sb-slider-color-hover") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-slider-shadow-size-hover"), true) + "px " + this.getProperty("sb-slider-shadow-color-hover") + " !important;\
            }\
            ::-webkit-scrollbar-thumb:vertical:hover {";
                value = this.getProperty("sb-slider-background-image-vertical-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-thumb:horizontal:hover {";
                value = this.getProperty("sb-slider-background-image-horizontal-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }";
        }
        
        if (this.getProperty("sb-slider-use-active") == "checked") {
            newCSS += "::-webkit-scrollbar-thumb:active {\
                background-color: " + this.getProperty("sb-slider-color-active") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("sb-slider-shadow-size-active"), true) +  "px " + this.getProperty("sb-slider-shadow-color-active") + " !important;\
            }\
            ::-webkit-scrollbar-thumb:vertical:active {";
                value = this.getProperty("sb-slider-background-image-vertical-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            \
            ::-webkit-scrollbar-thumb:horizontal:active {";
                value = this.getProperty("sb-slider-background-image-horizontal-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }";
        }
        
        
        newCSS += "::-webkit-scrollbar-corner {\
            background-color: " + this.getProperty("sb-corner-background") + " !important;\
        }"; /*
        ::-webkit-resizer {\
            background-color: " + this.getProperty("sb-resizer-background") + " !important;\
        }"; */
                
        return newCSS;  
    }

}