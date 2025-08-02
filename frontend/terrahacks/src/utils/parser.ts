interface PathData {
  metadata: {
    timestamp: string;
    shape_name: string;
    grid_size: [number, number];
    algorithm_version: string;
  };
  line_coordinates: {
    green_lines: {
      color: string;
      snake_type: string;
      total_pixels: number;
      coordinates: [number, number][];
    };
    red_lines: {
      color: string;
      snake_type: string;
      total_pixels: number;
      coordinates: [number, number][];
    };
  };
}

export async function ParsePath(): Promise<number[][]> {
  try {
    // Read the path.json file from the backend
    const response = await fetch("/path.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const pathData: PathData = await response.json();

    // Initialize 300x300 array with zeros
    const grid: number[][] = Array(300)
      .fill(null)
      .map(() => Array(300).fill(0));

    // Helper function to generate random number from 1 to 4
    const getRandomValue = (): number => Math.floor(Math.random() * 4) + 1;

    // Combine left and right snake coordinates into a single array
    const leftSnakeCoords = pathData.line_coordinates.green_lines.coordinates;
    const rightSnakeCoords = pathData.line_coordinates.red_lines.coordinates;
    const allCoordinates = [...leftSnakeCoords, ...rightSnakeCoords];

    // Process all coordinates (both left and right snakes combined)
    for (const [x, y] of allCoordinates) {
      if (x >= 0 && x < 300 && y >= 0 && y < 300) {
        grid[y][x] = getRandomValue();
      }
    }

    return grid;
  } catch (error) {
    console.error("Error parsing path data:", error);
    throw error;
  }
}
