/**
 * Shell & Tube Heat Exchanger Design Module for AEGIS Trial
 * Pure TypeScript calculation library using Kern Method
 * No UI, no 'use client'
 *
 * @module lib/engineering/heat-exchanger
 * @reference Kern Method (Process Heat Transfer, 1950), TEMA Standards
 */

/**
 * Input interface for heat exchanger sizing
 */
export interface HeatExchangerInput {
  /** Heat duty (kW) */
  dutyKW: number;
  /** Hot side inlet temperature (°C) */
  hotInletC: number;
  /** Hot side outlet temperature (°C) */
  hotOutletC: number;
  /** Cold side inlet temperature (°C) */
  coldInletC: number;
  /** Cold side outlet temperature (°C) */
  coldOutletC: number;
  /** Tube side fluid type (optional, default 'liquid') */
  tubeSideFluid?: string;
  /** Shell side fluid type (optional, default 'liquid') */
  shellSideFluid?: string;
  /** Fouling factor (m²K/W, optional, default 0.0002) */
  foulingFactor?: number;
}

/**
 * Output interface for heat exchanger design
 */
export interface HeatExchangerOutput {
  /** Log mean temperature difference (°C) */
  lmtd: number;
  /** Correction factor for flow arrangement */
  correctionFactor: number;
  /** Overall heat transfer coefficient (W/m²K) */
  overallU: number;
  /** Required heat transfer area (m²) */
  area_m2: number;
  /** Number of tubes required */
  numberOfTubes: number;
  /** Shell diameter (mm) */
  shellDiameter_mm: number;
  /** Tube length (m) */
  tubeLength_m: number;
  /** Number of shell passes */
  shellPasses: number;
  /** Number of tube passes */
  tubePasses: number;
  /** Pressure drop on shell side (kPa) */
  pressureDropShell_kPa: number;
  /** Pressure drop on tube side (kPa) */
  pressureDropTube_kPa: number;
}

/**
 * Calculate log mean temperature difference (LMTD)
 * For counter-current flow: LMTD = (ΔT1 - ΔT2) / ln(ΔT1/ΔT2)
 * @param hotInlet Hot inlet temperature (°C)
 * @param hotOutlet Hot outlet temperature (°C)
 * @param coldInlet Cold inlet temperature (°C)
 * @param coldOutlet Cold outlet temperature (°C)
 * @returns LMTD in °C
 * @method Counter-current LMTD
 */
function calculateLMTD(
  hotInlet: number,
  hotOutlet: number,
  coldInlet: number,
  coldOutlet: number
): number {
  // Counter-current: hotter outlet meets colder inlet
  const deltaT1 = hotInlet - coldOutlet; // Larger difference
  const deltaT2 = hotOutlet - coldInlet; // Smaller difference

  if (deltaT1 <= 0 || deltaT2 <= 0) {
    throw new Error('Invalid temperature configuration: check inlet/outlet temperatures');
  }

  if (Math.abs(deltaT1 - deltaT2) < 0.1) {
    // Avoid log of numbers very close to 1
    return (deltaT1 + deltaT2) / 2;
  }

  const lmtd = (deltaT1 - deltaT2) / Math.log(deltaT1 / deltaT2);
  return Math.max(0.1, lmtd);
}

/**
 * Get correction factor for TEMA type
 * Common TEMA types and correction factors for 1-2 TEMA E (1 shell pass, 2 tube passes)
 * @param shellPasses Number of shell passes
 * @param tubePasses Number of tube passes
 * @returns Correction factor F (typically 0.85-0.95)
 * @method TEMA standards
 */
function getCorrectionFactor(shellPasses: number, tubePasses: number): number {
  // 1 shell pass, 2 tube passes (most common): F ≈ 0.9
  if (shellPasses === 1 && tubePasses === 2) return 0.9;

  // 2 shell pass, 4 tube passes: F ≈ 0.85
  if (shellPasses === 2 && tubePasses === 4) return 0.85;

  // 1 shell pass, 1 tube pass (co-current): F ≈ 0.87
  if (shellPasses === 1 && tubePasses === 1) return 0.87;

  // Default
  return 0.85;
}

/**
 * Get assumed overall heat transfer coefficient based on fluid types
 * @param tubeSide Tube side fluid type
 * @param shellSide Shell side fluid type
 * @returns Overall U coefficient (W/m²K)
 * @method Typical values for hydrocarbon services
 */
function getOverallU(tubeSide: string = 'liquid', shellSide: string = 'liquid'): number {
  const key = `${tubeSide}-${shellSide}`.toLowerCase();

  const uValues: { [key: string]: number } = {
    'water-water': 850,
    'liquid-water': 350,
    'oil-water': 350,
    'gas-water': 60,
    'water-gas': 60,
    'oil-oil': 250,
    'liquid-liquid': 250,
    'gas-liquid': 60,
    'liquid-gas': 60,
  };

  return uValues[key] || 200; // Default fallback
}

/**
 * Calculate number of tubes from area and geometry
 * Standard tube dimensions: OD = 19.05mm, ID = 15.75mm, length = 4.88m
 * @param area Required heat transfer area (m²)
 * @param tubeOD Tube outer diameter (mm), default 19.05
 * @param tubeLength Tube length (m), default 4.88
 * @returns Number of tubes
 * @method Area / (π × OD × length)
 */
function calculateNumberOfTubes(
  area: number,
  tubeOD: number = 19.05,
  tubeLength: number = 4.88
): number {
  const tubeOD_m = tubeOD / 1000;
  const surfacePerTube = Math.PI * tubeOD_m * tubeLength;
  const nTubes = area / surfacePerTube;

  // Round up to even number (for tube bundle symmetry)
  return Math.ceil(nTubes / 2) * 2;
}

/**
 * Calculate shell diameter from tube count
 * Uses tube count to pitch ratio correlation
 * CTP ≈ 0.93 for one pass (central longitudinal baffle)
 * @param numberOfTubes Number of tubes
 * @param triangularPitch Tube pitch (mm), default 25.4
 * @param CTP Tube count to pitch constant, default 0.93
 * @returns Shell diameter in mm
 * @method D = sqrt(Nt / (CTP * (π/4))) for triangular layout
 */
function calculateShellDiameter(
  numberOfTubes: number,
  triangularPitch: number = 25.4,
  CTP: number = 0.93
): number {
  // For triangular pitch layout
  // Nt = (π/4) * (D/p)² * CTP
  // D = p * sqrt((4 * Nt) / (π * CTP))

  const pitchM = triangularPitch / 1000;
  const diameterM = pitchM * Math.sqrt((4 * numberOfTubes) / (Math.PI * CTP));
  const diameterMm = diameterM * 1000;

  // Round to nearest standard shell diameter
  const standard = [100, 127, 152, 203, 254, 305, 356, 406, 457, 508, 559, 610, 660, 711, 762];
  const closest = standard.reduce((prev, curr) =>
    Math.abs(curr - diameterMm) < Math.abs(prev - diameterMm) ? curr : prev
  );

  return closest;
}

/**
 * Estimate pressure drop on shell side (simplified)
 * @param numberOfTubes Number of tubes
 * @param tubePitch Tube pitch (mm)
 * @param velocity Flow velocity on shell side (m/s), default 0.8
 * @returns Pressure drop in kPa
 * @method Simplified Darcy-Weisbach
 */
function estimateShellPressureDrop(
  numberOfTubes: number,
  tubePitch: number = 25.4,
  velocity: number = 0.8
): number {
  // Simplified: dP ≈ 0.2 kPa per m/s for typical hydrocarbons
  // More detailed calculation would use Kern method with baffle spacing
  const baseDrop = 0.2 * velocity;
  const numberOfBaffles = Math.max(2, Math.floor(numberOfTubes / 50));
  const totalDrop = baseDrop * numberOfBaffles;

  return Math.max(1, Math.min(50, totalDrop)); // Typical range 1-50 kPa
}

/**
 * Estimate pressure drop on tube side (simplified)
 * Depends on number of tube passes and flow velocity
 * @param numberOfTubes Number of tubes
 * @param tubePasses Number of tube passes (1, 2, 4)
 * @param tubeLength Tube length (m)
 * @param velocity Flow velocity in tubes (m/s), default 1.5
 * @returns Pressure drop in kPa
 * @method Simplified friction factor method
 */
function estimateTubePressureDrop(
  numberOfTubes: number,
  tubePasses: number = 2,
  tubeLength: number = 4.88,
  velocity: number = 1.5
): number {
  // Each pass: f = 64/Re for laminar, Churchill for turbulent
  // For typical liquid flow: f ≈ 0.03-0.05
  // dP ≈ f * (L/D) * (0.5 * rho * v²)
  // Simplified: dP ≈ 0.15 kPa per pass per m/s

  const frictionFactor = 0.04; // Typical value
  const tubeDiameter = 15.75 / 1000; // m
  const effectiveLength = tubeLength * tubePasses;

  // Darcy-Weisbach: dP [Pa] = f * (L/D) * 0.5 * rho * v²
  const rho = 900; // kg/m³ typical hydrocarbon
  const pressurePa =
    frictionFactor * (effectiveLength / tubeDiameter) * 0.5 * rho * velocity * velocity;

  return Math.max(1, Math.min(100, pressurePa / 1000)); // Convert to kPa
}

/**
 * Design a shell & tube heat exchanger using the Kern Method
 *
 * Input parameters:
 * - dutyKW: Heat duty in kW
 * - hotInletC, hotOutletC, coldInletC, coldOutletC: Temperatures
 * - tubeSideFluid, shellSideFluid: Fluid types (water, oil, gas)
 * - foulingFactor: Additional thermal resistance (m²K/W)
 *
 * Output includes:
 * - LMTD and correction factor
 * - Required heat transfer area and number of tubes
 * - Shell diameter and tube passes
 * - Estimated pressure drops
 *
 * @param input Heat exchanger input parameters
 * @returns Heat exchanger design
 * @method Kern Method, TEMA E configuration (1 shell pass, 2 tube passes)
 */
export function designHeatExchanger(input: HeatExchangerInput): HeatExchangerOutput {
  // Default parameters
  const tubeSide = input.tubeSideFluid || 'liquid';
  const shellSide = input.shellSideFluid || 'liquid';
  const foulingFactor = input.foulingFactor || 0.0002; // m²K/W

  // Calculate LMTD
  const lmtd = calculateLMTD(
    input.hotInletC,
    input.hotOutletC,
    input.coldInletC,
    input.coldOutletC
  );

  // TEMA type: 1 shell pass, 2 tube passes (E type, most common)
  const shellPasses = 1;
  const tubePasses = 2;

  // Get correction factor
  const correctionFactor = getCorrectionFactor(shellPasses, tubePasses);

  // Get overall U
  const baseU = getOverallU(tubeSide, shellSide);

  // Apply fouling factor: 1/U_clean = 1/U_base + foulingFactor
  const u_clean = 1 / (1 / baseU - foulingFactor);
  const overallU = Math.max(50, Math.min(baseU, u_clean)); // Reasonable bounds

  // Calculate required area: A = Q / (U * F * LMTD)
  // Q in W
  const dutyW = input.dutyKW * 1000;
  const area = dutyW / (overallU * correctionFactor * lmtd);

  // Calculate number of tubes
  const numberOfTubes = calculateNumberOfTubes(area, 19.05, 4.88);

  // Calculate shell diameter
  const shellDiameter_mm = calculateShellDiameter(numberOfTubes, 25.4, 0.93);

  // Tube length (standard 4.88m for medium-sized HX)
  const tubeLength_m = 4.88;

  // Estimate pressure drops
  const pressureDropShell = estimateShellPressureDrop(numberOfTubes, 25.4, 0.8);
  const pressureDropTube = estimateTubePressureDrop(
    numberOfTubes,
    tubePasses,
    tubeLength_m,
    1.5
  );

  return {
    lmtd: parseFloat(lmtd.toFixed(2)),
    correctionFactor: parseFloat(correctionFactor.toFixed(2)),
    overallU: parseFloat(overallU.toFixed(1)),
    area_m2: parseFloat(area.toFixed(2)),
    numberOfTubes,
    shellDiameter_mm,
    tubeLength_m,
    shellPasses,
    tubePasses,
    pressureDropShell_kPa: parseFloat(pressureDropShell.toFixed(1)),
    pressureDropTube_kPa: parseFloat(pressureDropTube.toFixed(1)),
  };
}

/**
 * Validate heat exchanger design feasibility
 * @param input Heat exchanger input
 * @returns Object with validity and warnings
 */
export function validateHeatExchangerDesign(input: HeatExchangerInput): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check temperature crossover
  if (input.hotOutletC < input.coldOutletC) {
    warnings.push('Warning: Hot outlet below cold outlet - check temperatures');
  }

  if (input.hotInletC <= input.coldInletC) {
    warnings.push('Error: Hot inlet must be above cold inlet');
  }

  if (input.hotInletC - input.hotOutletC < 1) {
    warnings.push('Warning: Small hot side temperature approach');
  }

  if (input.coldOutletC - input.coldInletC < 1) {
    warnings.push('Warning: Small cold side temperature approach');
  }

  // Check duty is positive
  if (input.dutyKW <= 0) {
    warnings.push('Error: Duty must be positive');
  }

  // Check fouling factor is reasonable
  if (input.foulingFactor && input.foulingFactor > 0.0005) {
    warnings.push('Warning: High fouling factor - consider cleaning strategy');
  }

  return {
    isValid: warnings.filter(w => w.startsWith('Error')).length === 0,
    warnings,
  };
}
