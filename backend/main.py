import requests
import urllib.parse
import os
import time
from algo_v2 import *

def run_snake_pattern_analysis(mask, shape_name="generated_shape"):
    """
    Run the snake pattern algorithm on the loaded image and print detailed results
    """
    print("\n" + "="*60)
    print("🐍 RUNNING SNAKE PATTERN ALGORITHM")
    print("="*60)
    
    # Generate snake pattern
    print("🔄 Generating snake pattern...")
    start_time = time.time()
    snake_paths = generate_snake_pattern(mask)
    generation_time = time.time() - start_time
    
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
    
    # Create visualization
    print(f"\n🎨 Creating visualization...")
    output_filename = f"snake_pattern_{shape_name}_{int(time.time())}.png"
    result = visualize_snake_pattern(mask, snake_paths, output_filename)
    
    print(f"✅ Pattern visualization saved as: {output_filename}")
    print("="*60)
    
    return snake_paths, output_filename

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
            snake_paths, result_file = run_snake_pattern_analysis(mask, "ai_generated")
            
            print(f"\n🎉 PROCESS COMPLETE!")
            print(f"   📄 Input Image: {output_file}")
            print(f"   🐍 Snake Pattern Result: {result_file}")
            
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
        snake_paths, result_file = run_snake_pattern_analysis(mask, base_name)
        
        print(f"\n🎉 PROCESSING COMPLETE!")
        print(f"   📄 Input Image: {image_path}")
        print(f"   🐍 Snake Pattern Result: {result_file}")
        
        return mask, snake_paths, result_file
        
    except Exception as e:
        print(f"❌ Error processing image: {str(e)}")
        return None, None, None

if __name__ == "__main__":
    print("🐍 SNAKE PATTERN GENERATOR")
    print("=" * 40)

    user_input = input("\nWhat shape would you like me to generate? ")
    final_prompt = f"Generate a white outline of a {user_input} with a black background. The design should be basic and have no details, and ensuring all parts are continuously connected and everything is within the outline is filled in with the color white. Make it so that it usally starts narrow at the top and widens as it moves down."
    generate_pollinations_image(final_prompt)
    
