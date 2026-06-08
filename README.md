# ProSim Studio — Educational Multi-Process Industrial Simulator

[![Live Demo](https://img.shields.io/badge/Live%20Demo-chemplant--sim.vercel.app-2dd4bf?logo=vercel&logoColor=white)](https://chemplant-sim.vercel.app)

**🔗 Live demo: [chemplant-sim.vercel.app](https://chemplant-sim.vercel.app)**

An interactive, **config-driven** simulator for teaching industrial processes. Pick a process,
adjust **guided sliders** (each with a recommended green zone and a plain-language explanation),
and watch a **consequence engine** explain what goes wrong when you leave the optimal range — all
in **Thai or English**, beside a live **3D model** of the plant.

### Processes
| | Process | Model |
|---|---|---|
| 🛢️ | **Oil Refining** | Crude Distillation Unit — realistic Z-spine layout, fractionator with 8 textbook cuts |
| 🏭 | **Cement Manufacturing** | Dry-process kiln line — crusher → raw mill → preheater tower → rotary kiln → clinker cooler → cement mill, with ID-fan/baghouse |
| 🔥 | **Power Boiler** | Water-tube steam plant — furnace, steam drum, superheater, turbine & stack; the classic two-loop pressure & level control problem |
| 💨 | **Gas Separation Plant** | Cryogenic NGL recovery — slug catcher → amine tower → dehydration → cold box/turbo-expander → demethanizer/deethanizer/depropanizer/debutanizer, around a central pipe rack |
| ⚗️ | **Chemical Reactor** | Live CSTR (real ODE worker) — exothermic A→B with runaway risk |

### Live metrics & trends
Every metric below is recomputed each tick (~2.5 Hz) and streamed to the rolling history buffer. **⚠** = warning, **⛔** = danger limit (drives the alarm + the trend `ReferenceLine`).

**🛢️ Oil Refining** — live trend: **`YieldTracker`** (pick one of 8 cuts; watch it against the ΔP & COT safety lines)

| Metric | Unit | Limits | Shown in |
|---|---|---|---|
| Separation Efficiency | % | ⚠ 70 · ⛔ 55 (low) | Live Outputs |
| Light Product Yield | % | — | Live Outputs |
| On-Spec Throughput | m³/h | — | Live Outputs |
| Energy Use | kWh/m³ | — | Live Outputs |
| **Column ΔP** | mbar | ⚠ 9 · ⛔ 12 (high) | YieldTracker — *flooding* line |
| **Coil-Outlet Temp (COT)** | °C | ⚠ 372 · ⛔ 386 (high) | YieldTracker — *cracking >370* line |
| **Overhead Pressure** | barg | ⚠ 2.2 · ⛔ 2.8 (high) | Live Outputs |
| 8 fraction yields (Gas → Bitumen) | % | — | YieldTracker pills + plotted line |

**🏭 Cement Manufacturing** — live trend: **`CementTrend`** (multi-Y-axis: % left · ppm right · kcal/kg hidden)

| Metric | Unit | Limits | Shown in |
|---|---|---|---|
| **Burning-Zone Temp** | °C | ⚠ 1530 · ⛔ 1560 (high) | Live Outputs |
| **Free Lime** | % | ⚠ 2.0 · ⛔ 3.0 (high) | Live Outputs |
| Alite (C₃S) | % | — | Live Outputs |
| **Belite (C₂S)** | % | — | CementTrend |
| **Exhaust CO** | ppm | ⚠ 400 · ⛔ 500 (high) | CementTrend — *500 ppm* line |
| **Kiln Torque** | % | ⚠ 85 · ⛔ 95 (high) | CementTrend |
| **Specific Heat** | kcal/kg | ⚠ 850 · ⛔ 1000 (high) | CementTrend |
| Clinker Output | t/h | — | Live Outputs |

**🔥 Power Boiler** — live trends: one **`TrendGraph`** per graphed output; two PID loops (pressure & level)

| Metric | Unit | Limits | Shown in |
|---|---|---|---|
| **Steam Pressure** | bar | ⚠ 112 · ⛔ 120 (high) | Live Outputs · PID PV (→ fuel) |
| **Drum Level** | % | ⚠ 30 · ⛔ 20 (low) | Live Outputs · PID PV (→ feedwater) |
| **Flue-Gas O₂** | % | ⚠ 1.5 · ⛔ 1.0 (low) | Live Outputs |
| Boiler Efficiency | % | — | Live Outputs |
| Steam Flow | t/h | — | Live Outputs |
| **NOₓ Emissions** | mg/Nm³ | ⚠ 350 · ⛔ 500 (high) | Live Outputs |
| Stack Temp | °C | ⚠ 250 · ⛔ 300 (high) | Live Outputs |

**💨 Gas Separation Plant** — live trend: **`GspYieldTracker`** (pick one of 5 products; watch it against the CO₂-slip danger line + compression power); two PID loops (acid-gas & C₂ recovery)

| Metric | Unit | Limits | Shown in |
|---|---|---|---|
| **CO₂ Slip** | ppm | ⚠ 40 · ⛔ 50 (high) | GspYieldTracker — *off-spec* line · PID PV (→ amine) |
| **C₂ Recovery** | % | ⚠ 62 · ⛔ 48 (low) | Live Outputs · PID PV (→ expander ΔP) |
| **Compression Power** | MW | — | GspYieldTracker (right axis) |
| **Hydrate Risk** | % | ⚠ 40 · ⛔ 60 (high) | Live Outputs |
| 5 product yields (Sales Gas C₁ → Condensate C₅₊) | % | — | GspYieldTracker pills + plotted line |

**⚗️ CSTR** — live trends: one **`TrendGraph`** per output. Reactor Temp (K, ⚠ 395 · ⛔ 415) · Reactor Pressure (bar) · Conversion (%) · Production · Safety Score.

> **Process dynamics:** the algebraic processes are marked `dynamic`, so each output eases toward its
> steady-state target with its own time constant — lines **ramp, overshoot and settle** rather than step.
> Nudge a slider, flip a controller to **Auto**, or launch a mission to watch the pens move and cross the
> danger lines live.

## Tech stack
- **Next.js 14** (App Router) · **React 18** · **TypeScript**
- **Tailwind CSS** — dark industrial theme
- **Three.js / @react-three/fiber / drei** — 3D, with **@react-three/xr** (WebXR AR/VR)
- **Zustand** — state (`store/simStore.ts`); legacy ODE worker store for the CSTR
- **react-i18next** — full EN/TH internationalization
- **Recharts** — live real-time trend graphs for every process (interactive oil & gas yield trackers · multi-axis kiln trend · boiler & CSTR trends)

## The three features

1. **Multi-process architecture (dynamic context).** A sidebar selects the active process. Each
   process is a `ProcessConfig` (parameters, optimal ranges, consequence rules, formulas, outputs,
   3D scene). Switching a process swaps the **3D model, sliders, formulas, outputs and all text**.
2. **Smart educational simulation.** Raw inputs are replaced by `GuidedSlider`s that render the
   recommended band as a green zone, colour the thumb/value by severity, and expose an **info
   tooltip** per parameter. A `ConsequencePanel` turns out-of-range values into real-time
   physical/economic warnings (e.g. *“thermal cracking — fouling trays with coke”*), escalating
   warning → danger; the 3D flame even reddens.
3. **Internationalization (TH/EN).** Everything — labels, process names, tooltips, formulas, 3D
   nameplates and consequence warnings — is translated via react-i18next (`lib/i18n/{en,th}.ts`).

## DCS / SCADA layer

- **Deep parameters.** Units expose realistic controls with Optimal/Warning/Critical bands — e.g. the
  CSTR adds Agitator RPM & Coolant Flow (scale jacket UA), Catalyst Concentration (scales k) and System
  Pressure, all wired into the live ODE engine (`lib/simulation/engine.ts`).
- **Process dynamics (first-order lag).** Algebraic processes marked `dynamic: true` ease each output
  toward its steady-state target with a per-output time constant (`OutputDef.tau`) inside the sampler — so
  trends **ramp, overshoot and settle** like a real plant (slow thermal masses get a long τ; fast hydraulics
  a short one). The live CSTR already integrates true ODE dynamics.
- **PID control loops.** A process can declare `ControlLoop`s; the **`ControllerPanel`** puts each loop in
  **Auto/Manual**, sets the setpoint and exposes tunable **Kp/Ki/Kd**. In Auto the sampler's positional PID
  (MV-default bias + anti-windup + bumpless transfer) drives the manipulated param to hold the PV at setpoint —
  oil COT→furnace, cement BZT→fuel, **boiler pressure→fuel & drum-level→feedwater**, gas-plant CO₂→amine &
  C₂-recovery→expander ΔP. The MV's manual slider locks with an **AUTO** badge while the controller has it.
  Watch a real first-order-lag loop overshoot and settle.
- **Live trend graphs (per-process DCS views).** A rolling ~150-point buffer (`store.history`, filled
  ~2.5 Hz by the sampler) feeds real-time Recharts trends, tailored per process:
  - **Oil → `YieldTracker.tsx`** — a sleek grid of **8 clickable cut pills** (live yields); the selected
    fraction is plotted (auto-scaled) alongside the two safety pens **Column ΔP** (flooding) and
    **Coil-Outlet Temp** (cracking >370 °C), each with its own axis + red danger `ReferenceLine`.
  - **Cement → `CementTrend.tsx`** — a **multi-Y-axis** chart: Belite C₂S % + Kiln Torque % (left),
    Exhaust CO ppm (right, with a red **500 ppm** CO danger line) and Specific Heat on its own hidden
    scale; live value chips above the chart for at-a-glance reading.
  - **Gas → `GspYieldTracker.tsx`** — 5 clickable product pills (C₁–C₅₊); the selected yield is plotted
    against **CO₂ Slip** (red off-spec **50 ppm** line) and **Compression Power** on secondary axes.
  - **Boiler & CSTR → `TrendGraph.tsx`** — one trend per graphed output with warn/danger `ReferenceLine`s.

  CSV export of the whole buffer via `components/feedback/ExportButton.tsx`.
- **Alarm + scenario engine.** `evaluateAlarms` flags params/outputs past their limits → a flashing
  `AlarmBanner` + red scene border. `ScenarioBar` runs guided missions (e.g. *“Thermal Runaway Imminent —
  stabilise within 60 s”*): clear every critical alarm and hold safe before the clock runs out.
- **2D P&ID toggle.** `ViewToggle` (in the header) flips the scene between the 3D model and
  `components/pid/PidView.tsx`, an ISA-style schematic whose instrument bubbles recolour with the alarm state.
- **Formula Inspector + CSV export.** An ƒ tooltip on params/outputs shows the governing equation
  (**KaTeX**-typeset); the trend panel exports the live buffer to CSV.
- **Alarm journal & missions.** An *Alarms* tab (`AlarmLogPanel`) logs every raise/clear with
  timestamps, severity, duration and per-/bulk **Acknowledge** (with an unacked badge). Guided missions:
  **oil** — Cracking Crisis · Column Flooding · Flare Emergency · Condenser Failure · Cold Charge;
  **cement** — Underburning · Overheating · Dust Excursion; **boiler** — Low Drum Water · Overpressure ·
  Starved Combustion; **gas plant** — CO₂ Breakthrough · Cold-Box Freeze-Up · Recovery Collapse;
  **CSTR** — Runaway · Stall. Many trigger
  **matching 3D effects** (flare fire, furnace/stack smoke, overhead vapour, cold-charge haze). All
  governing equations are LaTeX rendered via KaTeX (`components/ui/Katex.tsx`).

## "Wow-factor" layer

- **Live plant economics.** A per-process P&L (`ProcessConfig.economics`) drives a glowing **$/hr profit
  ticker** + breakdown (`components/economics/Economics.tsx`), recomputed every tick by the sampler.
- **X-ray fluid shader.** A custom GLSL `shaderMaterial` (`components/plant3d/FluidShader.tsx`) renders
  turbulent convection inside the CSTR — calm blue → boiling red as the live reactor temperature rises;
  the X-ray toggle makes the vessel shell transparent.
- **DVR transport.** Global Play/Pause + 1× / 2× / 5× in the store, driving both the ODE worker and the
  sampler/scenario clock (`components/layout/DvrControls.tsx`).
- **AI "Chief Engineer" copilot.** `buildCopilotContext()` (`lib/copilot/context.ts`) serialises the full
  live state — `activeProcessId`, every **input** (value vs optimal + status), every **output**, active
  alarms, P&L and CO₂, plus (for oil) the live yields of **all 8 fractions**. `lib/copilot/format.ts`
  renders it into a readable `LIVE PLANT STATE` block that `app/api/copilot/route.ts` injects into the
  system prompt and forwards to an LLM (when `OPENAI_API_KEY` is set), else a state-aware rule engine
  answers (`lib/copilot/advisor.ts`). New model metrics flow in automatically (mapped from `ProcessConfig.outputs`).
- **CO₂ & sustainability.** A per-process `ProcessConfig.sustainability` computes live emissions (kg CO₂/hr,
  incl. cement's calcination CO₂) + a 0–100 sustainability score → an eco badge + a bar in the economics panel.
- **Save / share a run.** `lib/share.ts` encodes process + setpoints + language into a `?run=` URL (Share button);
  the page restores it on load.
- **Mission leaderboard.** Completing a scenario records a scored result (faster stabilise = higher) to a
  localStorage leaderboard (`components/scenario/Leaderboard.tsx`), opened from the 🏆 in the mission bar.

## Architecture

```
lib/processes/        ProcessConfig types + consequence/alarm engine + the 5 process configs
                      (pure data + model · τ first-order dynamics · PID ControlLoops)
lib/i18n/             en.ts / th.ts dictionaries + i18next config
lib/copilot/          context (live state → context) · format (LIVE PLANT STATE prompt block) · advisor (rule engine)
store/simStore.ts     language · activeProcessId · params · outputs · history · alarms · PID controllers (Zustand)
hooks/useOutputSampler  ~2.5 Hz loop: model(params) → first-order lag → outputs/alarms/economics → history;
                      also runs the PID control loops (drives MV params in Auto)
components/
  layout/             Sidebar (process selector), LanguageToggle, ProcessHeader, RightPanel, DvrControls
  controls/           GuidedSlider (green zone + info) · ParameterPanel · ControllerPanel (PID Auto/Manual + tuning)
  feedback/           OutputPanel · YieldTracker (oil) · CementTrend (cement, multi-axis) · GspYieldTracker (gas)
                      · TrendGraph (CSTR/boiler) · ExportButton (CSV) · ConsequencePanel · AlarmBanner · AlarmLogPanel
  theory/             FormulaPanel
  process3d/          SceneCanvas (shared) · RefineryScene · CementScene · BoilerScene · GasPlantScene · ProcessScene (switcher) · parts3d
    refinery/         CDU oil plant — realistic Z-spine layout (OilRefineryScene) with an educational
                      8-fraction column, units / infrastructure (instanced pipe rack) / environment
                      (crude + product tank farms, flare + flame/smoke/vapour effects); strictly orthogonal
                      crude, flare & colour-coded product rundown lines feeding a 6-tank ProductTankFarm
                      (OrthoPipe); Equipment hover-wrapper + RefineryTooltip
    cement/           full dry-process kiln line (CementPlantScene): crusher / raw mill / preheater tower /
                      industrial rotary kiln (3 tyre+roller stations, girth gear, firing hood, live glowing
                      burning zone, speed-linked rotation) / clinker cooler (spinning fans) / cement mill /
                      baghouse; conveyors with an animated belt texture + air ducts; motion.tsx (GPU-points
                      stack smoke); Equipment hover-wrapper + CementTooltip
    GasPlantScene     cryogenic gas plant: central instanced pipe rack + slug catcher / amine tower /
                      dehydration beds / cold box + spinning turbo-expander / fractionation train; strictly
                      orthogonal gas & NGL feed headers, colour-coded bottom transfers + overhead product
                      export lines running the rack to the battery-limit edge (OrthoPipe), live flow beads
                      + cold-vapour & acid-gas vents; GspEquipment hover-wrapper + GasPlantTooltip
    BoilerScene       water-tube boiler: furnace (glowing water-walls + live flame) / steam drum (live
                      sight-glass level) / spinning turbine / feedwater pump / stack (GPU-points smoke);
                      orthogonal feedwater, main-steam & flue-gas tie-in piping (OrthoPipe);
                      BoilerEquipment hover-wrapper + BoilerTooltip
store/refineryStore   mocked DCS telemetry per equipment + 8 distillation cuts + hover state (oil scene)
store/cementStore     mocked DCS telemetry per equipment + hover state (cement scene)
store/boilerStore · store/gspStore   minimal hover state (boiler / gas-plant tooltips read live simStore data)
  plant3d/            the live CSTR scene (PlantView/PlantScene/equipment) — reused as the CSTR model
hooks/useCstrBridge   runs the CSTR ODE worker and syncs its guided sliders → worker controls
```

**Data flow:** sliders → `simStore.params` → each process's pure `model(params)` → outputs, and the
consequence engine compares each value to its optimal band. The CSTR additionally streams its
params into the live worker so its 3D plant + KPIs animate in real time.

### Adding a process
Add one `ProcessConfig` to `lib/processes/index.ts` (params + ranges + `model`; optionally `dynamic: true`
for first-order lag and `loops` for PID controllers), the matching keys to `lib/i18n/{en,th}.ts`, and a
scene branch in `components/process3d/ProcessScene.tsx`. Nothing else to wire — the sidebar, sliders, live
trends, controllers, consequence engine, economics, copilot and P&ID are all generic. (The Power Boiler is
the worked example of a brand-new process slotting into all of it.)

## Running
Needs **Node ≥ 18.17**.

```bash
cd chemplant-sim
npm install
npm run dev          # http://localhost:3000
```

> **This machine:** the default `node` is v16 (broken icu4c). Use the Homebrew Node 20:
> ```bash
> export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
> npm run dev
> ```

## Educational content (highlights)
- **Oil:** furnace temp (cracking vs. poor vaporization), column pressure, reflux (purity vs. flooding),
  feed rate, crude-pump speed (→ bitumen shift), desalter wash-water, air-cooler fans (→ light-ends
  recovery) and the emergency flare. The model computes live **Column ΔP** (flooding), **Coil-Outlet Temp**
  (cracking) and **Overhead Pressure**; the `YieldTracker` plots any of the 8 cuts against the ΔP/COT
  safety lines, and the hover tooltip shows all 8 live yields; the colour-coded products run down the rack
  into a 6-tank product tank farm. Missions add flare-fire / furnace-smoke / overhead-vapour effects.
  Formulas: Fenske, Underwood, Antoine.
- **Cement:** raw-feed rate, kiln speed (residence time), burner fuel and ID-fan draft. The model computes
  **Burning-Zone Temp**, **Free Lime**, **Alite C₃S** + **Belite C₂S**, **Exhaust CO** (rich firing / low
  draft), **Specific Heat** and **Kiln Torque** — the multi-axis `CementTrend` plots these live with a
  500 ppm CO danger line. The Dust-Excursion mission adds a stack dust plume. Formulas: Bogue C₃S, LSF,
  kiln residence time.
- **Boiler:** fuel firing, combustion air (excess O₂), feedwater and turbine demand → live **steam pressure**,
  **drum level**, flue **O₂**, **efficiency**, **NOₓ** and stack temp. The two classic loops — pressure (→ fuel)
  and drum level (→ feedwater) — run in Auto/Manual; missions cover low drum water, overpressure and starved
  combustion. The 3D scene shows a live sight-glass level, glowing water-walls, a spinning turbine and stack
  smoke, with orthogonal feedwater / main-steam / flue-gas piping tying the units together. Formulas:
  furnace heat release, steam generation, drum-level balance.
- **Gas Separation Plant:** raw-gas feed, amine circulation, turbo-expander pressure drop and demethanizer
  top temperature → live **CO₂ slip** (off-spec breakthrough), **C₂ recovery**, **compression power**,
  **hydrate risk** and the 5 product yields (Sales Gas C₁ · Ethane C₂ · Propane C₃ · Butane C₄ · Condensate
  C₅₊). Two loops — acid-gas (→ amine) and C₂ recovery (→ expander ΔP); missions cover CO₂ breakthrough,
  cold-box freeze-up and recovery collapse. The 3D scene routes strictly orthogonal gas & NGL headers
  through a central pipe rack, with a spinning turbo-expander, cold-vapour and acid-gas vents. Formulas:
  acid-gas absorption, turbo-expander cooling, C₂ recovery.
- **CSTR:** coolant/feed temperature, feed flow & concentration → live conversion, temperature and a
  genuine, bounded thermal runaway. Formulas: Arrhenius, mass & energy balances.

> Note: Oil, Cement, Boiler & Gas Plant use lightweight algebraic models **with first-order dynamics**, tuned for clear,
> responsive cause-and-effect teaching; the CSTR is a rigorous RK4 ODE simulation (validated nominal ≈ 362 K / 70 % conversion).

---

## Author

**Jetnipit Sinwisitsophon** — Chemical Engineering, Mahidol University

- GitHub: [github.com/jetnipitmac-sin](https://github.com/jetnipitmac-sin)
- Live demo: [chemplant-sim.vercel.app](https://chemplant-sim.vercel.app)

ProSim Studio was designed & developed as an engineering-portfolio project — a config-driven,
multi-process industrial simulator (3D + DCS/SCADA UI, bilingual EN/TH).

## License

Released under the **MIT License** — © 2026 Jetnipit Sinwisitsophon. See [`LICENSE`](LICENSE) for the full text.

You're free to use, modify, and share this project; just keep the copyright notice. Provided "as is", without warranty.
