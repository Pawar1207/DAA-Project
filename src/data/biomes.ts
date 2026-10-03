import { Biome } from '../types/game';

export const BIOMES: Biome[] = [
  {
    id: 'suburban_meadow',
    name: 'Sunny Countryside',
    grassColor: '#4ADE80',
    grassDarkColor: '#22C55E',
    roadColor: '#334155',
    roadMarkColor: '#F8FAFC',
    waterColor: '#38BDF8',
    waterShineColor: '#BAE6FD',
    railGravelColor: '#64748B',
    particleType: 'LEAF',
    minScore: 0,
  },
  {
    id: 'river_valley',
    name: 'Evergreen Riverland',
    grassColor: '#10B981',
    grassDarkColor: '#059669',
    roadColor: '#1E293B',
    roadMarkColor: '#FCD34D',
    waterColor: '#0284C7',
    waterShineColor: '#7DD3FC',
    railGravelColor: '#475569',
    particleType: 'FLOWER',
    minScore: 25,
  },
  {
    id: 'cyber_expressway',
    name: 'Cyber Metropolis',
    grassColor: '#1E1B4B',
    grassDarkColor: '#0F172A',
    roadColor: '#020617',
    roadMarkColor: '#38BDF8',
    waterColor: '#6366F1',
    waterShineColor: '#A5B4FC',
    railGravelColor: '#312E81',
    particleType: 'CYBER',
    minScore: 55,
  },
  {
    id: 'alpine_snowpass',
    name: 'Frozen Pine Peak',
    grassColor: '#F1F5F9',
    grassDarkColor: '#E2E8F0',
    roadColor: '#475569',
    roadMarkColor: '#CBD5E1',
    waterColor: '#0284C7',
    waterShineColor: '#E0F2FE',
    railGravelColor: '#94A3B8',
    particleType: 'SNOW',
    minScore: 90,
  },
];

export function getBiomeForScore(score: number): Biome {
  let activeBiome = BIOMES[0];
  for (const biome of BIOMES) {
    if (score >= biome.minScore) {
      activeBiome = biome;
    }
  }
  return activeBiome;
}
