import { Pipe, PipeTransform } from '@angular/core';

import { PublicI18nService } from './public-i18n.service';
import { PublicTranslationKey } from './public-translations';

@Pipe({ name: 'publicTranslate', standalone: true, pure: false })
export class PublicTranslatePipe implements PipeTransform {
  constructor(private readonly i18n: PublicI18nService) {}

  transform(key: PublicTranslationKey, replacements: Record<string, string | number> = {}): string {
    return this.i18n.t(key, replacements);
  }
}
