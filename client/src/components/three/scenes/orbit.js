import * as THREE from 'three';
import { Cloud, KIND, addFloor, frameCamera, seededRandom } from '../engine';

/*
 * "A ranking you can read."
 *
 * The request sits at the centre in saffron. Volunteers orbit it on three
 * rings — the closer the ring, the better the match — and the inner ring's
 * volunteers are linked to the request by hairlines.
 */

const RINGS = [
  { radius: 1.7, count: 3, speed: 0.32, tilt: 0.22 },
  { radius: 2.9, count: 5, speed: 0.2, tilt: -0.12 },
  { radius: 4.1, count: 7, speed: 0.12, tilt: 0.08 },
];

function ringPoint(ring, angle, out) {
  const x = Math.cos(angle) * ring.radius;
  const z = Math.sin(angle) * ring.radius;
  // Tilt the ring's plane around the x axis.
  out.set(x, -z * Math.sin(ring.tilt), z * Math.cos(ring.tilt));
  return out;
}

export default function setupOrbit({ scene, camera, material }) {
  const random = seededRandom(5);
  const group = new THREE.Group();
  scene.add(group);
  const point = new THREE.Vector3();

  const cloud = new Cloud();
  // The request: a saffron core.
  for (let i = 0; i < 220; i += 1) {
    const theta = random(0, Math.PI * 2);
    const phi = Math.acos(random(-1, 1));
    const r = 0.45 * Math.cbrt(random(0.4, 1));
    cloud.add(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta), {
      kind: KIND.accent,
      shade: random(0.7, 1),
      size: 0.06,
    });
  }
  // Dotted orbits.
  RINGS.forEach((ring) => {
    const steps = Math.round((ring.radius * Math.PI * 2) / 0.11);
    for (let i = 0; i < steps; i += 1) {
      ringPoint(ring, (i / steps) * Math.PI * 2, point);
      cloud.add(point.x, point.y, point.z, { shade: 0.3, size: 0.035 });
    }
  });
  addFloor(cloud, { y: -2.4, halfX: 8, halfZ: 6, step: 0.8, shade: 0.22 });
  group.add(new THREE.Points(cloud.geometry(), material()));

  // Volunteers on the rings, moved every frame.
  const volunteers = RINGS.flatMap((ring, ringIndex) =>
    Array.from({ length: ring.count }, (_, i) => ({
      ring,
      ringIndex,
      angle: (i / ring.count) * Math.PI * 2 + random(-0.3, 0.3),
    })),
  );
  const nodeCloud = new Cloud();
  volunteers.forEach(({ ringIndex }) =>
    nodeCloud.add(0, 0, 0, { kind: ringIndex === 0 ? KIND.ink : KIND.cool, size: ringIndex === 0 ? 0.2 : 0.14 }),
  );
  const nodeGeometry = nodeCloud.geometry();
  group.add(new THREE.Points(nodeGeometry, material()));

  // Hairlines from the request to its best matches (inner ring).
  const best = volunteers.filter((volunteer) => volunteer.ringIndex === 0);
  const lineCloud = new Cloud();
  best.forEach(() => {
    lineCloud.add(0, 0, 0, { kind: KIND.accent, shade: 0.7 });
    lineCloud.add(0, 0, 0, { kind: KIND.accent, shade: 0.15 });
  });
  const lineGeometry = lineCloud.geometry();
  group.add(new THREE.LineSegments(lineGeometry, material({ points: false })));

  return {
    update({ time, delta, pointer, input, aspect }) {
      frameCamera(camera, {
        target: [0, -0.2, 0],
        halfWidth: 4.4,
        halfHeight: 2.9,
        fill: aspect < 0.9 ? 0.95 : 0.9,
        pitch: 0.36 - pointer.y * 0.05,
        yaw: pointer.x * 0.12,
      });
      group.rotation.y = time * 0.05;

      volunteers.forEach((volunteer, index) => {
        volunteer.angle += volunteer.ring.speed * delta;
        ringPoint(volunteer.ring, volunteer.angle, point);
        nodeGeometry.attributes.position.setXYZ(index, point.x, point.y, point.z);
      });
      nodeGeometry.attributes.position.needsUpdate = true;

      best.forEach((volunteer, index) => {
        ringPoint(volunteer.ring, volunteer.angle, point);
        lineGeometry.attributes.position.setXYZ(index * 2, 0, 0, 0);
        lineGeometry.attributes.position.setXYZ(index * 2 + 1, point.x, point.y, point.z);
      });
      lineGeometry.attributes.position.needsUpdate = true;

      // Highlight whichever candidate is selected in the demo next to the scene.
      const selected = input.selected ?? 0;
      nodeGeometry.attributes.aSize.array.forEach((_, index) => {
        nodeGeometry.attributes.aSize.array[index] =
          index === selected ? 0.3 : volunteers[index].ringIndex === 0 ? 0.2 : 0.14;
      });
      nodeGeometry.attributes.aSize.needsUpdate = true;
    },
  };
}
