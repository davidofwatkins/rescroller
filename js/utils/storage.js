/**
 * @param {string} key
 * @param {'sync' | 'local'} store
 * @returns {Promise<unknown>}
 */
export const getChromeStorageValue = async (key, store = 'sync') => {
  const values = await chrome.storage[store].get(key);
  const value = values?.[key];

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

/**
 * @param {string} key
 * @param {string} value
 * @param {'sync' | 'local'} store
 * @returns {Promise<void>}
 */
export const setChromeStorageValue = async (key, value, store = 'sync') =>
  new Promise((resolve, reject) => {
    chrome.storage[store].set(
      { 'date-settings-last-updated': new Date().getTime(), [key]: value },
      () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve();
      }
    );
  });

/**
 * @param {string} key
 * @param {'sync' | 'local'} store
 * @returns {Promise<void>}
 */
export const removeChromeStorageValue = async (key, store = 'sync') =>
  new Promise((resolve, reject) => {
    chrome.storage[store].remove([key], () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
