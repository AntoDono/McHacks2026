from gumloop import GumloopClient
import os
# Initialize the client
client = GumloopClient(
    api_key=os.getenv("GUMLOOP_API_KEY"),
    user_id=os.getenv("GUMLOOP_USER_ID"),
)

# Run a flow and wait for outputs
output = client.run_flow(",
    flow_id=os.getenv("GUMLOOP_FLOW_ID"),
    inputs={
        "image": "https://img.freepik.com/free-photo/close-up-portrait-man-shirt-mockup_23-2149260894.jpg?semt=ais_hybrid&w=740&q=80&qqq=1"
    }
)

# download the images into temp folder
# {'image_0': [url], 'image_180': [url], 'image_270': [url], 'image_90': [url]}

import tempfile
import requests

temp_dir = tempfile.gettempdir()
for key, url_list in output.items():
    url = url_list[0]  # Extract the URL from the list
    response = requests.get(url)
    with open(f"{temp_dir}/{key}.png", "wb") as f:
        print(f"Downloading {url} to {temp_dir}/{key}.png")
        f.write(response.content)