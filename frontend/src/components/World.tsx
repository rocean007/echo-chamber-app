import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateWorld } from '../utils/worldGenerator'
import { useGameStore } from '../store/gameStore'

export default function World() {
  const worldSeed = useGameStore(s => s.worldSeed)
  const worldData = useMemo(
    () => generateWorld(worldSeed ?? undefined),
    [worldSeed],
  )
  const groupRef = useRef<THREE.Group>(null)
  const { worldState } = useGameStore()

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02
    }
  })

  return (
    <group ref={groupRef}>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Grid lines */}
      <gridHelper args={[40, 40, '#D32F2F', '#2a2a2a']} position={[0, -0.05, 0]} />

      {/* Terrain tiles */}
      {worldData.tiles.map((tile, i) => (
        <mesh
          key={i}
          position={[tile.x, tile.height / 2 - 0.3, tile.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.95, Math.max(tile.height, 0.1), 0.95]} />
          <meshStandardMaterial
            color={tile.color}
            roughness={0.7}
            metalness={tile.biome === 'crystal_desert' ? 0.6 : 0.1}
            emissive={tile.biome === 'magma_plains' ? '#D32F2F' : '#000000'}
            emissiveIntensity={tile.biome === 'magma_plains' ? 0.15 : 0}
          />
        </mesh>
      ))}

      {/* Decorative structures (appear as agents convert) */}
      {Array.from({ length: Math.min(worldState.structureCount * 2, 16) }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const r = 4 + (i % 3)
        return (
          <mesh key={`struct-${i}`} position={[Math.cos(angle) * r, 0.5, Math.sin(angle) * r]} castShadow>
            <coneGeometry args={[0.15, 0.8 + Math.random() * 0.5, 4]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#D32F2F' : '#FFC107'}
              emissive={i % 2 === 0 ? '#D32F2F' : '#FFC107'}
              emissiveIntensity={0.4}
            />
          </mesh>
        )
      })}

      {/* Atmospheric particles */}
      <Particles />

      {/* Ambient glow orbs */}
      <GlowOrbs />
    </group>
  )
}

function Particles() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = 60
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const positions = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 18,
      y: Math.random() * 4,
      z: (Math.random() - 0.5) * 18,
      speed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    })), [])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    positions.forEach((p, i) => {
      dummy.position.set(p.x, p.y + Math.sin(t * p.speed + p.phase) * 0.3, p.z)
      dummy.scale.setScalar(0.04 + Math.sin(t * p.speed + p.phase) * 0.02)
      dummy.updateMatrix()
      mesh.current!.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#FFC107" emissive="#FFC107" emissiveIntensity={1} transparent opacity={0.7} />
    </instancedMesh>
  )
}

function GlowOrbs() {
  const orbRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (orbRef.current) {
      orbRef.current.rotation.y = clock.getElapsedTime() * 0.15
    }
  })
  return (
    <group ref={orbRef}>
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2
        return (
          <pointLight
            key={i}
            position={[Math.cos(angle) * 8, 2, Math.sin(angle) * 8]}
            color={i % 2 === 0 ? '#D32F2F' : '#FFC107'}
            intensity={0.8}
            distance={10}
          />
        )
      })}
    </group>
  )
}
