import { useCallback } from 'react'
import Particles from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export default function ParticlesBg() {
  const init = useCallback(async (engine) => {
    await loadSlim(engine)
  }, [])

  return (
    <Particles
      id="particles-canvas"
      init={init}
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: 70, density: { enable: true, area: 900 } },
          color: { value: ['#C9A84C', '#E5C76B', '#8B6A1A', '#D4B56A'] },
          opacity: {
            value: { min: 0.06, max: 0.35 },
            animation: { enable: true, speed: 0.6, minimumValue: 0.06 },
          },
          size: {
            value: { min: 0.5, max: 2.5 },
          },
          links: {
            enable: true,
            color: '#C9A84C',
            opacity: 0.06,
            distance: 140,
            width: 0.5,
          },
          move: {
            enable: true,
            speed: 0.5,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'bounce' },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'grab' },
          },
          modes: {
            grab: { distance: 180, links: { opacity: 0.15 } },
          },
        },
        detectRetina: true,
      }}
    />
  )
}
