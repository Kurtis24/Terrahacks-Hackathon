import fastapi
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from main import generate_pollinations_image, process_existing_image
from pydantic import BaseModel

class GenerateRequest(BaseModel):
    prompt: str

app = fastapi.FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.post("/generate")
def generate_pattern(request: GenerateRequest):
    print("🐍 SNAKE PATTERN GENERATOR")
    print("=" * 40)
    print(f"Prompt: {request.prompt}")

    # Generate image and process it
    generate_pollinations_image(request.prompt, output_file="input_shape.png")
    result = process_existing_image("input_shape.png")
    
    # Extract only JSON-serializable data from result
    if result and len(result) >= 4:
        mask, snake_paths, json_file, result_file = result
        
        # Convert snake_paths to simple lists if they exist
        paths_data = []
        if snake_paths:
            for path in snake_paths:
                # Convert each path to a list of [x, y] coordinates
                path_coords = [[int(x), int(y)] for x, y in path]
                paths_data.append(path_coords)
        
        return {
            "status": "success",
            "prompt": request.prompt,
            "json_file": json_file,
            "result_file": result_file,
            "snake_paths_count": len(paths_data) if paths_data else 0,
            "total_points": sum(len(path) for path in paths_data) if paths_data else 0
        }
    else:
        return {
            "status": "error",
            "prompt": request.prompt,
            "message": "Failed to process image"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000) 