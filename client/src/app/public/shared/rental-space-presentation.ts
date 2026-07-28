const RENTAL_ASSET_ROOT = '/madlenianum/zakup_prostora';

const RENTAL_SPACE_IMAGES: Record<string, string> = {
  'velika-scena-zakup': `${RENTAL_ASSET_ROOT}/Velika_sala.jpg`,
  'bel-etage': `${RENTAL_ASSET_ROOT}/Bel_etage.jpg`,
  'foaje-madlenianuma': `${RENTAL_ASSET_ROOT}/Foaje.jpg`,
  'sala-studio': `${RENTAL_ASSET_ROOT}/Sala_studio.jpg`,
  'sala-sifnios': `${RENTAL_ASSET_ROOT}/Sala_sifnios.png`,
  'vip-salon': `${RENTAL_ASSET_ROOT}/VIP_salon.png`,
};

export const RENTAL_HERO_IMAGE = `${RENTAL_ASSET_ROOT}/madlenianum_sale_wallpaper.jpg`;

export function rentalSpaceImage(slug: string, heroImageUrl = ''): string {
  return heroImageUrl || RENTAL_SPACE_IMAGES[slug] || `${RENTAL_ASSET_ROOT}/Foaje.jpg`;
}
