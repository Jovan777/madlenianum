import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PublicMotionObserverService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly observed = new Set<HTMLElement>();
  private observer: IntersectionObserver | null = null;
  private reducedMotion = false;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const view = this.document.defaultView;
    const explicitPreference = view?.localStorage.getItem('madlenianum:motion');
    const queryPreference = view ? new URLSearchParams(view.location.search).get('motion') : null;
    this.reducedMotion = explicitPreference === 'reduce' || queryPreference === 'reduce';
    this.document.documentElement.classList.toggle('motion-reduced', this.reducedMotion);
  }

  observe(element: HTMLElement): void {
    if (element.classList.contains('motion-reveal-visible')) return;

    element.classList.add('motion-reveal-ready');
    if (this.reducedMotion || !isPlatformBrowser(this.platformId) || !('IntersectionObserver' in globalThis)) {
      this.reveal(element);
      return;
    }

    this.ensureObserver().observe(element);
    this.observed.add(element);
  }

  unobserveTree(root: Element): void {
    const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('.motion-reveal-ready'))];
    for (const element of elements) {
      if (!(element instanceof HTMLElement)) continue;
      this.observer?.unobserve(element);
      this.observed.delete(element);
    }
  }

  private ensureObserver(): IntersectionObserver {
    if (this.observer) return this.observer;

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        this.reveal(entry.target as HTMLElement);
      }
    }, { rootMargin: '0px 0px -16% 0px', threshold: 0.08 });

    return this.observer;
  }

  private reveal(element: HTMLElement): void {
    element.classList.add('motion-reveal-visible');
    this.observer?.unobserve(element);
    this.observed.delete(element);
  }

  private revealAll(): void {
    for (const element of this.observed) this.reveal(element);
    this.observer?.disconnect();
    this.observer = null;
  }
}
