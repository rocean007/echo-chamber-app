import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Agent as AgentType, STONE_SYMBOLS, useGameStore } from '../store/gameStore'

const FACTION_COLORS = {
  neutral:  '#9E9E9E',
  player1:  '#D32F2F',
  player2:  '#FF5722',
}

const FACTION_EMISSIVE = {
  neutral:  '#555555',
  player1:  '#8B0000',
  player2:  '#BF360C',
}

interface AgentProps {
  agent: AgentType
}

export default function Agent({ agent }: AgentProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const { selectAgent, selectedAgentId } = useGameStore()
  const isSelected = selectedAgentId === agent.id

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime() + agent.pulsePhase
    meshRef.current.position.y = agent.position[1] + Math.sin(t * 1.2) * 0.15 + 0.4
    meshRef.current.rotation.y = t * 0.8
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.2
      ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05)
    }
  })

  const color = FACTION_COLORS[agent.faction]
  const emissive = FACTION_EMISSIVE[agent.faction]
  const labelGlyphColor = agent.faction === 'neutral' ? '#E8DFD0' : color
  const scale = hovered || isSelected ? 1.3 : 1.0

  return (
    <group position={agent.position}>
      {/* Shadow circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshStandardMaterial color="#000" transparent opacity={0.4} />
      </mesh>

      {/* Orbiting ring */}
      <mesh ref={ringRef} position={[0, 0.5, 0]}>
        <torusGeometry args={[0.28, 0.025, 8, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected ? 2 : 0.8}
        />
      </mesh>

      {/* Main body */}
      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
        onClick={() => selectAgent(agent.id)}
        castShadow
      >
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected ? 1.5 : hovered ? 1 : 0.5}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight
        color={color}
        intensity={isSelected ? 1.5 : 0.4}
        distance={2.5}
        position={[0, 0.5, 0]}
      />

      {/* Floating label */}
      <Html position={[0, 1.1, 0]} center distanceFactor={8}>
        <div style={{
          fontFamily: 'Share Tech Mono, monospace',
          padding: '5px 10px',
          borderRadius: 6,
          background: 'rgba(12,12,14,0.92)',
          border: `1px solid ${color}77`,
          boxShadow: `0 4px 14px rgba(0,0,0,0.55)`,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          letterSpacing: '0.05em',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#FFF8E7',
            textShadow: '0 1px 3px rgba(0,0,0,0.95)',
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 12,
            marginTop: 3,
            color: labelGlyphColor,
            textShadow: agent.faction === 'neutral'
              ? '0 1px 2px rgba(0,0,0,0.9)'
              : `0 0 10px ${color}, 0 1px 2px rgba(0,0,0,0.9)`,
          }}>
            {agent.desire.map(s => STONE_SYMBOLS[s]).join(' ')}
          </div>
        </div>
      </Html>
    </group>
  )
}
