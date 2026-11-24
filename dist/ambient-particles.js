(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cycle = Math.PI * 2;

  function mount(canvas, createScene, fps) {
    const context = canvas.getContext('2d');
    if (!context) return;
    let scene, frame = 0, visible = false, previous = 0, time = 0;
    function resize() {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio, 2, Math.sqrt(8000000 / (width * height)));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      scene = createScene(context, width, height);
      scene(time);
    }
    function step(timestamp) {
      if (!previous) previous = timestamp;
      const delta = timestamp - previous;
      if (delta >= 1000 / fps) {
        previous = timestamp;
        time += Math.min(delta, 100) / 1000;
        scene?.(time);
      }
      frame = requestAnimationFrame(step);
    }
    function sync() {
      if (visible && !reduced.matches && !document.hidden) {
        if (!frame) frame = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      }
    }
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(canvas);
    window.watchPortfolioMedia(reduced, sync);
    document.addEventListener('visibilitychange', sync);
  }

  document.querySelectorAll('.title-sparkles canvas').forEach(canvas => {
    mount(canvas, (context, width, height) => {
      const particles = Array.from({ length: Math.round(width / 2.5) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: .35 + Math.random() * .65,
        phase: Math.random() * cycle,
        speed: 1 + Math.random() * 3,
      }));
      return time => {
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#fff';
        for (const particle of particles) {
          const fade = Math.max(0, 1 - Math.hypot(2 * particle.x / width - 1, particle.y / height));
          context.globalAlpha = fade * (.2 + .8 * (.5 + .5 * Math.sin(time * particle.speed + particle.phase)));
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius, 0, cycle);
          context.fill();
        }
        context.globalAlpha = 1;
      };
    }, 30);
  });

  mount(document.querySelector('.hero-pixel-stars'), (context, width, height) => {
    const size = width < 600 ? 5 : 6;
    const colors = ['#FFFFFF', '#95caff', '#aaaaff', '#ccadff', '#aaffff'];
    const stars = Array.from({ length: Math.round(width * height * .00010) }, () => ({
      x: Math.floor(Math.random() * width / size) * size,
      y: Math.floor(Math.random() * height / size) * size,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random(),
      period: 2 + Math.random() * 2,
      opacity: .20 + Math.random() * .49,
      twinkles: Math.random() < .7,
    }));
    const meteors = Array.from({ length: 3 }, () => ({
      start: width * (.2 + Math.random() * .6),
      direction: (45 + Math.random() * 90) * Math.PI / 180,
      speed: 175 + Math.random() * 95,
    }));
    return time => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const dim = star.twinkles && ((time / star.period + star.phase) % 1) > .5;
        context.fillStyle = star.color;
        context.globalAlpha = star.opacity * (dim ? .30 : 1);
        context.fillRect(star.x, star.y, size, size);
      }
      if (!reduced.matches && time > 2) {
        const elapsed = time - 2, local = elapsed % 7.5;
        const meteor = meteors[Math.floor(elapsed / 7.5) % meteors.length];
        const horizontal = Math.cos(meteor.direction) * meteor.speed;
        const vertical = Math.sin(meteor.direction) * meteor.speed;
        context.fillStyle = '#b4f2ff';
        for (let index = 13; index >= 0; index -= 1) {
          const age = local - index * .044;
          if (age < 0) continue;
          context.globalAlpha = (1 - index / 14) * .8;
          context.fillRect(meteor.start + horizontal * age, vertical * age, index ? 3 : 7, index ? 3 : 4);
        }
      }
      context.globalAlpha = 1;
    };
  }, 16);

  mount(document.querySelector('.contact-particle-globe'), (context, width, height) => {
    const count = 900;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const globe = Array.from({ length: count }, (_, index) => {
      const y = 1 - 2 * index / (count - 1);
      const radius = Math.sqrt(1 - y * y);
      return [Math.cos(goldenAngle * index) * radius, y, Math.sin(goldenAngle * index) * radius];
    });
    const radius = Math.min(width, height) * .46;
    const glassColors = getComputedStyle(context.canvas);
    const spectrum = context.createLinearGradient(width * .05, 0, width * .95, 0);
    spectrum.addColorStop(0, glassColors.getPropertyValue('--glass-cyan').trim() || '#24d1ee');
    spectrum.addColorStop(.46, '#b8efff');
    spectrum.addColorStop(1, glassColors.getPropertyValue('--glass-blue').trim() || '#3479f7');
    return time => {
      const angle = time * cycle / 42;
      const sine = Math.sin(angle), cosine = Math.cos(angle);
      context.clearRect(0, 0, width, height);
      globe.forEach(([x, y, z], index) => {
        const depth = x * sine + z * cosine;
        const perspective = 2.6 / (2.6 - depth);
        const light = (depth + 1) / 2;
        context.fillStyle = index % 9 === 0 ? '#d4f7ff' : spectrum;
        context.globalAlpha = .1 + .7 * light;
        context.beginPath();
        context.arc(width / 2 + (x * cosine - z * sine) * radius * perspective, height / 2 + y * radius * perspective, .45 + 1.15 * light, 0, cycle);
        context.fill();
      });
      context.globalAlpha = 1;
    };
  }, 60);
})();
