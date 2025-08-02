import cv2
import numpy as np
import matplotlib.pyplot as plt

# === Parameters ===
width, height = 400, 400
spacing = 10                   # Further reduced from 15 - very tight line spacing
crossover_spacing = 70         # Distance between crossovers (~21 bp)

# === Generate a Star Mask ===
star_mask = np.zeros((height, width), dtype=np.uint8)

# Create a 5-pointed star
center_x, center_y = 200, 200
outer_radius = 80
inner_radius = 30

# Calculate star points (5 outer + 5 inner = 10 points)
star_points = []
for i in range(10):
    angle = i * np.pi / 5  # 36 degrees per step
    if i % 2 == 0:  # Outer points
        radius = outer_radius
    else:  # Inner points
        radius = inner_radius
    x = int(center_x + radius * np.cos(angle - np.pi/2))  # -pi/2 to start pointing up
    y = int(center_y + radius * np.sin(angle - np.pi/2))
    star_points.append([x, y])

star_points = np.array(star_points, np.int32)
cv2.fillPoly(star_mask, [star_points], 255)

# === Generate Parallel Lines within the Star ===
lines = []
for y in range(0, height, spacing):
    x_inside = np.where(star_mask[y] == 255)[0]
    if len(x_inside) > 1:
        x_start, x_end = x_inside[0], x_inside[-1]
        lines.append(((x_start, y), (x_end, y)))

# === Zig-Zag Scaffold Routing ===
scaffold_img = cv2.cvtColor(star_mask, cv2.COLOR_GRAY2BGR)

# Simple zig-zag with gap detection
all_paths = []
filled_areas = set()  # Track filled coordinates
step_size = 1  # Reduced from 2 - denser horizontal lines
min_segment_length = 10  # Reduced from 15 - now fills smaller segments
max_gap_distance = spacing * 6  # Further increased - very willing to connect across gaps

def mark_area_filled(path):
    """Mark path coordinates as filled"""
    for x, y in path:
        filled_areas.add((x, y))

def find_unfilled_start():
    """Find a good starting point for a new path"""
    for y in range(0, height, spacing):
        x_inside = np.where(star_mask[y] == 255)[0]
        
        if len(x_inside) == 0:
            continue
            
        # Find continuous segments
        segments = []
        segment_start = x_inside[0]
        for i in range(1, len(x_inside)):
            if x_inside[i] - x_inside[i-1] > 1:
                segments.append((segment_start, x_inside[i-1]))
                segment_start = x_inside[i]
        segments.append((segment_start, x_inside[-1]))
        
        # Look for unfilled segments that are long enough
        for start, end in segments:
            if end - start >= min_segment_length:
                # Check if this segment has unfilled areas
                unfilled_in_segment = False
                for x in range(start, end + 1, step_size):
                    if (x, y) not in filled_areas:
                        unfilled_in_segment = True
                        break
                
                if unfilled_in_segment:
                    return y, 1  # Return y position and direction
    
    return None, None

def create_zigzag_from(start_y, start_direction):
    """Create a zig-zag path starting from a specific y position"""
    path = []
    current_y = start_y
    direction = start_direction
    
    while current_y < height - spacing:
        # Find horizontal segments at this level
        x_inside = np.where(star_mask[current_y] == 255)[0]
        
        if len(x_inside) == 0:
            current_y += spacing
            continue
            
        # Find continuous segments
        segments = []
        segment_start = x_inside[0]
        for i in range(1, len(x_inside)):
            if x_inside[i] - x_inside[i-1] > 1:
                segments.append((segment_start, x_inside[i-1]))
                segment_start = x_inside[i]
        segments.append((segment_start, x_inside[-1]))
        
        # Only process segments that are long enough and have unfilled areas
        valid_segments = []
        for start, end in segments:
            if end - start >= min_segment_length:
                # Check if this segment has unfilled areas
                has_unfilled = any((x, current_y) not in filled_areas 
                                 for x in range(start, end + 1, step_size))
                if has_unfilled:
                    valid_segments.append((start, end))
        
        if len(valid_segments) == 0:
            current_y += spacing
            continue
            
        # Take the first valid segment
        x_start, x_end = valid_segments[0]
        
        # Create horizontal line (only for unfilled areas)
        if direction == 1:  # Left to right
            for x in range(x_start, x_end + 1, step_size):
                if (x, current_y) not in filled_areas:
                    path.append((x, current_y))
            connection_x = x_end
        else:  # Right to left
            for x in range(x_end, x_start - 1, -step_size):
                if (x, current_y) not in filled_areas:
                    path.append((x, current_y))
            connection_x = x_start
        
        # Check if we should make a vertical connection to the next level
        next_y = current_y + spacing
        if next_y < height:
            # Check if there's a valid segment at the next level within reasonable distance
            next_x_inside = np.where(star_mask[next_y] == 255)[0]
            if len(next_x_inside) > 0:
                closest_distance = min([abs(x - connection_x) for x in next_x_inside])
                
                # Only connect if the distance is reasonable
                if closest_distance <= max_gap_distance:
                    path.append((connection_x, next_y))
                    direction *= -1  # Switch direction
                else:
                    # Gap too large, finish this path
                    break
            else:
                # No segment at next level, finish this path
                break
        
        current_y += spacing
    
    return path

# === STAGE-BY-STAGE RECURSION ===
# Create multiple zig-zag paths by finding white space iteratively
max_stages = 5  # Like your drawing shows ~3 stages
stage = 1

def add_vertical_connection(bottom_y, connection_x):
    """Add a vertical connection from bottom fill-in to main structure above"""
    connection_path = []
    
    # Find the nearest filled area above this bottom fill-in
    for search_y in range(bottom_y - spacing, -1, -spacing):
        if any((connection_x + dx, search_y) in filled_areas for dx in range(-10, 11)):
            # Found filled area above, create vertical connection
            connection_path = [(connection_x, search_y), (connection_x, bottom_y)]
            print(f"  -> Added vertical connection from y={search_y} to y={bottom_y}")
            break
    
    return connection_path

while stage <= max_stages:
    start_y, start_direction = find_unfilled_start()
    
    if start_y is None:
        print(f"COMPLETED: No more unfilled areas found after {stage-1} stages")
        break
    
    # Check if this is a "bottom" fill-in (filled areas exist above it)
    is_bottom_fill = any(filled_areas) and any(y < start_y for x, y in filled_areas)
    
    if is_bottom_fill:
        print(f"STAGE {stage}: BOTTOM fill-in detected starting from y={start_y}")
    else:
        print(f"STAGE {stage}: TOP fill-in starting from y={start_y}")
    
    path = create_zigzag_from(start_y, start_direction)
    
    if len(path) > 3:  # Reduced from 5 - accept smaller paths
        all_paths.append(path)
        mark_area_filled(path)
        print(f"  -> Added path with {len(path)} points")
        
        # If it's a bottom fill-in, add vertical connection
        if is_bottom_fill and len(path) > 0:
            # Use the starting x-coordinate of the path for connection
            connection_x = path[0][0]
            connection_path = add_vertical_connection(start_y, connection_x)
            
            if connection_path:
                all_paths.append(connection_path)
                mark_area_filled(connection_path)
        
        stage += 1
    else:
        print(f"  -> Path too small ({len(path)} points), no more substantial areas")
        break

# Draw all paths
for path in all_paths:
    for i in range(len(path) - 1):
        pt1 = path[i]
        pt2 = path[i + 1]
        cv2.line(scaffold_img, pt1, pt2, (0, 255, 0), 2)  # green scaffold line

# === Add Crossover Points ===
# Add crossovers on horizontal segments of all paths
for path in all_paths:
    for i in range(len(path) - 1):
        pt1 = np.array(path[i])
        pt2 = np.array(path[i + 1])
        
        # Only add crossovers on horizontal segments (same y-coordinate)
        if pt1[1] == pt2[1]:  # Same y-coordinate means horizontal line
            dist = np.linalg.norm(pt2 - pt1)
            num_cross = int(dist // crossover_spacing)
            for j in range(1, num_cross + 1):
                t = j / (num_cross + 1)
                x, y = pt1 + t * (pt2 - pt1)
                cv2.circle(scaffold_img, (int(x), int(y)), 3, (255, 0, 255), -1)  # magenta crossover

# === Show Result ===
plt.figure(figsize=(6, 6))
plt.imshow(scaffold_img)
plt.title("Zig-Zag Scaffold Routing with Crossovers in Star Shape")
plt.axis('off')
plt.show() 