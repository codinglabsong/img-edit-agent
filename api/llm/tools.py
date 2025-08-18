import os

import replicate
from dotenv import load_dotenv

load_dotenv()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "..", "home.png"), "rb") as file:
    input = {
        "width": 768,
        "height": 768,
        "prompt": "a black and white vintage photo of a house interior",
        "refine": "expert_ensemble_refiner",
        "apply_watermark": False,
        "num_inference_steps": 25,
        "prompt_strength": 0.5,
        "image": file,
    }

    output = replicate.run(
        "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        input=input,
    )

# To write the files to disk:
output_path = os.path.join(SCRIPT_DIR, "..", "output.png")
for index, item in enumerate(output):
    with open(output_path, "wb") as file:
        file.write(item.read())
# => output_0.png written to disk
