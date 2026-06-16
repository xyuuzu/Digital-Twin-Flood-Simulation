export interface FewsDataPoint {
  timeStep: number;
  date: Date;
  rainfall: number;
  riverFlow: number; // m3/s
  waterMapAlpha: number; // 0 to 1
  waterMapLevel: number; // y-axis offset for WebGL (-0.2 to 0.5)
  status: 'AMAN' | 'WASPADA' | 'SIAGA' | 'BAHAYA';
}

export interface SimulationConfig {
  startDate: string;
  durationHours: number;
  rainfallIntensityScale: number; // 1 to 10
  initialWaterLevel: number;
}
