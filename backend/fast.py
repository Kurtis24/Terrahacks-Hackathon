import fastapi
from fastapi import Request
import uvicorn
from main import generate_pollinations_image, process_existing_image

app = fastapi.FastAPI()

@app.post("/generate")
def generate_pattern(prompt: str):
    print("🐍 SNAKE PATTERN GENERATOR")
    print("=" * 40)
    print(f"Prompt: Generate a white shadow of a {prompt} with a black background. The design should be basic and have no details, and ensuring all parts are continuously connected and everything is within the outline is filled in with the color white. Make it so that it usually starts narrow at the top and widens as it moves down.")

    # Generate image and process it
    generate_pollinations_image(prompt, output_file="input_shape.png")
    result = process_existing_image("input_shape.png")
    
    return {
        "status": "success",
        "prompt": prompt,
        "result": result
    }

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)