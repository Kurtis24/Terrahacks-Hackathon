/**
 * Examples d  // Revolve it around Z-axis using outline mode
  const revolut  // Revolve with high detail
  const towerRevolution = revolveGrid(towerGrid, {
    profileMode: 'outline',
    segments: 64, // High detail
    profileRadiusScale: 2.0,
    profileHeightScale: 3.0,
  });volveGrid(crossGrid, {
    profileMode: 'outline',
    segments: 32,
    profileRadiusScale: 1.5,
    profileHeightScale: 2.0,
  });ting the revolution system integration with convert.ts
 * Shows how 2D grid patterns can be revolved around Z-axis to create 3D objects
 */

import { createSamplePattern, createRandomGrid } from "@/utils/convert";
import {
  revolveGrid,
  revolveGridMultiple,
  gridToProfile,
} from "@/utils/dimension";

// Example 1: Basic Revolution
export const basicRevolutionExample = () => {
  // Create a cross pattern
  const crossGrid = createSamplePattern("cross");

  // Revolve it around Z-axis using outline mode
  const revolution = revolveGrid(crossGrid, {
    profileMode: "outline",
    segments: 32,
    profileRadiusScale: 1.5,
    profileHeightScale: 2.0,
    smoothing: true,
  });

  console.log("Cross pattern revolved:", revolution.name);
  return revolution.geometry;
};

// Example 2: Different Profile Modes
export const profileModesExample = () => {
  // Create a diamond pattern
  const diamondGrid = createSamplePattern("diamond");

  // Generate multiple revolutions with different profile modes
  const revolutions = revolveGridMultiple(diamondGrid, [
    {
      profileMode: "outline",
      profileRadiusScale: 1.0,
      position: [0, 0, 0],
    },
    {
      profileMode: "rightmost",
      profileRadiusScale: 0.8,
      position: [6, 0, 0],
    },
    {
      profileMode: "average",
      profileRadiusScale: 0.6,
      position: [12, 0, 0],
    },
    {
      profileMode: "max",
      profileRadiusScale: 0.7,
      position: [18, 0, 0],
    },
  ]);

  return revolutions;
};

// Example 3: Custom Grid Revolution
export const customGridRevolutionExample = () => {
  // Create a custom grid pattern representing a tower
  const towerGrid = [
    [0, 0, 1, 0, 0],
    [0, 1, 2, 1, 0],
    [1, 2, 3, 2, 1],
    [1, 2, 4, 2, 1],
    [1, 2, 3, 2, 1],
    [0, 1, 2, 1, 0],
    [0, 0, 1, 0, 0],
  ];

  // Revolve with high detail
  const towerRevolution = revolveGrid(towerGrid, {
    profileMode: "outline",
    segments: 64, // High detail
    profileRadiusScale: 2.0,
    profileHeightScale: 3.0,
  });

  return towerRevolution;
};

// Example 4: Random Pattern Revolution
export const randomRevolutionExample = () => {
  // Generate a random pattern
  const randomGrid = createRandomGrid(8, 8, 0.4);

  // Create multiple revolutions with different configurations
  const configurations = [
    {
      profileMode: "outline" as const,
      segments: 16,
      profileRadiusScale: 1.2,
      profileHeightScale: 1.5,
      position: [0, 0, 0] as [number, number, number],
    },
    {
      profileMode: "average" as const,
      segments: 32,
      profileRadiusScale: 1.0,
      profileHeightScale: 2.0,
      position: [10, 0, 0] as [number, number, number],
    },
  ];

  return revolveGridMultiple(randomGrid, configurations);
};

// Example 5: Profile Generation Analysis
export const profileAnalysisExample = () => {
  // Create a border pattern
  const borderGrid = createSamplePattern("border");

  // Generate different profiles from the same grid
  const profiles = {
    outline: gridToProfile(borderGrid, {
      profileMode: "outline",
      heightScale: 2,
      radiusScale: 1,
    }),
    rightmost: gridToProfile(borderGrid, {
      profileMode: "rightmost",
      heightScale: 2,
      radiusScale: 1,
    }),
    average: gridToProfile(borderGrid, {
      profileMode: "average",
      heightScale: 2,
      radiusScale: 1,
    }),
    max: gridToProfile(borderGrid, {
      profileMode: "max",
      heightScale: 2,
      radiusScale: 1,
    }),
  };

  console.log("Profile analysis:");
  Object.entries(profiles).forEach(([mode, profile]) => {
    console.log(`${mode}:`, profile.points.length, "points");
    console.log("Points:", profile.points);
  });

  return profiles;
};

// Example 6: Vessel/Pottery Creation
export const potteryExample = () => {
  // Create a pattern that represents a vase profile
  const vaseGrid = [
    [0, 0, 0, 1, 0, 0, 0], // Top opening
    [0, 0, 1, 2, 1, 0, 0], // Neck
    [0, 0, 1, 2, 1, 0, 0], // Neck
    [0, 1, 2, 3, 2, 1, 0], // Shoulder
    [1, 2, 3, 4, 3, 2, 1], // Body widest
    [1, 2, 3, 4, 3, 2, 1], // Body
    [0, 1, 2, 3, 2, 1, 0], // Taper
    [0, 0, 1, 2, 1, 0, 0], // Base neck
    [0, 1, 2, 3, 2, 1, 0], // Base
  ];

  // Revolve to create a vase
  const vase = revolveGrid(vaseGrid, {
    profileMode: "outline",
    segments: 48, // Smooth circular shape
    profileRadiusScale: 1.5,
    profileHeightScale: 2.5,
    smoothing: true,
  });

  return vase;
};

// Usage examples for React components
export const componentUsageExamples = {
  // Basic usage in React Three Fiber
  basicUsage: `
    import { revolveGrid } from '@/utils/dimension';
    import { createSamplePattern } from '@/utils/convert';
    
    const gridData = createSamplePattern('cross');
    const revolution = revolveGrid(gridData, {
      profileMode: 'outline',
      segments: 32,
      profileRadiusScale: 1.5
    });
    
    return (
      <mesh geometry={revolution.geometry}>
        <meshStandardMaterial color="blue" />
      </mesh>
    );
  `,

  // Multiple objects
  multipleObjects: `
    const revolutions = revolveGridMultiple(gridData, [
      { profileMode: 'outline', position: [0, 0, 0] },
      { profileMode: 'average', position: [5, 0, 0] },
      { profileMode: 'max', position: [10, 0, 0] }
    ]);
    
    return (
      <group>
        {revolutions.map((rev, i) => (
          <mesh key={i} position={rev.position} geometry={rev.geometry}>
            <meshStandardMaterial color={colors[i]} />
          </mesh>
        ))}
      </group>
    );
  `,
};

// Performance notes
export const performanceNotes = {
  segments: "Use 16-32 segments for real-time, 64+ for high-quality renders",
  smoothing: "Enable smoothing for organic shapes, disable for geometric ones",
  profileMode: {
    outline: "Best for creating vessel-like shapes and organic forms",
    rightmost: "Good for architectural profiles and clean geometric shapes",
    average: "Creates softer, more averaged revolution shapes",
    max: "Emphasizes the maximum extent at each height level",
  },
};
