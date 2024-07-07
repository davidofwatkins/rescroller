import CSSJSON from '../cssjson.js';
import { getScrollbarStyleDefaults } from './getScrollbarStyleDefaults.js';

const precentageToPixels = (size, percentage, doNotReduceByHalf) => {
  if (!doNotReduceByHalf) {
    return ((percentage / 100) * size) / 2;
  }

  return (percentage / 100) * size;
};

export const getCompiledCSS = (scrollbarStyles) => {
  const defaults = getScrollbarStyleDefaults();

  const stylesWithDefaults = {
    ...defaults,
    ...scrollbarStyles,
  };

  if (stylesWithDefaults.usecustomcss === 'checked') {
    return stylesWithDefaults.customcss;
  }

  // Build our CSS structure as JSON for readability and maintainability. Then, we'll convert it to CSS!
  const rootJsonStyle = {
    '*': {
      attributes: {
        'scrollbar-width': `unset`,
        'scrollbar-color': 'unset',
        'scrollbar-gutter': 'unset',
      },
    },

    '::-webkit-scrollbar, ::-webkit-scrollbar:horizontal, ::-webkit-scrollbar:vertical':
      {
        attributes: {
          width: `${stylesWithDefaults.size}px`,
          height: `${stylesWithDefaults.size}px`,
          'background-color': `${stylesWithDefaults['subbackground-color']}`,
        },
      },

    '::-webkit-scrollbar-track-piece': {
      attributes: {
        'background-color': stylesWithDefaults['background-color'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['background-shadow-size'],
          true,
        )}px ${stylesWithDefaults['background-shadow-color']}`,
        border: `${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['background-border-size'],
        )}px ${stylesWithDefaults['background-border-style']} ${
          stylesWithDefaults['background-border-color']
        }`,
        'border-radius': `${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['background-radius'],
        )}px`,
      },
    },
    '::-webkit-scrollbar-track-piece:vertical': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['background-background-image-vertical']}')`,
      },
    },
    '::-webkit-scrollbar-track-piece:horizontal': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['background-background-image-horizontal']}')`,
      },
    },

    '::-webkit-scrollbar-thumb': {
      attributes: {
        'background-color': stylesWithDefaults['slider-color'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['slider-shadow-size'],
          true,
        )}px ${stylesWithDefaults['slider-shadow-color']}`,
        'border-radius': `${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['slider-radius'],
        )}px`,
        border: `${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['slider-border-size'],
        )}px ${stylesWithDefaults['slider-border-style']} ${
          stylesWithDefaults['slider-border-color']
        }`,
      },
    },
    '::-webkit-scrollbar-thumb:vertical': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['slider-background-image-vertical']}')`,
      },
    },
    '::-webkit-scrollbar-thumb:horizontal': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['slider-background-image-horizontal']}')`,
      },
    },

    '::-webkit-scrollbar-corner': {
      attributes: {
        'background-color': stylesWithDefaults['corner-background'],
      },
    },
    // "::-webkit-resizer": {
    //     "attributes": {
    //         "background-color": scrollbarStyles['resizer-background']
    //     }
    // }
    // },
  };

  const showButtonsStyle = {
    // Use single buttons (hide the doubles):
    '::-webkit-scrollbar-button:vertical:start:increment, ::-webkit-scrollbar-button:vertical:end:decrement, ::-webkit-scrollbar-button:horizontal:start:increment, ::-webkit-scrollbar-button:horizontal:end:decrement':
      {
        attributes: {
          display: 'none',
        },
      },
    '::-webkit-scrollbar-button': {
      attributes: {
        'background-color': stylesWithDefaults['buttons-color'],
        'border-radius': `${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['buttons-radius'],
        )}px`,
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['buttons-shadow-size'],
          true,
        )}px ${stylesWithDefaults['buttons-shadow-color']}`,
        border: `${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['buttons-border-size'],
        )}px ${stylesWithDefaults['buttons-border-style']} ${
          stylesWithDefaults['buttons-border-color']
        }`,
        display: 'block',
      },
    },
    '::-webkit-scrollbar-button:vertical': {
      attributes: {
        height: `${stylesWithDefaults['buttons-size']}px`,
      },
    },
    '::-webkit-scrollbar-button:horizontal': {
      attributes: {
        width: `${stylesWithDefaults['buttons-size']}px`,
      },
    },
    '::-webkit-scrollbar-button:vertical:decrement': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-up']}')`,
      },
    },
    '::-webkit-scrollbar-button:vertical:increment': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-down']}')`,
      },
    },
    '::-webkit-scrollbar-button:horizontal:increment': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-right']}')`,
      },
    },
    '::-webkit-scrollbar-button:horizontal:decrement': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-left']}')`,
      },
    },
  };

  const buttonsUseHoverStyle = {
    '::-webkit-scrollbar-button:vertical:decrement:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-up-hover']}')`,
      },
    },
    '::-webkit-scrollbar-button:vertical:increment:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-down-hover']}')`,
      },
    },
    '::-webkit-scrollbar-button:horizontal:increment:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-right-hover']}')`,
      },
    },
    '::-webkit-scrollbar-button:horizontal:decrement:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-left-hover']}')`,
      },
    },
    '::-webkit-scrollbar-button:hover': {
      attributes: {
        'background-color': stylesWithDefaults['buttons-color-hover'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['buttons-shadow-size-hover'],
          true,
        )}px ${stylesWithDefaults['buttons-shadow-color-hover']}`,
      },
    },
  };

  const buttonsUseActiveStyle = {
    '::-webkit-scrollbar-button:vertical:decrement:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-up-active']}')`,
      },
    },
    '::-webkit-scrollbar-button:vertical:increment:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-down-active']}')`,
      },
    },
    '::-webkit-scrollbar-button:horizontal:increment:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-right-active']}')`,
      },
    },
    '::-webkit-scrollbar-button:horizontal:decrement:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['buttons-background-image-left-active']}')`,
      },
    },
    '::-webkit-scrollbar-button:active': {
      attributes: {
        'background-color': stylesWithDefaults['buttons-color-active'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['buttons-shadow-size-active'],
          true,
        )}px ${stylesWithDefaults['buttons-shadow-color-active']}`,
      },
    },
  };

  const backgroundUseHoverStyle = {
    '::-webkit-scrollbar-track-piece:vertical:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['background-background-image-vertical-hover']}')`,
      },
    },
    '::-webkit-scrollbar-track-piece:horizontal:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['background-background-image-horizontal-hover']}')`,
      },
    },
    '::-webkit-scrollbar-track-piece:hover ': {
      attributes: {
        'background-color': stylesWithDefaults['background-color-hover'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['background-shadow-size-hover'],
          true,
        )}px ${stylesWithDefaults['background-shadow-color-hover']}`,
      },
    },
  };

  const backgroundUseActiveStyle = {
    '::-webkit-scrollbar-track-piece:vertical:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['background-background-image-vertical-active']}')`,
      },
    },
    '::-webkit-scrollbar-track-piece:horizontal:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['background-background-image-horizontal-active']}')`,
      },
    },
    '::-webkit-scrollbar-track-piece:active': {
      attributes: {
        'background-color': stylesWithDefaults['background-color-active'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['background-shadow-size-active'],
          true,
        )}px ${stylesWithDefaults['background-shadow-color-active']}`,
      },
    },
  };

  const sliderUseHoverStyle = {
    '::-webkit-scrollbar-thumb:hover': {
      attributes: {
        'background-color': stylesWithDefaults['slider-color-hover'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['slider-shadow-size-hover'],
          true,
        )}px ${stylesWithDefaults['slider-shadow-color-hover']}`,
      },
    },
    '::-webkit-scrollbar-thumb:vertical:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['slider-background-image-vertical-hover']}')`,
      },
    },
    '::-webkit-scrollbar-thumb:horizontal:hover': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['slider-background-image-horizontal-hover']}')`,
      },
    },
  };

  const sliderUseActiveStyle = {
    '::-webkit-scrollbar-thumb:active': {
      attributes: {
        'background-color': stylesWithDefaults['slider-color-active'],
        'box-shadow': `inset 0 0 ${precentageToPixels(
          stylesWithDefaults.size,
          stylesWithDefaults['slider-shadow-size-active'],
          true,
        )}px ${stylesWithDefaults['slider-shadow-color-active']}`,
      },
    },
    '::-webkit-scrollbar-thumb:vertical:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['slider-background-image-vertical-active']}')`,
      },
    },
    '::-webkit-scrollbar-thumb:horizontal:active': {
      attributes: {
        'background-image': `url('${stylesWithDefaults['slider-background-image-horizontal-active']}')`,
      },
    },
  };

  const combinedJson = {
    children: {
      ...rootJsonStyle,
      ...(stylesWithDefaults.showbuttons === 'checked' && {
        ...showButtonsStyle,
        ...(stylesWithDefaults['buttons-use-hover'] === 'checked' &&
          buttonsUseHoverStyle),
        ...(stylesWithDefaults['buttons-use-active'] === 'checked' &&
          buttonsUseActiveStyle),
      }),
      ...(stylesWithDefaults['background-use-hover'] === 'checked' &&
        backgroundUseHoverStyle),
      ...(stylesWithDefaults['background-use-active'] === 'checked' &&
        backgroundUseActiveStyle),
      ...(stylesWithDefaults['slider-use-hover'] === 'checked' &&
        sliderUseHoverStyle),
      ...(stylesWithDefaults['slider-use-active'] === 'checked' &&
        sliderUseActiveStyle),
    },
  };

  // Some cleanup before we send it off!
  Object.keys(combinedJson.children).forEach((selector) => {
    const children = combinedJson.children[selector];
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

  return CSSJSON.toCSS(combinedJson);
};
