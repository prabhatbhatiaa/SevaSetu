import { useEffect, useRef } from 'react';
import { mountScene } from './engine';
import bridge from './scenes/bridge';
import converge from './scenes/converge';
import orbit from './scenes/orbit';
import route from './scenes/route';
import signals from './scenes/signals';
import skyline from './scenes/skyline';

const SCENES = { bridge, converge, orbit, route, signals, skyline };

/** Mounts one named scene into a full-size canvas. Loaded lazily by <Scene>. */
export default function SceneRuntime({ name, input }) {
  const containerRef = useRef(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    const setup = SCENES[name];
    if (!setup || !containerRef.current) return undefined;
    return mountScene(containerRef.current, setup, () => inputRef.current);
  }, [name]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
