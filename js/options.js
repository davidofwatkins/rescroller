import {
  getScrollbarStyles,
  removeScrollbarStyle,
  resetScrollbarImageStyle,
  setDefaultStyling,
  setScrollbarImageStyle,
  setScrollbarStyle,
  unpackImagesInSettings,
  RESCROLLER_SETTINGS_KEY,
} from './utils/index.js';
import { getCompiledCSS } from './utils/getCompiledCSS.js';
import {
  getChromeStorageValue,
  setChromeStorageValue,
} from './utils/storage.js';

window.PAGE_CACHE = null;

/**
 * Javascript used to control the settings page, options.html
 */

/**
 * @returns {Promise<import('./types.js').RescrollerSettings>}
 */
const initPageCache = async () => {
  const allValues = await new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (results) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      const parsedSettings = results[RESCROLLER_SETTINGS_KEY]
        ? JSON.parse(results[RESCROLLER_SETTINGS_KEY])
        : {};

      resolve({
        ...results,
        [RESCROLLER_SETTINGS_KEY]: parsedSettings,
      });
    });
  });

  if (!allValues[RESCROLLER_SETTINGS_KEY]) {
    return allValues;
  }

  const settingsWithImageData = await unpackImagesInSettings(
    allValues[RESCROLLER_SETTINGS_KEY],
  );

  return {
    ...allValues,
    [RESCROLLER_SETTINGS_KEY]: settingsWithImageData,
  };
};

const SHOW_SAVE_CONFIRM_TIME = 4000;
let saveconfirmationTimeout;
let lastClickedColorPickerPropertyID;

const refreshScrollbars = () => {
  const cachedScrollbarStyles = getScrollbarStyles(window.PAGE_CACHE);
  const cssString = getCompiledCSS(cachedScrollbarStyles);

  $('#rescroller').html(cssString);
  const originalOverflow = $('body').css('overflow');
  $('body').css('overflow', 'hidden');
  setTimeout(() => {
    $('body').css('overflow', originalOverflow);
  }, 0);
};

const showSaveConfirmIfEnabled = () => {
  if (!window.PAGE_CACHE[RESCROLLER_SETTINGS_KEY].showSaveConfirmation) {
    return;
  }

  clearTimeout(saveconfirmationTimeout);
  $('#save-confirm').fadeIn('slow');
  saveconfirmationTimeout = setTimeout(() => {
    $('#save-confirm').fadeOut('slow');
  }, SHOW_SAVE_CONFIRM_TIME);
};

const setScrollbarStyleAndRefresh = async (key, value) => {
  await setScrollbarStyle(window.PAGE_CACHE, key, value);
  refreshScrollbars();
  showSaveConfirmIfEnabled();
};

const setScrollbarImageStyleAndRefresh = async (key, value) => {
  await setScrollbarImageStyle(window.PAGE_CACHE, key, value);
  refreshScrollbars();
  showSaveConfirmIfEnabled();
};

// Following "plugin" function found here: http://stackoverflow.com/a/10310815/477632
$.fn.draghover = function () {
  return this.each(function () {
    let collection = $();
    const self = $(this);

    // Note: "dragenter", "dragleave", and "dragover" need to be e.preventDefault()-ed
    // in order for the webpage not to redirect to the dragged-in image:
    // See explanation here: http://stackoverflow.com/a/8938581/477632

    self.on('dragenter', (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (collection.size() === 0) {
        self.trigger('draghoverstart');
      }
      collection = collection.add(e.target);
    });

    self.on('dragleave', (e) => {
      e.stopPropagation();
      e.preventDefault();

      // timeout is needed because Firefox 3.6 fires the dragleave event on
      // the previous element before firing dragenter on the next one
      setTimeout(() => {
        collection = collection.not(e.target);
        if (collection.size() === 0) {
          self.trigger('draghoverend');
        }
      }, 1);

      self.on('dragover', (err) => {
        err.stopPropagation();
        err.preventDefault();
      });
    });
  });
};

const hideErrorMessage = () => {
  $('#errorbox').slideUp('fast');
};

const showErrorMessage = (msg) => {
  const errorBox = $('#errorbox');
  errorBox.html(msg);
  errorBox.slideDown('fast', () => {
    setTimeout(() => {
      // Hide the error message in 5 seconds
      hideErrorMessage();
    }, 5000);
  });
};

const resetDragHoveringEventTriggering = () => {
  let originalBackground;
  let originalText;

  // Following is a pain using "dragenter" and "dragleave" events. draghover() plugin (above) makes it easy!
  $(window)
    .draghover()
    .on({
      draghoverstart() {
        originalBackground = $('.selector-button').css('background');
        originalText = $('.selector-button').html();
        $('.selector-button').animate(
          { 'background-color': '#C91313' },
          'slow',
        );
        $('.selector-button').html('Drop Here');
      },
      draghoverend() {
        $('.selector-button').html(originalText);
        $('.selector-button').animate(
          { 'background-color': originalBackground },
          'slow',
        );
        return false;
      },
    });
};

/** *********Image selector functionality**************** */

const handleFiles = (files, frame, key) => {
  const file = files[0];
  const imageType = /image.*/;

  if (!file.type.match(imageType)) {
    showErrorMessage('Sorry, you must select an image file. Please try again.');
    return;
  }

  // For now, restrict the user from using large images that won't sync. In the future, we could allow it,
  // but we'll have to warn the user that it will not be synced and make sure our raw value (the reference to
  // the actual data image localStorage item) doesn't overwrite any remote ones.
  if (file.size >= chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
    showErrorMessage(
      'Sorry, only very small images are allowed. Please choose one under 8 KB.',
    );
    return;
  }

  // hide any error messages
  hideErrorMessage();

  const img = document.createElement('img');
  img.classList.add('obj');
  img.file = file;

  // eslint-disable-next-line no-param-reassign
  frame.innerHTML = ''; // clear frame before putting new image in
  frame.appendChild(img);

  const reader = new FileReader();
  reader.onload = (function (aImg) {
    return function (e) {
      // eslint-disable-next-line no-param-reassign
      aImg.src = e.target.result;

      // Save to local storage
      setScrollbarImageStyleAndRefresh(key, aImg.src).then(() => {
        // Change the "Select Image" button to an image frame
        const container = $(frame).parents('.imagepicker-container');
        container.children('.selector-button').hide();
        container.children('.thumbframe').show();
      });
    };
  })(img);
  reader.readAsDataURL(file);
};

const handleDocReady = async () => {
  window.PAGE_CACHE = await initPageCache();

  refreshScrollbars();

  // Fill the excludedsites textarea with the list of excluded sites:
  $('#excludedsites').val(
    window.PAGE_CACHE[RESCROLLER_SETTINGS_KEY].excludedsites,
  );
  $('#excludedsites').change(async function () {
    const newValue = $(this).val();

    window.PAGE_CACHE[RESCROLLER_SETTINGS_KEY].excludedsites = newValue;

    const allRescrollerSettings = await getChromeStorageValue(
      RESCROLLER_SETTINGS_KEY,
    );

    await setChromeStorageValue(
      RESCROLLER_SETTINGS_KEY,
      JSON.stringify({
        ...allRescrollerSettings,
        excludedsites: newValue,
      }),
    );
  });

  // Fill the custom CSS form with the custom CSS
  $('#customcss').val(getScrollbarStyles(window.PAGE_CACHE).customcss);
  $('#customcss').change(function () {
    setScrollbarStyleAndRefresh('customcss', $(this).val());
  });

  // Fill the form elements with data from local storage:
  $('input').each(function () {
    const id = $(this).attr('id');

    if ($(this).attr('type') !== 'submit') {
      // Make sure we're not talking about the submit button here

      if ($(this).attr('type') === 'checkbox') {
        // If it's a check box...

        // If local storage says this option should be checked, check it
        if (getScrollbarStyles(window.PAGE_CACHE)[id] === 'checked') {
          $(this).attr('checked', getScrollbarStyles(window.PAGE_CACHE)[id]);
        }
      }
      // If it's an ordinary input, just fill the input with the corresponding value from local storage
      else {
        $(this).val(getScrollbarStyles(window.PAGE_CACHE)[id]);
      }
    }
  });

  // Enable functionality of Confirm Box "Never Show Again" button
  $('#save-confirm #hide-saved-confirm').click(async () => {
    window.PAGE_CACHE[RESCROLLER_SETTINGS_KEY].showSaveConfirmation = false;
    $('#save-confirm').fadeOut('slow');

    const allRescrollerSettings = await getChromeStorageValue(
      RESCROLLER_SETTINGS_KEY,
    );

    await setChromeStorageValue(
      RESCROLLER_SETTINGS_KEY,
      JSON.stringify({
        ...allRescrollerSettings,
        showSaveConfirmation: false,
      }),
    );

    return false;
  });

  $('#expandcss').click(() => {
    $('#generatedcss').slideToggle('fast');
    return false;
  });

  // Reset formatting button
  $('#resetformatting').click(() => {
    if (
      !window.confirm(
        'Are you sure you would like to reset your scrollbars to default? This cannot be undone.',
      )
    ) {
      return false;
    }

    setDefaultStyling(window.PAGE_CACHE).then(() => {
      // full refresh instead of refreshScrollbars() so all our settings bars are reset as well.
      // An actual JS view framework will fix this later on.
      window.location.reload(true);
    });

    return true;
  });

  // Expand/collapse all non-custom css areas when that checkbox is checked
  if (getScrollbarStyles(window.PAGE_CACHE).usecustomcss === 'checked') {
    $('.section').not('#misc').not($('#general')).hide();
    $('.customcss-collapsible').hide();
  }

  $('#usecustomcss').change(function () {
    if ($(this).is(':checked')) {
      $('.section').not('#misc').not($('#general')).slideUp('slow');
      $('.customcss-collapsible').slideUp('slow');
    } else {
      $('.section').slideDown('slow');
      $('.customcss-collapsible').slideDown('slow');
    }
  });

  // Clear picture buttons
  $('.clearimage').click(function () {
    const key = $(this).parent().parent().attr('id');
    removeScrollbarStyle(window.PAGE_CACHE, key).then(() => {
      $(this).siblings('.thumbframe .thumbcontainer').html('No Image Loaded');
      $(this)
        .parents('.imagepicker-container')
        .children('input[type=file].selector')
        .val('');

      // Hide the thumbframe and restore it with the "Select Image" button
      $(`#${key}`).children('.thumbframe').hide();
      $(`#${key}`).children('.selector-button').css('display', 'block');

      refreshScrollbars();
      showSaveConfirmIfEnabled();
    });
    return false;
  });

  // Set correct value for <select>s
  $('select').each(function () {
    const thisProperty = $(this).attr('id');
    const thisPropertyValue = getScrollbarStyles(window.PAGE_CACHE)[
      thisProperty
    ];
    $(this)
      .children()
      .each(function () {
        if ($(this).val() === thisPropertyValue) {
          $(this).attr('selected', 'selected');
        }
      });
  });

  // When <select> is changed, save it to local storage
  $('select').change(function () {
    const thisProperty = $(this).attr('id');
    const currentValue = $(this).val();
    setScrollbarStyleAndRefresh(thisProperty, currentValue);
  });

  /** *********Set up Sliders*********** */

  // Main slider (scrollbar size)
  $('#size .slider').slider({
    animate: true,
    min: 0,
    max: 30,
  });

  // All sliders
  $('.slider').not('#size .slider').slider({
    animate: true,
    min: 0,
    max: 100,
  });

  // Loop through all "property" classes and set up their inner sliders, etc.
  $('.slider-property').each(function () {
    const propertyName = $(this).attr('id');
    let theOrientation;
    if ($(this).children('.slider').hasClass('slider-v')) {
      theOrientation = 'vertical';
    } else {
      theOrientation = 'horizontal';
    }

    // If this is one of the few scrollbars that uses px instead of %, set the "units" to px
    let units;
    if (propertyName === 'size' || propertyName === 'buttons-size') {
      units = 'px';
    } else {
      units = '%';
    }

    // Fill slider value with value from local storage
    $(`#${propertyName} .slider-value`).html(
      getScrollbarStyles(window.PAGE_CACHE)[propertyName] + units,
    );

    // Set up slider for this property
    $(`#${propertyName} .slider`).slider({
      value: getScrollbarStyles(window.PAGE_CACHE)[propertyName],
      orientation: theOrientation,
      slide(event, ui) {
        $(this)
          .siblings('.slider-value')
          .html(ui.value + units);
      },
      change(event, ui) {
        // Update value in local storage
        setScrollbarStyleAndRefresh(propertyName, ui.value);
      },
    });
  });

  /** *********Set up Color Pickers*********** */

  $('.colorselection').each(function () {
    const localStorageKey = $(this).parent().attr('id');
    const self = $(this);

    $(this).miniColors({
      change(hex) {
        self.siblings('.colorvalue').val(hex);
      },
      close(hex) {
        setScrollbarStyleAndRefresh(localStorageKey, hex);
      },
    });

    // Set default color to whatever it's been saved to
    $(this).miniColors(
      'value',
      getScrollbarStyles(window.PAGE_CACHE)[$(this).parent().attr('id')],
    );

    // Add "apply" button
    $('.miniColors-selector').append('<p><a href="#">Apply</a></p>');
  });

  // save the last-clicked color picker
  $('a.miniColors-trigger').click(function () {
    lastClickedColorPickerPropertyID = $(this).parent().attr('id');
  });

  // Set functionality of "apply" button
  $('body').on('click', '.miniColors-apply a', () => {
    // applies listener to the <a> that hasn't been created yet
    const colorSelectorInput = $(
      `#${lastClickedColorPickerPropertyID}`,
    ).children('input.colorselection');
    colorSelectorInput.miniColors('hide');

    return false;
  });

  // Loop through all image frames and fill them:
  const keys = [
    'slider-background-image-vertical',
    'slider-background-image-horizontal',
    'slider-background-image-vertical-hover',
    'slider-background-image-horizontal-hover',
    'slider-background-image-vertical-active',
    'slider-background-image-horizontal-active',

    'background-background-image-vertical',
    'background-background-image-horizontal',
    'background-background-image-vertical-hover',
    'background-background-image-horizontal-hover',
    'background-background-image-vertical-active',
    'background-background-image-horizontal-active',

    'buttons-background-image-up',
    'buttons-background-image-down',
    'buttons-background-image-left',
    'buttons-background-image-right',
    'buttons-background-image-up-hover',
    'buttons-background-image-down-hover',
    'buttons-background-image-left-hover',
    'buttons-background-image-right-hover',
    'buttons-background-image-up-active',
    'buttons-background-image-down-active',
    'buttons-background-image-left-active',
    'buttons-background-image-right-active',
  ];

  // for (let i = 0; i < keys.length; i++) {
  keys.forEach((key) => {
    if (
      getScrollbarStyles(window.PAGE_CACHE)[key] &&
      getScrollbarStyles(window.PAGE_CACHE)[key] !== 0
    ) {
      $(`#${key} .thumbframe div.thumbcontainer`).html(
        `<img src="${getScrollbarStyles(window.PAGE_CACHE)[key]}" />`,
      );
      $(`#${key} .thumbframe`).css('display', 'inline-block'); // show the image frame for this image
    } else {
      // otherwise, show the "upload image" button (instead of the thumbframe)
      $(`#${key} .selector-button`).css('display', 'inline-block');
    }
  });

  // draghover() "plugin" stops working after being utilized once, so needed to be in function that can be recalled
  resetDragHoveringEventTriggering();

  // Fill "colorvalue" inputs with color values
  $('.colorvalue').each(function () {
    $(this).val(
      getScrollbarStyles(window.PAGE_CACHE)[$(this).parent().attr('id')],
    );
  });

  // Automatically select text when clicking a color value
  $('.colorvalue').focus(function () {
    const self = $(this);
    $(this).select(); // Select the value of the input form
    $(this).mouseup((e) => {
      // Prevent the text from being unselected when you stop the click
      e.preventDefault();
      self.off('mouseup'); // Remove the mouseup function to restore normal functionality
    });
  });

  $('.colorvalue').change(function () {
    const val = $(this).val();
    // If the value is a hex value, save it
    if (val.indexOf('#') === 0 && (val.length === 4 || val.length === 7)) {
      $(this).siblings('.colorselection').miniColors('value', val);
      setScrollbarStyleAndRefresh($(this).parent().attr('id'), val);
    }
    // If the user just forgot the #, add it automatically and save
    else if (val.indexOf('#') !== 0 && (val.length === 3 || val.length === 6)) {
      $(this).siblings('.colorselection').miniColors('value', `#${val}`);
      $(this).val(`#${val}`);
      setScrollbarStyleAndRefresh($(this).parent().attr('id'), val);
    }
    // If it's just a bad value, restore original
    else {
      $(this).val(
        getScrollbarStyles(window.PAGE_CACHE)[$(this).parent().attr('id')],
      );
    }
  });

  /** ******** Collapsable Checkboxes ******************** */

  // Scroll buttons
  const showButtons = $('#showbuttons');

  // Make sure wrapper is correctly expanded on load
  if (showButtons.is(':checked')) {
    $('#buttons-toggleable').show();
  } else {
    $('#buttons-toggleable').hide();
  }

  // When checkbox is changed:
  showButtons.change(function () {
    // Expand/collapse wrapper & save value to local storage
    if ($(this).is(':checked')) {
      setScrollbarStyleAndRefresh($(this).attr('id'), 'checked').then(() =>
        $('#buttons-toggleable').slideDown('fast'),
      );
    } else {
      setScrollbarStyleAndRefresh($(this).attr('id'), 'unchecked').then(() =>
        $('#buttons-toggleable').slideUp('fast'),
      );
    }
  });

  /** *********** Slider Hover/Active Checkboxes ************* */

  // Make sure wrappers are correctly expanded/collapsed on load
  $('.toggle-hover-active').each(function () {
    const targetWrapper = $(`#${$(this).attr('data-wrapperid')}`);

    if ($(this).is(':checked')) {
      targetWrapper.show();
    } else {
      targetWrapper.hide();
    }
  });

  // Expand/collapse and write to local Storage
  $('.toggle-hover-active').change(function () {
    if ($(this).is(':checked')) {
      // alert("Checked!");
      setScrollbarStyleAndRefresh($(this).attr('id'), 'checked').then(() =>
        $(`#${$(this).attr('data-wrapperid')}`).slideDown('slow'),
      );
    } else {
      // alert("Unchecked!");
      setScrollbarStyleAndRefresh($(this).attr('id'), 'unchecked').then(() =>
        $(`#${$(this).attr('data-wrapperid')}`).slideUp('slow'),
      );
    }
  });

  const setRestoreArrowsDefaultImages = (
    triggerID,
    propertyPrefix,
    propertySuffix,
  ) => {
    $(`#${triggerID}`).click(() => {
      const up = `${propertyPrefix}up${propertySuffix}`;
      const down = `${propertyPrefix}down${propertySuffix}`;
      const left = `${propertyPrefix}left${propertySuffix}`;
      const right = `${propertyPrefix}right${propertySuffix}`;

      resetScrollbarImageStyle(
        window.PAGE_CACHE,
        down,
        chrome.runtime.getURL('images/defaults/down.png'),
      ).then(() => {
        resetScrollbarImageStyle(
          window.PAGE_CACHE,
          up,
          chrome.runtime.getURL('images/defaults/up.png'),
        ).then(() => {
          resetScrollbarImageStyle(
            window.PAGE_CACHE,
            left,
            chrome.runtime.getURL('images/defaults/left.png'),
          ).then(() => {
            resetScrollbarImageStyle(
              window.PAGE_CACHE,
              right,
              chrome.runtime.getURL('images/defaults/right.png'),
            ).then(() => {
              $(`#${down}, #${up}, #${left}, #${right}`).each(function () {
                $(this)
                  .children('.thumbframe')
                  .children('.thumbcontainer')
                  .html(
                    `<img src="${
                      getScrollbarStyles(window.PAGE_CACHE)[$(this).attr('id')]
                    }" />`,
                  );
                $(this).children('.selector-button').hide();
                $(this).children('.thumbframe').show();
              });

              showSaveConfirmIfEnabled();
              refreshScrollbars();
            });
          });
        });
      });
      return false;
    });
  };

  /** Set functionality of "restore default buttons" link (for scrollbar buttons) * */
  setRestoreArrowsDefaultImages(
    'restore-arrow-defaults',
    'buttons-background-image-',
    '',
  );
  setRestoreArrowsDefaultImages(
    'restore-arrow-defaults-hover',
    'buttons-background-image-',
    '-hover',
  );
  setRestoreArrowsDefaultImages(
    'restore-arrow-defaults-active',
    'buttons-background-image-',
    '-active',
  );

  // Whenever selectors (hidden <input type="file">s) are changed, save their valuese to local storage
  $('.selector').change(function () {
    handleFiles(
      this.files,
      $(this).siblings('.thumbframe').children('div.thumbcontainer').get()[0],
      $(this).parent().attr('id'),
    );
  });

  // Whenever selector buttons are clicked, invoke their related selector's click function (i.e., save their contents to local storage)
  $('.selector-button').click(function () {
    $(this).siblings('.selector').get()[0].click();
    return false;
  });

  // Whenever a file is dropped on a dropbox, save the file to local storage with the associated value
  $('.selector-button').bind('drop', function (eventObj) {
    const e = eventObj.originalEvent;
    e.stopPropagation();
    e.preventDefault();

    const dt = e.dataTransfer;
    const { files } = dt;

    handleFiles(
      files,
      $(this).siblings('.thumbframe').children('div.thumbcontainer').get()[0],
      $(this).parent().attr('id'),
    );

    // Hide the dropbox
    $('.selector-button').html('Select Image');
    $('.selector-button').animate({ 'background-color': '#333' }, 'slow');
    resetDragHoveringEventTriggering();
    return false;
  });
};

$(document).ready(() => {
  handleDocReady().then(() => {});
});
