/**
 * Examples demonstrating the pipe network system
 * Shows how grids are converted to connected pipe networks based on adjacency
 */

import { createSamplePattern } from "@/utils/convert";
import {
  convertGridToPipes,
  analyzeConnections,
  determinePipeType,
} from "@/utils/pipes";

// Example 1: Simple Pipe Network
export const simplePipeNetworkExample = () => {
  // Create a simple connected pattern
  const simpleNetwork = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ];

  const pipes = convertGridToPipes(simpleNetwork);

  console.log("Simple pipe network:");
  pipes.forEach((pipe) => {
    const connectionCount = Object.values(pipe.connections).filter(
      Boolean
    ).length;
    console.log(
      `- Position [${pipe.gridX}, ${pipe.gridY}]: ${pipe.pipeType} (${connectionCount} connections)`
    );
  });

  return pipes;
};

// Example 2: Complex Pipe Network
export const complexPipeNetworkExample = () => {
  // Create a more complex network with all pipe types
  const complexNetwork = [
    [1, 2, 1, 0, 3],
    [0, 2, 1, 1, 3],
    [4, 2, 1, 0, 0],
    [4, 2, 2, 2, 2],
    [0, 0, 0, 0, 2],
  ];

  const pipes = convertGridToPipes(complexNetwork);

  // Analyze pipe types
  const pipeTypeCount = pipes.reduce((acc, pipe) => {
    acc[pipe.pipeType] = (acc[pipe.pipeType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("Complex pipe network analysis:", pipeTypeCount);

  return pipes;
};

// Example 3: Border Pattern as Pipe Network
export const borderPipeExample = () => {
  const borderPattern = createSamplePattern("border");
  const pipes = convertGridToPipes(borderPattern);

  return pipes;
};

// Example 4: Testing All Adjacency Cases
export const adjacencyTestExample = () => {
  // Create a test pattern that demonstrates all pipe types
  const testPattern = [
    [0, 0, 1, 0, 0], // Isolated sphere (0 connections)
    [0, 1, 1, 1, 0], // T-pipe in middle (3 connections)
    [1, 1, 1, 1, 1], // Cross in middle, straights on ends
    [0, 1, 1, 1, 0], // T-pipe in middle (3 connections)
    [0, 0, 1, 0, 0], // End cap (1 connection)
  ];

  const pipes = convertGridToPipes(testPattern);

  // Detailed analysis
  console.log("Adjacency test results:");
  pipes.forEach((pipe) => {
    const pos = `[${pipe.gridX}, ${pipe.gridY}]`;
    const connections = Object.entries(pipe.connections)
      .filter(([_, connected]) => connected)
      .map(([direction, _]) => direction)
      .join(", ");

    console.log(
      `${pos}: ${pipe.pipeType} - Connected to: ${connections || "none"}`
    );
  });

  return pipes;
};

// Example 5: Multi-Color Pipe Network
export const multiColorPipeExample = () => {
  // Create a network where different colors form separate pipe systems
  const multiColorNetwork = [
    [1, 1, 0, 2, 2],
    [1, 0, 0, 0, 2],
    [1, 0, 3, 0, 2],
    [0, 0, 3, 3, 3],
    [4, 4, 0, 0, 0],
  ];

  const pipes = convertGridToPipes(multiColorNetwork);

  // Group by color
  const colorGroups = pipes.reduce((acc, pipe) => {
    const color = pipe.value;
    if (!acc[color]) acc[color] = [];
    acc[color].push(pipe);
    return acc;
  }, {} as Record<number, typeof pipes>);

  console.log("Multi-color pipe networks:");
  Object.entries(colorGroups).forEach(([color, colorPipes]) => {
    console.log(`Color ${color}: ${colorPipes.length} pipes`);
    colorPipes.forEach((pipe) => {
      console.log(`  - ${pipe.pipeType} at [${pipe.gridX}, ${pipe.gridY}]`);
    });
  });

  return pipes;
};

// Example 6: Pipe Connection Analysis
export const connectionAnalysisExample = () => {
  const testGrid = [
    [1, 1, 1],
    [1, 1, 0],
    [1, 0, 1],
  ];

  console.log("Connection analysis for each position:");

  for (let row = 0; row < testGrid.length; row++) {
    for (let col = 0; col < testGrid[0].length; col++) {
      if (testGrid[row][col] > 0) {
        const connections = analyzeConnections(testGrid, row, col);
        const { type, rotation } = determinePipeType(connections);

        console.log(`Position [${col}, ${row}]:`);
        console.log(`  Connections:`, connections);
        console.log(`  Pipe type: ${type}`);
        console.log(
          `  Rotation: [${rotation
            .map((r) => ((r * 180) / Math.PI).toFixed(0))
            .join(", ")}]°`
        );
      }
    }
  }
};

// Usage in React Three Fiber
export const reactPipeUsageExample = `
import { PipeNetwork } from '@/components/PipeNetwork';
import { createSamplePattern } from '@/utils/convert';

function PipeDemo() {
  const gridData = createSamplePattern('border');
  
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      
      <PipeNetwork gridData={gridData} yOffset={0} />
      
      <OrbitControls />
    </Canvas>
  );
}
`;

// Pipe Type Reference
export const pipeTypeReference = {
  sphere: {
    connections: 0,
    description: "Isolated pipe piece with no connections",
    example: "Single block surrounded by empty space",
  },
  straight: {
    connections: [1, 2],
    description: "Straight pipe segment",
    cases: {
      1: "End cap - connects to one neighbor",
      2: "Through pipe - connects two opposite neighbors",
    },
  },
  corner: {
    connections: 2,
    description: "L-shaped pipe connecting two adjacent directions",
    example: "Connects north-east, north-west, south-east, or south-west",
  },
  tee: {
    connections: 3,
    description: "T-shaped pipe with three connections",
    example: "Main line with one branch",
  },
  cross: {
    connections: 4,
    description: "Cross-shaped pipe connecting all four directions",
    example: "Junction connecting north, south, east, and west",
  },
};

// Performance and Design Notes
export const pipeDesignNotes = {
  adjacency: "Only checks horizontal and vertical neighbors (4-connectivity)",
  colors: "Each color value maintains its original color in the pipe network",
  orientation: "Pipes automatically orient based on connection directions",
  geometry:
    "Different geometries for each pipe type (sphere, cylinder, torus, etc.)",
  materials: "Metallic appearance with appropriate roughness for pipe look",
  tips: [
    "Use border patterns to create interesting pipe networks",
    "Mixed colors create separate interconnected systems",
    "Cross patterns create central junction points",
    "Random patterns create organic-looking pipe networks",
  ],
};
