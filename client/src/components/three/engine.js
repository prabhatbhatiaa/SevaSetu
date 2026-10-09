import * as THREE from 'three';

/*
 * The small engine every SevaSetu scene is built on.
 *
 * All scenes are made of the same thing — points (and a few hairlines) of
 * light — drawn by one shader, in one palette, so separate scenes on the page
 * read as one family. A scene module only describes geometry and motion:
 *
 *   export default function setup({ scene, camera, material }) {
 *     ...add objects to `scene`...
 *     return { update({ time, delta, pointer, input, shownFor, aspect, reduced }) { ... } };
 *   }
 *
 * `mountScene` owns everything else: the renderer, sizing, theme changes,
 * pausing off-screen, reduced motion, resolution scaling and cleanup.
 */

/** Colour slots. Points pick one with their `kind`. */
export const KIND = { ink: 0, warm: 1, cool: 2, accent: 3 };

const PALETTES = {
  dark: ['#f4f1ea', '#e9cfae', '#c5c9d1', '#f0a23b'],
  light: ['#1f1c18', '#8a6a44', '#4f5560', '#c4700a'],
};

const VERTEX_SHADER = /* glsl */ `
  attribute float aKind;   // palette slot
  attribute float aShade;  // 0–1 brightness
  attribute float aSize;
  attribute float aSeed;   // 0–1, per point (or per group)
  attribute float aSpan;   // 0–1 along a path; -1 if not on one
  attribute vec3 aFrom;    // where the point starts before it settles

  uniform float uTime;
  uniform float uScale;
  uniform float uOpacity;
  uniform float uLight;    // 1 on the light theme
  uniform float uMorph;    // 0 = at aFrom, 1 = settled
  uniform float uPulse;    // strength of the light travelling along paths
  uniform float uTrail;    // paths are lit up to this span (-1 = off)
  uniform float uMaxSize;
  uniform vec3 uPalette[4];

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Points settle at slightly different moments.
    float delay = aSeed * 0.4;
    float settled = smoothstep(delay, delay + 0.6, uMorph);
    vec4 view = modelViewMatrix * vec4(mix(aFrom, position, settled), 1.0);

    float onPath = step(0.0, aSpan);
    float pulse = smoothstep(0.12, 0.0, fract(aSpan - uTime * 0.06)) * uPulse * onPath * settled;
    float trail = uTrail >= 0.0 ? step(aSpan, uTrail) * onPath : 0.0;
    float glow = max(pulse * 0.6, trail);

    vec3 base = uPalette[int(aKind + 0.5)];
    float twinkle = 0.86 + 0.14 * sin(uTime * 1.4 + aSeed * 6.2831);
    vec3 color = uLight > 0.5 ? base : base * aShade * twinkle;
    vColor = mix(color, uPalette[3], glow);

    float alpha = uLight > 0.5 ? mix(0.18, 0.85, aShade) : 0.9;
    // Zero-size points are hidden outright (the size clamp would leave a 1px dot).
    vAlpha = max(alpha, glow * 0.9) * uOpacity * step(0.0001, aSize);

    float size = aSize * (uLight > 0.5 ? 0.85 : 1.0) * (1.0 + glow * 0.5);
    gl_PointSize = clamp(size * uScale / -view.z, 1.0, uMaxSize);
    gl_Position = projectionMatrix * view;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsPoints;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float shape = 1.0;
    if (uIsPoints > 0.5) shape = smoothstep(0.5, 0.36, length(gl_PointCoord - 0.5));
    float alpha = shape * vAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function createMaterial({ points = true, pulse = 0, maxSize = 9 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1000 },
      uOpacity: { value: 1 },
      uLight: { value: 0 },
      uMorph: { value: 1 },
      uPulse: { value: pulse },
      uTrail: { value: -1 },
      uMaxSize: { value: maxSize },
      uIsPoints: { value: points ? 1 : 0 },
      uPalette: { value: PALETTES.dark.map((hex) => new THREE.Color(hex)) },
    },
  });
}

/** Collects points with their attributes, then turns them into geometry. */
export class Cloud {
  positions = [];
  from = [];
  kinds = [];
  shades = [];
  sizes = [];
  spans = [];
  seeds = [];

  add(x, y, z, { kind = KIND.ink, shade = 1, size = 0.06, span = -1, from = null, seed = Math.random() } = {}) {
    this.positions.push(x, y, z);
    this.from.push(...(from ?? [x, y, z]));
    this.kinds.push(kind);
    this.shades.push(shade);
    this.sizes.push(size);
    this.spans.push(span);
    this.seeds.push(seed);
    return this;
  }

  get count() {
    return this.kinds.length;
  }

  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('aFrom', new THREE.Float32BufferAttribute(this.from, 3));
    geometry.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kinds, 1));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shades, 1));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aSpan', new THREE.Float32BufferAttribute(this.spans, 1));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(this.seeds, 1));
    return geometry;
  }
}

/** Deterministic random numbers, so layouts look the same on every visit. */
export function seededRandom(seed = 1) {
  let state = seed;
  return (min = 0, max = 1) => {
    state = (state * 16807) % 2147483647;
    return min + ((state - 1) / 2147483646) * (max - min);
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (value) => Math.min(1, Math.max(0, value));
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);

/** A perspective dot-grid "ground" that fades out towards its edges. */
export function addFloor(cloud, { y = 0, halfX = 14, halfZ = 9, step = 0.9, shade = 0.32 } = {}) {
  for (let x = -halfX; x <= halfX + 0.001; x += step) {
    for (let z = -halfZ; z <= halfZ + 0.001; z += step) {
      const fade = 1 - Math.min(1, Math.hypot(x / halfX, z / halfZ));
      if (fade <= 0.02) continue;
      cloud.add(x, y, z, { shade: shade * fade, size: 0.045 });
    }
  }
  return cloud;
}

/** A sparse field of faint dust behind a scene. */
export function addDust(cloud, { count = 220, spread = [24, 10, 16], random = Math.random } = {}) {
  for (let i = 0; i < count; i += 1) {
    const x = (random() - 0.5) * 2 * spread[0];
    const y = (random() - 0.5) * 2 * spread[1];
    const z = -spread[2] * random();
    cloud.add(x, y, z, { shade: 0.12 + random() * 0.25, size: 0.03 + random() * 0.04 });
  }
  return cloud;
}

const right = new THREE.Vector3();
const up = new THREE.Vector3();

/**
 * Points the camera at `target` from the given angle, at the distance where an
 * object of `halfWidth` × `halfHeight` fills `fill` of the view, then pans so
 * that the target appears at (x, y) — fractions of the viewport, 0.5 = centre.
 * Works from the viewport's aspect ratio, so nothing is cropped on phones.
 */
export function frameCamera(
  camera,
  { target = [0, 0, 0], halfWidth = 5, halfHeight = 3, fill = 0.85, x = 0.5, y = 0.5, pitch = 0.2, yaw = 0 },
) {
  const tanV = Math.tan((camera.fov * Math.PI) / 360);
  const tanH = tanV * camera.aspect;
  const distance = Math.max(halfWidth / (fill * tanH), halfHeight / (fill * tanV));

  camera.position.set(
    target[0] + Math.sin(yaw) * Math.cos(pitch) * distance,
    target[1] + Math.sin(pitch) * distance,
    target[2] + Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateMatrixWorld();

  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  camera.position
    .addScaledVector(right, (0.5 - x) * 2 * distance * tanH)
    .addScaledVector(up, (y - 0.5) * 2 * distance * tanV);
  camera.updateMatrixWorld();
}

/**
 * Creates the renderer inside `container`, runs `setup`, and drives it.
 * `getInput()` returns whatever the React side passes in (e.g. progress).
 * Returns a cleanup function.
 */
export function mountScene(container, setup, getInput = () => ({})) {
  let renderer;
  try {
    // No MSAA: every point already has a soft, anti-aliased edge from the shader.
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return () => {}; // No WebGL: the section simply shows its background.
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
  const materials = [];
  const material = (options) => {
    const created = createMaterial(options);
    materials.push(created);
    return created;
  };

  const api = setup({ scene, camera, material });
  scene.traverse((object) => {
    object.frustumCulled = false;
  });

  let dirty = true;

  const applyTheme = () => {
    const light = !document.documentElement.classList.contains('dark');
    const palette = PALETTES[light ? 'light' : 'dark'];
    materials.forEach((item) => {
      item.uniforms.uPalette.value.forEach((color, index) => color.set(palette[index]));
      item.uniforms.uLight.value = light ? 1 : 0;
      item.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      item.needsUpdate = true;
    });
    dirty = true;
  };
  applyTheme();
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  let aspect = 1;
  const resize = () => {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const scale = (height * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    materials.forEach((item) => {
      item.uniforms.uScale.value = scale;
    });
    dirty = true;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const handlePointer = (event) => {
    pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', handlePointer, { passive: true });

  let visible = false;
  let firstShownAt = null;
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && firstShownAt === null) firstShownAt = performance.now();
    dirty = true;
  });
  visibilityObserver.observe(container);

  let elapsed = reduced ? 4 : 0;
  let lastInput = null;
  let lastFrameAt = performance.now();
  let frame = 0;
  const budget = { time: 0, frames: 0 };

  const render = (delta) => {
    if (!reduced) elapsed += delta;
    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;
    const shownFor = firstShownAt === null ? 0 : (performance.now() - firstShownAt) / 1000;

    api.update({
      time: elapsed,
      delta: reduced ? 0 : delta,
      pointer: reduced ? { x: 0, y: 0 } : pointer,
      input: lastInput ?? {},
      shownFor: reduced ? 99 : shownFor,
      aspect,
      reduced,
    });
    materials.forEach((item) => {
      item.uniforms.uTime.value = elapsed;
    });
    renderer.render(scene, camera);
    dirty = false;
  };

  // If frames keep running long, drop resolution. Only ever steps down.
  const adaptResolution = (delta) => {
    budget.time += delta;
    budget.frames += 1;
    if (budget.time < 1) return;
    const average = budget.time / budget.frames;
    budget.time = 0;
    budget.frames = 0;
    if (average > 1 / 50 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
  };

  const loop = (now) => {
    frame = requestAnimationFrame(loop);
    const delta = Math.min(0.05, (now - lastFrameAt) / 1000);
    lastFrameAt = now;
    if (!visible || document.hidden) return;

    const input = getInput();
    if (input !== lastInput) {
      lastInput = input;
      dirty = true;
    }
    // With reduced motion, only redraw when something changed.
    if (reduced && !dirty) return;
    render(delta);
    if (!reduced) adaptResolution(delta);
  };
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    themeObserver.disconnect();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    window.removeEventListener('pointermove', handlePointer);
    scene.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
