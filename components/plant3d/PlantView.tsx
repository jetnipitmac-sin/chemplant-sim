"use client";
/** Client wrapper that loads the WebGL scene only in the browser (no SSR). */
import dynamic from "next/dynamic";

const PlantScene = dynamic(() => import("./PlantScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-base">
      <div className="flex flex-col items-center gap-3 text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-brand" />
        <span className="text-sm">Initializing 3D plant…</span>
      </div>
    </div>
  ),
});

export default function PlantView() {
  return <PlantScene />;
}
