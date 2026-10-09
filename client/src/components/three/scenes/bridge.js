import * as THREE from 'three';
import { Cloud, KIND, addDust, frameCamera, seededRandom } from '../engine';

/*
 * The Setu — the arched bridge from our logo, drawn in points of light.
 * Two floating islands (people who need help, people who can give it) joined
 * by an arch, with saffron packets crossing it: each one a match being made.
 *
 * input.fit — where the bridge sits in its canvas: { x, y, fill, pitch },
 *             with an optional `portrait` override for tall screens.
 */

const HALF_SPAN = 6.4;
const ISLAND_OFFSET = 9.1;
const ISLAND_RADIUS = 2.9;

const deckHeight = (x) => 1.1 * (1 - (x / HALF_SPAN) ** 2) - 0.1;
const archRadius = (x) => 0.75 + 0.95 * Math.sin((Math.PI * (x + HALF_SPAN)) / (2 * HALF_SPAN));
const spanOf = (x) => Math.min(1, Math.max(0, (x + HALF_SPAN) / (2 * HALF_SPAN)));

// Tricolor palettes for the bridge: Saffron (kesari), Pure White / Warm Ivory, and India Green.
// Balanced and delicate so they maintain the luminous dot-cloud aesthetic in both dark and light modes.
const TRICOLOR = {
  dark: {
    saffron: '#ff7722', // Kesari / warm radiant saffron
    white: '#f5f5f7',   // Luminous white
    green: '#1cb059',   // India green
  },
  light: {
    saffron: '#d95a10', // Rich saffron readable on light canvas
    white: '#3c3a36',   // Deep ink/charcoal equivalent for light contrast
    green: '#15803d',   // Forest india green
  },
};

function buildStructure(random) {
  const cloud = new Cloud();

  // Ribs: semicircular arches standing on the deck.
  // The upper arc touches Saffron, the middle transitions to White, and base/deck touches Green.
  for (let x = -HALF_SPAN; x <= HALF_SPAN + 0.001; x += 0.32) {
    const radius = archRadius(x);
    const deck = deckHeight(x);
    for (let step = 0; step <= 26; step += 1) {
      const angle = (step / 26) * Math.PI;
      const sinA = Math.sin(angle);
      // Height proportion on the arch: 0 = base, 1 = top apex
      const kind = sinA > 0.65 ? 10 : sinA > 0.3 ? 11 : 12;
      cloud.add(x, deck + sinA * radius * 0.95, Math.cos(angle) * radius, {
        kind,
        shade: random(0.65, 1),
        size: 0.075,
        span: spanOf(x),
      });
    }
    // Lower cross deck ties (deck level -> Green / anchor)
    for (let step = -3; step <= 3; step += 1) {
      cloud.add(x, deck, (step / 3) * radius, { kind: 12, shade: random(0.65, 0.95), size: 0.06, span: spanOf(x) });
    }
  }

  // Rails along the length of the bridge.
  // Lower rails (rail 0, 1, 5, 6) = Green, Middle rails (rail 2, 4) = White, Top crown rail (rail 3) = Saffron
  for (let rail = 0; rail <= 6; rail += 1) {
    const angle = (rail / 6) * Math.PI;
    const sinA = Math.sin(angle);
    const kind = sinA > 0.75 ? 10 : sinA > 0.35 ? 11 : 12;
    for (let x = -HALF_SPAN; x <= HALF_SPAN; x += 0.07) {
      const radius = archRadius(x);
      cloud.add(x, deckHeight(x) + sinA * radius * 0.95, Math.cos(angle) * radius, {
        kind,
        shade: random(0.6, 1),
        size: rail % 3 === 0 ? 0.07 : 0.045,
        span: spanOf(x),
      });
    }
  }

  // Suspension cables and hangers.
  // Upper sweeping catenary cables = Saffron; vertical hangers gradient down through White to Green deck.
  for (const side of [-1, 1]) {
    const z = 2.3 * side;
    const cableHeight = (x) => deckHeight(x) + 1.7 + 1.2 * (1 - (x / (HALF_SPAN + 1.2)) ** 2);
    for (let x = -HALF_SPAN - 1; x <= HALF_SPAN + 1; x += 0.06) {
      cloud.add(x, cableHeight(x), z, { kind: 10, shade: random(0.8, 1), size: 0.075, span: spanOf(x) });
    }
    for (let x = -HALF_SPAN + 0.3; x <= HALF_SPAN; x += 0.64) {
      const top = cableHeight(x);
      const bottom = deckHeight(x);
      for (let step = 0; step <= 7; step += 1) {
        const frac = step / 7;
        const kind = frac > 0.6 ? 10 : frac > 0.25 ? 11 : 12;
        cloud.add(x, bottom + (top - bottom) * frac, z, {
          kind,
          shade: random(0.45, 0.75),
          size: 0.045,
          span: spanOf(x),
        });
      }
    }
  }

  // Floating islands: people who need help (warm) and people who can give it (cool).
  for (const side of [-1, 1]) {
    const centreX = side * ISLAND_OFFSET;
    const kind = side < 0 ? KIND.warm : KIND.cool;
    for (let i = 0; i < 1100; i += 1) {
      const radius = ISLAND_RADIUS * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y =
        -0.55 + Math.sin(x * 1.3 + side) * 0.14 + Math.cos(z * 1.7) * 0.12 - (radius / ISLAND_RADIUS) ** 3 * 0.35;
      cloud.add(centreX + x, y, z, { kind, shade: random(0.45, 0.95), size: random(0.045, 0.08) });
    }
    for (let i = 0; i < 450; i += 1) {
      const angle = random() * Math.PI * 2;
      const depth = random();
      const radius = ISLAND_RADIUS * (1 - depth) * random(0.85, 1);
      cloud.add(centreX + Math.cos(angle) * radius, -0.75 - depth * 2, Math.sin(angle) * radius, {
        kind,
        shade: random(0.2, 0.45),
        size: random(0.04, 0.065),
      });
    }
    for (let i = 0; i < 18; i += 1) {
      const radius = ISLAND_RADIUS * 0.8 * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      cloud.add(centreX + Math.cos(angle) * radius, random(-0.3, -0.1), Math.sin(angle) * radius, {
        size: random(0.09, 0.13),
      });
    }
  }

  return cloud;
}

/** Saffron packets crossing the bridge, moved on the CPU (only a dozen points). */
function createPackets(random, count = 12) {
  const packets = Array.from({ length: count }, (_, index) => ({
    progress: random(),
    speed: random(0.03, 0.06),
    direction: index % 4 === 0 ? -1 : 1,
    lane: random(-0.5, 0.5),
    lift: random(0.1, 0.45),
    seed: random(0, 6),
  }));
  const cloud = new Cloud();
  packets.forEach(() => cloud.add(0, 0, 0, { kind: KIND.accent, size: 0.2 }));
  const geometry = cloud.geometry();
  const positions = geometry.attributes.position.array;
  const from = geometry.attributes.aFrom.array;

  const update = (time, delta) => {
    packets.forEach((packet, index) => {
      packet.progress = (packet.progress + packet.speed * delta * packet.direction + 1) % 1;
      const x = -ISLAND_OFFSET + packet.progress * ISLAND_OFFSET * 2;
      const onBridge = Math.abs(x) < HALF_SPAN;
      const width = onBridge ? 0.35 + 0.65 * Math.sin((Math.PI * (x + HALF_SPAN)) / (2 * HALF_SPAN)) : 1.4;
      const y = onBridge
        ? deckHeight(x) + 0.2 + packet.lift + Math.sin(time * 2 + packet.seed) * 0.04
        : 0.1 + packet.lift * 0.4 + Math.sin(time + packet.seed) * 0.08;
      positions.set([x, y, packet.lane * width], index * 3);
      from.set([x, y, packet.lane * width], index * 3);
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aFrom.needsUpdate = true;
  };
  return { geometry, update };
}

const DEFAULT_FIT = { x: 0.5, y: 0.5, fill: 0.88, pitch: 0.2 };

/**
 * Creates custom material for the bridge structure supporting tricolor highlights.
 * Kind indices 10, 11, 12 map to Saffron, White, and Green respectively, while
 * preserving default ink, warm, cool, accent palette values for 0..3.
 */
function createBridgeMaterial(baseMaterial) {
  const mat = baseMaterial.clone();

  const customVertexShader = /* glsl */ `
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
    uniform vec3 uTricolor[3]; // 0: Saffron, 1: White, 2: Green

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      float delay = aSeed * 0.4;
      float settled = smoothstep(delay, delay + 0.6, uMorph);
      vec4 view = modelViewMatrix * vec4(mix(aFrom, position, settled), 1.0);

      float onPath = step(0.0, aSpan);
      float pulse = smoothstep(0.12, 0.0, fract(aSpan - uTime * 0.06)) * uPulse * onPath * settled;
      float trail = uTrail >= 0.0 ? step(aSpan, uTrail) * onPath : 0.0;
      float glow = max(pulse * 0.6, trail);

      vec3 base;
      if (aKind >= 9.5) {
        int triIndex = clamp(int(aKind - 9.5), 0, 2);
        base = uTricolor[triIndex];
      } else {
        base = uPalette[int(aKind + 0.5)];
      }

      float twinkle = 0.88 + 0.12 * sin(uTime * 1.4 + aSeed * 6.2831);
      vec3 color = uLight > 0.5 ? base : base * aShade * twinkle;
      vColor = mix(color, uPalette[3], glow * 0.7);

      float alpha = uLight > 0.5 ? mix(0.24, 0.9, aShade) : 0.92;
      vAlpha = max(alpha, glow * 0.9) * uOpacity * step(0.0001, aSize);

      float size = aSize * (uLight > 0.5 ? 0.88 : 1.0) * (1.0 + glow * 0.5);
      gl_PointSize = clamp(size * uScale / -view.z, 1.0, uMaxSize);
      gl_Position = projectionMatrix * view;
    }
  `;

  mat.vertexShader = customVertexShader;
  mat.uniforms.uTricolor = {
    value: [
      new THREE.Color(TRICOLOR.dark.saffron),
      new THREE.Color(TRICOLOR.dark.white),
      new THREE.Color(TRICOLOR.dark.green),
    ],
  };

  return mat;
}

export default function setupBridge({ scene, camera, material }) {
  const random = seededRandom(7);
  const world = new THREE.Group();
  world.scale.setScalar(0.82);
  scene.add(world);

  const baseStructureMat = material({ pulse: 1 });
  const structureMat = createBridgeMaterial(baseStructureMat);

  world.add(new THREE.Points(buildStructure(random).geometry(), structureMat));
  const packets = createPackets(random);
  world.add(new THREE.Points(packets.geometry, material()));
  const dust = new THREE.Points(addDust(new Cloud(), { random, count: 260 }).geometry(), material());
  scene.add(dust);

  const syncThemeTricolor = () => {
    const isLight = !document.documentElement.classList.contains('dark');
    const colors = TRICOLOR[isLight ? 'light' : 'dark'];
    structureMat.uniforms.uTricolor.value[0].set(colors.saffron);
    structureMat.uniforms.uTricolor.value[1].set(colors.white);
    structureMat.uniforms.uTricolor.value[2].set(colors.green);
  };
  syncThemeTricolor();
  const themeObserver = new MutationObserver(syncThemeTricolor);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return {
    update({ time, delta, pointer, input, aspect }) {
      const fit = { ...DEFAULT_FIT, ...input.fit, ...(aspect < 0.9 ? input.fit?.portrait : null) };
      frameCamera(camera, {
        target: [0, 0.4, 0],
        halfWidth: (ISLAND_OFFSET + ISLAND_RADIUS) * 0.82,
        halfHeight: 3.2,
        fill: fit.fill,
        x: fit.x,
        y: fit.y,
        pitch: fit.pitch - pointer.y * 0.04,
        yaw: pointer.x * 0.08,
      });
      world.rotation.y = -0.16 + Math.sin(time * 0.12) * 0.06;
      dust.rotation.y = time * 0.008;
      packets.update(time, delta);
    },
  };
}
