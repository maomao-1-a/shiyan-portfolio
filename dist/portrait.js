const hero = document.querySelector('#home');
const canvas = document.querySelector('#portrait');
const loader = hero.querySelector('.portrait-loader');
const lightSprite = hero.querySelector('.portrait-light');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pointCount = 66000;
const ring = Array.from({ length: 96 }, (_, index) => {
  const angle = index / 96 * Math.PI * 2 - Math.PI / 2;
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.style.setProperty('--ring-tone', `${50 * (1 + Math.cos(angle))}%`);
  for (const [name, value] of Object.entries({ cx: 92 * Math.cos(angle), cy: 92 * Math.sin(angle), r: 1.6 })) dot.setAttribute(name, value);
  loader.querySelector('svg').append(dot);
  return dot;
});

function progress(fraction) {
  const percent = Math.round(fraction * 100);
  loader.setAttribute('aria-valuenow', percent);
  ring.forEach((dot, index) => dot.classList.toggle('on', index / 96 < fraction));
}

async function modelBytes() {
  if (location.protocol === 'file:') {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/portrait-local.js';
      script.onload = () => {
        const model = globalThis.localPortraitModel;
        delete globalThis.localPortraitModel;
        script.remove();
        if (typeof model !== 'string') {
          reject(Error('Local portrait data missing'));
          return;
        }
        resolve(Uint8Array.from(atob(model), character => character.charCodeAt(0)).buffer);
      };
      script.onerror = () => reject(Error('Local portrait asset unavailable'));
      document.head.append(script);
    });
  }
  const response = await fetch('assets/portrait.glb');
  if (!response.ok) throw Error('Model unavailable');
  const size = Number(response.headers.get('Content-Length'));
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    progress(Math.min(.99, received / (size || 1500000)));
  }
  return new Blob(chunks).arrayBuffer();
}

function sampleModel(buffer) {
  const header = new DataView(buffer);
  const jsonLength = header.getUint32(12, true);
  const model = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  const mesh = model.meshes[0].primitives[0];
  const read = (index, Type, width) => {
    const accessor = model.accessors[index];
    return new Type(buffer, 28 + jsonLength + (model.bufferViews[accessor.bufferView].byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * width);
  };
  const positions = read(mesh.attributes.POSITION, Float32Array, 3);
  const normals = read(mesh.attributes.NORMAL, Float32Array, 3);
  const indices = read(mesh.indices, Uint16Array, 1);
  const distribution = new Float64Array(indices.length / 3);
  let area = 0;
  for (let face = 0; face < distribution.length; face++) {
    const [first, second, third] = indices.subarray(face * 3, face * 3 + 3);
    const firstOffset = first * 3, secondOffset = second * 3, thirdOffset = third * 3;
    const along = [0, 1, 2].map(axis => positions[secondOffset + axis] - positions[firstOffset + axis]);
    const across = [0, 1, 2].map(axis => positions[thirdOffset + axis] - positions[firstOffset + axis]);
    area += Math.hypot(along[1] * across[2] - along[2] * across[1], along[2] * across[0] - along[0] * across[2], along[0] * across[1] - along[1] * across[0]);
    distribution[face] = area;
  }
  const points = new Float32Array((pointCount + 900) * 8);
  const front = positions.reduce((max, value, index) => index % 3 === 2 && Math.abs(positions[index - 2]) < .08 && positions[index - 1] > .29 && positions[index - 1] < .38 ? Math.max(max, value) : max, .20) + .035;
  for (let index = 0; index < pointCount + 900; index++) {
    const offset = index * 8;
    const rand = Math.random();
    if (index >= pointCount) {
      points.set([(Math.random() - .5) * 18, (Math.random() - .5) * 12, -6 + Math.random() * 8, 0, 0, 1, rand, 3], offset);
    } else if (index < 2900) {
      const x = (Math.random() - .5) * .43;
      const top = .378 - .022 * (x / .215) ** 2;
      const bottom = .282 + .032 * Math.exp(-(x * x) / (.034 * .034)) + .026 * (x / .215) ** 4;
      const y = index < 950 ? top - rand * .015 : index < 1350 ? bottom + rand * .004 : bottom + rand * (top - bottom);
      points.set([x * 2.8, y * 2.8 - .68, (front - 2.4 * x * x) * 2.8, 4.8 * x, 0, 1, rand, 2], offset);
    } else {
      const target = Math.random() * area;
      let lower = 0, upper = distribution.length - 1;
      while (lower < upper) {
        const middle = (lower + upper) >> 1;
        if (target > distribution[middle]) lower = middle + 1;
        else upper = middle;
      }
      const corners = Array.from(indices.subarray(lower * 3, lower * 3 + 3), vertex => vertex * 3);
      const root = Math.sqrt(Math.random()), split = Math.random();
      const weights = [1 - root, root * (1 - split), root * split];
      const interpolate = (array, axis) => corners.reduce((sum, corner, item) => sum + array[corner + axis] * weights[item], 0);
      const x = interpolate(positions, 0), y = interpolate(positions, 1), z = interpolate(positions, 2);
      points.set([x * 2.8, y * 2.8 - .68, z * 2.8, interpolate(normals, 0), interpolate(normals, 1), interpolate(normals, 2), rand, x > .13 && y > .6 && (x - .02) ** 2 + (z + .06) ** 2 > .035 ? 1 : 0], offset);
    }
  }
  return points;
}

const vertexShader = `
attribute vec3 home, normal;
attribute float seed, part;
uniform vec2 viewport, head;
uniform vec3 light;
uniform float time, assembly, pixelRatio, distanceToCamera, shine, glint;
varying mediump vec3 ink;
varying mediump float brightness;
vec3 glassColor(float x){
  vec3 cyan=vec3(.19,.96,1.);
  vec3 blue=vec3(.22,.56,1.);
  vec3 violet=vec3(.70,.39,1.);
  return mix(mix(cyan,blue,smoothstep(-1.65,0.,x)),violet,smoothstep(0.,1.65,x));
}
void main(){
  vec3 point=home;
  vec3 norm=normalize(normal);
  float influence=smoothstep(-1.3,-.6,point.y);
  float yaw=head.x*(.25+.75*influence), pitch=head.y*influence;
  mat3 turn=mat3(cos(yaw),0.,-sin(yaw),0.,1.,0.,sin(yaw),0.,cos(yaw))*mat3(1.,0.,0.,0.,cos(pitch),sin(pitch),0.,-sin(pitch),cos(pitch));
  point=turn*(point+vec3(0.,1.,0.))-vec3(0.,1.,0.);
  norm=turn*norm;
  point+=norm*sin(time*1.4+seed*60.)*.004;
  float band=point.y-point.x*.5-shine;
  float sweep=exp(-4.*band*band);
  float flash=part>0.5 && part<2.5 ? 1.-smoothstep(0.,.12,abs(home.x-glint)) : 0.;
  vec3 toward=light-point;
  brightness=.24+.34*max(dot(norm,normalize(vec3(-.5,.6,.7))),0.)+1.4*max(dot(norm,normalize(toward)),0.)/(1.+dot(toward,toward)*.32);
  brightness*=mix(.48,1.,smoothstep(-.35,.3,norm.z))*(.65+seed*.55);
  brightness+=sweep*1.1+flash;
  ink=mix(glassColor(home.x),vec3(.50,.81,1.),part>1.5 ? .35 : flash*.35);
  ink=mix(ink,vec3(.63,.88,1.),sweep*.4);
  float ratio=.267949;
  float ringRadius=184.*distanceToCamera*ratio/viewport.y;
  float warmup=clamp((assembly-seed*.45)/.55,0.,1.);
  float ease=warmup<.5?4.*warmup*warmup*warmup:1.-pow(2.-2.*warmup,3.)*.5;
  vec3 origin=vec3(cos(seed*6.283),sin(seed*6.283),0.)*ringRadius+vec3(0.,-.15,0.);
  point.y+=.53;
  point=mix(origin,point,ease)+vec3(sin(seed*40.),cos(seed*31.),1.8)*sin(ease*3.14159)*.45;
  float size=26.*(.45+seed*seed*1.3)*(1.+sweep*.6);
  if(part>2.5){
    point=home;
    point.y=mod(point.y+6.+time*(.03+seed*.05),12.)-6.;
    point.x+=sin(time*.2+seed*40.)*.15;
    ink=glassColor(home.x*.25);
    brightness=(.1+seed*.18)*assembly;
    size=22.*(.5+seed);
  }
  float depth=distanceToCamera-point.z;
  gl_Position=vec4(point.x/(ratio*viewport.x/viewport.y),(point.y+.15)/ratio,depth-.1,depth);
  gl_PointSize=max(1.,size*pixelRatio/depth);
}`;

async function playPortrait() {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
  if (!gl) throw Error('WebGL unavailable');
  canvas.addEventListener('webglcontextlost', showPortraitFallback);
  const points = sampleModel(await modelBytes());
  const program = gl.createProgram();
  const fragment = `precision mediump float; varying vec3 ink; varying float brightness; void main(){float radius=length(gl_PointCoord-.5);if(radius>.5)discard;float glow=exp(-16.*radius*radius)*brightness;gl_FragColor=vec4(ink*glow,glow);}`;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
  for (const [name, size, offset] of [['home',3,0], ['normal',3,12], ['seed',1,24], ['part',1,28]]) {
    const attribute = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 32, offset);
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  const uniforms = Object.fromEntries('viewport head light time assembly pixelRatio distanceToCamera shine glint'.split(' ').map(name => [name, gl.getUniformLocation(program, name)]));
  progress(1);
  if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 380));
  let pointer = null, visible = true, past = performance.now(), elapsed = 0;
  let turnX = 0, turnY = 0, lightX = -1.4, lightY = 1.2;
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    pointer = [2 * (event.clientX - bounds.left) / bounds.width - 1, 1 - 2 * (event.clientY - bounds.top) / bounds.height];
  });
  hero.addEventListener('pointerleave', () => { pointer = null; });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);
  function frame(now) {
    if (gl.isContextLost()) return;
    requestAnimationFrame(frame);
    const delta = Math.min(.05, (now - past) / 1000);
    past = now;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!visible || !width || !height) return;
    const still = reducedMotion.matches;
    if (!still) elapsed += delta;
    const time = still ? 0 : elapsed;
    const assembly = still ? 1 : Math.min(1, time / 2.6);
    if (assembly > 0 && !hero.dataset.phase) {
      hero.dataset.phase = 'assembling';
      loader.setAttribute('aria-hidden', 'true');
    }
    if (assembly === 1 && hero.dataset.phase !== 'ready') hero.dataset.phase = 'ready';
    const ratio = Math.min(devicePixelRatio, 2, Math.sqrt(10000000 / (width * height)));
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const mobile = width <= 700;
    const distance = Math.max((mobile ? 3.1 : 3.0) / .267949, 2.15 / (.267949 * width / height));
    const smooth = 1 - Math.exp(-delta * 3);
    turnX += ((pointer ? pointer[0] * .34 : .17 * Math.sin(time * .45)) - turnX) * smooth;
    turnY += ((pointer ? -pointer[1] * .14 : .07 * Math.cos(time * .33)) - turnY) * smooth;
    const lightTargetX = pointer ? pointer[0] * (distance - 2.6) * .267949 * width / height : 1.9 * Math.sin(time * .45);
    const lightTargetY = pointer ? pointer[1] * (distance - 2.6) * .267949 : .5 + .8 * Math.cos(time * .33);
    lightX += (lightTargetX - lightX) * (still ? 1 : smooth);
    lightY += (lightTargetY - lightY) * (still ? 1 : smooth);
    lightSprite.hidden = !pointer || assembly < .55 || still;
    if (!lightSprite.hidden) {
      const scale = (distance - 2.6) * .267949;
      const spriteX = (1 + lightX / (scale * width / height)) * width / 2;
      const spriteY = (1 - lightY / scale) * height / 2;
      lightSprite.style.transform = `translate3d(${spriteX - 48}px,${spriteY - 48}px,0)`;
    }
    const scan = (time - 2.34) / 2.2;
    const glint = (time - 4.6) % 4.2;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.viewport, width, height);
    gl.uniform2f(uniforms.head, still ? 0 : turnX, still ? 0 : turnY);
    gl.uniform3f(uniforms.light, lightX, lightY, 2.6);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.assembly, assembly);
    gl.uniform1f(uniforms.pixelRatio, ratio);
    gl.uniform1f(uniforms.distanceToCamera, distance);
    gl.uniform1f(uniforms.shine, scan > 0 && scan < 1 ? 2.8 - (1 - (1 - scan) ** 2) * 7.4 : 99);
    gl.uniform1f(uniforms.glint, time >= 4.6 && glint < .9 ? -.8 + glint * 2.1 : -9);
    gl.drawArrays(gl.POINTS, 0, points.length / 8);
  }
  requestAnimationFrame(frame);
}

function showPortraitFallback() {
  hero.dataset.phase = 'error';
  loader.hidden = true;
}

playPortrait().catch(error => {
  console.warn('Using the static portrait:', error);
  showPortraitFallback();
});
