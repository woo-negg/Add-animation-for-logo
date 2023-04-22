from PIL import Image
from PIL import Image, ImageEnhance
import os

logo_path = 'logo.png'
output_gif_path = 'animated_logo.gif'

frame_count = 4
frame_duration = 300  # milliseconds

def create_blinking_frame(logo, visible):
    frame = Image.new('RGBA', logo.size, (255, 255, 255, 0))

    if visible:
        frame.paste(logo, (0, 0), logo)

    return frame

logo = Image.open(logo_path).convert('RGBA')

frames = []
for i in range(frame_count):
    frame = create_blinking_frame(logo, i % 2 == 0)
    frames.append(frame)

frames[0].save(
    output_gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=frame_duration,
    loop=0,
)
