import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { I18nProvider } from "@/components/providers/I18nProvider";

export const metadata: Metadata = {
  title: "ProSim Studio — Educational Industrial Process Simulator",
  description:
    "An interactive, config-driven industrial-process simulator for engineering education — five plants (Oil Refining, Cement Kiln, Power Boiler, Gas Separation, and a live CSTR reactor) with guided DCS-style controls, real-time alarms, trends & PID loops, 3D models and an AI process-engineer copilot. Bilingual EN/TH.",
  applicationName: "ProSim Studio",
  authors: [{ name: "Jetnipit Sinwisitsophon" }],
  creator: "Jetnipit Sinwisitsophon",
  keywords: [
    "process simulator",
    "chemical engineering",
    "DCS",
    "SCADA",
    "distillation",
    "rotary kiln",
    "power boiler",
    "gas separation",
    "CSTR",
    "PID control",
    "educational",
    "Next.js",
    "Three.js",
    "Mahidol University",
  ],
  openGraph: {
    title: "ProSim Studio — Educational Industrial Process Simulator",
    description:
      "Five interactive industrial plants with guided controls, live alarms & trends, PID loops, 3D models and an AI process-engineer copilot. Bilingual EN/TH.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b11",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
