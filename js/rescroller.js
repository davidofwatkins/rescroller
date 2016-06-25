if (!String.prototype.fmt) {
    String.prototype.fmt = function() {
        var args = arguments;
        var i = 0;
        return this.replace(/%((%)|s)/g, function(match) {
            return_val = typeof args[i] != 'undefined' ? args[i] : match;
            i++;
            return return_val;
        });
    };
}



/**
 * The Rescroller API
 */

window.Rescroller = {

    EXPORT_BUFFER_TIME: 7000,                   // 7 seconds

    version: chrome.app.getDetails().version,
    _exportBuffer: null,                        // used to set/cancel setTimeouts for exporting localStorage to Chrome Storage

    settings: {
        _settings: null,                        // a cached JSON version of our settings from localStorage. 

        /**
         * Get our settings object.
         * @param  {boolean}    force   If true, will get the setting from localStorage instead of our in-memory object
         */
        getAll: function(force) {
            if (force === true || !this._settings) {
                this._settings = JSON.parse(localStorage.getItem('rescroller_settings'));
            }

            if (!this._settings) { this._settings = {}; }

            return this._settings;
        },

        /**
         * Get a single setting value.
         * @param  {string}     key     The setting to get
         * @param  {boolean}    force   If true, will get the setting from localStorage instead of our in-memory object
         */
        get: function(key, force) {
            try { return this.getAll(force)[key]; }
            catch(e) { return null; }
        },

        set: function(key, value) { // @todo:david update to accept multiple
            var settings = this.getAll();
            settings[key] = value;
            localStorage['rescroller_settings'] = JSON.stringify(settings);

            Rescroller.queueExportLocalSettings();
            Rescroller.onSettingsUpdated();
        }
    },

    properties: {
        getAll: function(force) {
            var props = null;
            try { props = Rescroller.settings.get('scrollbarStyle', force); }
            catch(e) { }

            if (!props) { props = {}; }

            return props;
        },

        get: function(key, force) {
            try { return this.getAll(force)[key]; }
            catch(e) { return null; }
        },

        set: function(key, value) { // @todo:david update to accept multiple
            
            var props = this.getAll();
            props[key] = value;
            Rescroller.settings.set('scrollbarStyle', props);

            Rescroller.generateScrollbarCSS(); // update our generated CSS for browser tabs
        },

        setMultiple: function(new_props) {
            var props = this.getAll();

            for (key in new_props) {
                props[key] = new_props[key];
            }

            Rescroller.settings.set('scrollbarStyle', props);
            Rescroller.generateScrollbarCSS(); // update our generated CSS for browser tabs
        }
    },

    /**
     * Migration from 1.2 --> 1.3. Migrate all our "sb-*" keys in localStorage to a single key.
     */
    _migrateDataToSingleKey: function() {
        if (!localStorage['sb-size']) { return; } // already migrated

        // @todo:david we should probably store the fake-CSS values of the scrollbars themselves in a sub-settings
        // object, so it's separate from other app settings.
        
        // @todo:david we should also store images in their own localStorage keys to prevent issues with
        // Chrome sync data limits.

        var json = {
            scrollbarStyle: {}
        };

        Object.keys(localStorage).forEach(function(key) {

            if (key == 'sb-excludedsites') {
                json['excludedsites'] = localStorage['excludedsites']
            } else if (key.indexOf('sb-') == 0) { // put scrollbar CSS settings in our scrollbar settings 
                // set new key as old without the 'sb-' prefix
                json.scrollbarStyle[key.substr(3, key.length -1)] = parseInt(localStorage[key]) === NaN ? localStorage[key] : parseInt(localStorage[key]) ;
            }

            // Remove the old key/val
            localStorage.removeItem(key);
        });

        this._settings = json;
        localStorage['rescroller_settings'] = JSON.stringify(json)
    },

    _migrateBackgroundImageNullValues: function() {
        
        // For whatever reason, we were setting default values for images as 0. They should be empty string
        var props = this.properties.getAll();
        for (key in props) {
            if (key.indexOf('background-image') <= -1) { continue; }
            if (parseInt(props[key]) === 0) { props[key] = '' }
        }

        this.properties.setMultiple(props)
    },

    performMigrations: function() {
        this._migrateDataToSingleKey();
        this._migrateBackgroundImageNullValues();
    },

    /**
     * Simple callback method that callers can set to act when the settings have been updated.
     */
    onSettingsUpdated: function() {},

    getListOfDisabledSites: function() {
        var rawString = this.settings.get('excludedsites');
        
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
            return ((percentage / 100) * this.properties.get("size")) / 2;
        }

        return (percentage / 100) * this.properties.get("size");
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

            that.performMigrations(); // migrate incoming data
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
        this.performMigrations();

        var ls = {};
        for (var key in localStorage) {
            if (key == 'generated_css') { continue; } // waste of time to sync this
            ls[key] = localStorage[key];
        }

        chrome.storage.sync.set(ls);
    },

    /**
     * Restore the default settings for the scrollbars.
     */
    restoreDefaults: function() {

        this.properties.setMultiple({
            
            // General
            "size" : 15,
            "subbackground-color" : "#000000",
            "corner-background" : "#D9D9D9",
            // "resizer-background" : "#FFC31F",
            
            // Background
            "background-color" : "#C9C9C9",
            "background-shadow-color" : "#000000",
            "background-shadow-size" : 20,
            "background-border-size" : 0,
            "background-border-color" : "#000000",
            "background-border-style" : "solid",
            "background-radius" : 0,
            // hovering
            "background-color-hover" : "#D9D9D9",
            "background-shadow-color-hover" : "#000000",
            "background-shadow-size-hover" : 0,
            // active
            "background-color-active" : "#D9D9D9",
            "background-shadow-color-active" : "#000000",
            "background-shadow-size-active" : 0,
            
            // Scrollbar piece/slider
            "slider-color" : "#666666",
            "slider-shadow-color" : "#000000",
            "slider-shadow-size" : 35,
            "slider-radius" : 0,
            "slider-border-size" : 0,
            "slider-border-color" : "#000000",
            "slider-border-style" : "solid",
            // hovering
            "slider-color-hover" : "#666",
            "slider-shadow-color-hover" : "#000000",
            "slider-shadow-size-hover" : 0,
            // active
            "slider-color-active" : "#666",
            "slider-shadow-color-active" : "#000000",
            "slider-shadow-size-active" : 0,
            
            // Buttons
            "showbuttons" : "off",
            "buttons-size" : 20,
            "buttons-color" : "#666666",
            "buttons-shadow-color" : "#000000",
            "buttons-shadow-size" : 0,
            "buttons-radius" : 0,
            "buttons-border-size" : 0,
            "buttons-border-color" : "#666",
            "buttons-border-style" : "solid",
            "buttons-background-image-up" : chrome.extension.getURL("images/defaults/up.png"),
            "buttons-background-image-down" : chrome.extension.getURL("images/defaults/down.png"),
            "buttons-background-image-left" : chrome.extension.getURL("images/defaults/left.png"),
            "buttons-background-image-right" : chrome.extension.getURL("images/defaults/right.png"),
            // hovering
            "buttons-color-hover" : "#666666",
            "buttons-shadow-color-hover" : "#000000",
            "buttons-shadow-size-hover" : 0,
            "buttons-background-image-up-hover" : chrome.extension.getURL("images/defaults/up.png"),
            "buttons-background-image-down-hover" : chrome.extension.getURL("images/defaults/down.png"),
            "buttons-background-image-left-hover" : chrome.extension.getURL("images/defaults/left.png"),
            "buttons-background-image-right-hover" : chrome.extension.getURL("images/defaults/right.png"),
            // active
            "buttons-color-active" : "#666666",
            "buttons-shadow-color-active" : "#000000",
            "buttons-shadow-size-active" : 0,
            "buttons-background-image-up-active" : chrome.extension.getURL("images/defaults/up.png"),
            "buttons-background-image-down-active" : chrome.extension.getURL("images/defaults/down.png"),
            "buttons-background-image-left-active" : chrome.extension.getURL("images/defaults/left.png"),
            "buttons-background-image-right-active" : chrome.extension.getURL("images/defaults/right.png"),
            
            // Reset all non-button images to 0
            "slider-background-image-vertical" : '',
            "slider-background-image-horizontal" : '',
            "slider-background-image-vertical-hover" : '',
            "slider-background-image-horizontal-hover" : '',
            "slider-background-image-vertical-active" : '',
            "slider-background-image-horizontal-active" : '',
            
            "background-background-image-vertical" : '',
            "background-background-image-horizontal" : '',
            "background-background-image-vertical-hover" : '',
            "background-background-image-horizontal-hover" : '',
            "background-background-image-vertical-active" : '',
            "background-background-image-horizontal-active" : '',

            // Custom CSS
            "customcss" : "::-webkit-scrollbar {\
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
        if (typeof jQuery === 'undefined') {
            console.error('jQuery is required for getCSSString()');
            return
        }

        // If user has chosen to specify his own CSS, just return that
        if (this.properties.get("usecustomcss") == "checked") { return this.properties.get("customcss"); }
       
       // Build our CSS structure as JSON for readability and maintainability. Then, we'll convert it to CSS!
        var json = {
            children: {

                // Base
                "::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical": {
                    "attributes": {
                        "width": "%spx".fmt(this.properties.get('size')),
                        "height": "%spx".fmt(this.properties.get('size')),
                        "background-color": "%s".fmt(this.properties.get('subbackground-color'))
                    }
                },

                "::-webkit-scrollbar-track-piece": {
                    "attributes": {
                        "background-color": this.properties.get('background-color'),
                        "box-shadow": "inset 0 0 %spx %s')".fmt(this._precentageToPixels(this.properties.get('background-shadow-size'), true), this.properties.get('background-shadow-color')),
                        "border": "%spx %s %s".fmt(this._precentageToPixels(this.properties.get('background-border-size')), this.properties.get('background-border-style'), this.properties.get('background-border-color')),
                        "border-radius": "%spx".fmt(this._precentageToPixels(this.properties.get('background-radius')))
                    }
                },
                "::-webkit-scrollbar-track-piece:vertical": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('background-background-image-vertical'))
                    }
                },
                "::-webkit-scrollbar-track-piece:horizontal": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('background-background-image-horizontal'))
                    }
                },

                "::-webkit-scrollbar-thumb": {
                    "attributes": {
                        "background-color": this.properties.get('slider-color'),
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('slider-shadow-size'), true), this.properties.get('slider-shadow-color')),
                        "border-radius": "%spx".fmt(this._precentageToPixels(this.properties.get('slider-radius'))),
                        "border": "%spx %s %s".fmt(this._precentageToPixels(this.properties.get('slider-border-size')), this.properties.get('slider-border-style'), this.properties.get('slider-border-color'))
                    }
                },
                "::-webkit-scrollbar-thumb:vertical": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('slider-background-image-vertical'))
                    }
                },
                "::-webkit-scrollbar-thumb:horizontal": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('slider-background-image-horizontal'))
                    }
                },


                "::-webkit-scrollbar-corner": {
                    "attributes": {
                        "background-color": this.properties.get('corner-background')
                    }
                }
                // "::-webkit-resizer": {
                //     "attributes": {
                //         "background-color": this.properties.get('resizer-background')
                //     }
                // }
            }
        };

        // Conditionals:

        if (this.properties.get('showbuttons') == 'checked') {
            $.extend(json.children, {
                "::-webkit-scrollbar-button {": {
                    "attributes": {
                        "background-color": this.properties.get('buttons-color'),
                        "border-radius": "%spx".fmt(this._precentageToPixels(this.properties.get('buttons-radius'))),
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('buttons-shadow-size'), true), this.properties.get('buttons-shadow-color')),
                        "border": "%spx %s %s".fmt(this._precentageToPixels(this.properties.get('buttons-border-size')), this.properties.get('buttons-border-style'), this.properties.get('buttons-border-color')),
                        "display": "block"
                    }
                },
                "::-webkit-scrollbar-button:vertical": {
                    "attributes": {
                        "height": "%spx".fmt(this.properties.get('buttons-size'))
                    }
                },
                "::-webkit-scrollbar-button:horizontal": {
                    "attributes": {
                        "width": "%spx".fmt(this.properties.get('buttons-size'))
                    }
                },
                "::-webkit-scrollbar-button:vertical:decrement": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-up'))
                    }
                },
                "::-webkit-scrollbar-button:vertical:increment": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-down'))
                    }
                },
                "::-webkit-scrollbar-button:horizontal:increment": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-right'))
                    }
                },
                "::-webkit-scrollbar-button:horizontal:decrement": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-left'))
                    }
                },
            });

            if (this.properties.get('buttons-use-hover') == 'checked') {
                $.extend(json.children, {
                    "::-webkit-scrollbar-button:vertical:decrement:hover": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-up-hover'))
                        }
                    },
                    "::-webkit-scrollbar-button:vertical:increment:hover": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-down-hover'))
                        }
                    },
                    "::-webkit-scrollbar-button:horizontal:increment:hover": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-right-hover'))
                        }
                    },
                    "::-webkit-scrollbar-button:horizontal:decrement:hover": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-left-hover'))
                        }
                    },
                    "::-webkit-scrollbar-button:hover": {
                        "attributes": {
                            "background-color": this.properties.get('buttons-color-hover'),
                            "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('buttons-shadow-size-hover'), true), this.properties.get('buttons-shadow-color-hover'))
                        }
                    }
                });
            }

            if (this.properties.get('buttons-use-active') == 'checked') {
                $.extend(json.children, {
                    "::-webkit-scrollbar-button:vertical:decrement:active": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-up-active'))
                        }
                    },
                    "::-webkit-scrollbar-button:vertical:increment:active": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-down-active'))
                        }
                    },
                    "::-webkit-scrollbar-button:horizontal:increment:active": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-right-active'))
                        }
                    },
                    "::-webkit-scrollbar-button:horizontal:decrement:active": {
                        "attributes": {
                            "background-image": "url('%s')".fmt(this.properties.get('buttons-background-image-left-active'))
                        }
                    },
                    "::-webkit-scrollbar-button:active": {
                        "attributes": {
                            "background-color": this.properties.get('buttons-color-active'),
                            "box-shadow": "inset 0 0 %spx %s')".fmt(this._precentageToPixels(this.properties.get('buttons-shadow-size-active'), true), this.properties.get('buttons-shadow-color-active'))
                        }
                    }
                });
            }

            // Use single buttons (hide the doubles):
            $.extend(json.children, {
                "::-webkit-scrollbar-button:vertical:start:increment, ::-webkit-scrollbar-button:vertical:end:decrement, ::-webkit-scrollbar-button:horizontal:start:increment, ::-webkit-scrollbar-button:horizontal:end:decrement": {
                    "attributes": {
                        "display": "none"
                    }
                }
            });
        }

        if (this.properties.get("background-use-hover") == "checked") {
            $.extend(json.children, {
                "::-webkit-scrollbar-track-piece:vertical:hover": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('background-background-image-vertical-hover'))
                    }
                },
                "::-webkit-scrollbar-track-piece:horizontal:hover": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('background-background-image-horizontal-hover'))
                    }
                },
                "::-webkit-scrollbar-track-piece:hover ": {
                    "attributes": {
                        "background-color": this.properties.get('background-color-hover'),
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('background-shadow-size-hover'), true), this.properties.get('background-shadow-color-hover'))
                    }
                }
            });
        }

        if (this.properties.get("background-use-active") == "checked") {
            $.extend(json.children, {
                "::-webkit-scrollbar-track-piece:vertical:active": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('background-background-image-vertical-active'))
                    }
                },
                "::-webkit-scrollbar-track-piece:horizontal:active": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('background-background-image-horizontal-active'))
                    }
                },
                "::-webkit-scrollbar-track-piece:active": {
                    "attributes": {
                        "background-color": this.properties.get('background-color-active'),
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('background-shadow-size-active'), true), this.properties.get('background-shadow-color-active'))
                    }
                }
            });
        }

        if (this.properties.get("slider-use-hover") == "checked") {
            $.extend(json.children, {
                "::-webkit-scrollbar-thumb:hover": {
                    "attributes": {
                        "background-color": this.properties.get('slider-color-hover'),
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('slider-shadow-size-hover'), true), this.properties.get('slider-shadow-color-hover'))
                    }
                },
                "::-webkit-scrollbar-thumb:vertical:hover": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('slider-background-image-vertical-hover'))
                    }
                },
                "::-webkit-scrollbar-thumb:horizontal:hover": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('slider-background-image-horizontal-hover'))
                    }
                }
            });
        }

        if (this.properties.get("slider-use-active") == "checked") {
            $.extend(json.children, {
                "::-webkit-scrollbar-thumb:active": {
                    "attributes": {
                        "background-color": this.properties.get('slider-color-active'),
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('slider-shadow-size-active'), true), this.properties.get('slider-shadow-color-active'))
                    }
                },
                "::-webkit-scrollbar-thumb:vertical:active": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('slider-background-image-vertical-active'))
                    }
                },
                "::-webkit-scrollbar-thumb:horizontal:active": {
                    "attributes": {
                        "background-image": "url('%s')".fmt(this.properties.get('slider-background-image-horizontal-active'))
                    }
                }
            });
        }

        // Some cleanup before we send it off!
        $.each(json.children, function(selector, children) {
            var attrs = children.attributes
            $.each(attrs, function(attr_name, attr_val) { // assume we never go deeper than one level

                if (!attr_val) { return true; } // continue

                // Clear out any empty image values to avoid erronius server calls
                if (attr_val == "url('')") {
                    attrs[attr_name] = '""';
                    return true; // continue
                }

                // Make sure every attribute is marked '!important'
                attrs[attr_name] = attr_val + ' !important';
            });
        });

        return CSSJSON.toCSS(json);
    }

}