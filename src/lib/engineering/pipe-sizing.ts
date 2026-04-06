/**
 * Pipe Sizing Module for AEGIS Trial
 * Pure TypeScript calculation library using Darcy-Weisbach equation
 * No UI, no 'use client'
 *
 * @module lib/engineering/pipe-sizing
 * @reference Darcy-Weisbach, Churchill friction factor (1977), Crane TP-410
 */

/**
 * Input interface for pipe sizing
 */
export interface PipeSizingInput {
  /** Flow rate (m³/h) */
  flowRate_m3h: number;
  /** Fluid density (kg/m³) */
  fluidDensity_kgm3: number;
  /** Dynamic viscosity (cP, centipoise) */
  viscosity_cP: number;
  /** Pipe length (m) */
  pipeLength_m: number;
  /** Elevation change (m, positive = uphill), optional */
  elevation_m?: number;
  /** Pipe roughness (mm), optional, default 0.045 (commercial steel) */
  roughness_mm?: number;
  /** Pipe schedule, optional (default 'STD' = standard weight) */
  schedule?: string;
}

/**
 * Output interface for pipe sizing
 */
export interface PipeSizingOutput {
  /** Nominal pipe size (mm) */
  nominalSize_mm: number;
  /** Pipe schedule */
  schedule: string;
  /** Inner diameter (mm) */
  innerDiameter_mm: number;
  /** Flow velocity (m/s) */
  velocity_ms: number;
  /** Reynolds number (dimensionless) */
  reynoldsNumber: number;
  /** Friction factor (Darcy, dimensionless) */
  frictionFactor: number;
  /** Pressure drop due to friction (kPa) */
  pressureDrop_kPa: number;
  /** Pressure drop in bar */
  pressureDrop_bar: number;
  /** Flow regime ('Laminar' | 'Transitional' | 'Turbulent') */
  flowRegime: string;
}

/**
 * Nominal pipe sizes and dimensions (standard weight STD)
 * Data: { nominalSize_mm: { ID_mm, ODmm, area_m2 } }
 */
const PIPE_SCHEDULES: { [size: number]: { ID_mm: number; OD_mm: number; area_m2: number } } = {
  25: { ID_mm: 20.7, OD_mm: 26.7, area_m2: 0.000337 },
  40: { ID_mm: 34.0, OD_mm: 42.16, area_m2: 0.000908 },
  50: { ID_mm: 40.9, OD_mm: 53.34, area_m2: 0.001314 },
  65: { ID_mm: 53.1, OD_mm: 66.68, area_m2: 0.002213 },
  80: { ID_mm: 62.0, OD_mm: 76.2, area_m2: 0.003019 },
  100: { ID_mm: 77.9, OD_mm: 101.6, area_m2: 0.004764 },
  150: { ID_mm: 105.0, OD_mm: 139.7, area_m2: 0.008659 },
  200: { ID_mm: 130.0, OD_mm: 177.8, area_m2: 0.013273 },
  250: { ID_mm: 157.5, OD_mm: 228.6, area_m2: 0.019502 },
  300: { ID_mm: 185.0, OD_mm: 273.0, area_m2: 0.026858 },
  350: { ID_mm: 206.5, OD_mm: 323.9, area_m2: 0.033507 },
  400: { ID_mm: 228.0, OD_mm: 355.6, area_m2: 0.040866 },
  450: { ID_mm: 254.0, OD_mm: 406.4, area_m2: 0.050671 },
  500: { ID_mm: 279.5, OD_mm: 457.2, area_m2: 0.061373 },
  600: { ID_mm: 330.0, OD_mm: 558.8, area_m2: 0.085450 },
};

/**
 * Calculate Reynolds number
 * Re = (rho * v * D) / mu
 * where mu is dynamic viscosity in Pa·s
 * @param density_kgM3 Fluid density (kg/m³)
 * @param velocity_ms Flow velocity (m/s)
 * @param diameter_mm Pipe inner diameter (mm)
 * @param viscosity_cP Dynamic viscosity (cP)
 * @returns Reynolds number (dimensionless)
 * @method Re = (ρ × v × D) / μ
 */
function calculateReynoldsNumber(
  density_kgM3: number,
  velocity_ms: number,
  diameter_mm: number,
  viscosity_cP: number
): number {
  // Convert diameter to meters
  const diameter_m = diameter_mm / 1000;

  // Convert viscosity from cP to Pa·s (1 cP = 0.001 Pa·s)
  const viscosity_Pa_s = viscosity_cP * 0.001;

  // Reynolds number
  const re = (density_kgM3 * velocity_ms * diameter_m) / viscosity_Pa_s;

  return re;
}

/**
 * Calculate friction factor using Churchill equation
 * Covers all flow regimes: laminar, transitional, turbulent
 * f = 64/Re for laminar (Re < 2300)
 * Churchill equation for all regimes (smooth and rough pipes)
 * @param reynoldsNumber Reynolds number
 * @param relativeRoughness e/D (roughness / diameter)
 * @returns Darcy friction factor (dimensionless)
 * @method Churchill equation (1977)
 */
function calculateFrictionFactor(reynoldsNumber: number, relativeRoughness: number): number {
  // Laminar flow
  if (reynoldsNumber < 2300) {
    return 64 / Math.max(1, reynoldsNumber); // Avoid division by zero
  }

  // Turbulent flow - Churchill equation
  // Good for smooth and rough pipes, all turbulent regions
  const A =
    Math.pow(2.457 * Math.log(1 / Math.pow(7 / reynoldsNumber, 0.9)), 2) +
    (0.27 * relativeRoughness) * (0.27 * relativeRoughness);

  const B = Math.pow(37530 / reynoldsNumber, 16);

  const f = 8 * Math.pow(Math.pow(8 / reynoldsNumber, 12) + 1 / Math.pow(A + B, 1.5), 1 / 12);

  return Math.max(0.008, Math.min(0.1, f)); // Reasonable bounds
}

/**
 * Calculate pressure drop using Darcy-Weisbach equation
 * dP_friction = f * (L/D) * (0.5 * rho * v²)
 * dP_elevation = rho * g * h
 * dP_total = dP_friction + dP_elevation
 * @param frictionFactor Darcy friction factor
 * @param pipeLength_m Pipe length (m)
 * @param innerDiameter_mm Pipe inner diameter (mm)
 * @param density_kgM3 Fluid density (kg/m³)
 * @param velocity_ms Flow velocity (m/s)
 * @param elevation_m Elevation change (m), positive = uphill
 * @returns Pressure drop in kPa
 * @method Darcy-Weisbach + static head
 */
function calculatePressureDrop(
  frictionFactor: number,
  pipeLength_m: number,
  innerDiameter_mm: number,
  density_kgM3: number,
  velocity_ms: number,
  elevation_m: number = 0
): number {
  // Convert diameter to meters
  const D_m = innerDiameter_mm / 1000;

  // Darcy-Weisbach: dP = f * (L/D) * (0.5 * rho * v²)
  // Result in Pa
  const dpFriction_Pa =
    frictionFactor * (pipeLength_m / D_m) * (0.5 * density_kgM3 * velocity_ms * velocity_ms);

  // Static head: dP = rho * g * h
  // g = 9.81 m/s²
  const dpElevation_Pa = density_kgM3 * 9.81 * elevation_m;

  // Total pressure drop
  const dpTotal_Pa = dpFriction_Pa + dpElevation_Pa;

  // Convert to kPa
  const dpTotal_kPa = dpTotal_Pa / 1000;

  return dpTotal_kPa;
}

/**
 * Determine flow regime
 * @param reynoldsNumber Reynolds number
 * @returns Flow regime string
 */
function determineFlowRegime(reynoldsNumber: number): string {
  if (reynoldsNumber < 2300) return 'Laminar';
  if (reynoldsNumber < 4000) return 'Transitional';
  return 'Turbulent';
}

/**
 * Select optimal pipe size based on velocity limits
 * @param flowRate_m3h Flow rate (m³/h)
 * @param minVelocity_ms Minimum economic velocity (m/s)
 * @param maxVelocity_ms Maximum economic velocity (m/s)
 * @returns { nominalSize_mm, velocity_ms } or null if not found
 */
function selectPipeSize(
  flowRate_m3h: number,
  minVelocity_ms: number,
  maxVelocity_ms: number
): { nominalSize_mm: number; velocity_ms: number } | null {
  // Convert flow from m³/h to m³/s
  const flowRate_m3s = flowRate_m3h / 3600;

  // Available pipe sizes
  const sizes = Object.keys(PIPE_SCHEDULES)
    .map(s => parseInt(s))
    .sort((a, b) => a - b);

  for (const size of sizes) {
    const pipe = PIPE_SCHEDULES[size];
    const velocity = flowRate_m3s / pipe.area_m2;

    if (velocity >= minVelocity_ms && velocity <= maxVelocity_ms) {
      return { nominalSize_mm: size, velocity_ms: velocity };
    }
  }

  // If no ideal size found, use smallest that doesn't exceed max velocity
  for (const size of sizes) {
    const pipe = PIPE_SCHEDULES[size];
    const velocity = flowRate_m3s / pipe.area_m2;

    if (velocity <= maxVelocity_ms) {
      return { nominalSize_mm: size, velocity_ms: velocity };
    }
  }

  return null;
}

/**
 * Size a pipe system for given flow and fluid properties
 *
 * Input parameters:
 * - flowRate_m3h: Flow rate in m³/h
 * - fluidDensity_kgm3: Fluid density in kg/m³
 * - viscosity_cP: Fluid viscosity in cP (centipoise)
 * - pipeLength_m: Pipe length in m
 * - elevation_m: Elevation change (optional)
 * - roughness_mm: Pipe roughness (optional, default 0.045 mm for steel)
 *
 * Output includes:
 * - Pipe size selected based on economic velocity
 * - Flow velocity and Reynolds number
 * - Friction factor and pressure drop
 * - Flow regime classification
 *
 * Economic velocity ranges:
 * - Liquids: 1-3 m/s
 * - Gases: 15-25 m/s
 *
 * @param input Pipe sizing input
 * @returns Pipe sizing result
 * @method Economic velocity selection, Churchill friction factor, Darcy-Weisbach
 */
export function sizePipe(input: PipeSizingInput): PipeSizingOutput {
  // Default parameters
  const roughness_mm = input.roughness_mm ?? 0.045; // Commercial steel
  const elevation = input.elevation_m ?? 0;

  // Determine economic velocity range based on density (proxy for phase)
  let minVelocity = 1.0; // m/s
  let maxVelocity = 3.0; // m/s

  if (input.fluidDensity_kgm3 < 100) {
    // Gas-like
    minVelocity = 15;
    maxVelocity = 25;
  } else if (input.fluidDensity_kgm3 < 500) {
    // Light liquid/mixed
    minVelocity = 2;
    maxVelocity = 5;
  }

  // Select pipe size
  const sizeResult = selectPipeSize(input.flowRate_m3h, minVelocity, maxVelocity);

  if (!sizeResult) {
    throw new Error(
      `No suitable pipe size found for flow ${input.flowRate_m3h} m³/h with velocity ${minVelocity}-${maxVelocity} m/s`
    );
  }

  const nominalSize = sizeResult.nominalSize_mm;
  const pipeData = PIPE_SCHEDULES[nominalSize];
  const velocity = sizeResult.velocity_ms;

  // Calculate Reynolds number
  const re = calculateReynoldsNumber(
    input.fluidDensity_kgm3,
    velocity,
    pipeData.ID_mm,
    input.viscosity_cP
  );

  // Calculate friction factor
  const relativeRoughness = roughness_mm / pipeData.ID_mm;
  const frictionFactor = calculateFrictionFactor(re, relativeRoughness);

  // Calculate pressure drop
  const pressureDrop_kPa = calculatePressureDrop(
    frictionFactor,
    input.pipeLength_m,
    pipeData.ID_mm,
    input.fluidDensity_kgm3,
    velocity,
    elevation
  );

  const pressureDrop_bar = pressureDrop_kPa / 100;

  // Determine flow regime
  const flowRegime = determineFlowRegime(re);

  return {
    nominalSize_mm: nominalSize,
    schedule: 'STD',
    innerDiameter_mm: parseFloat(pipeData.ID_mm.toFixed(1)),
    velocity_ms: parseFloat(velocity.toFixed(2)),
    reynoldsNumber: parseFloat(re.toFixed(0)),
    frictionFactor: parseFloat(frictionFactor.toFixed(5)),
    pressureDrop_kPa: parseFloat(pressureDrop_kPa.toFixed(2)),
    pressureDrop_bar: parseFloat(pressureDrop_bar.toFixed(3)),
    flowRegime,
  };
}

/**
 * Validate pipe sizing inputs
 * @param input Pipe sizing input
 * @returns Object with validity and warnings
 */
export function validatePipeSizingInput(input: PipeSizingInput): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (input.flowRate_m3h <= 0) {
    warnings.push('Error: Flow rate must be positive');
  }

  if (input.fluidDensity_kgm3 <= 0) {
    warnings.push('Error: Fluid density must be positive');
  }

  if (input.viscosity_cP <= 0) {
    warnings.push('Error: Viscosity must be positive');
  }

  if (input.pipeLength_m <= 0) {
    warnings.push('Error: Pipe length must be positive');
  }

  if (input.viscosity_cP > 1000) {
    warnings.push('Warning: Very high viscosity (>1000 cP) - check units');
  }

  if (input.fluidDensity_kgm3 > 2000) {
    warnings.push('Warning: High density (>2000 kg/m³) - check units');
  }

  return {
    isValid: warnings.filter(w => w.startsWith('Error')).length === 0,
    warnings,
  };
}
