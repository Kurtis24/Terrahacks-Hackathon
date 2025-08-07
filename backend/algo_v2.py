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

# Set matplotlib backend to non-interactive before any other matplotlib imports
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for thread safety

import cv2
import numpy as np
import matplotlib.pyplot as plt
from scipy.spatial.distance import cdist
from collections import deque
import json
from datetime import datetime
import random

# === Parameters ===
step_size = 5                 # Step size for snake movement (smaller for more precise turns)
down_pixels = 10               # Pixels to move down during turns
crossover_spacing = 10          # Distance between crossovers

def save_line_coordinates_to_json(snake_paths, scaffold_array, shape_name, output_path="line_coordinates.json", target_size=300, pink_branches=None, connector_branches=None):
    """
    Save line coordinates for green, red, pink, and cyan lines on a 300x300 pixel grid
    
    Args:
        snake_paths: List of snake paths [left_snake, right_snake]
        scaffold_array: 2D numpy array of the scaffold
        shape_name: Name of the shape processed
        output_path: Path to save the JSON file
        target_size: Size of the target grid (default 300x300)
        pink_branches: List of pink branch lines (optional)
        connector_branches: List of cyan C-shaped connector lines (optional)
    """
    # Create separate arrays for green (left), red (right), pink (branch), and cyan (connector) lines
    green_array = np.zeros((target_size, target_size), dtype=np.uint8)
    red_array = np.zeros((target_size, target_size), dtype=np.uint8)
    pink_array = np.zeros((target_size, target_size), dtype=np.uint8)
    cyan_array = np.zeros((target_size, target_size), dtype=np.uint8)
    
    # Get the original image dimensions from the first snake path to determine scaling
    if len(snake_paths) > 0 and len(snake_paths[0]) > 0:
        # Find max coordinates to determine original image size
        all_x = [x for path in snake_paths for x, y in path]
        all_y = [y for path in snake_paths for x, y in path]
        if all_x and all_y:
            max_x = max(all_x)
            max_y = max(all_y)
            # Scale factor for mapping to target_size grid
            scale_x = target_size / (max_x + 1) if max_x > 0 else 1
            scale_y = target_size / (max_y + 1) if max_y > 0 else 1
        else:
            scale_x = scale_y = 1
    else:
        scale_x = scale_y = 1
    
    print(f"   🔍 Scaling factors: x={scale_x:.3f}, y={scale_y:.3f}")
    
    # Draw green lines (left snake - index 0) and additional recursive left snakes (even indices)
    for path_idx in range(0, len(snake_paths), 2):  # Process even indices (0, 2, 4, ...)
        if path_idx < len(snake_paths):
            path = snake_paths[path_idx]
            for i in range(len(path) - 1):
                x0, y0 = path[i]
                x1, y1 = path[i + 1]
                
                # Scale coordinates to 300x300 grid
                x0_scaled = int(x0 * scale_x)
                y0_scaled = int(y0 * scale_y)
                x1_scaled = int(x1 * scale_x)
                y1_scaled = int(y1 * scale_y)
                
                draw_line_in_array(green_array, x0_scaled, y0_scaled, x1_scaled, y1_scaled, value=1)
    
    # Draw red lines (right snake - index 1) and additional recursive right snakes (odd indices)
    for path_idx in range(1, len(snake_paths), 2):  # Process odd indices (1, 3, 5, ...)
        if path_idx < len(snake_paths):
            path = snake_paths[path_idx]
            for i in range(len(path) - 1):
                x0, y0 = path[i]
                x1, y1 = path[i + 1]
                
                # Scale coordinates to 300x300 grid
                x0_scaled = int(x0 * scale_x)
                y0_scaled = int(y0 * scale_y)
                x1_scaled = int(x1 * scale_x)
                y1_scaled = int(y1 * scale_y)
                
                draw_line_in_array(red_array, x0_scaled, y0_scaled, x1_scaled, y1_scaled, value=1)
    
    # Draw pink branch lines
    if pink_branches:
        for branch in pink_branches:
            for i in range(len(branch) - 1):
                x0, y0 = branch[i]
                x1, y1 = branch[i + 1]
                
                # Scale coordinates to 300x300 grid
                x0_scaled = int(x0 * scale_x)
                y0_scaled = int(y0 * scale_y)
                x1_scaled = int(x1 * scale_x)
                y1_scaled = int(y1 * scale_y)
                
                draw_line_in_array(pink_array, x0_scaled, y0_scaled, x1_scaled, y1_scaled, value=1)
    
    # Draw cyan C-shaped connector lines
    if connector_branches:
        for connector in connector_branches:
            for i in range(len(connector) - 1):
                x0, y0 = connector[i]
                x1, y1 = connector[i + 1]
                
                # Scale coordinates to 300x300 grid
                x0_scaled = int(x0 * scale_x)
                y0_scaled = int(y0 * scale_y)
                x1_scaled = int(x1 * scale_x)
                y1_scaled = int(y1 * scale_y)
                
                draw_line_in_array(cyan_array, x0_scaled, y0_scaled, x1_scaled, y1_scaled, value=1)
    
    # Extract coordinates where lines exist
    combined_snake_coordinates = []
    pink_coordinates = []
    cyan_coordinates = []
    
    # Find all green line coordinates and add to combined array
    green_y_coords, green_x_coords = np.where(green_array == 1)
    green_count = 0
    for i in range(len(green_x_coords)):
        combined_snake_coordinates.append([int(green_x_coords[i]), int(green_y_coords[i])])
        green_count += 1
    
    # Find all red line coordinates and add to combined array
    red_y_coords, red_x_coords = np.where(red_array == 1)
    red_count = 0
    for i in range(len(red_x_coords)):
        combined_snake_coordinates.append([int(red_x_coords[i]), int(red_y_coords[i])])
        red_count += 1
    
    # Find all pink line coordinates (separate from main snake lines)
    pink_y_coords, pink_x_coords = np.where(pink_array == 1)
    for i in range(len(pink_x_coords)):
        pink_coordinates.append([int(pink_x_coords[i]), int(pink_y_coords[i])])
    
    # Find all cyan line coordinates (separate from main snake lines)
    cyan_y_coords, cyan_x_coords = np.where(cyan_array == 1)
    for i in range(len(cyan_x_coords)):
        cyan_coordinates.append([int(cyan_x_coords[i]), int(cyan_y_coords[i])])
    
    # Prepare the enhanced JSON data structure
    json_data = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "shape_name": shape_name,
            "grid_size": [target_size, target_size],
            "algorithm_version": "algo_v2_enhanced_with_c_connectors"
        },
        "line_coordinates": {
            "snake_lines": {
                "description": "Combined green and red snake lines",
                "colors": ["green", "red"],
                "snake_types": ["left_snake", "right_snake"],
                "total_pixels": len(combined_snake_coordinates),
                "coordinates": combined_snake_coordinates
            },
            "pink_lines": {
                "color": "pink",
                "snake_type": "collision_branches",
                "total_pixels": len(pink_coordinates),
                "coordinates": pink_coordinates
            },
            "cyan_lines": {
                "color": "cyan",
                "snake_type": "c_shaped_connectors",
                "description": "Random C-shaped connectors throughout the pattern",
                "total_pixels": len(cyan_coordinates),
                "coordinates": cyan_coordinates
            }
        },
        "summary": {
            "grid_dimensions": f"{target_size}x{target_size}",
            "total_green_pixels": green_count,
            "total_red_pixels": red_count,
            "total_snake_pixels": len(combined_snake_coordinates),
            "total_pink_pixels": len(pink_coordinates),
            "total_cyan_pixels": len(cyan_coordinates),
            "total_line_pixels": len(combined_snake_coordinates) + len(pink_coordinates) + len(cyan_coordinates)
        }
    }
    
    # Save to JSON file with pretty printing
    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2, separators=(',', ': '))
    
    print(f"Line coordinates saved to JSON: {output_path}")
    print(f"Combined snake line pixels: {len(combined_snake_coordinates)} (Green: {green_count}, Red: {red_count})")
    print(f"Pink branch pixels: {len(pink_coordinates)}")
    print(f"Cyan C-connector pixels: {len(cyan_coordinates)}")
    print(f"Total line pixels on {target_size}x{target_size} grid: {len(combined_snake_coordinates) + len(pink_coordinates) + len(cyan_coordinates)}")
    
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

def find_bottommost_point(mask):
    """Find the bottommost point of the shape"""
    y_coords, x_coords = np.where(mask == 255)
    if len(y_coords) == 0:
        return None
    
    bottom_y = np.max(y_coords)
    # Find the center x-coordinate at the bottommost y level
    bottom_x_coords = x_coords[y_coords == bottom_y]
    center_x = int(np.mean(bottom_x_coords))
    
    return (center_x, bottom_y)

def find_leftmost_point(mask):
    """Find the leftmost point of the shape"""
    y_coords, x_coords = np.where(mask == 255)
    if len(x_coords) == 0:
        return None
    
    left_x = np.min(x_coords)
    # Find the center y-coordinate at the leftmost x level
    left_y_coords = y_coords[x_coords == left_x]
    center_y = int(np.mean(left_y_coords))
    
    return (left_x, center_y)

def find_rightmost_point(mask):
    """Find the rightmost point of the shape"""
    y_coords, x_coords = np.where(mask == 255)
    if len(x_coords) == 0:
        return None
    
    right_x = np.max(x_coords)
    # Find the center y-coordinate at the rightmost x level
    right_y_coords = y_coords[x_coords == right_x]
    center_y = int(np.mean(right_y_coords))
    
    return (right_x, center_y)

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

def calculate_bump_height(collision_x, collision_y, occupied_points):
    """
    Calculate the height of the bump between two snake lines at collision point
    
    Args:
        collision_x, collision_y: Collision point coordinates
        occupied_points: Set of occupied points from both snakes
        
    Returns:
        Height of the bump (Y-coordinate difference)
    """
    if not occupied_points:
        return 5  # Default small bump height
    
    # Look for occupied points in a small radius around collision point
    search_radius = 10
    nearby_y_coords = []
    
    for x in range(collision_x - search_radius, collision_x + search_radius + 1):
        for y in range(collision_y - search_radius, collision_y + search_radius + 1):
            if (x, y) in occupied_points and abs(x - collision_x) <= search_radius:
                nearby_y_coords.append(y)
    
    if len(nearby_y_coords) < 2:
        return 5  # Default if not enough points found
    
    # Calculate the range (difference between max and min Y coordinates)
    y_min = min(nearby_y_coords)
    y_max = max(nearby_y_coords)
    bump_height = y_max - y_min
    
    # Limit bump height to a reasonable range (1-20 pixels)
    bump_height = max(1, min(20, bump_height))
    
    return bump_height

def find_snake_midpoint(collision_x, collision_y, occupied_points):
    """
    Find the midpoint between the current snake position and the nearest other snake position
    
    Args:
        collision_x, collision_y: Current snake collision coordinates
        occupied_points: Set of all occupied points from both snakes
        
    Returns:
        Tuple of (midpoint_x, midpoint_y) coordinates
    """
    if not occupied_points:
        return collision_x, collision_y
    
    # Find the nearest occupied point (from the other snake) within a small radius
    search_radius = 3
    nearest_distance = float('inf')
    nearest_point = None
    
    for x in range(collision_x - search_radius, collision_x + search_radius + 1):
        for y in range(collision_y - search_radius, collision_y + search_radius + 1):
            if (x, y) in occupied_points and (x, y) != (collision_x, collision_y):
                distance = abs(x - collision_x) + abs(y - collision_y)  # Manhattan distance
                if distance < nearest_distance:
                    nearest_distance = distance
                    nearest_point = (x, y)
    
    if nearest_point:
        # Calculate midpoint between collision point and nearest other snake point
        other_x, other_y = nearest_point
        midpoint_x = (collision_x + other_x) // 2
        midpoint_y = (collision_y + other_y) // 2
        return midpoint_x, midpoint_y
    else:
        # If no nearby point found, use the collision point
        return collision_x, collision_y

def create_pink_branch(collision_x, collision_y, mask, occupied_points=None):
    """
    Create a pink branch line when snakes collide
    
    Args:
        collision_x, collision_y: Collision point coordinates
        mask: Shape mask to ensure branch stays within bounds
        occupied_points: Set of occupied points to calculate bump height
        
    Returns:
        List of coordinates forming the pink branch
    """
    branch_path = []
    
    # Calculate bump height by finding the local height difference
    bump_height = calculate_bump_height(collision_x, collision_y, occupied_points)
    
    # Find the midpoint between the current snake and the other snake
    midpoint_x, midpoint_y = find_snake_midpoint(collision_x, collision_y, occupied_points)
    
    # Randomly choose orientation: 1 for horizontal, 2 for vertical
    orientation = random.randint(1, 2)
    
    # Use bump height for extensions instead of random values
    extension1 = max(1, bump_height)  # Ensure at least 1 pixel
    extension2 = max(1, bump_height)  # Use same height for both directions
    
    # Start from midpoint instead of collision point
    branch_path.append((midpoint_x, midpoint_y))
    
    if orientation == 1:  # Horizontal line
        # Randomly choose left or right for first extension
        direction = random.randint(1, 2)  # 1 = left, 2 = right
        direction_multiplier = -1 if direction == 1 else 1
        
        # Create horizontal line in first direction
        for i in range(1, extension1 + 1):
            new_x = midpoint_x + (direction_multiplier * i)
            new_y = midpoint_y  # Keep same Y (horizontal line)
            
            # Check if position is valid and within shape bounds
            if (0 <= new_x < mask.shape[1] and 0 <= new_y < mask.shape[0] and 
                is_point_in_shape(mask, new_x, new_y)):
                branch_path.append((new_x, new_y))
            else:
                break
        
        # Create horizontal line in opposite direction
        for i in range(1, extension2 + 1):
            new_x = midpoint_x + (-direction_multiplier * i)
            new_y = midpoint_y  # Keep same Y (horizontal line)
            
            # Check if position is valid and within shape bounds
            if (0 <= new_x < mask.shape[1] and 0 <= new_y < mask.shape[0] and 
                is_point_in_shape(mask, new_x, new_y)):
                branch_path.append((new_x, new_y))
            else:
                break
        
        orientation_name = "horizontal"
        direction_name = f"{'left' if direction == 1 else 'right'} first"
        
    else:  # Vertical line
        # Randomly choose up or down for first extension
        direction = random.randint(1, 2)  # 1 = up, 2 = down
        direction_multiplier = -1 if direction == 1 else 1
        
        # Create vertical line in first direction
        for i in range(1, extension1 + 1):
            new_x = midpoint_x  # Keep same X (vertical line)
            new_y = midpoint_y + (direction_multiplier * i)
            
            # Check if position is valid and within shape bounds
            if (0 <= new_x < mask.shape[1] and 0 <= new_y < mask.shape[0] and 
                is_point_in_shape(mask, new_x, new_y)):
                branch_path.append((new_x, new_y))
            else:
                break
        
        # Create vertical line in opposite direction
        for i in range(1, extension2 + 1):
            new_x = midpoint_x  # Keep same X (vertical line)
            new_y = midpoint_y + (-direction_multiplier * i)
            
            # Check if position is valid and within shape bounds
            if (0 <= new_x < mask.shape[1] and 0 <= new_y < mask.shape[0] and 
                is_point_in_shape(mask, new_x, new_y)):
                branch_path.append((new_x, new_y))
            else:
                break
        
        orientation_name = "vertical"
        direction_name = f"{'up' if direction == 1 else 'down'} first"
    
    # print(f"   🌸 Created MIDPOINT pink branch at ({midpoint_x}, {midpoint_y}) - "
    #       f"Orientation: {orientation_name}, Direction: {direction_name}, "
    #       f"Bump Height: {bump_height}px, Points: {len(branch_path)}")
    
    return branch_path

class Snake:
    def __init__(self, start_x, start_y, initial_direction, snake_id, scaffold_array=None, mask=None, array_shape=(300, 300), is_recursive=False):
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
        self.mask = mask  # Reference to the shape mask for branch creation
        self.pink_branches = []  # Store pink branch lines created by this snake
        self.is_recursive = is_recursive  # Flag to indicate if this is a recursive snake
        
        # Calculate scaling factors for scaffold array
        if self.scaffold_array is not None and mask is not None:
            self.scale_x = array_shape[1] / mask.shape[1]  # width scaling
            self.scale_y = array_shape[0] / mask.shape[0]  # height scaling
        else:
            self.scale_x = self.scale_y = 1
        
        # Mark starting position in scaffold array
        if self.scaffold_array is not None:
            scaled_start_x = int(start_x * self.scale_x)
            scaled_start_y = int(start_y * self.scale_y)
            if (0 <= scaled_start_y < self.scaffold_array.shape[0] and 
                0 <= scaled_start_x < self.scaffold_array.shape[1]):
                self.scaffold_array[scaled_start_y, scaled_start_x] = 1
    
    def update_scaffold_array(self, x, y):
        """Update the scaffold array by drawing a line from previous position to current position"""
        if self.scaffold_array is not None:
            # Scale coordinates to match scaffold array dimensions
            scaled_prev_x = int(self.prev_x * self.scale_x)
            scaled_prev_y = int(self.prev_y * self.scale_y)
            scaled_x = int(x * self.scale_x)
            scaled_y = int(y * self.scale_y)
            
            # Draw line from previous position to current position using scaled coordinates
            draw_line_in_array(self.scaffold_array, scaled_prev_x, scaled_prev_y, scaled_x, scaled_y, value=1)
            # Update previous position (keep in original mask coordinate space)
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
        # Check if we've reached the bottom of the shape
        if self.current_y >= mask.shape[0] - 10:
            return False
            
        # Only check for shape pixels occasionally, not every step
        if self.current_y % (down_pixels * 3) == 0:  # Check every 3 lines
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
                    # Collision detected!
                    if self.is_recursive:
                        # Recursive snake: stop to avoid overlapping
                        return False
                    else:
                        # Initial snake pair: create pink branch and continue
                        if self.mask is not None:
                            branch = create_pink_branch(self.current_x, self.current_y, self.mask, occupied_points)
                            if branch:
                                self.pink_branches.append(branch)
                        
                        # Start turning sequence after collision
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

def generate_snake_pattern(mask, array_shape=(300, 300), return_array=True, startPoint=None, max_recursion_depth=3, current_depth=0, used_starts=None):
    """Generate the snake pattern for the given shape mask and optionally return scaffold array"""
    if used_starts is None:
        used_starts = []
    
    # Find starting point
    start_point = startPoint or find_topmost_point(mask)
    if start_point is None:
        if return_array:
            return [], np.zeros(array_shape, dtype=np.uint8), []
        else:
            return [], []
    
    start_x, start_y = start_point
    print(f"🎯 Starting snake pattern at ({start_x}, {start_y})")
    
    # Check if starting point has room to move left and right
    left_space = 0
    for x in range(start_x, -1, -1):
        if is_point_in_shape(mask, x, start_y):
            left_space += 1
        else:
            break
    
    right_space = 0
    for x in range(start_x, mask.shape[1]):
        if is_point_in_shape(mask, x, start_y):
            right_space += 1
        else:
            break
    
    print(f"   📏 Space available: {left_space} pixels left, {right_space} pixels right")
    
    if left_space < step_size or right_space < step_size:
        print(f"   ⚠️  Warning: Starting point too narrow for step_size={step_size}")
        print(f"   🔍 Looking for wider starting point...")
        
        # Try to find a wider starting point lower in the shape
        for y_offset in range(10, min(100, mask.shape[0] - start_y), 5):
            test_y = start_y + y_offset
            if test_y >= mask.shape[0]:
                break
                
            # Find center of shape at this Y level
            center_x = get_shape_center_x(mask, test_y)
            if center_x is None:
                continue
                
            # Check space at this level
            test_left_space = 0
            for x in range(center_x, -1, -1):
                if is_point_in_shape(mask, x, test_y):
                    test_left_space += 1
                else:
                    break
            
            test_right_space = 0
            for x in range(center_x, mask.shape[1]):
                if is_point_in_shape(mask, x, test_y):
                    test_right_space += 1
                else:
                    break
            
            if test_left_space >= step_size * 3 and test_right_space >= step_size * 3:
                start_x, start_y = center_x, test_y
                print(f"   ✅ Found better starting point at ({start_x}, {start_y}) with {test_left_space} left, {test_right_space} right")
                break
    
    # Initialize the scaffold array only if requested
    scaffold_array = np.zeros(array_shape, dtype=np.uint8) if return_array else None
    
    # Create two snakes with initial horizontal directions, passing the scaffold array and mask
    is_recursive_snake = current_depth > 0  # True if this is a recursive call
    left_snake = Snake(start_x, start_y, -1, "left", scaffold_array if return_array else None, mask, array_shape, is_recursive_snake)
    right_snake = Snake(start_x, start_y, 1, "right", scaffold_array if return_array else None, mask, array_shape, is_recursive_snake)
    
    occupied_points = set()
    occupied_points.add((start_x, start_y))
    
    # Run the snakes until they're done
    max_iterations = 15000  # Increased for more complex patterns
    iteration = 0
    
    while iteration < max_iterations:
        left_active = left_snake.move_step(mask, occupied_points, right_snake)
        right_active = right_snake.move_step(mask, occupied_points, left_snake)
        
        if not left_active and not right_active:
            break
            
        iteration += 1
    
    snake_paths = [left_snake.path, right_snake.path]
    
    # Add this starting point to the used starts list after snakes complete
    used_starts.append(start_point)
    
    # Collect all pink branches from both snakes
    all_pink_branches = left_snake.pink_branches + right_snake.pink_branches
    print(f"🌸 Total pink branches created: {len(all_pink_branches)}")
    
    # Delete every 3rd line to reduce density (temporarily disabled)
    # snake_paths = delete_every_other_line_simple(snake_paths)
    
    # Generate random C-shaped connectors
    connector_branches = generate_random_connectors(mask, array_shape, scaffold_array)
    print(f"🔗 Total connector branches created: {len(connector_branches)}")
    
    if return_array:
        # Add crossovers to the scaffold array
        for path in snake_paths:
            crossovers = add_crossovers_to_path(path)
            for crossover_x, crossover_y in crossovers:
                # Mark crossover as a small circle (3x3 area)
                for dy in range(-1, 2):
                    for dx in range(-1, 2):
                        new_x, new_y = crossover_x + dx, crossover_y + dy
                        if (0 <= new_x < array_shape[1] and 0 <= new_y < array_shape[0]):
                            scaffold_array[new_y, new_x] = 1
        
        # Add connector branches to scaffold array
        for connector in connector_branches:
            for i in range(len(connector) - 1):
                x0, y0 = connector[i]
                x1, y1 = connector[i + 1]
                draw_line_in_array(scaffold_array, x0, y0, x1, y1, value=1)

        # recursivley check for empty space
        if current_depth < max_recursion_depth:  # Re-enabled with smaller regions
            newStartPoint = findEmptySpace(mask, scaffold_array, used_starts=used_starts)
            if not newStartPoint:
                return snake_paths, scaffold_array, all_pink_branches, connector_branches
            
            # Generate additional pattern at the new start point
            additional_paths, additional_scaffold, additional_pink, additional_connectors = generate_snake_pattern(
                mask, array_shape, return_array=True, startPoint=newStartPoint, max_recursion_depth=max_recursion_depth, current_depth=current_depth + 1, used_starts=used_starts
            )
            
            # Merge the results
            snake_paths.extend(additional_paths)
            all_pink_branches.extend(additional_pink)
            connector_branches.extend(additional_connectors)
            
            # Combine scaffold arrays
            scaffold_array = np.maximum(scaffold_array, additional_scaffold)
        
        return snake_paths, scaffold_array, all_pink_branches, connector_branches
    else:
        return snake_paths, all_pink_branches, connector_branches

def findEmptySpace(mask, scaffold_array=None, min_region_size=30, used_starts=None, min_distance=30):
    """
    Find the next empty space in the shape where we can add more snake lines.
    Scans pixel by pixel to find the first suitable region, rather than finding all regions.
    
    Args:
        mask: Binary mask of the shape (255 = inside shape, 0 = outside)
        scaffold_array: 2D array showing existing lines (1 = line exists, 0 = empty)
        min_region_size: Minimum size of empty region to consider (in pixels)
        used_starts: List of previously used starting points to avoid
        min_distance: Minimum distance from previously used starting points
        
    Returns:
        Single starting point (x, y) for the first suitable empty region, or None if no suitable region found
    """
    if scaffold_array is None:
        return None
    
    if used_starts is None:
        used_starts = []
    
    # Scale scaffold array to match mask dimensions
    mask_height, mask_width = mask.shape
    scaffold_height, scaffold_width = scaffold_array.shape
    
    # Create a scaled version of scaffold to match mask dimensions
    from scipy import ndimage
    scaled_scaffold = ndimage.zoom(scaffold_array, 
                                 (mask_height / scaffold_height, mask_width / scaffold_width), 
                                 order=0)  # Nearest neighbor interpolation
    
    # Find areas that are inside the shape but don't have lines
    shape_mask = (mask == 255).astype(np.uint8)
    line_mask = (scaled_scaffold > 0).astype(np.uint8)
    
    # Empty areas = inside shape AND no existing lines
    empty_areas = shape_mask & (~line_mask)
    
    print(f"🔍 Scanning for empty regions (min size: {min_region_size} pixels)...")
    
    # Scan the image from top to bottom, left to right to find the first suitable region
    visited = np.zeros_like(empty_areas, dtype=bool)
    regions_found = 0
    
    for y in range(mask_height):
        for x in range(mask_width):
            # Skip if this pixel is not empty or already visited
            if empty_areas[y, x] == 0 or visited[y, x]:
                continue
                
            regions_found += 1
            # Found an unvisited empty pixel - flood fill to measure region size
            region_pixels = []
            queue = [(x, y)]
            visited[y, x] = True
            
            while queue:
                curr_x, curr_y = queue.pop(0)
                region_pixels.append((curr_x, curr_y))
                
                # Check 4-connected neighbors
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    new_x, new_y = curr_x + dx, curr_y + dy
                    
                    # Check bounds and if pixel is empty and unvisited
                    if (0 <= new_x < mask_width and 0 <= new_y < mask_height and
                        not visited[new_y, new_x] and empty_areas[new_y, new_x] == 1):
                        visited[new_y, new_x] = True
                        queue.append((new_x, new_y))
            
            # Check if this region is large enough
            region_size = len(region_pixels)
            if region_size >= min_region_size:
                # Find the topmost point of this region as starting point
                region_y_coords = [p[1] for p in region_pixels]
                region_x_coords = [p[0] for p in region_pixels]
                
                top_y = min(region_y_coords)
                top_x_coords = [x for x, y in region_pixels if y == top_y]
                center_x = int(np.mean(top_x_coords))
                
                start_point = (center_x, top_y)
                
                # Check if the new start point is too close to any previously used starting point
                if used_starts:
                    min_dist_sq = min_distance * min_distance
                    too_close = False
                    for used_start in used_starts:
                        dist_sq = (start_point[0] - used_start[0])**2 + (start_point[1] - used_start[1])**2
                        if dist_sq < min_dist_sq:
                            print(f"   ⚠️  Skipping region {regions_found} at ({center_x}, {top_y}) - too close to {used_start} (dist={int(dist_sq**0.5)})")
                            too_close = True
                            break
                    
                    if too_close:
                        continue  # Skip this region, continue searching
                
                print(f"✅ Found suitable empty region: {region_size} pixels, start at {start_point}")
                return start_point
            else:
                print(f"   ⚠️  Found small region: {region_size} pixels (too small, need {min_region_size}+)")
    
    print(f"🎯 No suitable empty regions found (minimum size: {min_region_size} pixels)")
    return None

# For backwards compatibility, create a function that only returns paths
def generate_snake_pattern_legacy(mask):
    """Legacy function that only returns snake paths (backwards compatible)"""
    snake_paths, all_pink_branches, connector_branches = generate_snake_pattern(mask, return_array=False)
    return snake_paths

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

import random

def generate_random_connectors(mask, array_shape=(300, 300), scaffold_array=None):
    """Generate C-shaped connectors positioned throughout the shape - EFFICIENT VERSION.

    Creates connectors in the pattern:
    ----
    |
    ----
    
    Randomly facing left (⊏) or right (⊐) with proper 90-degree connections.
    """

    top = find_topmost_point(mask)
    bottom = find_bottommost_point(mask)
    left = find_leftmost_point(mask)
    right = find_rightmost_point(mask)

    if not all([top, bottom, left, right]):
        return []

    connectors = []
    connector_length = 4   # Length of the horizontal arms
    vertical_length = 2    # Half-height of the vertical arm
    
    print("🔗 Generating C-shaped connectors throughout shape (EFFICIENT)...")
    print(f"   📏 Mask dimensions: {mask.shape}")
    print(f"   📏 Scaffold array dimensions: {scaffold_array.shape if scaffold_array is not None else 'None'}")

    # Calculate scaling factors between mask and scaffold_array
    if scaffold_array is None:
        print("   ⚠️  No scaffold array provided - skipping connector generation")
        return []
        
    scale_x = array_shape[1] / mask.shape[1]  # width scaling
    scale_y = array_shape[0] / mask.shape[0]  # height scaling
    print(f"   📏 Scaling factors: x={scale_x:.3f}, y={scale_y:.3f}")
    
    # Debug: Check scaffold array content
    total_pixels = scaffold_array.shape[0] * scaffold_array.shape[1]
    filled_pixels = np.sum(scaffold_array == 1)
    print(f"   🔍 Scaffold array stats: {filled_pixels}/{total_pixels} pixels filled ({filled_pixels/total_pixels*100:.1f}%)")
    
    if filled_pixels == 0:
        print(f"   ⚠️  Scaffold array is EMPTY! No lines to place connectors on.")
        return []

    # EFFICIENT APPROACH: Pre-identify valid positions
    print("   🎯 Pre-identifying valid connector positions...")
    
    # Find all positions where scaffold lines exist
    filled_coords = np.where(scaffold_array == 1)
    line_positions = set(zip(filled_coords[1], filled_coords[0]))  # (x, y) format
    
    # Group line positions by Y coordinate to find horizontal line segments
    lines_by_y = {}
    for x, y in line_positions:
        if y not in lines_by_y:
            lines_by_y[y] = []
        lines_by_y[y].append(x)
    
    # Sort Y coordinates to process from top to bottom
    sorted_y_coords = sorted(lines_by_y.keys())
    
    valid_positions = []
    spacing = 15  # Minimum spacing between connectors
    
    # Find positions between pairs of horizontal lines
    for i in range(len(sorted_y_coords) - 1):
        y_upper = sorted_y_coords[i]
        y_lower = sorted_y_coords[i + 1]
        
        # Skip if lines are too close together
        if y_lower - y_upper < 2 * vertical_length + 4:
            continue
            
        # Find overlapping X ranges between the two lines
        x_upper = set(lines_by_y[y_upper])
        x_lower = set(lines_by_y[y_lower])
        x_overlap = x_upper.intersection(x_lower)
        
        if len(x_overlap) < connector_length + 10:  # Need enough space for connector
            continue
            
        # Place connectors in the middle Y position between the lines
        center_y_scaffold = (y_upper + y_lower) // 2
        
        # Convert back to mask coordinates
        center_y_mask = int(center_y_scaffold / scale_y)
        
        # Place connectors at regular intervals along the X overlap
        x_sorted = sorted(x_overlap)
        x_min, x_max = x_sorted[0], x_sorted[-1]
        
        # Calculate how many connectors we can fit
        available_width = x_max - x_min
        num_connectors = max(1, available_width // spacing)
        
        for j in range(num_connectors):
            if num_connectors == 1:
                center_x_scaffold = (x_min + x_max) // 2
            else:
                center_x_scaffold = x_min + (j * (x_max - x_min)) // (num_connectors - 1)
            
            # Convert back to mask coordinates
            center_x_mask = int(center_x_scaffold / scale_x)
            
            # Validate position is within shape and has enough space
            if (left[0] + connector_length + 5 <= center_x_mask <= right[0] - connector_length - 5 and
                top[1] + vertical_length + 5 <= center_y_mask <= bottom[1] - vertical_length - 5 and
                is_point_in_shape(mask, center_x_mask, center_y_mask)):
                
                valid_positions.append((center_x_mask, center_y_mask))
    
    print(f"   ✅ Found {len(valid_positions)} valid connector positions")
    
    # Limit the number of connectors to avoid overcrowding
    target_connectors = min(20, len(valid_positions))  # Further reduced from 50
    
    # Randomly sample from valid positions to add variety
    if len(valid_positions) > target_connectors:
        selected_positions = random.sample(valid_positions, target_connectors)
    else:
        selected_positions = valid_positions
    
    print(f"   🎯 Placing {len(selected_positions)} connectors...")
    
    # Generate connectors at selected positions
    for pos_idx, (center_x, center_y) in enumerate(selected_positions):
        connector_length = random.randint(4, 8)  # Vary size slightly
        direction = random.choice(['left', 'right'])  # ⊏ or ⊐
        connector_points = []
        valid_connector = True

        # Create a proper C-shaped path with continuous 90-degree turns
        if direction == 'left':  # ⊏ shape
            # Start at top-right, go left, then down, then right
            
            # Top horizontal arm (right to left)
            y_top = center_y - vertical_length
            for dx in range(connector_length, -1, -1):  # Right to left
                x = center_x + dx
                y = y_top
                if 0 <= x < mask.shape[1] and 0 <= y < mask.shape[0] and is_point_in_shape(mask, x, y):
                    connector_points.append((x, y))
                else:
                    valid_connector = False
                    break
            
            if not valid_connector:
                continue
            
            # Vertical arm (top to bottom, excluding the top point we already added)
            x_base = center_x
            for dy in range(-vertical_length + 1, vertical_length + 1):  # Skip first point
                x = x_base
                y = center_y + dy
                if 0 <= x < mask.shape[1] and 0 <= y < mask.shape[0] and is_point_in_shape(mask, x, y):
                    connector_points.append((x, y))
                else:
                    valid_connector = False
                    break
            
            if not valid_connector:
                continue
            
            # Bottom horizontal arm (left to right, excluding the left point we already added)
            y_bottom = center_y + vertical_length
            for dx in range(1, connector_length + 1):  # Skip first point
                x = center_x + dx
                y = y_bottom
                if 0 <= x < mask.shape[1] and 0 <= y < mask.shape[0] and is_point_in_shape(mask, x, y):
                    connector_points.append((x, y))
                else:
                    valid_connector = False
                    break
                    
        else:  # 'right' - ⊐ shape
            # Start at top-left, go right, then down, then left
            
            # Top horizontal arm (left to right)
            y_top = center_y - vertical_length
            for dx in range(-connector_length, 1):  # Left to right
                x = center_x + dx
                y = y_top
                if 0 <= x < mask.shape[1] and 0 <= y < mask.shape[0] and is_point_in_shape(mask, x, y):
                    connector_points.append((x, y))
                else:
                    valid_connector = False
                    break
            
            if not valid_connector:
                continue
            
            # Vertical arm (top to bottom, excluding the top point we already added)
            x_base = center_x
            for dy in range(-vertical_length + 1, vertical_length + 1):  # Skip first point
                x = x_base
                y = center_y + dy
                if 0 <= x < mask.shape[1] and 0 <= y < mask.shape[0] and is_point_in_shape(mask, x, y):
                    connector_points.append((x, y))
                else:
                    valid_connector = False
                    break
            
            if not valid_connector:
                continue
            
            # Bottom horizontal arm (right to left, excluding the right point we already added)
            y_bottom = center_y + vertical_length
            for dx in range(-1, -connector_length - 1, -1):  # Skip first point, go right to left
                x = center_x + dx
                y = y_bottom
                if 0 <= x < mask.shape[1] and 0 <= y < mask.shape[0] and is_point_in_shape(mask, x, y):
                    connector_points.append((x, y))
                else:
                    valid_connector = False
                    break

        if valid_connector and len(connector_points) >= 8:
            # Quick conflict check - only reject if majority of points conflict
            conflict_count = 0
            max_allowed_conflicts = len(connector_points) // 3  # Allow up to 1/3 conflicts
            
            for point_x, point_y in connector_points:
                # Convert connector point to scaffold coordinates
                scaled_point_x = int(point_x * scale_x)
                scaled_point_y = int(point_y * scale_y)
                
                # Check bounds and if point is on existing line
                if (0 <= scaled_point_x < scaffold_array.shape[1] and 
                    0 <= scaled_point_y < scaffold_array.shape[0]):
                    if scaffold_array[scaled_point_y, scaled_point_x] == 1:
                        conflict_count += 1
                        if conflict_count > max_allowed_conflicts:
                            break
                else:
                    # Point is out of bounds - this is bad, reject
                    conflict_count = max_allowed_conflicts + 1
                    break
            
            if conflict_count <= max_allowed_conflicts:
                connectors.append(connector_points)
                if len(connectors) <= 5:  # Only print first few for debugging
                    scaled_debug_x = int(center_x * scale_x)
                    scaled_debug_y = int(center_y * scale_y)
                    print(f"   ✅ Created connector #{len(connectors)} at mask coords ({center_x}, {center_y}) -> scaffold coords ({scaled_debug_x}, {scaled_debug_y}) "
                          f"facing {direction} with {len(connector_points)} points, {conflict_count} conflicts")

    print(f"🔗 Generated {len(connectors)} C-shaped connectors total (efficiency: {len(connectors)}/{len(selected_positions)} = {len(connectors)/max(1,len(selected_positions))*100:.1f}%).")
    return connectors


    

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

def visualize_snake_pattern(mask, snake_paths, output_path="output.png", pink_branches=None, connector_branches=None):
    """Visualize the snake pattern on the shape"""
    # Create colored output image
    result_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    
    colors = [(0, 255, 0), (255, 0, 0)]  # Green for left snake, Red for right snake
    pink_color = (255, 0, 255)  # Pink for branches
    connector_color = (0, 255, 255)  # Cyan for C-shaped connectors
    
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
    
    # Draw pink branch lines
    if pink_branches:
        for branch in pink_branches:
            # Draw branch path
            for j in range(len(branch) - 1):
                pt1 = branch[j]
                pt2 = branch[j + 1]
                
                # Ensure points are tuples of 2 integers
                if (isinstance(pt1, (tuple, list)) and len(pt1) == 2 and
                    isinstance(pt2, (tuple, list)) and len(pt2) == 2):
                    try:
                        pt1 = (int(pt1[0]), int(pt1[1]))
                        pt2 = (int(pt2[0]), int(pt2[1]))
                        cv2.line(result_img, pt1, pt2, pink_color, 2)  # Same thickness as green/red lines
                    except Exception as e:
                        print(f"Warning: Error drawing pink branch line from {pt1} to {pt2}: {e}")
                        continue
                else:
                    print(f"Warning: Invalid pink branch point format, skipping line {j}")
                    break
    
    # Draw C-shaped connector lines (cyan color)
    if connector_branches:
        for connector in connector_branches:
            # Draw connector path
            for j in range(len(connector) - 1):
                pt1 = connector[j]
                pt2 = connector[j + 1]
                
                # Ensure points are tuples of 2 integers
                if (isinstance(pt1, (tuple, list)) and len(pt1) == 2 and
                    isinstance(pt2, (tuple, list)) and len(pt2) == 2):
                    try:
                        pt1 = (int(pt1[0]), int(pt1[1]))
                        pt2 = (int(pt2[0]), int(pt2[1]))
                        cv2.line(result_img, pt1, pt2, connector_color, 2)  # Same thickness as snake lines
                    except Exception as e:
                        print(f"Warning: Error drawing connector line from {pt1} to {pt2}: {e}")
                        continue
                else:
                    print(f"Warning: Invalid connector point format, skipping line {j}")
                    break
    
    # Save and display
    cv2.imwrite(output_path, result_img)
    print(f"OpenCV visualization saved to: {output_path}")
    
    plt.figure(figsize=(10, 10))
    plt.imshow(cv2.cvtColor(result_img, cv2.COLOR_BGR2RGB))
    plt.title("90-Degree Turn Snake Pattern with C-Shaped Connectors - Continuous Zigzag Fill")
    plt.axis('off')
    
    # Save matplotlib version too
    matplotlib_path = output_path.replace('.png', '_matplotlib.png')
    plt.savefig(matplotlib_path, dpi=300, bbox_inches='tight')
    print(f"Matplotlib visualization saved to: {matplotlib_path}")
    
    # Comment out plt.show() to avoid hanging
    # plt.show()
    plt.close()  # Close the figure to free memory
    
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

def delete_every_other_line_simple(snake_paths):
    """
    Simple function to delete every 3rd horizontal line based on Y-coordinate for better coverage.
    """
    if not snake_paths:
        return snake_paths
    
    print(f"🗑️  Deleting every 3rd line for better coverage...")
    
    filtered_paths = []
    
    for path_idx, path in enumerate(snake_paths):
        if not path:
            filtered_paths.append(path)
            continue
        
        # Filter points: keep lines where (Y // down_pixels) % 3 != 0
        # This removes every 3rd line level (keeps 2 out of every 3 lines)
        filtered_path = []
        for x, y in path:
            line_level = y // down_pixels
            if line_level % 3 != 0:  # Keep lines at levels 1,2,4,5,7,8... (skip 0,3,6,9...)
                filtered_path.append((x, y))
        
        filtered_paths.append(filtered_path)
        print(f"   Path {path_idx}: {len(path)} → {len(filtered_path)} points")
    
    total_original = sum(len(path) for path in snake_paths)
    total_filtered = sum(len(path) for path in filtered_paths)
    print(f"   🎯 Total: {total_original} → {total_filtered} points ({total_original - total_filtered} removed)")
    
    return filtered_paths

# === Main Execution (for testing only) ===
if __name__ == "__main__":
    print("⚠️  Use main.py instead for the full workflow!")
    print("   This file is now a module. Run: python main.py")
    
    # Optional: Quick test functionality
    print("\n🧪 Running quick test of algorithm functions...")
    shapes = create_test_shapes()
    mask = shapes['triangle']
    snake_paths, scaffold_array, all_pink_branches, connector_branches = generate_snake_pattern(mask, array_shape=(300, 300), return_array=True)
    print(f"✅ Test completed: Generated {len(snake_paths)} paths with {np.sum(scaffold_array)} scaffold pixels") 