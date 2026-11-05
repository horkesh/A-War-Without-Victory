"""Repair Kenney game_over Ogg timestamps without transcoding or source mutation.

FFmpeg 8.1.2 required. +genpts repairs missing PTS; bitexact fixes Ogg serials
and suppresses machine/build metadata. Verify regenerates in a temporary path.
"""
import argparse
import hashlib
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'src/ui/map/assets/audio/ui/game_over.ogg'
TARGET = ROOT / 'src/ui/map/assets/audio/compat/game_over.ogg'
SOURCE_HASH = 'e951505044de0d5d87b72ce7f312ac3fbbdde025ec8c10db70f9d2651a2c8947'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def remux(target):
    version = subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True, timeout=10).stdout.decode()
    if not version.startswith('ffmpeg version 8.1.2'):
        raise RuntimeError('Reproduction requires documented FFmpeg 8.1.2')
    if digest(SOURCE) != SOURCE_HASH:
        raise RuntimeError('Original Kenney source hash differs; refusing to remux')
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', '-fflags', '+genpts',
                    '-i', str(SOURCE), '-map_metadata', '-1', '-c:a', 'copy',
                    '-fflags', '+bitexact', str(target)], capture_output=True, check=True, timeout=30)
    if not target.read_bytes().startswith(b'OggS') or digest(SOURCE) != SOURCE_HASH:
        raise RuntimeError('Invalid remux or mutated original source')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.verify:
        with tempfile.TemporaryDirectory(prefix='awwv-audio-remux-') as directory:
            regenerated = Path(directory) / 'game_over.ogg'
            remux(regenerated)
            if digest(regenerated) != digest(TARGET):
                raise RuntimeError('Compatibility asset differs from deterministic remux')
    else:
        remux(TARGET)
    print(digest(TARGET))
