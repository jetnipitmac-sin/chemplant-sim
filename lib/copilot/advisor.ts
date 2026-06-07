/**
 * The "local Chief Engineer" — a pure, state-aware rule engine used when no LLM
 * key is configured. It inspects the live CopilotContext and returns practical,
 * safety-first advice. (The API route uses this as a graceful fallback.)
 */
import type { CopilotContext } from "./context";

/** Per-alarm remediation hints (by param/output id). */
const REMEDY: Record<string, string> = {
  cstrReactorT: "raise Coolant Flow, lower Coolant Temperature, and cut Catalyst Concentration",
  cstrPressure: "lower System Pressure and cool the reactor (pressure tracks temperature)",
  cstrConversion: "add Catalyst, warm the coolant slightly, or lower Feed Flow to lengthen residence time",
  cstrCoolantFlow: "raise Coolant Flow back above 45 L/min",
  cstrFeedConc: "reduce Feed Concentration toward 1.0 mol/L",
  cstrCatalyst: "reduce Catalyst toward 5 g/L",
  cstrFeedFlow: "bring Feed Flow back into 80–120 L/min",
  oilFurnaceTemp: "lower Furnace Temperature toward 357 °C to stop thermal cracking",
  oilSeparation: "raise Reflux Ratio toward 3.2 and hold the furnace near 357 °C",
  oilFeedRate: "cut Feed Rate below 225 m³/h to stop the trays flooding",
  oilRefluxRatio: "reduce Reflux Ratio toward 3.2",
  oilDeltaP: "cut Feed Rate and Reflux to drop the column ΔP before the trays flood",
  oilCOT: "lower Furnace Temperature toward 357 °C — the coil outlet is into the cracking zone",
  oilOverheadP: "speed up the air-cooler fans to condense the overhead and drop the top pressure",
  cementBurnTemp: "return the Burning-Zone Temperature to ~1450 °C (trim burner fuel / feed)",
  cementFreeLime: "raise burner fuel and slow the kiln to fully burn the clinker",
  cementCO: "raise the ID-fan draft and/or cut burner fuel — combustion is going rich (CO)",
  cementTorque: "slow the feed or speed the kiln — the bed load is too high",
  cementSpecHeat: "lower the flame and trim excess draft to cut fuel use",
  cementKilnSpeed: "bring Kiln Speed back to 3.0–4.0 rpm",
  burnerFuelRate: "trim Burner Fuel back toward 12 t/h",
  rawFeedRate: "bring Raw-Feed Rate back into 220–275 t/h",
  idFanSpeed: "restore ID-Fan draft into 78–92 %",
  // boiler
  boilerSteamP: "cut the Fuel Firing rate — steam pressure is approaching the safety valves",
  boilerDrumLevel: "raise Feedwater Flow now — the drum level is dropping toward the low-water trip",
  boilerO2: "open the Combustion Air — O₂ has collapsed and the furnace is making CO",
  boilerNOx: "lower the firing rate / excess air to cut NOₓ",
  boilerStackTemp: "trim excess air — stack temperature (heat loss) is too high",
  boilerFuelRate: "bring Fuel Firing back toward 7 t/h",
  boilerAirFlow: "restore Combustion Air into 12–24 % excess",
  feedwaterFlow: "restore Feedwater Flow into 80–115 t/h",
  cstrCoolantTemp: "lower the Coolant Temperature to remove more reaction heat",
  // gas separation plant
  gspCO2Slip: "raise Amine Circulation (or cut the gas feed) — the amine is saturating and CO₂ is breaking through into the sales gas",
  gspC2Recovery: "raise the Expander Pressure Drop (and chill the demethanizer top) to recover more ethane",
  gspHydrate: "cut the gas feed and warm the demethanizer top — wet gas is freezing toward the cold box",
  rawGasFeed: "bring Raw Gas Feed back into 300–500 MMSCFD so the amine and dehydration units keep up",
  amineCirculation: "restore Amine Circulation above 120 m³/h and match it to the acid-gas load",
  expanderPressureDrop: "restore the Expander Pressure Drop into 20–33 bar to recover C₂",
  demethanizerTemp: "bring the Demethanizer Top Temp back into −98…−82 °C",
};

/**
 * Short, proactive advisory for the current critical alarms (used by the copilot
 * to auto-alert the operator). Returns null when nothing is critical.
 */
export function proactiveAdvice(ctx: CopilotContext): string | null {
  const crit = ctx.alarms.filter((a) => a.severity === "critical");
  if (!crit.length) return null;
  const lines = [`🔔 ${ctx.processName} — ${crit.length} CRITICAL alarm${crit.length > 1 ? "s" : ""}:`];
  crit.slice(0, 3).forEach((a) =>
    lines.push(`• ${a.label} ${a.dir === "high" ? "HIGH" : "LOW"} at ${a.value.toFixed(1)} (limit ${a.limit}). → ${REMEDY[a.id] ?? "bring it back inside its band"}.`),
  );
  if (crit.length > 3) lines.push(`…and ${crit.length - 3} more.`);
  return lines.join("\n");
}

export function localEngineer(ctx: CopilotContext, question: string): string {
  const q = (question || "").toLowerCase();
  const crit = ctx.alarms.filter((a) => a.severity === "critical");
  const warn = ctx.alarms.filter((a) => a.severity === "warning");
  const out: string[] = [];

  const wantsDiagnose = /alarm|critical|danger|runaway|fix|stabil|diagnose|wrong|help|safe/.test(q);
  const wantsProfit = /profit|money|econom|cost|cheap|optimi|margin/.test(q);

  if (wantsDiagnose || (crit.length > 0 && !wantsProfit)) {
    if (crit.length === 0 && warn.length === 0) {
      out.push(`✅ ${ctx.processName} is stable — every guarded variable is within limits.`);
    } else {
      if (crit.length) {
        out.push(`🚨 ${crit.length} CRITICAL alarm(s):`);
        crit.forEach((a) =>
          out.push(`• ${a.label} ${a.dir === "high" ? "high" : "low"} at ${a.value.toFixed(1)} (limit ${a.limit}). Action: ${REMEDY[a.id] ?? "bring it back inside its band"}.`),
        );
      }
      if (warn.length) out.push(`⚠️ Watch (warning): ${warn.map((a) => a.label).join(", ")}.`);
    }
  }

  if (ctx.profit != null && (wantsProfit || (!crit.length && q === ""))) {
    if (ctx.profit < 0)
      out.push(`💸 Profit is −$${Math.abs(ctx.profit).toFixed(0)}/hr. Trim the biggest cost first — lower energy-heavy setpoints (reboiler / agitator / furnace) and avoid over-feeding.`);
    else out.push(`💰 Profit is $${ctx.profit.toFixed(0)}/hr. To push it higher, lift yield/conversion while keeping energy and feed costs down.`);
  }

  if (/temp|hot|cool|pressure/.test(q)) {
    ctx.outputs
      .filter((o) => /temp|pressure/i.test(o.id))
      .forEach((o) => out.push(`📟 ${o.label}: ${o.value.toFixed(1)} ${o.unit}.`));
  }

  if (out.length === 0) {
    const off = ctx.params.filter((p) => p.status !== "optimal");
    if (off.length) {
      out.push(`Parameters outside their optimal band: ${off.map((p) => `${p.label} (${p.value}${p.unit})`).join(", ")}. Nudge them toward their green ranges.`);
    } else {
      out.push(`${ctx.processName}: all parameters optimal and ${ctx.profit != null ? `profit $${ctx.profit.toFixed(0)}/hr` : "running"}. Ask me to “diagnose alarms” or “improve profit”, or name a variable to tune.`);
    }
  }

  return out.join("\n");
}
