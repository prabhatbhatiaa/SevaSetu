import * as THREE from 'three';
import { Cloud, KIND, addFloor, frameCamera, lerp, seededRandom } from '../engine';

/*
 * "How a request travels."
 *
 * A dotted street winds across the dot-grid from the requester's home (warm)
 * to the volunteer's (cool). Five rings mark the five steps. A saffron light
 * walks the route as you scroll, lighting the path behind it.
 *
 * input.progress — 0 → 1 along the route.
 */

const STEPS = [0, 0.25, 0.5, 0.75, 1];

/** A small house drawn as a wireframe of points: a box with a pitched roof. */
function addHouse(cloud, cx, cz, kind, span) {
  const w = 0.6;
  const h = 0.7;
  const corners = [
    [-w, -w],
    [w, -w],
    [w, w],
    [-w, w],
  ];
  const edge = (a, b) => {
    const steps = Math.ceil(a.distanceTo(b) / 0.07);
    for (let i = 0; i <= steps; i += 1) {
      const p = a.clone().lerp(b, i / steps);
      cloud.add(cx + p.x, p.y, cz + p.z, { kind, shade: 0.95, size: 0.06, span });
    }
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  corners.forEach(([x, z], i) => {
    const [nx, nz] = corners[(i + 1) % 4];
    edge(v(x, 0, z), v(nx, 0, nz));
    edge(v(x, h, z), v(nx, h, nz));
    edge(v(x, 0, z), v(x, h, z));
  });
  // Roof: a ridge along x.
  edge(v(-w, h + 0.5, 0), v(w, h + 0.5, 0));
  [-w, w].forEach((x) => {
    edge(v(x, h, -w), v(x, h + 0.5, 0));
    edge(v(x, h, w), v(x, h + 0.5, 0));
  });
}

export default function setupRoute({ scene, camera, material }) {
  const random = seededRandom(11);
  const group = new THREE.Group();
  scene.add(group);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.6, 0, 1.6),
    new THREE.Vector3(-3, 0, -0.6),
    new THREE.Vector3(-0.4, 0, 1.3),
    new THREE.Vector3(2.4, 0, -0.9),
    new THREE.Vector3(5.6, 0, 0.9),
  ]);

  const cloud = addFloor(new Cloud(), { halfX: 9, halfZ: 6, step: 0.7, shade: 0.28 });

  // The route itself — each point knows how far along it sits, so the shader
  // can light everything behind the walker.
  const samples = 260;
  const point = new THREE.Vector3();
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    curve.getPointAt(t, point);
    cloud.add(point.x, 0.02, point.z, { shade: 0.55, size: 0.055, span: t });
  }

  // Step markers: rings that light up as the walker passes.
  STEPS.forEach((t) => {
    curve.getPointAt(t, point);
    for (let a = 0; a < Math.PI * 2; a += 0.16) {
      cloud.add(point.x + Math.cos(a) * 0.34, 0.02, point.z + Math.sin(a) * 0.34, { shade: 0.8, size: 0.05, span: t });
    }
  });

  const start = curve.getPointAt(0);
  const end = curve.getPointAt(1);
  addHouse(cloud, start.x - 1.1, start.z, KIND.warm, -1);
  addHouse(cloud, end.x + 1.1, end.z, KIND.cool, -1);

  for (let i = 0; i < 160; i += 1) {
    cloud.add(random(-9, 9), random(1.5, 5), random(-6, 2), { shade: random(0.1, 0.3), size: random(0.03, 0.06) });
  }

  const routeMaterial = material();
  group.add(new THREE.Points(cloud.geometry(), routeMaterial));

  // The walker.
  const walkerCloud = new Cloud().add(0, 0, 0, { kind: KIND.accent, size: 0.34 });
  const walkerGeometry = walkerCloud.geometry();
  group.add(new THREE.Points(walkerGeometry, material()));

  let progress = 0;

  return {
    update({ time, delta, pointer, input, aspect, reduced }) {
      // In narrow stages (phones), look down the street instead of across it.
      const portrait = aspect < 1.2;
      frameCamera(camera, {
        target: portrait ? [-1.2, 0, 0.4] : [0, 0, 0.2],
        halfWidth: portrait ? 4.6 : 8.2,
        halfHeight: portrait ? 4.4 : 3,
        fill: portrait ? 0.9 : 0.92,
        pitch: (portrait ? 0.62 : 0.78) - pointer.y * 0.04,
        yaw: (portrait ? -1.05 : 0) + pointer.x * 0.1 + Math.sin(time * 0.15) * 0.12,
      });

      const goal = Math.min(1, Math.max(0, input.progress ?? 0));
      progress = reduced ? goal : lerp(progress, goal, 1 - Math.exp(-delta * 3));
      routeMaterial.uniforms.uTrail.value = progress;

      curve.getPointAt(progress, point);
      walkerGeometry.attributes.position.setXYZ(0, point.x, 0.3 + Math.sin(time * 3) * 0.05, point.z);
      walkerGeometry.attributes.position.needsUpdate = true;
    },
  };
}
