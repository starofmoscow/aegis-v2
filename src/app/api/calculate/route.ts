// ============================================================
// EE AEGIS V2.0 — Engineering Calculation API
// POST /api/calculate — Run engineering calculations
// ============================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { designPressureVessel } from '@/lib/engineering/pressure-vessel';
import { designHeatExchanger } from '@/lib/engineering/heat-exchanger';
import { designSeparator } from '@/lib/engineering/separator';
import { sizeDistillationColumn } from '@/lib/engineering/distillation';
import { sizePipe } from '@/lib/engineering/pipe-sizing';
import { sizePump } from '@/lib/engineering/pump';
import { characterizeCrudeOil } from '@/lib/engineering/crude-oil';

const CalculateSchema = z.object({
  type: z.enum([
    'pressure-vessel',
    'heat-exchanger',
    'separator',
    'distillation',
    'pipe-sizing',
    'pump',
    'crude-oil',
  ]),
  inputs: z.record(z.union([z.number(), z.string()])),
});

const CALCULATORS: Record<string, (inputs: any) => any> = {
  'pressure-vessel': designPressureVessel,
  'heat-exchanger': designHeatExchanger,
  'separator': designSeparator,
  'distillation': sizeDistillationColumn,
  'pipe-sizing': sizePipe,
  'pump': sizePump,
  'crude-oil': characterizeCrudeOil,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CalculateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { type, inputs } = parsed.data;
    const calculator = CALCULATORS[type];

    if (!calculator) {
      return Response.json({ error: `Unknown calculation type: ${type}` }, { status: 400 });
    }

    const result = calculator(inputs);

    return Response.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Calculation error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({
    available: Object.keys(CALCULATORS),
    standards: [
      'ASME BPVC Section VIII Division 1',
      'TEMA Standards 11th Edition',
      'API 12J 9th Edition',
      'ASME B31.3-2024',
      'Kern Method (Heat Transfer)',
      'Darcy-Weisbach / Churchill (Pipe Flow)',
      'Fenske-Underwood-Gilliland (Distillation)',
      'API 610 / Hydraulic Institute (Pumps)',
    ],
  });
}
