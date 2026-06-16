import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FewsDataPoint, SimulationConfig } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSimulationData(config: SimulationConfig): FewsDataPoint[] {
  const start = new Date(config.startDate);
  
  const steps = config.durationHours;
  const totalMs = steps * 60 * 60 * 1000;

  const intensityMultiplier = config.rainfallIntensityScale / 5;

  let baseFlow = config.initialWaterLevel;

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = new Date(start.getTime() + (i * (totalMs / steps)));
    
    // Simulate a storm halfway through
    const stormPeakIndex = Math.floor(steps * 0.4);
    const stormWidth = Math.max(1, steps * 0.2);
    const distanceToPeak = Math.abs(i - stormPeakIndex);
    
    let rainfall = 0;
    if (distanceToPeak < stormWidth) {
      rainfall = (1 - (distanceToPeak / stormWidth)) * 50 * intensityMultiplier;
    }

    // Flow reacts after rainfall
    const flowBase = 50 + (baseFlow * 10);
    const flowSurge = Math.max(0, Math.sin((i / steps) * Math.PI - 0.2) * 300 * intensityMultiplier);
    const riverFlow = flowBase + flowSurge + (Math.random() * 5); // Add slight noise

    let status: FewsDataPoint['status'] = 'AMAN';
    if (riverFlow > 150) status = 'WASPADA';
    if (riverFlow > 300) status = 'SIAGA';
    if (riverFlow > 450) status = 'BAHAYA';

    // Normal level is -0.15. Peak bahaya is higher.
    const waterMapLevel = -0.15 + (riverFlow / 600) * 0.25;

    return {
      timeStep: i,
      date: t,
      rainfall: Math.max(0, rainfall),
      riverFlow,
      waterMapAlpha: Math.min(0.9, 0.4 + (riverFlow / 800)),
      waterMapLevel,
      status
    };
  });
}
