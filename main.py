from PIL import Image, ImageDraw, ImageOps
import os
import math

logo_path = 'logo.png'
output_gif_path = 'animated_logo_with_loading_circle.gif'

frame_count = 24
frame_duration = 100  # milliseconds

def create_blinking_frame(logo, visible, angle):
    frame = Image.new('RGBA', logo.size, (255, 255, 255, 0))

    if visible:
        frame.paste(logo, (0, 0), logo)

    circle_radius = int(min(logo.size) * 0.4)
    circle_thickness = int(circle_radius * 0.1)
    circle_center = (logo.size[0] // 2, logo.size[1] // 2)

    circle = Image.new('RGBA', logo.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(circle)
    draw.ellipse(
        (
            circle_center[0] - circle_radius,
            circle_center[1] - circle_radius,
            circle_center[0] + circle_radius,
            circle_center[1] + circle_radius
        ),
        outline=(0, 0, 0, 255),
        width=circle_thickness
    )

    circle = circle.rotate(angle, resample=Image.BICUBIC, center=circle_center)
    frame = Image.alpha_composite(frame, circle)

    return frame

logo = Image.open(logo_path).convert('RGBA')

frames = []
for i in range(frame_count):
    angle = (360 / frame_count) * i
    frame = create_blinking_frame(logo, i % 2 == 0, angle)
    frames.append(frame)

frames[0].save(
    output_gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=frame_duration,
    loop=0,
)
