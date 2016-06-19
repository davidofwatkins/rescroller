/**
 * The Rescroller API
 */

window.Rescroller = {

    EXPORT_BUFFER_TIME: 7000,                   // 7 seconds

    version: chrome.app.getDetails().version,
    _exportBuffer: null,                        // used to set/cancel setTimeouts for exporting localStorage to Chrome Storage
    _settings: null,                            // a cached JSON version of our settings from localStorage. 

    /**
     * Migration from 1.2 --> 1.3. Migrate all our "sb-*" keys in localStorage to a single key.
     */
    migrateDataToSingleKey: function() {
        if (!localStorage['sb-size']) { return; } // already migrated

        // @todo:david we should probably store the fake-CSS values of the scrollbars themselves in a sub-settings
        // object, so it's separate from other app settings.
        
        // @todo:david we should also store images in their own localStorage keys to prevent issues with
        // Chrome sync data limits.

        var json = {};

        Object.keys(localStorage).forEach(function(key) {
            if (key == 'sb-excludedsites') { return true; } // continue - we'll keep this out of our settings to keep our background page lightweight
            if (key.indexOf('sb-') !== 0) { return true; } // continue

            json[key.substr(3, key.length -1)] = localStorage[key]; // set new key as old without the 'sb-' prefix
            localStorage.removeItem(key);
        });

        this._settings = json;
        localStorage['rescroller_settings'] = JSON.stringify(json)
    },

    /**
     * Simple callback method that callers can set to act when the settings have been updated.
     */
    onSettingsUpdated: function() {},

    /**
     * Saves to local storage via localStorage[] and chrome.storage
     */
    saveProperty: function(key, value, callback) {
        callback || (callback = function() {});
        
        var settings = this.getSettings();
        settings[key] = value;
        localStorage['rescroller_settings'] = JSON.stringify(settings);

        this.generateScrollbarCSS(); // update our generated CSS for browser tabs
        this.queueExportLocalSettings();
        this.onSettingsUpdated();

        callback();
    },

    saveProperties: function(props) {
        
        var settings = this.getSettings();

        for (var key in props) {
            settings[key] = props[key];
        }

        localStorage['rescroller_settings'] = JSON.stringify(settings);
        
        this.generateScrollbarCSS(); // update our generated CSS for browser tabs
        this.queueExportLocalSettings(); // Export to Chrome.storage
        this.onSettingsUpdated();
    },

    /**
     * Get a single property.
     * @param  {string}     key     The property to get
     * @param  {boolean}    force   If true, will get the setting from localStorage instead of our in-memory object
     */
    getProperty: function(key, force) {
        try { return this.getSettings(force)[key]; }
        catch(e) { return null; }
    },

    /**
     * Get our settings object.
     * @param  {boolean}    force   If true, will get the setting from localStorage instead of our in-memory object
     */
    getSettings: function(force) {
        if (force === true || !this._settings) {
            this._settings = JSON.parse(localStorage.getItem('rescroller_settings'));
        }

        return this._settings;
    },

    getListOfDisabledSites: function() {
        var rawString = localStorage['sb-excludedsites'];
        
        //Remove all spaces from the string, etc.
        rawString = this._replaceAll(rawString, " ", "");
        rawString = this._replaceAll(rawString, "https://", "");
        rawString = this._replaceAll(rawString, "http://", "");
        rawString = this._replaceAll(rawString, "www.", "");
        rawString = this._replaceAll(rawString, "*/", "");
        rawString = this._replaceAll(rawString, "*.", "");
        rawString = this._replaceAll(rawString, "*", "");
        
        if (!rawString) { return []; }
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
            return ((percentage / 100) * this.getProperty("size")) / 2;
        }

        return (percentage / 100) * this.getProperty("size");
    },

    /**
     * Used for first-time install refresh from Chrome Storage -> Local Storage (or old localStorage -> Chrome Storage)
     */
    refreshLocalStorage: function(callback) {
        callback || (callback = function() {});
        var that = this;

        chrome.storage.sync.get(function(items) {
            for (var key in items) {
                localStorage[key] = items[key];
            }

            that.migrateDataToSingleKey(); // migrate incoming data
            that.generateScrollbarCSS();
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
        this.migrateDataToSingleKey();

        var ls = {};
        for (var key in localStorage) {
            if (key == 'generated_css') { continue; } // waste of time to sync this
            ls[key] = localStorage[key];
        }

        chrome.storage.sync.set(ls);
    },

    /**
     * Gnerate a CSS string from our scrollbar settings and save it to local storage for browser tabs to use.
     */
    generateScrollbarCSS: function() {
        localStorage['generated_css'] = this.getCSSString();
    },

    /**
     * Grab data from local storage and convert it into a CSS string
     */
    getCSSString: function() {
        
        var value = null;

        // If user has chosen to specify his own CSS, just return that
        if (this.getProperty("usecustomcss") == "checked") { return this.getProperty("customcss"); }
              
        // Because Javascript has no "heredoc" function, the "\"s escape the newlines
        var newCSS = "\
        \
        ::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical {\
            width: " + this.getProperty("size") + "px !important;\
            height: " + this.getProperty("size") + "px !important;\
            background-color: " + this.getProperty("subbackground-color") + " !important;\
        }";
            
        if (this.getProperty("showbuttons") == "checked") {
            newCSS += "\
            ::-webkit-scrollbar-button {\
                background-color: " + this.getProperty("buttons-color") + " !important;\
                border-radius: " + this._precentageToPixels(this.getProperty("buttons-radius")) + "px !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("buttons-shadow-size"), true) + "px " + this.getProperty("buttons-shadow-color") + "; !important\
                border: " + this._precentageToPixels(this.getProperty("buttons-border-size")) + "px " + this.getProperty("buttons-border-style") + " " + this.getProperty("buttons-border-color") + " !important;\
                display: block !important;\
            }\
            ::-webkit-scrollbar-button:vertical {\
                height: " + this.getProperty("buttons-size") + "px !important;\
            }\
            ::-webkit-scrollbar-button:horizontal {\
                width: " + this.getProperty("buttons-size") + "px !important;\
            }\
            ::-webkit-scrollbar-button:vertical:decrement {";
                value =  this.getProperty("buttons-background-image-up");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-button:vertical:increment {";
                value = this.getProperty("buttons-background-image-down");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-button:horizontal:increment {";
                value = this.getProperty("buttons-background-image-right");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-button:horizontal:decrement {";
                value = this.getProperty("buttons-background-image-left");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }";
            
            if (this.getProperty("buttons-use-hover") == "checked") {
                newCSS += "::-webkit-scrollbar-button:vertical:decrement:hover {";
                    value = this.getProperty("buttons-background-image-up-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:vertical:increment:hover {";
                    value = this.getProperty("buttons-background-image-down-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:increment:hover {";
                    value = this.getProperty("buttons-background-image-right-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:decrement:hover {";
                    value = this.getProperty("buttons-background-image-left-hover");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:hover {\
                    background-color: " + this.getProperty("buttons-color-hover") + " !important;\
                    box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("buttons-shadow-size-hover"), true) + "px " + this.getProperty("buttons-shadow-color-hover") + "; !important\
                }";
            }
            
            if (this.getProperty("buttons-use-active") == "checked") {
                newCSS += "::-webkit-scrollbar-button:vertical:decrement:active {";
                    value = this.getProperty("buttons-background-image-up-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:vertical:increment:active {";
                    value = this.getProperty("buttons-background-image-down-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:increment:active {";
                    value = this.getProperty("buttons-background-image-right-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:horizontal:decrement:active {";
                    value = this.getProperty("buttons-background-image-left-active");
                    newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
                }\
                ::-webkit-scrollbar-button:active {\
                    background-color: " + this.getProperty("buttons-color-active") + " !important;\
                    box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("buttons-shadow-size-active"), true) + "px " + this.getProperty("buttons-shadow-color-active") + "; !important\
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
            background-color: " + this.getProperty("background-color") + " !important;\
            box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("background-shadow-size"), true) + "px " + this.getProperty("background-shadow-color") + " !important;\
            border: " + this._precentageToPixels(this.getProperty("background-border-size")) + "px " + this.getProperty("background-border-style") + " " + this.getProperty("background-border-color") + " !important;\
            border-radius: " + this._precentageToPixels(this.getProperty("background-radius")) + "px !important;\
        }\
        ::-webkit-scrollbar-track-piece:vertical {";
            value = this.getProperty("background-background-image-vertical");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }\
        ::-webkit-scrollbar-track-piece:horizontal {";
            value = this.getProperty("background-background-image-horizontal");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }";

        if (this.getProperty("background-use-hover") == "checked") {
            newCSS += "::-webkit-scrollbar-track-piece:vertical:hover {";
                value = this.getProperty("background-background-image-vertical-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:horizontal:hover {";
                value = this.getProperty("background-background-image-horizontal-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:hover {\
                background-color: " + this.getProperty("background-color-hover") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("background-shadow-size-hover"), true) + "px " + this.getProperty("background-shadow-color-hover") + " !important;\
            }";
        }
        
        if (this.getProperty("background-use-active") == "checked") {
            newCSS += "::-webkit-scrollbar-track-piece:vertical:active {";
                value = this.getProperty("background-background-image-vertical-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:horizontal:active {";
                value = this.getProperty("background-background-image-horizontal-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-track-piece:active {\
                background-color: " + this.getProperty("background-color-active") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("background-shadow-size-active"), true) + "px " + this.getProperty("background-shadow-color-active") + " !important;\
            }";
        }
        
        newCSS += "::-webkit-scrollbar-thumb {\
            background-color: " + this.getProperty("slider-color") + " !important;\
            box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("slider-shadow-size"), true) + "px " + this.getProperty("slider-shadow-color") + " !important;\
            border-radius: " + this._precentageToPixels(this.getProperty("slider-radius")) + "px !important;\
            border: " + this._precentageToPixels(this.getProperty("slider-border-size")) + "px " + this.getProperty("slider-border-style") + " " + this.getProperty("slider-border-color") + " !important;\
        }\
        ::-webkit-scrollbar-thumb:vertical {";
            value = this.getProperty("slider-background-image-vertical");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }\
        ::-webkit-scrollbar-thumb:horizontal {";
            value = this.getProperty("slider-background-image-horizontal");
            newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
        }";
        
        if (this.getProperty("slider-use-hover") == "checked") {
            newCSS += "::-webkit-scrollbar-thumb:hover {\
                background-color: " + this.getProperty("slider-color-hover") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("slider-shadow-size-hover"), true) + "px " + this.getProperty("slider-shadow-color-hover") + " !important;\
            }\
            ::-webkit-scrollbar-thumb:vertical:hover {";
                value = this.getProperty("slider-background-image-vertical-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            ::-webkit-scrollbar-thumb:horizontal:hover {";
                value = this.getProperty("slider-background-image-horizontal-hover");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }";
        }
        
        if (this.getProperty("slider-use-active") == "checked") {
            newCSS += "::-webkit-scrollbar-thumb:active {\
                background-color: " + this.getProperty("slider-color-active") + " !important;\
                box-shadow: inset 0 0 " + this._precentageToPixels(this.getProperty("slider-shadow-size-active"), true) +  "px " + this.getProperty("slider-shadow-color-active") + " !important;\
            }\
            ::-webkit-scrollbar-thumb:vertical:active {";
                value = this.getProperty("slider-background-image-vertical-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }\
            \
            ::-webkit-scrollbar-thumb:horizontal:active {";
                value = this.getProperty("slider-background-image-horizontal-active");
                newCSS += "background-image: url('" + (value && value != "0" ? value : "") + "') !important;\
            }";
        }
        
        
        newCSS += "::-webkit-scrollbar-corner {\
            background-color: " + this.getProperty("corner-background") + " !important;\
        }"; /*
        ::-webkit-resizer {\
            background-color: " + this.getProperty("resizer-background") + " !important;\
        }"; */
                
        return newCSS;  
    }

}