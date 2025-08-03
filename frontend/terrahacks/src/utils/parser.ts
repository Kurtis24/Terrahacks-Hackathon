interface PathData {
  metadata: {
    timestamp: string;
    shape_name: string;
    grid_size: [number, number];
    algorithm_version: string;
  };
  line_coordinates: {
    snake_lines: {
      description: string;
      colors: string[];
      snake_types: string[];
      total_pixels: number;
      coordinates: [number, number][];
    };
    pink_lines: {
      color: string;
      snake_type: string;
      total_pixels: number;
      coordinates: [number, number][];
    };
    cyan_lines?: {
      color: string;
      snake_type: string;
      description: string;
      total_pixels: number;
      coordinates: [number, number][];
    };
  };
  summary: {
    grid_dimensions: string;
    total_green_pixels: number;
    total_red_pixels: number;
    total_snake_pixels: number;
    total_pink_pixels: number;
    total_cyan_pixels?: number;
    total_line_pixels: number;
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

    // Helper function to generate random number from 1 to 4 (for snake lines)
    const getRandomSnakeValue = (): number => Math.floor(Math.random() * 4) + 1;

    // Helper function to generate random number from 11 to 14 (for pink lines)
    const getRandomPinkValue = (): number => Math.floor(Math.random() * 4) + 11;

    // Helper function to generate random number from 11 to 14 (for cyan lines - now same as pink)
    const getRandomCyanValue = (): number => Math.floor(Math.random() * 4) + 11;

    // Get snake coordinates (combined green and red lines)
    const snakeCoords = pathData.line_coordinates.snake_lines.coordinates;

    // Get pink branch coordinates
    const pinkCoords = pathData.line_coordinates.pink_lines.coordinates;

    // Get cyan connector coordinates (if they exist)
    const cyanCoords = pathData.line_coordinates.cyan_lines?.coordinates || [];

    // Process snake coordinates with single digit values (1-4)
    for (const [x, y] of snakeCoords) {
      if (x >= 0 && x < 300 && y >= 0 && y < 300) {
        grid[y][x] = getRandomSnakeValue();
      }
    }

    // Process pink coordinates with double digit values (11-14)
    for (const [x, y] of pinkCoords) {
      if (x >= 0 && x < 300 && y >= 0 && y < 300) {
        grid[y][x] = getRandomPinkValue();
      }
    }

    // Process cyan coordinates with values (11-14) for collision branches
    for (const [x, y] of cyanCoords) {
      if (x >= 0 && x < 300 && y >= 0 && y < 300) {
        grid[y][x] = getRandomCyanValue();
      }
    }

    return grid;
  } catch (error) {
    console.error("Error parsing path data:", error);
    throw error;
  }
}
