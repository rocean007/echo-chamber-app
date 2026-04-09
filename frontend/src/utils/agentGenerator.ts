import { Agent, EchoStone, BiomeType } from '../store/gameStore'

const STONES: EchoStone[] = ['Growth', 'Decay', 'Light', 'Shadow']

const PERSONALITIES = [
  'Cautious', 'Reckless', 'Analytical', 'Empathetic',
  'Defiant', 'Loyal', 'Chaotic', 'Stoic',
  'Curious', 'Melancholic', 'Fervent', 'Detached',
]

const AGENT_NAMES = [
  'AXIOM-7', 'VEIL-3', 'NOCTIS', 'EMBER-K', 'FRACTURE',
  'SOLACE-2', 'DRIFT', 'CIPHER-9', 'LUMEN', 'RUIN-4',
  'EPOCH', 'VESTIGE', 'ORACLE-0', 'THORN', 'SABLE-6',
  'FLUX', 'REMNANT', 'HOLLOW-1', 'PRISM', 'CINDER',
]

const BIOMES: BiomeType[] = ['mushroom_forest', 'crystal_desert', 'magma_plains', 'ash_tundra']

function randomDesire(): EchoStone[] {
  const len = Math.floor(Math.random() * 3) + 1
  return Array.from({ length: len }, () => STONES[Math.floor(Math.random() * STONES.length)])
}

function randomPosition(index: number, total: number): [number, number, number] {
  const angle = (index / total) * Math.PI * 2
  const radius = 3 + Math.random() * 5
  return [
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius,
  ]
}

export function generateAgents(count: number = 12): Agent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `agent-${i}-${Date.now()}`,
    name: AGENT_NAMES[i % AGENT_NAMES.length],
    position: randomPosition(i, count),
    faction: 'neutral',
    desire: randomDesire(),
    personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
    memory: [],
    biome: BIOMES[Math.floor(Math.random() * BIOMES.length)],
    converted: false,
    pulsePhase: Math.random() * Math.PI * 2,
  }))
}

export function getAgentDescription(agent: Agent): string {
  const desireStr = agent.desire.join(' → ')
  return `${agent.name} is a ${agent.personality} agent seeking: ${desireStr}`
}
