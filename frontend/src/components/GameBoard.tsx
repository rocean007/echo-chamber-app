import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useWebGL } from '../hooks/useWebGL'
import { useGameStore } from '../store/gameStore'
import World from './World'
import Agent from './Agent'

export default function GameBoard() {
  const webglSupported = useWebGL()
  const { agents, phase } = useGameStore()

  if (webglSupported === false) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--background)',
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem' }}>◈</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', letterSpacing: '0.1em' }}>
          WEBGL UNAVAILABLE
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.55 }}>
          Echo Chamber requires WebGL to render the 3D world. Please enable hardware acceleration in your browser settings or try a different browser.
        </p>
      </div>
    )
  }

  if (webglSupported === null) return null

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        camera={{ position: [0, 14, 14], fov: 55, near: 0.1, far: 200 }}
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} color="#FF5722" />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          color="#FFF8E7"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.6} color="#D32F2F" />
        <pointLight position={[10, 8, -10]} intensity={0.5} color="#FFC107" />

        {/* Atmosphere */}
        <Stars radius={60} depth={40} count={800} factor={3} saturation={0} fade speed={0.5} />
        <fog attach="fog" args={['#1A1A1A', 18, 40]} />

        <Suspense fallback={null}>
          {phase === 'playing' && (
            <>
              <World />
              {agents.map(agent => (
                <Agent key={agent.id} agent={agent} />
              ))}
            </>
          )}
        </Suspense>

        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={6}
          maxDistance={28}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  )
}
