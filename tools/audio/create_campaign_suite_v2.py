"""Eight revised original campaign auditions; phrase scores and recorded-body sustain.

Reads pinned CC0 caches only. Never writes old recipes/cache/runtime assets. Each
full render requires a fresh attempt below campaign-suite-two. --prepare freezes
source/scores and runs short real-instrument continuity diagnostics before renders.
Technical continuity is not a musical-quality or historical-sensitivity approval.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import numpy as np
import create_campaign_suite as old

base=old.base
ROOT=old.ROOT
HOME=old.HOME.parent/'campaign-suite-two'
SR=48000
TRACKS=('country','lines','winter','radio','life','table','maps','after')
STEMS=old.STEMS
TITLES=old.TITLES
SLUGS=old.SLUGS
DECAY={'piano','harp','timpani'}
# Meter, local beat BPM, section bars, instrumentation and independently authored
# through-section melodic sentences. Durations are proportions of the section;
# exact realized beat/second durations and articulation are exported in score.json.
# A dash is an intentional breath/rest, never an instruction to truncate a bar.
SCORES={
'country': dict(meter='6/8',units=6,bpm=96,bars=[4,12,10,12,10,4],lead='violin',key='D minor / F light',
 labels=['Mist over the valley','The long horizon','A remembered distance','The valley opens','A changed horizon','Still before dawn'],
 melodies=[
 'r:2 62:4 65:3 69:7 r:2',
 '62:3 69:5 72:4 70:2 69:6 65:3 67:3 64:5 r:1 65:3 69:4 74:6 72:2 69:4 67:3 65:3 64:4',
 '69:4 77:6 76:2 72:4 74:5 r:1 72:3 69:5 70:4 65:4 67:6 64:4',
 '74:4 77:5 78:3 78:3 77:5 74:3 76:4 72:5 r:1 70:3 74:5 77:4 76:3 72:4 69:5 67:3 69:5',
 '62:4 69:6 72:4 70:3 69:5 65:4 67:4 64:5 r:2 65:3 62:6 64:5',
 '65:4 62:6 r:2 64:6 r:4'],
 chords=[(38,57,65),(34,58,65),(41,57,64),(36,55,64),(43,58,65),(38,57,65),(34,53,62),(33,55,64),(41,57,65),(36,55,64),(43,55,62),(38,57,64)]),
'lines':dict(meter='4/4',units=4,bpm=78,bars=[4,14,12,14,12,4],lead='piano',key='A minor / C',
 labels=['A blank margin','Two measured lines','The second hand answers','The figures gather','What remains on the page','An unfinished sum'],
 melodies=[
 '64:1 67:1 71:2 r:1 69:1 64:2 62:2 r:2',
 '64:1 71:1 69:2 67:1 62:1 64:3 r:1 60:1 64:1 67:2 65:1 62:1 59:3 r:1 62:1 65:1 69:2 67:1 64:1 60:2 62:2 64:1 67:1 71:2 69:2 64:3 r:1',
 '72:2 67:1 64:1 65:2 69:1 72:1 71:3 r:1 67:1 62:1 65:2 64:1 60:1 62:2 59:2 60:1 64:1 67:2 71:2 69:3 r:1',
 '69:1 72:1 76:2 74:1 71:1 67:2 65:1 69:1 72:2 74:3 r:1 71:1 74:1 77:2 76:1 72:1 69:2 67:1 71:1 74:2 72:1 69:1 65:2 64:2 62:2 64:3 r:1',
 '52:1 59:1 57:2 55:1 50:1 52:3 r:1 60:1 64:1 67:2 65:1 62:1 59:3 r:1 62:1 65:1 69:2 67:1 64:1 60:2 59:2 64:3 r:1',
 '60:2 64:1 67:3 62:2 59:3 r:2 64:3 r:3'],
 chords=[(45,60,64),(38,57,65),(43,59,64),(36,55,64),(41,57,65),(40,56,62),(45,60,64),(36,55,64),(38,57,60),(43,59,65),(41,57,62),(40,56,64)]),
'winter':dict(meter='3/4',units=3,bpm=50,bars=[5,12,9,12,10,5],lead='cello',key='G minor',
 labels=['An empty room','The withheld answer','Breath at the window','The cold reaches inward','One voice returns','The unlit room'],
 melodies=[
 '43:5 r:3 41:3 38:4 r:3',
 '43:5 46:3 45:4 38:6 r:3 41:4 43:6 r:2 46:4 50:5 48:4 45:6 r:4',
 '50:4 48:4 46:7 r:3 41:5 45:3 43:7 r:5',
 '43:4 50:5 51:7 r:2 50:4 46:4 48:6 r:3 45:5 41:4 38:6 r:4 42:4 43:7 r:3',
 '43:6 46:3 45:5 38:6 r:4 41:4 43:8 r:3',
 '46:4 43:6 r:4 45:5 r:4'],
 chords=[(43,58,62),(39,58,60),(41,57,60),(38,54,57),(43,58,62),(36,55,58),(39,55,58),(41,57,60),(38,54,57)]),
'radio':dict(meter='7/8',units=7,bpm=138,bars=[5,13,11,14,13,6],lead='horn',key='E pedal / semitone tension',
 labels=['Carrier without a voice','Three then two then two','A signal displaced','The interference thickens','Waiting without an answer','The carrier remains'],
 melodies=[
 'r:7 52:7 r:5 53:3 r:6 47:7',
 '52:5 r:2 53:2 59:3 r:2 58:5 52:4 r:3 55:3 54:2 r:4 47:7 r:3 52:6 r:5',
 '59:4 60:2 r:3 54:5 r:2 55:3 52:7 r:5 53:2 47:6 r:4 50:3 52:5 r:4',
 '52:3 59:4 r:2 60:3 58:5 r:3 54:4 55:2 52:6 r:3 53:4 59:5 r:4 58:3 54:7 r:5',
 '52:6 r:4 53:2 59:3 r:4 58:5 52:6 r:4 47:7 r:5 52:5 r:5',
 '53:3 r:4 52:7 r:5 47:6 r:7'],
 chords=[(40,55,59),(40,54,60),(40,55,58),(35,54,59),(40,53,59),(36,55,59),(40,54,58),(40,55,59)]),
'life':dict(meter='6/8',units=6,bpm=96,bars=[4,12,10,12,10,4],lead='clarinet',key='G major / E minor shade',
 labels=['Light on a familiar wall','The remembered garden','Someone opens the door','The memory becomes clear','The garden after rain','A small warmth remains'],
 melodies=[
 '67:3 71:2 74:4 r:2 69:3 67:4 r:2',
 '71:3 74:2 78:4 78:2 74:3 72:2 71:4 r:2 69:2 67:3 71:3 74:4 r:2 72:3 69:4 67:5 r:2',
 '64:3 67:2 71:4 69:3 66:4 r:2 67:3 69:2 74:4 72:2 71:3 67:5 r:3',
 '74:3 78:3 78:4 76:2 74:3 71:4 r:2 72:3 76:4 74:3 69:4 r:2 71:3 74:4 72:3 67:5 r:2',
 '71:4 74:3 78:4 78:2 74:4 r:2 72:3 71:3 69:4 67:6 r:3',
 '69:3 71:4 67:6 r:3 66:4 r:3'],
 chords=[(43,59,62),(40,55,59),(36,55,60),(38,57,62),(43,59,62),(45,57,60),(40,55,59),(36,55,60),(38,57,62),(43,59,64)]),
 'table':dict(meter='3/2',units=6,bpm=66,bars=[3,8,6,8,7,3],lead='piano',key='B minor / suspended D',
 labels=['Chairs drawn together','A question in one voice','The other voice waits','An unresolved agreement','The question is changed','Nothing signed'],
 melodies=[
 '59:2 66:3 r:3 64:2 61:3 r:5',
 '59:2 66:3 64:2 r:2 62:3 61:4 r:3 57:2 64:3 66:2 r:2 61:5 62:3 59:4 r:4',
 '66:3 69:2 r:3 68:4 64:2 r:3 62:3 66:4 61:5 r:5',
 '62:3 69:4 71:2 r:2 67:3 64:3 66:4 r:3 61:2 68:5 66:3 r:2 62:4 59:5 r:4',
 '59:3 66:4 64:3 r:3 62:4 61:4 r:3 57:3 62:5 58:4 r:5',
 '61:3 62:4 r:3 59:5 r:5'],
 chords=[(35,54,62),(43,55,62),(38,57,62),(40,56,61),(42,57,61),(38,57,64),(43,55,62),(42,56,61),(35,54,61)]),
 'maps':dict(meter='4/4',units=4,bpm=56,bars=[4,12,10,12,9,4],lead='cello',key='C minor / Ab',
 labels=['Beyond the markings','The first name remembered','What distance conceals','The names become many','One name again','An unmarked place'],
 melodies=[
 '48:6 46:3 43:5 r:3',
 '48:7 55:4 56:5 51:6 r:2 50:4 53:5 51:7 46:4 48:7 r:3',
 '51:5 58:6 60:4 58:5 55:7 r:2 56:4 53:6 50:5 48:7 r:3',
 '60:5 67:5 68:6 63:4 65:5 62:7 r:2 63:4 60:5 58:6 55:4 56:5 55:7 r:3',
 '48:8 55:5 56:6 51:7 r:3 50:5 46:4 48:8 r:3',
 '51:5 48:7 50:5 r:5'],
 chords=[(36,55,63),(44,56,63),(41,56,60),(43,58,62),(39,55,58),(41,56,60),(44,56,63),(43,59,62),(36,55,62)]),
 'after':dict(meter='6/8',units=6,bpm=93,bars=[4,10,9,11,10,4],lead='bassoon',key='D minor / F open light',
 labels=['The first quiet morning','A tentative step outside','A little more sky','The door left open','The step is remembered','A future without certainty'],
 melodies=[
 '50:4 r:2 57:3 55:4 r:3',
 '50:4 57:3 59:3 59:2 55:4 r:2 53:3 52:3 55:4 57:3 53:5 r:3',
 '57:3 60:4 64:3 62:3 60:4 r:2 59:3 55:4 53:3 52:5 r:3',
 '60:4 64:3 65:4 62:3 59:4 r:2 60:3 57:4 55:3 59:5 r:2 57:4 53:5 r:3',
 '50:5 57:4 59:4 59:3 55:5 r:3 53:4 52:3 55:4 57:5 r:3',
 '53:4 57:3 55:5 52:4 r:5'],
 chords=[(38,57,60),(41,57,60),(36,55,59),(43,55,59),(45,57,60),(41,57,64),(38,57,60),(36,55,59),(38,57,64)])
}

def parsed(text):
    return [(None if p=='r' else int(p),float(d)) for tok in text.split() for p,d in [tok.split(':')]]


def composition(track):
    cfg=SCORES[track];units=cfg['units'];bpm=cfg['bpm'];bars=sum(cfg['bars'])
    tempos=[bpm]*(bars-3)+[bpm*.96,bpm*.90,bpm*.82]
    starts=np.cumsum([0,*[units*60/x for x in tempos]]).tolist()
    notes=[];sections=[];harmony=[];bar=0;chord_index=0
    def add(inst,t,d,p,v,role,phrase_id,art=None,release=None):
        if p is None:return
        art=art or ('natural' if inst in DECAY else 'legato')
        rel=release if release is not None else (1.1 if inst in DECAY else .85)
        notes.append(dict(track=inst,time=round(t,6),duration=round(d,6),midi=int(p),velocity=int(v),role=role,voice=role,phrase_id=phrase_id,articulation=art,release=rel,bar=int(np.searchsorted(starts,t,side='right')-1)))
    for si,(nb,label,text) in enumerate(zip(cfg['bars'],cfg['labels'],cfg['melodies'])):
        begin,end=starts[bar],starts[bar+nb];span=end-begin;bar+=nb
        sections.append(dict(name=label,time=begin,end=end,bars=nb,bar=bar-nb))
        melody=parsed(text);scale=span/sum(d for _,d in melody);pos=begin
        # Intro/coda and the return thin naturally; no per-bar volume envelopes.
        level=[52,65,62,75,60,45][si]
        lead=cfg['lead']
        if track=='table' and si==2:lead='clarinet'
        if track=='after' and si in (2,3):lead='clarinet'
        if track=='maps' and si==3:lead='violin'
        for ni,(p,d) in enumerate(melody):
            dur=d*scale
            # Wind sentences explicitly breathe on rests or after <=6s; the
            # score retains the breath, whereas strings may span many bars.
            if p is not None:
                if lead in ('horn','clarinet','bassoon'):
                    held=min(dur-.06,6.5 if lead=='horn' else 7.)
                elif lead in DECAY:held=max(.20,dur*.86)
                else:held=max(.2,dur)
                ending=ni==len(melody)-1 or melody[ni+1][0] is None
                add(lead,pos,held,p+12 if track=='after' and lead=='clarinet' else p,level+[0,3,-1,2,-3,1][ni%6],'lead melody',f'{track}-{si}-lead',release=1.05 if ending else .65)
            pos+=dur
        # Harmonic spans follow long musical sentences, not the meter. Different
        # track pacing: winter withholds voices; radio sustains an E pedal;
        # table suspends common tones across several harmonic conversations.
        count=2 if si in (0,5) else {'country':4,'lines':5,'winter':3,'radio':3,'life':4,'table':3,'maps':3,'after':4}[track]
        for hi in range(count):
            ht=begin+span*hi/count;he=begin+span*(hi+1)/count;dur=he-ht
            chord=cfg['chords'][chord_index%len(cfg['chords'])];chord_index+=1
            bass,mid,top=chord;harmony.append(dict(time=ht,end=he,pitches=chord))
            pid=f'{track}-{si}-h{hi}'
            if track=='country':
                add('cello',ht,dur,bass,level-23,'long bowed bass',pid)
                add('viola',ht+.10,dur-.1,mid,level-24,'sustained inner voice',pid)
                if si in (2,3,4):add('violin',ht+.18,dur-.18,top,level-29,'common-tone canopy',pid)
                if hi%2==1 and si not in (0,5):add('horn',ht+.7,min(6.,dur-1),mid,level-13,'horn horizon answer',pid,release=1.2)
            elif track=='lines':
                add('cello',ht,dur,bass,level-27,'long string pedal',pid)
                add('viola',ht+.15,dur-.15,top,level-33,'sustained harmonic thread',pid)
                # A separate left hand walks in half notes against a lead with
                # uneven note values. No repeated bow/attack at bar lines.
                for j,f in enumerate((.05,.42,.76)):
                    add('piano',ht+f*dur,min(2.0,dur*.24),[bass+12,mid,top-12][j],level-22,'piano counterpoint',pid)
            elif track=='winter':
                if hi!=1 or si==3:add('viola',ht,dur,mid,level-33,'held winter air',pid,release=1.4)
                if si in (1,2,3,4) and hi%2==1:
                    add('bassoon',ht+.65,min(5.5,dur*.65),bass+12,level-14,'a separate breath',pid,release=1.2)
                if si==3:add('cello',ht,dur,bass,level-27,'low lament support',pid)
            elif track=='radio':
                add('cello',ht,dur,40 if si!=3 else bass,level-25,'continuous carrier pedal',pid)
                if si not in (0,5):add('viola',ht+.12,dur-.12,mid,level-30,'unresolved carrier interval',pid)
                # Unequal 3+2+2 spacing is quiet and low; no drum/march pulse.
                for j,f in enumerate((.0,3/7,5/7)):
                    add('piano',ht+f*dur,.7,[bass+12,top,mid][j],level-32,'irregular distant punctuation',pid)
            elif track=='life':
                add('cello',ht,dur,bass,level-29,'warm sustained floor',pid)
                if si in (2,3,4):add('viola',ht+.15,dur-.15,mid,level-30,'garden inner light',pid)
                for j,f in enumerate((.0,.19,.48,.72)):
                    add('harp',ht+dur*f,min(3.,dur*.4),[mid,top,mid+7,top+7][j],level-22,'harp memory',pid)
            elif track=='table':
                add('viola',ht,dur,mid,level-30,'held suspension',pid,release=1.5)
                add('cello',ht+.12,dur-.12,bass,level-29,'chamber bass sentence',pid,release=1.3)
                if si!=2 and si not in (0,5):add('clarinet',ht+dur*.53,min(5.,dur*.36),top,level-16,'clarinet reply',pid,release=1.1)
                if si==2:
                    add('piano',ht+dur*.15,2.5,mid,level-14,'piano responds',pid)
                    add('piano',ht+dur*.62,2.8,top,level-18,'piano responds',pid)
            elif track=='maps':
                add('viola',ht,dur,mid,level-30,'elegy inner sustain',pid,release=1.5)
                if si in (2,3,4):add('cello',ht,dur,bass,level-24,'growing lower choir',pid,release=1.5)
                if si==3:
                    add('violin',ht+.2,dur-.2,top+12,level-28,'full strings divided canopy',pid,release=1.4)
                    add('viola',ht+.3,dur-.3,top,level-27,'full strings middle choir',pid,release=1.4)
                if si in (0,5):add('piano',ht+.3,3.,bass+12,level-26,'a name in the distance',pid)
            else:
                add('cello',ht,dur,bass,level-32,'quiet morning floor',pid)
                if si in (1,2,3,4):add('viola',ht+.1,dur-.1,mid,level-35,'fragile held warmth',pid)
                for j,f in enumerate((.12,.63)):
                    add('harp',ht+f*dur,min(3.5,dur*.3),[top,mid+7][j],level-25,'small returning light',pid)
                if lead=='clarinet' and si==3 and hi%2==0:add('bassoon',ht+.4,min(5.,dur*.6),mid-12,level-23,'warm woodwind ground',pid)
    # Deduplicate adjacent identical sustaining notes into real ties. A tie has
    # one recorded attack, even across harmony or section boundaries, but only
    # when the exact same pitch/voice/level remain valid and no rest intervenes.
    notes.sort(key=lambda n:(n['track'],n['voice'],n['midi'],n['time']))
    merged=[]
    for n in notes:
        prev=merged[-1] if merged else None
        if prev and n['track'] not in DECAY and all(prev[k]==n[k] for k in ('track','voice','midi','velocity')) and abs(prev['time']+prev['duration']-n['time'])<.001:
            prev['duration']=round(prev['duration']+n['duration'],6);prev['tie_count']=prev.get('tie_count',1)+1
        else:merged.append(n)
    return dict(title=TITLES[track],revision='Revised v2',track=track,meter=cfg['meter'],beat_unit='eighth' if cfg['meter'] in ('6/8','7/8') else 'quarter',key=cfg['key'],bars=bars,bar_starts=starts,bar_tempos=tempos,duration_seconds=starts[-1]+5.,theme=[p for p,d in parsed(cfg['melodies'][1]) if p is not None],sections=sections,harmony=harmony,notes=sorted(merged,key=lambda n:(n['time'],n['track'],n['midi'])),articulation_notes='Bowed lines span bar boundaries. Wind notes hold at most 7s then breathe. Natural piano/harp decay is not looped. Release overlap belongs to the notated phrase; no unconditional bar clipping.')


def validate(score):
    if score.get('track') not in TRACKS or score.get('title')!=TITLES[score['track']]:raise ValueError('Unknown title/track')
    dur=score['duration_seconds']
    if not math.isfinite(dur) or not 180<=dur<=240:raise ValueError('Invalid duration')
    if len(score.get('sections',[]))<5:raise ValueError('Missing sections')
    if not score.get('notes'):raise ValueError('Missing notes')
    for n in score['notes']:
        if n.get('track') not in old.mapping():raise ValueError('Unknown instrument')
        if not all(math.isfinite(n[k]) for k in ('time','duration','midi','velocity','release')):raise ValueError('Nonfinite note')
        if n['time']<0 or n['duration']<=0 or n['time']+n['duration']+n['release']>dur-.5:raise ValueError('Invalid note timing')
        if not 1<=n['velocity']<=127 or int(n['midi'])!=n['midi']:raise ValueError('Invalid pitch/velocity')
        anchors=old.mapping()[n['track']]
        if min(abs(p-n['midi']) for p in anchors)>4:raise ValueError('Unverified pitch range')
        if n['articulation'] not in ('natural','legato','tenuto'):raise ValueError('Invalid articulation')
        if n['track'] in DECAY and n['articulation']!='natural':raise ValueError('Decay instrument may not sustain-loop')
    return score


def validate_suite(suite):
    if len(suite)!=8 or {s['track'] for s in suite}!=set(TRACKS):raise ValueError('Exactly eight tracks required')
    for s in suite:validate(s)
    contours=[tuple(b-a for a,b in zip(s['theme'],s['theme'][1:])) for s in suite]
    if len(set(contours))!=8:raise ValueError('Duplicated/transposed theme')
    return suite


def fresh_output(path):
    path=path.resolve();home=HOME.resolve()
    if path==home:raise FileExistsError('Evidence root is not an attempt')
    if not path.is_relative_to(home) or 'sample-cache' in path.relative_to(home).parts:raise ValueError('Fresh output must be inside campaign-suite-two, outside cache')
    path.mkdir(parents=True,exist_ok=False)


def sustain_body(sample,seconds,midi):
    """Retain recorded attack then repeat a stable, phase-matched stereo body.

    A raised-cosine *linear gain* overlap avoids the equal-power +3dB bump on
    correlated periodic samples. Optimize stereo overlap error across one pitch
    period at either side of an interior body endpoint; never join silence/tail.
    This is sample looping, not a physical bow/breath model or new recording.
    """
    wanted=round(seconds*SR);n=len(sample)
    if n<round(.35*SR):raise ValueError('Recording too short for stable body')
    mono=np.mean(sample,axis=1)
    win=round(.08*SR)
    rms=np.sqrt(np.mean(np.lib.stride_tricks.sliding_window_view(mono[::240],16)**2,axis=1))
    peak=float(np.max(rms));active=np.flatnonzero(rms>peak*.50)
    if not len(active):raise ValueError('No audible stable body')
    # Late release is excluded using the active envelope and a conservative
    # interior limit. Search body starts after the recorded attack.
    last=min(int((active[-1]+8)*240),n-win-1)
    lo=min(round(.65*SR),max(round(.18*SR),last//3))
    end=min(last,lo+round(1.4*SR))
    if end-lo<win*3:lo=max(round(.1*SR),end-win*4)
    period=SR/(440*2**((midi-69)/12))
    candidates=np.arange(max(lo+win*3,end-round(period*1.1)),min(n-1,end+round(period*1.1))+1)
    ref=sample[lo:lo+win].astype(np.float64)
    def error(e):
        tail=sample[e-win:e].astype(np.float64)
        return float(np.mean((tail-ref)**2)/(np.mean(tail**2)+np.mean(ref**2)+1e-12))
    end=int(min(candidates,key=error));join=error(end)
    # Never use the decaying source tail as the held body. Short notes still
    # retain original attack/body and simply release on the musical timeline.
    if wanted<=end:return sample[:wanted].copy(),dict(looped=False,loop_start_seconds=lo/SR,loop_end_seconds=end/SR,loop_crossfade_seconds=win/SR,normalized_join_error=join)
    out=np.empty((wanted,2),np.float32);out[:end]=sample[:end];filled=end
    block=sample[lo:end];fade=(.5-.5*np.cos(np.linspace(0,np.pi,win)))[:,None]
    while filled<wanted:
        start=filled-win;take=min(len(block),wanted-start)
        blend=min(win,take)
        out[start:start+blend]=out[start:start+blend]*(1-fade[:blend])+block[:blend]*fade[:blend]
        if take>blend:out[start+blend:start+take]=block[blend:take]
        filled=start+take
    return out,dict(looped=True,loop_start_seconds=lo/SR,loop_end_seconds=end/SR,loop_crossfade_seconds=win/SR,normalized_join_error=join)


def articulate(sample,event):
    hold=event['duration'];release=event['release'];inst=event['track']
    if inst in DECAY:
        wanted=min(len(sample),round((hold+release)*SR));note=sample[:wanted].copy();meta=dict(looped=False,natural_decay=True)
    else:note,meta=sustain_body(sample,hold+release,event['midi'])
    t=np.arange(len(note))/SR
    env=np.minimum(1,np.maximum(0,(hold+release-t)/release))
    # Preserve the source's original attack; only a two-ms de-click is applied.
    env[:min(96,len(note))]*=np.linspace(0,1,min(96,len(note)))
    # Continuous broad phrasing, never a bar-shaped envelope.
    if inst not in DECAY:env*=.94+.06*np.sin(np.pi*np.minimum(1,t/max(hold,.1)))
    env[-min(240,len(note)):]*=np.linspace(1,0,min(240,len(note)))
    note*=env[:,None]
    return note,meta


def source_hashes():
    return {p.name:base.sha(p.read_bytes()) for p in [Path(__file__),Path(old.__file__),Path(old.previous.__file__),Path(base.__file__)]}


def snapshot():
    paths=[Path(old.__file__),Path(old.previous.__file__),Path(base.__file__),ROOT/'tools/audio/create_opening_cue.py']
    for directory in (base.OUT,old.previous.HOME if hasattr(old.previous,'HOME') else base.OUT.parent/'theme-v4',old.HOME):
        if directory.exists():paths.extend(p for p in directory.rglob('*') if p.is_file())
    return {str(p.relative_to(ROOT)).replace('\\','/'):base.sha(p.read_bytes()) for p in sorted(set(paths))}


def load_variant(inst,midi):
    anchors=old.mapping()[inst];anchor=min(anchors,key=lambda p:(abs(p-midi),p));name=anchors[anchor]
    if abs(anchor-midi)>4:raise ValueError('Unverified transposition')
    p=old.locate(name);record=old.verify_source(name)
    probe=json.loads(base.run(['ffprobe','-v','error','-show_streams','-of','json',str(p)]))['streams'][0]
    rate=round(int(probe['sample_rate'])*2**((midi-anchor)/12))
    raw=base.ff(['-i',str(p),'-af',f'asetrate={rate},aresample={SR}:resampler=soxr:precision=28','-ac','2','-f','f32le','pipe:1'])
    a=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy();a/=max(np.quantile(np.abs(a),.999),.005)
    return a,dict(instrument=inst,midi=midi,anchor_midi=anchor,semitones=midi-anchor,source=name,source_sha256=record['sha256'])


def prepare():
    HOME.mkdir(parents=True,exist_ok=True)
    if (HOME/'preflight.json').exists():raise FileExistsError('Existing source freeze; retain it rather than overwrite')
    scores=validate_suite([composition(k) for k in TRACKS])
    (HOME/'scores').mkdir(exist_ok=False)
    scorehashes={}
    for s in scores:
        p=HOME/'scores'/(s['track']+'.json');p.write_text(json.dumps(s,indent=2)+'\n');scorehashes[s['track']]=base.sha(p.read_bytes())
    # Reuse previously measured pitch proof; no downloads or repeated anchor
    # measurement. Verify the pinned bytes of every actually needed source.
    used=set()
    for s in scores:
        for e in s['notes']:
            anchors=old.mapping()[e['track']];a=min(anchors,key=lambda p:(abs(p-e['midi']),p));used.add(anchors[a])
    records=[old.verify_source(x) for x in sorted(used|{'LICENSE','README.md','Readme.txt','Keys/Upright Piano/Info.txt','Keys/Upright Piano/MappingChart.txt'})]
    (HOME/'original-preservation-before.json').write_text(json.dumps(snapshot(),indent=2)+'\n')
    diagnostics=[]
    proof=HOME/'continuity-proof';proof.mkdir(exist_ok=False)
    for inst,midi in [('cello',50),('violin',69),('horn',57),('clarinet',65),('bassoon',48),('piano',57),('harp',62)]:
        sample,assignment=load_variant(inst,midi)
        event=dict(track=inst,midi=midi,duration=10.,release=1.2,articulation='natural' if inst in DECAY else 'legato')
        revised,meta=articulate(sample,event)
        # Old renderer crops at sample/bar end. This diagnostic uses one held
        # phrase crossing 2/4/6/8s boundaries, not a reconstructed old master.
        legacy=np.zeros((len(revised),2),np.float32);take=min(len(sample),2*SR);legacy[:take]=sample[:take]
        old.wav(proof/(inst+'_held_v2.wav'),revised*.2)
        late=float(np.sqrt(np.mean(revised[8*SR:9*SR]**2))) if len(revised)>9*SR else 0.
        body=float(np.sqrt(np.mean(revised[SR:2*SR]**2)))
        boundary=[]
        for sec in (2,4,6,8):
            if len(revised)>(sec+.05)*SR:
                n=round(sec*SR);boundary.append(dict(second=sec,rms=float(np.sqrt(np.mean(revised[n-2400:n+2400]**2)))))
        if inst not in DECAY and (late<.15*body or not all(x['rms']>.12*body for x in boundary)):raise RuntimeError('Held-body diagnostic failed '+inst)
        diagnostics.append(dict(**assignment,**meta,recording_seconds=len(sample)/SR,held_seconds=len(revised)/SR,early_body_rms=body,late_body_rms=late,old_two_second_bar_clip_late_rms=0.,boundary_rms=boundary,endpoint=float(np.max(np.abs(revised[-1])))))
    report=dict(runtime=old.runtime_versions(),source_hashes=source_hashes(),score_hashes=scorehashes,sources=records,diagnostics=diagnostics,pitch_proof_reused=str(old.HOME/'preflight.json'),limits='Continuity diagnostics establish signal behavior only, not musical taste. Bow/wind extension repeats a crossfaded real recorded interior body. No physical modelling, new recording or piano/harp infinite sustain. Actual sustained F horn, not a physical muted horn; harp, not guitar.')
    frozen=HOME/'frozen-recipes';frozen.mkdir(exist_ok=False)
    for name,digest in report['source_hashes'].items():
        source=ROOT/'tools/audio'/name;shutil.copyfile(source,frozen/(digest+'_'+name))
    (HOME/'preflight.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(dict(scores=[dict(track=s['track'],duration=s['duration_seconds'],events=len(s['notes']),sections=s['sections']) for s in scores],diagnostics=diagnostics,source_hashes=report['source_hashes']),indent=2))


def render(comp):
    length=round(comp['duration_seconds']*SR);stems={k:np.zeros((length,2),np.float32) for k in STEMS}
    variants={};assignments=[];loops=[]
    gains=dict(piano=.18,harp=.145,cello=.105,viola=.075,violin=.10,horn=.09,bassoon=.09,clarinet=.09,timpani=.08)
    pans=dict(piano=.04,harp=-.18,cello=-.23,viola=-.07,violin=.25,horn=.08,bassoon=-.12,clarinet=.13,timpani=.0)
    for index,event in enumerate(comp['notes']):
        inst=event['track'];midi=event['midi'];key=(inst,midi)
        if key not in variants:
            sample,assignment=load_variant(inst,midi);variants[key]=sample;assignments.append(assignment)
        note,meta=articulate(variants[key],event)
        if meta.get('looped'):loops.append(dict(event=index,**meta))
        gain=gains[inst]*(event['velocity']/70)**1.7*(1 if event['role']=='lead melody' else .72)
        pan=pans[inst];note*=gain;note[:,0]*=np.sqrt(1-pan);note[:,1]*=np.sqrt(1+pan)
        group='piano' if inst in ('piano','harp') else 'winds' if inst in ('horn','clarinet','bassoon') else 'strings'
        start=round(event['time']*SR);end=min(length,start+len(note));stems[group][start:end]+=note[:end-start]
    for group in ('piano','strings','winds'):
        for delay,gain in ((.041,.12),(.079,.085),(.127,.058),(.191,.037),(.283,.024),(.419,.014),(.617,.008)):
            n=round(delay*SR);stems['room'][n:]+=stems[group][:-n,::-1]*gain
    t=np.arange(length)/SR;fade=np.minimum(1,t/.04)*np.minimum(1,np.maximum(0,(comp['duration_seconds']-t-1/SR)/3.8))**1.5
    for a in stems.values():a*=fade[:,None];a[0]=0;a[-1]=0
    mix=sum(stems.values());gain=min(.72/max(np.max(np.abs(mix)),1e-8),.09/max(np.sqrt(np.mean(mix**2)),1e-8))
    for a in stems.values():a*=gain
    return stems,assignments,loops,float(gain)


def render_track(track,out):
    pre=json.loads((HOME/'preflight.json').read_text())
    if source_hashes()!=pre['source_hashes'] or old.runtime_versions()!=pre['runtime']:raise RuntimeError('Source/runtime drift after freeze')
    scorepath=HOME/'scores'/(track+'.json')
    if base.sha(scorepath.read_bytes())!=pre['score_hashes'][track]:raise RuntimeError('Score changed after freeze')
    comp=validate(json.loads(scorepath.read_text()));fresh_output(out)
    shutil.copyfile(scorepath,out/'score.json');(out/'source-freeze.json').write_text(json.dumps(pre['source_hashes'],indent=2)+'\n')
    stems,assignments,loops,gain=render(comp);mix=sum(stems.values())
    if not np.isfinite(mix).all():raise RuntimeError('Nonfinite mix')
    slug=SLUGS[track];master=out/(slug+'.wav');old.wav(master,mix)
    lufs,peak=old.loudness(master,out/'loudness-initial.log')
    correction=min(10**((-19.-lufs)/20),10**((-2.1-peak)/20))
    for a in stems.values():a*=correction
    mix=sum(stems.values());exports={'mix':old.wav(master,mix)}
    for name,a in stems.items():exports[name]=old.wav(out/(slug+'_'+name+'.wav'),a)
    for ext,codec,quality in [('mp3','libmp3lame','2'),('ogg','libvorbis','6')]:
        target=out/(slug+'.'+ext)
        base.ff(['-i',str(master),'-map_metadata','-1','-metadata','title='+comp['title'],'-metadata','artist=A War Without Victory project','-metadata','album=A War Without Victory — Campaign Auditions Revised v2','-c:a',codec,'-q:a',quality,str(target)])
        base.ff(['-i',str(target),'-f','null','-'])
        exports[ext]=dict(path=target.name,bytes=target.stat().st_size,sha256=base.sha(target.read_bytes()))
    lufs,peak=old.loudness(master,out/'loudness.log')
    if peak>-2.0 or np.max(np.abs(mix))>=1:raise RuntimeError('True peak/clipping failed')
    # Sparse naturally decaying piano retains dynamics if peak limits constrain
    # the level. LUFS target is a matching aim, not a proxy artistic gate.
    if not -24<=lufs<=-17:raise RuntimeError('Gross loudness fault')
    integer=sum(np.rint(a.astype(np.float64)*8388607).astype(np.int32) for a in stems.values())
    error=int(np.max(np.abs(integer-np.rint(mix.astype(np.float64)*8388607).astype(np.int32))))
    if error>4:raise RuntimeError('Stem arithmetic failed')
    blocks=[float(np.sqrt(np.mean(mix[i:i+SR].astype(np.float64)**2))) for i in range(0,len(mix),SR)]
    sources=[old.verify_source(n) for n in sorted({a['source'] for a in assignments}|{'LICENSE','README.md','Readme.txt','Keys/Upright Piano/Info.txt','Keys/Upright Piano/MappingChart.txt'})]
    for name,value in [('sample-sources.json',sources),('note-sample-assignments.json',assignments),('sustain-loop-assignments.json',loops)]:
        (out/name).write_text(json.dumps(value,indent=2)+'\n')
    (out/'LICENSE-VSCO-CC0.txt').write_bytes((base.CACHE/'LICENSE').read_bytes())
    if source_hashes()!=pre['source_hashes']:raise RuntimeError('Source changed during render')
    report=dict(title=comp['title'],revision='Revised v2',track=track,duration_seconds=comp['duration_seconds'],frames=len(mix),sample_rate=SR,channels=2,pcm_bits=24,meter=comp['meter'],events=len(comp['notes']),sections=comp['sections'],integrated_lufs=lufs,true_peak_dbfs=peak,pcm24_additive_max_lsb=error,rms_seconds=blocks,source_hashes=pre['source_hashes'],score_sha256=base.sha(scorepath.read_bytes()),assignment_sha256=base.sha((out/'note-sample-assignments.json').read_bytes()),looped_events=len(loops),mix_gain=gain*correction,exports=exports,approval='Revised creative audition; independent technical review and expert musical listening remain separate. No runtime adoption.')
    (out/'render-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='rms_seconds'},indent=2))


def main():
    p=argparse.ArgumentParser();p.add_argument('--prepare',action='store_true');p.add_argument('--track',choices=TRACKS);p.add_argument('--out',type=Path);args=p.parse_args()
    if args.prepare:prepare();return
    if not args.track or not args.out:p.error('--track and fresh --out required')
    render_track(args.track,args.out.resolve())

if __name__=='__main__':main()
