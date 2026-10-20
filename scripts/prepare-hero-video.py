#!/usr/bin/env python3
"""Render the client-supplied installation videos into a silent seamless hero loop.

Usage: python3 scripts/prepare-hero-video.py --source-directory /path/to/originals
Requires FFmpeg with libx264 and libwebp (or the imageio-ffmpeg Python package).
Originals are read only. Output omits audio, location tags, and source metadata.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHOTS = [
    {'file': '20261017_120924.mp4', 'start': 0.5, 'duration': 4.0, 'mobile_focus': 0.5,
     'scene': 'Kitchen roller shades; cut before the ending camera movement.'},
    {'file': '20261017_120958.mp4', 'start': 2.0, 'duration': 10.0, 'mobile_focus': 0.45,
     'scene': 'Living-room shades rising; omit the pan and shake after 12 seconds.'},
    {'file': 'Video_1.mov', 'start': 22.0, 'duration': 6.5, 'mobile_focus': 0.52,
     'scene': 'Sunroom shades rising; omit later close-ups and handling the shade.'},
]
FADE = 0.625  # Fifteen frames at 24 fps, including the final-to-first dissolve.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-directory', type=Path, required=True)
    parser.add_argument('--ffmpeg')
    args = parser.parse_args()
    ffmpeg = args.ffmpeg or shutil.which('ffmpeg')
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    output = ROOT / 'dist/assets/hero'
    output.mkdir(parents=True, exist_ok=True)
    inputs = []
    sources = []
    for shot in SHOTS:
        source = args.source_directory / shot['file']
        sources.append({**shot, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
        inputs += ['-ss', str(shot['start']), '-t', str(shot['duration']), '-i', str(source)]

    variants = []
    for name, width, height, crf in [('desktop', 1280, 720, 26), ('mobile', 576, 1024, 28)]:
        filters = []
        for i, shot in enumerate(SHOTS):
            size = (f'scale=-2:{height},crop={width}:{height}:(iw-ow)*{shot["mobile_focus"]}:0'
                    if name == 'mobile' else f'scale={width}:{height}')
            filters.append(f'[{i}:v]{size},setsar=1,format=yuv420p,'
                           f'setpts=PTS-STARTPTS,fps=24,settb=1/24[v{i}]')
        filters += [
            '[v0]split=2[first][head]',
            f'[head]trim=duration={FADE},setpts=PTS-STARTPTS,fps=24[loophead]',
            f'[first][v1]xfade=transition=fade:duration={FADE}:offset=3.375,fps=24[ab]',
            f'[ab][v2]xfade=transition=fade:duration={FADE}:offset=12.75,fps=24[abc]',
            f'[abc][loophead]xfade=transition=fade:duration={FADE}:offset=18.625,'
            f'trim=start={FADE}:end=19.25,setpts=PTS-STARTPTS,format=yuv420p[out]',
        ]
        target = output / f'window-treatments-{name}.mp4'
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'warning', '-y', *inputs,
                        '-filter_complex', ';'.join(filters), '-map', '[out]', '-an', '-sn', '-dn',
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
                        '-profile:v', 'high', '-level:v', '3.1', '-pix_fmt', 'yuv420p',
                        '-g', '48', '-keyint_min', '48', '-sc_threshold', '0', '-r', '24', '-fps_mode', 'cfr',
                        '-map_metadata', '-1', '-map_chapters', '-1',
                        '-movflags', '+faststart', str(target)], check=True)
        poster = output / f'window-treatments-{name}-poster.webp'
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'warning', '-y', '-i', str(target),
                        '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82',
                        '-map_metadata', '-1', str(poster)], check=True)
        variants.append({'name': name, 'width': width, 'height': height,
                         'video': str(target.relative_to(ROOT / 'dist')), 'bytes': target.stat().st_size,
                         'poster': str(poster.relative_to(ROOT / 'dist')), 'poster_bytes': poster.stat().st_size})
        print(f'{name}: {target.stat().st_size / 1_000_000:.2f} MB')
    manifest = {'date': '2026-10-20', 'duration_seconds': 18.625, 'fps': 24,
                'transition_seconds': FADE, 'audio': False, 'sources': sources, 'variants': variants,
                'loop': 'Final scene dissolves into the first scene; starts at the matching frame after the initial overlap.'}
    (ROOT / 'content/hero-video.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
