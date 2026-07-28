import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

import { PublicMotionObserverService } from './public-motion-observer.service';

@Directive({
  selector: '[publicMotionRoot]',
  standalone: true,
})
export class PublicMotionRootDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly motion = inject(PublicMotionObserverService);
  private mutationObserver: MutationObserver | null = null;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.prepareTree(this.host);
      this.mutationObserver = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.addedNodes)) {
            if (node instanceof HTMLElement) this.prepareTree(node);
          }
          for (const node of Array.from(record.removedNodes)) {
            if (node instanceof HTMLElement) this.motion.unobserveTree(node);
          }
        }
      });
      this.mutationObserver.observe(this.host, { childList: true, subtree: true });
    });
  }

  ngOnDestroy(): void {
    this.mutationObserver?.disconnect();
    this.motion.unobserveTree(this.host);
  }

  private prepareTree(root: HTMLElement): void {
    const staggerGroups = this.collect(root, '[data-motion-stagger]');
    for (const group of staggerGroups) {
      const items = Array.from(group.querySelectorAll<HTMLElement>(':scope > [data-motion-item]'));
      items.forEach((item, index) => {
        item.style.setProperty('--motion-index', String(Math.min(index, 6)));
        this.prepareElement(item, item.dataset['motionItem'] || 'up');
      });
    }

    for (const element of this.collect(root, '[data-motion]')) {
      this.prepareElement(element, element.dataset['motion'] || 'up');
    }
  }

  private prepareElement(element: HTMLElement, variant: string): void {
    if (element.dataset['motionPrepared'] === 'true') return;
    element.dataset['motionPrepared'] = 'true';
    element.classList.add(`motion-${variant}`);
    this.motion.observe(element);
  }

  private collect(root: HTMLElement, selector: string): HTMLElement[] {
    const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));
    return root.matches(selector) ? [root, ...matches] : matches;
  }
}
