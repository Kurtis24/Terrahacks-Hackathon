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

# === Parameters ===
step_size = 5                 # Step size for snake movement (smaller for more precise turns)
down_pixels = 8                # Pixels to move down during turns
crossover_spacing = 10          # Distance between crossovers

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
    def __init__(self, start_x, start_y, initial_direction, snake_id):
        self.path = [(start_x, start_y)]
        self.current_x = start_x
        self.current_y = start_y
        self.dx = initial_direction  # Direction vector: -1 for left, 1 for right
        self.dy = 0  # Initially moving horizontally
        self.snake_id = snake_id
        self.state = "to_edge"  # States: "to_edge", "turn_right_down", "turn_left_down"
        self.down_counter = 0  # Counter for 3-pixel downward movement
        self.turn_type = "right"  # "right" or "left" - which way to turn at edge
        
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

def generate_snake_pattern(mask):
    """Generate the snake pattern for the given shape mask"""
    # Find starting point
    start_point = find_topmost_point(mask)
    if start_point is None:
        return []
    
    start_x, start_y = start_point
    
    # Create two snakes with initial horizontal directions
    left_snake = Snake(start_x, start_y, -1, "left")   # Moving left initially
    right_snake = Snake(start_x, start_y, 1, "right")  # Moving right initially
    
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
    
    return [left_snake.path, right_snake.path]

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

def visualize_snake_pattern(mask, snake_paths, output_path="output.png"):
    """Visualize the snake pattern on the shape"""
    # Create colored output image
    result_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    
    colors = [(0, 255, 0), (255, 0, 0)]  # Green for left snake, Red for right snake
    
    # Draw snake paths
    for i, path in enumerate(snake_paths):
        color = colors[i % len(colors)]
        
        # Draw path
        for j in range(len(path) - 1):
            pt1 = path[j]
            pt2 = path[j + 1]
            cv2.line(result_img, pt1, pt2, color, 2)
        
        # Add crossovers
        crossovers = add_crossovers_to_path(path)
        for crossover in crossovers:
            cv2.circle(result_img, crossover, 3, (255, 0, 255), -1)  # Magenta crossovers
    
    # Save and display
    cv2.imwrite(output_path, result_img)
    
    plt.figure(figsize=(10, 10))
    plt.imshow(cv2.cvtColor(result_img, cv2.COLOR_BGR2RGB))
    plt.title("90-Degree Turn Snake Pattern - Continuous Zigzag Fill")
    plt.axis('off')
    plt.show()
    
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
    snake_paths = generate_snake_pattern(mask)
    
    # Visualize result
    print("Creating visualization...")
    output_filename = f"output_{shape_name}.png"
    result = visualize_snake_pattern(mask, snake_paths, output_filename)
    
    print(f"Generated {len(snake_paths)} snake paths")
    for i, path in enumerate(snake_paths):
        print(f"Snake {i+1}: {len(path)} points")
    print(f"Output saved as: {output_filename}") 