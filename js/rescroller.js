/**
 * The Rescroller API and other utility methods.
 */

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
 * Superficial class creator. It may be better to use something like Backbone in the future.
 */
var createClass = function(proto) {
    proto || (proto = {});
    proto.constructor || (proto.constructor = function() {});
    var obj = function() {
        proto.constructor.apply(this, arguments)
    };
    obj.prototype = proto;
    return obj;
};

window.Rescroller = {
    version: chrome.app.getDetails().version,

    /**
     * An object that understands our image {} format and can handle image data values to and from localStorage
     */
    Image: createClass({
        data: {
            localStorageKey: null
        },

        constructor: function(data) {
            if (!data) { return; }

            this.data = data;
        },

        getDataValue: function() {
            var dataValue = localStorage[this.data.localStorageKey];
            if (!dataValue) { return ''; }
            return dataValue;
        },

        setImageData: function(imageData) {
            var imageKey = 'image-' + new Date().getTime() + Math.random().toString().split('.')[1];

            this.data.localStorageKey = imageKey;
            localStorage[imageKey] = imageData;

            return this;
        },

        removeImage: function() {
            localStorage.removeItem(this.data.localStorageKey);
        },

        /**
         * When we are converted to string, let's show our value string instead of [object Object]. This way,
         * we don't need to handle this class vs other string values in getCSSString()
         */
        toString: function() {
            return this.getDataValue();
        },

        /**
         * This is needed for JSON.stringify() and localStorage's stringify
         */
        toJSON: function() {
            return this.data;
        }
    }),

    settings: {
        _settings: null,                        // a cached JSON version of our settings from localStorage.

        /**
         * Perform setup of our settins struture for a new installation.
         */
        _initializeFirstTimeSettings: function() {
            localStorage['rescroller-settings'] = JSON.stringify({
                showSaveConfirmation: true,
                excludedsites: '',
                scrollbarStyle: {
                    metadata: {}, // unused now, but will use it in the future if/when we allow saving/sharing/exporting of styles
                    data: {}
                }
            });
            
            Rescroller.restoreDefaults(true);
        },

        /**
         * Sometimes after localStorage has changed, we need to wipe our JS cache 
         * so the next time get()/getAll() is called, we return accurate results.
         */
        resetJSCache: function() {
            this._settings = null;
        },

        /**
         * Get our settings object.
         * @param  {boolean}    force   If true, will get the setting from localStorage instead of our in-memory object
         */
        getAll: function(force) {
            var that = this;

            if (!localStorage['rescroller-settings']) { // no matter what, we need a default for this
                this._initializeFirstTimeSettings();
            }

            if (force === true || !this._settings) {
                this._settings = JSON.parse(localStorage.getItem('rescroller-settings'));

                // Convert all image {}'s into proper Image classes
                Object.keys(this._settings.scrollbarStyle.data).forEach(function(key) {
                    var val = that._settings.scrollbarStyle.data[key];
                    if (!(val instanceof Object) && !val.localStorageKey) { return true; }
                    that._settings.scrollbarStyle.data[key] = new Rescroller.Image(val);
                });
            }

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

        set: function(key, value, noSync) {
            var settings = this.getAll();
            settings[key] = value;
            localStorage['rescroller-settings'] = JSON.stringify(settings);
            localStorage['date-settings-last-updated'] = new Date().getTime();
            Rescroller.onSettingsUpdated();

            if (noSync) { return; }
            Rescroller.syncUp();
        }
    },

    properties: {

        getAll: function(force) {
            var props = null;
            try { props = Rescroller.settings.get('scrollbarStyle', force); }
            catch(e) { }

            if (!props || !props.data) {
                return {};
            }

            return props.data;
        },

        get: function(key, force) {
            try {
                var val = this.getAll(force)[key];
                return val ? val : ''; // return empty string so we don't have 'null's in our CSS
            } catch(e) {
                return '';
            }
        },

        set: function(key, value, noSync) {
            var props = this.getAll();

            // if previous value was image, we need to remove the old image before overwriting it
            if (this.get(key) instanceof Rescroller.Image) {
                this.get(key).removeImage();
            }

            if (typeof value == 'string' && value.indexOf('data') == 0) { // save images in separate localStorage key to avoid chrome.sync item size limits
                props[key] = new Rescroller.Image().setImageData(value);
            } else {
                props[key] = value;
            }

            this.setMultiple(props, noSync);
            Rescroller.generateScrollbarCSS(); // update our generated CSS for browser tabs
        },

        setMultiple: function(newProps, noSync) {
            var props = this.getAll();

            for (key in newProps) {
                var newVal = newProps[key];
                
                if (typeof newVal == 'string' && newVal.indexOf('data') == 0) {
                    newVal = new Rescroller.Image().setImageData(newVal);
                }

                props[key] = newVal;
            }

            Rescroller.settings.set('scrollbarStyle', {
                metadata: Rescroller.settings.get('scrollbarStyle').metadata,
                data: props
            }, noSync);

            Rescroller.generateScrollbarCSS(); // update our generated CSS for browser tabs
        },

        remove: function(key) {
            if (this.get(key) instanceof Rescroller.Image) {
                this.get(key).removeImage();
            }

            this.set(key, '');
        }
    },

    performMigrations: function() {

        if (!this._migrateDataToSingleKey() && !this._migrateImageNullValues()) {
            return; // none of the migrations needed to run; we're done!
        }
        
        // Since localStorage has change, we need to invalide our JS cache so we get accurate results
        this.settings.resetJSCache();

        // we need to regenerate our CSS so it's in localStorage['generated-css'] for our background page to find it
        this.generateScrollbarCSS();

        // After switching to the new version, the new settings should be synced up.
        localStorage['date-settings-last-updated'] = new Date().getTime(); // copied from set()
        this.syncUp(); // sync migrated structures up
    },

    /**
     * Migration from 1.2 --> 1.3. Migrate all our "sb-*" keys in localStorage to a single key.
     *
     * @returns {boolean} true if migration ran, false if it didn't (need to)
     */
    _migrateDataToSingleKey: function() {
        if (!localStorage['sb-size']) { return false; } // already migrated

        var json = {
            scrollbarStyle: {
                metadata: {},
                data: {}
            }
        };

        Object.keys(localStorage).forEach(function(key) {
            if (key == 'install_time') { return true; } // continue

            if (key == 'sb-excludedsites') {
                json['excludedsites'] = localStorage['sb-excludedsites']
            } else if (key == 'showSaveConfirmation') { // change showSaveConfirmation form a '1'/'0' to true/false
                json[key] = localStorage[key] !== '0';
            } else if (key.indexOf('sb-') == 0) { // put scrollbar CSS settings in our scrollbar settings, without the 'sb-' prefix
                json.scrollbarStyle.data[key.substr(3, key.length -1)] = (isNaN(parseInt(localStorage[key]))) ? localStorage[key] : parseInt(localStorage[key]) ;
            }

            // Remove the old key/val
            localStorage.removeItem(key);
        });

        this._settings = json;
        localStorage['rescroller-settings'] = JSON.stringify(json)
        return true;
    },

    /**
     * For whatever reason, we were setting default values for images as 0. They should be empty strings.
     * Also, this migrates datea values (data-url strings) to their own key in local storage so that
     * chrome.sync will handle them separately.
     * 
     * @return {boolean} true if migration ran, false if it didn't (need to)
     */
    _migrateImageNullValues: function() {

        var i = 0;
        var props = this.properties.getAll();
        for (key in props) {
            if (key.indexOf('background-image') <= -1) { continue; }

            // Convert any data strings to Image classes
            if (typeof key == 'string' && key.indexOf('data') === 0) {
                props[key] = new Rescroller.Image().setImageData(props[key]);
                continue;
            }

            if (parseInt(props[key]) !== 0) { continue; }
            props[key] = '';
            i++;
        }

        // don't set anything if no changes were made; this prevents a recursive loop with
        // chrome.sync since this is run every every sync down
        if (i == 0) { return false; }

        this.properties.setMultiple(props, true)
        return true;
    },

    /**
     * Simple callback method that callers can set to act when the settings have been updated.
     */
    onSettingsUpdated: function() {},

    getListOfDisabledSites: function() {
        var rawString = this.settings.get('excludedsites');
        if (!rawString) { return []; }
            
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
    syncDown: function(callback, force) {
        callback || (callback = function() {});
        var that = this;

        chrome.storage.sync.get(function(items) {
            that.mergeSyncWithLocalStorage(items, force);
            callback();
        });
    },

    /**
     * Merge items from Chrome Sync into LocalStorage.
     * Note: if a 'date-settings-last-updated' item exists in the synced items and localStorage, 
     * the update will only occur if a remote timestamp is newer than local.
     * 
     * @param  {object} items An object of key-value items to set in local storage.
     * @param {boolean} force If true, we will force the merge - otherwise we will only sync if 'date-settings-last-updated' comparisons match
     * @return {[type]}       [description]
     */
    mergeSyncWithLocalStorage: function(items, force) {
        var lastUpdatedRemote = items['date-settings-last-updated'];
        var lastUpdatedLocal = localStorage['date-settings-last-updated'];

        // Do not proceed if remote data is older than local data
        if (!force && lastUpdatedRemote && lastUpdatedLocal && parseInt(lastUpdatedLocal) >= parseInt(lastUpdatedRemote)) {
            console.warn('[Rescroller] Warning: ignoring sync down; remote data is out of date.');
            return;
        }

        for (var key in items) {
            var val = items[key];
            if (!val) { continue; }

            localStorage[key] = val;
        }

        // force refresh of this.settings._settings
        this.settings.resetJSCache();

        // migrate incoming data
        this.performMigrations();
        this.generateScrollbarCSS();
    },

    /**
     * Sync our settings up to Chrome Storage.
     *
     * @note we used to throttle this ourselves with a queueSyncUp() method, but it seemed like overkill since the limit was upped from 10/min to 120/min:
     * https://bugs.chromium.org/p/chromium/issues/detail?id=270665#c19 (@see MAX_WRITE_OPERATIONS_PER_MINUTE)
     */
    syncUp: function() {

        var ls = {};
        for (var key in localStorage) {
            if (key == 'generated-css') { continue; } // waste of time to sync this
            if (!localStorage[key]) { continue; }

            // For legacy, ignore any images that are too big to sync
            if ((encodeURI(localStorage[key]).split(/%..|./).length - 1) > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
                console.warn('[Rescroller] Ignoring sync up of image > 8 KB.')
                continue;
            }

            ls[key] = localStorage[key];
        }

        chrome.storage.sync.set(ls);
    },

    /**
     * Restore the default settings for the scrollbars.
     *
     * Slider/background theme are shades of Material's Blue Grey colors:
     * https://material.google.com/style/color.html#color-color-palette
     */
    restoreDefaults: function(noSync) {

        this.properties.setMultiple({
            
            // General
            "size" : 8,
            "subbackground-color" : "#000000",
            "corner-background" : "#B0BEC5",
            // "resizer-background" : "#FFC31F",
            
            // Background
            "background-color" : "#B0BEC5",
            "background-shadow-color" : "#000000",
            "background-shadow-size" : 0,
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
            "slider-color" : "#455A64",
            "slider-shadow-color" : "#000000",
            "slider-shadow-size" : 0,
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
            
            // Reset all non-button images
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
            // @note potential improvement: maybe, if the the user enters this, it should be used in addition to the generated CSS?
            // This way people can override just some parts of the styling, or everything.
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
        }, noSync);
    },

    /**
     * Gnerate a CSS string from our scrollbar settings and save it to local storage for browser tabs to use.
     */
    generateScrollbarCSS: function() {
        localStorage['generated-css'] = this.getCSSString();
    },

    /**
     * Grab data from local storage and convert it into a CSS string
     */
    getCSSString: function() {

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
                        "box-shadow": "inset 0 0 %spx %s".fmt(this._precentageToPixels(this.properties.get('background-shadow-size'), true), this.properties.get('background-shadow-color')),
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
                "::-webkit-scrollbar-button": {
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