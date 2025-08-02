import requests
import urllib.parse
import os
import time
from algo_v2 import *

def run_snake_pattern_analysis(mask, shape_name="generated_shape"):
    """
    Run the snake pattern algorithm on the loaded image and save to JSON with gap-filling
    """
    print("\n" + "="*60)
    print("🐍 RUNNING ENHANCED SNAKE PATTERN ALGORITHM")
    print("="*60)
    
    # Generate snake pattern with array output and gap filling
    print("🔄 Generating snake pattern with recursive gap filling...")
    start_time = time.time()
    snake_paths, scaffold_array = generate_snake_pattern(
        mask, 
        array_shape=(300, 300), 
        return_array=True, 
        enable_gap_filling=True
    )
    generation_time = time.time() - start_time
    
    # Create unique filenames with timestamp
    timestamp = int(time.time())
    json_filename = f"snake_paths_{shape_name}_{timestamp}.json"
    output_filename = f"snake_pattern_{shape_name}_{timestamp}.png"
    
    # Save to JSON file with gap-filling information
    print("💾 Saving coordinates to JSON with gap-filling data...")
    json_data = save_snake_paths_to_json(
        snake_paths, 
        scaffold_array, 
        shape_name, 
        json_filename, 
        gap_filling_enabled=True
    )
    
    # Extract statistics from JSON data
    initial_count = json_data['summary']['initial_snake_count']
    gap_count = json_data['summary']['gap_filling_snake_count']
    initial_points = json_data['summary']['initial_coordinates']
    gap_points = json_data['summary']['gap_filling_coordinates']
    total_points = json_data['summary']['total_coordinates']
    
    # Print detailed analysis
    print(f"\n📊 ALGORITHM RESULTS:")
    print(f"   ⏱️  Generation Time: {generation_time:.2f} seconds")
    print(f"   🐍 Total Snake Paths: {len(snake_paths)}")
    print(f"   📈 Initial Paths: {initial_count} ({initial_points:,} points)")
    if gap_count > 0:
        print(f"   🔍 Gap-Filling Paths: {gap_count} ({gap_points:,} points)")
        improvement = (gap_points / initial_points * 100) if initial_points > 0 else 0
        print(f"   📈 Coverage Improvement: +{improvement:.1f}% more points")
    
    print(f"   📊 Total Points Generated: {total_points:,}")
    print(f"   📏 Average Points per Path: {total_points/len(snake_paths):,.0f}")
    
    # Scaffold array information
    scaffold_pixels = np.sum(scaffold_array)
    scaffold_density = scaffold_pixels / (scaffold_array.shape[0] * scaffold_array.shape[1]) * 100
    print(f"   📋 Scaffold Array Shape: {scaffold_array.shape}")
    print(f"   🎯 Scaffold Pixels: {scaffold_pixels:,}")
    print(f"   📊 Scaffold Density: {scaffold_density:.2f}%")
    
    # Calculate coverage metrics
    shape_pixels = np.sum(mask == 255)
    coverage_ratio = total_points / shape_pixels if shape_pixels > 0 else 0
    print(f"   🎯 Shape Coverage Ratio: {coverage_ratio:.2f}x")
    print(f"   📐 Shape Dimensions: {mask.shape[1]}x{mask.shape[0]} pixels")
    print(f"   ⚪ Shape Area: {shape_pixels:,} white pixels")
    
    # Create visualization
    print(f"\n🎨 Creating visualizations...")
    result = visualize_snake_pattern(mask, snake_paths, output_filename)
    
    # Create enhanced visualization (different colors for initial vs gap-filling)
    enhanced_filename = f"enhanced_pattern_{shape_name}_{timestamp}.png"
    enhanced_result = visualize_snake_pattern_enhanced(mask, snake_paths, enhanced_filename)
    
    # Create scaffold array visualization
    scaffold_filename = f"scaffold_array_{shape_name}_{timestamp}.png"
    scaffold_fig = visualize_scaffold_array(
        scaffold_array, 
        title=f"Enhanced Scaffold Array - {shape_name.title()}", 
        save_path=scaffold_filename
    )
    
    print(f"✅ Pattern visualization saved as: {output_filename}")
    print(f"✅ Enhanced visualization saved as: {enhanced_filename}")
    print(f"✅ Scaffold array saved as: {scaffold_filename}")
    print(f"✅ JSON coordinates saved as: {json_filename}")
    print(f"📁 Total files created: 4")
    
    # Gap filling summary
    if gap_count > 0:
        print(f"\n🎯 GAP FILLING SUMMARY:")
        print(f"   🔍 Gaps identified and filled: {gap_count}")
        print(f"   📈 Additional coverage: {gap_points:,} points")
        print(f"   📊 Improvement factor: {json_data['summary']['coverage_improvement']['improvement_factor']:.2f}x")
        
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
        
        return mask, snake_paths, result_file
        
    except Exception as e:
        print(f"❌ Error processing image: {str(e)}")
        return None, None, None

if __name__ == "__main__":
    print("🐍 SNAKE PATTERN GENERATOR")
    print("=" * 40)

    user_input = input("\nWhat shape would you like me to generate? ")
    final_prompt = f"Generate a white shadow of a {user_input} with a black background. The design should be basic and have no details, and ensuring all parts are continuously connected and everything is within the outline is filled in with the color white. Make it so that it usally starts narrow at the top and widens as it moves down."
    generate_pollinations_image(final_prompt)
    
