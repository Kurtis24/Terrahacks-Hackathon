"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  Box,
  Sphere,
  Cone,
} from "@react-three/drei";
import * as THREE from "three";
import {
  convertGridToCubes,
  createSamplePattern,
  CubeData,
} from "@/utils/convert";

// Basic rotating cube component
function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Box ref={meshRef} position={[-2, 0, 0]} args={[1, 1, 1]}>
      <meshStandardMaterial color="orange" />
    </Box>
  );
}

// Basic sphere component
function Sphere3D() {
  return (
    <Sphere position={[2, 0, 0]} args={[0.8, 32, 32]}>
      <meshStandardMaterial color="lightblue" metalness={0.5} roughness={0.2} />
    </Sphere>
  );
}

// Basic cone component
function Cone3D() {
  return (
    <Cone position={[0, 1.5, 0]} args={[0.6, 1.5, 8]}>
      <meshStandardMaterial color="green" />
    </Cone>
  );
}

// Grid-based cubes component
function GridCubes({
  pattern = "cross",
}: {
  pattern?: "cross" | "diamond" | "border" | "checker" | number[][];
}) {
  const cubes = convertGridToCubes(createSamplePattern(pattern), {
    spacing: 1.0,
    centerGrid: true,
    yOffset: -2,
  });

  return (
    <group>
      {cubes.map((cube: CubeData) => (
        <Box key={cube.key} position={cube.position} args={[1, 1, 1]}>
          <meshStandardMaterial
            color={cube.color}
            metalness={0.3}
            roughness={0.4}
          />
        </Box>
      ))}
    </group>
  );
}

// Interactive Grid Scene with pattern switching
function InteractiveGridScene() {
  const [currentPattern, setCurrentPattern] = React.useState<
    "cross" | "diamond" | "border" | "checker"
  >("cross");

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas
        camera={{
          position: [8, 8, 8],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
      >
        <Suspense fallback={null}>
          {/* Lighting Setup */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} color="blue" intensity={0.5} />

          {/* Environment and Background */}
          <Environment preset="sunset" />

          {/* Grid helper for reference */}
          <Grid
            renderOrder={-1}
            position={[0, -3, 0]}
            infiniteGrid
            cellSize={0.6}
            cellThickness={0.6}
            sectionSize={3.3}
            sectionThickness={1.5}
            sectionColor={"purple"}
            fadeDistance={30}
          />

          {/* Original 3D Objects */}
          <RotatingCube />
          <Sphere3D />
          <Cone3D />

          {/* Grid-based cubes from pattern */}
          <GridCubes pattern={currentPattern} />

          {/* Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={25}
          />
        </Suspense>
      </Canvas>

      {/* Pattern selector UI */}
      <div className="absolute top-4 right-4 text-white z-10 bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">Grid Patterns</h3>
        <div className="space-y-2">
          {(["cross", "diamond", "border", "checker"] as const).map(
            (pattern) => (
              <button
                key={pattern}
                onClick={() => setCurrentPattern(pattern)}
                className={`block w-full text-left px-3 py-2 rounded transition-colors ${
                  currentPattern === pattern
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 text-white z-10 bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">3D Scene Controls</h2>
        <ul className="text-sm space-y-1 mb-3">
          <li>• Left click + drag: Rotate camera</li>
          <li>• Right click + drag: Pan camera</li>
          <li>• Scroll wheel: Zoom in/out</li>
        </ul>
        <div className="border-t border-white/20 pt-3">
          <h3 className="text-sm font-semibold mb-2">Grid Colors</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span style={{ color: "red" }}>●</span> Red (1)
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: "green" }}>●</span> Green (2)
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: "blue" }}>●</span> Blue (3)
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: "purple" }}>●</span> Purple (4)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Three.js component
export default function ThreeScene() {
  return <InteractiveGridScene />;
}
