"use client";
/** The React Three Fiber canvas: lighting, image-based environment, shadows,
 *  orbit camera, an XR-ready wrapper, and the DOM HUD overlays. */
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import { createXRStore, XR } from "@react-three/xr";
import { PlantModel } from "./PlantModel";
import { SceneOverlay, XRControls } from "./SceneHud";

// One XR store, shared between the <XR> wrapper and the AR/VR buttons.
// `emulate: false` suppresses the dev-only emulator overlay; our own AR/VR
// buttons (gated by navigator.xr support detection) drive session entry.
const xrStore = createXRStore({ emulate: false });

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.35} color="#bcd4ff" groundColor="#05070b" />
      <directionalLight
        position={[14, 20, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      >
        <orthographicCamera attach="shadow-camera" args={[-26, 26, 26, -26, 0.1, 70]} />
      </directionalLight>
      <spotLight position={[-14, 16, -8]} angle={0.6} penumbra={0.9} intensity={220} color="#22d3ee" distance={70} />
    </>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#0a0e15" metalness={0.25} roughness={0.9} />
      </mesh>
      <Grid
        position={[0, 0.012, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#1b2734"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#1f6f8b"
        fadeDistance={70}
        fadeStrength={1.6}
        infiniteGrid
      />
    </>
  );
}

export default function PlantScene() {
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: [24, 16, 28], fov: 45, near: 0.1, far: 220 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#070b11"]} />
        <fog attach="fog" args={["#070b11", 42, 120]} />
        <Suspense fallback={null}>
          <XR store={xrStore}>
            <Lights />
            <PlantModel />
            <Ground />
            <ContactShadows position={[0, 0.02, 0]} opacity={0.55} scale={80} blur={2.4} far={22} />
            <Environment resolution={256}>
              <Lightformer intensity={2.2} position={[0, 9, -6]} scale={[14, 9, 1]} color="#9fd0ff" />
              <Lightformer intensity={1.2} position={[-9, 4, 7]} scale={[9, 6, 1]} color="#ffffff" />
              <Lightformer intensity={1.6} position={[9, 5, 5]} scale={[7, 6, 1]} color="#bfefff" />
            </Environment>
          </XR>
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.05}
          target={[-0.5, 4.5, 0]}
        />
        <GizmoHelper alignment="bottom-right" margin={[72, 96]}>
          <GizmoViewport axisColors={["#ef4444", "#34d399", "#22d3ee"]} labelColor="#0b0f16" />
        </GizmoHelper>
      </Canvas>
      <SceneOverlay />
      <XRControls store={xrStore} />
    </div>
  );
}
