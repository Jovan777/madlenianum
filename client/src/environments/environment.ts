type MadlenianumRuntimeConfig = {
  apiOrigin?: string;
};

const runtimeConfig = (
  globalThis as typeof globalThis & {
    __MADLENIANUM_CONFIG__?: MadlenianumRuntimeConfig;
  }
).__MADLENIANUM_CONFIG__;

const apiOrigin = String(runtimeConfig?.apiOrigin || '').trim().replace(/\/+$/, '');

export const environment = {
  production: true,
  apiUrl: apiOrigin ? `${apiOrigin}/api` : '/api',
  mediaBaseUrl: apiOrigin,
  mediaMaxFileSizeMb: 10,
};
