import { getCompiledCSS } from './getCompiledCSS.js';
import { getScrollbarStyleDefaults } from './getScrollbarStyleDefaults.js';
import {
  getChromeStorageValue,
  removeChromeStorageValue,
  setChromeStorageValue,
} from './storage.js';

export const RESCROLLER_SETTINGS_KEY = 'rescroller-settings';

/**
 * @param {import('./types.js').RescrollerSettings} rescrollerSettings
 * @returns {Promise<import('./types.js').RescrollerSettings>}
 */
export const unpackImagesInSettings = async (rescrollerSettings) => {
  const scrollbarData = rescrollerSettings?.scrollbarStyle?.data || {};

  const promsedValue = Object.keys(scrollbarData).reduce(
    async (accPromise, key) => {
      const acc = await accPromise;
      const value = scrollbarData[key];

      if (value instanceof Object && value.localStorageKey) {
        try {
          const imageData = await getChromeStorageValue(value.localStorageKey);
          acc[key] = imageData;
          return acc;
        } catch (e) {
          acc[key] = null;
          return acc;
        }
      } else {
        acc[key] = value;
      }

      return acc;
    },
    {},
  );

  const updatedStyles = await promsedValue;
  return {
    ...rescrollerSettings,
    scrollbarStyle: {
      ...rescrollerSettings.scrollbarStyle,
      data: updatedStyles,
    },
  };
};

/**
 * @param {import('./types.js').RescrollerSettings?} settingsWithUserStyling
 * @returns {Promise<void>}
 */
export const generateScrollbarCSS = async (settingsWithUserStyling = {}) => {
  const unpackedStyling = settingsWithUserStyling.scrollbarStyle?.data
    ? await unpackImagesInSettings(settingsWithUserStyling)
    : {};

  const cssString = getCompiledCSS(unpackedStyling?.scrollbarStyle?.data || {});
  await setChromeStorageValue('generated-css', cssString, 'local');
};

// @todo someday this should probably be debounced
/**
 * @param {import('./types.js').RescrollerSettings} cache
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export const setScrollbarStyle = async (cache, key, value) => {
  const existingSettings =
    (await getChromeStorageValue(RESCROLLER_SETTINGS_KEY)) || {};

  const newSettings = {
    ...existingSettings,
    scrollbarStyle: {
      ...(existingSettings.scrollbarStyle || {}),
      data: {
        ...(existingSettings.scrollbarStyle?.data || {}),
        [key]: value,
      },
    },
  };

  const dateUpdatedEpoch = new Date().getTime();
  // eslint-disable-next-line no-param-reassign
  cache['date-settings-last-updated'] = dateUpdatedEpoch;
  // eslint-disable-next-line no-param-reassign
  cache[RESCROLLER_SETTINGS_KEY] = await unpackImagesInSettings(newSettings);

  await setChromeStorageValue(
    RESCROLLER_SETTINGS_KEY,
    JSON.stringify(newSettings),
  );

  await generateScrollbarCSS(newSettings);
};

/**
 * @param {import('./types.js').RescrollerSettings} cache
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export const setScrollbarImageStyle = async (cache, key, value) => {
  const existingSettings =
    (await getChromeStorageValue(RESCROLLER_SETTINGS_KEY)) || {};

  const existingValue = existingSettings.scrollbarStyle.data[key];

  if (existingValue?.localStorageKey) {
    await removeChromeStorageValue(existingValue.localStorageKey);
  }

  const newImageKey = `image-${new Date().getTime()}${
    Math.random().toString().split('.')[1]
  }`;

  await setChromeStorageValue(newImageKey, value);
  await setScrollbarStyle(cache, key, { localStorageKey: newImageKey });
};

/**
 * @param {import('./types.js').RescrollerSettings} cache
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export const resetScrollbarImageStyle = async (cache, key, value) => {
  const existingSettings =
    (await getChromeStorageValue(RESCROLLER_SETTINGS_KEY)) || {};

  const existingValue = existingSettings.scrollbarStyle.data[key];

  if (existingValue?.localStorageKey) {
    await removeChromeStorageValue(existingValue.localStorageKey);
  }

  await setScrollbarStyle(cache, key, value);
};

export const removeScrollbarStyle = async (cache, key) => {
  // eslint-disable-next-line no-param-reassign
  cache[RESCROLLER_SETTINGS_KEY].scrollbarStyle.data[key] = undefined;

  const existingSettings = await getChromeStorageValue(RESCROLLER_SETTINGS_KEY);

  const stylingData = existingSettings.scrollbarStyle.data;

  if (stylingData[key]?.localStorageKey) {
    await removeChromeStorageValue(stylingData[key].localStorageKey);
  }

  const filteredData = Object.keys(stylingData).reduce((acc, k) => {
    if (k !== key) {
      acc[k] = stylingData[k];
    }

    return acc;
  }, {});

  const newRescrollerSettings = {
    excludedsites: existingSettings.excludedsites,
    scrollbarStyle: {
      data: filteredData,
      metadata: existingSettings.scrollbarStyle.metadata,
    },
  };

  await setChromeStorageValue(
    RESCROLLER_SETTINGS_KEY,
    JSON.stringify(newRescrollerSettings),
  );
  await generateScrollbarCSS(newRescrollerSettings);
};

export const getScrollbarStyles = (cache) => {
  const defaultScrollbarData = getScrollbarStyleDefaults();
  const customScrollbarData =
    cache?.[RESCROLLER_SETTINGS_KEY]?.scrollbarStyle?.data || {};

  return {
    ...defaultScrollbarData,
    ...customScrollbarData,
  };
};

export const setFirstTimeData = async () => {
  const defaultStyling = { data: getScrollbarStyleDefaults(), metadata: {} };

  const newRescrollerSettings = {
    excludedsites: '',
    scrollbarStyle: defaultStyling,
    showSaveConfirmation: true,
  };

  await setChromeStorageValue(
    RESCROLLER_SETTINGS_KEY,
    JSON.stringify(newRescrollerSettings),
  );

  await generateScrollbarCSS(newRescrollerSettings);
};

export const setDefaultStyling = async (cache) => {
  const defaultStyling = { data: getScrollbarStyleDefaults(), metadata: {} };
  const existingSettings = await getChromeStorageValue(RESCROLLER_SETTINGS_KEY);

  const newRescrollerSettings = {
    // Keep existing excludedsites
    ...existingSettings,
    scrollbarStyle: defaultStyling,
  };

  // eslint-disable-next-line no-param-reassign
  cache[RESCROLLER_SETTINGS_KEY] = newRescrollerSettings;

  await setChromeStorageValue(
    RESCROLLER_SETTINGS_KEY,
    JSON.stringify(newRescrollerSettings),
  );
};

export const getListOfDisabledSites = async () => {
  const rescrollerSettings = await getChromeStorageValue(
    RESCROLLER_SETTINGS_KEY,
  );

  if (!rescrollerSettings) {
    return [];
  }

  const rawString = rescrollerSettings.excludedsites;

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
};
