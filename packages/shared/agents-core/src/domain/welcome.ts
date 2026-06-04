import { APP_VERSION, BRAND_NAME, WELCOME_TAGLINE, type WelcomeContent } from './types.js';

export function getWelcomeContent(): WelcomeContent {
  return {
    brandName: BRAND_NAME,
    tagline: WELCOME_TAGLINE,
    subtitle: 'Pressione qualquer tecla para iniciar',
    version: APP_VERSION,
  };
}
