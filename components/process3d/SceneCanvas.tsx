"use client";
/** Reusable R3F canvas: lighting, IBL environment, ground, orbit camera, gizmo,
 *  an XR-ready wrapper and the translated AR/VR + hint HUD. */
import { Suspense, useEffect, useState } from "react";
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
import { useTranslation } from "react-i18next";

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.35} color="#bcd4ff" groundColor="#05070b" />
      <directionalLight position={[16, 22, 10]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002}>
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.1, 80]} />
      </directionalLight>
      <spotLight position={[-16, 18, -8]} angle={0.6} penumbra={0.9} intensity={220} color="#22d3ee" distance={80} />
    </>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
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
        fadeDistance={80}
        fadeStrength={1.6}
        infiniteGrid
      />
    </>
  );
}

interface XrLike {
  enterAR: () => Promise<unknown>;
  enterVR: () => Promise<unknown>;
}

function XRButtons({ store }: { store: XrLike }) {
  const { t } = useTranslation();
  const [support, setSupport] = useState({ ar: false, vr: false });
  useEffect(() => {
    const xr = (navigator as unknown as { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } }).xr;
    if (!xr?.isSessionSupported) return;
    let alive = true;
    Promise.all([
      xr.isSessionSupported("immersive-ar").catch(() => false),
      xr.isSessionSupported("immersive-vr").catch(() => false),
    ]).then(([ar, vr]) => alive && setSupport({ ar: !!ar, vr: !!vr }));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
      <span className="chip">XR</span>
      <button className="btn btn-primary" onClick={() => store.enterAR().catch(() => {})} disabled={!support.ar} title={support.ar ? t("common.enterAR") : t("common.xrUnavailable")}>
        ◈ {t("common.enterAR")}
      </button>
      <button className="btn" onClick={() => store.enterVR().catch(() => {})} disabled={!support.vr} title={support.vr ? t("common.enterVR") : t("common.xrUnavailable")}>
        ▣ {t("common.enterVR")}
      </button>
    </div>
  );
}

export function SceneCanvas({
  children,
  camera = [18, 13, 22],
  target = [0, 4, 0],
  fog = [48, 140],
  far = 260,
  maxDistance = 100,
}: {
  children: React.ReactNode;
  camera?: [number, number, number];
  target?: [number, number, number];
  /** Fog [near, far]; larger values suit spread-out scenes (e.g. the CDU). */
  fog?: [number, number];
  far?: number;
  maxDistance?: number;
}) {
  const [store] = useState(() => createXRStore({ emulate: false }));
  const { t } = useTranslation();
  return (
    <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 1.8]} camera={{ position: camera, fov: 45, near: 0.1, far }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <color attach="background" args={["#070b11"]} />
        <fog attach="fog" args={["#070b11", fog[0], fog[1]]} />
        <Suspense fallback={null}>
          <XR store={store}>
            <Lights />
            {children}
            <Ground />
            <ContactShadows position={[0, 0.02, 0]} opacity={0.5} scale={100} blur={2.4} far={26} />
            <Environment resolution={256}>
              <Lightformer intensity={2.2} position={[0, 10, -6]} scale={[16, 10, 1]} color="#9fd0ff" />
              <Lightformer intensity={1.2} position={[-10, 4, 8]} scale={[10, 6, 1]} color="#ffffff" />
              <Lightformer intensity={1.6} position={[10, 6, 5]} scale={[8, 6, 1]} color="#bfefff" />
            </Environment>
          </XR>
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={maxDistance} maxPolarAngle={Math.PI / 2.05} target={target} />
        <GizmoHelper alignment="bottom-right" margin={[64, 72]}>
          <GizmoViewport axisColors={["#ef4444", "#34d399", "#22d3ee"]} labelColor="#0b0f16" />
        </GizmoHelper>
      </Canvas>
      <span className="chip pointer-events-none absolute left-4 top-4">{t("common.dragHint")}</span>
      <XRButtons store={store} />
    </div>
  );
}
