import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export type AdminContentLanguage = 'sr' | 'en';

@Component({
  selector: 'app-admin-language-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-language-tabs.component.html',
  styleUrl: './admin-language-tabs.component.scss',
})
export class AdminLanguageTabsComponent {
  readonly active = input<AdminContentLanguage>('sr');
  readonly serbianComplete = input(true);
  readonly englishComplete = input(false);
  readonly languageChange = output<AdminContentLanguage>();
}
