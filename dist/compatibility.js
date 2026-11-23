(() => {
  const css = window.CSS;
  const canCurve = css && css.supports('width', '1cqw') &&
    css.supports('container-type', 'inline-size') && css.supports('selector(:has(*))');
  if (!canCurve) document.documentElement.classList.add('flat-cases');

  window.watchPortfolioMedia = (media, handler) => {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', handler);
    else if (typeof media.addListener === 'function') media.addListener(handler);
  };

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.targets = new Set();
        this.update = () => this.callback([...this.targets].map(target => ({ target })));
        window.addEventListener('resize', this.update);
        window.addEventListener('hashchange', this.update);
      }

      observe(target) {
        this.targets.add(target);
        requestAnimationFrame(this.update);
      }

      disconnect() {
        this.targets.clear();
        window.removeEventListener('resize', this.update);
        window.removeEventListener('hashchange', this.update);
      }
    };
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.targets = new Map();
        this.update = () => {
          if (this.frame) return;
          this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            const entries = [];
            this.targets.forEach((previous, target) => {
              const bounds = target.getBoundingClientRect();
              const width = Math.min(bounds.right, innerWidth) - Math.max(bounds.left, 0);
              const height = Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0);
              const ratio = width > 0 && height > 0 ? (width * height) / (bounds.width * bounds.height) : 0;
              if (previous !== ratio) entries.push({ target, isIntersecting: ratio > 0, intersectionRatio: ratio });
              this.targets.set(target, ratio);
            });
            if (entries.length) this.callback(entries);
          });
        };
        window.addEventListener('scroll', this.update, { passive: true });
        window.addEventListener('resize', this.update);
        window.addEventListener('hashchange', this.update);
      }

      observe(target) {
        this.targets.set(target, -1);
        this.update();
      }

      disconnect() {
        this.targets.clear();
        cancelAnimationFrame(this.frame);
        window.removeEventListener('scroll', this.update);
        window.removeEventListener('resize', this.update);
        window.removeEventListener('hashchange', this.update);
      }
    };
  }

  document.addEventListener('error', event => {
    const image = event.target;
    if (image.tagName !== 'IMG') return;
    const match = image.getAttribute('src')?.match(/^assets\/cases\/(p-\d+)\.webp$/);
    if (match) image.src = `assets/${match[1]}.jpg`;
  }, true);
})();
