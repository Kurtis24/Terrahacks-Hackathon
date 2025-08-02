/**
 * Configuration for the 3D cube generation
 */
export interface CubeGridConfig {
  cubeSize?: number; // Size of each cube (default: 1)
  spacing?: number; // Spacing between cubes (default: 1.0)
  centerGrid?: boolean; // Whether to center the grid at origin (default: true)
  yOffset?: number; // Y-axis offset for the entire grid (default: 0)
}

/**
 * Represents a single cube position and properties
 */
export interface CubeData {
  position: [number, number, number]; // [x, y, z] position
  key: string; // Unique identifier
  gridX: number; // Original grid X coordinate
  gridY: number; // Original grid Y coordinate
  value: number; // The original grid value (0-4)
  color: string; // The color for this cube
}

/**
 * Gets the color for a cube based on its value
 * @param value - The grid value (0-4)
 * @returns CSS color string
 */
export function getCubeColor(value: number): string {
  switch (value) {
    case 1:
      return "red";
    case 2:
      return "green";
    case 3:
      return "blue";
    case 4:
      return "purple";
    default:
      return "gray"; // Should not be used since 0 means no cube
  }
}

/**
 * Converts a 2D array of 0-4 values to 3D cube positions
 * @param grid - 2D array where 0 represents empty space, 1-4 represent colored cubes
 * @param config - Configuration options for cube generation
 * @returns Array of cube data objects
 */
export function convertGridToCubes(
  grid: number[][],
  config: CubeGridConfig = {}
): CubeData[] {
  const { spacing = 1.0, centerGrid = true, yOffset = 0 } = config;

  if (!grid || grid.length === 0) {
    return [];
  }

  const cubes: CubeData[] = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // Calculate centering offsets if enabled
  const offsetX = centerGrid ? (-(cols - 1) * spacing) / 2 : 0;
  const offsetZ = centerGrid ? (-(rows - 1) * spacing) / 2 : 0;

  // Iterate through the grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = grid[row][col];
      // Only create cube data for positions with value 1-4 (0 means empty space)
      if (value >= 1 && value <= 4) {
        const x = col * spacing + offsetX;
        const y = yOffset;
        const z = row * spacing + offsetZ;

        cubes.push({
          position: [x, y, z],
          key: `cube-${row}-${col}`,
          gridX: col,
          gridY: row,
          value: value,
          color: getCubeColor(value),
        });
      }
    }
  }

  return cubes;
}

/**
 * Converts a flat array to a 2D grid
 * @param flatArray - Flat array of 1s and 0s
 * @param width - Width of the resulting grid
 * @returns 2D array
 */
export function flatArrayToGrid(
  flatArray: number[],
  width: number
): number[][] {
  if (flatArray.length === 0 || width <= 0) {
    return [];
  }

  const grid: number[][] = [];
  for (let i = 0; i < flatArray.length; i += width) {
    grid.push(flatArray.slice(i, i + width));
  }
  return grid;
}

/**
 * Creates a sample grid pattern for testing
 * @param pattern - Predefined pattern name or custom grid
 * @returns 2D array representing the pattern
 */
export function createSamplePattern(
  pattern: "cross" | "diamond" | "border" | "checker" | "corner" | number[][]
): number[][] {
  if (Array.isArray(pattern)) {
    return pattern;
  }

  switch (pattern) {
    case "cross":
      return [
        [0, 0, 1, 0, 0],
        [0, 0, 2, 0, 0],
        [3, 4, 1, 2, 3],
        [0, 0, 4, 0, 0],
        [0, 0, 3, 0, 0],
      ];

    case "diamond":
      return [
        [0, 0, 1, 0, 0],
        [0, 2, 0, 3, 0],
        [4, 0, 0, 0, 1],
        [0, 3, 0, 2, 0],
        [0, 0, 4, 0, 0],
      ];

    case "border":
      return [
        [1, 2, 3, 4, 1],
        [2, 0, 0, 0, 3],
        [3, 0, 0, 0, 4],
        [4, 0, 0, 0, 1],
        [1, 3, 4, 2, 3],
      ];

    case "checker":
      return [
        [1, 0, 2, 0, 3],
        [0, 4, 0, 1, 0],
        [2, 0, 3, 0, 4],
        [0, 1, 0, 2, 0],
        [3, 0, 4, 0, 1],
      ];

    case "corner":
      // Simple L-shape to test corner pipes
      return [
        [1, 1, 0],
        [1, 0, 0],
        [0, 0, 0],
      ];

    default:
      return [[1]];
  }
}

/**
 * Validates a 2D grid to ensure it contains only values 0-4
 * @param grid - Grid to validate
 * @returns Object with validation result and error message if any
 */
export function validateGrid(grid: number[][]): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(grid)) {
    return { isValid: false, error: "Grid must be an array" };
  }

  if (grid.length === 0) {
    return { isValid: false, error: "Grid cannot be empty" };
  }

  const expectedWidth = grid[0]?.length;

  for (let i = 0; i < grid.length; i++) {
    if (!Array.isArray(grid[i])) {
      return { isValid: false, error: `Row ${i} must be an array` };
    }

    if (grid[i].length !== expectedWidth) {
      return {
        isValid: false,
        error: `All rows must have the same length. Row ${i} has length ${grid[i].length}, expected ${expectedWidth}`,
      };
    }

    for (let j = 0; j < grid[i].length; j++) {
      const value = grid[i][j];
      if (!Number.isInteger(value) || value < 0 || value > 4) {
        return {
          isValid: false,
          error: `Invalid value ${value} at position [${i}][${j}]. Only integers 0-4 are allowed (0=empty, 1=red, 2=green, 3=blue, 4=purple)`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Utility function to get grid dimensions
 * @param grid - 2D grid array
 * @returns Object with width and height
 */
export function getGridDimensions(grid: number[][]): {
  width: number;
  height: number;
} {
  return {
    height: grid.length,
    width: grid[0]?.length || 0,
  };
}

/**
 * Creates a random grid of specified dimensions
 * @param width - Grid width
 * @param height - Grid height
 * @param density - Probability of a cell being non-zero (0-1, default: 0.3)
 * @param maxValue - Maximum value for non-zero cells (1-4, default: 4)
 * @returns Random 2D grid
 */
export function createRandomGrid(
  width: number,
  height: number,
  density: number = 0.3,
  maxValue: number = 4
): number[][] {
  const grid: number[][] = [];

  for (let row = 0; row < height; row++) {
    const currentRow: number[] = [];
    for (let col = 0; col < width; col++) {
      if (Math.random() < density) {
        // Generate random value between 1 and maxValue
        currentRow.push(Math.floor(Math.random() * maxValue) + 1);
      } else {
        currentRow.push(0);
      }
    }
    grid.push(currentRow);
  }

  return grid;
}
