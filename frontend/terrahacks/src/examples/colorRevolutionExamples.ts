/**
 * Examples demonstrating the color-preserving revolution system
 * Shows how 2D grid patterns revolve around Z-axis while maintaining individual colors
 */

import { createSamplePattern, createRandomGrid } from "@/utils/convert";
import { revolveGridWithColors, RevolutionConfig } from "@/utils/dimension";

// Example 1: Multi-color Cross Pattern
export const coloredCrossExample = () => {
  // Create a cross pattern with multiple colors
  const coloredCross = [
    [0, 0, 1, 0, 0],
    [0, 2, 1, 2, 0],
    [3, 2, 4, 2, 3],
    [0, 2, 1, 2, 0],
    [0, 0, 1, 0, 0],
  ];

  // Revolve with color preservation
  const coloredRevolutions = revolveGridWithColors(coloredCross, {
    profileMode: "outline",
    segments: 32,
    profileRadiusScale: 1.5,
    profileHeightScale: 2.0,
  });

  console.log(`Created ${coloredRevolutions.length} colored revolutions:`);
  coloredRevolutions.forEach((rev) => {
    console.log(`- Color ${rev.colorValue} (${rev.color}): ${rev.name}`);
  });

  return coloredRevolutions;
};

// Example 2: Rainbow Diamond Pattern
export const rainbowDiamondExample = () => {
  // Create a diamond with all colors
  const rainbowDiamond = [
    [0, 0, 1, 0, 0],
    [0, 2, 1, 2, 0],
    [3, 2, 4, 2, 3],
    [0, 2, 1, 2, 0],
    [0, 0, 1, 0, 0],
  ];

  // Test different profile modes
  const profileModes: Array<"outline" | "rightmost" | "average" | "max"> = [
    "outline",
    "rightmost",
    "average",
    "max",
  ];

  return profileModes.map((mode) => ({
    mode,
    revolutions: revolveGridWithColors(rainbowDiamond, {
      profileMode: mode,
      segments: 24,
      profileRadiusScale: 1.2,
      profileHeightScale: 1.8,
    }),
  }));
};

// Example 3: Complex Multi-Color Pattern
export const complexColorPatternExample = () => {
  // Create a complex pattern using all colors
  const complexPattern = [
    [1, 0, 2, 0, 1],
    [0, 3, 0, 3, 0],
    [2, 0, 4, 0, 2],
    [0, 3, 0, 3, 0],
    [1, 0, 2, 0, 1],
    [4, 4, 4, 4, 4],
    [3, 2, 1, 2, 3],
  ];

  return revolveGridWithColors(complexPattern, {
    profileMode: "outline",
    segments: 48,
    profileRadiusScale: 2.0,
    profileHeightScale: 3.0,
  });
};

// Example 4: Single Color Focus
export const singleColorFocusExample = () => {
  // Create patterns that highlight one color at a time
  const basePattern = createSamplePattern("border");

  // Test how each color appears when isolated
  const colorTests = [1, 2, 3, 4].map((color) => {
    // Create a version with only this color
    const singleColorGrid = basePattern.map((row) =>
      row.map((cell) => (cell > 0 ? color : 0))
    );

    return {
      color,
      revolutions: revolveGridWithColors(singleColorGrid, {
        profileMode: "outline",
        segments: 32,
        profileRadiusScale: 1.5,
        profileHeightScale: 2.0,
      }),
    };
  });

  return colorTests;
};

// Example 5: Random Multi-Color Grid
export const randomMultiColorExample = () => {
  // Generate a random grid with multiple colors
  const randomGrid = createRandomGrid(6, 6, 0.5);

  return revolveGridWithColors(randomGrid, {
    profileMode: "average",
    segments: 16, // Lower detail for performance
    profileRadiusScale: 1.0,
    profileHeightScale: 1.5,
  });
};

// Usage in React Three Fiber
export const reactUsageExample = `
import { revolveGridWithColors } from '@/utils/dimension';
import { createSamplePattern } from '@/utils/convert';

function ColoredRevolvedGrid({ gridData }) {
  const coloredRevolutions = revolveGridWithColors(gridData, {
    profileMode: 'outline',
    segments: 32,
    profileRadiusScale: 2.0,
    profileHeightScale: 2.0
  });

  return (
    <group>
      {coloredRevolutions.map((revolution, index) => (
        <mesh 
          key={\`color-\${revolution.colorValue}-\${index}\`} 
          geometry={revolution.geometry}
        >
          <meshStandardMaterial
            color={revolution.color}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// Usage
const gridData = createSamplePattern('cross');
<ColoredRevolvedGrid gridData={gridData} />
`;

// Performance and design notes
export const designNotes = {
  colorPreservation:
    "Each unique color (1-4) creates a separate revolved geometry",
  performance:
    "More colors = more geometries. Consider using lower segment counts for complex grids",
  profileModes: {
    outline: "Best for maintaining shape boundaries with colors",
    rightmost: "Good for layered color effects",
    average: "Creates blended/averaged color regions",
    max: "Emphasizes dominant colors at each height",
  },
  colorMapping: {
    1: "Red (#ff0000)",
    2: "Green (#00ff00)",
    3: "Blue (#0000ff)",
    4: "Purple/Magenta (#ff00ff)",
  },
  tips: [
    "Use outline mode for most cases to preserve grid shape",
    "Lower segment counts (16-24) for real-time applications",
    "Higher segment counts (48-64) for final renders",
    "Each color creates independent geometry - can be positioned separately if needed",
  ],
};
