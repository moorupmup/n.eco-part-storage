import os
from PIL import Image, ImageDraw

def generate_icons():
    # Source image
    src_path = r'C:\Users\pumpu\.gemini\antigravity\brain\624f4498-10b0-4167-8c7f-1b97ba79a9e1\icon_transparent.png'
    if not os.path.exists(src_path):
        src_path = os.path.abspath('public/icon.png')
    
    im = Image.open(src_path).convert('RGBA')

    # Target densities and sizes: (folder_name, legacy_size, adaptive_size)
    densities = [
        ('mipmap-mdpi', 48, 108),
        ('mipmap-hdpi', 72, 162),
        ('mipmap-xhdpi', 96, 216),
        ('mipmap-xxhdpi', 144, 324),
        ('mipmap-xxxhdpi', 192, 432),
    ]

    base_dir = 'android-res'
    os.makedirs(base_dir, exist_ok=True)
    os.makedirs(os.path.join(base_dir, 'values'), exist_ok=True)

    # 1. Background color xml for adaptive icon
    bg_xml_path = os.path.join(base_dir, 'values', 'ic_launcher_background.xml')
    with open(bg_xml_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#09090b</color>\n</resources>\n')

    bg_color = (9, 9, 11, 255)

    for folder, leg_sz, adapt_sz in densities:
        out_dir = os.path.join(base_dir, folder)
        os.makedirs(out_dir, exist_ok=True)

        # 2. Adaptive foreground (108dp canvas, portafilter icon centered with standard safe zone)
        fg_canvas = Image.new('RGBA', (adapt_sz, adapt_sz), (0, 0, 0, 0))
        fg_icon_sz = int(adapt_sz * 0.72)
        resized_icon = im.resize((fg_icon_sz, fg_icon_sz), Image.Resampling.LANCZOS)
        offset = (adapt_sz - fg_icon_sz) // 2
        fg_canvas.paste(resized_icon, (offset, offset), resized_icon)
        fg_canvas.save(os.path.join(out_dir, 'ic_launcher_foreground.png'), 'PNG')

        # 3. Legacy ic_launcher (rounded squircle with dark background)
        leg_canvas = Image.new('RGBA', (leg_sz, leg_sz), (0, 0, 0, 0))
        draw = ImageDraw.Draw(leg_canvas)
        corner_radius = int(leg_sz * 0.22)
        draw.rounded_rectangle([0, 0, leg_sz - 1, leg_sz - 1], radius=corner_radius, fill=bg_color)
        
        leg_icon_sz = int(leg_sz * 0.76)
        leg_resized = im.resize((leg_icon_sz, leg_icon_sz), Image.Resampling.LANCZOS)
        leg_offset = (leg_sz - leg_icon_sz) // 2
        leg_canvas.paste(leg_resized, (leg_offset, leg_offset), leg_resized)
        leg_canvas.save(os.path.join(out_dir, 'ic_launcher.png'), 'PNG')

        # 4. Legacy round ic_launcher_round (circle)
        round_canvas = Image.new('RGBA', (leg_sz, leg_sz), (0, 0, 0, 0))
        r_draw = ImageDraw.Draw(round_canvas)
        r_draw.ellipse([0, 0, leg_sz - 1, leg_sz - 1], fill=bg_color)
        round_canvas.paste(leg_resized, (leg_offset, leg_offset), leg_resized)
        round_canvas.save(os.path.join(out_dir, 'ic_launcher_round.png'), 'PNG')

    # Also generate Web / PWA / Apple Touch icons in public/
    apple_icon = Image.new('RGBA', (180, 180), bg_color)
    a_resized = im.resize((140, 140), Image.Resampling.LANCZOS)
    apple_icon.paste(a_resized, (20, 20), a_resized)
    apple_icon.save('public/apple-touch-icon.png', 'PNG')

    print('Successfully generated all Android mipmap and web icons in android-res/ and public/!')

if __name__ == '__main__':
    generate_icons()
