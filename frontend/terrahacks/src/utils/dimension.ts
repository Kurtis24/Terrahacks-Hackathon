import * as THREE from "three";

/**
 * Configuration for 3D revolution
 */
export interface RevolutionConfig {
  segments?: number; // Number of segments around the Z-axis (default: 32)
  angleStart?: number; // Starting angle in radians (default: 0)
  angleLength?: number; // Sweep angle in radians (default: 2π)
  radiusMultiplier?: number; // Multiplier for radius calculation (default: 1)
  heightScale?: number; // Scale factor for depth along Z-axis (default: 1)
}

/**
 * Represents a 2D point that can be revolved around Z-axis
 */
export interface Point2D {
  x: number; // Distance from Z-axis (radius)
  y: number; // Height along Y-axis
}

/**
 * Represents a 2D shape profile for revolution
 */
export interface Shape2D {
  name: string;
  points: Point2D[];
  closed?: boolean; // Whether the shape is closed (default: false)
}

/**
 * Result of revolving a 2D shape into 3D
 */
export interface Revolution3D {
  name: string;
  geometry: THREE.BufferGeometry;
  originalShape: Shape2D;
  config: RevolutionConfig;
}

/**
 * Creates a 3D geometry by revolving a 2D shape around the Z-axis
 * @param shape - 2D shape to revolve
 * @param config - Revolution configuration
 * @returns THREE.BufferGeometry for the revolved shape
 */
export function revolveShape(
  shape: Shape2D,
  config: RevolutionConfig = {}
): Revolution3D {
  const {
    segments = 32,
    angleStart = 0,
    angleLength = Math.PI * 2,
    radiusMultiplier = 1,
    heightScale = 1,
  } = config;

  const points = shape.points.map(
    (p) => new THREE.Vector2(p.x * radiusMultiplier, p.y * heightScale)
  );

  // Create the lathe geometry around Z-axis by rotating in XY plane
  const geometry = new THREE.LatheGeometry(
    points,
    segments,
    angleStart,
    angleLength
  );

  // Rotate the geometry so it revolves around Z-axis instead of Y-axis
  geometry.rotateX(Math.PI / 2);

  return {
    name: `${shape.name}_revolved`,
    geometry,
    originalShape: shape,
    config,
  };
}

/**
 * Predefined 2D shapes for common 3D objects
 */
export const predefinedShapes: Record<string, Shape2D> = {
  circle: {
    name: "circle",
    points: [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    closed: true,
  },

  triangle: {
    name: "triangle",
    points: [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 0, y: 1 },
    ],
    closed: false,
  },

  square: {
    name: "square",
    points: [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    closed: false,
  },

  diamond: {
    name: "diamond",
    points: [
      { x: 0, y: -1 },
      { x: 0.5, y: 0 },
      { x: 0, y: 1 },
    ],
    closed: false,
  },

  vase: {
    name: "vase",
    points: [
      { x: 0, y: -2 },
      { x: 0.3, y: -2 },
      { x: 0.2, y: -1 },
      { x: 0.4, y: 0 },
      { x: 0.6, y: 1 },
      { x: 0.8, y: 2 },
      { x: 0, y: 2 },
    ],
    closed: false,
  },

  bottle: {
    name: "bottle",
    points: [
      { x: 0, y: -2 },
      { x: 0.5, y: -2 },
      { x: 0.5, y: -0.5 },
      { x: 0.3, y: -0.5 },
      { x: 0.3, y: 0.5 },
      { x: 0.2, y: 0.5 },
      { x: 0.2, y: 1.5 },
      { x: 0, y: 1.5 },
    ],
    closed: false,
  },
};

/**
 * Converts a 2D grid into a shape profile for revolution
 * Takes the rightmost column as the profile to revolve around Z-axis
 * @param grid - 2D array representing the pattern
 * @param options - Configuration for profile generation
 * @returns Shape2D profile for revolution
 */
export function gridToProfile(
  grid: number[][],
  options: {
    profileMode?: "rightmost" | "average" | "max" | "outline";
    heightScale?: number;
    radiusScale?: number;
    colorFilter?: number; // Only consider cells with this value (0 = consider all non-zero)
  } = {}
): Shape2D {
  const {
    profileMode = "rightmost",
    heightScale = 1,
    radiusScale = 1,
    colorFilter = 0,
  } = options;

  const height = grid.length;
  const width = grid[0]?.length || 0;

  let profileData: number[] = [];

  // Filter grid by color if specified
  const filteredGrid =
    colorFilter > 0
      ? grid.map((row) => row.map((cell) => (cell === colorFilter ? cell : 0)))
      : grid;

  switch (profileMode) {
    case "rightmost":
      // Take the rightmost column as the revolution profile
      profileData = filteredGrid.map((row) => row[row.length - 1] || 0);
      break;

    case "average":
      // Average each row to create profile
      profileData = filteredGrid.map((row) => {
        const sum = row.reduce((acc, val) => acc + val, 0);
        return sum / row.length;
      });
      break;

    case "max":
      // Take maximum value from each row
      profileData = filteredGrid.map((row) => Math.max(...row));
      break;

    case "outline":
      // Create outline by finding rightmost non-zero position
      profileData = filteredGrid.map((row) => {
        for (let i = row.length - 1; i >= 0; i--) {
          if (row[i] !== 0) return (i + 1) / width; // Normalize to 0-1
        }
        return 0;
      });
      break;
  }

  // Convert to 2D points for revolution
  const points: Point2D[] = [];

  // Always start and end at x=0 (the axis of revolution - Z-axis)
  points.push({ x: 0, y: -heightScale });

  for (let i = 0; i < profileData.length; i++) {
    const normalizedHeight = (i / (height - 1)) * 2 - 1; // Map to -1 to 1
    const radius = (profileData[i] > 0 ? profileData[i] : 0) * radiusScale;

    if (radius > 0) {
      points.push({
        x: radius,
        y: normalizedHeight * heightScale,
      });
    }
  }

  // Close back to axis
  points.push({ x: 0, y: heightScale });

  // Note: Smoothing disabled to preserve angular shapes from grid patterns

  return {
    name: `grid_profile_${profileMode}${
      colorFilter > 0 ? `_color${colorFilter}` : ""
    }`,
    points,
    closed: false,
  };
}

/**
 * Revolves an entire grid pattern around the Z-axis
 * @param grid - 2D array representing the pattern
 * @param config - Revolution and profile configuration
 * @returns Revolution3D object with geometry
 */
export function revolveGrid(
  grid: number[][],
  config: RevolutionConfig & {
    profileMode?: "rightmost" | "average" | "max" | "outline";
    profileHeightScale?: number;
    profileRadiusScale?: number;
  } = {}
): Revolution3D {
  const {
    profileMode = "outline",
    profileHeightScale = 2,
    profileRadiusScale = 1,
    ...revolutionConfig
  } = config;

  // Convert grid to 2D profile
  const profile = gridToProfile(grid, {
    profileMode,
    heightScale: profileHeightScale,
    radiusScale: profileRadiusScale,
  });

  // Revolve the profile
  return revolveShape(profile, revolutionConfig);
}

/**
 * Revolves a grid pattern with color preservation - creates separate shapes for each color
 * @param grid - 2D array representing the pattern
 * @param config - Revolution and profile configuration
 * @returns Array of Revolution3D objects with color information
 */
export function revolveGridWithColors(
  grid: number[][],
  config: RevolutionConfig & {
    profileMode?: "rightmost" | "average" | "max" | "outline";
    profileHeightScale?: number;
    profileRadiusScale?: number;
  } = {}
): Array<Revolution3D & { color: string; colorValue: number }> {
  const {
    profileMode = "outline",
    profileHeightScale = 2,
    profileRadiusScale = 1,
    ...revolutionConfig
  } = config;

  // Color mapping from convert.ts
  const colorMap: Record<number, string> = {
    1: "#ff0000", // Red
    2: "#00ff00", // Green
    3: "#0000ff", // Blue
    4: "#ff00ff", // Purple/Magenta
  };

  // Find all unique colors in the grid
  const uniqueColors = [
    ...new Set(grid.flat().filter((value) => value >= 1 && value <= 4)),
  ];

  return uniqueColors.map((colorValue) => {
    // Create profile for this specific color
    const profile = gridToProfile(grid, {
      profileMode,
      heightScale: profileHeightScale,
      radiusScale: profileRadiusScale,
      colorFilter: colorValue,
    });

    // Revolve the color-specific profile
    const revolution = revolveShape(profile, revolutionConfig);

    return {
      ...revolution,
      color: colorMap[colorValue],
      colorValue,
    };
  });
}

/**
 * Creates multiple revolved objects from a grid with different profile modes
 * @param grid - 2D array representing the pattern
 * @param configs - Array of configurations for different revolution modes
 * @returns Array of Revolution3D objects
 */
export function revolveGridMultiple(
  grid: number[][],
  configs: Array<
    RevolutionConfig & {
      profileMode?: "rightmost" | "average" | "max" | "outline";
      profileHeightScale?: number;
      profileRadiusScale?: number;
      position?: [number, number, number];
    }
  > = []
): Array<Revolution3D & { position?: [number, number, number] }> {
  if (configs.length === 0) {
    // Default configurations
    configs = [
      { profileMode: "outline", profileRadiusScale: 1, position: [0, 0, 0] },
      {
        profileMode: "rightmost",
        profileRadiusScale: 0.8,
        position: [8, 0, 0],
      },
      { profileMode: "average", profileRadiusScale: 0.6, position: [16, 0, 0] },
    ];
  }

  return configs.map((config) => {
    const revolution = revolveGrid(grid, config);
    return {
      ...revolution,
      position: config.position,
    };
  });
}

/**
 * Creates a custom 2D shape from points
 * @param name - Name for the shape
 * @param points - Array of 2D points
 * @param closed - Whether the shape is closed
 * @returns Shape2D object
 */
export function createCustomShape(
  name: string,
  points: Point2D[],
  closed: boolean = false
): Shape2D {
  return {
    name,
    points,
    closed,
  };
}

/**
 * Generates points for common mathematical curves
 */
export const curveGenerators = {
  /**
   * Generate points for a sine wave
   */
  sineWave: (
    amplitude: number = 1,
    frequency: number = 2,
    samples: number = 20
  ): Point2D[] => {
    const points: Point2D[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * Math.PI * 2;
      points.push({
        x: amplitude * Math.sin(frequency * t),
        y: (i / samples) * 2 - 1, // Map to -1 to 1
      });
    }
    return points;
  },

  /**
   * Generate points for a bezier curve
   */
  bezierCurve: (
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    samples: number = 20
  ): Point2D[] => {
    const points: Point2D[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;

      points.push({
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
      });
    }
    return points;
  },

  /**
   * Generate points for a parabola
   */
  parabola: (
    width: number = 1,
    height: number = 2,
    samples: number = 20
  ): Point2D[] => {
    const points: Point2D[] = [];
    for (let i = 0; i <= samples; i++) {
      const y = (i / samples) * height - height / 2;
      const x = width * Math.sqrt(Math.abs(y / height)) * 0.5;
      points.push({ x, y });
    }
    return points;
  },
};

/**
 * Utility to create complex shapes by combining multiple curves
 * @param curves - Array of curve segments
 * @returns Combined shape
 */
export function combineShapes(name: string, ...curves: Point2D[][]): Shape2D {
  const allPoints = curves.flat();
  return {
    name,
    points: allPoints,
    closed: false,
  };
}

/**
 * Scale a shape uniformly
 * @param shape - Shape to scale
 * @param scale - Scale factor
 * @returns Scaled shape
 */
export function scaleShape(shape: Shape2D, scale: number): Shape2D {
  return {
    ...shape,
    name: `${shape.name}_scaled_${scale}`,
    points: shape.points.map((p) => ({ x: p.x * scale, y: p.y * scale })),
  };
}

/**
 * Translate a shape along X and Y axes
 * @param shape - Shape to translate
 * @param offsetX - X offset
 * @param offsetY - Y offset
 * @returns Translated shape
 */
export function translateShape(
  shape: Shape2D,
  offsetX: number,
  offsetY: number
): Shape2D {
  return {
    ...shape,
    name: `${shape.name}_translated`,
    points: shape.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })),
  };
}
