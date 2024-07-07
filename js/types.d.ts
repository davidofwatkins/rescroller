export type ScrollbarStyle = {
  size: number;
  'subbackground-color': string;
  'corner-background': string;
  'background-color': string;
  'background-shadow-color': string;
  'background-shadow-size': number;
  'background-border-size': number;
  'background-border-color': string;
  'background-border-style': string;
  'background-radius': number;
  'background-color-hover': string;
  'background-shadow-color-hover': string;
  'background-shadow-size-hover': number;
  'background-color-active': string;
  'background-shadow-color-active': string;
  'background-shadow-size-active': number;
  'slider-color': string;
  'slider-shadow-color': string;
  'slider-shadow-size': number;
  'slider-radius': number;
  'slider-border-size': number;
  'slider-border-color': string;
  'slider-border-style': string;
  'slider-color-hover': string;
  'slider-shadow-color-hover': string;
  'slider-shadow-size-hover': number;
  'slider-color-active': string;
  'slider-shadow-color-active': string;
  'slider-shadow-size-active': number;
  showbuttons: string;
  'buttons-size': number;
  'buttons-color': string;
  'buttons-shadow-color': string;
  'buttons-shadow-size': number;
  'buttons-radius': number;
  'buttons-border-size': number;
  'buttons-border-color': string;
  'buttons-border-style': string;
  'buttons-background-image-up':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/up.png'
    | { localStorageKey: string };
  'buttons-background-image-down':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/down.png'
    | { localStorageKey: string };
  'buttons-background-image-left':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/left.png'
    | { localStorageKey: string };
  'buttons-background-image-right':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/right.png'
    | { localStorageKey: string };
  'buttons-color-hover': string;
  'buttons-shadow-color-hover': string;
  'buttons-shadow-size-hover': number;
  'buttons-background-image-up-hover':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/up.png'
    | { localStorageKey: string };
  'buttons-background-image-down-hover':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/down.png'
    | { localStorageKey: string };
  'buttons-background-image-left-hover':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/left.png'
    | { localStorageKey: string };
  'buttons-background-image-right-hover':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/right.png'
    | { localStorageKey: string };
  'buttons-color-active': string;
  'buttons-shadow-color-active': string;
  'buttons-shadow-size-active': number;
  'buttons-background-image-up-active':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/up.png'
    | { localStorageKey: string };
  'buttons-background-image-down-active':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/down.png'
    | { localStorageKey: string };
  'buttons-background-image-left-active':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/left.png'
    | { localStorageKey: string };
  'buttons-background-image-right-active':
    | 'chrome-extension://ddehdnnhjimbggeeenghijehnpakijod/images/defaults/right.png'
    | { localStorageKey: string };
  'slider-background-image-vertical': string;
  'slider-background-image-horizontal': string;
  'slider-background-image-vertical-hover': string;
  'slider-background-image-horizontal-hover': string;
  'slider-background-image-vertical-active': string;
  'slider-background-image-horizontal-active': string;
  'background-background-image-vertical': string;
  'background-background-image-horizontal': string;
  'background-background-image-vertical-hover': string;
  'background-background-image-horizontal-hover': string;
  'background-background-image-vertical-active': string;
  'background-background-image-horizontal-active': string;
  customcss: string;
};

export type RescrollerSettings = {
  showSaveConfirmation: boolean;
  excludedsites: string;
  scrollbarStyle: {
    metadata: {};
    data: ScrollbarStyle;
  };
};
