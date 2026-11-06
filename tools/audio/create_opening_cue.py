"""35-second title identity, separate from the frozen v3 menu and v4 continuation.

Recorded CC0 strings/timpani only; no piano, frame hits or spiccato. No downloads.
Python3.14/NumPy2.4.1/FFmpeg8.1.2. Run directly; --score accepts an edited score.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import numpy as np
import create_theme_continuation as continuation

base=continuation.base
SR=48000
OUT=base.OUT.parent/'theme-v5-opening'
NAME='what_remains_of_home_opening'


def score():
    # Simplified/tied notes from the original eight-bar A→D theme, transposed
    # two octaves for lead cello. Short subdivisions become articulated bows.
    phrases=[[(45,0,1),(50,1,1.4),(48,2.5,.5),(52,3,1)],
             [(45,0,1.5),(41,1.5,.5),(40,2,1),(41,3,1)],
             [(50,0,1),(53,1,1),(50,2,1),(48,3,1)],
             [(46,0,1),(45,1,1),(43,2,1),(45,3,1)],
             [(41,0,1),(45,1,1),(50,2,1.3),(48,3.3,.7)],
             [(46,0,1),(43,1,1),(40,2,1),(43,3,1)],
             [(50,0,1.5),(48,1.5,.5),(45,2,1),(40,3,1)],
             [(52,0,1),(50,1,1),(52,2,2)]]
    notes=[]
    def add(track,bar,beat,duration,midi,velocity,role):
        time=.5+bar*10/3+beat*5/6
        notes.append(dict(track=track,bar=bar,time=time,duration=duration*5/6,midi=midi,velocity=velocity,role=role))
    for bar,phrase in enumerate(phrases):
        for index,(pitch,beat,duration)in enumerate(phrase):
            add('cello',bar,beat,duration,pitch,[62,68,60,64][index]+(4 if bar==6 else -5 if bar==7 else 0),'lead bowed motif')
        add('viola',bar,.1,4.1,[57,53,58,55,57,55,57,57][bar],42+(bar//2),'middle bowed support')
        if bar>=2:
            add('violin',bar,.4,3.8,[69,65,67,70,69,67,69,64][bar],35+(bar*2 if bar<7 else -3),'warm upper suspension')
    # Low floor is intermittent; it cannot duplicate the cello melody in unison.
    for bar,pitch in [(0,38),(2,43),(4,41),(6,38)]:
        add('cello',bar,0,4.5,pitch,38 if bar<6 else 45,'low harmonic floor')
    add('cello',7,1.8,6.4,38,34,'unresolved coda D under E')
    add('viola',7,2,5.5,64,31,'lingering E suspension')
    add('timpani',3,0,2.2,38,29,'quiet low punctuation')
    add('timpani_roll',6,.6,2.5,38,40,'single low approach swell')
    add('timpani',7,0,2.9,38,47,'single contained arrival')
    return dict(title='What Remains of Home — Opening',purpose='Short title/opening identity; v3 remains calm menu candidate',
                duration_seconds=35,bpm=72,bars=8,opening_offset_seconds=.5,
                tempo_events=[dict(time=.5,bpm=72)],
                sections=['0.5s immediate low/mid bowed A→D identity','gentle warm string rise','~23.83s contained low arrival','unresolved D/E decay to35s'],
                notes=sorted(notes,key=lambda note:(note['time'],note['track'],note['midi'])))


def validate(comp):
    if comp['duration_seconds']!=35:raise RuntimeError('Opening must remain exactly35seconds')
    allowed={'cello','viola','violin','timpani','timpani_roll'}
    if any(note['track']not in allowed for note in comp['notes']):raise RuntimeError('Opening route contains disallowed instrument')
    if sum(note['track'].startswith('timpani')for note in comp['notes'])>4:raise RuntimeError('Opening percussion must remain sparse')
    if not .4<=min(note['time']for note in comp['notes']if note['role']=='lead bowed motif')<=.6:raise RuntimeError('Motif must enter immediately')
    return comp


def render(comp):
    length=35*SR
    stems={name:np.zeros((length,2),dtype=np.float32)for name in ['strings','percussion','texture']}
    maps=continuation.mapping();variants={};assignments=[]
    for event in comp['notes']:
        instrument=event['track'];midi=event['midi'];anchors=maps[instrument]
        anchor=min(anchors,key=lambda pitch:(abs(pitch-midi),pitch))
        if abs(anchor-midi)>4:raise RuntimeError('Pitch shift exceeds verified range')
        key=(instrument,midi)
        if key not in variants:
            path=anchors[anchor];source=continuation.locate(path)
            probe=json.loads(base.run(['ffprobe','-v','error','-show_streams','-of','json',str(source)]))['streams'][0]
            rate=round(int(probe['sample_rate'])*2**((midi-anchor)/12))
            raw=base.ff(['-i',str(source),'-af',f'asetrate={rate},aresample={SR}:resampler=soxr:precision=28','-ac','2','-f','f32le','pipe:1'])
            sample=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
            sample/=max(np.quantile(np.abs(sample),.999),.005)
            variants[key]=sample
            assignments.append(dict(instrument=instrument,midi=midi,anchor=float(anchor),semitones=float(midi-anchor),source=path,
                                    source_sha256=base.sha(source.read_bytes()),source_url=base.BASE+__import__('urllib.parse',fromlist=['quote']).quote(path)))
        sample=variants[key];duration=event['duration'];lead=event['role']=='lead bowed motif';drum=instrument.startswith('timpani')
        release=.55 if lead else 2.1 if not drum else 1.3
        wanted=min(len(sample),round((duration+release)*SR));note=sample[:wanted].copy();t=np.arange(wanted)/SR
        if drum:
            envelope=np.minimum(1,np.maximum(0,(duration+release-t)/.6));gain=.125*(event['velocity']/60)**1.6;pan=.04
            if instrument=='timpani_roll':envelope*=np.minimum(1,t/.35)*np.minimum(1,np.maximum(0,(duration+.4-t)/.4))
            stem='percussion'
        else:
            attack=.08 if lead else .42 if instrument=='cello'else .60
            envelope=np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,(duration+release-t)/release))
            gain=(.135 if lead else .043 if instrument=='cello'else .055 if instrument=='viola'else .045)*(event['velocity']/68)**1.5
            pan=-.10 if lead else -.27 if instrument=='cello'else .05 if instrument=='viola'else .27
            stem='strings'
        ramp=min(24 if drum else 96,wanted);envelope[:ramp]*=np.linspace(0,1,ramp)
        endfade=min(240,wanted);envelope[-endfade:]*=np.linspace(1,0,endfade)
        note*=envelope[:,None]*gain;note[:,0]*=np.sqrt(1-pan);note[:,1]*=np.sqrt(1+pan)
        start=round(event['time']*SR);end=min(length,start+wanted)
        if start<length:stems[stem][start:end]+=note[:end-start]
    dry=stems['strings'].copy()
    stems['strings']=base.room(stems['strings'],.19);stems['percussion']=base.room(stems['percussion'],.12)
    stems['texture']=base.room(dry*.045,.6)-dry*.045
    t=np.arange(length)/SR;fade=np.minimum(1,t/.08)*np.minimum(1,np.maximum(0,(35-t-1/SR)/3.3))**1.5
    for audio in stems.values():audio*=fade[:,None];audio[0]=0;audio[-1]=0
    mix=sum(stems.values());gain=float(min(.72/max(np.max(np.abs(mix)),1e-9),.0915/max(np.sqrt(np.mean(mix**2)),1e-9)))
    for audio in stems.values():audio*=gain
    return stems,assignments,gain


def export(name,audio):
    raw=base.pcm24(audio);wav=OUT/(name+'.wav')
    base.ff(['-f','s24le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','pcm_s24le',str(wav)],raw)
    base.ff(['-i',str(wav),'-c:a','libmp3lame','-q:a','2',str(OUT/(name+'.mp3'))])
    return dict(pcm24_sha256=base.sha(raw),wav_sha256=base.sha(wav.read_bytes()),peak_dbfs=float(20*np.log10(np.max(np.abs(audio)))))


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--score',type=Path);parser.add_argument('--preflight-only',action='store_true');args=parser.parse_args()
    comp=validate(json.loads(args.score.read_text())if args.score else score())
    OUT.mkdir(parents=True,exist_ok=True)
    if args.preflight_only:
        print(json.dumps(dict(duration=35,events=len(comp['notes']),routes=sorted({n['track']for n in comp['notes']}),first_motif=[n['midi']for n in comp['notes']if n['role']=='lead bowed motif'][:4],first_motif_seconds=.5,arrival_seconds=23.833333333333332),indent=2));return
    if not base.run(['ffmpeg','-version']).decode().startswith('ffmpeg version 8.1.2'):raise RuntimeError('Documented FFmpeg8.1.2 required')
    helpers={Path(__file__).name:base.sha(Path(__file__).read_bytes()),Path(base.__file__).name:base.sha(Path(base.__file__).read_bytes()),Path(continuation.__file__).name:base.sha(Path(continuation.__file__).read_bytes())}
    (OUT/'score.json').write_text(json.dumps(comp,indent=2)+'\n')
    stems,assignments,gain=render(comp);mix=sum(stems.values());assert np.isfinite(mix).all()and np.max(np.abs(mix))<=.73
    metrics={name:export(NAME if name=='mix'else NAME+'_'+name,audio)for name,audio in {'mix':mix,**stems}.items()}
    base.ff(['-i',str(OUT/(NAME+'.wav')),'-map_metadata','-1','-c:a','libvorbis','-q:a','6',str(OUT/(NAME+'.ogg'))])
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(OUT/(NAME+'.wav')),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,check=True,timeout=30)
    (OUT/'loudness.log').write_bytes(result.stderr)
    used={record['source']for record in assignments};all_sources=json.loads((continuation.OUT/'sample-sources.json').read_text())
    records=[record for record in all_sources if record['path']in used or record['path']=='LICENSE']
    for record in records:
        if base.sha(continuation.locate(record['path']).read_bytes())!=record['sha256']:raise RuntimeError('Cached source hash drift')
    (OUT/'sample-sources.json').write_text(json.dumps(records,indent=2)+'\n');(OUT/'LICENSE-VSCO-CC0.txt').write_bytes((base.CACHE/'LICENSE').read_bytes())
    (OUT/'note-sample-assignments.json').write_text(json.dumps(assignments,indent=2)+'\n')
    for file in [Path(__file__),Path(base.__file__),Path(continuation.__file__)]:
        if base.sha(file.read_bytes())!=helpers[file.name]:raise RuntimeError('Frozen source changed during render')
    report=dict(title=comp['title'],purpose=comp['purpose'],duration_seconds=35,frames=len(mix),event_count=len(comp['notes']),
                event_counts={track:sum(note['track']==track for note in comp['notes'])for track in sorted({note['track']for note in comp['notes']})},
                frozen_recipe_hashes=helpers,metrics=metrics,mix_gain=gain,downloaded_bytes=0,
                integrated_lufs=float(re.findall(r'I:\s*(-?[\d.]+) LUFS',result.stderr.decode())[-1]),
                true_peak_dbfs=float(re.findall(r'Peak:\s*(-?[\d.]+) dBFS',result.stderr.decode())[-1]),
                approval='Separate short opening audition; human creative/sensitivity approval open; v3 menu unchanged')
    (OUT/'render-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))


if __name__=='__main__':main()
