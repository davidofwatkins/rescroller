/**
 * The Rescroller API and other utility methods.
 */

/**
 * Superficial class creator. It may be better to use something like Backbone in the future.
 */
const createClass = function (proto = {}) {
  const obj = function () {
    // eslint-disable-next-line prefer-rest-params
    proto?.constructor?.apply(this, arguments);
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
      localStorageKey: null,
    },

    constructor(data) {
      if (!data) {
        return;
      }

      this.data = data;
    },

    getDataValue() {
      const dataValue = localStorage[this.data.localStorageKey];
      if (!dataValue) {
        return '';
      }
      return dataValue;
    },

    setImageData(imageData) {
      const imageKey = `image-${new Date().getTime()}${
        Math.random().toString().split('.')[1]
      }`;

      this.data.localStorageKey = imageKey;
      localStorage[imageKey] = imageData;

      return this;
    },

    removeImage() {
      localStorage.removeItem(this.data.localStorageKey);
    },

    /**
     * When we are converted to string, let's show our value string instead of [object Object]. This way,
     * we don't need to handle this class vs other string values in getCSSString()
     */
    toString() {
      return this.getDataValue();
    },

    /**
     * This is needed for JSON.stringify() and localStorage's stringify
     */
    toJSON() {
      return this.data;
    },
  }),

  settings: {
    _settings: null, // a cached JSON version of our settings from localStorage.

    /**
     * Perform setup of our settins struture for a new installation.
     */
    _initializeFirstTimeSettings() {
      localStorage['rescroller-settings'] = JSON.stringify({
        showSaveConfirmation: true,
        excludedsites: '',
        scrollbarStyle: {
          metadata: {}, // unused now, but will use it in the future if/when we allow saving/sharing/exporting of styles
          data: {},
        },
      });

      Rescroller.restoreDefaults(true);
    },

    /**
     * Sometimes after localStorage has changed, we need to wipe our JS cache
     * so the next time get()/getAll() is called, we return accurate results.
     */
    resetJSCache() {
      this._settings = null;
    },

    /**
     * Get our settings object.
     * @param  {boolean}    force   If true, will get the setting from localStorage instead of our in-memory object
     */
    getAll(force) {
      const that = this;

      if (!localStorage['rescroller-settings']) {
        // no matter what, we need a default for this
        this._initializeFirstTimeSettings();
      }

      if (force === true || !this._settings) {
        this._settings = JSON.parse(
          localStorage.getItem('rescroller-settings')
        );

        // Convert all image {}'s into proper Image classes
        Object.keys(this._settings.scrollbarStyle.data).forEach((key) => {
          const val = that._settings.scrollbarStyle.data[key];
          if (!(val instanceof Object) && !val.localStorageKey) {
            return;
          }
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
    get(key, force) {
      try {
        return this.getAll(force)[key];
      } catch (e) {
        return null;
      }
    },

    set(key, value, noSync) {
      const settings = this.getAll();
      settings[key] = value;
      localStorage['rescroller-settings'] = JSON.stringify(settings);
      localStorage['date-settings-last-updated'] = new Date().getTime();
      Rescroller.onSettingsUpdated();

      if (noSync) {
        return;
      }
      Rescroller.syncUp();
    },
  },

  properties: {
    getAll(force) {
      let props = null;
      try {
        props = Rescroller.settings.get('scrollbarStyle', force);
      } catch (e) {
        // ignore
      }

      if (!props || !props.data) {
        return {};
      }

      return props.data;
    },

    get(key, force) {
      try {
        const val = this.getAll(force)[key];
        return val || ''; // return empty string so we don't have 'null's in our CSS
      } catch (e) {
        return '';
      }
    },

    set(key, value, noSync) {
      const props = this.getAll();

      // if previous value was image, we need to remove the old image before overwriting it
      if (this.get(key) instanceof Rescroller.Image) {
        this.get(key).removeImage();
      }

      if (typeof value === 'string' && value.indexOf('data') === 0) {
        // save images in separate localStorage key to avoid chrome.sync item size limits
        props[key] = new Rescroller.Image().setImageData(value);
      } else {
        props[key] = value;
      }

      this.setMultiple(props, noSync);
      Rescroller.generateScrollbarCSS(); // update our generated CSS for browser tabs
    },

    setMultiple(newProps, noSync) {
      const props = Object.keys(newProps).reduce((build, key) => {
        const val = newProps[key];
        const newVal =
          typeof val === 'string' && val.indexOf('data') === 0
            ? new Rescroller.Image().setImageData(val)
            : val;

        return {
          ...build,
          [key]: newVal,
        };
      }, this.getAll());

      Rescroller.settings.set(
        'scrollbarStyle',
        {
          metadata: Rescroller.settings.get('scrollbarStyle').metadata,
          data: props,
        },
        noSync
      );

      Rescroller.generateScrollbarCSS(); // update our generated CSS for browser tabs
    },

    remove(key) {
      if (this.get(key) instanceof Rescroller.Image) {
        this.get(key).removeImage();
      }

      this.set(key, '');
    },
  },

  /**
   * Simple callback method that callers can set to act when the settings have been updated.
   */
  onSettingsUpdated() {},

  getListOfDisabledSites() {
    const rawString = this.settings.get('excludedsites');
    if (!rawString) {
      return [];
    }

    // Remove all spaces from the string, etc.
    const cleanedString = rawString
      .replaceAll(' ', '')
      .replaceAll()
      .replaceAll('https://', '')
      .replaceAll('http://', '')
      .replaceAll('www.', '')
      .replaceAll('*/', '')
      .replaceAll('*.', '')
      .replaceAll('*', '');

    if (!cleanedString) {
      return [];
    }

    return cleanedString.split(',');
  },

  /**
   * Get number of pixels from percentage
   */
  _precentageToPixels(percentage, doNotReduceByHalf) {
    if (!doNotReduceByHalf) {
      return ((percentage / 100) * this.properties.get('size')) / 2;
    }

    return (percentage / 100) * this.properties.get('size');
  },

  /**
   * Used for first-time install refresh from Chrome Storage -> Local Storage (or old localStorage -> Chrome Storage)
   */
  syncDown(callback = () => {}, force = false) {
    chrome.storage.sync.get((items) => {
      this.mergeSyncWithLocalStorage(items, force);
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
  mergeSyncWithLocalStorage(items, force) {
    const lastUpdatedRemote = items['date-settings-last-updated'];
    const lastUpdatedLocal = localStorage['date-settings-last-updated'];

    // Do not proceed if remote data is older than local data
    if (
      !force &&
      lastUpdatedRemote &&
      lastUpdatedLocal &&
      parseInt(lastUpdatedLocal, 10) >= parseInt(lastUpdatedRemote, 10)
    ) {
      console.warn(
        '[Rescroller] Warning: ignoring sync down; remote data is out of date.'
      );
      return;
    }

    // eslint-disable-next-line
    for (const key in items) {
      const val = items[key];
      if (!val) {
        // eslint-disable-next-line no-continue
        continue;
      }

      localStorage[key] = val;
    }

    // force refresh of this.settings._settings
    this.settings.resetJSCache();
    this.generateScrollbarCSS();
  },

  /**
   * Sync our settings up to Chrome Storage.
   *
   * @note we used to throttle this ourselves with a queueSyncUp() method, but it seemed like overkill since the limit was upped from 10/min to 120/min:
   * https://bugs.chromium.org/p/chromium/issues/detail?id=270665#c19 (@see MAX_WRITE_OPERATIONS_PER_MINUTE)
   */
  syncUp() {
    const ls = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const key in localStorage) {
      if (key === 'generated-css') {
        // eslint-disable-next-line no-continue
        continue;
      } // waste of time to sync this
      if (!localStorage[key]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // For legacy, ignore any images that are too big to sync
      if (
        encodeURI(localStorage[key]).split(/%..|./).length - 1 >
        chrome.storage.sync.QUOTA_BYTES_PER_ITEM
      ) {
        console.warn('[Rescroller] Ignoring sync up of image > 8 KB.');
        // eslint-disable-next-line no-continue
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
  restoreDefaults(noSync) {
    this.properties.setMultiple(
      {
        // General
        size: 8,
        'subbackground-color': '#000000',
        'corner-background': '#B0BEC5',
        // "resizer-background" : "#FFC31F",

        // Background
        'background-color': '#B0BEC5',
        'background-shadow-color': '#000000',
        'background-shadow-size': 0,
        'background-border-size': 0,
        'background-border-color': '#000000',
        'background-border-style': 'solid',
        'background-radius': 0,
        // hovering
        'background-color-hover': '#D9D9D9',
        'background-shadow-color-hover': '#000000',
        'background-shadow-size-hover': 0,
        // active
        'background-color-active': '#D9D9D9',
        'background-shadow-color-active': '#000000',
        'background-shadow-size-active': 0,

        // Scrollbar piece/slider
        'slider-color': '#455A64',
        'slider-shadow-color': '#000000',
        'slider-shadow-size': 0,
        'slider-radius': 0,
        'slider-border-size': 0,
        'slider-border-color': '#000000',
        'slider-border-style': 'solid',
        // hovering
        'slider-color-hover': '#666',
        'slider-shadow-color-hover': '#000000',
        'slider-shadow-size-hover': 0,
        // active
        'slider-color-active': '#666',
        'slider-shadow-color-active': '#000000',
        'slider-shadow-size-active': 0,

        // Buttons
        showbuttons: 'off',
        'buttons-size': 20,
        'buttons-color': '#666666',
        'buttons-shadow-color': '#000000',
        'buttons-shadow-size': 0,
        'buttons-radius': 0,
        'buttons-border-size': 0,
        'buttons-border-color': '#666',
        'buttons-border-style': 'solid',
        'buttons-background-image-up': chrome.extension.getURL(
          'images/defaults/up.png'
        ),
        'buttons-background-image-down': chrome.extension.getURL(
          'images/defaults/down.png'
        ),
        'buttons-background-image-left': chrome.extension.getURL(
          'images/defaults/left.png'
        ),
        'buttons-background-image-right': chrome.extension.getURL(
          'images/defaults/right.png'
        ),
        // hovering
        'buttons-color-hover': '#666666',
        'buttons-shadow-color-hover': '#000000',
        'buttons-shadow-size-hover': 0,
        'buttons-background-image-up-hover': chrome.extension.getURL(
          'images/defaults/up.png'
        ),
        'buttons-background-image-down-hover': chrome.extension.getURL(
          'images/defaults/down.png'
        ),
        'buttons-background-image-left-hover': chrome.extension.getURL(
          'images/defaults/left.png'
        ),
        'buttons-background-image-right-hover': chrome.extension.getURL(
          'images/defaults/right.png'
        ),
        // active
        'buttons-color-active': '#666666',
        'buttons-shadow-color-active': '#000000',
        'buttons-shadow-size-active': 0,
        'buttons-background-image-up-active': chrome.extension.getURL(
          'images/defaults/up.png'
        ),
        'buttons-background-image-down-active': chrome.extension.getURL(
          'images/defaults/down.png'
        ),
        'buttons-background-image-left-active': chrome.extension.getURL(
          'images/defaults/left.png'
        ),
        'buttons-background-image-right-active': chrome.extension.getURL(
          'images/defaults/right.png'
        ),

        // Reset all non-button images
        'slider-background-image-vertical': '',
        'slider-background-image-horizontal': '',
        'slider-background-image-vertical-hover': '',
        'slider-background-image-horizontal-hover': '',
        'slider-background-image-vertical-active': '',
        'slider-background-image-horizontal-active': '',

        'background-background-image-vertical': '',
        'background-background-image-horizontal': '',
        'background-background-image-vertical-hover': '',
        'background-background-image-horizontal-hover': '',
        'background-background-image-vertical-active': '',
        'background-background-image-horizontal-active': '',

        // Custom CSS
        // @note potential improvement: maybe, if the the user enters this, it should be used in addition to the generated CSS?
        // This way people can override just some parts of the styling, or everything.
        customcss: `::-webkit-scrollbar {\

}
::-webkit-scrollbar-button {\

}
::-webkit-scrollbar-track {\

}
::-webkit-scrollbar-track-piece {\

}
::-webkit-scrollbar-thumb {\

}
::-webkit-scrollbar-corner {\

}
::-webkit-resizer {\

}`,
      },
      noSync
    );
  },

  /**
   * Gnerate a CSS string from our scrollbar settings and save it to local storage for browser tabs to use.
   */
  generateScrollbarCSS() {
    localStorage['generated-css'] = this.getCSSString();
  },

  /**
   * Grab data from local storage and convert it into a CSS string
   */
  getCSSString() {
    // If user has chosen to specify his own CSS, just return that
    if (this.properties.get('usecustomcss') === 'checked') {
      return this.properties.get('customcss');
    }

    // Build our CSS structure as JSON for readability and maintainability. Then, we'll convert it to CSS!
    const json = {
      children: {
        // Base
        '::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical':
          {
            attributes: {
              width: `${this.properties.get('size')}px`,
              height: `${this.properties.get('size')}px`,
              'background-color': `${this.properties.get(
                'subbackground-color'
              )}`,
            },
          },

        '::-webkit-scrollbar-track-piece': {
          attributes: {
            'background-color': this.properties.get('background-color'),
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('background-shadow-size'),
              true
            )}px ${this.properties.get('background-shadow-color')}`,
            border: `${this._precentageToPixels(
              this.properties.get('background-border-size')
            )}px ${this.properties.get(
              'background-border-style'
            )} ${this.properties.get('background-border-color')}`,
            'border-radius': `${this._precentageToPixels(
              this.properties.get('background-radius')
            )}px`,
          },
        },
        '::-webkit-scrollbar-track-piece:vertical': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'background-background-image-vertical'
            )}')`,
          },
        },
        '::-webkit-scrollbar-track-piece:horizontal': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'background-background-image-horizontal'
            )}')`,
          },
        },

        '::-webkit-scrollbar-thumb': {
          attributes: {
            'background-color': this.properties.get('slider-color'),
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('slider-shadow-size'),
              true
            )}px ${this.properties.get('slider-shadow-color')}`,
            'border-radius': `${this._precentageToPixels(
              this.properties.get('slider-radius')
            )}px`,
            border: `${this._precentageToPixels(
              this.properties.get('slider-border-size')
            )}px ${this.properties.get(
              'slider-border-style'
            )} ${this.properties.get('slider-border-color')}`,
          },
        },
        '::-webkit-scrollbar-thumb:vertical': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'slider-background-image-vertical'
            )}')`,
          },
        },
        '::-webkit-scrollbar-thumb:horizontal': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'slider-background-image-horizontal'
            )}')`,
          },
        },

        '::-webkit-scrollbar-corner': {
          attributes: {
            'background-color': this.properties.get('corner-background'),
          },
        },
        // "::-webkit-resizer": {
        //     "attributes": {
        //         "background-color": this.properties.get('resizer-background')
        //     }
        // }
      },
    };

    // Conditionals:

    if (this.properties.get('showbuttons') === 'checked') {
      $.extend(json.children, {
        '::-webkit-scrollbar-button': {
          attributes: {
            'background-color': this.properties.get('buttons-color'),
            'border-radius': `${this._precentageToPixels(
              this.properties.get('buttons-radius')
            )}px`,
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('buttons-shadow-size'),
              true
            )}px ${this.properties.get('buttons-shadow-color')}`,
            border: `${this._precentageToPixels(
              this.properties.get('buttons-border-size')
            )}px ${this.properties.get(
              'buttons-border-style'
            )} ${this.properties.get('buttons-border-color')}`,
            display: 'block',
          },
        },
        '::-webkit-scrollbar-button:vertical': {
          attributes: {
            height: `${this.properties.get('buttons-size')}px`,
          },
        },
        '::-webkit-scrollbar-button:horizontal': {
          attributes: {
            width: `${this.properties.get('buttons-size')}px`,
          },
        },
        '::-webkit-scrollbar-button:vertical:decrement': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'buttons-background-image-up'
            )}')`,
          },
        },
        '::-webkit-scrollbar-button:vertical:increment': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'buttons-background-image-down'
            )}')`,
          },
        },
        '::-webkit-scrollbar-button:horizontal:increment': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'buttons-background-image-right'
            )}')`,
          },
        },
        '::-webkit-scrollbar-button:horizontal:decrement': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'buttons-background-image-left'
            )}')`,
          },
        },
      });

      if (this.properties.get('buttons-use-hover') === 'checked') {
        $.extend(json.children, {
          '::-webkit-scrollbar-button:vertical:decrement:hover': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-up-hover'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:vertical:increment:hover': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-down-hover'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:horizontal:increment:hover': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-right-hover'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:horizontal:decrement:hover': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-left-hover'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:hover': {
            attributes: {
              'background-color': this.properties.get('buttons-color-hover'),
              'box-shadow': `inset 0 0 ${this._precentageToPixels(
                this.properties.get('buttons-shadow-size-hover'),
                true
              )}px ${this.properties.get('buttons-shadow-color-hover')}`,
            },
          },
        });
      }

      if (this.properties.get('buttons-use-active') === 'checked') {
        $.extend(json.children, {
          '::-webkit-scrollbar-button:vertical:decrement:active': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-up-active'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:vertical:increment:active': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-down-active'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:horizontal:increment:active': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-right-active'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:horizontal:decrement:active': {
            attributes: {
              'background-image': `url('${this.properties.get(
                'buttons-background-image-left-active'
              )}')`,
            },
          },
          '::-webkit-scrollbar-button:active': {
            attributes: {
              'background-color': this.properties.get('buttons-color-active'),
              'box-shadow': `inset 0 0 ${this._precentageToPixels(
                this.properties.get('buttons-shadow-size-active'),
                true
              )}px ${this.properties.get('buttons-shadow-color-active')}')`,
            },
          },
        });
      }

      // Use single buttons (hide the doubles):
      $.extend(json.children, {
        '::-webkit-scrollbar-button:vertical:start:increment, ::-webkit-scrollbar-button:vertical:end:decrement, ::-webkit-scrollbar-button:horizontal:start:increment, ::-webkit-scrollbar-button:horizontal:end:decrement':
          {
            attributes: {
              display: 'none',
            },
          },
      });
    }

    if (this.properties.get('background-use-hover') === 'checked') {
      $.extend(json.children, {
        '::-webkit-scrollbar-track-piece:vertical:hover': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'background-background-image-vertical-hover'
            )}')`,
          },
        },
        '::-webkit-scrollbar-track-piece:horizontal:hover': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'background-background-image-horizontal-hover'
            )}')`,
          },
        },
        '::-webkit-scrollbar-track-piece:hover ': {
          attributes: {
            'background-color': this.properties.get('background-color-hover'),
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('background-shadow-size-hover'),
              true
            )}px ${this.properties.get('background-shadow-color-hover')}`,
          },
        },
      });
    }

    if (this.properties.get('background-use-active') === 'checked') {
      $.extend(json.children, {
        '::-webkit-scrollbar-track-piece:vertical:active': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'background-background-image-vertical-active'
            )}')`,
          },
        },
        '::-webkit-scrollbar-track-piece:horizontal:active': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'background-background-image-horizontal-active'
            )}')`,
          },
        },
        '::-webkit-scrollbar-track-piece:active': {
          attributes: {
            'background-color': this.properties.get('background-color-active'),
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('background-shadow-size-active'),
              true
            )}px ${this.properties.get('background-shadow-color-active')}`,
          },
        },
      });
    }

    if (this.properties.get('slider-use-hover') === 'checked') {
      $.extend(json.children, {
        '::-webkit-scrollbar-thumb:hover': {
          attributes: {
            'background-color': this.properties.get('slider-color-hover'),
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('slider-shadow-size-hover'),
              true
            )}px ${this.properties.get('slider-shadow-color-hover')}`,
          },
        },
        '::-webkit-scrollbar-thumb:vertical:hover': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'slider-background-image-vertical-hover'
            )}')`,
          },
        },
        '::-webkit-scrollbar-thumb:horizontal:hover': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'slider-background-image-horizontal-hover'
            )}')`,
          },
        },
      });
    }

    if (this.properties.get('slider-use-active') === 'checked') {
      $.extend(json.children, {
        '::-webkit-scrollbar-thumb:active': {
          attributes: {
            'background-color': this.properties.get('slider-color-active'),
            'box-shadow': `inset 0 0 ${this._precentageToPixels(
              this.properties.get('slider-shadow-size-active'),
              true
            )}px ${this.properties.get('slider-shadow-color-active')}`,
          },
        },
        '::-webkit-scrollbar-thumb:vertical:active': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'slider-background-image-vertical-active'
            )}')`,
          },
        },
        '::-webkit-scrollbar-thumb:horizontal:active': {
          attributes: {
            'background-image': `url('${this.properties.get(
              'slider-background-image-horizontal-active'
            )}')`,
          },
        },
      });
    }

    // Some cleanup before we send it off!
    Object.keys(json.children).forEach((selector) => {
      const children = json.children[selector];
      const attrs = children.attributes;

      Object.keys(attrs).forEach((attrName) => {
        const attrVal = attrs[attrName];
        // assume we never go deeper than one level

        if (!attrVal) {
          return;
        }

        // Clear out any empty image values to avoid erronius server calls
        if (attrVal === "url('')") {
          attrs[attrName] = '""';
          return;
        }

        // Make sure every attribute is marked '!important'
        attrs[attrName] = `${attrVal} !important`;
      });
    });

    return CSSJSON.toCSS(json);
  },
};
