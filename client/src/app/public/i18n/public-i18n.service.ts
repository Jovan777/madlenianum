import { Injectable } from '@angular/core';

import { PublicLocaleService } from '../../core/services/public-locale.service';
import { PublicTranslationKey, publicTranslation } from './public-translations';

@Injectable({ providedIn: 'root' })
export class PublicI18nService {
  constructor(readonly locale: PublicLocaleService) {}

  t(key: PublicTranslationKey, replacements: Record<string, string | number> = {}): string {
    let value = publicTranslation(this.locale.current(), key);
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  }
}
