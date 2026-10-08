import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

/*
 * The Setu — a bridge drawn in points of light.
 *
 * Two floating islands (people who need help, people who can give it) joined
 * by an arched bridge. Saffron packets cross it: each one a match being made.
 *
 * Every point also has a "scattered" position, so the whole structure can
 * dissolve into drifting fragments (help lost in group chats) and reassemble.
 * That morph, the travelling pulse and the colours all run on the GPU.
 *
 * Modes
 *   landing — fixed behind the landing page. The camera follows the page's
 *             `[data-act]` sections and blends between keyframes (ACTS below).
 *   ambient — fills its parent; a slow, self-contained loop for banners.
 */

const VERTEX_SHADER = /* glsl */ `
  attribute float aKind;     // index into uPalette
  attribute float aShade;    // 0–1 brightness variation
  attribute float aSize;
  attribute float aSpan;     // 0 → 1 along the bridge; -1 for everything else
  attribute float aSeed;
  attribute vec3 aScatter;   // where this point drifts to when scattered

  uniform float uTime;
  uniform float uScale;
  uniform float uPulse;
  uniform float uScatter;
  uniform float uFocus;      // highlighted position along the span, or -1
  uniform float uOpacity;
  uniform float uLight;      // 1 on the light theme
  uniform vec3 uPalette[6];

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Points leave (and return) at slightly different moments.
    float delay = aSeed * 0.45;
    float scatter = smoothstep(delay, delay + 0.55, uScatter);
    vec3 drift = vec3(
      sin(uTime * 0.35 + aSeed * 31.0),
      cos(uTime * 0.30 + aSeed * 17.0),
      sin(uTime * 0.27 + aSeed * 11.0)
    ) * 0.35 * scatter;
    vec3 point = mix(position, aScatter, scatter) + drift;
    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);

    // Only the bridge itself carries the pulse and the focus highlight.
    float onBridge = step(0.0, aSpan) * uPulse * (1.0 - scatter);
    float pulse = smoothstep(0.12, 0.0, fract(aSpan - uTime * 0.06)) * onBridge;
    float focus = uFocus >= 0.0 ? smoothstep(0.08, 0.0, abs(aSpan - uFocus)) * onBridge : 0.0;
    float glow = max(pulse * 0.55, focus);

    vec3 base = uPalette[int(aKind + 0.5)];
    float twinkle = 0.86 + 0.14 * sin(uTime * 1.4 + aSeed * 6.2831);
    vec3 color = uLight > 0.5 ? base : base * aShade * twinkle;
    vColor = mix(color, uPalette[5], glow);

    float alpha = uLight > 0.5 ? mix(0.18, 0.8, aShade) : 0.9;
    vAlpha = alpha * uOpacity;

    float size = aSize * (uLight > 0.5 ? 0.85 : 1.0) * (1.0 + glow * 0.6);
    gl_PointSize = max(1.0, size * uScale / -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float alpha = smoothstep(0.5, 0.36, length(gl_PointCoord - 0.5)) * vAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const KIND = { structure: 0, warm: 1, cool: 2, people: 3, dust: 4, accent: 5 };

// Order matches KIND.
const PALETTES = {
  dark: ['#f4f1ea', '#e9cfae', '#c5c9d1', '#ffffff', '#f4f1ea', '#f0a23b'],
  light: ['#1f1c18', '#8a6a44', '#4f5560', '#1f1c18', '#1f1c18', '#c4700a'],
};

/**
 * Camera keyframes for the landing page, one per `[data-act]` section.
 *   cam / look  camera position and target, in world units
 *   shift       slides the whole bridge sideways (positive = right), so text
 *               on the left and the bridge on the right never overlap
 *   rotation    the bridge's turn in radians — one slow revolution per page
 */
const ACTS = {
  hero: { cam: [0, 2.6, 16], look: [0, -2.2, 0], shift: 6, rotation: -0.7, scatter: 0, opacity: 1 },
  problem: { cam: [0, 1.5, 17], look: [0, 0.4, 0], shift: 5.5, rotation: -0.2, scatter: 1, opacity: 0.95 },
  promise: { cam: [0, 3.4, 16.5], look: [0, 0.1, 0], shift: 6, rotation: -0.45, scatter: 0, opacity: 1 },
  journey: { cam: [0, 4.6, 14.5], look: [0, -0.1, 0], shift: 6, rotation: -0.6, scatter: 0, opacity: 1 },
  categories: { cam: [0, 11, 9], look: [0, 0, 0], shift: 0, rotation: 0.8, scatter: 0, opacity: 0.2 },
  matching: { cam: [-4, 7, 13], look: [1, 0, 0], shift: 0, rotation: 2.2, scatter: 0, opacity: 0.22 },
  roles: { cam: [0, 5, 16], look: [0, 0, 0], shift: 0, rotation: 3.4, scatter: 0, opacity: 0.3 },
  impact: { cam: [0, 4, 18], look: [0, 0.5, 0], shift: 0, rotation: 5.5, scatter: 0, opacity: 0.35 },
  cta: { cam: [0, 2.6, 15], look: [0, -0.6, 0], shift: 0, rotation: Math.PI * 2, scatter: 0, opacity: 1 },
};

// Acts whose text sits on the left with the bridge composed on the right.
const SPLIT_ACTS = new Set(['problem', 'promise', 'journey']);

const HALF_SPAN = 6.4;
const ISLAND_OFFSET = 9.1;
const ISLAND_RADIUS = 2.9;

const deckHeight = (x) => 1.1 * (1 - (x / HALF_SPAN) ** 2) - 0.1;
const archRadius = (x) => 0.75 + 0.95 * Math.sin((Math.PI * (x + HALF_SPAN)) / (2 * HALF_SPAN));
const spanOf = (x) => Math.min(1, Math.max(0, (x + HALF_SPAN) / (2 * HALF_SPAN)));
const random = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Fourteen drifting clusters: the community, in fragments. They sit to the
// right of the bridge's centre, because the problem section's text is on the left.
const CLUSTERS = Array.from({ length: 14 }, () => [random(-2.5, 14), random(-3.5, 5.5), random(-6, 5)]);

function scatterTarget() {
  const [x, y, z] = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
  const radius = 1.4 * Math.cbrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    x + radius * Math.sin(phi) * Math.cos(theta),
    y + radius * Math.cos(phi),
    z + radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/** Collects per-point attributes, then builds a THREE.Points object. */
class PointCloud {
  positions = [];
  scatter = [];
  kinds = [];
  shades = [];
  sizes = [];
  spans = [];
  seeds = [];

  add(x, y, z, kind, shade, size, span = -1, { scatters = true } = {}) {
    this.positions.push(x, y, z);
    this.scatter.push(...(scatters ? scatterTarget() : [x, y, z]));
    this.kinds.push(kind);
    this.shades.push(shade);
    this.sizes.push(size);
    this.spans.push(span);
    this.seeds.push(Math.random());
  }

  build() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('aScatter', new THREE.Float32BufferAttribute(this.scatter, 3));
    geometry.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kinds, 1));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shades, 1));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aSpan', new THREE.Float32BufferAttribute(this.spans, 1));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(this.seeds, 1));
    return geometry;
  }
}

function createMaterial({ pulse = 0 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1000 },
      uPulse: { value: pulse },
      uScatter: { value: 0 },
      uFocus: { value: -1 },
      uOpacity: { value: 1 },
      uLight: { value: 0 },
      uPalette: { value: PALETTES.dark.map((hex) => new THREE.Color(hex)) },
    },
  });
}

function buildBridge() {
  const cloud = new PointCloud();

  // Ribs: semicircular arches standing on the deck.
  for (let x = -HALF_SPAN; x <= HALF_SPAN + 0.001; x += 0.32) {
    const radius = archRadius(x);
    const deck = deckHeight(x);
    for (let step = 0; step <= 26; step += 1) {
      const angle = (step / 26) * Math.PI;
      const y = deck + Math.sin(angle) * radius * 0.95;
      cloud.add(x, y, Math.cos(angle) * radius, KIND.structure, random(0.55, 1), 0.075, spanOf(x));
    }
    for (let step = -3; step <= 3; step += 1) {
      cloud.add(x, deck, (step / 3) * radius, KIND.structure, random(0.7, 1), 0.06, spanOf(x));
    }
  }

  // Rails along the length of the bridge.
  for (let rail = 0; rail <= 6; rail += 1) {
    const angle = (rail / 6) * Math.PI;
    for (let x = -HALF_SPAN; x <= HALF_SPAN; x += 0.07) {
      const radius = archRadius(x);
      const y = deckHeight(x) + Math.sin(angle) * radius * 0.95;
      const size = rail % 3 === 0 ? 0.07 : 0.045;
      cloud.add(x, y, Math.cos(angle) * radius, KIND.structure, random(0.55, 1), size, spanOf(x));
    }
  }

  // Suspension cables and hangers.
  for (const side of [-1, 1]) {
    const z = 2.3 * side;
    const cableHeight = (x) => deckHeight(x) + 1.7 + 1.2 * (1 - (x / (HALF_SPAN + 1.2)) ** 2);

    for (let x = -HALF_SPAN - 1; x <= HALF_SPAN + 1; x += 0.06) {
      cloud.add(x, cableHeight(x), z, KIND.structure, random(0.75, 1), 0.075, spanOf(x));
    }
    for (let x = -HALF_SPAN + 0.3; x <= HALF_SPAN; x += 0.64) {
      const top = cableHeight(x);
      const bottom = deckHeight(x);
      for (let step = 0; step <= 7; step += 1) {
        const y = bottom + ((top - bottom) * step) / 7;
        cloud.add(x, y, z, KIND.structure, random(0.4, 0.7), 0.045, spanOf(x));
      }
    }
  }

  return cloud;
}

function addIsland(cloud, side) {
  const centreX = side * ISLAND_OFFSET;
  const kind = side < 0 ? KIND.warm : KIND.cool;

  // Gently rolling top surface.
  for (let i = 0; i < 1600; i += 1) {
    const radius = ISLAND_RADIUS * Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -0.55 + Math.sin(x * 1.3 + side) * 0.14 + Math.cos(z * 1.7) * 0.12 - (radius / ISLAND_RADIUS) ** 3 * 0.35;
    cloud.add(centreX + x, y, z, kind, random(0.45, 0.95), random(0.045, 0.08));
  }

  // Tapering rock underneath, so it reads as floating.
  for (let i = 0; i < 700; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const depth = Math.random();
    const radius = ISLAND_RADIUS * (1 - depth) * random(0.85, 1);
    const x = centreX + Math.cos(angle) * radius;
    cloud.add(x, -0.75 - depth * 2, Math.sin(angle) * radius, kind, random(0.2, 0.45), random(0.04, 0.065));
  }

  // People — brighter points standing on the island.
  for (let i = 0; i < 20; i += 1) {
    const radius = ISLAND_RADIUS * 0.8 * Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;
    const x = centreX + Math.cos(angle) * radius;
    cloud.add(x, random(-0.3, -0.1), Math.sin(angle) * radius, KIND.people, 1, random(0.09, 0.13));
  }
}

function buildDust() {
  const cloud = new PointCloud();
  for (let i = 0; i < 900; i += 1) {
    const [x, y, z] = [random(-32, 32), random(-12, 14), random(-24, 8)];
    cloud.add(x, y, z, KIND.dust, random(0.15, 0.4), random(0.04, 0.09), -1, { scatters: false });
  }
  return cloud;
}

/**
 * Saffron packets crossing the bridge. Packet 0 is the "lead": in landing
 * mode it is placed by the journey section's scroll progress.
 */
function createPackets(count) {
  const packets = Array.from({ length: count }, (_, index) => ({
    progress: Math.random(),
    speed: random(0.03, 0.06),
    direction: index % 4 === 0 ? -1 : 1,
    lane: random(-0.5, 0.5),
    lift: random(0.1, 0.45),
    seed: Math.random() * 6,
  }));

  const cloud = new PointCloud();
  packets.forEach(() => cloud.add(0, 0, 0, KIND.accent, 1, 0.2, -1, { scatters: false }));
  const geometry = cloud.build();
  const positions = geometry.attributes.position.array;
  const sizes = geometry.attributes.aSize.array;

  const placeOnBridge = (index, progress, lane, lift, wobble) => {
    const x = -ISLAND_OFFSET + progress * ISLAND_OFFSET * 2;
    const onBridge = Math.abs(x) < HALF_SPAN;
    const width = onBridge ? 0.35 + 0.65 * Math.sin((Math.PI * (x + HALF_SPAN)) / (2 * HALF_SPAN)) : 1.4;
    const y = onBridge ? deckHeight(x) + 0.2 + lift + wobble : 0.1 + lift * 0.4 + wobble;
    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = lane * width;
  };

  const update = (time, delta, leadProgress) => {
    packets.forEach((packet, index) => {
      if (index === 0) {
        sizes[0] = leadProgress >= 0 ? 0.38 : 0;
        if (leadProgress >= 0) placeOnBridge(0, leadProgress, 0, 0.35, Math.sin(time * 2) * 0.03);
        return;
      }
      packet.progress = (packet.progress + packet.speed * delta * packet.direction + 1) % 1;
      placeOnBridge(index, packet.progress, packet.lane, packet.lift, Math.sin(time * 2 + packet.seed) * 0.04);
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
  };

  return { geometry, update };
}

/** Reads the landing page's acts and returns the blended camera state. */
function readActs(elements, viewportHeight) {
  const centre = viewportHeight / 2;
  const acts = elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: element.dataset.act, rect, middle: rect.top + rect.height / 2 };
    })
    .filter((act) => ACTS[act.name]);

  if (!acts.length) return { from: ACTS.hero, to: ACTS.hero, t: 0, acts };

  let index = acts.findIndex((act, i) => i === acts.length - 1 || acts[i + 1].middle > centre);
  index = Math.max(0, index);
  const current = acts[index];
  const next = acts[Math.min(index + 1, acts.length - 1)];
  const raw = next === current ? 0 : (centre - current.middle) / (next.middle - current.middle);

  // Hold each act while its section fills the screen; move in between.
  const t = smoothstep(0.3, 0.7, raw);
  return { from: ACTS[current.name], to: ACTS[next.name], t, acts, splitFrom: current.name, splitTo: next.name };
}

export default function BridgeScene({ mode = 'ambient' }) {
  const containerRef = useRef(null);
  const sceneApi = useRef(null);
  const { theme } = useTheme();

  // Theme changes only touch uniforms; nothing is rebuilt.
  useEffect(() => {
    sceneApi.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return undefined; // No WebGL: the page simply shows its background.
    }

    const landing = mode === 'landing';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, landing ? 1.5 : 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    const world = new THREE.Group();
    world.scale.setScalar(0.82);
    scene.add(world);

    const structureCloud = buildBridge();
    addIsland(structureCloud, -1);
    addIsland(structureCloud, 1);
    const structure = new THREE.Points(structureCloud.build(), createMaterial({ pulse: 1 }));
    const dust = new THREE.Points(buildDust().build(), createMaterial());
    const packets = createPackets(12);
    const packetPoints = new THREE.Points(packets.geometry, createMaterial());
    world.add(structure, packetPoints);
    scene.add(dust);

    const layers = [structure, dust, packetPoints];
    layers.forEach((layer) => {
      layer.frustumCulled = false;
    });

    const setUniform = (name, value) => {
      layers.forEach((layer) => {
        layer.material.uniforms[name].value = value;
      });
    };

    const setTheme = (name) => {
      const light = name === 'light';
      const palette = PALETTES[light ? 'light' : 'dark'];
      layers.forEach((layer) => {
        layer.material.uniforms.uPalette.value.forEach((color, index) => color.set(palette[index]));
        layer.material.uniforms.uLight.value = light ? 1 : 0;
        layer.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        layer.material.needsUpdate = true;
      });
      dirty = true;
    };

    let dirty = true;
    let portrait = false;
    let ambientDistance = 15;

    // The landing page's act sections, cached and refreshed on resize.
    let actElements = [];
    const collectActs = () => {
      actElements = landing ? [...document.querySelectorAll('[data-act]')] : [];
    };

    const resize = () => {
      collectActs();
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      portrait = camera.aspect < 0.9;
      // Banners are wide and short: keep the whole bridge, islands included, in frame.
      ambientDistance = 14 * Math.min(2.4, Math.max(1, 1.6 / camera.aspect));
      setUniform('uScale', (height * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360)));
      dirty = true;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handlePointerMove = (event) => {
      pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const markDirty = () => {
      dirty = true;
    };
    window.addEventListener('scroll', markDirty, { passive: true });

    let visible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibilityObserver.observe(container);

    // Smoothed camera state.
    const state = {
      cam: new THREE.Vector3(...ACTS.hero.cam),
      look: new THREE.Vector3(...ACTS.hero.look),
      shift: landing ? ACTS.hero.shift : 0,
      rotation: 0,
      scatter: 0,
      opacity: 1,
      focus: -1,
    };
    const targetCam = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    const lookAt = new THREE.Vector3();

    const landingTarget = () => {
      const { from, to, t, acts, splitFrom, splitTo } = readActs(actElements, window.innerHeight);

      targetCam.set(lerp(from.cam[0], to.cam[0], t), lerp(from.cam[1], to.cam[1], t), lerp(from.cam[2], to.cam[2], t));
      targetLook.set(
        lerp(from.look[0], to.look[0], t),
        lerp(from.look[1], to.look[1], t),
        lerp(from.look[2], to.look[2], t),
      );
      let opacity = lerp(from.opacity, to.opacity, t);
      let shift = lerp(from.shift, to.shift, t);

      // On portrait screens text stacks over the scene: centre it and dim it.
      if (portrait) {
        shift = 0;
        targetLook.x = 0;
        targetLook.y -= 1.8; // headlines sit low on phones: lift the bridge above them
        targetCam.x = 0;
        targetCam.z *= 1.9;
        if (SPLIT_ACTS.has(t < 0.5 ? splitFrom : splitTo)) opacity *= 0.4;
      }

      // The lead packet follows progress through the journey section.
      const journey = acts.find((act) => act.name === 'journey');
      let focus = -1;
      if (journey) {
        const progress = (window.innerHeight * 0.55 - journey.rect.top) / journey.rect.height;
        if (progress > 0 && progress < 1) focus = smoothstep(0.08, 0.92, progress);
      }

      return {
        shift,
        rotation: lerp(from.rotation, to.rotation, t),
        scatter: lerp(from.scatter, to.scatter, t),
        opacity,
        focus,
      };
    };

    let elapsed = 0;
    let frame = 0;
    let lastFrameAt = performance.now();

    // If frames keep running long, render at a lower resolution. It only ever
    // steps down, so it can't oscillate.
    const budget = { time: 0, frames: 0 };
    const adaptResolution = (delta) => {
      budget.time += delta;
      budget.frames += 1;
      if (budget.time < 1) return;
      const averageFrame = budget.time / budget.frames;
      budget.time = 0;
      budget.frames = 0;
      if (averageFrame > 1 / 50 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.25);
        renderer.setPixelRatio(pixelRatio);
        resize();
      }
    };

    const render = (delta) => {
      const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 5);
      if (!reducedMotion) elapsed += delta;
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      if (landing) {
        const target = landingTarget();
        state.cam.lerp(targetCam, ease);
        state.look.lerp(targetLook, ease);
        state.shift = lerp(state.shift, target.shift, ease);
        state.rotation = lerp(state.rotation, target.rotation, ease);
        state.scatter = lerp(state.scatter, target.scatter, ease);
        state.opacity = lerp(state.opacity, target.opacity, ease);
        state.focus = target.focus < 0 || state.focus < 0 ? target.focus : lerp(state.focus, target.focus, ease * 1.5);
      } else {
        state.cam.set(0, 2.2, ambientDistance);
        state.look.set(0, 0.1, 0);
        state.rotation = Math.sin(elapsed * 0.1) * 0.35;
      }

      camera.position.set(state.cam.x + pointer.x * 0.6, state.cam.y - pointer.y * 0.3, state.cam.z);
      lookAt.copy(state.look);
      camera.lookAt(lookAt);
      world.position.x = state.shift;
      world.rotation.y = state.rotation + Math.sin(elapsed * 0.12) * 0.03;
      dust.rotation.y = elapsed * 0.008;

      setUniform('uTime', elapsed);
      structure.material.uniforms.uScatter.value = state.scatter;
      structure.material.uniforms.uFocus.value = state.focus;
      setUniform('uOpacity', state.opacity);
      // Packets fade out while the bridge is scattered.
      packetPoints.material.uniforms.uOpacity.value = state.opacity * (1 - Math.min(1, state.scatter * 1.5));
      packets.update(elapsed, reducedMotion ? 0 : delta, state.focus);

      renderer.render(scene, camera);
      dirty = false;
    };

    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      // Cap the step so returning to a background tab doesn't make things jump.
      const delta = Math.min(0.05, (now - lastFrameAt) / 1000);
      lastFrameAt = now;
      if (!visible || document.hidden) return;
      // With reduced motion, only redraw when something actually changed.
      if (reducedMotion && !dirty) return;
      render(delta);
      if (!reducedMotion) adaptResolution(delta);
    };

    sceneApi.current = { setTheme };
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    frame = requestAnimationFrame(loop);

    return () => {
      sceneApi.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', markDirty);
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode]);

  return <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />;
}
