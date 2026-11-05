"""Separate sampled continuation audition; frozen v3 source/cache/output are read-only.

python tools/audio/create_theme_continuation.py --preflight-only
python tools/audio/create_theme_continuation.py [--score edited-score.json]
Pinned CC0 recordings, original theme, 44 bars, 66→80→96 BPM then quiet ritard.
No runtime integration. NumPy2.4.1/Python3.14/FFmpeg8.1.2; no new dependencies.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
import numpy as np
import create_after_the_silence as base

ROOT=base.ROOT
OLD=base.OUT
OUT=OLD.parent/'theme-v4'
CACHE=OUT/'sample-cache'
SR=base.SR
NEW_PATHS=([f'Strings/Viola Section/susvib/ViolaEns_susvib_{n}_v1_1.wav' for n in ['G2','D3','A3']]
 +[f'Strings/Cello Section/spic/spic_{n}_v1_RR1.wav' for n in ['C1','G1','D2','A2']]
 +[f'Percussion/Timpani/Timpani{i}_Hit_v3_rr1_Sum.wav' for i in range(1,6)]
 +['Percussion/Timpani/Rolls/Timpani1_Roll_v3_rr1_Sum.wav','Miscellania Raw/Misc 2/rtomtom_frame.wav','Miscellania Raw/Misc 2/rtomtom_frame2.wav'])


def sources():
    tree={entry['path']:entry for entry in json.loads((OLD/'vsco-tree.json').read_text())['tree']}
    previous=json.loads((OLD/'sample-sources.json').read_text())
    if sum(record['bytes'] for record in previous)+sum(tree[path]['size'] for path in NEW_PATHS)>120_000_000:
        raise RuntimeError('Combined selected-source budget exceeds120MB')
    records=[]
    for path in NEW_PATHS:
        file=CACHE/path;file.parent.mkdir(parents=True,exist_ok=True)
        url=base.BASE+urllib.parse.quote(path)
        if not file.exists():file.write_bytes(urllib.request.urlopen(url,timeout=45).read())
        data=file.read_bytes()
        if hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=tree[path]['sha']:
            raise RuntimeError('Pinned Git blob differs: '+path)
        records.append(dict(path=path,source_url=url,pinned_commit=base.COMMIT,bytes=len(data),sha256=base.sha(data),license='CC0-1.0',
                            credit='Versilian Studios / Sam Gossner; sample cutting Elan Hickler / Soundemote',cache='theme-v4/sample-cache'))
    for record in previous:
        if base.sha((base.CACHE/record['path']).read_bytes())!=record['sha256']:
            raise RuntimeError('Frozen v3 source differs: '+record['path'])
    # Copy license text only; v3 sample files remain read-only, never rewritten.
    (OUT/'LICENSE-VSCO-CC0.txt').write_bytes((base.CACHE/'LICENSE').read_bytes())
    all_records=[{**record,'cache':'theme-v3/sample-cache (read-only fallback)'}for record in previous]+records
    (OUT/'sample-sources.json').write_text(json.dumps(all_records,indent=2)+'\n')
    return all_records


def locate(path):
    return CACHE/path if (CACHE/path).exists() else base.CACHE/path


def mapping():
    result=base.sample_map()
    result['viola']={55:'G2',62:'D3',69:'A3'}
    result['viola']={m:f'Strings/Viola Section/susvib/ViolaEns_susvib_{n}_v1_1.wav'for m,n in result['viola'].items()}
    result['cello_spic']={m:f'Strings/Cello Section/spic/spic_{n}_v1_RR1.wav'for m,n in {36:'C1',43:'G1',50:'D2',57:'A2'}.items()}
    # Timpani are inharmonic. Anchor to measured dominant resonant partial,
    # not a falsely claimed harmonic fundamental or a filename octave.
    result['timpani']={69+12*np.log2(f/440):f'Percussion/Timpani/Timpani{i}_Hit_v3_rr1_Sum.wav'
                      for i,f in [(1,89.5),(2,180),(3,211),(4,246),(5,282.5)]}
    result['timpani_roll']={69+12*np.log2(91/440):'Percussion/Timpani/Rolls/Timpani1_Roll_v3_rr1_Sum.wav'}
    result['frame']={0:'Miscellania Raw/Misc 2/rtomtom_frame.wav',1:'Miscellania Raw/Misc 2/rtomtom_frame2.wav'}
    return result


def preflight():
    checks=[]
    maps=mapping()
    for instrument in ['viola','cello_spic']:
        for anchor,path in maps[instrument].items():
            raw=base.ff(['-i',str(locate(path)),'-ar',str(SR),'-ac','1','-f','f32le','pipe:1'])
            audio=np.frombuffer(raw,dtype='<f4');segment=audio[4800:min(len(audio),100800)]
            spectrum=np.abs(np.fft.rfft(segment*np.hanning(len(segment))))
            freqs=np.fft.rfftfreq(len(segment),1/SR);expected=440*2**((anchor-69)/12)
            candidates=np.linspace(expected*.955,expected*1.045,721)
            scores=sum(np.interp(candidates*h,freqs,spectrum)/h for h in range(1,7))
            f0=float(candidates[np.argmax(scores)]);cents=float(1200*np.log2(f0/expected))
            if abs(cents)>65 or not np.isfinite(audio).all():raise RuntimeError('New pitched anchor failed: '+path)
            checks.append(dict(instrument=instrument,anchor=anchor,measured_hz=f0,cents=cents,path=path))
    for instrument in ['timpani','timpani_roll','frame']:
        for anchor,path in maps[instrument].items():
            probe=json.loads(base.run(['ffprobe','-v','error','-show_streams','-of','json',str(locate(path))]))['streams'][0]
            checks.append(dict(instrument=instrument,path=path,sample_rate=probe['sample_rate'],duration=probe['duration'],
                               resonant_anchor_midi=float(anchor) if instrument!='frame' else None,
                               pitch_method='Measured dominant inharmonic resonant partial; frame drum unpitched'))
    (OUT/'new-anchor-preflight.json').write_text(json.dumps(checks,indent=2)+'\n')
    return checks


def composition():
    tempos=[66]*16+[80]*8+[96]*16+[66,62,58,54]
    lengths=[240/bpm for bpm in tempos];starts=np.cumsum([0,*lengths]).tolist()
    # Preserve note identity, timing, duration and velocity of original first16 bars.
    notes=[dict(note)for note in base.score()['notes']if note['bar']<16]
    def add(track,bar,beat,duration,midi,velocity,role):
        index=len(notes);human=[-.012,.018,-.008,.022,.005,-.017,.011][index%7]
        notes.append(dict(track=track,bar=bar,time=max(0,starts[bar]+beat*lengths[bar]/4+human),
                          duration=duration*lengths[bar]/4,midi=midi,velocity=velocity,role=role))
    for bar in range(16,40):
        part=(bar-16)%8;chord=base.CHORDS[part];rise=bar>=24
        for index,(midi,beat,duration)in enumerate(base.THEME[part]):
            add('piano',bar,beat,duration,midi,[69,77,72,75,66][index%5]+(2 if rise else 0),'continuation original theme')
        for index,beat in enumerate([0,1.55,2.7]):
            add('piano',bar,beat,2.4,chord[index],[44,38,41][index],'broken left-hand voicing')
        add('cello',bar,.1,4.15,chord[0]+12,54 if rise else 47,'bowed harmonic floor')
        add('viola',bar,.3,4.1,[57,53,58,55,57,55,53,52][part],49 if rise else 40,'distinct middle suspension')
        add('violin',bar,.4,3.8,[69,65,67,70,69,67,65,64][part],47 if rise else 39,'upper suspension')
        if rise:
            add('cello',bar,.8,2.8,[50,53,52,49,50,55,53,52][part],52,'cello counterline')
            for beat in [0,.5,1.5,2,2.5,3.5]:
                pitch=chord[0]+12+(7 if beat in [.5,2.5]else 0)
                add('cello_spic',bar,beat,.36,pitch,42 if beat%1 else 49,'recorded spiccato ostinato')
            if bar>=32:
                # A separate upper answer, not a duplicate sampled orchestra layer.
                add('violin',bar,2.25,1.45,min(79,base.THEME[part][0][0]+5),45,'upper answer')
        # Dark asymmetric pulse, increasing motion without a march/fanfare.
        for beat,velocity in ([(0,40),(2.5,31)]if not rise else [(0,49),(1.5,35),(2.75,42),(3.5,30)]):
            add('frame',bar,beat,.8,0 if beat in [0,2.75]else 1,velocity,'frame drum pulse')
        if bar%2==0:add('timpani',bar,0,2.5,38,44 if rise else 35,'low timpani anchor')
        if rise and bar%2==1:add('timpani',bar,2.5,1.4,50,36,'timpani answer')
        if bar in [23,31,39]:add('timpani_roll',bar,2.3,1.6,38,40 if bar<39 else 46,'phrase-end roll')
    for bar in range(40,44):
        add('piano',bar,0,4.2,38,40-(bar-40)*3,'unresolved coda bass')
        add('piano',bar,.7,4.5,[69,65,64,64][bar-40],57-(bar-40)*4,'quiet fall')
        add('cello',bar,.1,4.3,50,38-(bar-40)*2,'coda')
    return dict(title='What Remains of Home — Continuation',duration_seconds=starts[-1]+6.5,bars=44,
                tempo_events=[dict(bar=bar,bpm=bpm,time=starts[bar])for bar,bpm in enumerate(tempos)if bar==0 or bpm!=tempos[bar-1]],
                bar_starts=starts,bar_tempos=tempos,original_theme=base.THEME,
                sections=['0–15 preserved66BPM opening','16–23 acceleration80BPM with viola/drums',
                          '24–39 fuller96BPM strings and original-theme development','40–43 quiet66→54BPM ritard'],
                notes=sorted(notes,key=lambda note:(note['time'],note['track'],note['midi'])))


def render(comp,excerpt=False):
    length=round(comp['duration_seconds']*SR)
    stems={name:np.zeros((length,2),dtype=np.float32)for name in ['piano','strings','percussion','texture']}
    maps=mapping();variants={};assignments=[]
    events=comp['notes'] if not excerpt else [note for note in comp['notes']if 24<=note['bar']<26]
    offset=comp['bar_starts'][24]if excerpt else 0
    if excerpt:
        length=round(7*SR);stems={name:np.zeros((length,2),dtype=np.float32)for name in stems}
    for event in events:
        instrument=event['track'];midi=event['midi'];anchors=maps[instrument]
        anchor=min(anchors,key=lambda key:(abs(key-midi),key));key=(instrument,midi)
        if instrument!='frame'and abs(anchor-midi)>4:raise RuntimeError(f'Excessive transpose {instrument} {midi} from{anchor}')
        if key not in variants:
            path=anchors[anchor];source=locate(path)
            probe=json.loads(base.run(['ffprobe','-v','error','-show_streams','-of','json',str(source)]))['streams'][0]
            ratio=1 if instrument=='frame'else 2**((midi-anchor)/12)
            rate=round(int(probe['sample_rate'])*ratio)
            raw=base.ff(['-i',str(source),'-af',f'asetrate={rate},aresample={SR}:resampler=soxr:precision=28','-ac','2','-f','f32le','pipe:1'])
            audio=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy();audio/=max(np.quantile(np.abs(audio),.999),.005)
            variants[key]=audio
            assignments.append(dict(instrument=instrument,midi=midi,anchor=float(anchor),semitones=float(midi-anchor)if instrument!='frame'else 0,source=path))
        sample=variants[key];sustain=event['duration'];is_drum=instrument in ['frame','timpani','timpani_roll'];is_spic=instrument=='cello_spic'
        release=.7 if instrument=='piano'else .16 if is_spic else 1.25
        if instrument=='piano'and event['role']in ['broken left-hand voicing','quiet inner suspension']:
            remaining=comp['bar_starts'][event['bar']+1]-event['time'];sustain=min(sustain,max(.1,remaining-.25));release=.3
        wanted=min(round((sustain+release)*SR),len(sample));note=sample[:wanted].copy();t=np.arange(wanted)/SR
        if instrument=='piano':
            envelope=np.minimum(1,np.maximum(0,(sustain+release-t)/release));gain=.21*(event['velocity']/78)**2;pan=-.12 if midi<58 else .10;stem='piano'
        elif is_drum:
            # Preserve real recorded transients; no bowed-string attack envelope.
            envelope=np.minimum(1,np.maximum(0,(sustain+release-t)/.5));gain=(.15 if instrument=='frame'else .16)*(event['velocity']/60)**1.6;pan=-.05 if instrument=='frame'else .08;stem='percussion'
            if instrument=='timpani_roll':envelope*=np.minimum(1,t/.2)*np.minimum(1,np.maximum(0,(sustain+.5-t)/.5))
        else:
            attack=.006 if is_spic else .44 if instrument=='cello'else .68
            envelope=np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,(sustain+release-t)/release))
            if not is_spic:envelope*=.88+.12*np.sin(np.pi*np.minimum(1,t/max(sustain,.1)))
            gain=({'cello':.075,'violin':.056,'viola':.072,'cello_spic':.050}[instrument])*(event['velocity']/60)**1.6
            pan={'cello':-.24,'violin':.28,'viola':.04,'cello_spic':-.29}[instrument];stem='strings'
        attack_samples=min(24 if is_drum else 96,wanted);envelope[:attack_samples]*=np.linspace(0,1,attack_samples)
        end_fade=min(240,wanted);envelope[-end_fade:]*=np.linspace(1,0,end_fade)
        note*=envelope[:,None]*gain;note[:,0]*=np.sqrt(1-pan);note[:,1]*=np.sqrt(1+pan)
        start=max(0,round((event['time']-offset)*SR));end=min(length,start+wanted)
        if start<length:stems[stem][start:end]+=note[:end-start]
    dry_strings=stems['strings'].copy();stems['piano']=base.room(stems['piano'],.16)
    stems['strings']=base.room(stems['strings'],.23);stems['percussion']=base.room(stems['percussion'],.12)
    stems['texture']=base.room(dry_strings*.065,.8)-dry_strings*.065
    t=np.arange(length)/SR;fade=np.minimum(1,t/.3)*np.minimum(1,np.maximum(0,((length-1)/SR-t)/(1 if excerpt else 5)))**1.5
    for audio in stems.values():audio*=fade[:,None];audio[0]=0;audio[-1]=0
    return stems,assignments


def export(name,audio):
    raw=base.pcm24(audio);wav=OUT/(name+'.wav')
    base.ff(['-f','s24le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','pcm_s24le',str(wav)],raw)
    base.ff(['-i',str(wav),'-c:a','libmp3lame','-q:a','2',str(OUT/(name+'.mp3'))])
    return dict(pcm24_sha256=base.sha(raw),wav_sha256=base.sha(wav.read_bytes()),peak_dbfs=float(20*np.log10(np.max(np.abs(audio)))))


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--preflight-only',action='store_true');parser.add_argument('--score',type=Path);args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    if not base.run(['ffmpeg','-version']).decode().startswith('ffmpeg version 8.1.2'):raise RuntimeError('FFmpeg8.1.2 required')
    records=sources();checks=preflight();comp=json.loads(args.score.read_text())if args.score else composition()
    if not 90<=comp['duration_seconds']<=150:raise RuntimeError('Composer duration bound failed')
    if args.preflight_only:
        stems,_=render(comp,True);mix=sum(stems.values());gain=min(1,.7/max(np.max(np.abs(mix)),1e-9));export('preflight_drums_strings',mix*gain)
        energy={name:float(np.sqrt(np.mean(audio**2)))for name,audio in stems.items()}
        if energy['percussion']<=0 or energy['percussion']>=energy['piano']:raise RuntimeError('Percussion missing or masks piano RMS')
        (OUT/'excerpt-preflight.json').write_text(json.dumps(dict(status='PASS',rms=energy,drum_attack_ramp_samples=24),indent=2)+'\n')
        print('Preflight PASS; seven-second excerpt exported');return
    source_hash=base.sha(Path(__file__).read_bytes());base_hash=base.sha(Path(base.__file__).read_bytes())
    (OUT/'score.json').write_text(json.dumps(comp,indent=2)+'\n')
    stems,assignments=render(comp);mix=sum(stems.values());gain=float(min(.70/max(np.max(np.abs(mix)),1e-9),.125/max(np.sqrt(np.mean(mix**2)),1e-9)))
    for audio in stems.values():audio*=gain
    mix=sum(stems.values());assert np.isfinite(mix).all()and np.max(np.abs(mix))<=.71
    name='what_remains_of_home_continuation';metrics={key:export(name if key=='mix'else name+'_'+key,audio)for key,audio in {'mix':mix,**stems}.items()}
    wav=OUT/(name+'.wav');base.ff(['-i',str(wav),'-map_metadata','-1','-c:a','libvorbis','-q:a','6',str(OUT/(name+'.ogg'))])
    result=__import__('subprocess').run(['ffmpeg','-hide_banner','-nostdin','-i',str(wav),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,check=True,timeout=45)
    (OUT/'loudness.log').write_bytes(result.stderr)
    if source_hash!=base.sha(Path(__file__).read_bytes()):raise RuntimeError('Recipe changed during render')
    report=dict(title=comp['title'],duration_seconds=len(mix)/SR,event_count=len(comp['notes']),event_counts={track:sum(n['track']==track for n in comp['notes'])for track in mapping()},
                source_recipe_sha256=source_hash,frozen_v3_recipe_sha256=base_hash,selected_source_bytes=sum(record['bytes']for record in records),
                sample_count=sum(record['path'].endswith('.wav')for record in records),mix_gain=gain,metrics=metrics,
                integrated_lufs=float(re.findall(r'I:\s*(-?[\d.]+) LUFS',result.stderr.decode())[-1]),
                approval='Separate creative audition; human listening/sensitivity approval open; no game integration')
    (OUT/'note-sample-assignments.json').write_text(json.dumps(assignments,indent=2)+'\n');(OUT/'render-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
