/**
 * Unit Conversion Utilities for AEGIS Trial
 * Pure TypeScript calculation library for engineering unit conversions
 * No UI, no 'use client'
 *
 * @module lib/engineering/units
 */

/**
 * Temperature conversions
 */

/**
 * Convert Celsius to Fahrenheit
 * @param celsius Temperature in Celsius
 * @returns Temperature in Fahrenheit
 * @method (C × 9/5) + 32
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/**
 * Convert Fahrenheit to Celsius
 * @param fahrenheit Temperature in Fahrenheit
 * @returns Temperature in Celsius
 * @method (F - 32) × 5/9
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/**
 * Convert Celsius to Kelvin
 * @param celsius Temperature in Celsius
 * @returns Temperature in Kelvin
 * @method C + 273.15
 */
export function celsiusToKelvin(celsius: number): number {
  return celsius + 273.15;
}

/**
 * Convert Kelvin to Celsius
 * @param kelvin Temperature in Kelvin
 * @returns Temperature in Celsius
 * @method K - 273.15
 */
export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}

/**
 * Convert Fahrenheit to Kelvin
 * @param fahrenheit Temperature in Fahrenheit
 * @returns Temperature in Kelvin
 */
export function fahrenheitToKelvin(fahrenheit: number): number {
  return celsiusToKelvin(fahrenheitToCelsius(fahrenheit));
}

/**
 * Convert Kelvin to Fahrenheit
 * @param kelvin Temperature in Kelvin
 * @returns Temperature in Fahrenheit
 */
export function kelvinToFahrenheit(kelvin: number): number {
  return celsiusToFahrenheit(kelvinToCelsius(kelvin));
}

/**
 * Pressure conversions
 */

/**
 * Convert bar to psi
 * @param bar Pressure in bar
 * @returns Pressure in psi
 * @method bar × 14.5038
 */
export function barToPsi(bar: number): number {
  return bar * 14.5038;
}

/**
 * Convert psi to bar
 * @param psi Pressure in psi
 * @returns Pressure in bar
 * @method psi / 14.5038
 */
export function psiToBar(psi: number): number {
  return psi / 14.5038;
}

/**
 * Convert bar to kPa
 * @param bar Pressure in bar
 * @returns Pressure in kPa
 * @method bar × 100
 */
export function barToKpa(bar: number): number {
  return bar * 100;
}

/**
 * Convert kPa to bar
 * @param kpa Pressure in kPa
 * @returns Pressure in bar
 * @method kPa / 100
 */
export function kpaToBar(kpa: number): number {
  return kpa / 100;
}

/**
 * Convert bar to atm
 * @param bar Pressure in bar
 * @returns Pressure in atm
 * @method bar / 1.01325
 */
export function barToAtm(bar: number): number {
  return bar / 1.01325;
}

/**
 * Convert atm to bar
 * @param atm Pressure in atm
 * @returns Pressure in bar
 * @method atm × 1.01325
 */
export function atmToBar(atm: number): number {
  return atm * 1.01325;
}

/**
 * Convert bar to MPa
 * @param bar Pressure in bar
 * @returns Pressure in MPa
 * @method bar / 10
 */
export function barToMpa(bar: number): number {
  return bar / 10;
}

/**
 * Convert MPa to bar
 * @param mpa Pressure in MPa
 * @returns Pressure in bar
 * @method MPa × 10
 */
export function mpaToBar(mpa: number): number {
  return mpa * 10;
}

/**
 * Convert psi to kPa
 * @param psi Pressure in psi
 * @returns Pressure in kPa
 */
export function psiToKpa(psi: number): number {
  return barToKpa(psiToBar(psi));
}

/**
 * Convert kPa to psi
 * @param kpa Pressure in kPa
 * @returns Pressure in psi
 */
export function kpaToPsi(kpa: number): number {
  return barToPsi(kpaToBar(kpa));
}

/**
 * Flow rate conversions
 */

/**
 * Convert BPD (barrels per day) to m³/h
 * @param bpd Flow rate in barrels per day
 * @returns Flow rate in m³/h
 * @method BPD × 0.159 / 24
 */
export function bpdToM3H(bpd: number): number {
  return (bpd * 0.159) / 24;
}

/**
 * Convert m³/h to BPD
 * @param m3h Flow rate in m³/h
 * @returns Flow rate in BPD
 * @method m³/h × 24 / 0.159
 */
export function m3hToBpd(m3h: number): number {
  return (m3h * 24) / 0.159;
}

/**
 * Convert BPD to m³/d
 * @param bpd Flow rate in barrels per day
 * @returns Flow rate in m³/d
 * @method BPD × 0.159
 */
export function bpdToM3D(bpd: number): number {
  return bpd * 0.159;
}

/**
 * Convert m³/d to BPD
 * @param m3d Flow rate in m³/d
 * @returns Flow rate in BPD
 * @method m³/d / 0.159
 */
export function m3dToBpd(m3d: number): number {
  return m3d / 0.159;
}

/**
 * Convert m³/h to kg/h given fluid density
 * @param m3h Flow rate in m³/h
 * @param densityKgM3 Fluid density in kg/m³
 * @returns Flow rate in kg/h
 * @method m³/h × density (kg/m³)
 */
export function m3hToKgh(m3h: number, densityKgM3: number): number {
  return m3h * densityKgM3;
}

/**
 * Convert kg/h to m³/h given fluid density
 * @param kgh Flow rate in kg/h
 * @param densityKgM3 Fluid density in kg/m³
 * @returns Flow rate in m³/h
 */
export function kghToM3h(kgh: number, densityKgM3: number): number {
  return kgh / densityKgM3;
}

/**
 * Convert BPD to kg/h given fluid density
 * @param bpd Flow rate in barrels per day
 * @param densityKgM3 Fluid density in kg/m³
 * @returns Flow rate in kg/h
 */
export function bpdToKgh(bpd: number, densityKgM3: number): number {
  const m3h = bpdToM3H(bpd);
  return m3hToKgh(m3h, densityKgM3);
}

/**
 * Length conversions
 */

/**
 * Convert millimeters to inches
 * @param mm Length in millimeters
 * @returns Length in inches
 * @method mm / 25.4
 */
export function mmToIn(mm: number): number {
  return mm / 25.4;
}

/**
 * Convert inches to millimeters
 * @param inches Length in inches
 * @returns Length in millimeters
 * @method in × 25.4
 */
export function inToMm(inches: number): number {
  return inches * 25.4;
}

/**
 * Convert meters to feet
 * @param meters Length in meters
 * @returns Length in feet
 * @method m × 3.28084
 */
export function mToFt(meters: number): number {
  return meters * 3.28084;
}

/**
 * Convert feet to meters
 * @param feet Length in feet
 * @returns Length in meters
 * @method ft / 3.28084
 */
export function ftToM(feet: number): number {
  return feet / 3.28084;
}

/**
 * Convert millimeters to meters
 * @param mm Length in millimeters
 * @returns Length in meters
 * @method mm / 1000
 */
export function mmToM(mm: number): number {
  return mm / 1000;
}

/**
 * Convert meters to millimeters
 * @param meters Length in meters
 * @returns Length in millimeters
 * @method m × 1000
 */
export function mToMm(meters: number): number {
  return meters * 1000;
}

/**
 * Mass conversions
 */

/**
 * Convert kilograms to pounds
 * @param kg Mass in kilograms
 * @returns Mass in pounds
 * @method kg × 2.20462
 */
export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert pounds to kilograms
 * @param lb Mass in pounds
 * @returns Mass in kilograms
 * @method lb / 2.20462
 */
export function lbToKg(lb: number): number {
  return lb / 2.20462;
}

/**
 * Convert kilograms to metric tonnes
 * @param kg Mass in kilograms
 * @returns Mass in metric tonnes
 * @method kg / 1000
 */
export function kgToTon(kg: number): number {
  return kg / 1000;
}

/**
 * Convert metric tonnes to kilograms
 * @param ton Mass in metric tonnes
 * @returns Mass in kilograms
 * @method ton × 1000
 */
export function tonToKg(ton: number): number {
  return ton * 1000;
}

/**
 * Area conversions
 */

/**
 * Convert square meters to square feet
 * @param m2 Area in square meters
 * @returns Area in square feet
 * @method m² × 10.7639
 */
export function m2ToFt2(m2: number): number {
  return m2 * 10.7639;
}

/**
 * Convert square feet to square meters
 * @param ft2 Area in square feet
 * @returns Area in square meters
 * @method ft² / 10.7639
 */
export function ft2ToM2(ft2: number): number {
  return ft2 / 10.7639;
}

/**
 * Density conversions
 */

/**
 * Convert kg/m³ to lb/ft³
 * @param kgM3 Density in kg/m³
 * @returns Density in lb/ft³
 * @method (kg/m³) / 16.0185
 */
export function kgM3ToLbFt3(kgM3: number): number {
  return kgM3 / 16.0185;
}

/**
 * Convert lb/ft³ to kg/m³
 * @param lbFt3 Density in lb/ft³
 * @returns Density in kg/m³
 * @method (lb/ft³) × 16.0185
 */
export function lbFt3ToKgM3(lbFt3: number): number {
  return lbFt3 * 16.0185;
}

/**
 * Convert API gravity to specific gravity
 * SG = 141.5 / (API + 131.5)
 * @param api API gravity (°API)
 * @returns Specific gravity (SG) relative to water
 * @method SG = 141.5 / (API + 131.5)
 */
export function apiToSG(api: number): number {
  return 141.5 / (api + 131.5);
}

/**
 * Convert specific gravity to API gravity
 * API = (141.5 / SG) - 131.5
 * @param sg Specific gravity relative to water
 * @returns API gravity (°API)
 * @method API = (141.5 / SG) - 131.5
 */
export function sgToApi(sg: number): number {
  return 141.5 / sg - 131.5;
}

/**
 * Convert API gravity to density in kg/m³
 * Assumes reference water density of 1000 kg/m³
 * @param api API gravity (°API)
 * @returns Density in kg/m³
 */
export function apiToDensity(api: number): number {
  const sg = apiToSG(api);
  return sg * 1000;
}

/**
 * Convert density in kg/m³ to API gravity
 * Assumes reference water density of 1000 kg/m³
 * @param densityKgM3 Density in kg/m³
 * @returns API gravity (°API)
 */
export function densityToApi(densityKgM3: number): number {
  const sg = densityKgM3 / 1000;
  return sgToApi(sg);
}

/**
 * Convert density kg/m³ to specific gravity
 * @param densityKgM3 Density in kg/m³
 * @returns Specific gravity relative to water
 */
export function densityToSG(densityKgM3: number): number {
  return densityKgM3 / 1000;
}

/**
 * Convert specific gravity to density kg/m³
 * @param sg Specific gravity relative to water
 * @returns Density in kg/m³
 */
export function sgToDensity(sg: number): number {
  return sg * 1000;
}
