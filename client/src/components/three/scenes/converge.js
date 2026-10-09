import * as THREE from 'three';
import { Cloud, KIND, addFloor, easeOutCubic, frameCamera, seededRandom } from '../engine';

/*
 * "Every request gets a place."
 *
 * Scattered points converge into a single 3D map pin standing on the dot-grid,
 * and ripples spread from where it lands. The morph runs once, on first view.
 */

const PIN = { sphereCentre: 3.3, sphereRadius: 1.3, joinRadius: 1 };
const JOIN_HEIGHT = PIN.sphereCentre - Math.sqrt(PIN.sphereRadius ** 2 - PIN.joinRadius ** 2);
const TOP = PIN.sphereCentre + PIN.sphereRadius;
const RIPPLES = 3;
const RIPPLE_POINTS = 110;

/** Radius of the pin's surface at height h (a cone into a sphere). */
function pinRadius(h) {
  if (h <= JOIN_HEIGHT) return (h / JOIN_HEIGHT) * PIN.joinRadius;
  return Math.sqrt(Math.max(0, PIN.sphereRadius ** 2 - (h - PIN.sphereCentre) ** 2));
}

export default function setupConverge({ scene, camera, material }) {
  const random = seededRandom(41);
  const group = new THREE.Group();
  scene.add(group);

  const scattered = () => {
    const radius = 7 * Math.cbrt(random());
    const theta = random(0, Math.PI * 2);
    const phi = Math.acos(random(-1, 1));
    return [
      radius * Math.sin(phi) * Math.cos(theta),
      2.4 + radius * Math.cos(phi) * 0.7,
      radius * Math.sin(phi) * Math.sin(theta),
    ];
  };

  // The pin: points on a surface of revolution, lit from the upper left.
  const pin = new Cloud();
  const light = new THREE.Vector3(-0.6, 0.7, 0.5).normalize();
  const normal = new THREE.Vector3();
  let placed = 0;
  while (placed < 1500) {
    const h = random(0, TOP);
    const r = pinRadius(h);
    if (random() > r / PIN.sphereRadius) continue; // denser where the pin is wider
    const angle = random(0, Math.PI * 2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (h > JOIN_HEIGHT) normal.set(x, h - PIN.sphereCentre, z).normalize();
    else normal.set(Math.cos(angle), 0.45, Math.sin(angle)).normalize();
    const shade = 0.3 + 0.7 * Math.max(0, normal.dot(light));
    pin.add(x, h, z, { shade, size: 0.06, from: scattered() });
    placed += 1;
  }
  // The pin's saffron centre.
  for (let i = 0; i < 140; i += 1) {
    const theta = random(0, Math.PI * 2);
    const phi = Math.acos(random(-1, 1));
    const r = 0.42;
    pin.add(
      r * Math.sin(phi) * Math.cos(theta),
      PIN.sphereCentre + r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
      {
        kind: KIND.accent,
        size: 0.07,
        from: scattered(),
      },
    );
  }
  const pinMaterial = material();
  group.add(new THREE.Points(pin.geometry(), pinMaterial));

  const floor = new THREE.Points(addFloor(new Cloud(), { halfX: 9, halfZ: 7, step: 0.75 }).geometry(), material());
  group.add(floor);

  // Ripples spreading out from the tip.
  const rippleCloud = new Cloud();
  for (let i = 0; i < RIPPLES * RIPPLE_POINTS; i += 1) rippleCloud.add(0, 0, 0, { kind: KIND.accent, size: 0.05 });
  const rippleGeometry = rippleCloud.geometry();
  const ripplePositions = rippleGeometry.attributes.position.array;
  const rippleShades = rippleGeometry.attributes.aShade.array;
  const rippleSizes = rippleGeometry.attributes.aSize.array;
  const rippleMaterial = material();
  group.add(new THREE.Points(rippleGeometry, rippleMaterial));

  return {
    update({ time, pointer, input, aspect, shownFor }) {
      frameCamera(camera, {
        target: [0, 2, 0],
        halfWidth: 4,
        halfHeight: 3.1,
        fill: aspect < 0.9 ? 0.95 : 0.88,
        x: input.x ?? 0.5,
        pitch: 0.32 - pointer.y * 0.04,
        yaw: pointer.x * 0.12,
      });
      group.rotation.y = time * 0.18;

      const settle = easeOutCubic((shownFor - 0.2) / 2.6);
      pinMaterial.uniforms.uMorph.value = settle;

      // Ripples only start once the pin has landed.
      rippleMaterial.uniforms.uOpacity.value = settle;
      for (let ring = 0; ring < RIPPLES; ring += 1) {
        const phase = (time * 0.22 + ring / RIPPLES) % 1;
        const radius = 0.4 + phase * 5.5;
        for (let i = 0; i < RIPPLE_POINTS; i += 1) {
          const angle = (i / RIPPLE_POINTS) * Math.PI * 2;
          const index = ring * RIPPLE_POINTS + i;
          ripplePositions.set([Math.cos(angle) * radius, 0.01, Math.sin(angle) * radius], index * 3);
          // Fade by shade (dark theme) and by size (light theme draws shade as opacity floor).
          rippleShades[index] = 1 - phase;
          rippleSizes[index] = 0.06 * (1 - phase);
        }
      }
      rippleGeometry.attributes.position.needsUpdate = true;
      rippleGeometry.attributes.aShade.needsUpdate = true;
      rippleGeometry.attributes.aSize.needsUpdate = true;
    },
  };
}
