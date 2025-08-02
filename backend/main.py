import requests
import urllib.parse

def generate_pollinations_image(prompt, output_file="output.png"):
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"

    print(f"🧠 Fetching image from: {url}")
    response = requests.get(url)

    if response.status_code == 200:
        with open(output_file, "wb") as f:
            f.write(response.content)
        print(f"✅ Image saved as {output_file}")
    else:
        print(f"❌ Failed with status {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    user_input = input("What would you like me to draw? ")
    final_prompt = f"White silhouette of {user_input} on a black background, minimalistic, no details, solid fill"
    generate_pollinations_image(final_prompt)
