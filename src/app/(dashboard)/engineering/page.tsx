'use client';

import { useState } from 'react';
import { Calculator, Flame, Droplets, Wind, GitBranch, Gauge, Cylinder, Beaker } from 'lucide-react';
import type { CalculationType } from '@/types';

const modules = [
  { type: 'pressure-vessel' as CalculationType, icon: Cylinder, label: 'Pressure Vessel', desc: 'ASME VIII Div 1', standard: 'UG-27/UG-32' },
  { type: 'heat-exchanger' as CalculationType, icon: Flame, label: 'Heat Exchanger', desc: 'Kern Method / TEMA', standard: 'TEMA 11th Ed' },
  { type: 'separator' as CalculationType, icon: Droplets, label: 'Separator', desc: 'Souders-Brown / Stokes', standard: 'API 12J' },
  { type: 'distillation' as CalculationType, icon: Beaker, label: 'Distillation', desc: 'Fenske-Underwood-Gilliland', standard: 'FUG Method' },
  { type: 'pipe-sizing' as CalculationType, icon: GitBranch, label: 'Pipe Sizing', desc: 'Darcy-Weisbach / Churchill', standard: 'ASME B31.3' },
  { type: 'pump' as CalculationType, icon: Gauge, label: 'Pump Sizing', desc: 'Hydraulic / NPSH', standard: 'API 610' },
  { type: 'crude-oil' as CalculationType, icon: Wind, label: 'Crude Oil Analysis', desc: 'Characterization & Yield', standard: 'API TDB' },
];

export default function EngineeringPage() {
  const [selected, setSelected] = useState<CalculationType | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const inputFields: Record<CalculationType, { key: string; label: string; unit: string; default: string }[]> = {
    'pressure-vessel': [
      { key: 'designPressure_bar', label: 'Design Pressure', unit: 'bar', default: '25' },
      { key: 'designTemperature_C', label: 'Design Temperature', unit: '°C', default: '300' },
      { key: 'innerDiameter_mm', label: 'Inner Diameter', unit: 'mm', default: '1500' },
      { key: 'material', label: 'Material', unit: '', default: 'SA-516-70' },
    ],
    'heat-exchanger': [
      { key: 'dutyKW', label: 'Duty', unit: 'kW', default: '500' },
      { key: 'hotInletC', label: 'Hot Inlet', unit: '°C', default: '150' },
      { key: 'hotOutletC', label: 'Hot Outlet', unit: '°C', default: '80' },
      { key: 'coldInletC', label: 'Cold Inlet', unit: '°C', default: '25' },
      { key: 'coldOutletC', label: 'Cold Outlet', unit: '°C', default: '60' },
    ],
    'separator': [
      { key: 'oilFlowRate_m3h', label: 'Oil Flow Rate', unit: 'm³/h', default: '50' },
      { key: 'waterFlowRate_m3h', label: 'Water Flow Rate', unit: 'm³/h', default: '20' },
      { key: 'gasFlowRate_m3h', label: 'Gas Flow Rate', unit: 'm³/h', default: '5000' },
      { key: 'operatingPressure_bar', label: 'Operating Pressure', unit: 'bar', default: '10' },
    ],
    'distillation': [
      { key: 'feedFlowKgH', label: 'Feed Flow', unit: 'kg/h', default: '10000' },
      { key: 'pressure_bar', label: 'Pressure', unit: 'bar', default: '2' },
      { key: 'refluxRatio', label: 'Reflux Ratio', unit: '', default: '1.5' },
      { key: 'relativeVolatility', label: 'Relative Volatility', unit: '', default: '2.5' },
    ],
    'pipe-sizing': [
      { key: 'flowRate_m3h', label: 'Flow Rate', unit: 'm³/h', default: '150' },
      { key: 'fluidDensity_kgm3', label: 'Fluid Density', unit: 'kg/m³', default: '850' },
      { key: 'viscosity_cP', label: 'Viscosity', unit: 'cP', default: '5' },
      { key: 'pipeLength_m', label: 'Pipe Length', unit: 'm', default: '200' },
    ],
    'pump': [
      { key: 'flowRate_m3h', label: 'Flow Rate', unit: 'm³/h', default: '100' },
      { key: 'suctionPressure_bar', label: 'Suction Pressure', unit: 'bar', default: '2' },
      { key: 'dischargePressure_bar', label: 'Discharge Pressure', unit: 'bar', default: '15' },
      { key: 'fluidDensity_kgm3', label: 'Fluid Density', unit: 'kg/m³', default: '850' },
    ],
    'crude-oil': [
      { key: 'apiGravity', label: 'API Gravity', unit: '°API', default: '32' },
      { key: 'sulfurContent', label: 'Sulfur Content', unit: '% wt', default: '1.5' },
      { key: 'flowRateBPD', label: 'Flow Rate', unit: 'BPD', default: '15000' },
    ],
  };

  const runCalculation = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const numericInputs: Record<string, any> = {};
      for (const [key, val] of Object.entries(inputs)) {
        numericInputs[key] = isNaN(Number(val)) ? val : Number(val);
      }
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selected, inputs: numericInputs }),
      });
      const data = await res.json();
      setResult(data.result || data);
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Engineering Calculations</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>8 industry-standard calculation engines</p>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-4 gap-3">
        {modules.map((mod) => (
          <button
            key={mod.type}
            onClick={() => {
              setSelected(mod.type);
              setResult(null);
              const defaults: Record<string, string> = {};
              inputFields[mod.type].forEach(f => { defaults[f.key] = f.default; });
              setInputs(defaults);
            }}
            className="rounded-lg p-4 text-left transition-all duration-150"
            style={{
              background: selected === mod.type ? 'var(--ee-crimson-light)' : 'var(--bg-primary)',
              border: `1px solid ${selected === mod.type ? 'var(--ee-crimson)' : 'var(--border)'}`,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <mod.icon className="w-5 h-5 mb-2" style={{ color: selected === mod.type ? 'var(--ee-crimson)' : 'var(--text-tertiary)' }} />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{mod.label}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{mod.standard}</p>
          </button>
        ))}
      </div>

      {/* Input Form */}
      {selected && inputFields[selected] && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {modules.find(m => m.type === selected)?.label} — Input Parameters
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {inputFields[selected].map((field) => (
              <div key={field.key}>
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {field.label} {field.unit && <span style={{ color: 'var(--text-muted)' }}>({field.unit})</span>}
                </label>
                <input
                  type="text"
                  value={inputs[field.key] || ''}
                  onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={runCalculation}
            disabled={loading}
            className="mt-4 px-6 py-2 rounded-md text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: 'var(--ee-crimson)' }}
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Results</h2>
          <pre className="text-[12px] leading-relaxed overflow-auto p-4 rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
