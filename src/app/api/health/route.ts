import { checkProviderAvailability } from '@/lib/ai/orchestrator';

export async function GET() {
  const providers = checkProviderAvailability();
  const activeCount = Object.values(providers).filter(Boolean).length;

  return Response.json({
    status: 'ok',
    version: '2.0.0',
    platform: 'EE AEGIS',
    company: 'LLC Energy & Engineering',
    aiProviders: {
      total: Object.keys(providers).length,
      active: activeCount,
      details: providers,
    },
    timestamp: new Date().toISOString(),
  });
}
