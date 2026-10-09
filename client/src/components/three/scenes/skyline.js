import * as THREE from 'three';
import { Cloud, KIND, addFloor, easeOutCubic, frameCamera, seededRandom } from '../engine';

/*
 * "Every crossing counts."
 *
 * A small skyline of light: each column a stack of points rising out of the
 * dot-grid, as if built from completed requests. Saffron caps mark the tallest.
 * The columns grow once, on first view.
 */

const COLUMNS = 11;
const ROWS = 6;
const GAP = 0.85;

export default function setupSkyline({ scene, camera, material }) {
  const random = seededRandom(19);
  const group = new THREE.Group();
  scene.add(group);

  const cloud = addFloor(new Cloud(), { halfX: 8, halfZ: 6, step: 0.6, shade: 0.26 });
  const floorCount = cloud.count;

  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const x = (column - (COLUMNS - 1) / 2) * GAP;
      const z = (row - (ROWS - 1) / 2) * GAP;
      // Taller towards the middle, with some variety.
      const centrality = 1 - Math.hypot(x / 5, z / 3) * 0.6;
      const height = Math.max(0.2, (0.6 + random(0, 2.4)) * centrality);
      // Columns grow front-to-back: the seed staggers the rise.
      const seed = (row / ROWS) * 0.5 + random(0, 0.25);
      for (let y = 0; y <= height; y += 0.12) {
        cloud.add(x, y, z, { shade: 0.45 + (y / 3) * 0.5, size: 0.065, from: [x, 0, z], seed });
      }
      if (height > 2.1) {
        cloud.add(x, height + 0.18, z, { kind: KIND.accent, size: 0.13, from: [x, 0, z], seed });
      }
    }
  }

  const geometry = cloud.geometry();
  // The floor never rises, so keep it settled regardless of the grow animation.
  const from = geometry.attributes.aFrom.array;
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < floorCount * 3; i += 1) from[i] = positions[i];

  const skylineMaterial = material();
  group.add(new THREE.Points(geometry, skylineMaterial));

  return {
    update({ time, pointer, input, aspect, shownFor }) {
      frameCamera(camera, {
        target: [0, 1.1, 0],
        halfWidth: 5.4,
        halfHeight: 2.4,
        fill: aspect < 0.9 ? 0.98 : 0.92,
        x: input.x ?? 0.5,
        pitch: 0.42 - pointer.y * 0.04,
        yaw: pointer.x * 0.12,
      });
      group.rotation.y = -0.5 + time * 0.06;
      skylineMaterial.uniforms.uMorph.value = easeOutCubic((shownFor - 0.2) / 2.4);
    },
  };
}
