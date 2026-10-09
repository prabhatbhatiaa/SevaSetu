import * as THREE from 'three';
import { Cloud, KIND, addDust, frameCamera, lerp, seededRandom } from '../engine';

/*
 * "Help gets lost in the group chat."
 *
 * Chat bubbles, drawn in points, drift in a loose constellation joined by
 * faint dotted paths. Saffron messages set off along the paths — and fade out
 * before they arrive.
 */

const BUBBLES = 9;
const PATHS = 8;
const MESSAGES = 5;

/** Outline of a speech bubble (rounded rectangle + tail) with three "lines of text". */
function bubblePoints(width, height) {
  const points = [];
  const radius = 0.32;
  const halfW = width / 2;
  const halfH = height / 2;
  const step = 0.06;

  // Straight edges.
  for (let x = -halfW + radius; x <= halfW - radius; x += step) {
    points.push([x, halfH, 1], [x, -halfH, 1]);
  }
  for (let y = -halfH + radius; y <= halfH - radius; y += step) {
    points.push([-halfW, y, 1], [halfW, y, 1]);
  }
  // Rounded corners.
  const corners = [
    [halfW - radius, halfH - radius, 0],
    [-halfW + radius, halfH - radius, Math.PI / 2],
    [-halfW + radius, -halfH + radius, Math.PI],
    [halfW - radius, -halfH + radius, (3 * Math.PI) / 2],
  ];
  corners.forEach(([cx, cy, start]) => {
    for (let a = 0; a <= Math.PI / 2; a += step / radius) {
      points.push([cx + Math.cos(start + a) * radius, cy + Math.sin(start + a) * radius, 1]);
    }
  });
  // Tail.
  for (let t = 0; t <= 1; t += 0.12) {
    points.push([lerp(-halfW + 0.35, -halfW + 0.15, t), lerp(-halfH, -halfH - 0.35, t), 1]);
    points.push([lerp(-halfW + 0.7, -halfW + 0.15, t), lerp(-halfH, -halfH - 0.35, t), 1]);
  }
  // Lines of "text".
  [0.28, 0, -0.28].forEach((y, row) => {
    const length = width * (row === 2 ? 0.4 : 0.66);
    for (let x = -halfW + 0.3; x <= -halfW + 0.3 + length; x += 0.09) points.push([x, y * (height / 1.2), 0.45]);
  });
  return points;
}

function arcPoint(a, b, t, lift, out) {
  out.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t) + Math.sin(Math.PI * t) * lift, lerp(a.z, b.z, t));
  return out;
}

export default function setupSignals({ scene, camera, material }) {
  const random = seededRandom(23);
  const group = new THREE.Group();
  scene.add(group);

  // Lay the bubbles out on a loose ellipse so they never overlap.
  const centres = Array.from({ length: BUBBLES }, (_, index) => {
    const angle = (index / BUBBLES) * Math.PI * 2 + random(-0.25, 0.25);
    return new THREE.Vector3(Math.cos(angle) * 5 + random(-0.4, 0.4), random(-2.4, 2.6), Math.sin(angle) * 2.4);
  });

  const cloud = new Cloud();
  const kinds = [KIND.warm, KIND.ink, KIND.cool];
  centres.forEach((centre, index) => {
    const width = random(2.1, 2.9);
    const height = width * random(0.5, 0.62);
    const turn = random(-0.5, 0.5);
    const seed = random();
    bubblePoints(width, height).forEach(([x, y, shade]) => {
      cloud.add(centre.x + x * Math.cos(turn), centre.y + y, centre.z + x * Math.sin(turn), {
        kind: kinds[index % kinds.length],
        shade: shade * random(0.7, 1),
        size: shade === 1 ? 0.06 : 0.05,
        seed,
      });
    });
  });

  // Dotted paths between bubbles: the forwards and replies that go nowhere.
  const paths = Array.from({ length: PATHS }, (_, index) => {
    const from = centres[index % BUBBLES];
    const to = centres[(index + 2 + (index % 3)) % BUBBLES];
    return { from, to, lift: random(0.8, 1.6) };
  });
  const point = new THREE.Vector3();
  paths.forEach((path) => {
    const steps = Math.ceil(path.from.distanceTo(path.to) / 0.14);
    for (let i = 1; i < steps; i += 1) {
      arcPoint(path.from, path.to, i / steps, path.lift, point);
      cloud.add(point.x, point.y, point.z, { shade: 0.22, size: 0.035 });
    }
  });
  group.add(new THREE.Points(cloud.geometry(), material()));

  // Saffron messages that fade before they arrive.
  const messages = Array.from({ length: MESSAGES }, (_, index) => ({
    path: index % PATHS,
    progress: -random(0, 1.2), // negative = waiting to set off
    speed: random(0.28, 0.4),
  }));
  const messageCloud = new Cloud();
  messages.forEach(() => messageCloud.add(0, 0, 0, { kind: KIND.accent, size: 0 }));
  const messageGeometry = messageCloud.geometry();
  group.add(new THREE.Points(messageGeometry, material()));
  const positions = messageGeometry.attributes.position.array;
  const sizes = messageGeometry.attributes.aSize.array;

  const dust = new THREE.Points(addDust(new Cloud(), { random, count: 180 }).geometry(), material());
  scene.add(dust);

  return {
    update({ time, delta, pointer, input, aspect }) {
      frameCamera(camera, {
        target: [0, 0.2, 0],
        halfWidth: 6.4,
        halfHeight: 3.6,
        fill: aspect < 0.9 ? 0.98 : 0.92,
        x: input.x ?? 0.5,
        pitch: 0.12 - pointer.y * 0.04,
        yaw: pointer.x * 0.1,
      });
      group.rotation.y = Math.sin(time * 0.1) * 0.22;
      group.position.y = Math.sin(time * 0.5) * 0.08;
      dust.rotation.y = time * 0.01;

      messages.forEach((message, index) => {
        message.progress += delta * message.speed;
        // Lost: the message never makes it past ~60% of the way.
        if (message.progress > 0.62) {
          message.progress = -random(0.2, 1);
          message.path = (message.path + 3) % PATHS;
        }
        const t = Math.max(0, message.progress);
        const path = paths[message.path];
        arcPoint(path.from, path.to, t, path.lift, point);
        positions.set([point.x, point.y, point.z], index * 3);
        const fade = message.progress < 0 ? 0 : 1 - Math.min(1, Math.max(0, (t - 0.4) / 0.22));
        sizes[index] = 0.24 * fade;
      });
      messageGeometry.attributes.position.needsUpdate = true;
      messageGeometry.attributes.aSize.needsUpdate = true;
    },
  };
}
