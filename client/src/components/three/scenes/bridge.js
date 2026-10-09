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

function buildStructure(random) {
  const cloud = new Cloud();

  // Ribs: semicircular arches standing on the deck.
  for (let x = -HALF_SPAN; x <= HALF_SPAN + 0.001; x += 0.32) {
    const radius = archRadius(x);
    const deck = deckHeight(x);
    for (let step = 0; step <= 26; step += 1) {
      const angle = (step / 26) * Math.PI;
      cloud.add(x, deck + Math.sin(angle) * radius * 0.95, Math.cos(angle) * radius, {
        shade: random(0.55, 1),
        size: 0.075,
        span: spanOf(x),
      });
    }
    for (let step = -3; step <= 3; step += 1) {
      cloud.add(x, deck, (step / 3) * radius, { shade: random(0.7, 1), size: 0.06, span: spanOf(x) });
    }
  }

  // Rails along the length of the bridge.
  for (let rail = 0; rail <= 6; rail += 1) {
    const angle = (rail / 6) * Math.PI;
    for (let x = -HALF_SPAN; x <= HALF_SPAN; x += 0.07) {
      const radius = archRadius(x);
      cloud.add(x, deckHeight(x) + Math.sin(angle) * radius * 0.95, Math.cos(angle) * radius, {
        shade: random(0.55, 1),
        size: rail % 3 === 0 ? 0.07 : 0.045,
        span: spanOf(x),
      });
    }
  }

  // Suspension cables and hangers.
  for (const side of [-1, 1]) {
    const z = 2.3 * side;
    const cableHeight = (x) => deckHeight(x) + 1.7 + 1.2 * (1 - (x / (HALF_SPAN + 1.2)) ** 2);
    for (let x = -HALF_SPAN - 1; x <= HALF_SPAN + 1; x += 0.06) {
      cloud.add(x, cableHeight(x), z, { shade: random(0.75, 1), size: 0.075, span: spanOf(x) });
    }
    for (let x = -HALF_SPAN + 0.3; x <= HALF_SPAN; x += 0.64) {
      const top = cableHeight(x);
      const bottom = deckHeight(x);
      for (let step = 0; step <= 7; step += 1) {
        cloud.add(x, bottom + ((top - bottom) * step) / 7, z, {
          shade: random(0.4, 0.7),
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

export default function setupBridge({ scene, camera, material }) {
  const random = seededRandom(7);
  const world = new THREE.Group();
  world.scale.setScalar(0.82);
  scene.add(world);

  world.add(new THREE.Points(buildStructure(random).geometry(), material({ pulse: 1 })));
  const packets = createPackets(random);
  world.add(new THREE.Points(packets.geometry, material()));
  const dust = new THREE.Points(addDust(new Cloud(), { random, count: 260 }).geometry(), material());
  scene.add(dust);

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
