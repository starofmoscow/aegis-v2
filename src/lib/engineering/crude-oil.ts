/**
 * Crude Oil Characterization Module for AEGIS Trial
 * Pure TypeScript calculation library for crude oil properties and distillation
 * No UI, no 'use client'
 *
 * @module lib/engineering/crude-oil
 * @reference API Technical Data Book, Nelson Complexity Index
 */

import { apiToSG, apiToDensity, m3hToKgh } from './units';

/**
 * Input interface for crude oil characterization
 */
export interface CrudeOilInput {
  /** API gravity (°API) */
  apiGravity: number;
  /** Sulfur content (% wt) */
  sulfurContent: number;
  /** Oil flow rate (BPD) */
  flowRateBPD: number;
  /** True boiling point curve (optional, °C at successive 10% distillation points) */
  tbpCurve?: number[];
}

/**
 * Crude oil distillation fractions
 */
export interface CrudeOilFraction {
  name: string;
  startTemp_C: number;
  endTemp_C: number;
  yieldPercent: number;
  density_kgM3: number;
}

/**
 * Output interface for crude oil characterization
 */
export interface CrudeOilOutput {
  /** Specific gravity relative to water (dimensionless) */
  specificGravity: number;
  /** Density in kg/m³ */
  density_kgM3: number;
  /** Mass flow rate in kg/h */
  massFlow_kgH: number;
  /** Watson K-factor (dimensionless) */
  watsonKFactor: number;
  /** Mean average boiling point (°C) */
  meabp_C: number;
  /** Distillation fractions */
  fractions: CrudeOilFraction[];
  /** Total recovery (should be ~100%) */
  totalYield: number;
}

/**
 * Default TBP curve for typical medium crude oil
 * Temperature points (°C) at 10% intervals
 */
const DEFAULT_TBP_CURVE: number[] = [
  36,   // 0%
  85,   // 10%
  125,  // 20%
  160,  // 30%
  185,  // 40%
  210,  // 50%
  240,  // 60%
  275,  // 70%
  315,  // 80%
  375,  // 90%
  500,  // 100%
];

/**
 * Calculate mean average boiling point (MeABP) from TBP curve
 * Simple average of distillation temperatures at 10-90% recovery points
 * @param tbpCurve Array of boiling point temperatures (°C)
 * @returns Mean average boiling point in °C
 * @method Average of temperatures from 10% to 90% distillation points
 */
function calculateMeabp(tbpCurve: number[]): number {
  // Use temperatures from 10% to 90% (indices 1-9)
  const midPoints = tbpCurve.slice(1, 10);
  if (midPoints.length === 0) return 0;
  return midPoints.reduce((a, b) => a + b, 0) / midPoints.length;
}

/**
 * Estimate product yields using simplified TBP correlation
 * Distribution based on temperature ranges and crude oil properties
 * @param tbpCurve True boiling point curve (°C)
 * @param sg Specific gravity
 * @returns Array of distillation fractions with yields
 * @method Simplified TBP-based distillation yield estimation
 */
function estimateProductYields(tbpCurve: number[], sg: number): CrudeOilFraction[] {
  const fractions: CrudeOilFraction[] = [];

  // LPG (C3-C4): IBP to 30°C
  const lpgTemp = tbpCurve[0]; // Initial boiling point
  const lpgYield = Math.max(0.5, Math.min(3, 1 + (0.5 * (40 - tbpCurve[3]))));
  fractions.push({
    name: 'LPG (C3-C4)',
    startTemp_C: lpgTemp,
    endTemp_C: 30,
    yieldPercent: lpgYield,
    density_kgM3: 550,
  });

  // Light Naphtha: 30-85°C
  const lightNaphtha = Math.max(0, tbpCurve[1] - 30);
  const lightNaphthaYield = Math.max(2, Math.min(12, 5 + (0.1 * lightNaphtha)));
  fractions.push({
    name: 'Light Naphtha',
    startTemp_C: 30,
    endTemp_C: 85,
    yieldPercent: lightNaphthaYield,
    density_kgM3: 680,
  });

  // Heavy Naphtha: 85-180°C
  const heavyNaphtha = Math.max(0, tbpCurve[3] - tbpCurve[1]);
  const heavyNaphthaYield = Math.max(5, Math.min(18, 10 + (0.05 * heavyNaphtha)));
  fractions.push({
    name: 'Heavy Naphtha',
    startTemp_C: 85,
    endTemp_C: 180,
    yieldPercent: heavyNaphthaYield,
    density_kgM3: 750,
  });

  // Kerosene: 180-240°C
  const kerYield = Math.max(3, Math.min(10, 7));
  fractions.push({
    name: 'Kerosene',
    startTemp_C: 180,
    endTemp_C: 240,
    yieldPercent: kerYield,
    density_kgM3: 800,
  });

  // Diesel: 240-370°C
  const dieselYield = Math.max(8, Math.min(22, 15 - (0.05 * (sg - 0.85))));
  fractions.push({
    name: 'Diesel',
    startTemp_C: 240,
    endTemp_C: 370,
    yieldPercent: dieselYield,
    density_kgM3: 840,
  });

  // AGO (Atmospheric Gas Oil): 370-520°C
  const agoYield = Math.max(10, Math.min(28, 20 - (0.1 * (sg - 0.85))));
  fractions.push({
    name: 'AGO',
    startTemp_C: 370,
    endTemp_C: 520,
    yieldPercent: agoYield,
    density_kgM3: 900,
  });

  // Vacuum Residue: 520°C+
  const vacuumResidueYield = Math.max(5, Math.min(40, 100 - lpgYield - lightNaphthaYield - heavyNaphthaYield - kerYield - dieselYield - agoYield));
  fractions.push({
    name: 'Vacuum Residue',
    startTemp_C: 520,
    endTemp_C: 650,
    yieldPercent: vacuumResidueYield,
    density_kgM3: 950,
  });

  return fractions;
}

/**
 * Characterize crude oil and estimate product yields
 *
 * Input properties:
 * - apiGravity: °API
 * - sulfurContent: % wt
 * - flowRateBPD: barrels per day
 * - tbpCurve: optional true boiling point curve
 *
 * Output includes:
 * - Specific gravity and density
 * - Mass flow rate
 * - Watson K-factor
 * - Mean average boiling point
 * - Product yield distribution (LPG, naphtha, kerosene, diesel, AGO, residue)
 *
 * @param input Crude oil characterization input
 * @returns Crude oil properties and product yields
 * @method API Technical Data Book, Nelson Complexity Index, TBP correlation
 */
export function characterizeCrudeOil(input: CrudeOilInput): CrudeOilOutput {
  // Use default TBP curve if not provided
  const tbpCurve = input.tbpCurve || DEFAULT_TBP_CURVE;

  // Calculate specific gravity and density
  const sg = apiToSG(input.apiGravity);
  const density = apiToDensity(input.apiGravity);

  // Calculate mass flow rate
  const volumeFlow_m3h = (input.flowRateBPD * 0.159) / 24; // BPD to m³/h
  const massFlow = m3hToKgh(volumeFlow_m3h, density);

  // Calculate mean average boiling point
  const meabp = calculateMeabp(tbpCurve);

  // Watson K-factor: K = (1.8 * MeABP)^(1/3) / SG
  // MeABP in Kelvin: add 273.15 to °C
  const meabpK = meabp + 273.15;
  const watsonK = Math.pow(1.8 * meabpK, 1 / 3) / sg;

  // Estimate product fractions
  const fractions = estimateProductYields(tbpCurve, sg);

  // Calculate total yield
  const totalYield = fractions.reduce((sum, frac) => sum + frac.yieldPercent, 0);

  return {
    specificGravity: parseFloat(sg.toFixed(4)),
    density_kgM3: parseFloat(density.toFixed(1)),
    massFlow_kgH: parseFloat(massFlow.toFixed(1)),
    watsonKFactor: parseFloat(watsonK.toFixed(3)),
    meabp_C: parseFloat(meabp.toFixed(1)),
    fractions,
    totalYield: parseFloat(totalYield.toFixed(1)),
  };
}

/**
 * Calculate crude oil viscosity using ASTM D2161 (simplified)
 * Viscosity index equation for mineral oils
 * @param density_kgM3 Crude oil density in kg/m³
 * @param temperature_C Temperature in °C
 * @returns Kinematic viscosity in cSt (mm²/s)
 * @method Walther equation approximation
 */
export function estimateViscosity(density_kgM3: number, temperature_C: number): number {
  // Simplified viscosity model for crude oil
  // Reference: ASTM D2161
  const sg = density_kgM3 / 1000;

  // API gravity from density
  const api = 141.5 / sg - 131.5;

  // Base viscosity at reference temperature (40°C)
  // For crude oils: lighter oils (high API) have lower viscosity
  const viscosity40 = Math.max(0.5, 100 * Math.exp(-0.01 * api));

  // Temperature correction using Walther equation approximation
  // Viscosity changes ~10-20% per 10°C change
  const tempDiff = temperature_C - 40;
  const tempFactor = Math.exp(-0.003 * tempDiff);
  const viscosityAtT = viscosity40 * tempFactor;

  return parseFloat(viscosityAtT.toFixed(2));
}

/**
 * Calculate crude oil pour point (simplified)
 * @param apiGravity API gravity
 * @param sulfurContent Sulfur content (% wt)
 * @returns Pour point in °C
 * @method Empirical correlation for crude oils
 */
export function estimatePourPoint(apiGravity: number, sulfurContent: number): number {
  // Simplified pour point estimation
  // Lower API (heavier crudes) have higher pour points
  // Higher sulfur content typically indicates higher pour point
  const basePour = -5 + (30 - apiGravity) * 0.5;
  const sulfurEffect = sulfurContent * 2;
  const pourPoint = basePour + sulfurEffect;

  return parseFloat(pourPoint.toFixed(1));
}

/**
 * Calculate crude oil flash point (simplified)
 * @param apiGravity API gravity
 * @returns Flash point in °C
 * @method Empirical correlation for crude oils
 */
export function estimateFlashPoint(apiGravity: number): number {
  // Flash point increases with molecular weight (lower API)
  // Empirical relationship for crude oils
  const flashPoint = -30 + (40 - apiGravity) * 1.5;
  return parseFloat(flashPoint.toFixed(1));
}
