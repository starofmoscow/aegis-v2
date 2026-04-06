/**
 * ASME VIII Division 1 Pressure Vessel Design Module for AEGIS Trial
 * Pure TypeScript calculation library for vessel wall thickness
 * No UI, no 'use client'
 *
 * @module lib/engineering/pressure-vessel
 * @reference ASME BPVC Section VIII Division 1, UG-27, UG-32
 */

/**
 * Material properties database
 */
interface MaterialProperties {
  S: number; // Allowable stress (MPa) at design temperature
  density: number; // kg/m³
}

/**
 * Input interface for pressure vessel design
 */
export interface PressureVesselInput {
  /** Design pressure (bar) */
  designPressure_bar: number;
  /** Design temperature (°C) */
  designTemperature_C: number;
  /** Inner diameter (mm) */
  innerDiameter_mm: number;
  /** Material grade (e.g., 'SA-516-70', 'SA-240-304', '16ГС', 'SA-387-11') */
  material: string;
  /** Weld joint efficiency (0-1, default 0.85 for single welded butt joint) */
  jointEfficiency?: number;
  /** Corrosion allowance (mm, default 3) */
  corrosionAllowance_mm?: number;
}

/**
 * Output interface for pressure vessel design
 */
export interface PressureVesselOutput {
  /** Required shell thickness (mm) */
  shellThickness_mm: number;
  /** Required head thickness (mm) */
  headThickness_mm: number;
  /** Selected head type */
  headType: 'Hemispherical' | '2:1 SE' | 'Flat';
  /** Standard plate thickness selected (mm) */
  standardPlate_mm: number;
  /** Shell weight (kg) */
  shellWeight_kg: number;
  /** Single head weight (kg) */
  headWeight_kg: number;
  /** Total vessel weight (kg) - shell + 2 heads + fittings */
  totalWeight_kg: number;
  /** Maximum allowable working pressure (bar) */
  mawp_bar: number;
}

/**
 * Material properties database
 */
const MATERIALS: { [key: string]: MaterialProperties } = {
  'SA-516-70': {
    S: 138, // MPa at 38°C
    density: 7850, // kg/m³
  },
  'SA-240-304': {
    S: 138, // MPa stainless steel
    density: 8000,
  },
  '16ГС': {
    S: 147, // MPa Russian standard
    density: 7850,
  },
  'SA-387-11': {
    S: 138, // MPa chromium-molybdenum
    density: 7850,
  },
};

/**
 * Standard plate thicknesses (mm) used in pressure vessels
 */
const STANDARD_PLATES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 36, 40, 45, 50];

/**
 * Get material properties
 * @param material Material grade string
 * @returns Material properties { S, density }
 */
function getMaterialProperties(material: string): MaterialProperties {
  return MATERIALS[material] || MATERIALS['SA-516-70']; // Default to SA-516-70
}

/**
 * Round thickness up to nearest standard plate
 * @param thickness Calculated thickness (mm)
 * @returns Standard plate thickness (mm)
 */
function roundToStandardPlate(thickness: number): number {
  for (const plate of STANDARD_PLATES) {
    if (plate >= thickness) {
      return plate;
    }
  }
  return STANDARD_PLATES[STANDARD_PLATES.length - 1];
}

/**
 * Calculate shell thickness using Lame equation (ASME UG-27(c))
 * For thin-walled cylindrical shells:
 * t = (P * R) / (S * E - 0.6 * P) + CA
 * where R = (ID + OD) / 4 ≈ ID/2 for thin walls
 * @param pressure_bar Design pressure (bar)
 * @param innerDiameter_mm Inner diameter (mm)
 * @param allowableStress_MPa Allowable stress at temperature (MPa)
 * @param jointEfficiency Joint efficiency (0-1)
 * @param corrosionAllowance_mm Corrosion allowance (mm)
 * @returns Shell thickness (mm)
 * @method ASME VIII Div 1 UG-27(c)
 */
function calculateShellThickness(
  pressure_bar: number,
  innerDiameter_mm: number,
  allowableStress_MPa: number,
  jointEfficiency: number,
  corrosionAllowance_mm: number
): number {
  // Convert pressure from bar to MPa
  const pressure_MPa = pressure_bar / 10;

  // Calculate radius (mm)
  const radius_mm = innerDiameter_mm / 2;

  // ASME formula: t = (P * R) / (S * E - 0.6 * P)
  // P in MPa, R in mm, S in MPa, E = joint efficiency
  const numerator = pressure_MPa * radius_mm;
  const denominator = allowableStress_MPa * jointEfficiency - 0.6 * pressure_MPa;

  if (denominator <= 0) {
    throw new Error('Invalid design: denominator ≤ 0. Check pressure and allowable stress.');
  }

  const thickness = numerator / denominator + corrosionAllowance_mm;

  return Math.max(1, thickness); // Minimum 1 mm
}

/**
 * Calculate 2:1 Semi-ellipsoidal head thickness
 * t = (P * D) / (2 * S * E - 0.2 * P) + CA
 * @param pressure_bar Design pressure (bar)
 * @param innerDiameter_mm Inner diameter (mm)
 * @param allowableStress_MPa Allowable stress (MPa)
 * @param jointEfficiency Joint efficiency (0-1)
 * @param corrosionAllowance_mm Corrosion allowance (mm)
 * @returns Head thickness (mm)
 * @method ASME VIII Div 1 UG-32
 */
function calculate2To1SEHeadThickness(
  pressure_bar: number,
  innerDiameter_mm: number,
  allowableStress_MPa: number,
  jointEfficiency: number,
  corrosionAllowance_mm: number
): number {
  const pressure_MPa = pressure_bar / 10;

  const numerator = pressure_MPa * innerDiameter_mm;
  const denominator = 2 * allowableStress_MPa * jointEfficiency - 0.2 * pressure_MPa;

  if (denominator <= 0) {
    throw new Error('Invalid design parameters for 2:1 SE head');
  }

  const thickness = numerator / denominator + corrosionAllowance_mm;
  return Math.max(1, thickness);
}

/**
 * Calculate hemispherical head thickness
 * t = (P * R) / (2 * S * E - 0.2 * P) + CA
 * @param pressure_bar Design pressure (bar)
 * @param innerDiameter_mm Inner diameter (mm)
 * @param allowableStress_MPa Allowable stress (MPa)
 * @param jointEfficiency Joint efficiency (0-1)
 * @param corrosionAllowance_mm Corrosion allowance (mm)
 * @returns Head thickness (mm)
 * @method ASME VIII Div 1 UG-32
 */
function calculateHemisphericalHeadThickness(
  pressure_bar: number,
  innerDiameter_mm: number,
  allowableStress_MPa: number,
  jointEfficiency: number,
  corrosionAllowance_mm: number
): number {
  const pressure_MPa = pressure_bar / 10;
  const radius_mm = innerDiameter_mm / 2;

  const numerator = pressure_MPa * radius_mm;
  const denominator = 2 * allowableStress_MPa * jointEfficiency - 0.2 * pressure_MPa;

  if (denominator <= 0) {
    throw new Error('Invalid design parameters for hemispherical head');
  }

  const thickness = numerator / denominator + corrosionAllowance_mm;
  return Math.max(1, thickness);
}

/**
 * Calculate flat head thickness (simple support)
 * t = d * sqrt((C * P) / (S * E)) + CA
 * where C is stress concentration factor (typically 0.3-0.5)
 * @param pressure_bar Design pressure (bar)
 * @param innerDiameter_mm Inner diameter (mm)
 * @param allowableStress_MPa Allowable stress (MPa)
 * @param jointEfficiency Joint efficiency (0-1)
 * @param corrosionAllowance_mm Corrosion allowance (mm)
 * @returns Head thickness (mm)
 * @method ASME VIII Div 1 flat plate formula
 */
function calculateFlatHeadThickness(
  pressure_bar: number,
  innerDiameter_mm: number,
  allowableStress_MPa: number,
  jointEfficiency: number,
  corrosionAllowance_mm: number
): number {
  const pressure_MPa = pressure_bar / 10;
  const C = 0.3; // Stress concentration factor for simple support

  const term = (C * pressure_MPa) / (allowableStress_MPa * jointEfficiency);
  if (term < 0) {
    throw new Error('Invalid design parameters for flat head');
  }

  const thickness = innerDiameter_mm * Math.sqrt(term) + corrosionAllowance_mm;
  return Math.max(1, thickness);
}

/**
 * Calculate vessel weight (cylindrical shell + 2 heads)
 * @param innerDiameter_mm Inner diameter (mm)
 * @param height_mm Seam-to-seam height (mm)
 * @param shellThickness_mm Shell thickness (mm)
 * @param headThickness_mm Head thickness (mm)
 * @param materialDensity_kgM3 Material density (kg/m³)
 * @param headType Type of head
 * @returns { shellWeight_kg, headWeight_kg, totalWeight_kg }
 */
function calculateWeight(
  innerDiameter_mm: number,
  height_mm: number,
  shellThickness_mm: number,
  headThickness_mm: number,
  materialDensity_kgM3: number,
  headType: string
): { shellWeight_kg; headWeight_kg; totalWeight_kg } {
  // Convert to meters
  const ID_m = innerDiameter_mm / 1000;
  const height_m = height_mm / 1000;
  const t_shell = shellThickness_mm / 1000;
  const t_head = headThickness_mm / 1000;

  // Shell outer surface area (cylinder)
  const OD_shell = ID_m + 2 * t_shell;
  const shellArea = Math.PI * OD_shell * height_m;

  // Shell volume (simplification)
  const shellVolume = Math.PI * ID_m * height_m * t_shell;
  const shellWeight = shellVolume * materialDensity_kgM3;

  // Head volume (simplified)
  let headVolume = 0;

  if (headType === 'Hemispherical') {
    // Hemisphere volume ≈ (2/3) * π * r² * t
    const radius = (ID_m + 2 * t_head) / 2;
    headVolume = (2 / 3) * Math.PI * radius * radius * t_head;
  } else if (headType === '2:1 SE' || headType === 'Flat') {
    // Approximate as disk: π * r² * t
    const radius = (ID_m + 2 * t_head) / 2;
    headVolume = Math.PI * radius * radius * t_head;
  }

  const headWeight = headVolume * materialDensity_kgM3;
  const totalWeight = shellWeight + 2 * headWeight + 200; // Add ~200 kg for nozzles/fittings

  return {
    shellWeight_kg: parseFloat(shellWeight.toFixed(1)),
    headWeight_kg: parseFloat(headWeight.toFixed(1)),
    totalWeight_kg: parseFloat(totalWeight.toFixed(1)),
  };
}

/**
 * Calculate maximum allowable working pressure (MAWP)
 * From ASME formula, solve for P:
 * P = (S * E * t) / (R + 0.6 * t) for cylinder
 * @param thickness_mm Shell thickness (mm)
 * @param innerDiameter_mm Inner diameter (mm)
 * @param allowableStress_MPa Allowable stress (MPa)
 * @param jointEfficiency Joint efficiency
 * @returns MAWP in bar
 */
function calculateMAWP(
  thickness_mm: number,
  innerDiameter_mm: number,
  allowableStress_MPa: number,
  jointEfficiency: number
): number {
  // Convert thickness from mm to effective length units
  const radius_mm = innerDiameter_mm / 2;

  // ASME formula rearranged: P = (S * E * t) / (R + 0.6 * t)
  const numerator = allowableStress_MPa * jointEfficiency * thickness_mm;
  const denominator = radius_mm + 0.6 * thickness_mm;

  const pressure_MPa = numerator / denominator;
  const pressure_bar = pressure_MPa * 10;

  return parseFloat(pressure_bar.toFixed(1));
}

/**
 * Design a pressure vessel according to ASME VIII Division 1
 *
 * Input parameters:
 * - designPressure_bar: Pressure in bar
 * - designTemperature_C: Temperature in °C (affects allowable stress)
 * - innerDiameter_mm: Inner diameter
 * - material: Material grade (SA-516-70, SA-240-304, 16ГС, SA-387-11)
 * - jointEfficiency: Weld joint efficiency (default 0.85)
 * - corrosionAllowance_mm: Corrosion margin (default 3 mm)
 *
 * Output includes:
 * - Shell and head thicknesses
 * - Standard plate thickness selected
 * - Vessel weight
 * - Maximum allowable working pressure
 *
 * @param input Pressure vessel input
 * @returns Pressure vessel design
 * @method ASME VIII Division 1 formulas UG-27, UG-32
 */
export function designPressureVessel(input: PressureVesselInput): PressureVesselOutput {
  // Default values
  const jointEfficiency = input.jointEfficiency ?? 0.85;
  const corrosionAllowance = input.corrosionAllowance_mm ?? 3;

  // Get material properties
  const material = getMaterialProperties(input.material);

  // Adjust allowable stress for temperature (simplified)
  // Typical values: 138 MPa at <100°C, decreases with temperature
  let allowableStress = material.S;

  if (input.designTemperature_C > 200) {
    // Reduce stress by ~1% per 10°C above 200°C
    const tempFactor = 1 - (input.designTemperature_C - 200) * 0.01 / 10;
    allowableStress = material.S * Math.max(0.7, tempFactor);
  }

  // Calculate shell thickness
  const shellThickness = calculateShellThickness(
    input.designPressure_bar,
    input.innerDiameter_mm,
    allowableStress,
    jointEfficiency,
    corrosionAllowance
  );

  // Calculate head thicknesses (choose most economical)
  const hemisphericalThickness = calculateHemisphericalHeadThickness(
    input.designPressure_bar,
    input.innerDiameter_mm,
    allowableStress,
    jointEfficiency,
    corrosionAllowance
  );

  const se2To1Thickness = calculate2To1SEHeadThickness(
    input.designPressure_bar,
    input.innerDiameter_mm,
    allowableStress,
    jointEfficiency,
    corrosionAllowance
  );

  // Select head type based on thickness (most economical)
  let headThickness = hemisphericalThickness;
  let headType: '2:1 SE' | 'Hemispherical' | 'Flat' = 'Hemispherical';

  if (se2To1Thickness < hemisphericalThickness) {
    headThickness = se2To1Thickness;
    headType = '2:1 SE';
  }

  // Round to standard plate
  const standardPlate = roundToStandardPlate(Math.max(shellThickness, headThickness));

  // Calculate weight (assume 2.5m seam-to-seam height)
  const vesselHeight_mm = 2500;
  const { shellWeight_kg, headWeight_kg, totalWeight_kg } = calculateWeight(
    input.innerDiameter_mm,
    vesselHeight_mm,
    standardPlate, // Use same thickness for simplicity
    standardPlate,
    material.density,
    headType
  );

  // Calculate MAWP
  const mawp = calculateMAWP(
    standardPlate,
    input.innerDiameter_mm,
    allowableStress,
    jointEfficiency
  );

  return {
    shellThickness_mm: parseFloat(shellThickness.toFixed(2)),
    headThickness_mm: parseFloat(headThickness.toFixed(2)),
    headType,
    standardPlate_mm: standardPlate,
    shellWeight_kg,
    headWeight_kg,
    totalWeight_kg,
    mawp_bar: mawp,
  };
}

/**
 * Validate pressure vessel design
 * @param input Pressure vessel input
 * @returns Object with validity and warnings
 */
export function validatePressureVesselDesign(input: PressureVesselInput): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (input.designPressure_bar <= 0) {
    warnings.push('Error: Design pressure must be positive');
  }

  if (input.innerDiameter_mm < 100) {
    warnings.push('Warning: Vessel diameter < 100 mm');
  }

  if (input.designTemperature_C < -50 || input.designTemperature_C > 600) {
    warnings.push('Warning: Temperature outside typical range (-50 to 600°C)');
  }

  if (!MATERIALS[input.material]) {
    warnings.push(`Warning: Material "${input.material}" not in database, using SA-516-70`);
  }

  if (input.jointEfficiency && (input.jointEfficiency < 0.7 || input.jointEfficiency > 1)) {
    warnings.push('Warning: Joint efficiency outside typical range (0.7-1.0)');
  }

  return {
    isValid: warnings.filter(w => w.startsWith('Error')).length === 0,
    warnings,
  };
}
