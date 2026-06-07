/**
 * Registry of the three industrial processes. Each config is pure data + a pure
 * `model(params) → outputs`; all human text lives in the i18n dictionaries keyed
 * by the ids declared here. Outputs carry warn/danger limits that drive the
 * trend-graph reference lines and the alarm engine. Formulas are LaTeX (KaTeX).
 */
import type { ControlLoop, ProcessConfig, ProcessId } from "./types";

export * from "./types";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const bell = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));

// ───────────────────────── Oil Refining (fractional distillation) ─────────────────────────
const oil: ProcessConfig = {
  id: "oil",
  accent: "#f59e0b",
  icon: "🛢️",
  dynamic: true,
  params: [
    { id: "oilFurnaceTemp", unit: "°C", min: 300, max: 410, step: 1, default: 357, optimalMin: 350, optimalMax: 365, dangerHigh: 388, decimals: 0, formula: "\\log_{10} P^{*} = A - \\dfrac{B}{C + T}" },
    { id: "oilColumnPressure", unit: "kPa", min: 100, max: 300, step: 1, default: 140, optimalMin: 115, optimalMax: 175, dangerHigh: 250, decimals: 0, formula: "\\alpha = K_{LK}/K_{HK}" },
    { id: "oilRefluxRatio", unit: "", min: 0.5, max: 8, step: 0.1, default: 3.2, optimalMin: 2.5, optimalMax: 4.5, dangerLow: 1.3, dangerHigh: 6.8, decimals: 1, formula: "R = L/D" },
    { id: "oilFeedRate", unit: "m³/h", min: 50, max: 250, step: 5, default: 150, optimalMin: 120, optimalMax: 185, dangerLow: 70, dangerHigh: 225, decimals: 0, formula: "F = D + W" },
    { id: "oilSteamRate", unit: "kg/h", min: 0, max: 4000, step: 50, default: 1500, optimalMin: 1000, optimalMax: 2600, dangerLow: 400, decimals: 0, formula: "\\dot m_{steam}\\uparrow\\ \\Rightarrow\\ \\text{recovery}\\uparrow" },
    { id: "crudePumpSpeed", unit: "%", min: 0, max: 100, step: 1, default: 80, optimalMin: 70, optimalMax: 92, dangerLow: 45, dangerHigh: 98, decimals: 0, formula: "\\dot V_{feed} \\propto N_{pump}" },
    { id: "desalterWater", unit: "%", min: 0, max: 10, step: 0.1, default: 5, optimalMin: 4, optimalMax: 6.5, dangerLow: 1.5, dangerHigh: 9, decimals: 1, formula: "\\text{salt}\\downarrow\\ \\text{as wash-water}\\uparrow" },
    { id: "airCoolerRpm", unit: "rpm", min: 0, max: 1500, step: 10, default: 1200, optimalMin: 1050, optimalMax: 1350, dangerLow: 550, decimals: 0, formula: "P_{ovhd}\\downarrow\\ \\text{as}\\ Q_{cond}\\uparrow" },
    { id: "flareValve", unit: "%", min: 0, max: 100, step: 1, default: 0, optimalMin: 0, optimalMax: 3, dangerHigh: 25, decimals: 0, formula: "\\text{relief / emergency only}" },
  ],
  formulas: [
    { id: "oilFenske", tex: "N_{\\min} = \\dfrac{\\ln\\!\\left[\\dfrac{x_D}{1-x_D}\\cdot\\dfrac{1-x_W}{x_W}\\right]}{\\ln \\alpha}" },
    { id: "oilUnderwood", tex: "R_{\\min} = \\dfrac{1}{\\alpha-1}\\left[\\dfrac{x_D}{z_F} - \\dfrac{\\alpha\\,(1-x_D)}{1-z_F}\\right]" },
    { id: "oilAntoine", tex: "\\log_{10} P^{*} = A - \\dfrac{B}{C + T}" },
  ],
  outputs: [
    { id: "oilSeparation", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#22d3ee", warnLimit: 70, dangerLimit: 55, limitDirection: "low", tau: 18, formula: "N_{\\min}\\ \\text{(Fenske)}" },
    { id: "oilLightYield", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#34d399", tau: 16 },
    { id: "oilThroughput", unit: "m³/h", decimals: 0, betterHigher: true, tau: 6 },
    { id: "oilEnergyIndex", unit: "kWh/m³", decimals: 1, betterHigher: false, tau: 8 },
    { id: "oilDeltaP", unit: "mbar", decimals: 1, betterHigher: false, graph: true, color: "#fb923c", warnLimit: 9, dangerLimit: 12, limitDirection: "high", tau: 4, formula: "\\Delta P_{col}\\ \\propto\\ \\text{vapour + liquid load}" },
    { id: "oilCOT", unit: "°C", decimals: 0, betterHigher: false, graph: true, color: "#f43f5e", warnLimit: 372, dangerLimit: 386, limitDirection: "high", tau: 25, formula: "T_{coil,out}\\ (\\text{cracking} > 370^{\\circ}C)" },
    { id: "oilOverheadP", unit: "barg", decimals: 2, betterHigher: false, graph: true, color: "#38bdf8", warnLimit: 2.2, dangerLimit: 2.8, limitDirection: "high", tau: 6, formula: "P_{ovhd} = P_{col} + f(\\text{fans})" },
  ],
  units: [
    { id: "oilHeater", paramIds: ["oilFurnaceTemp"], ring: [-7, 0, 0] },
    { id: "oilColumn", paramIds: ["oilColumnPressure", "oilRefluxRatio", "oilSteamRate"], ring: [1.5, 0, 0] },
    { id: "oilFeed", paramIds: ["oilFeedRate", "crudePumpSpeed"], ring: [-10.5, 0, 0] },
    { id: "oilDesalter", paramIds: ["desalterWater"], ring: [0, 0, 0] },
    { id: "oilAirCooler", paramIds: ["airCoolerRpm"], ring: [0, 0, 0] },
    { id: "oilFlare", paramIds: ["flareValve"], ring: [0, 0, 0] },
  ],
  scenarios: [
    { id: "oilCracking", durationSec: 45, holdSec: 5, setup: { oilFurnaceTemp: 400 } },
    { id: "oilFlooding", durationSec: 45, holdSec: 5, setup: { oilFeedRate: 235, oilRefluxRatio: 7.2 } },
    { id: "oilFlareEmergency", durationSec: 50, holdSec: 5, setup: { oilColumnPressure: 255, flareValve: 85 } },
    { id: "oilCondenserFail", durationSec: 50, holdSec: 5, setup: { airCoolerRpm: 240 } },
    { id: "oilColdCharge", durationSec: 50, holdSec: 5, setup: { crudePumpSpeed: 100, oilFurnaceTemp: 322 } },
  ],
  loops: [
    { id: "oilCOT", pv: "oilCOT", mv: "oilFurnaceTemp", sp: 360, spMin: 345, spMax: 384, kp: 2.5, ki: 0.3, kd: 0.8 },
  ],
  model: (p) => {
    const T = p.oilFurnaceTemp, P = p.oilColumnPressure, R = p.oilRefluxRatio, F = p.oilFeedRate, S = p.oilSteamRate ?? 1500;
    const pump = p.crudePumpSpeed ?? 80, dw = p.desalterWater ?? 5, air = p.airCoolerRpm ?? 1200, flare = p.flareValve ?? 0;

    // crude actually pushed through the train = pump speed × feed setting
    const effFeed = F * (pump / 80);
    // heater duty vs heat demanded by the throughput → vaporization adequacy.
    // High pump/feed with not enough furnace heat starves the flash zone → heavy/bitumen.
    const vaporDeficit = clamp(1 - (T - 300) / Math.max(effFeed * 0.38, 1), 0, 1);
    // overhead condenser: low fan speed → poor condensing → overhead pressure rises
    const lightPenalty = clamp(1 - air / 1100, 0, 1);
    const Peff = P + lightPenalty * 45; // effective top pressure rises as the fans slow
    const desaltF = bell(dw, 5, 3); // 1 at the 5 % water optimum, falls off either side (salt/fouling vs carry-over)

    const sep = clamp(
      100 * (0.45 + 0.55 * bell(T, 357, 22) * bell(R, 3.6, 1.8) * bell(Peff, 145, 60) * (0.8 + 0.2 * desaltF) * (1 - 0.3 * vaporDeficit)),
      0, 99.5,
    );

    let light = clamp(18 + 0.22 * (T - 300), 18, 78);
    if (T > 385) light = clamp(light - (T - 385) * 0.7, 5, 78);
    const steamF = bell(S, 1900, 1500);
    light = clamp(light * (0.7 + 0.2 * (sep / 100) + 0.1 * steamF), 5, 82);
    // light ends are lost to poor overhead condensing (low fans) and to a cold / over-fed flash zone
    light = clamp(light * (1 - 0.45 * lightPenalty) * (1 - 0.6 * vaporDeficit), 3, 82);

    const flood = clamp(clamp((effFeed - 190) / 60, 0, 1) + clamp((R - 5) / 3, 0, 1) + 0.5 * lightPenalty, 0, 1);
    let throughput = clamp(effFeed * (1 - 0.5 * flood) * (0.85 + 0.15 * (sep / 100)), 0, 300);
    throughput *= 1 - flare / 100; // product diverted to the flare is lost

    const energy = clamp(
      8 + R * 2.2 + (T - 300) * 0.06 + effFeed * 0.012 + S * 0.002 + (pump / 80 - 1) * 6 + (air / 1200 - 1) * 3 + flare * 0.15,
      0, 90,
    );

    // ── DCS safety metrics ──
    // column differential pressure (mbar): rises with vapour + liquid traffic → flooding
    const deltaP = clamp(3 + Math.max(0, effFeed - 150) * 0.05 + Math.max(0, R - 3.2) * 1.4 + flood * 6, 1, 28);
    // coil-outlet temperature (°C): the fired-heater coil outlet — cracking risk above ~370 °C
    const cot = T;
    // overhead pressure (barg): column top pressure, climbs as the condenser fans slow
    const overheadP = P / 100 + lightPenalty * 0.6;

    return {
      oilSeparation: sep,
      oilLightYield: light,
      oilThroughput: throughput,
      oilEnergyIndex: energy,
      oilDeltaP: deltaP,
      oilCOT: cot,
      oilOverheadP: overheadP,
    };
  },
  economics: (p, o) => {
    const tp = o.oilThroughput ?? 0; // m³/h on-spec
    const light = (o.oilLightYield ?? 0) / 100;
    const sepF = 0.5 + 0.5 * ((o.oilSeparation ?? 0) / 100); // off-spec discount
    const revenue = tp * (light * 120 + (1 - light) * 48) * sepF;
    const pump = p.crudePumpSpeed ?? 80, air = p.airCoolerRpm ?? 1200, flare = p.flareValve ?? 0;
    const feedCost = p.oilFeedRate * 55; // crude $/m³
    // incremental pump/fan power above nominal + a steep penalty for flaring product
    const energyCost = p.oilFeedRate * 0.9 + (p.oilFurnaceTemp - 300) * 2 + p.oilRefluxRatio * 15 + (pump - 80) * 1.5 + (air - 1200) * 0.02 + flare * 5;
    const coolingCost = p.oilRefluxRatio * 8 + (p.oilSteamRate ?? 0) * 0.01 + (air / 1200 - 1) * 6;
    return { revenue, feedCost, energyCost, coolingCost, profit: revenue - feedCost - energyCost - coolingCost };
  },
  sustainability: (p, o) => {
    const tp = o.oilThroughput ?? 0;
    const flare = p.flareValve ?? 0, pump = p.crudePumpSpeed ?? 80, air = p.airCoolerRpm ?? 1200;
    const fuelKw = p.oilFeedRate * (p.oilFurnaceTemp - 150) * 0.7; // fired-heater duty
    // fuel-gas + reboil/condenser, plus a large CO₂ spike when product is flared
    const co2 = fuelKw * 0.25 + p.oilRefluxRatio * 40 + flare * 120 + (pump - 80) * 2 + (air - 1200) * 0.05;
    const intensity = co2 / Math.max(tp, 1); // kg CO₂ / m³
    const score = clamp(100 - (intensity - 22) * 1.6, 0, 100);
    return { co2, intensity, score };
  },
};

// ───────────────────────── Cement Manufacturing (rotary kiln) ─────────────────────────
const cement: ProcessConfig = {
  id: "cement",
  accent: "#a78bfa",
  icon: "🏭",
  dynamic: true,
  params: [
    { id: "rawFeedRate", unit: "t/h", min: 100, max: 300, step: 5, default: 250, optimalMin: 220, optimalMax: 275, dangerLow: 130, dangerHigh: 295, decimals: 0, formula: "\\dot m_{cl} \\approx 0.64\\,\\dot m_{meal}" },
    { id: "kilnSpeed", unit: "rpm", min: 1, max: 5, step: 0.1, default: 3.5, optimalMin: 3.0, optimalMax: 4.0, dangerLow: 1.8, dangerHigh: 4.6, decimals: 1, formula: "t = \\dfrac{1.77\\,L\\sqrt{\\theta}}{D\\,N\\,S}" },
    { id: "burnerFuelRate", unit: "t/h", min: 5, max: 20, step: 0.5, default: 12, optimalMin: 10.5, optimalMax: 13.5, dangerLow: 7, dangerHigh: 18, decimals: 1, formula: "Q_{in} = \\dot m_{fuel}\\,\\mathrm{CV}" },
    { id: "idFanSpeed", unit: "%", min: 50, max: 100, step: 1, default: 85, optimalMin: 78, optimalMax: 92, dangerLow: 62, dangerHigh: 98, decimals: 0, formula: "\\dot V_{gas} \\propto N_{fan}" },
  ],
  formulas: [
    { id: "cementBogue", tex: "C_3S = 4.071\\,CaO - 7.600\\,SiO_2 - 6.718\\,Al_2O_3 - 1.430\\,Fe_2O_3" },
    { id: "cementLSF", tex: "LSF = \\dfrac{CaO}{2.8\\,SiO_2 + 1.18\\,Al_2O_3 + 0.65\\,Fe_2O_3}" },
    { id: "cementResidence", tex: "t = \\dfrac{1.77\\,L\\,\\sqrt{\\theta}}{D\\,N\\,S}" },
  ],
  outputs: [
    { id: "cementBurnTemp", unit: "°C", decimals: 0, betterHigher: true, graph: true, color: "#f97316", warnLimit: 1530, dangerLimit: 1560, limitDirection: "high", tau: 35, formula: "T_{bz} \\propto \\dot m_{fuel}/\\dot m_{feed}" },
    { id: "cementFreeLime", unit: "%", decimals: 2, betterHigher: false, graph: true, color: "#f59e0b", warnLimit: 2.0, dangerLimit: 3.0, limitDirection: "high", tau: 28, formula: "\\text{free } CaO \\uparrow\\ \\text{(underburnt)}" },
    { id: "cementC3S", unit: "%", decimals: 0, betterHigher: true, graph: true, color: "#a78bfa", tau: 28 },
    { id: "cementC2S", unit: "%", decimals: 0, betterHigher: false, graph: true, color: "#60a5fa", tau: 28, formula: "C_2S \\downarrow\\ \\text{as}\\ T_{bz} \\to C_3S" },
    { id: "cementCO", unit: "ppm", decimals: 0, betterHigher: false, graph: true, color: "#ef4444", warnLimit: 400, dangerLimit: 500, limitDirection: "high", tau: 6, formula: "CO \\uparrow\\ \\text{(rich firing / low draft)}" },
    { id: "cementTorque", unit: "%", decimals: 0, betterHigher: false, graph: true, color: "#f59e0b", warnLimit: 85, dangerLimit: 95, limitDirection: "high", tau: 10, formula: "\\tau \\propto \\text{bed load} / N" },
    { id: "cementProduction", unit: "t/h", decimals: 0, betterHigher: true, tau: 12 },
    { id: "cementSpecHeat", unit: "kcal/kg", decimals: 0, betterHigher: false, graph: true, color: "#22d3ee", warnLimit: 850, dangerLimit: 1000, limitDirection: "high", tau: 20 },
  ],
  units: [
    { id: "cementRawMill", paramIds: ["rawFeedRate"], ring: [0, 0, 0] },
    { id: "cementKiln", paramIds: ["kilnSpeed", "burnerFuelRate"], ring: [0, 0, 0] },
    { id: "cementFan", paramIds: ["idFanSpeed"], ring: [0, 0, 0] },
  ],
  scenarios: [
    { id: "cementUnderburn", durationSec: 50, holdSec: 5, setup: { burnerFuelRate: 6.5, rawFeedRate: 295 } },
    { id: "cementOverheat", durationSec: 50, holdSec: 5, setup: { burnerFuelRate: 19, rawFeedRate: 150 } },
    { id: "cementDustExcursion", durationSec: 50, holdSec: 5, setup: { idFanSpeed: 58 } },
  ],
  loops: [
    { id: "cementBZT", pv: "cementBurnTemp", mv: "burnerFuelRate", sp: 1450, spMin: 1420, spMax: 1500, kp: 0.06, ki: 0.014, kd: 0 },
  ],
  model: (p) => {
    const feed = p.rawFeedRate ?? 250, N = p.kilnSpeed ?? 3.5, fuel = p.burnerFuelRate ?? 12, fan = p.idFanSpeed ?? 85;
    // burning-zone temperature: fuel heats it; raw feed + excess draft (ID fan) carry heat away
    const burnTemp = clamp(1450 + 18 * (fuel - 12) - 0.9 * (feed - 250) - 1.6 * (fan - 85), 1150, 1760);
    const resF = clamp((4.2 - N) / 2.4, 0, 1); // residence: slower kiln → more reaction time
    // free lime ↑ when cold (underburnt) or rushed (kiln too fast / short residence)
    const freeLime = clamp(0.6 + Math.max(0, 1440 - burnTemp) * 0.022 + Math.max(0, N - 3.8) * 1.6 + (1 - resF) * 0.4, 0.2, 9);
    // alite C₃S: needs temperature + residence; falls if underburnt (free lime) or overheated (melt)
    const c3s = clamp(64 - freeLime * 4.5 - Math.max(0, burnTemp - 1520) * 0.06, 28, 70);
    const production = clamp(feed * 0.64 * (1 - 0.03 * Math.max(0, freeLime - 2)), 0, 220);
    // belite C₂S: forms early, then converts to alite as the burning zone crosses ~1400 °C
    const c2s = clamp(30 - Math.max(0, burnTemp - 1400) * 0.05 + Math.max(0, freeLime - 1) * 1.2, 6, 36);
    // exhaust CO (ppm): spikes with rich firing (high fuel) and/or starved draft (low ID fan)
    const co = clamp(60 + Math.max(0, fuel - 12) * 60 + Math.max(0, 80 - fan) * 25, 20, 2000);
    // specific heat consumption: wasted by excess draft (ID fan), overheating, poor burning, fast kiln
    const specHeat = clamp(720 + (fan - 85) * 5 + Math.max(0, burnTemp - 1480) * 0.5 + Math.max(0, freeLime - 1.5) * 30 + Math.max(0, N - 3.8) * 40, 680, 1300);
    // kiln motor torque (%): bed load — spikes on high feed with a slow kiln (thick, sticky bed)
    const torque = clamp(52 + Math.max(0, feed - 250) * 0.35 + Math.max(0, 3.4 - N) * 20 + Math.max(0, freeLime - 1.5) * 3, 20, 130);
    return {
      cementBurnTemp: burnTemp,
      cementFreeLime: freeLime,
      cementC3S: c3s,
      cementC2S: c2s,
      cementCO: co,
      cementTorque: torque,
      cementProduction: production,
      cementSpecHeat: specHeat,
    };
  },
  economics: (p, o) => {
    const prod = o.cementProduction ?? 0; // t/h clinker
    const quality = clamp(1 - ((o.cementFreeLime ?? 1) - 1) * 0.16, 0.5, 1); // free-lime discount
    const revenue = prod * 95 * quality; // $/t cement
    const feedCost = (p.rawFeedRate ?? 250) * 12; // raw meal $/t
    // fuel (coal/petcoke) + ID-fan & kiln-drive electrical power
    const energyCost = (p.burnerFuelRate ?? 12) * 220 + (p.idFanSpeed ?? 85) * 4 + (p.kilnSpeed ?? 3.5) * 20;
    const coolingCost = (p.idFanSpeed ?? 85) * 1.5; // draft / cooler fan power
    return { revenue, feedCost, energyCost, coolingCost, profit: revenue - feedCost - energyCost - coolingCost };
  },
  sustainability: (p, o) => {
    const prod = o.cementProduction ?? 0;
    const calcination = prod * 530; // process CO₂: CaCO₃ → CaO + CO₂ (~60 % of total)
    const fuelCo2 = (p.burnerFuelRate ?? 12) * 2700; // combustion CO₂ (coal ≈ 2.7 t CO₂ / t fuel)
    const co2 = calcination + fuelCo2;
    const intensity = co2 / Math.max(prod, 1); // kg CO₂ / t clinker (~720–900)
    const score = clamp(150 - intensity * 0.12, 0, 100);
    return { co2, intensity, score };
  },
};

// ───────────────────────── CSTR Reactor (live ODE, deep controls) ─────────────────────────
const cstr: ProcessConfig = {
  id: "cstr",
  accent: "#22d3ee",
  icon: "⚗️",
  live: true,
  params: [
    { id: "cstrCoolantTemp", unit: "K", min: 280, max: 410, step: 1, default: 350, optimalMin: 300, optimalMax: 360, dangerHigh: 392, decimals: 0, formula: "Q_{rem} = U\\!A\\,(T - T_c)" },
    { id: "cstrCoolantFlow", unit: "L/min", min: 0, max: 200, step: 5, default: 90, optimalMin: 70, optimalMax: 130, dangerLow: 45, decimals: 0, formula: "U\\!A \\propto \\dot m_c^{\\,0.8}" },
    { id: "cstrAgitatorRpm", unit: "rpm", min: 0, max: 320, step: 5, default: 160, optimalMin: 120, optimalMax: 220, dangerLow: 70, decimals: 0, formula: "Nu = a\\,Re^{\\,b}Pr^{\\,c}" },
    { id: "cstrCatalyst", unit: "g/L", min: 0, max: 12, step: 0.5, default: 5, optimalMin: 4, optimalMax: 7, dangerHigh: 10, decimals: 1, formula: "r = k\\,C_{cat}\\,C_A" },
    { id: "cstrFeedTemp", unit: "K", min: 320, max: 420, step: 1, default: 350, optimalMin: 340, optimalMax: 365, dangerHigh: 400, decimals: 0, formula: "Q_{feed} = q\\,\\rho C_p\\,(T_f - T)" },
    { id: "cstrFeedFlow", unit: "L/min", min: 20, max: 160, step: 1, default: 100, optimalMin: 80, optimalMax: 120, dangerLow: 40, dangerHigh: 150, decimals: 0, formula: "\\tau = V / q" },
    { id: "cstrFeedConc", unit: "mol/L", min: 0.5, max: 2, step: 0.05, default: 1.0, optimalMin: 0.8, optimalMax: 1.2, dangerHigh: 1.7, decimals: 2, formula: "\\dfrac{dC_A}{dt} = \\dfrac{q}{V}(C_{Af} - C_A) - k\\,C_A" },
    { id: "cstrSystemPressure", unit: "bar", min: 1, max: 8, step: 0.1, default: 2.5, optimalMin: 1.5, optimalMax: 4.0, dangerHigh: 5.5, decimals: 1, formula: "P = P_{sys} + 0.025\\,(T - 320)" },
    { id: "cstrReflux", unit: "", min: 0.5, max: 6, step: 0.1, default: 2.0, optimalMin: 1.5, optimalMax: 3.5, dangerLow: 0.9, decimals: 1, formula: "R = L / D" },
    { id: "cstrReboiler", unit: "kW", min: 0, max: 600, step: 10, default: 250, optimalMin: 180, optimalMax: 350, dangerHigh: 520, decimals: 0, formula: "Q_{reb} = \\dot V\\,\\Delta H_{vap}" },
  ],
  formulas: [
    { id: "cstrArrhenius", tex: "k(T) = k_0\\,\\exp\\!\\left(-\\dfrac{E_a}{R\\,T}\\right)" },
    { id: "cstrMass", tex: "\\dfrac{dC_A}{dt} = \\dfrac{q}{V}\\,(C_{A,f} - C_A) - k\\,C_A" },
    { id: "cstrEnergy", tex: "\\dfrac{dT}{dt} = \\dfrac{q}{V}(T_f - T) + \\dfrac{-\\Delta H_r}{\\rho C_p}\\,k\\,C_A - \\dfrac{U\\!A}{\\rho C_p V}(T - T_c)" },
  ],
  outputs: [
    { id: "cstrReactorT", unit: "K", decimals: 0, betterHigher: false, graph: true, color: "#22d3ee", warnLimit: 395, dangerLimit: 415, limitDirection: "high", formula: "\\dfrac{dT}{dt} = \\dfrac{q}{V}(T_f-T) + \\dfrac{-\\Delta H_r}{\\rho C_p}kC_A - \\dfrac{U\\!A}{\\rho C_p V}(T-T_c)" },
    { id: "cstrPressure", unit: "bar", decimals: 2, betterHigher: false, graph: true, color: "#a78bfa", warnLimit: 4.4, dangerLimit: 5.2, limitDirection: "high", formula: "P = P_{sys} + 0.025\\,(T - 320)" },
    { id: "cstrConversion", unit: "%", decimals: 0, betterHigher: true, graph: true, color: "#34d399", warnLimit: 40, dangerLimit: 25, limitDirection: "low", formula: "X = \\dfrac{C_{Af} - C_A}{C_{Af}}" },
    { id: "cstrProduction", unit: "kg/h", decimals: 0, betterHigher: true },
    { id: "cstrSafety", unit: "", decimals: 0, betterHigher: true },
  ],
  units: [
    { id: "cstrReactor", paramIds: ["cstrFeedTemp", "cstrFeedConc", "cstrCatalyst", "cstrAgitatorRpm", "cstrSystemPressure"] },
    { id: "cstrCooling", paramIds: ["cstrCoolantTemp", "cstrCoolantFlow"] },
    { id: "cstrFeed", paramIds: ["cstrFeedFlow"] },
    { id: "cstrColumn", paramIds: ["cstrReflux", "cstrReboiler"] },
  ],
  scenarios: [
    { id: "cstrRunaway", durationSec: 60, holdSec: 5, setup: { cstrCoolantFlow: 35, cstrCatalyst: 9, cstrCoolantTemp: 385, cstrFeedConc: 1.8 } },
    { id: "cstrStall", durationSec: 50, holdSec: 5, setup: { cstrCoolantTemp: 285, cstrCatalyst: 1, cstrFeedFlow: 155 } },
  ],
  // Live outputs come from the worker store; model only used as a fallback.
  model: () => ({}),
  economics: (p, o) => {
    const prod = o.cstrProduction ?? 0; // kg/h product B
    const revenue = prod * 2.5; // $/kg
    const feedCost = p.cstrFeedFlow * 60 * p.cstrFeedConc * 0.04 + p.cstrCatalyst * p.cstrFeedFlow * 0.1; // feed + catalyst
    const agitatorKw = 5 * Math.pow((p.cstrAgitatorRpm ?? 160) / 160, 3); // P ∝ N³
    const energyCost = (agitatorKw + (p.cstrReboiler ?? 0)) * 0.12; // $/kWh
    const coolingCost = (p.cstrCoolantFlow ?? 90) * 0.05; // cooling water
    return { revenue, feedCost, energyCost, coolingCost, profit: revenue - feedCost - energyCost - coolingCost };
  },
  sustainability: (p, o) => {
    const prod = o.cstrProduction ?? 0;
    const powerKw = 5 * Math.pow((p.cstrAgitatorRpm ?? 160) / 160, 3) + (p.cstrReboiler ?? 0) + (p.cstrCoolantFlow ?? 90) * 0.02;
    const co2 = powerKw * 0.45; // grid electricity kg CO₂/kWh
    const intensity = co2 / Math.max(prod, 1); // kg CO₂ / kg product
    const score = clamp(100 - (intensity - 0.4) * 90, 0, 100);
    return { co2, intensity, score };
  },
};

// ───────────────────────── Power Boiler (water-tube steam plant) ─────────────────────────
const boiler: ProcessConfig = {
  id: "boiler",
  accent: "#fb7185",
  icon: "🔥",
  dynamic: true,
  params: [
    { id: "boilerFuelRate", unit: "t/h", min: 2, max: 12, step: 0.1, default: 7, optimalMin: 6, optimalMax: 8.5, dangerLow: 3, dangerHigh: 11, decimals: 1, formula: "\\dot Q = \\dot m_{fuel}\\,\\mathrm{CV}" },
    { id: "boilerAirFlow", unit: "%", min: 5, max: 50, step: 1, default: 18, optimalMin: 12, optimalMax: 24, dangerLow: 7, dangerHigh: 40, decimals: 0, formula: "\\lambda = 1 + \\text{excess air}" },
    { id: "feedwaterFlow", unit: "t/h", min: 40, max: 160, step: 1, default: 95, optimalMin: 80, optimalMax: 115, dangerLow: 55, dangerHigh: 145, decimals: 0, formula: "\\dot m_{fw} \\approx \\dot m_{steam}" },
    { id: "steamDemand", unit: "t/h", min: 40, max: 160, step: 1, default: 95, optimalMin: 70, optimalMax: 120, decimals: 0, formula: "\\text{turbine load}" },
  ],
  formulas: [
    { id: "boilerHeat", tex: "\\dot Q = \\dot m_{fuel}\\,\\mathrm{CV}\\,\\eta_{comb}" },
    { id: "boilerSteam", tex: "\\dot m_{steam} = \\dfrac{\\dot Q}{h_g - h_f}" },
    { id: "boilerLevel", tex: "\\dfrac{dL}{dt} \\propto \\dot m_{fw} - \\dot m_{steam}" },
  ],
  outputs: [
    { id: "boilerSteamP", unit: "bar", decimals: 0, betterHigher: false, graph: true, color: "#fb7185", warnLimit: 112, dangerLimit: 120, limitDirection: "high", tau: 12, formula: "\\dfrac{dP}{dt} \\propto \\dot m_{gen} - \\dot m_{demand}" },
    { id: "boilerDrumLevel", unit: "%", decimals: 0, betterHigher: true, graph: true, color: "#38bdf8", warnLimit: 30, dangerLimit: 20, limitDirection: "low", tau: 8, formula: "L \\propto \\int(\\dot m_{fw} - \\dot m_{steam})\\,dt" },
    { id: "boilerO2", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#34d399", warnLimit: 1.5, dangerLimit: 1.0, limitDirection: "low", tau: 5, formula: "O_2 \\uparrow\\ \\text{with excess air}" },
    { id: "boilerEfficiency", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#a3e635", tau: 14 },
    { id: "boilerSteamFlow", unit: "t/h", decimals: 0, betterHigher: true, tau: 8 },
    { id: "boilerNOx", unit: "mg/Nm³", decimals: 0, betterHigher: false, graph: true, color: "#f59e0b", warnLimit: 350, dangerLimit: 500, limitDirection: "high", tau: 6 },
    { id: "boilerStackTemp", unit: "°C", decimals: 0, betterHigher: false, warnLimit: 250, dangerLimit: 300, limitDirection: "high", tau: 18 },
  ],
  units: [
    { id: "boilerBurner", paramIds: ["boilerFuelRate", "boilerAirFlow"], ring: [0, 0, 0] },
    { id: "boilerFeedwater", paramIds: ["feedwaterFlow"], ring: [0, 0, 0] },
    { id: "boilerTurbine", paramIds: ["steamDemand"], ring: [0, 0, 0] },
  ],
  scenarios: [
    { id: "boilerLowWater", durationSec: 50, holdSec: 5, setup: { feedwaterFlow: 52 } },
    { id: "boilerOverpressure", durationSec: 50, holdSec: 5, setup: { boilerFuelRate: 11, steamDemand: 60 } },
    { id: "boilerStarvedAir", durationSec: 50, holdSec: 5, setup: { boilerAirFlow: 6 } },
  ],
  loops: [
    { id: "boilerPressure", pv: "boilerSteamP", mv: "boilerFuelRate", sp: 100, spMin: 85, spMax: 115, kp: 0.18, ki: 0.04, kd: 0 },
    { id: "boilerLevel", pv: "boilerDrumLevel", mv: "feedwaterFlow", sp: 50, spMin: 35, spMax: 70, kp: 2.2, ki: 0.4, kd: 0 },
  ],
  model: (p) => {
    const fuel = p.boilerFuelRate ?? 7, air = p.boilerAirFlow ?? 18, fw = p.feedwaterFlow ?? 95, demand = p.steamDemand ?? 95;
    // combustion completeness peaks near ~16 % excess air; poor if starved or over-aired
    const combF = clamp(bell(air, 16, 13) * 1.04, 0.55, 1);
    const steamFlow = fuel * 13.6 * combF; // t/h steam raised
    // drum pressure builds when generation outruns turbine demand, falls when demand wins
    const pressure = clamp(100 + (steamFlow - demand) * 1.1, 60, 150);
    // drum level: balance of feedwater in vs. water boiled off
    const level = clamp(50 + (fw - steamFlow) * 0.85, 2, 100);
    const o2 = clamp(air * 0.16, 0.3, 12);
    const stackTemp = clamp(150 + Math.max(0, air - 15) * 2.6 + Math.max(0, fuel - 7) * 4.5, 120, 330);
    const efficiency = clamp(90 - Math.abs(air - 15) * 0.24 - (1 - combF) * 55 - Math.max(0, stackTemp - 170) * 0.06, 55, 93);
    const nox = clamp(120 + Math.max(0, fuel - 7) * 42 + Math.max(0, air - 20) * 9 + Math.max(0, pressure - 105) * 3, 50, 900);
    return {
      boilerSteamP: pressure,
      boilerDrumLevel: level,
      boilerO2: o2,
      boilerEfficiency: efficiency,
      boilerSteamFlow: steamFlow,
      boilerNOx: nox,
      boilerStackTemp: stackTemp,
    };
  },
  economics: (p, o) => {
    const steam = o.boilerSteamFlow ?? 0;
    const eff = (o.boilerEfficiency ?? 80) / 100;
    const revenue = steam * 32 * (0.6 + 0.4 * eff); // $/t steam, discounted by efficiency
    const feedCost = (p.boilerFuelRate ?? 7) * 280; // $/t fuel
    const energyCost = (p.feedwaterFlow ?? 95) * 0.6 + (p.boilerAirFlow ?? 18) * 4; // BFW pump + FD/ID fans
    const coolingCost = Math.max(0, (o.boilerNOx ?? 0) - 200) * 0.4; // emissions treatment / penalty
    return { revenue, feedCost, energyCost, coolingCost, profit: revenue - feedCost - energyCost - coolingCost };
  },
  sustainability: (p, o) => {
    const steam = o.boilerSteamFlow ?? 0;
    const co2 = (p.boilerFuelRate ?? 7) * 2750 + (o.boilerNOx ?? 0) * 2; // combustion CO₂ + NOx weighting
    const intensity = co2 / Math.max(steam, 1); // kg CO₂ / t steam
    const score = clamp(120 - intensity * 0.28 - Math.max(0, (o.boilerNOx ?? 0) - 200) * 0.05, 0, 100);
    return { co2, intensity, score };
  },
};

// ───────────────────────── Natural Gas Separation Plant (cryogenic NGL recovery) ─────────────────────────
const gsp: ProcessConfig = {
  id: "gsp",
  accent: "#2dd4bf",
  icon: "💨",
  dynamic: true,
  params: [
    { id: "rawGasFeed", unit: "MMSCFD", min: 100, max: 600, step: 5, default: 400, optimalMin: 300, optimalMax: 500, dangerHigh: 560, decimals: 0, formula: "\\dot V_{feed}\\ (\\text{inlet sour gas})" },
    { id: "amineCirculation", unit: "m³/h", min: 50, max: 400, step: 5, default: 250, optimalMin: 200, optimalMax: 330, dangerLow: 120, decimals: 0, formula: "\\text{CO}_2\\ \\text{absorbed} \\propto L_{amine}/V_{gas}" },
    { id: "expanderPressureDrop", unit: "bar", min: 5, max: 40, step: 0.5, default: 25, optimalMin: 20, optimalMax: 33, dangerLow: 12, dangerHigh: 38, decimals: 1, formula: "T_2 = T_1\\,(P_2/P_1)^{(\\gamma-1)/\\gamma}" },
    { id: "demethanizerTemp", unit: "°C", min: -110, max: -60, step: 1, default: -90, optimalMin: -98, optimalMax: -82, dangerLow: -107, dangerHigh: -68, decimals: 0, formula: "T_{top}\\downarrow\\ \\Rightarrow\\ C_2^{+}\\ \\text{recovery}\\uparrow" },
  ],
  formulas: [
    { id: "gspAbsorption", tex: "\\dot n_{CO_2,abs} = K_G a\\,V\\,(y_{CO_2} - y^{*})" },
    { id: "gspJT", tex: "T_2 = T_1\\left(\\dfrac{P_2}{P_1}\\right)^{\\!\\frac{\\gamma-1}{\\gamma}}" },
    { id: "gspRecovery", tex: "R_{C_2} = 1 - \\dfrac{\\dot n_{C_2,\\,sales}}{\\dot n_{C_2,\\,feed}}" },
  ],
  outputs: [
    { id: "gspCO2Slip", unit: "ppm", decimals: 0, betterHigher: false, graph: true, color: "#ef4444", warnLimit: 40, dangerLimit: 50, limitDirection: "high", tau: 9, formula: "\\text{CO}_2\\ \\text{slip}\\uparrow\\ \\text{(under-circulated amine)}" },
    { id: "gspC2Recovery", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#34d399", warnLimit: 62, dangerLimit: 48, limitDirection: "low", tau: 13, formula: "R_{C_2}\\uparrow\\ \\text{with}\\ \\Delta P_{exp}" },
    { id: "gspCompPower", unit: "MW", decimals: 1, betterHigher: false, graph: true, color: "#f59e0b", tau: 6, formula: "P_{comp} \\propto \\Delta P_{exp}\\cdot \\dot V_{feed}" },
    { id: "gspHydrate", unit: "%", decimals: 0, betterHigher: false, graph: true, color: "#38bdf8", warnLimit: 40, dangerLimit: 60, limitDirection: "high", tau: 8, formula: "\\text{hydrate margin}\\downarrow\\ \\text{(wet, cold gas)}" },
    { id: "gspSalesGas", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#a3e635", tau: 12 },
    { id: "gspEthane", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#22d3ee", tau: 12 },
    { id: "gspPropane", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#fb923c", tau: 12 },
    { id: "gspButane", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#c084fc", tau: 12 },
    { id: "gspCondensate", unit: "%", decimals: 1, betterHigher: true, graph: true, color: "#f43f5e", tau: 12 },
  ],
  units: [
    { id: "gspSlugCatcher", paramIds: ["rawGasFeed"], ring: [0, 0, 0] },
    { id: "gspAmine", paramIds: ["amineCirculation"], ring: [0, 0, 0] },
    { id: "gspColdBox", paramIds: ["expanderPressureDrop"], ring: [0, 0, 0] },
    { id: "gspDemethanizer", paramIds: ["demethanizerTemp"], ring: [0, 0, 0] },
  ],
  scenarios: [
    { id: "gspCO2Breakthrough", durationSec: 50, holdSec: 5, setup: { rawGasFeed: 560, amineCirculation: 130 } },
    { id: "gspHydrateFreeze", durationSec: 50, holdSec: 5, setup: { rawGasFeed: 560, demethanizerTemp: -106 } },
    { id: "gspLowRecovery", durationSec: 50, holdSec: 5, setup: { expanderPressureDrop: 6 } },
  ],
  loops: [
    { id: "gspCO2", pv: "gspCO2Slip", mv: "amineCirculation", sp: 20, spMin: 10, spMax: 45, kp: 6, ki: 1.2, kd: 0, reverse: true },
    { id: "gspRecovery", pv: "gspC2Recovery", mv: "expanderPressureDrop", sp: 88, spMin: 70, spMax: 92, kp: 0.8, ki: 0.15, kd: 0 },
  ],
  model: (p) => {
    const feed = p.rawGasFeed ?? 400, amine = p.amineCirculation ?? 250, dP = p.expanderPressureDrop ?? 25, demT = p.demethanizerTemp ?? -90;
    // acid-gas slip: the amine unit's CO₂ removal saturates when the L/G ratio falls (high feed, low circulation)
    const co2Slip = clamp(10 + Math.max(0, feed / amine - 1.55) * 130, 3, 800);
    // C₂ recovery climbs with turbo-expander ΔP (colder, more refrigeration) and a colder demethanizer top
    const c2Recovery = clamp(96 * (1 - Math.exp(-dP / 12)) + Math.max(0, -demT - 85) * 0.25, 15, 96);
    // recompression + expander brake load — roughly linear in ΔP and feed
    const compPower = clamp(2 + dP * 0.18 + feed * 0.012, 1, 45);
    // hydrate risk: rises when the dehydration beds are overloaded (high feed) or the cold box runs too cold
    const hydrate = clamp(Math.max(0, (feed - 450) / 110) * 55 + Math.max(0, (-92 - demT) / 16) * 40 + Math.max(0, 150 - amine) * 0.04, 0, 100);
    // product slate (vol % of feed); C₂ recovery shifts ethane between the sales-gas and the NGL product
    const ethane = 9 * (c2Recovery / 100);
    const propane = 5 * 0.97;
    const butane = 3.5 * 0.98;
    const condensate = 2.5 * 0.99;
    const salesGas = clamp(100 - ethane - propane - butane - condensate, 60, 95);
    return {
      gspCO2Slip: co2Slip,
      gspC2Recovery: c2Recovery,
      gspCompPower: compPower,
      gspHydrate: hydrate,
      gspSalesGas: salesGas,
      gspEthane: ethane,
      gspPropane: propane,
      gspButane: butane,
      gspCondensate: condensate,
    };
  },
  economics: (p, o) => {
    const feed = p.rawGasFeed ?? 400;
    const onSpec = (o.gspCO2Slip ?? 0) < 50 ? 1 : 0.6; // off-spec sales gas is heavily discounted
    const ngl = (o.gspEthane ?? 0) + (o.gspPropane ?? 0) + (o.gspButane ?? 0) + (o.gspCondensate ?? 0);
    // NGL is the margin; sales gas is low-value. Recovery + on-spec scale the take.
    const revenue = feed * (7 + ngl * 0.8) * (0.7 + 0.3 * (o.gspC2Recovery ?? 80) / 95) * onSpec;
    const feedCost = feed * 4; // gas purchase
    const energyCost = (o.gspCompPower ?? 10) * 60 + (p.amineCirculation ?? 250) * 1.4; // compression + amine-regen reboiler
    const coolingCost = Math.max(0, (o.gspCompPower ?? 0) - 8) * 25; // refrigeration / cold-box duty
    return { revenue, feedCost, energyCost, coolingCost, profit: revenue - feedCost - energyCost - coolingCost };
  },
  sustainability: (p, o) => {
    const feed = p.rawGasFeed ?? 400;
    // compression power (turbine / electric) + the vented acid gas stripped by the amine unit
    const co2 = (o.gspCompPower ?? 10) * 450 + feed * 7;
    const intensity = co2 / Math.max(feed, 1);
    const score = clamp(100 - (intensity - 14) * 2.2, 0, 100);
    return { co2, intensity, score };
  },
};

export const PROCESSES: Record<ProcessId, ProcessConfig> = { oil, cement, boiler, gsp, cstr };
export const PROCESS_ORDER: ProcessId[] = ["oil", "cement", "boiler", "gsp", "cstr"];

export function getConfig(id: ProcessId): ProcessConfig {
  return PROCESSES[id];
}

/** Build the default parameter map for a process. */
export function defaultParams(config: ProcessConfig): Record<string, number> {
  return Object.fromEntries(config.params.map((p) => [p.id, p.default]));
}

/** Every control loop across all processes, tagged with its owning process. */
export function getLoops(): { loop: ControlLoop; processId: ProcessId }[] {
  return PROCESS_ORDER.flatMap((pid) => (PROCESSES[pid].loops ?? []).map((loop) => ({ loop, processId: pid })));
}

/** Find a control loop (and its process) by loop id. */
export function getLoop(id: string): { loop: ControlLoop; processId: ProcessId } | undefined {
  return getLoops().find((e) => e.loop.id === id);
}

/** Map a CSTR parameter id → the legacy worker control key. */
export const CSTR_CONTROL_MAP: Record<string, string> = {
  cstrCoolantTemp: "coolantTemp",
  cstrCoolantFlow: "coolantFlow",
  cstrAgitatorRpm: "agitatorRpm",
  cstrCatalyst: "catalyst",
  cstrFeedTemp: "feedTemp",
  cstrFeedFlow: "feedFlow",
  cstrFeedConc: "feedConcentration",
  cstrSystemPressure: "systemPressure",
  cstrReflux: "refluxRatio",
  cstrReboiler: "reboilerDuty",
};
