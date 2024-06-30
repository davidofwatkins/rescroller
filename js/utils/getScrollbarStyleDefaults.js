export const getScrollbarStyleDefaults = () => ({
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
  'buttons-background-image-up': chrome.runtime.getURL(
    'images/defaults/up.png'
  ),
  'buttons-background-image-down': chrome.runtime.getURL(
    'images/defaults/down.png'
  ),
  'buttons-background-image-left': chrome.runtime.getURL(
    'images/defaults/left.png'
  ),
  'buttons-background-image-right': chrome.runtime.getURL(
    'images/defaults/right.png'
  ),
  // hovering
  'buttons-color-hover': '#666666',
  'buttons-shadow-color-hover': '#000000',
  'buttons-shadow-size-hover': 0,
  'buttons-background-image-up-hover': chrome.runtime.getURL(
    'images/defaults/up.png'
  ),
  'buttons-background-image-down-hover': chrome.runtime.getURL(
    'images/defaults/down.png'
  ),
  'buttons-background-image-left-hover': chrome.runtime.getURL(
    'images/defaults/left.png'
  ),
  'buttons-background-image-right-hover': chrome.runtime.getURL(
    'images/defaults/right.png'
  ),
  // active
  'buttons-color-active': '#666666',
  'buttons-shadow-color-active': '#000000',
  'buttons-shadow-size-active': 0,
  'buttons-background-image-up-active': chrome.runtime.getURL(
    'images/defaults/up.png'
  ),
  'buttons-background-image-down-active': chrome.runtime.getURL(
    'images/defaults/down.png'
  ),
  'buttons-background-image-left-active': chrome.runtime.getURL(
    'images/defaults/left.png'
  ),
  'buttons-background-image-right-active': chrome.runtime.getURL(
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
});
