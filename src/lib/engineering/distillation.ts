/**
 * Distillation Column Sizing Module for AEGIS Trial
 * Pure TypeScript calculation library for distillation column design
 * No UI, no 'use client'
 *
 * @module lib/engineering/distillation
 * @reference Fenske-Underwood-Gilliland (FUG) Method, Wankat 2012
 */

/**
 * Input interface for distillation column sizing
 */
export interface DistillationInput {
  /** Feed flow rate (kg/h) */
  feedFlowKgH: number;
  /** Feed composition { light: 0-1, heavy: 0-1 } */
  feedComposition: {
    light: number;
    heavy: number;
  };
  /** Operating pressure (bar) */
  pressure_bar: number;
  /** Reflux ratio (L/V, dimensionless) */
  refluxRatio: number;
  /** Relative volatility between light and heavy key (dimensionless) */
  relativeVolatility: number;
  /** Light key recovery (0-1, typically 0.95-0.99) */
  lightKeyRecovery: number;
  /** Heavy key recovery (0-1, typically 0.95-0.99) */
  heavyKeyRecovery: number;
}

/**
 * Output interface for distillation column sizing
 */
export interface DistillationOutput {
  /** Minimum theoretical stages (Fenske equation) */
  minStages: number;
  /** Minimum reflux ratio (Underwood equation) */
  minReflux: number;
  /** Actual number of stages */
  actualStages: number;
  /** Actual reflux ratio */
  actualReflux: number;
  /** Column internal diameter (m) */
  columnDiameter_m: number;
  /** Column height from bottom to top (m) */
  columnHeight_m: number;
  /** Tray spacing (m) */
  traySpacing_m: number;
  /** Condenser duty (kW) */
  condenserDuty_kW: number;
  /** Reboiler duty (kW) */
  reboilerDuty_kW: number;
}

/**
 * Solve for theta in Underwood equation using Newton-Raphson
 * Equation: sum(alpha_i * x_Fi / (alpha_i - theta)) = 1 - q
 * For binary: alpha*x_F/(alpha - theta) + (1-x_F)/(1-theta) = 1 - q
 * @param feedComposition Light key fraction in feed
 * @param alpha Relative volatility
 * @param q Liquid fraction in feed (0 for vapor, 1 for liquid)
 * @returns theta value for Underwood equation
 * @method Newton-Raphson iteration
 */
function solveUnderwood(feedComposition: number, alpha: number, q: number = 1): number {
  // For bubble point feed (q=1), solve for theta
  // Binary system simplification
  const xF = feedComposition;

  // Initial guess: theta between 0 and alpha
  let theta = alpha * 0.5;
  const tolerance = 1e-6;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    // Function: f(theta) = alpha*xF/(alpha-theta) + (1-xF)/(1-theta) - (1-q)
    const term1 = (alpha * xF) / (alpha - theta);
    const term2 = (1 - xF) / (1 - theta);
    const f = term1 + term2 - (1 - q);

    // Derivative: f'(theta) = alpha*xF/(alpha-theta)^2 + (1-xF)/(1-theta)^2
    const df =
      (alpha * xF) / Math.pow(alpha - theta, 2) +
      (1 - xF) / Math.pow(1 - theta, 2);

    // Newton-Raphson update
    const thetaNew = theta - f / df;

    if (Math.abs(thetaNew - theta) < tolerance) {
      return thetaNew;
    }

    theta = thetaNew;
  }

  return theta;
}

/**
 * Calculate minimum number of stages using Fenske equation
 * Nmin = ln[(xLK_D/xHK_D) * (xHK_B/xLK_B)] / ln(alpha)
 * @param lightKeyRecovery Light key recovery (0-1)
 * @param heavyKeyRecovery Heavy key recovery (0-1)
 * @param relativeVolatility Relative volatility
 * @param feedComposition Light key fraction in feed
 * @returns Minimum number of theoretical stages
 * @method Fenske equation
 */
function fenski(
  lightKeyRecovery: number,
  heavyKeyRecovery: number,
  relativeVolatility: number,
  feedComposition: number
): number {
  // Assuming equimolar overflow and constant relative volatility
  // xLK_D = light key in distillate (high purity, typically 95-99%)
  // xLK_B = light key in bottoms (low concentration)
  // xHK_D = heavy key in distillate (low concentration)
  // xHK_B = heavy key in bottoms (high purity, typically 95-99%)

  // For sharper separation
  const xLK_D = lightKeyRecovery; // e.g., 0.95-0.99
  const xHK_B = heavyKeyRecovery; // e.g., 0.95-0.99

  // Back-calculate xHK_D and xLK_B from balances
  const xHK_D = 1 - xLK_D;
  const xLK_B = 1 - xHK_B;

  // Fenske equation
  if (relativeVolatility <= 1) {
    return 5; // Minimum default for poor separability
  }

  const numerator = (xLK_D / xHK_D) * (xHK_B / xLK_B);
  const nMin = Math.log(numerator) / Math.log(relativeVolatility);

  return Math.max(2, nMin);
}

/**
 * Calculate minimum reflux ratio using Underwood equation
 * Requires solving for theta, then: Rmin = (theta/(alpha - theta)) * xF - 1
 * @param relativeVolatility Relative volatility
 * @param feedComposition Light key fraction in feed
 * @param feedState Feed state: 1 = liquid (bubble point), 0.5 = two-phase, 0 = vapor
 * @returns Minimum reflux ratio
 * @method Underwood equation
 */
function underwoodRmin(
  relativeVolatility: number,
  feedComposition: number,
  feedState: number = 1
): number {
  // Solve for theta using Underwood equation
  // Binary system: alpha*xF/(alpha-theta) + (1-xF)/(1-theta) = 1 - q
  const theta = solveUnderwood(feedComposition, relativeVolatility, feedState);

  // Rmin = theta/(alpha - theta) * xF - 1
  if (Math.abs(relativeVolatility - theta) < 0.01) {
    return feedComposition; // Avoid division issues
  }

  const rMin = (theta / (relativeVolatility - theta)) * feedComposition - 1;
  return Math.max(0, rMin);
}

/**
 * Calculate actual stages using Gilliland correlation
 * (N - Nmin)/(N + 1) = 0.75 * [1 - ((R - Rmin)/(R + 1))^0.5668]
 * @param nMin Minimum stages
 * @param rMin Minimum reflux
 * @param actualReflux Actual reflux ratio
 * @returns Actual number of stages
 * @method Gilliland correlation
 */
function gillilandStages(nMin: number, rMin: number, actualReflux: number): number {
  // Prevent division by zero
  if (actualReflux < rMin || actualReflux < 0.01) {
    return nMin * 1.5; // Fallback
  }

  // Gilliland correlation
  const rRatio = (actualReflux - rMin) / (actualReflux + 1);
  const term = Math.pow(Math.max(0, rRatio), 0.5668);
  const ratio = 0.75 * (1 - term);

  // Solve for N: (N - Nmin)/(N + 1) = ratio
  // N - Nmin = ratio * (N + 1)
  // N - Nmin = ratio*N + ratio
  // N - ratio*N = Nmin + ratio
  // N(1 - ratio) = Nmin + ratio
  const n = (nMin + ratio) / (1 - ratio);

  return Math.max(nMin, n);
}

/**
 * Calculate column diameter from vapor capacity using Fair correlation
 * Assumes flooding velocity method
 * @param feedFlowKgH Feed flow rate (kg/h)
 * @param vapor_density_kgM3 Vapor density at operating conditions (kg/m³)
 * @param liquid_density_kgM3 Liquid density at operating conditions (kg/m³)
 * @returns Column diameter in meters
 * @method Fair correlation (flooding velocity)
 */
function fairColumnDiameter(
  feedFlowKgH: number,
  vapor_density_kgM3: number,
  liquid_density_kgM3: number
): number {
  // Mass flow rate -> volume flow rate
  // Assume 50% of feed is vaporized at column operating point
  const vaporFlowKgH = feedFlowKgH * 0.5;
  const vaporFlowM3h = vaporFlowKgH / vapor_density_kgM3;
  const vaporFlowM3s = vaporFlowM3h / 3600;

  // Fair correlation for flooding velocity
  // Vf = sqrt(F_LV * (rho_L - rho_V) / rho_V)
  // where F_LV is a function of L/V and surface tension
  // For typical hydrocarbon systems, use F_LV ≈ 0.12 m/s
  const rho_diff = liquid_density_kgM3 - vapor_density_kgM3;
  const F_LV = 0.12; // typical value for hydrocarbon distillation

  const Vf = F_LV * Math.sqrt(rho_diff / vapor_density_kgM3);

  // Use 85% of flooding velocity for design
  const V_design = 0.85 * Vf;

  // Column area: A = volume flow / velocity
  const area = vaporFlowM3s / V_design;
  const diameter = Math.sqrt((4 * area) / Math.PI);

  return Math.max(0.3, diameter); // Minimum 0.3 m diameter
}

/**
 * Estimate energy requirements for distillation
 * @param feedFlowKgH Feed flow rate (kg/h)
 * @param latentHeat_kJkg Latent heat of vaporization (kJ/kg)
 * @param actualReflux Actual reflux ratio
 * @returns { condenserDuty_kW, reboilerDuty_kW }
 * @method Energy balance
 */
function estimateEnergyDuty(
  feedFlowKgH: number,
  latentHeat_kJkg: number,
  actualReflux: number
): { condenserDuty_kW; reboilerDuty_kW } {
  // Estimate vapor flow from feed and reflux
  // V = D * (1 + R) where D ≈ feed * split
  const distillateFlow = feedFlowKgH * 0.4; // Assume 40% distillate
  const V = distillateFlow * (1 + actualReflux);

  // Condenser duty = V * lambda
  const condenserDuty = (V * latentHeat_kJkg) / 3600; // kW

  // Reboiler duty ≈ condenser duty + sensible heat (small contribution)
  const reboilerDuty = condenserDuty * 1.05; // Add 5% for sensible heat

  return {
    condenserDuty_kW: parseFloat(condenserDuty.toFixed(1)),
    reboilerDuty_kW: parseFloat(reboilerDuty.toFixed(1)),
  };
}

/**
 * Size a distillation column using the Fenske-Underwood-Gilliland method
 *
 * Input parameters:
 * - feedFlowKgH: Feed rate in kg/h
 * - feedComposition: { light: 0-1, heavy: 0-1 } fractions
 * - pressure_bar: Operating pressure
 * - refluxRatio: Actual reflux ratio (L/V)
 * - relativeVolatility: alpha (separation difficulty)
 * - lightKeyRecovery, heavyKeyRecovery: 0-1 (typically 0.95-0.99)
 *
 * Output includes:
 * - Minimum and actual stages
 * - Column diameter and height
 * - Energy requirements
 *
 * @param input Distillation input parameters
 * @returns Distillation column sizing
 * @method FUG Method, Fair correlation, Energy balance
 */
export function sizeDistillationColumn(input: DistillationInput): DistillationOutput {
  // Calculate minimum stages using Fenske equation
  const minStages = fenski(
    input.lightKeyRecovery,
    input.heavyKeyRecovery,
    input.relativeVolatility,
    input.feedComposition.light
  );

  // Calculate minimum reflux using Underwood equation
  const minReflux = underwoodRmin(
    input.relativeVolatility,
    input.feedComposition.light,
    1 // Assume bubble point feed
  );

  // Use provided reflux ratio (typically 1.2-1.5 × Rmin for design)
  const actualReflux = input.refluxRatio;

  // Calculate actual stages using Gilliland correlation
  const actualStages = Math.ceil(
    gillilandStages(minStages, minReflux, actualReflux)
  );

  // Estimate column diameter
  // Assume typical vapor and liquid densities for hydrocarbon distillation
  // Vapor density depends on pressure and molecular weight
  const vapor_density = Math.max(1, input.pressure_bar * 0.5); // kg/m³ at bar
  const liquid_density = 700; // kg/m³ typical for hydrocarbons

  const columnDiameter = fairColumnDiameter(
    input.feedFlowKgH,
    vapor_density,
    liquid_density
  );

  // Column height
  const traySpacing = 0.6; // meters
  const columnHeight = actualStages * traySpacing;

  // Energy requirements
  const latentHeat = 350; // kJ/kg typical for hydrocarbon fraction
  const { condenserDuty_kW, reboilerDuty_kW } = estimateEnergyDuty(
    input.feedFlowKgH,
    latentHeat,
    actualReflux
  );

  return {
    minStages: parseFloat(minStages.toFixed(1)),
    minReflux: parseFloat(minReflux.toFixed(3)),
    actualStages,
    actualReflux: parseFloat(actualReflux.toFixed(2)),
    columnDiameter_m: parseFloat(columnDiameter.toFixed(3)),
    columnHeight_m: parseFloat(columnHeight.toFixed(2)),
    traySpacing_m: traySpacing,
    condenserDuty_kW,
    reboilerDuty_kW,
  };
}

/**
 * Validate distillation design feasibility
 * @param input Distillation input
 * @returns Object with validity and warnings
 */
export function validateDistillationDesign(
  input: DistillationInput
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (input.relativeVolatility <= 1) {
    warnings.push('Relative volatility ≤ 1: separation is not feasible');
  }

  if (input.refluxRatio < 0.5) {
    warnings.push('Reflux ratio too low: minimum economical reflux is ~0.5');
  }

  if (input.refluxRatio > 20) {
    warnings.push('Reflux ratio too high: check for design errors');
  }

  if (input.lightKeyRecovery < 0.85 || input.lightKeyRecovery > 0.999) {
    warnings.push('Light key recovery outside typical range (0.85-0.999)');
  }

  if (input.heavyKeyRecovery < 0.85 || input.heavyKeyRecovery > 0.999) {
    warnings.push('Heavy key recovery outside typical range (0.85-0.999)');
  }

  if (input.feedFlowKgH < 1) {
    warnings.push('Feed flow too low: check units');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
