/**
 * Pump Sizing Module for AEGIS Trial
 * Pure TypeScript calculation library for pump selection and power estimation
 * No UI, no 'use client'
 *
 * @module lib/engineering/pump
 * @reference Hydraulic Institute Standards, API 610
 */

/**
 * Input interface for pump sizing
 */
export interface PumpSizingInput {
  /** Flow rate (m³/h) */
  flowRate_m3h: number;
  /** Suction pressure (bar, absolute) */
  suctionPressure_bar: number;
  /** Discharge pressure (bar, absolute) */
  dischargePressure_bar: number;
  /** Fluid density (kg/m³) */
  fluidDensity_kgm3: number;
  /** Dynamic viscosity (cP) */
  viscosity_cP: number;
  /** Suction head/elevation (m, optional) */
  suctionHead_m?: number;
  /** Discharge head/elevation (m, optional) */
  dischargeHead_m?: number;
}

/**
 * Output interface for pump sizing
 */
export interface PumpSizingOutput {
  /** Differential head (m) */
  differentialHead_m: number;
  /** Hydraulic power required (kW) */
  hydraulicPower_kW: number;
  /** Pump efficiency estimate */
  efficiency: number;
  /** Shaft power required (kW) */
  shaftPower_kW: number;
  /** Motor power selected - next standard size (kW) */
  motorPower_kW: number;
  /** Specific speed (dimensionless) */
  specificSpeed: number;
  /** Pump type recommendation ('Centrifugal' | 'Axial' | 'Positive Displacement') */
  pumpType: string;
  /** Net positive suction head available (m) */
  npshAvailable_m: number;
}

/**
 * Standard motor power sizes (kW)
 */
const STANDARD_MOTOR_SIZES = [
  0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132,
  160, 200, 250,
];

/**
 * Estimate pump efficiency based on flow rate
 * Larger flow rates typically have higher efficiency
 * @param flowRate_m3h Flow rate (m³/h)
 * @returns Pump efficiency (0-1)
 * @method Empirical efficiency curve
 */
function estimateEfficiency(flowRate_m3h: number): number {
  // Typical efficiency curves for centrifugal pumps
  if (flowRate_m3h > 100) {
    return 0.8; // Large pumps: 80% efficiency
  }
  if (flowRate_m3h > 10) {
    return 0.7; // Medium pumps: 70% efficiency
  }
  return 0.6; // Small pumps: 60% efficiency
}

/**
 * Calculate specific speed
 * Ns = n * Q^0.5 / H^0.75
 * where n = speed (rpm, typical 1500 or 3000)
 *       Q = flow (m³/h)
 *       H = head (m)
 * @param flowRate_m3h Flow rate (m³/h)
 * @param head_m Differential head (m)
 * @param speed_rpm Pump speed (rpm), default 1500
 * @returns Specific speed
 * @method Hydraulic Institute definition
 */
function calculateSpecificSpeed(
  flowRate_m3h: number,
  head_m: number,
  speed_rpm: number = 1500
): number {
  if (head_m <= 0 || flowRate_m3h <= 0) {
    return 0;
  }

  // Ns = n * sqrt(Q) / H^0.75
  const ns = (speed_rpm * Math.sqrt(flowRate_m3h)) / Math.pow(head_m, 0.75);

  return ns;
}

/**
 * Determine pump type based on specific speed
 * Centrifugal: Ns < 4000
 * Mixed flow: 4000 < Ns < 9000
 * Axial flow: Ns > 9000
 * @param specificSpeed Specific speed
 * @returns Pump type string
 * @method Hydraulic Institute classification
 */
function determinePumpType(specificSpeed: number): string {
  if (specificSpeed < 500) return 'Positive Displacement'; // Very high head
  if (specificSpeed < 4000) return 'Centrifugal';
  if (specificSpeed < 9000) return 'Mixed Flow';
  return 'Axial';
}

/**
 * Round pump power up to next standard motor size
 * @param shaftPower_kW Shaft power required (kW)
 * @returns Next standard motor size (kW)
 */
function selectMotorSize(shaftPower_kW: number): number {
  for (const size of STANDARD_MOTOR_SIZES) {
    if (size >= shaftPower_kW) {
      return size;
    }
  }
  return STANDARD_MOTOR_SIZES[STANDARD_MOTOR_SIZES.length - 1];
}

/**
 * Calculate net positive suction head available (simplified)
 * NPSHa = Ps/(rho*g) + hs - Pvap/(rho*g)
 * where Ps = absolute suction pressure
 *       hs = suction head (elevation)
 *       Pvap = vapor pressure
 * @param suctionPressure_bar Absolute suction pressure (bar)
 * @param suctionHead_m Suction elevation (m)
 * @param fluidDensity_kgm3 Fluid density (kg/m³)
 * @param temperature_C Fluid temperature (°C, for vapor pressure estimation)
 * @returns NPSHa in meters
 * @method Simplified NPSH calculation
 */
function calculateNPSHAvailable(
  suctionPressure_bar: number,
  suctionHead_m: number,
  fluidDensity_kgm3: number,
  temperature_C: number = 40
): number {
  // Convert pressure to head: h = P / (rho * g)
  // P in Pa, rho in kg/m³, g = 9.81 m/s²
  const suctionPressure_Pa = suctionPressure_bar * 1e5;
  const pressureHead = suctionPressure_Pa / (fluidDensity_kgm3 * 9.81);

  // Estimate vapor pressure head (simplified)
  // For water at 40°C: Pvap ≈ 0.007 bar = 0.7 m head
  // For hydrocarbons at 40°C: typically 0.01-0.05 bar
  let vaporPressureHead = 0.5; // m (conservative estimate for hydrocarbons)

  if (temperature_C > 60) {
    vaporPressureHead = 1.0; // Higher temperature = higher vapor pressure
  }

  // NPSHa = Pressure head + suction elevation - vapor pressure head
  const npshAvailable = pressureHead + suctionHead_m - vaporPressureHead;

  return Math.max(0.5, npshAvailable); // Minimum 0.5 m
}

/**
 * Size a pump based on system requirements
 *
 * Input parameters:
 * - flowRate_m3h: Required flow rate in m³/h
 * - suctionPressure_bar: Absolute pressure at pump inlet (bar)
 * - dischargePressure_bar: Absolute pressure at pump outlet (bar)
 * - fluidDensity_kgm3: Fluid density
 * - viscosity_cP: Fluid viscosity (affects efficiency)
 * - suctionHead_m, dischargeHead_m: Elevation changes (optional)
 *
 * Output includes:
 * - Differential head and hydraulic power
 * - Efficiency estimate and shaft power
 * - Standard motor size selection
 * - Pump type recommendation
 * - Available NPSH
 *
 * @param input Pump sizing input
 * @returns Pump sizing result
 * @method Hydraulic power = ρ × g × Q × H, Efficiency curves, Specific speed
 */
export function sizePump(input: PumpSizingInput): PumpSizingOutput {
  // Default elevation
  const suctionHead = input.suctionHead_m ?? 0;
  const dischargeHead = input.dischargeHead_m ?? 0;

  // Calculate differential head
  // H = (Pd - Ps)/(rho*g) + (zd - zs)
  // where P in Pa, rho in kg/m³, g = 9.81 m/s²

  const pressureDiff_Pa = (input.dischargePressure_bar - input.suctionPressure_bar) * 1e5;
  const elevationDiff = dischargeHead - suctionHead;

  const pressureHead = pressureDiff_Pa / (input.fluidDensity_kgm3 * 9.81);
  const totalHead = pressureHead + elevationDiff;

  const differentialHead = Math.max(0.1, totalHead); // Minimum 0.1 m

  // Calculate hydraulic power
  // Phyd = (rho * g * Q * H) / 3600
  // Q in m³/h, H in m, result in kW
  // Factor: rho(kg/m³) * g(9.81) * Q(m³/h) / 3600(s/h) = power in W
  // Divide by 1000 for kW

  const hydraulicPower =
    (input.fluidDensity_kgm3 * 9.81 * input.flowRate_m3h * differentialHead) / 3.6e6;

  // Estimate efficiency
  const efficiency = estimateEfficiency(input.flowRate_m3h);

  // Calculate shaft power
  const shaftPower = hydraulicPower / efficiency;

  // Select motor size (add 10% safety margin)
  const motorPower = selectMotorSize(shaftPower * 1.1);

  // Calculate specific speed
  const specificSpeed = calculateSpecificSpeed(
    input.flowRate_m3h,
    differentialHead,
    1500 // Assume 1500 rpm
  );

  // Determine pump type
  const pumpType = determinePumpType(specificSpeed);

  // Calculate available NPSH
  const npshAvailable = calculateNPSHAvailable(
    input.suctionPressure_bar,
    suctionHead,
    input.fluidDensity_kgm3,
    40 // Assume 40°C
  );

  return {
    differentialHead_m: parseFloat(differentialHead.toFixed(2)),
    hydraulicPower_kW: parseFloat(hydraulicPower.toFixed(2)),
    efficiency: parseFloat(efficiency.toFixed(2)),
    shaftPower_kW: parseFloat(shaftPower.toFixed(2)),
    motorPower_kW: motorPower,
    specificSpeed: parseFloat(specificSpeed.toFixed(0)),
    pumpType,
    npshAvailable_m: parseFloat(npshAvailable.toFixed(2)),
  };
}

/**
 * Check pump NPSH requirement
 * Different pump types have different NPSH requirements
 * Centrifugal: ~0.6-1.5 m
 * Positive Displacement: ~0.3-0.6 m
 * @param pumpType Type of pump
 * @param flowRate_m3h Flow rate for estimation
 * @returns Required NPSH in meters
 */
export function getNPSHRequired(pumpType: string, flowRate_m3h: number): number {
  // Simplified NPSH requirement curves
  if (pumpType === 'Positive Displacement') {
    return Math.max(0.3, 0.5 + flowRate_m3h / 500); // Low NPSH requirement
  }

  if (pumpType === 'Axial') {
    return Math.max(0.5, 1.0 + flowRate_m3h / 300); // Medium NPSH
  }

  // Centrifugal (default)
  return Math.max(0.6, 1.2 + flowRate_m3h / 400); // Standard NPSH
}

/**
 * Validate pump sizing inputs
 * @param input Pump sizing input
 * @returns Object with validity and warnings
 */
export function validatePumpSizingInput(input: PumpSizingInput): {
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

  if (input.dischargePressure_bar <= input.suctionPressure_bar) {
    warnings.push('Error: Discharge pressure must be higher than suction pressure');
  }

  if (input.viscosity_cP > 10000) {
    warnings.push('Warning: Very high viscosity - standard centrifugal pump may not work');
  }

  if (input.suctionPressure_bar < 0) {
    warnings.push('Error: Suction pressure must be absolute (positive)');
  }

  return {
    isValid: warnings.filter(w => w.startsWith('Error')).length === 0,
    warnings,
  };
}

/**
 * Estimate cavitation risk
 * Compare available NPSH with required NPSH
 * @param npshAvailable Available NPSH (m)
 * @param npshRequired Required NPSH (m)
 * @returns Risk level ('Safe' | 'Caution' | 'At Risk')
 */
export function cavitationRisk(npshAvailable: number, npshRequired: number): string {
  const margin = npshAvailable - npshRequired;

  if (margin > 1.0) return 'Safe';
  if (margin > 0.3) return 'Caution';
  return 'At Risk';
}
