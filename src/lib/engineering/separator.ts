/**
 * Two/Three Phase Separator Design Module for AEGIS Trial
 * Pure TypeScript calculation library for separator sizing
 * No UI, no 'use client'
 *
 * @module lib/engineering/separator
 * @reference Arnold & Stewart (Surface Production Operations), API 12J
 */

/**
 * Input interface for separator sizing
 */
export interface SeparatorInput {
  /** Oil flow rate (m³/h) */
  oilFlowRate_m3h: number;
  /** Water flow rate (m³/h) */
  waterFlowRate_m3h: number;
  /** Gas flow rate (m³/h) */
  gasFlowRate_m3h: number;
  /** Oil density (kg/m³) */
  oilDensity_kgm3: number;
  /** Water density (kg/m³), default 1000 */
  waterDensity_kgm3?: number;
  /** Gas density (kg/m³) */
  gasDensity_kgm3: number;
  /** Operating pressure (bar) */
  operatingPressure_bar: number;
  /** Operating temperature (°C) */
  operatingTemperature_C: number;
  /** Droplet size for coalescence (µm, optional, default 150) */
  dropletSize_um?: number;
}

/**
 * Output interface for separator design
 */
export interface SeparatorOutput {
  /** Separator type: '2-phase' or '3-phase' */
  type: '2-phase' | '3-phase';
  /** Orientation: 'horizontal' (typical for field separators) */
  orientation: 'horizontal';
  /** Separator diameter (mm) */
  diameter_mm: number;
  /** Tangent-to-tangent length (mm) */
  tangentLength_mm: number;
  /** Length to diameter ratio */
  ld_ratio: number;
  /** Gas capacity at operating conditions (m³/h) */
  gasCapacity_m3h: number;
  /** Liquid retention time (minutes) */
  liquidRetention_min: number;
  /** Settling velocity for oil droplets in water (m/s) */
  settlingVelocity_ms: number;
  /** Estimated separator weight empty (kg) */
  weight_kg: number;
}

/**
 * Calculate Souders-Brown constant for different configurations
 * K varies with orientation and inlet type
 * @param orientation Separator orientation ('horizontal' | 'vertical')
 * @param hasInletDiverter Whether inlet diverter is present
 * @returns Souders-Brown constant (m/s)
 * @method API 12J guidelines
 */
function getSoudersBrownConstant(
  orientation: string,
  hasInletDiverter: boolean = true
): number {
  // Typical K values
  if (orientation === 'horizontal') {
    return hasInletDiverter ? 0.107 : 0.093; // m/s
  }
  if (orientation === 'vertical') {
    return hasInletDiverter ? 0.122 : 0.107; // m/s
  }
  return 0.107; // Default for horizontal with diverter
}

/**
 * Calculate settling velocity for oil droplets in water
 * Using Stokes' law (laminar settling)
 * v = (g * d² * (ρo - ρw)) / (18 * µ)
 * where d = droplet diameter
 *       ρo = oil density
 *       ρw = water density
 *       µ = water dynamic viscosity
 * @param oilDensity_kgM3 Oil density (kg/m³)
 * @param waterDensity_kgM3 Water density (kg/m³)
 * @param dropletSize_um Oil droplet size (micrometers)
 * @param waterViscosity_cP Water viscosity (cP), default 0.8 at 35°C
 * @returns Settling velocity (m/s)
 * @method Stokes' law
 */
function calculateSettlingVelocity(
  oilDensity_kgM3: number,
  waterDensity_kgM3: number,
  dropletSize_um: number,
  waterViscosity_cP: number = 0.8
): number {
  // Convert droplet size to meters
  const diameter_m = dropletSize_um / 1e6;

  // Convert water viscosity to Pa·s
  const viscosity_Pa_s = waterViscosity_cP * 0.001;

  // Acceleration due to gravity
  const g = 9.81; // m/s²

  // Density difference
  const densityDiff = oilDensity_kgM3 - waterDensity_kgM3;

  if (densityDiff <= 0) {
    return 0.001; // Oil heavier than water, settling not applicable
  }

  // Stokes equation: v = (g * d² * Δρ) / (18 * µ)
  const velocity = (g * diameter_m * diameter_m * densityDiff) / (18 * viscosity_Pa_s);

  return Math.max(0.001, velocity); // Minimum 0.001 m/s
}

/**
 * Calculate separator diameter from gas capacity
 * Gas capacity constraint: A = Qg / Vf
 * where Qg = gas flow (m³/s)
 *       Vf = flooding velocity (m/s)
 * For horizontal: D = sqrt(4A / (π * sin(θ)) where θ ≈ 80° for typical design
 * @param gasFlowRate_m3h Gas flow rate (m³/h)
 * @param oilDensity_kgM3 Oil density (kg/m³)
 * @param waterDensity_kgM3 Water density (kg/m³)
 * @param gasDensity_kgM3 Gas density (kg/m³)
 * @param hasInletDiverter Inlet diverter present
 * @returns Separator diameter (mm)
 * @method Souders-Brown correlation
 */
function calculateDiameterFromGasCapacity(
  gasFlowRate_m3h: number,
  oilDensity_kgM3: number,
  waterDensity_kgM3: number,
  gasDensity_kgM3: number,
  hasInletDiverter: boolean = true
): number {
  // Convert gas flow from m³/h to m³/s
  const gasFlowRate_m3s = gasFlowRate_m3h / 3600;

  // Get Souders-Brown constant
  const K = getSoudersBrownConstant('horizontal', hasInletDiverter);

  // Average liquid density (2-phase or 3-phase)
  const avgLiquidDensity = (oilDensity_kgM3 + waterDensity_kgM3) / 2;

  // Flooding velocity: Vf = K * sqrt((ρL - ρG) / ρG)
  const densityRatio = (avgLiquidDensity - gasDensity_kgM3) / gasDensity_kgM3;
  const Vf = K * Math.sqrt(densityRatio);

  // Use 85% of flooding velocity for design margin
  const V_design = 0.85 * Vf;

  // Gas cross-sectional area: A = Qg / V
  const area = gasFlowRate_m3s / V_design;

  // For horizontal separator: A ≈ (π/4) * D² (approximation for fill level ~50%)
  const diameter_m = Math.sqrt((4 * area) / Math.PI);
  const diameter_mm = diameter_m * 1000;

  // Round to nearest 100 mm
  return Math.ceil(diameter_mm / 100) * 100;
}

/**
 * Calculate separator length from liquid retention time
 * Retention time = L / V_liquid
 * where L = seam-to-seam length
 *       V_liquid = liquid velocity through separator
 * @param liquidFlowRate_m3h Oil + water flow rate (m³/h)
 * @param diameter_mm Separator diameter (mm)
 * @param retentionTime_min Desired retention time (min), default 3-5 min
 * @returns Seam-to-seam length (mm)
 * @method Retention time equation
 */
function calculateLengthFromRetention(
  liquidFlowRate_m3h: number,
  diameter_mm: number,
  retentionTime_min: number = 4
): number {
  // Convert flow from m³/h to m³/s
  const liquidFlow_m3s = liquidFlowRate_m3h / 3600;

  // Separator cross-sectional area (horizontal, 50% fill)
  const diameter_m = diameter_mm / 1000;
  const area = (Math.PI * diameter_m * diameter_m) / 4 * 0.5; // 50% fill

  // Liquid velocity
  const velocity = liquidFlow_m3s / area; // m/s

  // Required length: L = V * t
  const retentionTime_s = retentionTime_min * 60;
  const length_m = velocity * retentionTime_s;
  const length_mm = length_m * 1000;

  // Round to nearest 100 mm
  return Math.max(1000, Math.ceil(length_mm / 100) * 100);
}

/**
 * Calculate separator weight (empty, no internals)
 * Simplified as cylindrical vessel
 * @param diameter_mm Separator diameter (mm)
 * @param length_mm Seam-to-seam length (mm)
 * @param wallThickness_mm Steel wall thickness (mm), default 6.35
 * @param steelDensity_kgM3 Steel density (kg/m³), default 7850
 * @returns Weight in kg
 * @method Cylinder volume × density
 */
function calculateSeparatorWeight(
  diameter_mm: number,
  length_mm: number,
  wallThickness_mm: number = 6.35,
  steelDensity_kgM3: number = 7850
): number {
  // Convert to meters
  const D_m = diameter_mm / 1000;
  const L_m = length_mm / 1000;
  const t_m = wallThickness_mm / 1000;

  // Outer diameter
  const OD_m = D_m + 2 * t_m;

  // Shell volume (cylindrical)
  const shellVolume = Math.PI * D_m * L_m * t_m;

  // Head volume (approximate as hemispheres)
  // Total volume ≈ 2 * (2/3 * π * r² * t) for dished ends
  const headVolume = (2 / 3) * Math.PI * ((OD_m / 2) * (OD_m / 2)) * t_m * 2;

  // Total volume
  const totalVolume = shellVolume + headVolume;

  // Weight
  const weight = totalVolume * steelDensity_kgM3;

  // Add ~15% for internals and connections
  return weight * 1.15;
}

/**
 * Design a two or three-phase separator
 *
 * Input parameters:
 * - oilFlowRate_m3h, waterFlowRate_m3h, gasFlowRate_m3h: Production rates
 * - oilDensity_kgM3, waterDensity_kgM3, gasDensity_kgM3: Phase densities
 * - operatingPressure_bar, operatingTemperature_C: Conditions
 * - dropletSize_um: Expected oil droplet size (optional)
 *
 * Design approach:
 * 1. Determine separator type (2-phase if no water, 3-phase with water)
 * 2. Size diameter from gas capacity constraint (Souders-Brown)
 * 3. Size length from liquid retention time (3-5 minutes typical)
 * 4. Calculate settling velocity for oil-water interface control
 *
 * Output includes:
 * - Separator dimensions (diameter, length, L/D ratio)
 * - Gas capacity and liquid retention
 * - Settling velocity and separator weight
 *
 * @param input Separator sizing input
 * @returns Separator design
 * @method Souders-Brown correlation, retention time, Stokes settling
 */
export function designSeparator(input: SeparatorInput): SeparatorOutput {
  // Default water density
  const waterDensity = input.waterDensity_kgm3 ?? 1000;

  // Default droplet size
  const dropletSize = input.dropletSize_um ?? 150; // micrometers

  // Determine separator type
  const isTwoPhase = input.waterFlowRate_m3h < 0.01; // Less than 0.01 m³/h water
  const separatorType = isTwoPhase ? '2-phase' : '3-phase';

  // Calculate diameter from gas capacity
  // For two-phase, use oil-gas interaction
  const effectiveLiquidDensity = isTwoPhase ? input.oilDensity_kgm3 : input.oilDensity_kgm3;

  const diameter_mm = calculateDiameterFromGasCapacity(
    input.gasFlowRate_m3h,
    effectiveLiquidDensity,
    waterDensity,
    input.gasDensity_kgm3,
    true // Assume inlet diverter present
  );

  // Calculate length from liquid retention
  const totalLiquidFlow = input.oilFlowRate_m3h + input.waterFlowRate_m3h;
  const retentionTime = isTwoPhase ? 3 : 4; // 3-4 minutes typical

  const tangentLength_mm = calculateLengthFromRetention(
    totalLiquidFlow,
    diameter_mm,
    retentionTime
  );

  // L/D ratio
  const ld_ratio = parseFloat((tangentLength_mm / diameter_mm).toFixed(2));

  // Validate L/D is in reasonable range (typically 3-5 for horizontal)
  if (ld_ratio < 2 || ld_ratio > 6) {
    // Log warning but continue
  }

  // Gas capacity at operating conditions
  const K = getSoudersBrownConstant('horizontal', true);
  const densityRatio = (effectiveLiquidDensity - input.gasDensity_kgm3) / input.gasDensity_kgm3;
  const Vf = K * Math.sqrt(densityRatio);
  const V_design = 0.85 * Vf;

  // Cross-sectional area (50% fill for horizontal)
  const diameter_m = diameter_mm / 1000;
  const area = (Math.PI * diameter_m * diameter_m) / 4 * 0.5;

  // Gas capacity
  const gasCapacity_m3h = V_design * area * 3600; // Convert m³/s to m³/h

  // Liquid retention time
  const liquidVolume_m3 =
    (Math.PI * diameter_m * diameter_m) / 4 * (tangentLength_mm / 1000) * 0.5; // 50% fill
  const liquidFlow_m3s = totalLiquidFlow / 3600;
  const liquidRetention_min = (liquidVolume_m3 / liquidFlow_m3s) / 60; // Convert to minutes

  // Settling velocity
  const settlingVelocity = calculateSettlingVelocity(
    input.oilDensity_kgm3,
    waterDensity,
    dropletSize,
    0.8 // Assume 0.8 cP water viscosity
  );

  // Separator weight
  const weight_kg = calculateSeparatorWeight(diameter_mm, tangentLength_mm);

  return {
    type: separatorType,
    orientation: 'horizontal',
    diameter_mm: Math.round(diameter_mm),
    tangentLength_mm: Math.round(tangentLength_mm),
    ld_ratio,
    gasCapacity_m3h: parseFloat(gasCapacity_m3h.toFixed(1)),
    liquidRetention_min: parseFloat(liquidRetention_min.toFixed(1)),
    settlingVelocity_ms: parseFloat(settlingVelocity.toFixed(4)),
    weight_kg: parseFloat(weight_kg.toFixed(0)),
  };
}

/**
 * Validate separator sizing inputs
 * @param input Separator sizing input
 * @returns Object with validity and warnings
 */
export function validateSeparatorInput(input: SeparatorInput): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (input.oilFlowRate_m3h < 0) {
    warnings.push('Error: Oil flow rate must be non-negative');
  }

  if (input.waterFlowRate_m3h < 0) {
    warnings.push('Error: Water flow rate must be non-negative');
  }

  if (input.gasFlowRate_m3h < 0) {
    warnings.push('Error: Gas flow rate must be non-negative');
  }

  if (input.gasFlowRate_m3h === 0 && input.oilFlowRate_m3h === 0) {
    warnings.push('Error: At least oil or gas flow must be present');
  }

  if (input.oilDensity_kgm3 <= 0) {
    warnings.push('Error: Oil density must be positive');
  }

  if (input.gasDensity_kgm3 <= 0) {
    warnings.push('Error: Gas density must be positive');
  }

  if (input.oilDensity_kgm3 > 1000) {
    warnings.push('Warning: Oil density > 1000 kg/m³ - unusually heavy');
  }

  if (input.gasDensity_kgm3 > 50) {
    warnings.push('Warning: High gas density - check pressure and temperature');
  }

  return {
    isValid: warnings.filter(w => w.startsWith('Error')).length === 0,
    warnings,
  };
}
