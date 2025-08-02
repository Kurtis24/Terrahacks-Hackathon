import * as THREE from "three";

/**
 * Represents the direction of connections for a pipe
 */
export interface PipeConnections {
  north: boolean; // +Z direction
  south: boolean; // -Z direction
  east: boolean; // +X direction
  west: boolean; // -X direction
}

/**
 * Represents a pipe piece with its geometry and connections
 */
export interface PipeData {
  position: [number, number, number];
  key: string;
  gridX: number;
  gridY: number;
  value: number;
  color: string;
  connections: PipeConnections;
  pipeType: "sphere" | "straight" | "corner" | "tee" | "cross";
  geometry: THREE.BufferGeometry;
  rotation: [number, number, number]; // Euler angles for orientation
}

/**
 * Creates a sphere geometry for isolated pipes
 */
function createSphereGeometry(radius: number = 0.2): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, 16, 12);
}

/**
 * Creates a straight pipe geometry
 * Default orientation: along Z-axis (north-south)
 */
function createStraightPipeGeometry(
  outerRadius: number = 0.3,
  length: number = 1.0 // Exact grid spacing to connect without gaps or overlap
): THREE.BufferGeometry {
  // Create cylinder along Y-axis, then rotate to Z-axis for north-south default
  const geometry = new THREE.CylinderGeometry(
    outerRadius,
    outerRadius,
    length,
    12
  );

  // Rotate to align with Z-axis (north-south direction)
  geometry.rotateX(Math.PI / 2);

  return geometry;
}

/**
 * Creates a corner/L-pipe geometry
 * Default orientation: connects north (+Z) and east (+X)
 */
function createCornerPipeGeometry(
  outerRadius: number = 0.5
): THREE.BufferGeometry {
  // Create a sphere for corner junction, sized to match straight pipes
  const geometry = new THREE.SphereGeometry(outerRadius * 1.2, 12, 8);

  // The sphere is already centered at origin, which is perfect for grid positioning
  return geometry;
}

/**
 * Creates a T-pipe geometry
 * Default orientation: main pipe along Z-axis (north-south), branch to east (+X)
 */
function createTeePipeGeometry(
  outerRadius: number = 0.5
): THREE.BufferGeometry {
  // Create a simple T using a sphere as junction point
  // This is simpler and more reliable than merging complex geometries
  const geometry = new THREE.SphereGeometry(outerRadius * 1.3, 12, 8);

  // The sphere will serve as the T-junction
  // Individual pipe connections will visually connect to it
  return geometry;
}

/**
 * Creates a cross/+ pipe geometry
 */
function createCrossPipeGeometry(
  outerRadius: number = 0.5
): THREE.BufferGeometry {
  // Create junction sphere for 4-way connection
  const junction = new THREE.SphereGeometry(outerRadius * 1.4, 16, 12);

  return junction;
}

/**
 * Analyzes grid connections for a specific position
 * Grid coordinates: row 0 is at top, increasing row goes down
 * World coordinates: +Z is south (down on screen), +X is east (right on screen) - matching cube system
 */
export function analyzeConnections(
  grid: number[][],
  row: number,
  col: number
): PipeConnections {
  const height = grid.length;
  const width = grid[0]?.length || 0;

  const currentValue = grid[row]?.[col] || 0;
  if (currentValue === 0) {
    return { north: false, south: false, east: false, west: false };
  }

  // Check all four directions - matching cube coordinate system
  // In grid: row 0 is top, so decreasing row = north (-Z), increasing row = south (+Z)
  const north = row > 0 && grid[row - 1][col] > 0; // Previous row = north (-Z)
  const south = row < height - 1 && grid[row + 1][col] > 0; // Next row = south (+Z)
  const east = col < width - 1 && grid[row][col + 1] > 0; // Next col = east (+X)
  const west = col > 0 && grid[row][col - 1] > 0; // Previous col = west (-X)

  return { north, south, east, west };
}

/**
 * Determines pipe type based on connections
 */
export function determinePipeType(connections: PipeConnections): {
  type: "sphere" | "straight" | "corner" | "tee" | "cross";
  rotation: [number, number, number];
} {
  const { north, south, east, west } = connections;
  const connectionCount = [north, south, east, west].filter(Boolean).length;

  switch (connectionCount) {
    case 0:
      return { type: "sphere", rotation: [0, 0, 0] };

    case 1:
      // Single connection - end cap (straight pipe extending in connection direction)
      if (north) return { type: "straight", rotation: [0, 0, 0] }; // Default north-south
      if (south) return { type: "straight", rotation: [0, 0, 0] }; // Default north-south
      if (east) return { type: "straight", rotation: [0, Math.PI / 2, 0] }; // Rotate to east-west
      if (west) return { type: "straight", rotation: [0, Math.PI / 2, 0] }; // Rotate to east-west
      break;

    case 2:
      // Two connections - either straight or corner
      if (north && south) {
        // Straight north-south (default orientation)
        return { type: "straight", rotation: [0, 0, 0] };
      } else if (east && west) {
        // Straight east-west
        return { type: "straight", rotation: [0, Math.PI / 2, 0] };
      } else {
        // Corner pipe - determine orientation based on connections
        // Default corner connects north and east
        if (north && east) {
          return { type: "corner", rotation: [0, 0, 0] }; // Default: north-east
        } else if (north && west) {
          return { type: "corner", rotation: [0, -Math.PI / 2, 0] }; // north-west
        } else if (south && east) {
          return { type: "corner", rotation: [0, Math.PI / 2, 0] }; // south-east
        } else if (south && west) {
          return { type: "corner", rotation: [0, Math.PI, 0] }; // south-west
        }
      }
      break;

    case 3:
      // T-pipe - determine orientation based on the three connections
      // Default T has main pipe north-south with branch to east
      if (north && south && east) {
        return { type: "tee", rotation: [0, 0, 0] }; // Default: N-S main, E branch
      } else if (north && south && west) {
        return { type: "tee", rotation: [0, Math.PI, 0] }; // N-S main, W branch
      } else if (east && west && north) {
        return { type: "tee", rotation: [0, -Math.PI / 2, 0] }; // E-W main, N branch
      } else if (east && west && south) {
        return { type: "tee", rotation: [0, Math.PI / 2, 0] }; // E-W main, S branch
      }
      break;

    case 4:
      // Cross pipe - no rotation needed
      return { type: "cross", rotation: [0, 0, 0] };
  }

  // Fallback
  return { type: "sphere", rotation: [0, 0, 0] };
}

/**
 * Creates the appropriate geometry for a pipe type
 */
export function createPipeGeometry(
  type: "sphere" | "straight" | "corner" | "tee" | "cross"
): THREE.BufferGeometry {
  switch (type) {
    case "sphere":
      return createSphereGeometry();
    case "straight":
      return createStraightPipeGeometry();
    case "corner":
      return createCornerPipeGeometry();
    case "tee":
      return createTeePipeGeometry();
    case "cross":
      return createCrossPipeGeometry();
    default:
      return createSphereGeometry();
  }
}

/**
 * Converts a 2D grid to pipe network data
 */
export function convertGridToPipes(
  grid: number[][],
  config: {
    spacing?: number;
    centerGrid?: boolean;
    yOffset?: number;
  } = {}
): PipeData[] {
  const { spacing = 1.0, centerGrid = true, yOffset = 0 } = config;

  if (!grid || grid.length === 0) {
    return [];
  }

  const pipes: PipeData[] = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // Calculate centering offsets (match cube positioning from convert.ts)
  const offsetX = centerGrid ? (-(cols - 1) * spacing) / 2 : 0;
  const offsetZ = centerGrid ? (-(rows - 1) * spacing) / 2 : 0;

  // Analyze each cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = grid[row][col];

      if (value >= 1 && value <= 4) {
        const connections = analyzeConnections(grid, row, col);
        const { type, rotation } = determinePipeType(connections);
        const geometry = createPipeGeometry(type);

        const x = col * spacing + offsetX;
        const y = yOffset;
        const z = row * spacing + offsetZ; // Match cube positioning exactly

        pipes.push({
          position: [x, y, z],
          key: `pipe-${row}-${col}`,
          gridX: col,
          gridY: row,
          value: value,
          color: getCubeColor(value), // Reuse color function from convert.ts
          connections,
          pipeType: type,
          geometry,
          rotation,
        });
      }
    }
  }

  return pipes;
}

/**
 * Gets the color for a pipe based on its value (imported from convert.ts)
 */
function getCubeColor(value: number): string {
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
      return "gray";
  }
}
