"use client";
/**
 * 2D P&ID schematic — the SCADA-style alternative to the 3D model.
 * Equipment + animated process streams + ISA instrument bubbles whose ring colour
 * tracks the live alarm state (green / yellow / red, flashing red on critical).
 */
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";
import type { ProcessAlarm } from "@/lib/processes";

type Sev = ProcessAlarm["severity"] | undefined;
const sevColor = (sev: Sev) => (sev === "critical" ? "#ef4444" : sev === "warning" ? "#f59e0b" : "#34d399");

function Stream({ points }: { points: string }) {
  return (
    <g>
      <polyline points={points} fill="none" stroke="#26323f" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" markerEnd="url(#pidArrow)" className="animate-flow" opacity={0.85} />
    </g>
  );
}

function Vessel({ x, y, w, h, label, stroke = "#3a4a5c" }: { x: number; y: number; w: number; h: number; label: string; stroke?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="url(#pidVessel)" stroke={stroke} strokeWidth={2} />
      <text x={x + w / 2} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">
        {label}
      </text>
    </g>
  );
}

function Bubble({ x, y, tag, value, unit, sev }: { x: number; y: number; tag: string; value: string; unit?: string; sev: Sev }) {
  const c = sevColor(sev);
  return (
    <g className={sev === "critical" ? "animate-pulse" : ""}>
      <line x1={x} y1={y - 28} x2={x} y2={y - 22} stroke="#5b6b7d" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={22} fill="#0f151e" stroke={c} strokeWidth={2.5} />
      <line x1={x - 22} y1={y} x2={x + 22} y2={y} stroke={c} strokeWidth={1} opacity={0.45} />
      <text x={x} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill={c} fontFamily="ui-monospace,monospace">{tag}</text>
      <text x={x} y={y + 13} textAnchor="middle" fontSize={9} fill="#e6edf5" fontFamily="ui-monospace,monospace">
        {value}
        {unit}
      </text>
    </g>
  );
}

export function PidView() {
  const { t } = useTranslation();
  const pid = useSimStore((s) => s.activeProcessId);
  const params = useSimStore((s) => s.params[s.activeProcessId]);
  const outputs = useSimStore((s) => s.outputs);
  const alarms = useSimStore((s) => s.alarms);
  const sevOf = (id: string): Sev => alarms.find((a) => a.id === id)?.severity;
  const f = (n: number | undefined, d = 0) => (n ?? 0).toFixed(d);

  return (
    <div className="h-full overflow-auto bg-base p-4">
      <div className="panel mx-auto max-w-[1080px]">
        <div className="panel-header">
          <h3 className="text-sm font-semibold text-ink">P&amp;ID — {t(`process.${pid}.name`)}</h3>
          <span className="chip">{t(`process.${pid}.tagline`)}</span>
        </div>
        <div className="p-2">
          <svg viewBox="0 0 1000 460" className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="pidArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee" />
              </marker>
              <linearGradient id="pidVessel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#1b2532" />
                <stop offset="0.5" stopColor="#243140" />
                <stop offset="1" stopColor="#161e29" />
              </linearGradient>
            </defs>

            {pid === "oil" && (
              <>
                {/* process streams — strictly orthogonal */}
                <Stream points="88,340 116,340" />
                <Stream points="164,340 205,340" />
                <Stream points="285,338 320,338" />
                <Stream points="375,338 405,332" />
                <Stream points="495,318 530,318 530,300 560,300" />
                <Stream points="578,74 578,54 705,54 705,60" />
                <Stream points="810,58 900,58 900,95" />
                <Stream points="600,360 700,360" />

                {/* emergency flare relief header (amber, orthogonal) */}
                <polyline points="628,86 628,30 960,30 960,138" fill="none" stroke="#d9a441" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                <text x={800} y={24} textAnchor="middle" fontSize={9} fill="#d9a441" fontFamily="ui-monospace,monospace">flare header</text>

                {/* equipment, upstream → downstream */}
                <Vessel x={24} y={300} w={64} h={80} label="TK-101" />
                <g>
                  <circle cx={140} cy={340} r={22} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <path d="M129,329 L156,340 L129,351 Z" fill="#22d3ee" opacity={0.8} />
                  <text x={140} y={382} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">P-101</text>
                </g>
                <Vessel x={205} y={305} w={80} h={70} label="V-102" />
                <Vessel x={320} y={308} w={55} h={62} label="E-101" />
                <Vessel x={405} y={250} w={90} h={120} label="H-101" />
                <text x={450} y={335} textAnchor="middle" fontSize={9} fill="#8295ab">furnace</text>
                <Vessel x={560} y={70} w={70} h={320} label="C-101" />
                {[110, 145, 180, 215, 250, 290, 330, 365].map((yy) => (
                  <line key={yy} x1={562} y1={yy} x2={628} y2={yy} stroke="#3a4a5c" strokeWidth={1.1} />
                ))}
                <Vessel x={690} y={40} w={120} h={38} label="EA-101" />
                <Vessel x={850} y={95} w={95} h={56} label="D-101" />
                <Vessel x={700} y={330} w={90} h={60} label="D-102" />
                {/* flare stack */}
                <g>
                  <rect x={954} y={140} width={12} height={240} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={1.5} />
                  <path d="M952,140 L960,106 L968,140 Z" fill="#ff7a1e" />
                  <text x={960} y={398} textAnchor="middle" fontSize={10} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">FL-101</text>
                </g>

                {/* instrument bubbles — ring colour tracks the alarm state */}
                <Bubble x={70} y={255} tag="FI" value={f(params.oilFeedRate)} unit="" sev={sevOf("oilFeedRate")} />
                <Bubble x={140} y={262} tag="SIC" value={f(params.crudePumpSpeed)} unit="%" sev={sevOf("crudePumpSpeed")} />
                <Bubble x={245} y={258} tag="AIC" value={f(params.desalterWater, 1)} unit="%" sev={sevOf("desalterWater")} />
                <Bubble x={450} y={212} tag="TIC" value={f(params.oilFurnaceTemp)} unit="°C" sev={sevOf("oilFurnaceTemp")} />
                <Bubble x={600} y={45} tag="PIC" value={f(params.oilColumnPressure)} unit="kPa" sev={sevOf("oilColumnPressure")} />
                <Bubble x={665} y={165} tag="AI" value={f(outputs.oilSeparation, 0)} unit="%" sev={sevOf("oilSeparation")} />
                <Bubble x={750} y={120} tag="SI" value={f(params.airCoolerRpm)} unit="" sev={sevOf("airCoolerRpm")} />
                <Bubble x={960} y={255} tag="HS" value={f(params.flareValve)} unit="%" sev={sevOf("flareValve")} />
              </>
            )}

            {pid === "cement" && (
              <>
                {/* solids conveyors + gas streams */}
                <Stream points="94,335 130,320" />
                <Stream points="222,300 272,250" />
                <Stream points="305,360 360,300" />
                <Stream points="642,300 660,322" />
                <Stream points="770,332 800,322" />
                {/* kiln exhaust → baghouse / stack */}
                <polyline points="290,80 210,80 210,54" fill="none" stroke="#8a8f98" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                <text x={252} y={46} textAnchor="middle" fontSize={9} fill="#8a8f98" fontFamily="ui-monospace,monospace">kiln exhaust</text>

                {/* equipment, upstream → downstream */}
                <Vessel x={24} y={300} w={70} h={72} label="CR-101" />
                <Vessel x={130} y={250} w={92} h={122} label="RM-201" />
                <Vessel x={272} y={70} w={70} h={300} label="PH-301" />
                {[112, 168, 224, 286].map((yy, i) => (
                  <circle key={i} cx={350} cy={yy} r={13} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={1.5} />
                ))}
                {/* rotary kiln (inclined) */}
                <g>
                  <rect x={360} y={250} width={282} height={50} rx={24} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} transform="rotate(4 500 275)" />
                  {[400, 470, 540, 600].map((xx) => (
                    <line key={xx} x1={xx} y1={248} x2={xx + 20} y2={302} stroke="#3a4a5c" strokeWidth={1.4} />
                  ))}
                  <text x={500} y={238} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">KL-401</text>
                </g>
                <Vessel x={660} y={300} w={110} h={72} label="CL-501" />
                <Vessel x={800} y={250} w={120} h={122} label="CM-701" />
                {/* baghouse + stack */}
                <g>
                  <rect x={186} y={54} width={48} height={30} rx={4} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={1.5} />
                  <rect x={204} y={6} width={12} height={50} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={1.5} />
                  <text x={210} y={98} textAnchor="middle" fontSize={9} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">BF-601</text>
                </g>

                {/* instrument bubbles — ring colour tracks the alarm state */}
                <Bubble x={175} y={222} tag="WIC" value={f(params.rawFeedRate)} unit="t/h" sev={sevOf("rawFeedRate")} />
                <Bubble x={230} y={120} tag="SIC" value={f(params.idFanSpeed)} unit="%" sev={sevOf("idFanSpeed")} />
                <Bubble x={305} y={175} tag="AI" value={f(outputs.cementFreeLime, 2)} unit="%" sev={sevOf("cementFreeLime")} />
                <Bubble x={430} y={172} tag="SIC" value={f(params.kilnSpeed, 1)} unit="rpm" sev={sevOf("kilnSpeed")} />
                <Bubble x={510} y={172} tag="TI" value={f(outputs.cementBurnTemp)} unit="°C" sev={sevOf("cementBurnTemp")} />
                <Bubble x={600} y={172} tag="FIC" value={f(params.burnerFuelRate, 1)} unit="t/h" sev={sevOf("burnerFuelRate")} />
              </>
            )}

            {pid === "cstr" && (
              <>
                <Stream points="120,250 170,250 170,250 210,250" />
                <Stream points="250,250 300,250 300,220 350,220" />
                <Stream points="470,250 540,250 540,160 590,160" />
                <Stream points="640,90 760,90 760,120" />
                <Stream points="640,330 760,330 760,300 820,300" />
                <Vessel x={60} y={210} w={60} h={90} label="T-101" />
                <circle cx={230} cy={250} r={26} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                <path d="M218,238 L246,250 L218,262 Z" fill="#22d3ee" opacity={0.8} />
                <text x={230} y={300} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">P-101</text>
                {/* reactor with jacket + agitator */}
                <rect x={350} y={185} width={120} height={150} rx={14} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                <line x1={410} y1={185} x2={410} y2={290} stroke="#8295ab" strokeWidth={2} />
                <line x1={392} y1={290} x2={428} y2={290} stroke="#8295ab" strokeWidth={3} />
                <text x={410} y={172} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">R-101</text>
                <Vessel x={590} y={80} w={70} h={260} label="C-101" />
                <Vessel x={760} y={110} w={80} h={70} label="D-101" />
                <Vessel x={760} y={290} w={80} h={70} label="D-102" />
                <Bubble x={380} y={150} tag="TIC" value={f(outputs.cstrReactorT)} unit="K" sev={sevOf("cstrReactorT")} />
                <Bubble x={440} y={150} tag="PI" value={f(outputs.cstrPressure, 1)} unit="bar" sev={sevOf("cstrPressure")} />
                <Bubble x={520} y={400} tag="AI" value={f(outputs.cstrConversion)} unit="%" sev={sevOf("cstrConversion")} />
                <Bubble x={170} y={210} tag="FIC" value={f(params.cstrFeedFlow)} unit="" sev={sevOf("cstrFeedFlow")} />
              </>
            )}

            {pid === "boiler" && (
              <>
                {/* streams */}
                <Stream points="148,330 235,330 235,150 358,118" />
                <Stream points="560,105 642,105 642,168 718,150" />
                <Stream points="540,250 660,250 660,132" />

                {/* steam drum (horizontal) with water-level line */}
                <g>
                  <rect x={360} y={82} width={200} height={50} rx={25} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <line x1={368} y1={114} x2={552} y2={114} stroke="#2f9fe0" strokeWidth={2} opacity={0.7} />
                  <text x={460} y={72} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">D-301</text>
                </g>
                {/* furnace + water-walls + flame */}
                <g>
                  <rect x={390} y={166} width={150} height={172} rx={6} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  {[410, 430, 450, 470, 490, 510].map((xx) => (
                    <line key={xx} x1={xx} y1={172} x2={xx} y2={331} stroke="#3a4a5c" strokeWidth={1} />
                  ))}
                  <path d="M443,322 L465,284 L487,322 Z" fill="#ff7a1e" />
                  <path d="M454,322 L465,300 L476,322 Z" fill="#ffd24a" />
                  <text x={465} y={356} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">F-301</text>
                </g>
                <Vessel x={566} y={150} w={48} h={56} label="SH-301" />
                {/* feedwater pump */}
                <g>
                  <circle cx={120} cy={330} r={22} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <path d="M109,319 L136,330 L109,341 Z" fill="#38bdf8" opacity={0.85} />
                  <text x={120} y={372} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">P-301</text>
                </g>
                {/* turbine + generator */}
                <g>
                  <path d="M718,134 L718,166 L772,182 L772,118 Z" fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <rect x={774} y={132} width={52} height={36} rx={4} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <text x={780} y={206} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">T-301 · G</text>
                </g>
                {/* stack */}
                <g>
                  <rect x={652} y={42} width={16} height={92} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={1.5} />
                  <text x={660} y={34} textAnchor="middle" fontSize={9} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">ST-301</text>
                </g>

                {/* instrument bubbles */}
                <Bubble x={398} y={54} tag="PIC" value={f(outputs.boilerSteamP)} unit="bar" sev={sevOf("boilerSteamP")} />
                <Bubble x={524} y={54} tag="LIC" value={f(outputs.boilerDrumLevel)} unit="%" sev={sevOf("boilerDrumLevel")} />
                <Bubble x={465} y={404} tag="FIC" value={f(params.boilerFuelRate, 1)} unit="t/h" sev={sevOf("boilerFuelRate")} />
                <Bubble x={610} y={262} tag="AI" value={f(outputs.boilerO2, 1)} unit="%" sev={sevOf("boilerO2")} />
                <Bubble x={78} y={288} tag="FIC" value={f(params.feedwaterFlow)} unit="t/h" sev={sevOf("feedwaterFlow")} />
                <Bubble x={768} y={84} tag="JI" value={f(outputs.boilerSteamFlow)} unit="t/h" sev={sevOf("boilerSteamFlow")} />
              </>
            )}

            {pid === "gsp" && (
              <>
                {/* header backbones */}
                <polyline points="120,118 500,118" fill="none" stroke="#5b7e92" strokeWidth={5} strokeLinecap="round" opacity={0.45} />
                <text x={300} y={108} textAnchor="middle" fontSize={9} fill="#5b7e92" fontFamily="ui-monospace,monospace">gas header</text>
                <polyline points="500,408 888,408" fill="none" stroke="#d9a441" strokeWidth={4} strokeLinecap="round" opacity={0.5} />
                <text x={690} y={426} textAnchor="middle" fontSize={9} fill="#d9a441" fontFamily="ui-monospace,monospace">NGL header</text>

                {/* process streams — strictly orthogonal */}
                <Stream points="120,322 160,322" />
                <Stream points="183,70 183,52 275,52 275,250" />
                <Stream points="300,260 372,260" />
                <Stream points="442,192 500,192" />
                <Stream points="542,356 620,356" />
                <Stream points="660,356 735,356" />
                <Stream points="773,356 850,356" />

                {/* slug catcher (horizontal bullets) */}
                <g>
                  <rect x={26} y={304} width={94} height={40} rx={20} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <text x={73} y={362} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">SC-101</text>
                </g>
                {/* amine tower */}
                <Vessel x={160} y={70} w={46} h={300} label="T-201" />
                {/* dehydration beds (3 cylinders) */}
                <g>
                  {[250, 268, 286].map((xx, i) => (
                    <rect key={i} x={xx} y={250} width={14} height={92} rx={6} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={1.4} />
                  ))}
                  <text x={275} y={360} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">V-301</text>
                </g>
                {/* cold box (braced) */}
                <g>
                  <rect x={372} y={150} width={70} height={130} rx={4} fill="url(#pidVessel)" stroke="#3a4a5c" strokeWidth={2} />
                  <line x1={372} y1={150} x2={442} y2={280} stroke="#3a4a5c" strokeWidth={1} />
                  <line x1={442} y1={150} x2={372} y2={280} stroke="#3a4a5c" strokeWidth={1} />
                  <text x={407} y={300} textAnchor="middle" fontSize={11} fontWeight={600} fill="#e6edf5" fontFamily="ui-monospace,monospace">E-401</text>
                </g>
                {/* fractionation train */}
                <Vessel x={500} y={80} w={42} h={290} label="C-501" />
                <Vessel x={620} y={100} w={40} h={270} label="C-502" />
                <Vessel x={735} y={120} w={38} h={250} label="C-503" />
                <Vessel x={850} y={140} w={38} h={230} label="C-504" />

                {/* instrument bubbles — ring colour tracks the alarm state */}
                <Bubble x={73} y={262} tag="FIC" value={f(params.rawGasFeed)} unit="" sev={sevOf("rawGasFeed")} />
                <Bubble x={138} y={150} tag="FIC" value={f(params.amineCirculation)} unit="" sev={sevOf("amineCirculation")} />
                <Bubble x={236} y={92} tag="AI" value={f(outputs.gspCO2Slip)} unit="ppm" sev={sevOf("gspCO2Slip")} />
                <Bubble x={407} y={120} tag="PdC" value={f(params.expanderPressureDrop, 1)} unit="bar" sev={sevOf("expanderPressureDrop")} />
                <Bubble x={462} y={250} tag="JI" value={f(outputs.gspCompPower, 1)} unit="MW" sev={sevOf("gspCompPower")} />
                <Bubble x={521} y={56} tag="TIC" value={f(params.demethanizerTemp)} unit="°C" sev={sevOf("demethanizerTemp")} />
                <Bubble x={578} y={300} tag="AI" value={f(outputs.gspC2Recovery, 1)} unit="%" sev={sevOf("gspC2Recovery")} />
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
