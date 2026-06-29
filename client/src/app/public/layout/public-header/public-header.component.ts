import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface PublicNavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.scss',
})
export class PublicHeaderComponent {
  readonly menuOpen = signal(false);

  readonly navItems: PublicNavItem[] = [
    { label: 'Home', path: '/' },
    { label: 'Repertoar', path: '/repertoar' },
    { label: 'Predstave', path: '/predstave' },
    { label: 'Umetnici', path: '/umetnici' },
    { label: 'O nama', path: '/strana/o-nama' },
    { label: 'Kontakt', path: '/strana/kontakt' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
