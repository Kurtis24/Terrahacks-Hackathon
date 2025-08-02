import requests
import urllib.parse
import os
import time
from algo_v2 import *

def run_snake_pattern_analysis(mask, shape_name="generated_shape"):
    """
    Run the snake pattern algorithm on the loaded image and save to JSON
    """
    print("\n" + "="*60)
    print("🐍 RUNNING SNAKE PATTERN ALGORITHM")
    print("="*60)
    
    # Generate snake pattern with array output
    print("🔄 Generating snake pattern...")
    start_time = time.time()
    snake_paths, scaffold_array, pink_branches = generate_snake_pattern(mask, array_shape=(300, 300), return_array=True)
    generation_time = time.time() - start_time
    
    # Create unique filenames with timestamp
    timestamp = int(time.time())
    output_filename = f"snake_pattern_{shape_name}_{timestamp}.png"
    json_filename = f"path.json"
    
    # Print detailed analysis
    print(f"\n📊 ALGORITHM RESULTS:")
    print(f"   ⏱️  Generation Time: {generation_time:.2f} seconds")
    print(f"   🐍 Number of Snake Paths: {len(snake_paths)}")
    
    total_points = 0
    for i, path in enumerate(snake_paths):
        points = len(path)
        total_points += points
        snake_name = "Left Snake" if i == 0 else "Right Snake"
        print(f"   🔸 {snake_name}: {points:,} points")
    
    print(f"   📈 Total Points Generated: {total_points:,}")
    print(f"   📏 Average Points per Snake: {total_points/len(snake_paths):,.0f}")
    
    # Calculate coverage metrics
    shape_pixels = np.sum(mask == 255)
    coverage_ratio = total_points / shape_pixels if shape_pixels > 0 else 0
    print(f"   🎯 Shape Coverage Ratio: {coverage_ratio:.2f}x")
    print(f"   📐 Shape Dimensions: {mask.shape[1]}x{mask.shape[0]} pixels")
    print(f"   ⚪ Shape Area: {shape_pixels:,} white pixels")
    
    # Create visualization first
    print(f"\n🎨 Creating visualization...")
    result = visualize_snake_pattern(mask, snake_paths, output_filename, pink_branches)
    
    # Save line coordinates to JSON for 300x300 grid after visualization
    print("💾 Saving line coordinates to JSON...")
    json_data = save_line_coordinates_to_json(snake_paths, scaffold_array, shape_name, json_filename, target_size=300, pink_branches=pink_branches)
    
    # Line coordinates information
    print(f"   📋 Grid Size: 300x300 pixels")
    print(f"   🐍 Combined Snake Pixels: {json_data['summary']['total_snake_pixels']:,} (🟢 Green: {json_data['summary']['total_green_pixels']:,}, 🔴 Red: {json_data['summary']['total_red_pixels']:,})")
    print(f"   🌸 Pink Branch Pixels: {json_data['summary']['total_pink_pixels']:,}")
    print(f"   📊 Total Line Pixels: {json_data['summary']['total_line_pixels']:,}")
    
    # Create scaffold array visualization
    scaffold_filename = f"scaffold_array_{shape_name}_{timestamp}.png"
    scaffold_fig = visualize_scaffold_array(
        scaffold_array, 
        title=f"Scaffold Array - {shape_name.title()}", 
        save_path=scaffold_filename
    )
    
    print(f"✅ Pattern visualization saved as: {output_filename}")
    print(f"✅ Scaffold array saved as: {scaffold_filename}")
    print(f"✅ JSON coordinates saved as: {json_filename}")
    print(f"📁 Total files created: 3")
    print("="*60)
    
    return snake_paths, scaffold_array, json_filename, output_filename

def generate_pollinations_image(prompt, output_file="input_shape.png"):
    """
    Generate an image using Pollinations AI and run snake pattern analysis
    """
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"

    print(f"🧠 Fetching image from: {url}")
    response = requests.get(url)

    if response.status_code == 200:
        # Save the generated image
        with open(output_file, "wb") as f:
            f.write(response.content)
        
        print(f"✅ Image saved as: {output_file}")
        
        # Load and process the image
        try:
            mask = load_shape_image(output_file)
            print(f"📥 Successfully loaded image: {mask.shape[1]}x{mask.shape[0]} pixels")
            
            # Run snake pattern analysis
            snake_paths, scaffold_array, json_file, result_file = run_snake_pattern_analysis(mask, "ai_generated")
            
            print(f"\n🎉 PROCESS COMPLETE!")
            print(f"   📄 Input Image: {output_file}")
            print(f"   🐍 Snake Pattern Result: {result_file}")
            print(f"   📋 JSON Data: {json_file}")
            
            return mask, snake_paths, result_file
            
        except Exception as e:
            print(f"❌ Error processing image: {str(e)}")
            return None, None, None
        
    else:
        print(f"❌ Failed to generate image. Status: {response.status_code}")
        print(response.text)
        return None, None, None

def process_existing_image(image_path):
    """
    Process an existing image file with snake pattern algorithm
    """
    if not os.path.exists(image_path):
        print(f"❌ Image file not found: {image_path}")
        return None, None, None
    
    try:
        mask = load_shape_image(image_path)
        print(f"📥 Successfully loaded existing image: {image_path}")
        print(f"   📐 Dimensions: {mask.shape[1]}x{mask.shape[0]} pixels")
        
        # Extract filename without extension for naming
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        
        # Run snake pattern analysis
        snake_paths, scaffold_array, json_file, result_file = run_snake_pattern_analysis(mask, base_name)
        
        print(f"\n🎉 PROCESSING COMPLETE!")
        print(f"   📄 Input Image: {image_path}")
        print(f"   🐍 Snake Pattern Result: {result_file}")
        print(f"   📋 JSON Data: {json_file}")
        
        return mask, snake_paths, json_file, result_file
        
    except Exception as e:
        print(f"❌ Error processing image: {str(e)}")
        return None, None, None, None

def process_test_shape(shape_type="triangle"):
    """
    Process a test shape with snake pattern algorithm
    """
    print(f"🔧 Creating test {shape_type} shape...")
    shapes = create_test_shapes()
    
    if shape_type not in shapes:
        print(f"❌ Unknown shape type: {shape_type}")
        print(f"   Available shapes: {list(shapes.keys())}")
        return None, None, None, None
    
    mask = shapes[shape_type]
    print(f"✅ Created {shape_type} shape: {mask.shape[1]}x{mask.shape[0]} pixels")
    
    # Save the test shape for reference
    test_image_path = f"test_{shape_type}_shape.png"
    cv2.imwrite(test_image_path, mask)
    print(f"💾 Test shape saved as: {test_image_path}")
    
    # Run snake pattern analysis
    snake_paths, scaffold_array, json_file, result_file = run_snake_pattern_analysis(mask, f"test_{shape_type}")
    
    print(f"\n🎉 PROCESSING COMPLETE!")
    print(f"   📄 Test Shape: {test_image_path}")
    print(f"   🐍 Snake Pattern Result: {result_file}")
    print(f"   📊 JSON Coordinates: {json_file}")
    
    return mask, snake_paths, json_file, result_file

if __name__ == "__main__":
    print("🐍 SNAKE PATTERN GENERATOR")
    print("=" * 40)

    user_input = input("\nWhat shape would you like me to generate? ")
    final_prompt = f"Generate a white shadow of a {user_input} with a black background. The design should be basic and have no details, and ensuring all parts are continuously connected and everything is within the outline is filled in with the color white. Make it so that it usually starts narrow at the top and widens as it moves down."
    generate_pollinations_image(final_prompt)
    
