"use client";
/**
 * Motion effects for the cement plant:
 *  • StackSmoke  — a lightweight GPU-points particle plume (continuous exhaust
 *    out of the baghouse stack; density gated live by the ID-fan draft).
 *  • makeBeltTexture — a repeating chevron texture whose `offset` the conveyors
 *    animate to simulate raw material running along the belt.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type Vec3 = [number, number, number];

function makeSmokeSprite(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/** Continuous smoke / dust plume rendered as recycled GPU points. */
export function StackSmoke({
  position = [0, 0, 0],
  count = 64,
  color = "#c8cdd4",
  rise = 16,
  spread = 2.4,
  baseSize = 2.6,
  getDensity,
}: {
  position?: Vec3;
  count?: number;
  color?: string;
  rise?: number;
  spread?: number;
  baseSize?: number;
  /** 0..~1.2 density gate sampled every frame (live store read). */
  getDensity?: () => number;
}) {
  const { geom, mat, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const seeds = Array.from({ length: count }, () => ({
      ph: Math.random(),
      x: Math.random() * 2 - 1,
      z: Math.random() * 2 - 1,
      sp: 0.6 + Math.random() * 0.7,
      sway: Math.random() * Math.PI * 2,
    }));
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uMap: { value: makeSmokeSprite() },
        uScale: { value: 720 },
      },
      vertexShader: `
        attribute float aSize; attribute float aAlpha; varying float vA;
        uniform float uScale;
        void main() {
          vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform sampler2D uMap; varying float vA;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(uColor, t.a * vA);
        }`,
    });
    return { geom, mat, seeds };
  }, [count, color]);

  useFrame(({ clock }) => {
    const d = getDensity ? Math.max(0, getDensity()) : 0.5;
    const t = clock.elapsedTime;
    const pos = geom.attributes.position.array as Float32Array;
    const sz = geom.attributes.aSize.array as Float32Array;
    const al = geom.attributes.aAlpha.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const life = (t * 0.11 * s.sp + s.ph) % 1;
      const w = spread * (0.25 + life);
      pos[i * 3] = s.x * w + Math.sin(t * 0.6 + s.sway) * life * 0.9;
      pos[i * 3 + 1] = life * rise;
      pos[i * 3 + 2] = s.z * w;
      sz[i] = baseSize * (0.4 + life * 1.7);
      al[i] = (1 - life) * 0.55 * Math.min(1.1, d);
    }
    geom.attributes.position.needsUpdate = true;
    geom.attributes.aSize.needsUpdate = true;
    geom.attributes.aAlpha.needsUpdate = true;
  });

  return <points position={position} geometry={geom} material={mat} frustumCulled={false} />;
}

/** Repeating chevron belt texture; tiles along V, animate `offset.y` for flow. */
export function makeBeltTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2b313a";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#363d47";
  g.fillRect(0, 0, 64, 32);
  g.strokeStyle = "#c79a2e";
  g.lineWidth = 7;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(8, 46);
  g.lineTo(32, 22);
  g.lineTo(56, 46);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
