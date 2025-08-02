"use client";

import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Box } from "@react-three/drei";
import {
  convertGridToCubes,
  createSamplePattern,
  createRandomGrid,
  validateGrid,
  CubeData,
} from "@/utils/convert";
import { revolveGridWithColors, RevolutionConfig } from "@/utils/dimension";

// Component to render cubes from grid data
function CubeGrid({
  gridData,
  yOffset = 0,
}: {
  gridData: number[][];
  yOffset?: number;
}) {
  const cubes = convertGridToCubes(gridData, {
    spacing: 1.0,
    centerGrid: true,
    yOffset,
  });

  return (
    <group>
      {cubes.map((cube: CubeData) => (
        <Box key={cube.key} position={cube.position} args={[1.0, 1.0, 1.0]}>
          <meshStandardMaterial
            color={cube.color}
            metalness={0.2}
            roughness={0.3}
          />
        </Box>
      ))}
    </group>
  );
}

// Component to render revolved shapes from grid data
function RevolvedGrid({
  gridData,
  yOffset = 0,
  config = {},
  profileMode = "outline",
}: {
  gridData: number[][];
  yOffset?: number;
  config?: RevolutionConfig;
  profileMode?: "outline" | "rightmost" | "average" | "max";
}) {
  // Revolve the entire grid pattern around Z-axis with color preservation
  const coloredRevolutions = revolveGridWithColors(gridData, {
    segments: 32,
    profileMode,
    profileRadiusScale: 2.0,
    profileHeightScale: 2.0,
    ...config,
  });

  return (
    <group position={[0, yOffset, 0]}>
      {coloredRevolutions.map((revolution, index) => (
        <mesh
          key={`color-${revolution.colorValue}-${index}`}
          geometry={revolution.geometry}
        >
          <meshStandardMaterial
            color={revolution.color}
            metalness={0.3}
            roughness={0.4}
            wireframe={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Custom grid input component
function CustomGridInput({
  onGridChange,
}: {
  onGridChange: (grid: number[][]) => void;
}) {
  const [inputText, setInputText] = useState("1,0,2\n0,3,0\n4,0,1");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    try {
      // Parse the input text into a 2D array
      const rows = inputText.trim().split("\n");
      const grid = rows.map((row) =>
        row.split(",").map((cell) => {
          const num = parseInt(cell.trim());
          if (!Number.isInteger(num) || num < 0 || num > 4) {
            throw new Error(
              `Invalid value: ${cell.trim()}. Only integers 0-4 are allowed (0=empty, 1=red, 2=green, 3=blue, 4=purple).`
            );
          }
          return num;
        })
      );

      // Validate the grid
      const validation = validateGrid(grid);
      if (!validation.isValid) {
        setError(validation.error || "Invalid grid");
        return;
      }

      setError("");
      onGridChange(grid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid input format");
    }
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
      <h4 className="text-white font-bold mb-2">Custom Grid</h4>
      <p className="text-gray-300 text-sm mb-2">
        Enter your grid (0=empty, 1=red, 2=green, 3=blue, 4=purple):
      </p>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="w-full h-20 bg-white/10 text-white p-2 rounded text-sm font-mono"
        placeholder="1,0,2&#10;0,3,0&#10;4,0,1"
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
      >
        Apply Grid
      </button>
    </div>
  );
}

// Main demo component
export default function GridDemo() {
  const [selectedPattern, setSelectedPattern] = useState<
    "cross" | "diamond" | "border" | "checker" | "random" | "custom"
  >("cross");
  const [customGrid, setCustomGrid] = useState<number[][]>([
    [1, 0, 2],
    [0, 3, 0],
    [4, 0, 1],
  ]);
  const [randomDensity, setRandomDensity] = useState(0.3);
  const [isRevolutionMode, setIsRevolutionMode] = useState(false);
  const [profileMode, setProfileMode] = useState<
    "outline" | "rightmost" | "average" | "max"
  >("outline");

  // Get the current grid based on selection
  const getCurrentGrid = () => {
    switch (selectedPattern) {
      case "random":
        return createRandomGrid(6, 6, randomDensity);
      case "custom":
        return customGrid;
      default:
        return createSamplePattern(selectedPattern);
    }
  };

  const currentGrid = getCurrentGrid();

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -10]} color="blue" intensity={0.3} />

        {/* Environment */}
        <Environment preset="city" />

        {/* Reference grid */}
        <Grid
          renderOrder={-1}
          position={[0, -1, 0]}
          infiniteGrid
          cellSize={1}
          cellThickness={0.5}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={"#444"}
          fadeDistance={50}
        />

        {/* Render the current grid pattern */}
        {isRevolutionMode ? (
          <RevolvedGrid
            gridData={currentGrid}
            yOffset={0}
            profileMode={profileMode}
          />
        ) : (
          <CubeGrid gridData={currentGrid} yOffset={0} />
        )}

        {/* Show multiple patterns side by side for comparison */}
        {selectedPattern === "cross" && (
          <>
            {isRevolutionMode ? (
              <>
                <RevolvedGrid
                  gridData={createSamplePattern("diamond")}
                  yOffset={8}
                  profileMode={profileMode}
                />
                <RevolvedGrid
                  gridData={createSamplePattern("border")}
                  yOffset={-8}
                  profileMode={profileMode}
                />
              </>
            ) : (
              <>
                <CubeGrid
                  gridData={createSamplePattern("diamond")}
                  yOffset={8}
                />
                <CubeGrid
                  gridData={createSamplePattern("border")}
                  yOffset={-8}
                />
              </>
            )}
          </>
        )}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>

      {/* Control Panel */}
      <div className="absolute top-4 right-4 text-white z-10 space-y-4 max-w-xs">
        {/* Rendering Mode Toggle */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">Rendering Mode</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRevolutionMode(false)}
              className={`px-3 py-2 rounded transition-colors ${
                !isRevolutionMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              Cubes
            </button>
            <button
              onClick={() => setIsRevolutionMode(true)}
              className={`px-3 py-2 rounded transition-colors ${
                isRevolutionMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              Revolved
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {isRevolutionMode
              ? "2D shapes revolved around Z-axis"
              : "Standard cube visualization"}
          </p>
        </div>

        {/* Profile Mode Controls (only show in revolution mode) */}
        {isRevolutionMode && (
          <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">Profile Mode</h3>
            <div className="space-y-2">
              {(
                [
                  {
                    key: "outline",
                    label: "Outline",
                    color: "#4a90e2",
                    desc: "Shape boundary",
                  },
                  {
                    key: "rightmost",
                    label: "Right Edge",
                    color: "#e24a4a",
                    desc: "Rightmost column",
                  },
                  {
                    key: "average",
                    label: "Average",
                    color: "#4ae24a",
                    desc: "Row averages",
                  },
                  {
                    key: "max",
                    label: "Maximum",
                    color: "#e2e24a",
                    desc: "Max per row",
                  },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setProfileMode(mode.key)}
                  className={`block w-full text-left px-3 py-2 rounded transition-colors ${
                    profileMode === mode.key
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: mode.color }}
                    />
                    <div>
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-gray-400">{mode.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pattern Selector */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">Pattern Type</h3>
          <div className="space-y-2">
            {(
              [
                "cross",
                "diamond",
                "border",
                "checker",
                "random",
                "custom",
              ] as const
            ).map((pattern) => (
              <button
                key={pattern}
                onClick={() => setSelectedPattern(pattern)}
                className={`block w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedPattern === pattern
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Random Grid Controls */}
        {selectedPattern === "random" && (
          <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <h4 className="text-white font-bold mb-2">Random Settings</h4>
            <label className="block text-gray-300 text-sm mb-1">
              Density: {(randomDensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={randomDensity}
              onChange={(e) => setRandomDensity(parseFloat(e.target.value))}
              className="w-full"
            />
            <button
              onClick={() => setSelectedPattern("random")} // Force re-render
              className="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm w-full"
            >
              Generate New
            </button>
          </div>
        )}

        {/* Custom Grid Input */}
        {selectedPattern === "custom" && (
          <CustomGridInput onGridChange={setCustomGrid} />
        )}

        {/* Grid Info */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4">
          <h4 className="text-white font-bold mb-2">Grid Info</h4>
          <div className="text-gray-300 text-sm space-y-1">
            <p>
              Size: {currentGrid[0]?.length || 0} × {currentGrid.length}
            </p>
            <p>
              Total cells: {currentGrid.length * (currentGrid[0]?.length || 0)}
            </p>
            <p>
              Active cubes:{" "}
              {
                currentGrid.flat().filter((cell) => cell >= 1 && cell <= 4)
                  .length
              }
            </p>
            <div className="mt-2">
              <p className="text-xs">Colors:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {[1, 2, 3, 4].map((value) => {
                  const count = currentGrid
                    .flat()
                    .filter((cell) => cell === value).length;
                  const colors = ["red", "green", "blue", "purple"];
                  return count > 0 ? (
                    <span
                      key={value}
                      className="text-xs bg-white/10 px-2 py-1 rounded"
                    >
                      <span style={{ color: colors[value - 1] }}>●</span>{" "}
                      {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 text-white z-10 bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-xs">
        <h2 className="text-xl font-bold mb-2">Grid to 3D Demo</h2>
        <ul className="text-sm space-y-1 mb-3">
          <li>• Mouse: Rotate, pan, zoom</li>
          <li>• Try different patterns</li>
          <li>• Create custom grids</li>
          <li>• Adjust random density</li>
        </ul>
        <div className="border-t border-white/20 pt-3">
          <h3 className="text-sm font-semibold mb-2">Value Colors</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span style={{ color: "red" }}>●</span> 1 = Red
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: "green" }}>●</span> 2 = Green
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: "blue" }}>●</span> 3 = Blue
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: "purple" }}>●</span> 4 = Purple
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
