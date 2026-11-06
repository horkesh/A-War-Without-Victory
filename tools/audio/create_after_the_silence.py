"""What Remains of Home: original score played by pinned CC0 recorded samples.

Audition only: writes theme-v3, never runtime assets. Python3.14/NumPy2.4.1,
FFmpeg8.1.2/libsoxr/libvorbis/libmp3lame. Fixed authored timing and seeded room IR.
VSCO2CE commit440300901dfe9275fd84e0b7763af1f8443ae62e, <=120MB selective fetch.
"""
import hashlib
import argparse
import json
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'logs/player-experience-completion-20261105/theme-v3'
CACHE = OUT / 'sample-cache'
COMMIT = '440300901dfe9275fd84e0b7763af1f8443ae62e'
BASE = f'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/{COMMIT}/'
SR = 48000
BUDGET = 120_000_000


def run(args, data=None):
    result = subprocess.run(args, input=data, capture_output=True, timeout=70)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace'))
    return result.stdout


def ff(args, data=None):
    return run(['ffmpeg', '-hide_banner', '-nostdin', '-v', 'error', '-y', *args], data)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fetch(paths):
    if not (OUT / 'vsco-tree.json').exists():
        url = f'https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/{COMMIT}?recursive=1'
        request = urllib.request.Request(url, headers={'User-Agent':'AWWV-audio-source-reproduction'})
        (OUT / 'vsco-tree.json').write_bytes(urllib.request.urlopen(request, timeout=30).read())
    tree = json.loads((OUT / 'vsco-tree.json').read_text())['tree']
    sizes = {entry['path']: entry.get('size', 0) for entry in tree}
    blobs = {entry['path']: entry['sha'] for entry in tree if entry['type'] == 'blob'}
    required = set(paths) | {'LICENSE', 'README.md', 'Readme.txt', 'Keys/Upright Piano/MappingChart.txt', 'Keys/Upright Piano/Info.txt'}
    existing = {str(path.relative_to(CACHE)).replace('\\', '/') for path in CACHE.rglob('*') if path.is_file()}
    if sum(sizes.get(name, 0) for name in required | existing) > BUDGET:
        raise RuntimeError('Selective recorded-sample fetch exceeds120MB')
    records = []
    for name in sorted(required | existing):
        target = CACHE / name
        url = BASE + urllib.parse.quote(name)
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(urllib.request.urlopen(url, timeout=45).read())
        data = target.read_bytes()
        git_hash = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if git_hash != blobs[name]:
            raise RuntimeError(f'Sample cache differs from pinned Git blob: {name}')
        records.append(dict(path=name, source_url=url, pinned_commit=COMMIT, bytes=len(data), sha256=sha(data),
                            license='CC0-1.0', credit='Ivy Audio / Simon Dalzell; Versilian Studios' if 'Upright Piano' in name else 'Versilian Studios / Sam Gossner; sample cutting Elan Hickler / Soundemote'))
    if 'CC0 1.0 Universal' not in (CACHE / 'LICENSE').read_text():
        raise RuntimeError('Pinned CC0 license not verified')
    (OUT / 'sample-sources.json').write_text(json.dumps(records, indent=2) + '\n')
    return records


THEME = [
 [(69,0,.75),(74,.75,1.25),(72,2,.5),(76,2.5,.5),(70,3,1)],
 [(69,0,1.5),(65,1.5,.5),(64,2,1),(65,3,1)],
 [(74,0,1),(77,1,.75),(76,1.75,.25),(74,2,1),(72,3,1)],
 [(70,0,1),(69,1,1),(67,2,.5),(64,2.5,.5),(69,3,1)],
 [(65,0,1),(69,1,.5),(74,1.5,1.5),(72,3,1)],
 [(70,0,1),(67,1,1),(65,2,.5),(64,2.5,.5),(67,3,1)],
 [(74,0,1.5),(72,1.75,.25),(69,2,1),(65,3,.5),(64,3.5,.5)],
 [(76,0,1.5),(74,1.5,.5),(70,2,1),(69,3,1)],
]
CHORDS = [[38,45,52,53], [34,41,45,50], [31,38,45,46], [33,40,43,50],
          [41,45,50,52], [40,46,50,55], [34,41,45,50], [33,40,43,49]]


def score():
    bar_lengths = [240 / 66] * 30 + [240 / 60, 240 / 54]
    starts = np.cumsum([0, *bar_lengths]).tolist()
    notes = []
    def add(track, bar, beat, duration, midi, velocity, role):
        index = len(notes)
        timing = [-.012, .018, -.008, .022, .005, -.017, .011][index % 7]
        notes.append(dict(track=track, time=max(0, starts[bar] + beat * bar_lengths[bar] / 4 + timing),
                          duration=duration * bar_lengths[bar] / 4, midi=midi, velocity=velocity, role=role, bar=bar))
    # An intimate fragment foreshadows the theme before its first complete entry.
    for bar, pitch in [(0, 69), (1, 74)]:
        add('piano', bar, 1.1, 2, pitch, 57, 'opening fragment')
    for bar in range(2, 30):
        part = (bar - 2) % 8
        if bar >= 26:
            part = bar - 26
        for index, (midi, beat, duration) in enumerate(THEME[part]):
            register = -12 if bar >= 26 else 0
            # Preserve recognisable contour through the central rise.
            velocity = [65, 74, 68, 71, 62][index % 5] + (3 if 18 <= bar < 26 else -6 if bar >= 26 else 0)
            add('piano', bar, beat, duration, midi + register, velocity, 'eight-bar theme' if bar < 10 else 'theme development')
    for bar in range(30):
        chord = CHORDS[max(0, bar - 2) % 8]
        if bar >= 26:
            chord = CHORDS[(bar - 26) % 8]
        for index, beat in enumerate([0, 1.55, 2.7]):
            add('piano', bar, beat, 2.4, chord[index], [44, 37, 40][index] + (3 if 18 <= bar < 26 else 0), 'broken left-hand voicing')
        if bar % 2 == 0:
            add('piano', bar, .12, 4.6, chord[3], 35, 'quiet inner suspension')
        if bar >= 5:
            add('cello', bar, .1, 4.3, chord[0] + 12, 43 + (10 if 18 <= bar < 26 else 0), 'bowed harmonic floor')
        if 10 <= bar < 26:
            counter = [50, 53, 52, 49, 50, 55, 53, 52][(bar - 10) % 8]
            add('cello', bar, .7, 3.1, counter, 48 if bar < 18 else 57, 'cello counterline')
        if 12 <= bar < 26:
            upper = [69, 65, 67, 70, 69, 67, 65, 64][(bar - 12) % 8]
            add('violin', bar, .25, 4.25, upper, 37 if bar < 18 else 49, 'suspended small-string answer')
            if 18 <= bar < 26 and bar % 2 == 0:
                add('violin', bar, 2.1, 2.1, upper + 2, 37, 'upper suspension')
    for bar in [30, 31]:
        add('piano', bar, 0, 4.5, 38, 39 if bar == 30 else 32, 'unresolved coda bass')
        add('piano', bar, .4, 5.5, 64, 56 if bar == 30 else 45, 'unresolved E over D')
        add('cello', bar, .05, 4.5, 50, 38, 'coda')
    return dict(title='What Remains of Home', duration_seconds=starts[-1] + 7.5, bpm=66, bars=32,
                sections=['0–1 intimate fragment', '2–9 first theme', '10–17 cello-led development',
                          '18–25 emotional rise', '26–29 stripped lower theme', '30–31 unresolved ritard coda'],
                original_theme=THEME, harmony=['Dmadd9','Bbmaj7','Gmadd9','A7sus/A7','Dm/F','E half-diminished','Bbmaj7','A7sus/A7'],
                notes=sorted(notes, key=lambda note: (note['time'], note['track'], note['midi'])))


def sample_map():
    piano = {21 + 2 * index: f'Keys/Upright Piano/Player_dyn2_rr1_{index:03}.wav' for index in range(4, 30, 2)}
    cello = {36:'C1',43:'G1',50:'D2',57:'A2',64:'E3'}
    violin = {55:'G2',62:'D3',69:'A3',76:'E4'}
    return dict(piano=piano, cello={key:f'Strings/Cello Section/susvib/susvib_{name}_v1_1.wav' for key,name in cello.items()},
                violin={key:f'Strings/Violin Section/susVib/VlnEns_susVib_{name}_v1.wav' for key,name in violin.items()})


def room(audio, wet):
    # A quiet diffuse algorithmic room effect around real recorded instruments.
    # Fixed PCG64 impulse: 1.4s tail with pre-delay; no pitched instrument synthesis.
    length = round(1.4 * SR)
    t = np.arange(length) / SR
    rng = np.random.Generator(np.random.PCG64(20261105))
    impulse = rng.standard_normal(length) * np.exp(-t * 5.2)
    impulse[:round(.024 * SR)] = 0
    impulse = np.convolve(impulse, np.ones(7) / 7, mode='same')
    impulse /= np.sqrt(np.sum(impulse**2))
    n = 1 << (len(audio) + length - 1).bit_length()
    spectrum = np.fft.rfft(impulse, n=n)
    for channel in range(2):
        reflected = np.fft.irfft(np.fft.rfft(audio[:, channel], n=n) * spectrum, n=n)[:len(audio)]
        audio[:, channel] += reflected.astype(np.float32) * wet
    return audio


def pcm24(audio):
    integer = np.rint(np.clip(audio, -1, 1) * 8388607).astype('<i4').reshape(-1)
    return integer.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()


def export(name, audio):
    raw = pcm24(audio)
    wav = OUT / f'{name}.wav'
    ff(['-f','s24le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','pcm_s24le',str(wav)], raw)
    ff(['-i',str(wav),'-c:a','libmp3lame','-q:a','2',str(OUT / f'{name}.mp3')])
    return dict(pcm24_sha256=sha(raw), wav_sha256=sha(wav.read_bytes()), peak_dbfs=float(20 * np.log10(np.max(np.abs(audio)))))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--score', type=Path, help='Render an edited score JSON instead of the authored default')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if not run(['ffmpeg','-version']).decode().startswith('ffmpeg version 8.1.2'):
        raise RuntimeError('Documented FFmpeg8.1.2 required')
    mapping = sample_map()
    sources = fetch([path for instrument in mapping.values() for path in instrument.values()])
    composition = json.loads(args.score.read_text()) if args.score else score()
    (OUT / 'score.json').write_text(json.dumps(composition, indent=2) + '\n')
    length = round(composition['duration_seconds'] * SR)
    stems = {name:np.zeros((length,2), dtype=np.float32) for name in ['piano','strings','texture']}
    variants = {}
    assignments = []
    for event in composition['notes']:
        instrument = event['track']; midi = event['midi']
        anchors = mapping[instrument]
        anchor = min(anchors, key=lambda key: (abs(key-midi),key))
        if abs(anchor-midi) > 4:
            raise RuntimeError(f'Excessive pitch transposition: {instrument} {midi} from {anchor}')
        key=(instrument,midi)
        if key not in variants:
            source = CACHE / anchors[anchor]
            probe = json.loads(run(['ffprobe','-v','error','-show_streams','-of','json',str(source)]))['streams'][0]
            rate = round(int(probe['sample_rate']) * 2**((midi-anchor)/12))
            raw = ff(['-i',str(source),'-af',f'asetrate={rate},aresample={SR}:resampler=soxr:precision=28',
                      '-ac','2','-f','f32le','pipe:1'])
            audio = np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
            audio /= max(np.quantile(np.abs(audio),.999),.005)
            variants[key] = audio
            assignments.append(dict(instrument=instrument,midi=midi,anchor=anchor,semitones=midi-anchor,source=anchors[anchor]))
        sample = variants[key]
        sustain = event['duration']
        release = .7 if instrument=='piano' else 1.25
        if instrument == 'piano' and event['role'] in ['broken left-hand voicing', 'quiet inner suspension']:
            # Clear the pedal with the harmony; retain the recorded attack/body.
            bar_seconds = 240 / (60 if event['bar']==30 else 54 if event['bar']==31 else 66)
            bar_start = event['bar'] * 240 / 66
            remaining = bar_start + bar_seconds - event['time']
            sustain = min(sustain, max(.1, remaining - .25))
            release = .3
        wanted = min(round((sustain+release)*SR),len(sample))
        note = sample[:wanted].copy()
        t=np.arange(wanted)/SR
        if instrument=='piano':
            envelope=np.minimum(1,np.maximum(0,(sustain+release-t)/release))
            gain=.21*(event['velocity']/78)**2
            pan=-.12 if event['midi']<58 else .10
        else:
            attack=.44 if instrument=='cello' else .68
            envelope=np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,(sustain+release-t)/release))
            envelope*=.88+.12*np.sin(np.pi*np.minimum(1,t/max(sustain,.1)))
            gain=(.075 if instrument=='cello' else .056)*(event['velocity']/60)**1.6
            pan=-.24 if instrument=='cello' else .28
        envelope[:96]*=np.linspace(0,1,min(96,wanted))
        envelope[-240:]*=np.linspace(1,0,min(240,wanted))
        note*=envelope[:,None]*gain
        note[:,0]*=np.sqrt(1-pan);note[:,1]*=np.sqrt(1+pan)
        start=round(event['time']*SR);end=min(length,start+wanted)
        stems['piano' if instrument=='piano' else 'strings'][start:end]+=note[:end-start]
    (OUT/'note-sample-assignments.json').write_text(json.dumps(assignments,indent=2)+'\n')
    # Air derives from the recorded string/piano room tails, no oscillator pad.
    dry_strings=stems['strings'].copy()
    stems['piano']=room(stems['piano'],.16)
    stems['strings']=room(stems['strings'],.23)
    stems['texture']=room(dry_strings*.065,.8)-dry_strings*.065
    t=np.arange(length)/SR
    fade=np.minimum(1,t/.3)*np.minimum(1,np.maximum(0,(composition['duration_seconds']-t-1/SR)/5))**1.5
    for stem in stems.values():
        stem*=fade[:,None];stem[0]=0;stem[-1]=0
    mix=sum(stems.values())
    # One scalar preserves musical dynamics and stem additivity; no limiter.
    gain=float(min(.74/max(np.max(np.abs(mix)),1e-9),.125/max(np.sqrt(np.mean(mix**2)),1e-9)))
    for stem in stems.values():stem*=gain
    mix=sum(stems.values())
    assert np.isfinite(mix).all() and np.max(np.abs(mix))<=.75
    metrics={name:export('what_remains_of_home' if name=='mix' else 'what_remains_of_home_'+name,audio) for name,audio in {'mix':mix,**stems}.items()}
    wav=OUT/'what_remains_of_home.wav'
    ff(['-i',str(wav),'-map_metadata','-1','-c:a','libvorbis','-q:a','6',str(OUT/'what_remains_of_home.ogg')])
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(wav),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,check=True,timeout=45)
    (OUT/'loudness.log').write_bytes(result.stderr)
    report=dict(title=composition['title'],duration_seconds=composition['duration_seconds'],events=len(composition['notes']),
                event_counts={name:sum(n['track']==name for n in composition['notes']) for name in mapping},
                downloaded_bytes=sum(record['bytes'] for record in sources),sample_count=sum(record['path'].endswith('.wav') for record in sources),
                mix_gain=gain,rms_dbfs=float(20*np.log10(np.sqrt(np.mean(mix**2)))),metrics=metrics,
                toolchain='Python3.14 NumPy2.4.1 FFmpeg8.1.2 libsoxr',approval='Creative audition; human listening and sensitivity approval open')
    (OUT/'render-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
