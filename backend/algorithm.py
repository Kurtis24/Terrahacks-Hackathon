import cv2
import numpy as np
import matplotlib.pyplot as plt

# === Step 1: Create a Ready-Made Triangle Input ===
# Create a blank black canvas
triangle_img = np.zeros((400, 400), dtype=np.uint8)

# Define triangle vertices (using integer coordinates)
triangle_points = np.array([[100, 300], [200, 100], [300, 300]], np.int32)
triangle_points = triangle_points.reshape((-1, 1, 2))

# Fill the triangle with white (255)
cv2.fillPoly(triangle_img, [triangle_points], 255)

# Save or display the triangle image if desired
cv2.imwrite("triangle_input.png", triangle_img)

# === Step 2: Parameters for Parallel Lines and Scaffold Routing ===
spacing = 10            # Pixels between parallel lines (~2.5 nm spacing)
angle = 0               # Rotation angle (0 = horizontal)
crossover_spacing = 70  # Pixels between crossovers (~21 bp equivalent)

# === Step 3: Preprocess the Triangle Mask ===
# For our algorithm, we need a binary mask with the shape in white on a black background.
# If needed, we invert so that the inside is white.
_, triangle_mask = cv2.threshold(triangle_img, 127, 255, cv2.THRESH_BINARY)

# === Rotation Helper Functions ===
def rotate_image(img, angle):
    (h, w) = img.shape
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_NEAREST)
    return rotated, M

def inverse_rotate_point(x, y, M):
    M_inv = cv2.invertAffineTransform(M)
    px = M_inv[0, 0]*x + M_inv[0, 1]*y + M_inv[0, 2]
    py = M_inv[1, 0]*x + M_inv[1, 1]*y + M_inv[1, 2]
    return int(px), int(py)

# === Step 4: Generate Parallel Lines Inside the Triangle ===
# Optionally, rotate the mask (here angle=0, so no change)
rotated_mask, rot_matrix = rotate_image(triangle_mask, angle)
height, width = rotated_mask.shape
lines = []

# For each row (every 'spacing' pixels), find horizontal segments inside the shape.
for y in range(0, height, spacing):
    inside = False
    x_start = 0
    for x in range(width):
        # Pixel value 255 means inside the triangle
        if rotated_mask[y, x] == 255 and not inside:
            x_start = x
            inside = True
        elif (rotated_mask[y, x] == 0 or x == width - 1) and inside:
            x_end = x
            # Map the points back to the original orientation in case of rotation
            p1 = inverse_rotate_point(x_start, y, rot_matrix)
            p2 = inverse_rotate_point(x_end, y, rot_matrix)
            lines.append((p1, p2))
            inside = False

# === Step 5: Simulate the Scaffold Routing (Zig-Zag Routing) ===
# Create a color image to overlay the scaffold routing on top of the triangle mask.
scaffold_img = cv2.cvtColor(triangle_mask, cv2.COLOR_GRAY2BGR)
scaffold_color = (0, 255, 0)  # Green for the scaffold path
zigzag_path = []

# Draw the scaffold in a zig-zag pattern: alternate the line direction for each row.
for idx, ((x1, y1), (x2, y2)) in enumerate(lines):
    if idx % 2 == 0:
        start, end = (x1, y1), (x2, y2)
    else:
        start, end = (x2, y2), (x1, y1)
    cv2.line(scaffold_img, start, end, scaffold_color, 1)
    zigzag_path.extend([start, end])

# === Step 6: Add Crossovers Along the Scaffold Path ===
# Mark crossover points with small magenta circles along each segment.
for i in range(0, len(zigzag_path) - 1, 2):
    pt1, pt2 = zigzag_path[i], zigzag_path[i + 1]
    distance = np.linalg.norm(np.array(pt2) - np.array(pt1))
    num_crossovers = int(distance // crossover_spacing)
    for j in range(1, num_crossovers + 1):
        t = j / (num_crossovers + 1)
        x = int(pt1[0] + t * (pt2[0] - pt1[0]))
        y = int(pt1[1] + t * (pt2[1] - pt1[1]))
        cv2.circle(scaffold_img, (x, y), 2, (255, 0, 255), -1)  # Magenta circles

# === Step 7: Display the Results ===
fig, axs = plt.subplots(1, 3, figsize=(15, 5))

# Show the original triangle mask
axs[0].imshow(triangle_mask, cmap='gray')
axs[0].set_title("Triangle Input Mask")
axs[0].axis('off')

# Show the detected parallel lines (overlay on the original mask)
# Create an image to visualize parallel lines
lines_img = cv2.cvtColor(triangle_mask, cv2.COLOR_GRAY2BGR)
for (p1, p2) in lines:
    cv2.line(lines_img, p1, p2, (0, 0, 255), 1)  # Red lines
axs[1].imshow(lines_img)
axs[1].set_title("Generated Parallel Lines")
axs[1].axis('off')

# Show the scaffold routing with crossovers
axs[2].imshow(scaffold_img)
axs[2].set_title("Zig-Zag Scaffold Routing with Crossovers")
axs[2].axis('off')

plt.tight_layout()
plt.show()


# import cv2
# import numpy as np
# import matplotlib.pyplot as plt

# # === Parameters ===
# image_path = "your_image.png"  # Replace with your image path
# spacing = 10                   # Pixels between parallel helices (~2.5 nm)
# angle = 0                      # Helix angle (0 = horizontal)
# crossover_spacing = 70         # Pixels between crossovers (~21 bp)

# # === Load and Preprocess Shape ===
# shape_img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
# _, shape_mask = cv2.threshold(shape_img, 200, 255, cv2.THRESH_BINARY_INV)

# # === Rotation Helper Functions ===
# def rotate_image(img, angle):
#     (h, w) = img.shape
#     M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
#     return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_NEAREST), M

# def inverse_rotate_point(x, y, M):
#     M_inv = cv2.invertAffineTransform(M)
#     px = M_inv[0, 0]*x + M_inv[0, 1]*y + M_inv[0, 2]
#     py = M_inv[1, 0]*x + M_inv[1, 1]*y + M_inv[1, 2]
#     return int(px), int(py)

# # === Generate Parallel Lines ===
# rotated_mask, rot_matrix = rotate_image(shape_mask, angle)
# height, width = rotated_mask.shape
# lines = []

# for y in range(0, height, spacing):
#     inside = False
#     x_start = 0
#     for x in range(width):
#         if rotated_mask[y, x] == 255 and not inside:
#             x_start = x
#             inside = True
#         elif (rotated_mask[y, x] == 0 or x == width - 1) and inside:
#             x_end = x
#             p1 = inverse_rotate_point(x_start, y, rot_matrix)
#             p2 = inverse_rotate_point(x_end, y, rot_matrix)
#             lines.append((p1, p2))
#             inside = False

# # === Visualize Zig-Zag Scaffold Path ===
# scaffold_img = cv2.cvtColor(shape_mask, cv2.COLOR_GRAY2BGR)
# scaffold_color = (0, 255, 0)  # Green
# zigzag_path = []

# for idx, ((x1, y1), (x2, y2)) in enumerate(lines):
#     start, end = ((x1, y1), (x2, y2)) if idx % 2 == 0 else ((x2, y2), (x1, y1))
#     cv2.line(scaffold_img, start, end, scaffold_color, 1)
#     zigzag_path.extend([start, end])

# # === Add Crossovers (Every ~21 bp) ===
# for i in range(0, len(zigzag_path) - 1, 2):
#     pt1, pt2 = zigzag_path[i], zigzag_path[i + 1]
#     distance = np.linalg.norm(np.array(pt2) - np.array(pt1))
#     num_crossovers = int(distance // crossover_spacing)
#     for j in range(1, num_crossovers + 1):
#         t = j / (num_crossovers + 1)
#         x = int(pt1[0] + t * (pt2[0] - pt1[0]))
#         y = int(pt1[1] + t * (pt2[1] - pt1[1]))
#         cv2.circle(scaffold_img, (x, y), 2, (255, 0, 255), -1)  # Magenta

# # === Show Result ===
# plt.figure(figsize=(10, 6))
# plt.imshow(scaffold_img)
# plt.title("Zig-Zag Scaffold Routing with Crossovers (~21 bp)")
# plt.axis('off')
# plt.tight_layout()
# plt.show()
