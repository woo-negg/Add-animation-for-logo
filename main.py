from PIL import Image, ImageDraw
import os
import math

logo_path = 'logo.png'
output_gif_path = 'animated_logo_with_dotted_circle.gif'

frame_count = 24
frame_duration = 100  # milliseconds

def create_dotted_circle_frame(logo, angle):
    frame = Image.new('RGBA', logo.size, (255, 255, 255, 0))
    frame.paste(logo, (0, 0), logo)

    circle_radius = int(min(logo.size) * 0.45)
    circle_center = (logo.size[0] // 2, logo.size[1] // 2)
    dot_radius = int(circle_radius * 0.1)
    dot_count = 12

    circle = Image.new('RGBA', logo.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(circle)

    for i in range(dot_count):
        dot_angle = (360 / dot_count) * i + angle
        dot_x = circle_center[0] + circle_radius * math.cos(math.radians(dot_angle)) - dot_radius
        dot_y = circle_center[1] + circle_radius * math.sin(math.radians(dot_angle)) - dot_radius
        draw.ellipse(
            (
                dot_x, dot_y,
                dot_x + 2 * dot_radius, dot_y + 2 * dot_radius
            ),
            fill=(0, 0, 0, 255)
        )

    frame = Image.alpha_composite(frame, circle)

    return frame

logo = Image.open(logo_path).convert('RGBA')

frames = []
for i in range(frame_count):
    angle = (360 / frame_count) * i
    frame = create_dotted_circle_frame(logo, angle)
    frames.append(frame)

frames[0].save(
    output_gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=frame_duration,
    loop=0,
)
