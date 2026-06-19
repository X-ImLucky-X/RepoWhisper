"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const DotWaveBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    
    // Camera looking straight down from above
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 300, 0); 
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- 2. Wave Geometry Configuration ---
    const SEPARATION = 8; 
    // Massive grid to cover the whole screen even when moving
    const AMOUNTX = 150;    
    const AMOUNTY = 150;     
    const numParticles = AMOUNTX * AMOUNTY;

    const positions = new Float32Array(numParticles * 3);

    let i = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2; // X
        positions[i + 1] = 0;                                        // Y (height)
        positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2; // Z

        i += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // --- 3. Shader Material for Fading based on Height ---
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#ffffff') }, // Monocolor: White
      },
      vertexShader: `
        varying float vAlpha;
        void main() {
          // Map Y from [-12, 12] to [0, 1]
          vAlpha = (position.y + 12.0) / 24.0;
          vAlpha = smoothstep(0.0, 1.0, vAlpha);
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 3.0 * (300.0 / -mvPosition.z); 
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) discard;
          gl_FragColor = vec4(color, vAlpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- 4. Animation Loop ---
    let count = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Physically move the dots diagonally (top-left to bottom-right)
      particles.position.x += 0.2;
      particles.position.z += 0.2;

      // Infinite wrap-around to keep the grid seamless
      if (particles.position.x >= SEPARATION) {
        particles.position.x -= SEPARATION;
        particles.position.z -= SEPARATION;
      }

      const positions = particles.geometry.attributes.position.array as Float32Array;
      let i = 0;

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          // Calculate absolute world position for seamless wave phase
          const worldX = (ix * SEPARATION) + particles.position.x;
          const worldZ = (iy * SEPARATION) + particles.position.z;
          
          // Phase moves diagonally
          const wavePhase = (worldX * 0.02) + (worldZ * 0.02) - count;
          
          positions[i + 1] = Math.sin(wavePhase) * 12; // Amplitude
          i += 3;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      count += 0.05; // Wave ripple speed

      renderer.render(scene, camera);
    };

    animate();

    // --- 5. Responsive Resize Handle ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      // Changed to 'fixed' so it stays glued to the background and covers the whole page while scrolling
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
};

export default DotWaveBackground;
