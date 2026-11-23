(() => {
  const canvas = document.querySelector('.capability-wave');
  const context = canvas.getContext('2d');
  if (!context) return;
  const section = canvas.closest('section');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const camera = .62;
  const near = .35;
  const far = 3.4;
  const pointer = { x: 0, z: 1.4, amount: 0, target: null };
  const rings = [];
  let width = 0, height = 0, horizontal = 1, vertical = 1, horizon = 0;
  let mesh = [], frame = 0, last = 0, elapsed = 0, visible = false;
  let blue, cyan;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio, 2, Math.sqrt(8000000 / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    horizontal = width * .55;
    vertical = height * .89;
    horizon = height * .08;
    const colors = getComputedStyle(section);
    blue = colors.getPropertyValue('--ability-blue');
    cyan = colors.getPropertyValue('--ability-cyan');
    const columns = Math.round(Math.min(150, Math.max(56, width / 9)));
    const rows = Math.round(Math.min(68, Math.max(38, height / 5.4)));
    const halfSpan = width / 2 / horizontal * far * 1.05;
    mesh = Array.from({ length: rows }, (_, row) => {
      const z = far * (near / far) ** (row / (rows - 1));
      const fog = (1 - (z - near) / (far - near)) ** 1.25;
      const size = Math.max(.8, Math.min(3.2, 2.3 / z));
      const dots = [];
      for (let column = 0; column < columns; column++) {
        const x = -halfSpan + 2 * halfSpan * column / (columns - 1);
        const screenX = width / 2 + x / z * horizontal;
        if (screenX >= -4 && screenX <= width + 4) dots.push({ x, screenX });
      }
      return { z, fog, size, dots };
    });
    draw(motion.matches ? 3 : elapsed);
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    while (rings.length && time - rings[0].start > 5) rings.shift();
    const target = pointer.target;
    if (target) {
      pointer.x += (target.x - pointer.x) * .1;
      pointer.z += (target.z - pointer.z) * .1;
    }
    pointer.amount += ((target ? 1 : 0) - pointer.amount) * .06;
    for (const { z, fog, size, dots } of mesh) {
      for (const { x, screenX } of dots) {
        let rise = .085 * Math.sin(x * 2.2 + time * .7)
          + .07 * Math.sin(z * 2.9 - time * .9 + x * .8)
          + .03 * Math.sin((x + z) * 6.1 + time * 1.6);
        if (pointer.amount > .01) {
          const distance = (x - pointer.x) ** 2 + (z - pointer.z) ** 2;
          rise += .24 * pointer.amount * Math.exp(-distance / .07);
        }
        for (const ring of rings) {
          const age = time - ring.start;
          const distance = Math.hypot(x - ring.x, z - ring.z);
          rise += .2 * Math.exp(-((distance - age * 1.15) ** 2) / .014 - age * .75);
        }
        const screenY = horizon + (camera - rise) / z * vertical;
        if (screenY > height + 4 || screenY < 0) continue;
        const crest = rise > .12;
        context.fillStyle = crest ? cyan : blue;
        context.globalAlpha = crest ? .2 + fog * .8 : .12 + fog * .85;
        const dot = crest ? size * 1.15 : size;
        context.fillRect(screenX - dot / 2, screenY - dot / 2, dot, dot);
      }
    }
    context.globalAlpha = 1;
  }

  function step(now) {
    if (!last) last = now;
    const delta = now - last;
    if (delta >= 1000 / 40) {
      elapsed += Math.min(delta, 70) / 1000;
      last = now;
      draw(elapsed);
    }
    frame = requestAnimationFrame(step);
  }

  function sync() {
    if (visible && !motion.matches && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (motion.matches) {
        pointer.target = null;
        pointer.amount = 0;
        rings.length = 0;
        draw(3);
      }
    }
  }

  function ground(event) {
    if (motion.matches || !width || !height) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    if (x < 0 || x > width || y > height || y <= horizon + 4) return null;
    const z = Math.max(near, Math.min(far, camera * vertical / (y - horizon)));
    return { x: (x - width / 2) * z / horizontal, z };
  }

  section.addEventListener('pointermove', event => {
    pointer.target = event.pointerType !== 'touch' ? ground(event) : null;
    if (pointer.target && pointer.amount < .05) {
      pointer.x = pointer.target.x;
      pointer.z = pointer.target.z;
    }
  }, { passive: true });
  section.addEventListener('pointerleave', () => { pointer.target = null; });
  section.addEventListener('pointerdown', event => {
    if (event.target.closest('a,button')) return;
    const point = ground(event);
    if (!point) return;
    if (rings.length >= 8) rings.shift();
    rings.push({ ...point, start: elapsed });
  }, { passive: true });

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  window.watchPortfolioMedia(motion, sync);
})();
