"""Original AWWV sound design. Python 3.14, NumPy 2.4.1, FFmpeg 8.1.2.

No samples, pretrained music model, external composition, or live inputs.
Fixed PCG64 seeds, explicit score and additive/modal synthesis; 48 kHz PCM24.
Usage: python tools/audio/generate_original_soundscape.py [--publish]
Masters/auditions remain under ignored logs; --publish updates OGG + provenance.
The 90-second menu cue has a clean ending (NOT a seamless loop).
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / 'logs/player-experience-completion-20261105/audio-preview'
EFFECTS = {
    'ui_click': (.19, 0, 173, 1.0),
    'ui_hover': (.13, 1, 240, .65),
    'ui_open_panel': (.40, 2, 154, .9),
    'ui_close_panel': (.31, 3, 128, .9),
    'turn_advance': (.61, 4, 110, 1.0),
    'turn_complete': (.66, 5, 165, .9),
    'turn_review_open': (.48, 6, 137, .9),
    'peace_plan_offered': (.69, 7, 146, .9),
}


def air(n, seed, cutoff=1700):
    rng = np.random.Generator(np.random.PCG64(seed))
    raw = rng.standard_normal(n)
    spectrum = np.fft.rfft(raw)
    f = np.fft.rfftfreq(n, 1 / SR)
    spectrum *= (f / (f + 90)) / (1 + (f / cutoff)**4)
    result = np.fft.irfft(spectrum, n=n)
    return result / max(np.std(result), 1e-9)


def effect(cue):
    duration, index, frequency, level = EFFECTS[cue]
    n = round(duration * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    # Fingertip/wood contact, paper slide, soft secondary latch; no beep oscillator.
    for k, start in enumerate([.006, .052 + index * .009, duration * .49]):
        u = np.maximum(0, t - start)
        gate = t >= start
        env = (1 - np.exp(-u * 1800)) * np.exp(-u * (34 - index)) * gate
        wood = sum(np.sin(2 * np.pi * frequency * ratio * u) * weight
                   * np.exp(-u * decay) for ratio, weight, decay in
                   [(1, .48, 10), (2.73, .22, 24), (5.11, .09, 50)])
        x += env * (wood * .35 + air(n, 4100 + index * 31 + k, 1200 + index * 70) * .22) / (1 + k * .8)
    slide = np.sin(np.pi * np.clip(t / duration, 0, 1))**2
    x += air(n, 9300 + index, 700) * slide * (.016 if index < 2 else .035)
    fade = np.minimum(1, t / .004) * np.minimum(1, (duration - t - 1 / SR) / .035)
    x *= np.maximum(0, fade)
    x *= .32 * level / max(np.max(np.abs(x)), 1e-9)
    x[0] = x[-1] = 0
    return x


def music():
    n = 90 * SR
    stems = {name: np.zeros((n, 2)) for name in ['piano', 'strings', 'texture', 'percussion']}
    # V2: an original recurring lower piano figure, suspended answers, and
    # overlapping decays. Uneven spacing avoids a march or triumphant pulse.
    # The E/F friction and falling minor seconds remain unresolved at the end.
    score = []
    for start, bass, upper in [(1.2, 50, 64), (13.6, 50, 65), (26.1, 46, 64),
                               (38.7, 48, 63), (51.3, 50, 64), (63.8, 46, 65)]:
        score.extend([(start, [bass, 57]), (start + 2.3, [upper]),
                      (start + 4.0, [65 if upper == 64 else 64]),
                      (start + 6.8, [57, 62]), (start + 9.4, [53, 64])])
    score.extend([(76.2, [50, 57]), (78.6, [64]), (80.1, [65]),
                  (82.8, [57, 62]), (84.4, [50, 64])])
    for index, (onset, notes) in enumerate(score):
        for voice, midi in enumerate(notes):
            start = round((onset + voice * .13) * SR)
            length = min(13 * SR, n - start)
            t = np.arange(length) / SR
            f = 440 * 2**((midi - 69) / 12)
            tone = np.zeros(length)
            for h in range(1, 9):
                freq = f * h * np.sqrt(1 + .00017 * h * h)
                tone += np.sin(2 * np.pi * freq * t + .09 * h) * np.exp(-t * (.18 + h * .10)) / h**1.65
                tone += .23 * np.sin(2 * np.pi * freq * 1.0013 * t) * np.exp(-t * (.21 + h * .11)) / h**1.65
            tone *= (1 - np.exp(-t * 125)) * .105
            tone += air(length, 700 + index * 2 + voice, 850) * np.exp(-t * 70) * .009
            pan = -.3 if voice == 0 else .3
            for channel, gain in enumerate([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)]):
                stems['piano'][start:start + length, channel] += tone * gain
                # Three quiet early reflections; no long lush hall tail.
                for delay, reflection in [(.137, .12), (.283, .08), (.431, .045)]:
                    d = round(delay * SR)
                    end = min(n, start + d + length)
                    stems['piano'][start + d:end, 1 - channel] += tone[:end - start - d] * gain * reflection
    t = np.arange(n) / SR
    for section, (start_s, notes) in enumerate([(0, [38, 45, 52]), (16, [41, 48, 52]),
                                               (32, [34, 45, 53]), (48, [36, 43, 51]),
                                               (64, [38, 45, 52]), (76, [38, 52, 53])]):
        start = int(start_s * SR)
        length = min(33 * SR, n - start)
        u = np.arange(length) / SR
        env = np.minimum(1, u / 5)**1.5 * np.minimum(1, (length / SR - u) / 7)**1.5
        for voice, midi in enumerate(notes):
            f = 440 * 2**((midi - 69) / 12)
            vibrato = .004 * np.sin(2 * np.pi * 4.1 * u + voice)
            for channel in range(2):
                tone = sum(np.sin(2 * np.pi * (f * (1 + channel * .0009)) * h * u + h * vibrato)
                           / h**1.9 for h in range(1, 8))
                breath = .88 + .12 * np.sin(2 * np.pi * .081 * u + section * .7 + voice)
                stems['strings'][start:start + length, channel] += tone * env * breath * .018
    for channel in range(2):
        noise = air(n, 18043 + channel, 420)
        opening = np.sin(np.pi * t / 90)**2
        grain = air(n, 19317 + channel, 1250)
        stems['texture'][:, channel] = noise * .006 * (1 + .3 * np.sin(2 * np.pi * .073 * t))
        stems['texture'][:, channel] += grain * .003 * opening * (.7 + .3 * np.sin(t * .19 + channel))
        stems['texture'][:, channel] += .004 * np.sin(2 * np.pi * 55.03 * t + .05 * np.sin(t * .31))
        stems['texture'][:, channel] += .002 * opening * np.sin(2 * np.pi * 110.13 * t + .3 * np.sin(t * .13 + channel))
    for index, onset in enumerate([13.1, 33.9, 55.7, 73.4]):
        click = effect('ui_hover') * .018
        start = round(onset * SR)
        stems['percussion'][start:start + len(click)] += click[:, None]
    fade = np.minimum(1, t / 3) * np.minimum(1, (90 - t - 1 / SR) / 5)**2
    for stem in stems.values():
        stem *= np.maximum(0, fade)[:, None]
        stem[0] = stem[-1] = 0
    return stems


def pcm24(samples):
    values = np.rint(np.clip(samples, -1, 1) * 8388607).astype('<i4').reshape(-1)
    return values.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()


def ffmpeg(args, data=None):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', *args], input=data,
                            capture_output=True, timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace'))
    return result.stderr.decode(errors='replace')


def export(name, samples, runtime, publish):
    channels = 1 if samples.ndim == 1 else 2
    raw = pcm24(samples)
    wav = PREVIEW / f'{name}.wav'
    ffmpeg(['-f', 's24le', '-ar', str(SR), '-ac', str(channels), '-i', 'pipe:0', '-c:a', 'pcm_s24le', str(wav)], raw)
    ffmpeg(['-i', str(wav), '-c:a', 'libmp3lame', '-q:a', '2', str(PREVIEW / f'{name}.mp3')])
    if runtime is None:
        return None
    ogg = ROOT / runtime if publish else PREVIEW / f'{name}.ogg'
    ogg.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(['-i', str(wav), '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '5', '-fflags', '+bitexact', str(ogg)])
    # R128 needs gated 400-ms blocks: repeat short cues for measurement only.
    # Runtime duration remains 100–700 ms; do not publish the repeated signal.
    measurement = ['-stream_loop', '-1', '-i', str(ogg), '-t', '3'] if name in EFFECTS else ['-i', str(ogg)]
    summary = ffmpeg([*measurement, '-filter:a', 'ebur128', '-f', 'null', '-'])
    loudness = float(re.findall(r'I:\s*(-?[\d.]+) LUFS', summary)[-1])
    return dict(file=runtime, original_filename=f'{name}.pcm_s24le_48000_{channels}ch',
                original_sha256=hashlib.sha256(raw).hexdigest(), processed_sha256=hashlib.sha256(ogg.read_bytes()).hexdigest(),
                duration_seconds=len(samples) / SR, loudness_lufs=loudness,
                loudness_method='FFmpeg 8.1.2 ebur128 final Summary integrated I, encoded OGG'
                + (' repeated without silence to 3 seconds for gated short-cue measurement' if name in EFFECTS else ''),
                source_url=f'tools/audio/generate_original_soundscape.py#{name}', author='A War Without Victory project',
                license='FIRST_PARTY', license_url=f'docs/audio/LICENSES/{name}.md',
                attribution='A War Without Victory project — original procedural composition and synthesis',
                processing_command='python tools/audio/generate_original_soundscape.py '
                + ('--music-only --publish' if name == 'menu_theme' else '--publish'),
                license_note=f'docs/audio/LICENSES/{name}.md',
                sensitive_content_class='restrained_music' if name == 'menu_theme' else 'neutral_ui',
                disposition='provided', notes='Original fixed-seed synthesis; no samples or quotations. '
                + ('Revision 2: recurring low piano motif, overlapping bowed suspensions and evolving analogue grain; '
                   '90-second clean ending, not a seamless loop.' if name == 'menu_theme' else 'Layered tactile mechanism, paper and damped wood.'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--music-only', action='store_true', help='Revise music without rewriting eight unchanged effects')
    args = parser.parse_args()
    PREVIEW.mkdir(parents=True, exist_ok=True)
    records = {}
    stems = music()
    mix = sum(stems.values())
    records['menu_theme'] = export('menu_theme', mix, 'src/ui/map/assets/audio/music/menu_original.ogg', args.publish)
    for name, samples in stems.items():
        export(f'menu_stem_{name}', samples, None, args.publish)
    reel = []
    for name in ([] if args.music_only else EFFECTS):
        samples = effect(name)
        records[name] = export(name, samples, f'src/ui/map/assets/audio/designed/{name}.ogg', args.publish)
        reel.extend([samples, np.zeros(SR)])
    if reel:
        export('effects_reel', np.concatenate(reel), None, args.publish)
    if args.publish:
        manifest_path = ROOT / 'docs/audio/AUDIO_ASSET_PROVENANCE.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        for cue, record in records.items():
            old = manifest['cues'][cue]
            if old['file'] != record['file'] and old['disposition'] == 'provided':
                record['previous_versions'] = [old]
            elif 'previous_versions' in old:
                record['previous_versions'] = old['previous_versions']
            manifest['cues'][cue] = record
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    report = {name: {'duration': len(samples) / SR, 'peak_dbfs': float(20 * np.log10(np.max(np.abs(samples)))),
                     'pcm24_sha256': hashlib.sha256(pcm24(samples)).hexdigest()}
              for name, samples in {**({} if args.music_only else {cue: effect(cue) for cue in EFFECTS}), 'menu_theme': mix, **stems}.items()}
    (PREVIEW / ('music-v2-metrics.json' if args.music_only else 'render_metrics.json')).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'rendered': len(records), 'preview': str(PREVIEW), 'publish': args.publish}))


if __name__ == '__main__':
    main()
