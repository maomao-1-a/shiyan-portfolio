(() => {
  const canvas = document.querySelector('.career-hands');
  const context = canvas.getContext('2d');
  const sources = globalThis.kindredHandTiles;
  delete globalThis.kindredHandTiles;
  if (!context || !sources) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const cycle = Math.PI * 2;
  const loop = 20;
  const levels = [0, .26, .52, .78, 1];
  const fields = Array.from({ length: 2 }, () => document.createElement('canvas').getContext('2d', { willReadFrequently: true }));
  let width = 0, height = 0, step = 0, rowStep = 0, columns = 0, rows = 0;
  let seeds = [], tiles = [], colors, frame = 0, last = 0, elapsed = 0, visible = false;

  function hash(first, second) {
    const value = Math.sin(first * 127.1 + second * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function smooth(from, to, input) {
    const value = Math.max(0, Math.min(1, (input - from) / (to - from)));
    return value * value * (3 - 2 * value);
  }

  function getPose(time, start, end) {
    return smooth(start, start + 1.6, time) * (1 - smooth(end, end + 1.6, time));
  }

  function sampleField(field, pose, phase) {
    field.setTransform(1, 0, 0, 1, 0, 0);
    field.fillStyle = '#fff';
    field.fillRect(0, 0, columns, rows);
    const portrait = height > width;
    const handWidth = Math.min(width * (portrait ? .66 : .53), height * 1.24);
    const middleY = height * (portrait ? .66 : .54);
    for (const side of [0, 1]) {
      const tile = tiles[pose * 2 + side];
      const angle = phase + side * Math.PI;
      const reach = width * (.035 * Math.sin(angle) + .012 * Math.sin(2 * phase + 1.3 + side * Math.PI));
      const breath = 1 + .07 * Math.sin(angle + .9);
      const roll = (side ? -1 : 1) * .045 * Math.sin(angle + 2.1);
      const pivot = side ? width : 0;
      const left = side ? width - handWidth + width * .045 - reach : reach - width * .045;
      const handHeight = handWidth * tile.naturalHeight / tile.naturalWidth;
      field.setTransform(columns / width, 0, 0, rows / height, 0, 0);
      field.translate(pivot, middleY);
      field.rotate(roll);
      field.scale(breath, breath);
      field.translate(-pivot, -middleY);
      field.drawImage(tile, left, middleY - handHeight / 2, handWidth, handHeight);
    }
    return field.getImageData(0, 0, columns, rows).data;
  }

  function draw(seconds) {
    if (!tiles.length || !width || !height) return;
    const time = seconds % loop;
    const tick = Math.floor(time * 7);
    const samples = fields.map((field, pose) => sampleField(field, pose, cycle * time / loop));
    const leftMix = getPose(time, 6.2, 14.6), rightMix = getPose(time, 2.4, 10.4);
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors;
    context.beginPath();
    for (let row = 0; row < rows; row++) {
      const y = (row + .5) * rowStep;
      const shift = hash(row, tick) > .965 ? Math.round((hash(tick, row) - .5) * 8) : 0;
      for (let column = 0; column < columns; column++) {
        const mix = column < columns / 2 ? leftMix : rightMix;
        const seed = seeds[row * columns + column];
        const field = samples[seed < mix ? 1 : 0];
        const lookup = Math.min(columns - 1, Math.max(0, column - shift));
        const luminance = field[(row * columns + lookup) * 4] / 255;
        let value = Math.max(0, Math.min(1, (1 - luminance - .16) / .42));
        if (!value) continue;
        if (mix > .001 && mix < .999 && Math.abs(seed - mix) < .12) {
          value *= Math.abs(seed - mix) / .12;
          if (hash(column + tick, row) <= .4) value *= .3;
        }
        const fromCenter = Math.abs((column + .5) / columns - .5);
        value *= (.86 + .14 * Math.sin(time * 3.2 + seed * 40)) * smooth(.035, .11, fromCenter);
        let level = levels.length - 1;
        while (level && value < levels[level] - .13) level -= 1;
        if (!level) continue;
        const radius = step * .46 * (level === 1 ? .38 : levels[level]);
        const x = (column + .5) * step;
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, cycle);
      }
    }
    context.fill();
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio, 2, Math.sqrt(10000000 / (width * height)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    step = Math.max(5, width / 205);
    rowStep = step * 2.05;
    columns = Math.ceil(width / step);
    rows = Math.ceil(height / rowStep);
    fields.forEach(field => {
      field.canvas.width = columns;
      field.canvas.height = rows;
      field.imageSmoothingQuality = 'high';
    });
    seeds = Float32Array.from({ length: columns * rows }, (_, index) => {
      const row = Math.floor(index / columns);
      return .55 * hash(index % columns, row) + .45 * hash(row * 3.1, 7.7);
    });
    const styles = getComputedStyle(canvas);
    colors = context.createLinearGradient(0, 0, width, height * .22);
    for (const [offset, name] of [[0, 'cyan'], [.53, 'blue'], [1, 'violet']]) {
      colors.addColorStop(offset, styles.getPropertyValue(`--ability-${name}`).trim());
    }
    draw(motion.matches ? 0 : elapsed);
  }

  function animate(now) {
    if (!last) last = now;
    if (now - last >= 1000 / 36) {
      elapsed += Math.min(now - last, 80) / 1000;
      last = now;
      draw(elapsed);
    }
    frame = requestAnimationFrame(animate);
  }

  function sync() {
    if (visible && !motion.matches && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (motion.matches) draw(0);
    }
  }

  Promise.all(sources.map(source => {
    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  })).then(loaded => {
    tiles = loaded;
    resize();
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(canvas);
    window.watchPortfolioMedia(motion, sync);
    document.addEventListener('visibilitychange', sync);
  }).catch(error => console.warn('Career hand artwork unavailable:', error));
})();
