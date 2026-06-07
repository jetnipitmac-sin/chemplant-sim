"use client";
/**
 * Custom fluid ShaderMaterial for the CSTR interior (X-ray view).
 * Domain-warped fbm convection; colour ramps calm blue → boiling red and bubble
 * intensity/flow speed scale with the live reactor temperature (uHeat 0..1).
 */
import { useRef } from "react";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulationStore";

const FluidMaterial = shaderMaterial(
  { uTime: 0, uHeat: 0, uColorCool: new THREE.Color("#1f74ff"), uColorHot: new THREE.Color("#ff3416") },
  // vertex
  /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment
  /* glsl */ `
    uniform float uTime;
    uniform float uHeat;
    uniform vec3 uColorCool;
    uniform vec3 uColorHot;
    varying vec3 vPos;

    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x){
      vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                     mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                     mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
    float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

    void main(){
      float speed = 0.25 + uHeat * 1.9;
      // convection rising along +y, turbulence grows with heat
      vec3 q = vec3(vPos.x * 1.4, vPos.y * 1.1 - uTime * speed, vPos.z * 1.4);
      float turb = fbm(q + fbm(q * 0.6 + uTime * 0.2));      // domain warp
      float boil = smoothstep(0.55 - uHeat * 0.3, 0.92, turb);
      float mixv = clamp(uHeat * 0.6 + turb * 0.5 * uHeat + boil * 0.7, 0.0, 1.0);
      vec3 col = mix(uColorCool, uColorHot, mixv);
      // bright bubbles when hot
      float bubbles = smoothstep(0.8, 0.85, fract(turb * 3.0 + uTime * speed)) * uHeat;
      col += bubbles * vec3(1.0, 0.65, 0.35);
      float glow = 0.55 + uHeat * 0.8 + boil * 0.5;
      gl_FragColor = vec4(col * glow, 0.9);
    }
  `,
);

extend({ FluidMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      fluidMaterial: any;
    }
  }
}

export function ReactorFluid({
  radius,
  height,
  position,
}: {
  radius: number;
  height: number;
  position: [number, number, number];
}) {
  const mat = useRef<any>(null);
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const temp = useSimulationStore.getState().snapshot?.equipment["R-101"]?.temperature ?? 320;
    const heat = Math.min(1, Math.max(0, (temp - 305) / 120));
    m.uTime += dt * (0.5 + heat * 2.5);
    m.uHeat += (heat - m.uHeat) * 0.05; // ease toward target
  });
  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, height, 40, 1]} />
      <fluidMaterial ref={mat} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}
