"""
Snake Pattern Generator for 2D Shapes with 90-Degree Turns

This algorithm processes a black and white 2D image of a shape and generates
a continuous, zigzag pattern that fills the shape. The algorithm:

1. Starts at the topmost point of the shape
2. Splits into two 'snakes' (paths): one moving left, one moving right
3. Each snake moves toward the shape boundaries (stays within shape boundaries)
4. Upon reaching shape edge: turns 90° right, moves down 20 pixels, turns 90° right again
5. Continues until hitting edge or other snake, then: turns 90° left, down 20 pixels, 90° left
6. Process ends when snakes encounter a horizontal line with no shape pixels (all black)

Key features:
- Lines stay within shape boundaries for clean, contained patterns
- Ensures majority of shape is filled with structured zigzag pattern
- Automatically terminates when no more shape area remains to fill

Usage:
- For custom image: mask = load_shape_image("your_image.png")
- The script includes multiple test shapes (triangle, hexagon, square, circle)
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
from scipy.spatial.distance import cdist
from collections import deque
import json
from datetime import datetime
from scipy.ndimage import label, find_objects
from scipy import ndimage

# === Parameters ===
step_size = 5                 # Step size for snake movement (smaller for more precise turns)
down_pixels = 8                # Pixels to move down during turns
crossover_spacing = 10          # Distance between crossovers
gap_fill_threshold = 400        # Minimum area (pixels) for gap-filling (20x20 = 400)
min_gap_dimension = 15          # Minimum width/height for a gap to be considered

def find_scaffold_gaps(scaffold_array, shape_mask=None, min_area=400, min_dimension=15):
    """
    Find contiguous regions of 0s (gaps) in the scaffold array that are large enough to fill.
    
    Args:
        scaffold_array: 2D numpy array where 1s represent scaffold paths
        shape_mask: Original shape mask to ensure we only consider gaps within the shape
        min_area: Minimum area in pixels for a gap to be considered
        min_dimension: Minimum width or height for a gap to be considered
        
    Returns:
        List of gap regions with their properties
    """
    # Create inverse mask (1 where there are gaps, 0 where there are scaffolds)
    gap_mask = (scaffold_array == 0).astype(np.uint8)
    
    # If we have a shape mask, only consider gaps within the original shape
    if shape_mask is not None:
        # Resize shape_mask to match scaffold_array if needed
        if shape_mask.shape != scaffold_array.shape:
            shape_mask_resized = cv2.resize(shape_mask, 
                                          (scaffold_array.shape[1], scaffold_array.shape[0]), 
                                          interpolation=cv2.INTER_NEAREST)
            # Convert to binary (255 -> 1)
            shape_mask_resized = (shape_mask_resized > 127).astype(np.uint8)
        else:
            shape_mask_resized = (shape_mask > 127).astype(np.uint8)
        
        # Only consider gaps that are within the original shape
        gap_mask = gap_mask & shape_mask_resized
    
    # Find connected components (contiguous gap regions)
    labeled_gaps, num_gaps = label(gap_mask)
    gap_regions = []
    
    if num_gaps == 0:
        return gap_regions
    
    # Analyze each gap region
    for gap_id in range(1, num_gaps + 1):
        gap_pixels = np.where(labeled_gaps == gap_id)
        
        # Calculate region properties
        y_coords = gap_pixels[0]
        x_coords = gap_pixels[1]
        
        if len(y_coords) == 0:
            continue
            
        # Bounding box
        min_y, max_y = np.min(y_coords), np.max(y_coords)
        min_x, max_x = np.min(x_coords), np.max(x_coords)
        
        # Dimensions
        width = max_x - min_x + 1
        height = max_y - min_y + 1
        area = len(y_coords)
        
        # Check if gap meets our criteria
        if (area >= min_area and 
            width >= min_dimension and 
            height >= min_dimension):
            
            # Find topmost point of this gap (for snake starting point)
            topmost_y = min_y
            topmost_x_coords = x_coords[y_coords == topmost_y]
            topmost_x = int(np.mean(topmost_x_coords))
            
            gap_info = {
                'id': gap_id,
                'area': area,
                'width': width,
                'height': height,
                'bbox': (min_x, min_y, max_x, max_y),
                'topmost_point': (topmost_x, topmost_y),
                'mask': (labeled_gaps == gap_id)
            }
            
            gap_regions.append(gap_info)
    
    # Sort by area (largest first)
    gap_regions.sort(key=lambda x: x['area'], reverse=True)
    
    return gap_regions

def generate_snake_pattern_for_gap(gap_info, scaffold_array, shape_mask=None):
    """
    Generate snake pattern specifically for a gap region.
    
    Args:
        gap_info: Dictionary containing gap information
        scaffold_array: Current scaffold array to avoid overwriting
        shape_mask: Original shape mask for boundary checking
        
    Returns:
        List of new snake paths generated for this gap
    """
    # Create a temporary mask for this gap only
    gap_mask = gap_info['mask'].astype(np.uint8) * 255
    
    # If we have a shape mask, intersect with it
    if shape_mask is not None:
        if shape_mask.shape != gap_mask.shape:
            shape_mask_resized = cv2.resize(shape_mask, 
                                          (gap_mask.shape[1], gap_mask.shape[0]), 
                                          interpolation=cv2.INTER_NEAREST)
        else:
            shape_mask_resized = shape_mask
        gap_mask = cv2.bitwise_and(gap_mask, shape_mask_resized)
    
    # Use the topmost point as starting point
    start_x, start_y = gap_info['topmost_point']
    
    # Create modified snakes that respect existing scaffold
    left_snake = GapFillingSnake(start_x, start_y, -1, "gap_left", scaffold_array)
    right_snake = GapFillingSnake(start_x, start_y, 1, "gap_right", scaffold_array)
    
    occupied_points = set()
    occupied_points.add((start_x, start_y))
    
    # Mark starting point in scaffold array
    if (0 <= start_y < scaffold_array.shape[0] and 
        0 <= start_x < scaffold_array.shape[1]):
        scaffold_array[start_y, start_x] = 1
    
    # Run snakes with limited iterations for gap filling
    max_iterations = 5000  # Smaller limit for gap filling
    iteration = 0
    
    while iteration < max_iterations:
        left_active = left_snake.move_step(gap_mask, occupied_points, right_snake)
        right_active = right_snake.move_step(gap_mask, occupied_points, left_snake)
        
        if not left_active and not right_active:
            break
            
        iteration += 1
    
    return [left_snake.path, right_snake.path]

def recursive_gap_filling(scaffold_array, shape_mask=None, max_iterations=10):
    """
    Recursively fill gaps in the scaffold array until no significant gaps remain.
    
    Args:
        scaffold_array: 2D numpy array to fill gaps in
        shape_mask: Original shape mask for boundary checking
        max_iterations: Maximum number of recursive iterations
        
    Returns:
        List of all gap-filling snake paths generated
    """
    all_gap_paths = []
    iteration = 0
    
    print(f"🔄 Starting recursive gap filling...")
    
    while iteration < max_iterations:
        # Find current gaps
        gaps = find_scaffold_gaps(
            scaffold_array, 
            shape_mask, 
            min_area=gap_fill_threshold,
            min_dimension=min_gap_dimension
        )
        
        if not gaps:
            print(f"✅ No more significant gaps found after {iteration} iterations")
            break
            
        print(f"🔍 Iteration {iteration + 1}: Found {len(gaps)} gaps to fill")
        
        gaps_filled_this_iteration = 0
        
        # Process each gap
        for i, gap in enumerate(gaps):
            print(f"   📍 Filling gap {i+1}/{len(gaps)} - Area: {gap['area']} pixels ({gap['width']}x{gap['height']})")
            
            # Generate snake paths for this gap
            gap_paths = generate_snake_pattern_for_gap(gap, scaffold_array, shape_mask)
            
            # Add to our collection
            all_gap_paths.extend(gap_paths)
            gaps_filled_this_iteration += 1
            
            # Add crossovers for gap paths
            for path in gap_paths:
                if len(path) > 1:  # Only add crossovers if path has points
                    crossovers = add_crossovers_to_path(path)
                    for crossover_x, crossover_y in crossovers:
                        for dy in range(-1, 2):
                            for dx in range(-1, 2):
                                new_x, new_y = crossover_x + dx, crossover_y + dy
                                if (0 <= new_x < scaffold_array.shape[1] and 
                                    0 <= new_y < scaffold_array.shape[0]):
                                    scaffold_array[new_y, new_x] = 1
        
        print(f"   ✅ Filled {gaps_filled_this_iteration} gaps in iteration {iteration + 1}")
        iteration += 1
    
    if iteration >= max_iterations:
        print(f"⚠️  Reached maximum iterations ({max_iterations}) for gap filling")
    
    total_gap_paths = len(all_gap_paths)
    total_gap_points = sum(len(path) for path in all_gap_paths)
    
    print(f"🎯 Gap filling complete:")
    print(f"   📊 Total gap-filling iterations: {iteration}")
    print(f"   🐍 Total gap snake paths: {total_gap_paths}")
    print(f"   📍 Total gap points generated: {total_gap_points}")
    
    return all_gap_paths

def save_snake_paths_to_json(snake_paths, scaffold_array, shape_name, output_path="snake_paths.json", gap_filling_enabled=True):
    """
    Save snake paths and scaffold data to JSON format with gap-filling information
    
    Args:
        snake_paths: List of all snake paths (initial + gap-filling)
        scaffold_array: 2D numpy array of the scaffold
        shape_name: Name of the shape processed
        output_path: Path to save the JSON file
        gap_filling_enabled: Whether gap filling was used
    """
    # Convert numpy array data types to Python native types for JSON serialization
    def convert_numpy_types(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj
    
    # Separate initial paths from gap-filling paths
    # Assume first 2 paths are initial (left and right snakes)
    initial_paths = snake_paths[:2] if len(snake_paths) >= 2 else snake_paths
    gap_filling_paths = snake_paths[2:] if len(snake_paths) > 2 else []
    
    # Prepare the data structure
    json_data = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "shape_name": shape_name,
            "algorithm_version": "algo_v2_with_gap_filling",
            "gap_filling_enabled": gap_filling_enabled,
            "parameters": {
                "step_size": step_size,
                "down_pixels": down_pixels,
                "crossover_spacing": crossover_spacing,
                "gap_fill_threshold": gap_fill_threshold,
                "min_gap_dimension": min_gap_dimension
            },
            "scaffold_info": {
                "array_shape": list(scaffold_array.shape),
                "total_pixels": int(np.sum(scaffold_array)),
                "density_percent": float(np.sum(scaffold_array) / (scaffold_array.shape[0] * scaffold_array.shape[1]) * 100)
            }
        },
        "initial_snake_paths": {
            "left_snake": {
                "path_length": len(initial_paths[0]) if len(initial_paths) > 0 else 0,
                "coordinates": [[convert_numpy_types(x), convert_numpy_types(y)] for x, y in initial_paths[0]] if len(initial_paths) > 0 else []
            },
            "right_snake": {
                "path_length": len(initial_paths[1]) if len(initial_paths) > 1 else 0,
                "coordinates": [[convert_numpy_types(x), convert_numpy_types(y)] for x, y in initial_paths[1]] if len(initial_paths) > 1 else []
            }
        },
        "gap_filling_paths": [
            {
                "path_id": i,
                "path_length": len(path),
                "coordinates": [[convert_numpy_types(x), convert_numpy_types(y)] for x, y in path]
            }
            for i, path in enumerate(gap_filling_paths)
        ],
        "scaffold_array": {
            "shape": list(scaffold_array.shape),
            "data": scaffold_array.tolist()  # Full 2D array as nested lists
        },
        "summary": {
            "total_snakes": len(snake_paths),
            "initial_snake_count": len(initial_paths),
            "gap_filling_snake_count": len(gap_filling_paths),
            "total_coordinates": sum(len(path) for path in snake_paths),
            "initial_coordinates": sum(len(path) for path in initial_paths),
            "gap_filling_coordinates": sum(len(path) for path in gap_filling_paths),
            "coverage_improvement": {
                "initial_density_percent": float(sum(len(path) for path in initial_paths) / (scaffold_array.shape[0] * scaffold_array.shape[1]) * 100) if initial_paths else 0.0,
                "final_density_percent": float(np.sum(scaffold_array) / (scaffold_array.shape[0] * scaffold_array.shape[1]) * 100),
                "improvement_factor": float(len(gap_filling_paths) / len(initial_paths)) if initial_paths else 0.0
            }
        }
    }
    
    # Save to JSON file with pretty printing
    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2, separators=(',', ': '))
    
    print(f"Snake paths saved to JSON: {output_path}")
    print(f"Total coordinates saved: {json_data['summary']['total_coordinates']}")
    if gap_filling_paths:
        print(f"Gap-filling improvement: +{len(gap_filling_paths)} paths, +{sum(len(path) for path in gap_filling_paths)} points")
    
    return json_data

def load_snake_paths_from_json(json_path):
    """
    Load snake paths from JSON file
    
    Args:
        json_path: Path to the JSON file
        
    Returns:
        tuple: (snake_paths, scaffold_array, metadata)
    """
    with open(json_path, 'r') as f:
        json_data = json.load(f)
    
    # Reconstruct snake paths
    left_path = [(x, y) for x, y in json_data['snake_paths']['left_snake']['coordinates']]
    right_path = [(x, y) for x, y in json_data['snake_paths']['right_snake']['coordinates']]
    snake_paths = [left_path, right_path]
    
    # Reconstruct scaffold array
    scaffold_array = np.array(json_data['scaffold_array']['data'], dtype=np.uint8)
    
    return snake_paths, scaffold_array, json_data['metadata']

def draw_line_in_array(array, x0, y0, x1, y1, value=1):
    """Draw a line in a 2D array using Bresenham's line algorithm"""
    # Ensure coordinates are integers and within bounds
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    
    # Check bounds
    if (x0 < 0 or x0 >= array.shape[1] or y0 < 0 or y0 >= array.shape[0] or
        x1 < 0 or x1 >= array.shape[1] or y1 < 0 or y1 >= array.shape[0]):
        return
    
    # Bresenham's line algorithm
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    
    x, y = x0, y0
    
    while True:
        if 0 <= x < array.shape[1] and 0 <= y < array.shape[0]:
            array[y, x] = value
        
        if x == x1 and y == y1:
            break
            
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy

def generate_scaffold_array(snake_paths, array_shape=(300, 300), include_crossovers=True):
    """
    Generate a 2D NumPy array representation of the scaffold pattern.
    
    Args:
        snake_paths: List of snake paths from generate_snake_pattern()
        array_shape: Shape of the output array (height, width)
        include_crossovers: Whether to include crossover points
    
    Returns:
        scaffold_array: 2D NumPy array where 1s represent the scaffold path
    """
    # Initialize the scaffold array
    scaffold_array = np.zeros(array_shape, dtype=np.uint8)
    
    # Process each snake path
    for path in snake_paths:
        # Draw lines between consecutive points in the path
        for i in range(len(path) - 1):
            x0, y0 = path[i]
            x1, y1 = path[i + 1]
            draw_line_in_array(scaffold_array, x0, y0, x1, y1, value=1)
        
        # Add crossovers if requested
        if include_crossovers:
            crossovers = add_crossovers_to_path(path)
            for crossover_x, crossover_y in crossovers:
                # Mark crossover as a small circle (3x3 area)
                for dy in range(-1, 2):
                    for dx in range(-1, 2):
                        new_x, new_y = crossover_x + dx, crossover_y + dy
                        if (0 <= new_x < array_shape[1] and 0 <= new_y < array_shape[0]):
                            scaffold_array[new_y, new_x] = 1
    
    return scaffold_array

def load_shape_image(image_path):
    """Load and preprocess the black and white shape image"""
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not load image from {image_path}")
    
    # Ensure binary image (0 or 255)
    _, binary_img = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
    return binary_img

def find_topmost_point(mask):
    """Find the topmost point of the shape"""
    y_coords, x_coords = np.where(mask == 255)
    if len(y_coords) == 0:
        return None
    
    top_y = np.min(y_coords)
    # Find the center x-coordinate at the topmost y level
    top_x_coords = x_coords[y_coords == top_y]
    center_x = int(np.mean(top_x_coords))
    
    return (center_x, top_y)

def get_shape_boundaries(mask, y):
    """Get the left and right boundaries of the shape at a given y-coordinate"""
    x_inside = np.where(mask[y] == 255)[0]
    if len(x_inside) == 0:
        return None, None
    return x_inside[0], x_inside[-1]

def is_point_in_shape(mask, x, y):
    """Check if a point is inside the shape"""
    if 0 <= y < mask.shape[0] and 0 <= x < mask.shape[1]:
        return mask[y, x] == 255
    return False

def find_nearest_edge(mask, x, y, direction):
    """Find the nearest edge in the given direction (left=-1, right=1)"""
    if direction == -1:  # Moving left
        for new_x in range(x, -1, -1):
            if not is_point_in_shape(mask, new_x, y):
                return new_x + 1  # Return last valid x
        return 0
    else:  # Moving right
        for new_x in range(x, mask.shape[1]):
            if not is_point_in_shape(mask, new_x, y):
                return new_x - 1  # Return last valid x
        return mask.shape[1] - 1

def get_shape_center_x(mask, y):
    """Get the center x-coordinate of the shape at given y"""
    x_inside = np.where(mask[y] == 255)[0]
    if len(x_inside) == 0:
        return None
    return int(np.mean(x_inside))

class Snake:
    def __init__(self, start_x, start_y, initial_direction, snake_id, scaffold_array=None):
        self.path = [(start_x, start_y)]
        self.current_x = start_x
        self.current_y = start_y
        self.dx = initial_direction  # Direction vector: -1 for left, 1 for right
        self.dy = 0  # Initially moving horizontally
        self.snake_id = snake_id
        self.state = "to_edge"  # States: "to_edge", "turn_right_down", "turn_left_down"
        self.down_counter = 0  # Counter for 3-pixel downward movement
        self.turn_type = "right"  # "right" or "left" - which way to turn at edge
        self.scaffold_array = scaffold_array  # Reference to the 2D scaffold array
        self.prev_x = start_x  # Track previous position for line drawing
        self.prev_y = start_y
        
        # Mark starting position in scaffold array
        if self.scaffold_array is not None:
            if (0 <= start_y < self.scaffold_array.shape[0] and 
                0 <= start_x < self.scaffold_array.shape[1]):
                self.scaffold_array[start_y, start_x] = 1
    
    def update_scaffold_array(self, x, y):
        """Update the scaffold array by drawing a line from previous position to current position"""
        if self.scaffold_array is not None:
            # Draw line from previous position to current position
            draw_line_in_array(self.scaffold_array, self.prev_x, self.prev_y, x, y, value=1)
            # Update previous position
            self.prev_x = x
            self.prev_y = y
        
    def turn_90_right(self):
        """Turn 90 degrees to the right"""
        # (1,0) -> (0,1) -> (-1,0) -> (0,-1) -> (1,0)
        old_dx, old_dy = self.dx, self.dy
        self.dx = -old_dy
        self.dy = old_dx
        
    def turn_90_left(self):
        """Turn 90 degrees to the left"""
        # (1,0) -> (0,-1) -> (-1,0) -> (0,1) -> (1,0)
        old_dx, old_dy = self.dx, self.dy
        self.dx = old_dy
        self.dy = -old_dx
        
    def is_at_edge_or_collision(self, mask, other_snake):
        """Check if snake is at edge of shape or collided with other snake"""
        # Check shape boundary
        if not is_point_in_shape(mask, self.current_x + self.dx, self.current_y + self.dy):
            return True
            
        # Check collision with other snake
        if other_snake and (self.current_x, self.current_y) in other_snake.get_recent_points(10):
            return True
            
        return False
        
    def check_line_has_shape(self, mask, y):
        """Check if a horizontal line at y-coordinate has any shape pixels"""
        if y >= mask.shape[0] or y < 0:
            return False
        return np.any(mask[y] == 255)
    
    def move_step(self, mask, occupied_points, other_snake=None):
        """Move the snake one step according to its current state"""
        # Check if we've reached the bottom of the shape or no more shape to fill
        if self.current_y >= mask.shape[0] - 5:
            return False
            
        # Check if current line has any shape pixels - if not, end the process
        if not self.check_line_has_shape(mask, self.current_y):
            return False
            
        moved = False
        
        if self.state == "to_edge":
            # Move in current direction - stay within shape boundaries
            new_x = self.current_x + self.dx * step_size
            new_y = self.current_y + self.dy * step_size
            
            # Check if next position is within shape and image bounds
            if (0 <= new_x < mask.shape[1] and 0 <= new_y < mask.shape[0] and 
                is_point_in_shape(mask, new_x, new_y)):
                # Check for collision with other snake
                collision = other_snake and (new_x, new_y) in other_snake.get_recent_points(8)
                
                if not collision:
                    self.current_x = new_x
                    self.current_y = new_y
                    self.path.append((self.current_x, self.current_y))
                    occupied_points.add((self.current_x, self.current_y))
                    # UPDATE: Draw line in scaffold array in real-time
                    self.update_scaffold_array(self.current_x, self.current_y)
                    moved = True
                else:
                    # Collision detected, start turning sequence
                    if self.turn_type == "right":
                        self.turn_90_left()  # If we were turning right, now turn left
                        self.turn_type = "left"
                    else:
                        self.turn_90_right()  # If we were turning left, now turn right
                        self.turn_type = "right"
                    
                    self.state = f"turn_{self.turn_type}_down"
                    self.down_counter = 0
            else:
                # Hit shape boundary, start turning sequence
                if self.turn_type == "right":
                    self.turn_90_right()
                    self.state = "turn_right_down"
                else:
                    self.turn_90_left()
                    self.state = "turn_left_down"
                self.down_counter = 0
                
        elif self.state == "turn_right_down":
            # Move down specified pixels after first right turn
            if self.down_counter < down_pixels:
                new_y = self.current_y + 1
                if new_y < mask.shape[0] and is_point_in_shape(mask, self.current_x, new_y):
                    # Check if the new line has any shape to fill
                    if self.check_line_has_shape(mask, new_y):
                        self.current_y = new_y
                        self.path.append((self.current_x, self.current_y))
                        occupied_points.add((self.current_x, self.current_y))
                        # UPDATE: Draw line in scaffold array in real-time
                        self.update_scaffold_array(self.current_x, self.current_y)
                        self.down_counter += 1
                        moved = True
                    else:
                        # No more shape to fill, end process
                        return False
                else:
                    self.down_counter = down_pixels  # Skip if can't move down or outside shape
                    
            if self.down_counter >= down_pixels:
                # After moving down specified pixels, turn right again and continue
                self.turn_90_right()
                self.state = "to_edge"
                self.turn_type = "left"  # Next time hit edge, turn left
                
        elif self.state == "turn_left_down":
            # Move down specified pixels after first left turn
            if self.down_counter < down_pixels:
                new_y = self.current_y + 1
                if new_y < mask.shape[0] and is_point_in_shape(mask, self.current_x, new_y):
                    # Check if the new line has any shape to fill
                    if self.check_line_has_shape(mask, new_y):
                        self.current_y = new_y
                        self.path.append((self.current_x, self.current_y))
                        occupied_points.add((self.current_x, self.current_y))
                        # UPDATE: Draw line in scaffold array in real-time
                        self.update_scaffold_array(self.current_x, self.current_y)
                        self.down_counter += 1
                        moved = True
                    else:
                        # No more shape to fill, end process
                        return False
                else:
                    self.down_counter = down_pixels  # Skip if can't move down or outside shape
                    
            if self.down_counter >= down_pixels:
                # After moving down specified pixels, turn left again and continue
                self.turn_90_left()
                self.state = "to_edge"
                self.turn_type = "right"  # Next time hit edge, turn right
        
        return moved or self.current_y < mask.shape[0] - 5
    
    def get_recent_points(self, num_points=10):
        """Get the last few points of the path for collision detection"""
        return set(self.path[-num_points:])

class GapFillingSnake(Snake):
    """
    Modified Snake class for gap filling that respects existing scaffold paths.
    """
    def __init__(self, start_x, start_y, initial_direction, snake_id, scaffold_array):
        super().__init__(start_x, start_y, initial_direction, snake_id, scaffold_array)
    
    def move_step(self, gap_mask, occupied_points, other_snake=None):
        """
        Modified move step that respects existing scaffold paths.
        """
        # Check if we've reached the boundary of the gap area
        if self.current_y >= gap_mask.shape[0] - 2:
            return False
            
        # Check if current line has any gap pixels to fill
        if not self.check_line_has_shape(gap_mask, self.current_y):
            return False
            
        moved = False
        
        if self.state == "to_edge":
            # Move in current direction within gap boundaries
            new_x = self.current_x + self.dx * step_size
            new_y = self.current_y + self.dy * step_size
            
            # Check if next position is within gap area and not already filled
            if (0 <= new_x < gap_mask.shape[1] and 0 <= new_y < gap_mask.shape[0] and 
                is_point_in_shape(gap_mask, new_x, new_y) and
                self.scaffold_array[new_y, new_x] == 0):  # Not already filled
                
                # Check for collision with other snake
                collision = other_snake and (new_x, new_y) in other_snake.get_recent_points(8)
                
                if not collision:
                    self.current_x = new_x
                    self.current_y = new_y
                    self.path.append((self.current_x, self.current_y))
                    occupied_points.add((self.current_x, self.current_y))
                    # Update scaffold array
                    self.update_scaffold_array(self.current_x, self.current_y)
                    moved = True
                else:
                    # Collision detected, start turning sequence
                    if self.turn_type == "right":
                        self.turn_90_left()
                        self.turn_type = "left"
                    else:
                        self.turn_90_right()
                        self.turn_type = "right"
                    
                    self.state = f"turn_{self.turn_type}_down"
                    self.down_counter = 0
            else:
                # Hit boundary, start turning sequence
                if self.turn_type == "right":
                    self.turn_90_right()
                    self.state = "turn_right_down"
                else:
                    self.turn_90_left()
                    self.state = "turn_left_down"
                self.down_counter = 0
                
        elif self.state == "turn_right_down":
            if self.down_counter < down_pixels:
                new_y = self.current_y + 1
                if (new_y < gap_mask.shape[0] and 
                    is_point_in_shape(gap_mask, self.current_x, new_y) and
                    self.scaffold_array[new_y, self.current_x] == 0):  # Not already filled
                    
                    if self.check_line_has_shape(gap_mask, new_y):
                        self.current_y = new_y
                        self.path.append((self.current_x, self.current_y))
                        occupied_points.add((self.current_x, self.current_y))
                        self.update_scaffold_array(self.current_x, self.current_y)
                        self.down_counter += 1
                        moved = True
                    else:
                        return False
                else:
                    self.down_counter = down_pixels
                    
            if self.down_counter >= down_pixels:
                self.turn_90_right()
                self.state = "to_edge"
                self.turn_type = "left"
                
        elif self.state == "turn_left_down":
            if self.down_counter < down_pixels:
                new_y = self.current_y + 1
                if (new_y < gap_mask.shape[0] and 
                    is_point_in_shape(gap_mask, self.current_x, new_y) and
                    self.scaffold_array[new_y, self.current_x] == 0):  # Not already filled
                    
                    if self.check_line_has_shape(gap_mask, new_y):
                        self.current_y = new_y
                        self.path.append((self.current_x, self.current_y))
                        occupied_points.add((self.current_x, self.current_y))
                        self.update_scaffold_array(self.current_x, self.current_y)
                        self.down_counter += 1
                        moved = True
                    else:
                        return False
                else:
                    self.down_counter = down_pixels
                    
            if self.down_counter >= down_pixels:
                self.turn_90_left()
                self.state = "to_edge"
                self.turn_type = "right"
        
        return moved or self.current_y < gap_mask.shape[0] - 2

def generate_snake_pattern(mask, array_shape=(300, 300), return_array=True, enable_gap_filling=True):
    """Generate the snake pattern for the given shape mask and optionally return scaffold array"""
    # Find starting point
    start_point = find_topmost_point(mask)
    if start_point is None:
        if return_array:
            return [], np.zeros(array_shape, dtype=np.uint8)
        else:
            return []
    
    start_x, start_y = start_point
    
    # Initialize the scaffold array only if requested
    scaffold_array = np.zeros(array_shape, dtype=np.uint8) if return_array else None
    
    # Create two snakes with initial horizontal directions, passing the scaffold array
    left_snake = Snake(start_x, start_y, -1, "left", scaffold_array if return_array else None)
    right_snake = Snake(start_x, start_y, 1, "right", scaffold_array if return_array else None)
    
    occupied_points = set()
    occupied_points.add((start_x, start_y))
    
    print("🐍 Generating initial snake patterns...")
    
    # Run the snakes until they're done
    max_iterations = 15000  # Increased for more complex patterns
    iteration = 0
    
    while iteration < max_iterations:
        left_active = left_snake.move_step(mask, occupied_points, right_snake)
        right_active = right_snake.move_step(mask, occupied_points, left_snake)
        
        if not left_active and not right_active:
            break
            
        iteration += 1
    
    initial_snake_paths = [left_snake.path, right_snake.path]
    
    # Report initial results
    initial_points = sum(len(path) for path in initial_snake_paths)
    print(f"✅ Initial snakes complete: {len(initial_snake_paths)} paths, {initial_points} points")
    
    if return_array:
        # Add crossovers to the scaffold array for initial paths
        for path in initial_snake_paths:
            crossovers = add_crossovers_to_path(path)
            for crossover_x, crossover_y in crossovers:
                # Mark crossover as a small circle (3x3 area)
                for dy in range(-1, 2):
                    for dx in range(-1, 2):
                        new_x, new_y = crossover_x + dx, crossover_y + dy
                        if (0 <= new_x < array_shape[1] and 0 <= new_y < array_shape[0]):
                            scaffold_array[new_y, new_x] = 1
        
        # Perform recursive gap filling if enabled
        gap_filling_paths = []
        if enable_gap_filling:
            gap_filling_paths = recursive_gap_filling(scaffold_array, mask, max_iterations=10)
            gap_points = sum(len(path) for path in gap_filling_paths)
            if gap_points > 0:
                print(f"🎯 Gap filling added: {len(gap_filling_paths)} paths, {gap_points} points")
        
        # Combine all paths
        all_snake_paths = initial_snake_paths + gap_filling_paths
        
        # Final statistics
        total_points = sum(len(path) for path in all_snake_paths)
        final_density = np.sum(scaffold_array) / (scaffold_array.shape[0] * scaffold_array.shape[1]) * 100
        
        print(f"🎉 Pattern generation complete:")
        print(f"   📊 Total paths: {len(all_snake_paths)} ({len(initial_snake_paths)} initial + {len(gap_filling_paths)} gap-filling)")
        print(f"   📍 Total points: {total_points} ({initial_points} initial + {total_points - initial_points} gap-filling)")
        print(f"   🎯 Final scaffold density: {final_density:.2f}%")
        
        return all_snake_paths, scaffold_array
    else:
        return initial_snake_paths

# For backwards compatibility, create a function that only returns paths
def generate_snake_pattern_legacy(mask):
    """Legacy function that only returns snake paths (backwards compatible)"""
    return generate_snake_pattern(mask, return_array=False)

def add_crossovers_to_path(path):
    """Add crossover points along a path"""
    crossovers = []
    for i in range(len(path) - 1):
        pt1 = np.array(path[i])
        pt2 = np.array(path[i + 1])
        
        # Calculate distance and add crossovers
        dist = np.linalg.norm(pt2 - pt1)
        if dist > crossover_spacing:
            num_crossovers = int(dist // crossover_spacing)
            for j in range(1, num_crossovers + 1):
                t = j / (num_crossovers + 1)
                crossover_point = pt1 + t * (pt2 - pt1)
                crossovers.append((int(crossover_point[0]), int(crossover_point[1])))
    
    return crossovers

def visualize_scaffold_array(scaffold_array, title="Scaffold Pattern Array", save_path=None):
    """
    Visualize the scaffold array using matplotlib.
    
    Args:
        scaffold_array: 2D NumPy array where 1s represent the scaffold path
        title: Title for the plot
        save_path: Optional path to save the plot
    
    Returns:
        The matplotlib figure object
    """
    plt.figure(figsize=(10, 10))
    
    # Create a colored version: 0 = black, 1 = white
    colored_array = scaffold_array.astype(float)
    
    plt.imshow(colored_array, cmap='binary', origin='upper')
    plt.title(title)
    plt.axis('off')
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Scaffold array visualization saved to: {save_path}")
        
    # Comment out plt.show() to avoid hanging
    # plt.show()
    plt.close()  # Close the figure to free memory
    
    return plt.gcf()

def visualize_snake_pattern(mask, snake_paths, output_path="output.png"):
    """Visualize the snake pattern on the shape"""
    # Create colored output image
    result_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    
    colors = [(0, 255, 0), (255, 0, 0)]  # Green for left snake, Red for right snake
    
    # Draw snake paths
    for i, path in enumerate(snake_paths):
        color = colors[i % len(colors)]
        
        # Draw path with safety checks
        for j in range(len(path) - 1):
            pt1 = path[j]
            pt2 = path[j + 1]
            
            # Ensure points are tuples of 2 integers
            if (isinstance(pt1, (tuple, list)) and len(pt1) == 2 and
                isinstance(pt2, (tuple, list)) and len(pt2) == 2):
                try:
                    pt1 = (int(pt1[0]), int(pt1[1]))
                    pt2 = (int(pt2[0]), int(pt2[1]))
                    cv2.line(result_img, pt1, pt2, color, 2)
                except Exception as e:
                    print(f"Warning: Error drawing line from {pt1} to {pt2}: {e}")
                    continue
            else:
                print(f"Warning: Invalid point format in path {i}, skipping line {j}")
                break
        
        # Add crossovers
        try:
            crossovers = add_crossovers_to_path(path)
            for crossover in crossovers:
                if isinstance(crossover, (tuple, list)) and len(crossover) == 2:
                    crossover = (int(crossover[0]), int(crossover[1]))
                    cv2.circle(result_img, crossover, 3, (255, 0, 255), -1)  # Magenta crossovers
        except Exception as e:
            print(f"Warning: Error adding crossovers for path {i}: {e}")
    
    # Save and display
    cv2.imwrite(output_path, result_img)
    print(f"OpenCV visualization saved to: {output_path}")
    
    plt.figure(figsize=(10, 10))
    plt.imshow(cv2.cvtColor(result_img, cv2.COLOR_BGR2RGB))
    plt.title("90-Degree Turn Snake Pattern - Continuous Zigzag Fill")
    plt.axis('off')
    
    # Save matplotlib version too
    matplotlib_path = output_path.replace('.png', '_matplotlib.png')
    plt.savefig(matplotlib_path, dpi=300, bbox_inches='tight')
    print(f"Matplotlib visualization saved to: {matplotlib_path}")
    
    # Comment out plt.show() to avoid hanging
    # plt.show()
    plt.close()  # Close the figure to free memory
    
    return result_img

def visualize_snake_pattern_enhanced(mask, snake_paths, output_path="output_enhanced.png"):
    """Visualize the snake pattern with different colors for initial vs gap-filling paths"""
    # Create colored output image
    result_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    
    # Colors: Green/Red for initial snakes, Blue/Orange for gap-filling
    initial_colors = [(0, 255, 0), (255, 0, 0)]  # Green, Red
    gap_colors = [(255, 165, 0), (0, 100, 255), (255, 0, 255), (0, 255, 255)]  # Orange, Blue, Magenta, Cyan
    
    # Draw snake paths
    for i, path in enumerate(snake_paths):
        # Determine color based on path index (first 2 are initial)
        if i < 2:
            color = initial_colors[i % len(initial_colors)]
            line_thickness = 2
        else:
            color = gap_colors[(i - 2) % len(gap_colors)]
            line_thickness = 1  # Thinner lines for gap-filling paths
        
        # Draw path with safety checks
        for j in range(len(path) - 1):
            pt1 = path[j]
            pt2 = path[j + 1]
            
            # Ensure points are tuples of 2 integers
            if (isinstance(pt1, (tuple, list)) and len(pt1) == 2 and
                isinstance(pt2, (tuple, list)) and len(pt2) == 2):
                try:
                    pt1 = (int(pt1[0]), int(pt1[1]))
                    pt2 = (int(pt2[0]), int(pt2[1]))
                    cv2.line(result_img, pt1, pt2, color, line_thickness)
                except Exception as e:
                    print(f"Warning: Error drawing line from {pt1} to {pt2}: {e}")
                    continue
        
        # Add crossovers with path-specific colors
        try:
            crossovers = add_crossovers_to_path(path)
            for crossover in crossovers:
                if isinstance(crossover, (tuple, list)) and len(crossover) == 2:
                    crossover = (int(crossover[0]), int(crossover[1]))
                    cv2.circle(result_img, crossover, 2, color, -1)  # Same color as path
        except Exception as e:
            print(f"Warning: Error adding crossovers for path {i}: {e}")
    
    # Add legend
    legend_y = 30
    cv2.putText(result_img, "Initial Paths:", (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.line(result_img, (150, legend_y - 5), (200, legend_y - 5), initial_colors[0], 3)
    cv2.line(result_img, (210, legend_y - 5), (260, legend_y - 5), initial_colors[1], 3)
    
    if len(snake_paths) > 2:
        legend_y += 25
        cv2.putText(result_img, "Gap-Fill Paths:", (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        for i, gap_color in enumerate(gap_colors[:min(4, len(snake_paths) - 2)]):
            x_start = 150 + i * 30
            cv2.line(result_img, (x_start, legend_y - 5), (x_start + 20, legend_y - 5), gap_color, 2)
    
    # Save the enhanced visualization
    cv2.imwrite(output_path, result_img)
    print(f"Enhanced visualization saved to: {output_path}")
    
    return result_img

def create_test_shapes():
    """Create various test shapes"""
    height, width = 400, 400
    shapes = {}
    
    # Triangle
    triangle_mask = np.zeros((height, width), dtype=np.uint8)
    triangle_points = np.array([[width//2, 50], [50, height-50], [width-50, height-50]], np.int32)
    cv2.fillPoly(triangle_mask, [triangle_points], 255)
    shapes['triangle'] = triangle_mask
    
    # Hexagon
    hex_mask = np.zeros((height, width), dtype=np.uint8)
    hex_points = []
    center_x, center_y = width//2, height//2
    radius = 120
    for i in range(6):
        angle = i * np.pi / 3  # 60 degrees per vertex
        x = int(center_x + radius * np.cos(angle))
        y = int(center_y + radius * np.sin(angle))
        hex_points.append([x, y])
    hex_points = np.array(hex_points, np.int32)
    cv2.fillPoly(hex_mask, [hex_points], 255)
    shapes['hexagon'] = hex_mask
    
    # Square
    square_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.rectangle(square_mask, (80, 80), (320, 320), 255, -1)
    shapes['square'] = square_mask
    
    # Circle
    circle_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.circle(circle_mask, (width//2, height//2), 120, 255, -1)
    shapes['circle'] = circle_mask
    
    return shapes

# === Main Execution ===
if __name__ == "__main__":
    # Try to load external image first, then create test shapes
    try:
        mask = load_shape_image("output.png")
        print("Loaded triangle_test.png")
        shape_name = "loaded_triangle"
    except:
        # Create test shapes
        print("Creating test shapes...")
        shapes = create_test_shapes()
        
        # Use hexagon as default
        shape_name = "hexagon"  
        mask = shapes[shape_name]
        print(f"Created test {shape_name}")
        
        # Save test shapes for future use
        cv2.imwrite("triangle_test.png", shapes['triangle'])
        cv2.imwrite("hexagon_test.png", shapes['hexagon'])
        cv2.imwrite("square_test.png", shapes['square'])
        cv2.imwrite("circle_test.png", shapes['circle'])
        print("Saved all test shapes for future use")
    
    # Generate snake pattern
    print("Generating snake pattern...")
    snake_paths, scaffold_array = generate_snake_pattern(mask, array_shape=(300, 300), return_array=True, enable_gap_filling=True)
    
    # Save coordinates to JSON with gap-filling information
    json_filename = f"snake_paths_{shape_name}.json"
    json_data = save_snake_paths_to_json(snake_paths, scaffold_array, shape_name, json_filename, gap_filling_enabled=True)
    
    # Enhanced statistics reporting
    print(f"\n📊 FINAL RESULTS:")
    print(f"Scaffold array shape: {scaffold_array.shape}")
    print(f"Number of scaffold pixels: {np.sum(scaffold_array)}")
    print(f"Scaffold density: {np.sum(scaffold_array) / (scaffold_array.shape[0] * scaffold_array.shape[1]) * 100:.2f}%")
    
    initial_count = json_data['summary']['initial_snake_count']
    gap_count = json_data['summary']['gap_filling_snake_count']
    initial_points = json_data['summary']['initial_coordinates']
    gap_points = json_data['summary']['gap_filling_coordinates']
    
    print(f"Snake paths breakdown:")
    print(f"   🐍 Initial snakes: {initial_count} paths ({initial_points:,} points)")
    if gap_count > 0:
        print(f"   🔍 Gap-filling snakes: {gap_count} paths ({gap_points:,} points)")
        improvement = (gap_points / initial_points * 100) if initial_points > 0 else 0
        print(f"   📈 Coverage improvement: +{improvement:.1f}% more points")
    print(f"   📊 Total: {len(snake_paths)} paths ({initial_points + gap_points:,} points)")
    
    # Visualize the scaffold array
    print("Visualizing scaffold array...")
    scaffold_fig = visualize_scaffold_array(
        scaffold_array, 
        title=f"Enhanced Scaffold Array - {shape_name.title()}", 
        save_path=f"scaffold_array_{shape_name}.png"
    )
    
    # Optional: Also create the traditional OpenCV visualization
    print("Creating traditional visualization...")
    output_filename = f"output_{shape_name}.png"
    result = visualize_snake_pattern(mask, snake_paths, output_filename)
    
    print(f"Generated {len(snake_paths)} snake paths")
    print(f"Snake paths and coordinates saved to: {json_filename}")
    print(f"Traditional output saved as: {output_filename}")
    print(f"Scaffold array visualization saved as: scaffold_array_{shape_name}.png")
    
    # Example: Access the JSON data for further processing
    print(f"\nJSON file contains:")
    print(f"- Total coordinates: {json_data['summary']['total_coordinates']}")
    print(f"- Initial paths: {json_data['summary']['initial_snake_count']}")
    print(f"- Gap-filling paths: {json_data['summary']['gap_filling_snake_count']}")
    print(f"- Scaffold array shape: {json_data['scaffold_array']['shape']}")
    print(f"- Algorithm parameters: {json_data['metadata']['parameters']}")
    if gap_count > 0:
        print(f"- Coverage improvement: {json_data['summary']['coverage_improvement']['improvement_factor']:.2f}x more paths") 