import { BiomeType } from '../store/gameStore'

export interface TerrainTile {
  x: number
  z: number
  height: number
  biome: BiomeType
  color: string
}

export interface WorldData {
  tiles: TerrainTile[]
  seed: number
  width: number
  depth: number
}

const BIOME_COLORS: Record<BiomeType, string[]> = {
  mushroom_forest: ['#2E7D32', '#388E3C', '#1B5E20', '#4CAF50'],
  crystal_desert: ['#FFC107', '#FF8F00', '#FFD54F', '#FF6F00'],
  magma_plains:   ['#D32F2F', '#B71C1C', '#FF5722', '#E64A19'],
  ash_tundra:     ['#616161', '#424242', '#757575', '#9E9E9E'],
}

function noise(x: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + seed) * 43758.5453123
  const t = Math.sin(z * 311.7 + seed) * 43758.5453123
  const u = Math.sin((x + z) * 74.3 + seed) * 43758.5453123
  return (((s % 1) + (t % 1) + (u % 1)) / 3 + 1) / 2
}

export function generateWorld(seed?: number): WorldData {
  const s = seed ?? Math.floor(Math.random() * 99999)
  const width = 20
  const depth = 20
  const tiles: TerrainTile[] = []

  for (let x = -width / 2; x < width / 2; x++) {
    for (let z = -depth / 2; z < depth / 2; z++) {
      const n = noise(x * 0.3, z * 0.3, s)
      const height = n * 1.5

      // Quadrant-based biome assignment
      let biome: BiomeType
      if (x < 0 && z < 0)      biome = 'mushroom_forest'
      else if (x >= 0 && z < 0) biome = 'crystal_desert'
      else if (x < 0 && z >= 0) biome = 'magma_plains'
      else                       biome = 'ash_tundra'

      const colors = BIOME_COLORS[biome]
      const color = colors[Math.floor(n * colors.length)]

      tiles.push({ x, z, height, biome, color })
    }
  }

  return { tiles, seed: s, width, depth }
}

export function getBiomeColor(biome: BiomeType): string {
  const colors = BIOME_COLORS[biome]
  return colors[0]
}
