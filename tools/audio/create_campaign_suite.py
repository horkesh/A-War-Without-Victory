"""Eight original campaign auditions from pinned recorded CC0 instruments.

Never writes runtime assets or earlier recipes/caches. Every render requires a fresh
--out directory. Python3.14 / NumPy2.4 / FFmpeg8.1.2. No new dependencies.
Use --preflight-only first (scores, verified anchors, source freeze); then --track.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import urllib.parse
import urllib.request
import numpy as np
import create_theme_continuation as previous

base=previous.base
ROOT=base.ROOT
HOME=base.OUT.parent/'campaign-suite-one'
CACHE=HOME/'sample-cache'
SR=48000
TRACKS=('country','winter','lines','radio','life','table','maps','after')
STEMS=('piano','strings','winds','room')
TITLES=dict(country='A Country Before Dawn',winter='The Long Winter',lines='Lines on Paper',radio='No Answer on the Radio',life='The Life We Remember',table='A Table for Strangers',maps='What the Maps Cannot Show',after='After the Guns')
SLUGS=dict(country='a_country_before_dawn',winter='the_long_winter',lines='lines_on_paper',radio='no_answer_on_the_radio',life='the_life_we_remember',table='a_table_for_strangers',maps='what_the_maps_cannot_show',after='after_the_guns')
NEW={
 'horn':{50:'Brass/F Horn/sus/MOHorn_sus_D2_v1_1.wav',57:'Brass/F Horn/sus/MOHorn_sus_A2_v1_1.wav',60:'Brass/F Horn/sus/MOHorn_sus_C3_v1_1.wav'},
 'clarinet':{62:'Woodwinds/Clarinet/susLong/DCClar_susLong_D3_v1_rr1_sum.wav',65:'Woodwinds/Clarinet/susLong/DCClar_susLong_F3_v1_rr1_sum.wav',70:'Woodwinds/Clarinet/susLong/DCClar_susLong_A#3_v1_rr1_sum.wav',74:'Woodwinds/Clarinet/susLong/DCClar_susLong_D4_v1_rr1_sum.wav'},
 'harp':{48:'Strings/Harp/KSHarp_C3_mf.wav',55:'Strings/Harp/KSHarp_G3_mf.wav',62:'Strings/Harp/KSHarp_D4_mf.wav',69:'Strings/Harp/KSHarp_A4_mf.wav'},
 'bassoon':{41:'Woodwinds/Bassoon/sus/PSBassoon_F1_v1_1.wav',48:'Woodwinds/Bassoon/sus/PSBassoon_C2_v1_1.wav',55:'Woodwinds/Bassoon/sus/PSBassoon_G2_v1_1.wav'}}

# Hand-authored melodic sentences: (pitch, duration in local beat units).
# Rests terminate phrases; these are composed motifs, not generated scalar walks.
COUNTRY_A=[[(62,2),(69,3),(67,1)],[(65,3),(64,1),(62,2)],[(65,2),(72,2),(69,2)],[(67,4),(None,2)],[(70,2),(69,1),(65,3)],[(64,2),(67,3),(65,1)],[(62,3),(60,1),(57,2)],[(64,4),(None,2)],[(65,2),(69,3),(72,1)],[(74,3),(72,1),(69,2)],[(67,2),(65,1),(64,1),(62,2)],[(64,4),(None,2)]]
COUNTRY_B=[[(69,3),(72,2),(74,1)],[(77,3),(76,1),(72,2)],[(74,2),(69,2),(72,2)],[(67,4),(None,2)],[(65,2),(70,3),(69,1)],[(72,2),(74,2),(72,2)],[(69,4),(67,2)],[(65,4),(None,2)],[(64,2),(67,1),(72,3)],[(70,2),(69,2),(65,2)],[(67,3),(64,1),(62,2)],[(69,4),(None,2)]]
COUNTRY_D=[[(69,1),(74,2),(72,1),(69,2)],[(70,3),(74,2),(77,1)],[(76,2),(72,1),(69,3)],[(74,4),(None,2)],[(72,2),(77,2),(76,2)],[(74,1),(72,2),(70,1),(69,2)],[(67,3),(72,2),(70,1)],[(69,4),(None,2)],[(65,2),(69,1),(74,3)],[(72,2),(70,2),(67,2)],[(69,3),(65,1),(64,2)],[(62,4),(None,2)]]
WINTER_A=[[(43,1.5),(50,1),(48,.5)],[(46,2),(None,1)],[(45,1),(43,.5),(41,1.5)],[(43,2),(None,1)],[(50,1.5),(53,1),(50,.5)],[(48,2),(46,.5),(None,.5)],[(45,1),(48,1),(46,1)],[(43,2),(None,1)],[(46,1.5),(50,1),(55,.5)],[(53,2),(50,.5),(None,.5)],[(48,1),(45,.5),(46,1.5)],[(43,2),(None,1)],[(41,1.5),(46,1),(45,.5)],[(43,1),(41,.5),(38,1.5)],[(41,1),(45,1),(43,1)],[(42,2),(None,1)]]
WINTER_B=[[(50,1),(55,1.5),(53,.5)],[(50,2),(None,1)],[(51,1.5),(48,1),(46,.5)],[(48,2),(None,1)],[(53,1),(50,1),(46,1)],[(45,2),(None,1)],[(43,1.5),(48,1),(50,.5)],[(46,2),(None,1)],[(45,1),(41,1),(43,1)],[(46,1.5),(45,.5),(43,1)],[(42,2),(45,1)],[(43,2),(None,1)]]
WINTER_D=[[(55,1.5),(58,1),(57,.5)],[(53,1),(50,1.5),(None,.5)],[(51,1),(55,1),(53,1)],[(50,2),(None,1)],[(48,1.5),(53,1),(51,.5)],[(50,2),(46,1)],[(45,1),(48,.5),(50,1.5)],[(46,2),(None,1)],[(43,1),(46,1),(50,1)],[(48,1.5),(45,.5),(43,1)],[(41,1),(38,1),(42,1)],[(43,2),(None,1)]]
LINES_A=[[(64,.75),(69,.75),(67,.5),(64,1),(62,1)],[(60,1.5),(64,.5),(67,1),(None,1)],[(65,1),(69,.5),(72,1.5),(69,1)],[(67,2),(64,1),(None,1)],[(62,.75),(67,.75),(65,.5),(62,1),(60,1)],[(59,1.5),(62,.5),(65,1),(None,1)],[(64,1),(60,1),(62,.5),(64,1.5)],[(59,2),(None,2)],[(64,1),(69,.5),(72,1.5),(71,1)],[(67,1.5),(64,.5),(60,1),(None,1)],[(65,1),(72,1),(74,.5),(72,1.5)],[(69,2),(67,1),(None,1)],[(64,.75),(67,.75),(69,.5),(65,2)],[(62,1.5),(60,.5),(59,1),(None,1)],[(60,1),(64,1),(62,.5),(59,1.5)],[(64,2),(None,2)]]
LINES_B=[[(72,1.5),(76,.5),(74,1),(72,1)],[(71,2),(67,1),(None,1)],[(69,1),(72,1),(77,1.5),(76,.5)],[(74,2),(72,1),(None,1)],[(71,1.5),(74,.5),(76,1),(72,1)],[(69,2),(65,1),(None,1)],[(67,1),(72,1.5),(71,.5),(69,1)],[(64,2),(None,2)],[(65,1),(69,.5),(72,1.5),(74,1)],[(71,1.5),(67,.5),(64,1),(None,1)],[(62,1),(65,1),(64,1),(59,1)],[(64,2),(None,2)]]
LINES_D=[[(69,.5),(72,1),(71,.5),(67,1),(64,1)],[(65,1),(69,.5),(72,1.5),(None,1)],[(74,1.5),(72,.5),(69,1),(67,1)],[(71,2),(None,2)],[(72,.75),(76,.75),(74,.5),(72,1),(69,1)],[(67,1),(71,1),(74,1),(None,1)],[(69,1.5),(65,.5),(64,1),(62,1)],[(60,2),(None,2)],[(64,1),(69,.5),(67,1.5),(65,1)],[(62,1.5),(65,.5),(69,1),(None,1)],[(67,1),(64,1),(62,1),(59,1)],[(64,2),(None,2)]]

# Bass and inner voices explicitly voice-led; harmony changes with each section.
C_HA=[(38,57,65),(41,57,64),(34,58,65),(36,55,64),(43,58,65),(40,55,64),(34,53,62),(33,55,64),(41,57,65),(38,57,65),(43,55,62),(33,55,61)]
C_HB=[(41,57,65),(36,55,64),(38,57,65),(33,55,64),(34,58,65),(43,58,67),(36,55,64),(41,57,65),(45,60,64),(34,58,65),(43,55,62),(33,55,61)]
C_HD=[(38,57,65),(34,58,65),(41,57,64),(43,58,65),(36,55,64),(34,58,65),(40,55,64),(33,55,61),(38,57,65),(43,58,65),(34,53,62),(33,55,61)]
W_HA=[(43,58),(39,58),(41,57),(43,58),(46,62),(41,60),(38,57),(43,58),(39,58),(46,62),(41,60),(43,58),(39,55),(36,55),(38,57),(38,54)]
W_HB=[(39,58),(46,62),(44,60),(41,60),(39,58),(38,57),(36,55),(43,58),(41,57),(39,58),(38,54),(43,58)]
W_HD=[(39,58),(46,62),(44,60),(43,58),(41,60),(39,58),(38,57),(39,58),(43,58),(41,57),(38,54),(43,58)]
L_HA=[(45,60,64),(41,60,65),(38,57,65),(43,59,64),(36,55,64),(43,59,65),(41,57,64),(40,56,62),(45,60,64),(36,55,64),(41,57,65),(38,57,65),(43,59,64),(41,57,62),(38,57,60),(40,56,62)]
L_HB=[(36,55,64),(43,59,62),(45,60,64),(41,57,65),(43,59,62),(38,57,65),(36,55,64),(40,56,62),(41,57,65),(43,59,64),(38,57,62),(40,56,62)]
L_HD=[(45,60,64),(41,57,65),(38,57,65),(43,59,62),(36,55,64),(43,59,62),(41,57,65),(45,60,64),(38,57,65),(41,57,65),(43,59,62),(40,56,62)]


def composition(track):
    if track not in TRACKS:raise ValueError('Unknown track')
    if track in ('radio','life','table','maps','after'):return extra_composition(track)
    country=track=='country';winter=track=='winter'
    units=6 if country else 3 if winter else 4
    tempo=100 if country else 56 if winter else 74
    total=56 if country else 64
    # Last four bars decelerate; exact beat integration provides editable timing.
    tempos=[tempo]*(total-4)+[tempo*.96,tempo*.91,tempo*.84,tempo*.76]
    lengths=[units*60/x for x in tempos];starts=np.cumsum([0,*lengths]).tolist()
    notes=[];sections=[]
    def add(instrument,bar,beat,dur,pitch,velocity,role):
        if pitch is None:return
        # Deterministic tiny rubato, bounded inside the notated bar.
        offset=[0,.012,-.009,.018,-.005][len(notes)%5]
        t=max(starts[bar],starts[bar]+beat*60/tempos[bar]+offset)
        end=starts[bar]+(beat+dur)*60/tempos[bar]
        notes.append(dict(track=instrument,bar=bar,time=t,duration=max(.05,end-t),midi=pitch,velocity=velocity,role=role,harmony_end=starts[bar+1]))
    def section(label,start,phrases,harmonies,level,kind):
        sections.append(dict(name=label,bar=start,bars=len(phrases),time=starts[start],end=starts[start+len(phrases)]))
        for i,(phrase,h) in enumerate(zip(phrases,harmonies)):
            bar=start+i;rise=math.sin(math.pi*(i+.5)/len(phrases));vel=round(level+rise*6)
            lead='violin' if country else 'cello' if winter else 'piano'
            pos=0
            for j,(pitch,dur) in enumerate(phrase):
                # First and last notes carry a shaped sentence; no metronomic copying.
                v=vel+([0,4,-2,1,-4][j%5])
                add(lead,bar,pos,dur*.94,pitch,v,'lead melody');pos+=dur
            if country:
                bass,inner,top=h
                add('cello',bar,0,2.8,bass,vel-25,'bowed bass')
                add('cello',bar,3.1,2.65,bass+12 if i%3==2 else bass,vel-28,'bass continuation')
                add('viola',bar,.25,2.55,inner,vel-23,'inner voice')
                add('viola',bar,3.15,2.6,top if kind=='development' else inner+(2 if i in (3,7) else 0),vel-26,'inner answer')
                if kind in ('light','development') or (kind=='return' and i<8):
                    add('violin',bar,3.2,2.55,top+7 if kind=='development' and i in (1,5,9) else top,vel-26,'upper countervoice')
                if i%4 in (2,3):
                    hornpitch=(top-12 if i%4==2 else inner)
                    add('horn',bar,.5,4.4,hornpitch,vel-18,'measured horn answer')
                if kind=='light' and i%4==0:add('bassoon',bar,.5,4.3,inner-12,vel-29,'woodwind colour')
            elif winter:
                bass,inner=h
                # Deliberately unfilled ends of alternating phrases: room to breathe.
                if i%4!=3:add('viola',bar,.15,2.3,inner,vel-28,'chamber inner line')
                if i%2==0:add('cello',bar,.1,2.25,bass-12 if bass>=48 else bass,vel-30,'quiet low floor')
                if i%4 in (1,3):add('bassoon',bar,.3,1.65,inner-12,vel-17,'low woodwind reply')
                if kind=='development' and i%3!=2:add('violin',bar,.35,2.2,inner+7,vel-31,'distant upper light')
            else:
                bass,inner,top=h
                add('cello',bar,0,1.7,bass,vel-29,'measured bass')
                # Light legato middle figures with gaps; no spiccato or attack pileup.
                positions=[(.35,inner),(1.3,top),(2.35,inner+7),(3.15,top)] if kind!='light' else [(.5,inner),(2.25,top)]
                for b,p in positions:add('viola',bar,b,.68,p,vel-31 if kind!='development' else vel-26,'flowing middle figure')
                if i%2==1:add('piano',bar,.1,1.35,bass+12,vel-25,'left hand response')
                if kind=='light' and i%3!=2:add('violin',bar,.2,3.35,top+7,vel-29,'warm middle suspension')
                if kind=='development' and i%4==2:add('bassoon',bar,.45,2.6,inner-12,vel-28,'brief low reply')
    if country:
        section('Prelude — distant valley',0,[[(None,2),(62,2),(65,2)],[(69,3),(None,3)],[(65,2),(64,2),(62,2)],[(57,4),(None,2)]],C_HA[:4],50,'intro')
        section('A — broad country theme',4,COUNTRY_A,C_HA,62,'theme')
        section('B — relative-major light',16,COUNTRY_B,C_HB,66,'light')
        section('Development — horizon darkens',28,COUNTRY_D,C_HD,75,'development')
        ret=[list(p) for p in COUNTRY_A]
        ret[3]=[(67,2),(69,2),(65,2)];ret[7]=[(64,2),(62,2),(None,2)];ret[11]=[(64,2),(62,2),(None,2)]
        section('Return — beauty with unease',40,ret,C_HA,64,'return')
        section('Coda — open D and E',52,[[(65,3),(62,2),(None,1)],[(64,4),(None,2)],[(62,3),(None,3)],[(64,2),(None,4)]],[(38,57,65),(34,53,62),(38,57,64),(38,57,64)],46,'coda')
        theme=[p for phrase in COUNTRY_A for p,d in phrase if p is not None]
    elif winter:
        section('Prelude — a single room',0,[[(43,2),(None,1)],[(None,1),(46,1),(45,1)],[(43,1.5),(41,1.5)],[(38,2),(None,1)]],W_HA[:4],47,'intro')
        section('A — winter cello sentence',4,WINTER_A,W_HA,57,'theme')
        section('B — low woodwind conversation',20,WINTER_B,W_HB,54,'light')
        section('Development — restrained lament',32,WINTER_D,W_HD,66,'development')
        ret=[list(p) for p in WINTER_A];ret[3]=[(43,1.5),(None,1.5)];ret[11]=[(43,1),(41,1),(None,1)];ret[15]=[(42,1),(43,1),(None,1)]
        section('Return — thinning chamber voices',44,ret,W_HA,50,'return')
        section('Coda — breath and unresolved fifth',60,[[(46,1),(43,1),(None,1)],[(41,1),(38,1),(None,1)],[(43,1.5),(None,1.5)],[(45,1),(None,2)]],[(39,58),(38,57),(43,58),(43,57)],41,'coda')
        theme=[p for phrase in WINTER_A for p,d in phrase if p is not None]
    else:
        section('Prelude — measured lines',0,[[(64,1),(69,1),(None,2)],[(67,1.5),(64,.5),(None,2)],[(62,1),(65,1),(None,2)],[(59,2),(None,2)]],L_HA[:4],51,'intro')
        section('A — purposeful piano',4,LINES_A,L_HA,62,'theme')
        section('B — warmer middle register',20,LINES_B,L_HB,61,'light')
        section('Development — decisions gather',32,LINES_D,L_HD,70,'development')
        ret=[[(p-12 if p is not None and i<8 else p,d) for p,d in phrase] for i,phrase in enumerate(LINES_A)]
        ret[15]=[(64,1),(62,1),(None,2)]
        section('Return — lower recollection rises',44,ret,L_HA,58,'return')
        section('Coda — unanswered margin',60,[[(60,1),(64,1),(None,2)],[(62,1),(59,1),(None,2)],[(60,2),(None,2)],[(64,1.5),(None,2.5)]],[(41,57,64),(40,56,62),(45,60,64),(45,59,64)],43,'coda')
        theme=[p for phrase in LINES_A for p,d in phrase if p is not None]
    return dict(title=TITLES[track],track=track,meter='6/8' if country else '3/4' if winter else '4/4',beat_unit='eighth' if country else 'quarter',bars=total,bar_starts=starts,bar_tempos=tempos,duration_seconds=starts[-1]+5.5,theme=theme,sections=sections,notes=sorted(notes,key=lambda n:(n['time'],n['track'],n['midi'])))



def phrase(text):
    return [(None if p=='r' else int(p),float(d)) for token in text.split() for p,d in [token.split(':')]]


# Each row is a complete melodic bar, freely composed for the named track.
# B and development are separately authored sentences, not transposed A loops.
EXTRA_THEMES={
 'radio':[
  '52:2 59:2 57:1 55:2','54:3 52:2 r:2','55:2 60:2 59:3','57:4 r:3',
  '59:1 62:2 60:1 55:3','54:2 57:3 52:2','50:2 54:2 55:3','52:4 r:3',
  '55:2 59:3 64:2','62:2 59:2 57:3','60:3 55:2 54:2','57:4 r:3',
  '52:1 55:2 59:2 57:2','54:3 50:2 r:2','55:2 54:1 50:2 52:2','54:4 r:3'],
 'life':[
  '67:2 71:1 69:1 67:2','62:3 64:1 r:2','66:2 69:2 74:2','71:4 r:2',
  '69:1 67:2 64:1 62:2','64:3 67:1 69:2','71:2 69:1 66:1 64:2','62:4 r:2',
  '67:1 71:2 74:1 72:2','71:3 67:1 64:2','69:2 72:2 74:2','76:4 r:2',
  '74:2 71:1 69:1 67:2','64:3 66:1 69:2','67:2 64:2 62:2','66:4 r:2'],
 'table':[
  '59:2 66:1 64:3','62:2 61:2 r:2','57:2 62:3 66:1','64:4 r:2',
  '61:1 64:2 69:3','66:2 62:2 61:2','59:3 57:1 54:2','61:4 r:2',
  '62:2 66:3 69:1','71:2 69:1 66:3','64:2 61:2 62:2','57:4 r:2',
  '59:1 62:2 66:1 64:2','61:3 57:1 54:2','59:2 61:2 57:2','58:4 r:2'],
 'maps':[
  '48:1.5 55:1 58:1.5','56:2 55:1 r:1','51:1 55:1 60:2','58:3 r:1',
  '55:1.5 51:.5 50:2','53:2 56:1 55:1','51:1 48:1 46:2','50:3 r:1',
  '55:1 58:1 63:2','62:1.5 58:.5 55:2','56:1 60:1 63:2','65:3 r:1',
  '63:1.5 60:.5 58:2','55:1 56:1 53:2','51:1.5 50:.5 46:2','48:3 r:1'],
 'after':[
  '50:2 53:1 57:3','55:2 52:2 r:2','48:2 52:1 55:3','53:4 r:2',
  '57:2 55:1 53:3','52:2 48:1 50:3','53:2 52:1 48:3','50:4 r:2',
  '53:1 57:2 59:3','57:2 53:2 r:2','55:2 59:1 57:3','52:4 r:2',
  '50:2 55:1 53:3','52:2 48:2 45:2','48:2 52:1 55:3','53:4 r:2']}
EXTRA_B={
 'radio':['59:3 62:1 60:3','57:2 54:3 r:2','55:2 59:2 62:3','60:4 r:3','57:1 60:2 59:2 55:2','54:3 50:2 52:2','55:2 57:2 60:3','59:4 r:3','62:2 60:2 55:3','57:3 54:2 r:2','52:2 55:1 54:2 50:2','52:4 r:3'],
 'life':['71:3 74:1 76:2','74:2 71:2 r:2','72:2 69:1 67:3','69:4 r:2','67:2 64:1 62:3','66:2 69:2 71:2','74:3 72:1 69:2','67:4 r:2','64:1 67:2 71:3','69:2 66:2 64:2','62:2 64:1 67:3','66:4 r:2'],
 'table':['66:3 69:1 71:2','68:2 64:2 r:2','66:2 62:1 59:3','61:4 r:2','64:3 67:1 69:2','66:2 62:2 57:2','59:2 62:2 64:2','61:4 r:2','57:2 61:1 66:3','64:2 62:2 r:2','59:2 57:1 54:3','58:4 r:2'],
 'maps':['55:1 60:1 63:2','62:2 58:1 r:1','56:1.5 60:.5 65:2','63:3 r:1','60:1 56:1 53:2','55:2 58:1 62:1','63:1.5 60:.5 58:2','56:3 r:1','53:1 56:1 60:2','58:1.5 55:.5 51:2','50:1 53:1 55:2','48:3 r:1'],
 'after':['55:2 59:1 57:3','53:3 50:1 r:2','52:2 55:2 59:2','57:4 r:2','53:2 57:1 55:3','52:3 48:1 50:2','55:2 53:1 52:3','50:4 r:2','48:2 52:1 57:3','55:3 52:1 r:2','53:2 50:2 48:2','52:4 r:2']}
EXTRA_D={
 'radio':['59:1 64:2 62:2 59:2','60:3 57:2 54:2','55:2 60:2 64:3','62:4 r:3','59:2 57:1 54:2 52:2','55:3 59:2 62:2','60:2 55:2 57:3','54:4 r:3','52:2 55:2 59:3','57:1 54:2 50:2 52:2','55:3 54:1 50:3','52:4 r:3'],
 'life':['74:2 76:1 78:3','76:2 72:2 71:2','69:1 72:2 76:3','74:4 r:2','71:2 74:1 72:3','69:2 67:1 64:3','66:2 71:2 74:2','72:4 r:2','69:2 74:1 71:3','67:3 64:1 62:2','64:2 67:2 69:2','66:4 r:2'],
 'table':['66:1 71:2 69:3','67:2 64:1 62:3','61:2 66:3 69:1','68:4 r:2','66:3 62:1 59:2','64:2 67:2 71:2','69:2 66:1 64:3','61:4 r:2','62:2 66:1 64:3','59:3 57:1 54:2','57:2 61:2 62:2','58:4 r:2'],
 'maps':['67:1.5 72:1 75:1.5','74:2 70:1 r:1','68:1 72:1 77:2','75:3 r:1','72:1.5 68:.5 65:2','67:1 70:1 74:2','75:1.5 72:.5 70:2','68:3 r:1','65:1 68:1 72:2','70:1.5 67:.5 63:2','62:1 65:1 67:2','60:3 r:1'],
 'after':['57:2 60:1 59:3','57:3 53:1 50:2','55:2 59:2 62:2','60:4 r:2','57:1 62:2 60:3','59:2 55:1 53:3','52:2 57:2 60:2','59:4 r:2','55:2 60:1 57:3','53:2 50:2 48:2','52:2 55:1 57:3','53:4 r:2']}
EXTRA_HARMONIES={
 'radio':[(40,55,59),(36,55,60),(43,55,59),(38,54,57),(45,57,60),(35,54,59),(36,55,60),(40,55,59),(43,59,62),(36,55,60),(45,57,60),(38,54,57),(40,55,59),(35,54,59),(36,55,60),(35,54,58)],
 'life':[(43,59,62),(40,55,59),(38,57,62),(43,59,62),(36,55,60),(45,57,60),(38,57,62),(43,59,62),(40,55,59),(36,55,60),(45,57,60),(38,57,62),(43,59,62),(40,55,59),(36,55,60),(38,57,62)],
 'table':[(35,54,62),(43,55,62),(38,57,62),(40,56,61),(42,57,61),(38,57,62),(43,55,62),(42,57,61),(35,54,62),(38,57,62),(40,56,61),(45,57,61),(43,55,62),(40,56,61),(35,54,62),(42,56,61)],
 'maps':[(36,55,63),(44,56,63),(41,56,60),(43,58,62),(39,55,58),(41,56,60),(44,56,63),(43,59,62),(36,55,63),(39,55,58),(44,56,63),(41,56,60),(43,58,62),(41,56,60),(43,59,62),(36,55,62)],
 'after':[(38,57,60),(41,57,60),(36,55,59),(38,57,60),(43,55,59),(45,57,60),(41,57,60),(38,57,60),(36,55,59),(43,55,59),(45,57,60),(41,57,60),(38,57,60),(36,55,59),(43,55,59),(38,57,60)]}


def extra_composition(track):
    units,tempo,meter={'radio':(7,132,'7/8'),'life':(6,114,'6/8'),'table':(6,112,'3/2'),'maps':(4,74,'4/4'),'after':(6,112,'6/8')}[track]
    tempos=[tempo]*60+[tempo*.96,tempo*.91,tempo*.84,tempo*.76]
    starts=np.cumsum([0,*[units*60/b for b in tempos]]).tolist();notes=[];sections=[]
    main=[phrase(x) for x in EXTRA_THEMES[track]];b=[phrase(x) for x in EXTRA_B[track]];development=[phrase(x) for x in EXTRA_D[track]]
    h=EXTRA_HARMONIES[track]
    def add(inst,bar,beat,duration,midi,velocity,role):
        if midi is None:return
        t=starts[bar]+beat*60/tempos[bar]+[0,.011,.019,.006][len(notes)%4]
        end=min(starts[bar]+(beat+duration)*60/tempos[bar],starts[bar+1]-.018)
        notes.append(dict(track=inst,bar=bar,time=t,duration=max(.05,end-t),midi=midi,velocity=velocity,role=role,harmony_end=starts[bar+1]))
    ret=[list(p) for p in main]
    if track=='life':ret[7]=phrase('62:2 64:2 r:2')
    elif track=='radio':ret[15]=phrase('54:2 52:2 r:3')
    elif track=='table':ret[15]=phrase('58:2 59:2 r:2')
    elif track=='maps':ret[15]=phrase('48:1 50:1 r:2')
    else:ret[15]=phrase('53:2 50:2 r:2')
    arrangements=[('Prelude',0,main[:4],h[:4],45,'intro'),('A — complete principal sentence',4,main,h,58,'theme'),('B — contrasting conversation',20,b,h[4:]+h[:0],60,'contrast'),('Development — changed perspective',32,development,h[2:14],71 if track=='maps' else 67,'development'),('Return — changed recollection',44,ret,h,55,'return'),('Coda — an open question',60,main[-4:],h[-4:],40,'coda')]
    for label,start,phrases,harmonies,level,kind in arrangements:
        sections.append(dict(name=label,bar=start,bars=len(phrases),time=starts[start],end=starts[start+len(phrases)]))
        for i,(melody,harmony) in enumerate(zip(phrases,harmonies)):
            bar=start+i;bass,inner,top=harmony;vel=round(level+5*math.sin(math.pi*(i+.5)/len(phrases)));position=0
            inst={'radio':'horn','life':'clarinet','table':'piano','maps':'violin' if kind=='development' else 'cello','after':'clarinet' if kind=='development' else 'bassoon'}[track]
            for j,(pitch,duration) in enumerate(melody):
                if pitch is not None and track=='after' and inst=='clarinet':pitch+=12
                # Maps' development is already in violin register; return solo cello.
                add(inst,bar,position,duration*.93,pitch,vel+[0,3,-2,1][j%4],'lead melody');position+=duration
            if track=='radio':
                # 2+2+3 tension; deliberately unequal low bow lengths, no march.
                for beat,dur,pitch in [(0,1.65,bass),(2.4,1.25,bass+7),(4.5,1.9,bass+12)]:add('cello',bar,beat,dur,pitch,vel-24,'uneven low-string pulse')
                add('viola',bar,.4,5.8,inner,vel-28,'suspended inner tension')
                if i%4 in (1,3):add('bassoon',bar,3.7,2.5,top-12,vel-22,'unanswered low reply')
                if kind=='development' and i%4==0:add('timpani',bar,0,2.5,38,34,'restrained distant musical punctuation')
            elif track=='life':
                add('harp',bar,.2,2.3,inner,vel-18,'recorded harp broken voicing')
                add('harp',bar,3.1,2.55,top,vel-22,'recorded harp answer')
                if i%2==0:add('cello',bar,.1,4.8,bass,vel-31,'warm low support')
                if kind in ('contrast','development') and i%3!=2:add('violin',bar,.5,4.7,top+7,vel-27,'gentle bowed counterline')
            elif track=='table':
                add('cello',bar,.15,2.25,bass,vel-30,'chamber low question')
                if i%3!=2:add('viola',bar,.55,4.55,inner,vel-27,'held institutional suspension')
                add('piano',bar,3.8,1.5,top,vel-22,'sparse inner piano answer')
                if kind=='development' and i%2==0:add('clarinet',bar,1.5,3.4,top+12,vel-26,'distant wind interjection')
            elif track=='maps':
                add('cello',bar,.1,3.45,bass,vel-28,'low ground beneath melody')
                add('viola',bar,.35,3.1,inner,vel-25,'elegiac inner line')
                if kind in ('contrast','development'):
                    add('violin',bar,.4,3.1,top,vel-24,'growing string body')
                    if kind=='development':add('cello',bar,1.6,1.9,top-12,vel-20,'ascending human counterline')
                if kind=='return' and i%4==3:add('piano',bar,1.3,1.5,top+12,vel-28,'single remembered light')
            else:
                add('harp',bar,.3,2.35,inner,vel-26,'fragile measured light')
                if i%2==0:add('cello',bar,.1,4.8,bass,vel-31,'quiet bowed ground')
                if kind in ('contrast','development'):
                    add('viola',bar,.5,4.6,inner,vel-29,'tentative warm middle')
                    if i%4==2:add('horn',bar,1,3.5,top-12,vel-29,'soft horn recollection')
                if kind=='return' and i in (3,7,11):add('clarinet',bar,2,2.5,top+12,vel-24,'warm answer after silence')
    if track=='after':
        # One brief transformation of the approved identity A→D, not its full tune.
        add('clarinet',62,0,1.8,69,43,'brief transformed menu identity')
        add('clarinet',62,2,2.7,74,40,'brief transformed menu identity')
    return dict(title=TITLES[track],track=track,meter=meter,beat_unit='eighth' if track in ('radio','life','after') else 'quarter',bars=64,bar_starts=starts,bar_tempos=tempos,duration_seconds=starts[-1]+5.5,theme=[p for row in main for p,d in row if p is not None],sections=sections,notes=sorted(notes,key=lambda n:(n['time'],n['track'],n['midi'])))

def validate(score):
    if score.get('track') not in TRACKS:raise ValueError('Unknown track')
    duration=score['duration_seconds']
    if not math.isfinite(duration) or not 180<=duration<=240:raise ValueError('Duration outside campaign range')
    if len(score.get('sections',[]))<5:raise ValueError('Missing section contrast')
    if not score.get('notes'):raise ValueError('Empty score')
    allowed={'piano','cello','viola','violin','horn','bassoon','clarinet','harp','timpani'}
    for event in score['notes']:
        if event['track'] not in allowed:raise ValueError('Unknown instrument')
        if not all(math.isfinite(event[k]) for k in ['time','duration','midi','velocity']):raise ValueError('Nonfinite event')
        if event['time']<0 or event['duration']<=0 or event['time']+event['duration']>duration-2:raise ValueError('Invalid timing')
        if event['time']+event['duration']>event['harmony_end']+.03:raise ValueError('Note exceeds harmony boundary')
        if not 1<=event['velocity']<=127 or not 24<=event['midi']<=84 or int(event['midi'])!=event['midi']:raise ValueError('Invalid pitch/velocity')
    return score


def validate_suite(suite):
    for score in suite:validate(score)
    contours=[tuple(b-a for a,b in zip(s['theme'],s['theme'][1:])) for s in suite]
    if len(set(contours))!=len(contours):raise ValueError('Duplicated/transposed theme')
    return suite


def check_resource_budget(sizes):
    if any(x<0 for x in sizes) or sum(sizes)>40_000_000:raise ValueError('Additional source budget exceeds40MB')


def fresh_output(path):
    path.mkdir(parents=True,exist_ok=False)


def mapping():
    return {**{k:v for k,v in previous.mapping().items() if k in {'piano','cello','viola','violin','timpani'}},**NEW}


def locate(path):
    if (CACHE/path).exists():return CACHE/path
    return previous.locate(path)


def source_tree():
    return {x['path']:x for x in json.loads((base.OUT/'vsco-tree.json').read_text())['tree'] if x['type']=='blob'}


def fetch_new():
    tree=source_tree();paths=sorted({p for m in NEW.values() for p in m.values()})
    existing={str(p.relative_to(CACHE)).replace('\\','/') for p in CACHE.rglob('*') if p.is_file()}
    check_resource_budget([tree[p]['size'] for p in set(paths)|existing])
    for name in paths:
        p=CACHE/name
        if not p.exists():
            data=urllib.request.urlopen(base.BASE+urllib.parse.quote(name),timeout=45).read()
            if len(data)!=tree[name]['size'] or hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=tree[name]['sha']:raise RuntimeError('Pinned download mismatch')
            p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        verify_source(name)


def verify_source(name):
    data=locate(name).read_bytes();entry=source_tree()[name]
    if hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=entry['sha']:raise RuntimeError('Pinned source drift: '+name)
    return dict(path=name,source_url=base.BASE+urllib.parse.quote(name),pinned_commit=base.COMMIT,bytes=len(data),sha256=base.sha(data),git_blob_sha1=entry['sha'],license='CC0-1.0',credit='Ivy Audio / Simon Dalzell; Versilian Studios' if 'Upright Piano' in name else 'Versilian Studios / Sam Gossner; sample cutting Elan Hickler / Soundemote',cache=str(locate(name).relative_to(ROOT)).replace('\\','/'))


def preflight():
    suite=validate_suite([composition(k) for k in TRACKS]);fetch_new();checks=[]
    for instrument,anchors in NEW.items():
        for anchor,name in anchors.items():
            raw=base.ff(['-i',str(locate(name)),'-ar',str(SR),'-ac','1','-f','f32le','pipe:1']);audio=np.frombuffer(raw,dtype='<f4')
            seg=audio[24000:min(len(audio),120000)].astype(float);seg-=seg.mean()
            n=1<<(len(seg)*2-1).bit_length();f=np.fft.rfft(seg,n);corr=np.fft.irfft(f*f.conj(),n)[:len(seg)]/np.arange(len(seg),0,-1);corr/=corr[0]
            peaks=[i for i in range(60,1600) if corr[i]>corr[i-1] and corr[i]>=corr[i+1]];top=max(corr[i] for i in peaks);lag=min(i for i in peaks if corr[i]>=top*.96)
            correction=.5*(corr[lag-1]-corr[lag+1])/(corr[lag-1]-2*corr[lag]+corr[lag+1]);hz=SR/(lag+correction);midi=69+12*np.log2(hz/440);cents=(midi-anchor)*100
            if abs(cents)>55 or not np.isfinite(audio).all():raise RuntimeError('Measured pitch anchor rejected: '+name)
            checks.append(dict(instrument=instrument,path=name,anchor_midi=anchor,measured_hz=hz,cents=cents,duration_seconds=len(audio)/SR,method='broad normalized autocorrelation; shortest near-maximal periodic lag, no filename octave inference'))
    # Verify every actually needed anchor and bound all semitone shifts before render.
    used=set()
    for comp in suite:
        for e in comp['notes']:
            anchors=mapping()[e['track']];anchor=min(anchors,key=lambda p:(abs(p-e['midi']),p))
            if abs(anchor-e['midi'])>4:raise RuntimeError(f"Out-of-range note {e['track']} {e['midi']}")
            used.add(anchors[anchor])
    sources=[verify_source(name) for name in sorted(used|{'LICENSE','README.md','Readme.txt','Keys/Upright Piano/Info.txt','Keys/Upright Piano/MappingChart.txt'})]
    report=dict(runtime=runtime_versions(),scores=[dict(title=s['title'],duration_seconds=s['duration_seconds'],meter=s['meter'],events=len(s['notes']),sections=s['sections']) for s in suite],anchors=checks,downloaded_cache_bytes=sum(p.stat().st_size for p in CACHE.rglob('*') if p.is_file()),sources=sources,source_hashes=frozen_hashes())
    HOME.mkdir(parents=True,exist_ok=True);(HOME/'preflight.json').write_text(json.dumps(report,indent=2)+'\n')
    return report


def runtime_versions():
    import sys
    return dict(python=sys.version,numpy=np.__version__,ffmpeg=base.run(['ffmpeg','-version']).decode().splitlines()[0])


def frozen_hashes():
    return {p.name:base.sha(p.read_bytes()) for p in [Path(__file__),Path(base.__file__),Path(previous.__file__)]}


def render(comp):
    length=round(comp['duration_seconds']*SR)
    stems={name:np.zeros((length,2),dtype=np.float32) for name in STEMS};variants={};assignments=[];maps=mapping()
    for event in comp['notes']:
        inst=event['track'];midi=event['midi'];anchors=maps[inst];anchor=min(anchors,key=lambda p:(abs(p-midi),p));key=(inst,midi)
        if abs(anchor-midi)>4:raise RuntimeError('Unverified transposition')
        if key not in variants:
            name=anchors[anchor];p=locate(name);record=verify_source(name)
            probe=json.loads(base.run(['ffprobe','-v','error','-show_streams','-of','json',str(p)]))['streams'][0]
            rate=round(int(probe['sample_rate'])*2**((midi-anchor)/12))
            raw=base.ff(['-i',str(p),'-af',f'asetrate={rate},aresample={SR}:resampler=soxr:precision=28','-ac','2','-f','f32le','pipe:1']);a=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
            a/=max(np.quantile(np.abs(a),.999),.005);variants[key]=a
            assignments.append(dict(instrument=inst,midi=midi,anchor_midi=anchor,semitones=midi-anchor,source=name,source_sha256=record['sha256']))
        sample=variants[key];lead=event['role']=='lead melody';sustain=event['duration']
        # All note releases clear the current bar's harmonic boundary. No pedal fog.
        release=max(1/SR,min(.28 if inst in ('piano','harp','timpani') else .40,event['harmony_end']-event['time']-sustain))
        wanted=min(len(sample),round((sustain+release)*SR),max(1,round((event['harmony_end']-event['time'])*SR)));note=sample[:wanted].copy();t=np.arange(wanted)/SR
        attack=0 if inst in ('piano','harp','timpani') else .16 if inst in ('horn','bassoon','clarinet') else .19 if lead else .25
        env=np.minimum(1,np.maximum(0,(sustain+release-t)/release))
        if attack:env*=np.minimum(1,t/attack)
        # Slow natural bow/breath shape; recorded sustain is never oscillator-looped.
        if inst not in ('piano','harp','timpani'):env*=.86+.14*np.sin(np.pi*np.minimum(1,t/max(sustain,.1)))
        gains=dict(piano=.17,cello=.10,violin=.095,viola=.065,horn=.085,bassoon=.075,clarinet=.075,harp=.13,timpani=.08)
        gain=gains[inst]*(event['velocity']/70)**1.7*(1 if lead else .72)
        pan=dict(piano=.06,cello=-.25,viola=-.07,violin=.26,horn=.08,bassoon=-.10,clarinet=.12,harp=-.15,timpani=.03)[inst]
        env[:min(96,wanted)]*=np.linspace(0,1,min(96,wanted));env[-min(480,wanted):]*=np.linspace(1,0,min(480,wanted))
        note*=env[:,None]*gain;note[:,0]*=np.sqrt(1-pan);note[:,1]*=np.sqrt(1+pan)
        group='piano' if inst in ('piano','harp') else 'winds' if inst in ('horn','bassoon','clarinet') else 'strings'
        start=round(event['time']*SR);end=min(length,start+wanted);stems[group][start:end]+=note[:end-start]
    # Bounded diffuse reflections, avoiding long full-track FFT working buffers.
    # These derive only from the recorded instruments; no added pitched synthesis.
    for group in ('piano','strings','winds'):
        audio=stems[group]
        for delay,gain in [(0.041,.12),(.079,.085),(.127,.058),(.191,.037),(.283,.024),(.419,.014),(.617,.008)]:
            n=round(delay*SR);stems['room'][n:]+=audio[:-n,::-1]*gain
    t=np.arange(length)/SR;fade=np.minimum(1,t/.08)*np.minimum(1,np.maximum(0,(comp['duration_seconds']-t-1/SR)/4.2))**1.5
    for a in stems.values():a*=fade[:,None];a[0]=0;a[-1]=0
    mix=sum(stems.values());gain=min(.70/max(np.max(np.abs(mix)),1e-8),.085/max(np.sqrt(np.mean(mix**2)),1e-8))
    for a in stems.values():a*=gain
    return stems,assignments,float(gain)


def loudness(path,log):
    r=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,timeout=70,check=True)
    log.write_bytes(r.stderr);s=r.stderr.decode();return float(re.findall(r'I:\s*(-?[\d.]+) LUFS',s)[-1]),float(re.findall(r'Peak:\s*(-?[\d.]+) dBFS',s)[-1])


def wav(path,audio):
    raw=base.pcm24(audio);base.ff(['-f','s24le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','pcm_s24le',str(path)],raw)
    return dict(path=path.name,bytes=path.stat().st_size,sha256=base.sha(path.read_bytes()),pcm24_sha256=base.sha(raw))



def mastering_gain(lufs,peak,track):
    # Table's sparse piano needs the owner's actual headroom, not a new limiter.
    ceiling=-2.05 if track=='table' else -2.5
    return min(10**((-19-lufs)/20),10**((ceiling-peak)/20))

def main():
    p=argparse.ArgumentParser();p.add_argument('--track',choices=TRACKS);p.add_argument('--out',type=Path);p.add_argument('--score',type=Path);p.add_argument('--master-from',type=Path,help='Level-only correction from a retained same-score campaign attempt; never rerenders notes');p.add_argument('--preflight-only',action='store_true');args=p.parse_args()
    if args.preflight_only:
        report=preflight();print(json.dumps({k:v for k,v in report.items() if k not in ('sources','anchors')},indent=2));return
    if not args.track or not args.out:p.error('--track and a fresh --out are required')
    if not (HOME/'preflight.json').exists():raise RuntimeError('Run one-note/score preflight first')
    comp=validate(json.loads(args.score.read_text()) if args.score else composition(args.track))
    if comp['track']!=args.track:raise ValueError('Edited score track mismatch')
    frozen=frozen_hashes();pre=json.loads((HOME/'preflight.json').read_text())
    if runtime_versions()!=pre['runtime']:raise RuntimeError('Dependency versions changed since preflight')
    if frozen!=pre['source_hashes']:raise RuntimeError('Source changed since preflight freeze')
    if not base.run(['ffmpeg','-version']).decode().startswith('ffmpeg version 8.1.2'):raise RuntimeError('Frozen FFmpeg8.1.2 required')
    out=args.out.resolve()
    if not out.is_relative_to(HOME.resolve()) or out==HOME.resolve() or out.is_relative_to(CACHE.resolve()):raise ValueError('Output must be a fresh attempt under campaign-suite-one, outside sample-cache')
    fresh_output(out)
    (out/'score.json').write_text(json.dumps(comp,indent=2)+'\n');(out/'source-freeze.json').write_text(json.dumps(frozen,indent=2)+'\n')
    mastering_origin=None
    if args.master_from:
        origin=args.master_from.resolve()
        if not origin.is_relative_to(HOME.resolve()) or origin==out:raise ValueError('Mastering origin must be a retained campaign attempt')
        if json.loads((origin/'score.json').read_text())!=comp:raise ValueError('Mastering correction cannot change the score')
        prior=json.loads((origin/'source-freeze.json').read_text())
        archived=HOME/'frozen-recipes'/(prior[Path(__file__).name]+'.py')
        if not archived.is_file() or base.sha(archived.read_bytes())!=prior[Path(__file__).name]:raise RuntimeError('Retained original recipe unavailable')
        stems={};input_hashes={}
        for name in STEMS:
            source=origin/(SLUGS[args.track]+'_'+name+'.wav');input_hashes[source.name]=base.sha(source.read_bytes())
            raw=base.ff(['-i',str(source),'-f','f32le','pipe:1']);stems[name]=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
        assignments=[];seen=set()
        for event in comp['notes']:
            inst=event['track'];midi=event['midi'];anchors=mapping()[inst];anchor=min(anchors,key=lambda a:(abs(a-midi),a));key=(inst,midi)
            if key in seen:continue
            seen.add(key);source=anchors[anchor]
            assignments.append(dict(instrument=inst,midi=midi,anchor_midi=anchor,semitones=midi-anchor,source=source,source_sha256=verify_source(source)['sha256']))
        gain=1.0;mastering_origin=dict(attempt=str(origin.relative_to(ROOT)).replace('\\','/'),stem_input_sha256=input_hashes,original_recipe_sha256=prior[Path(__file__).name],operation='Common linear gain only; original sample-note render reused, no dynamics compression')
    else:
        stems,assignments,gain=render(comp)
    mix=sum(stems.values())
    if not np.isfinite(mix).all() or np.max(np.abs(mix))>(.80 if args.master_from else .71):raise RuntimeError('Finite/headroom render gate failed')
    slug=SLUGS[args.track];master=out/(slug+'.wav');wav(master,mix)
    lufs,peak=loudness(master,out/'loudness-initial.log')
    # Deterministic level calibration on the same floating master, never rerender.
    correction=mastering_gain(lufs,peak,args.track)
    for a in stems.values():a*=correction
    mix=sum(stems.values());exports={'mix':wav(master,mix)}
    for name,a in stems.items():exports[name]=wav(out/(slug+'_'+name+'.wav'),a)
    for extension,codec,quality in [('mp3','libmp3lame','2'),('ogg','libvorbis','6')]:
        target=out/(slug+'.'+extension);base.ff(['-i',str(master),'-map_metadata','-1','-metadata','title='+comp['title'],'-metadata','artist=A War Without Victory project','-metadata','album=A War Without Victory — Campaign Soundtrack Auditions','-c:a',codec,'-q:a',quality,str(target)])
        base.ff(['-i',str(target),'-f','null','-'])
        exports[extension]=dict(path=target.name,bytes=target.stat().st_size,sha256=base.sha(target.read_bytes()))
    lufs,peak=loudness(master,out/'loudness.log')
    if not (-20.2 if args.track=='table' else -20)<=lufs<=-18 or peak>-2:raise RuntimeError('Final loudness/true-peak gate failed')
    # Quantization additivity: allow four integer LSB for four independently rounded stems.
    reconstructed=sum(np.rint(a.astype(np.float64)*8388607).astype(np.int32) for a in stems.values())
    master_int=np.rint(mix.astype(np.float64)*8388607).astype(np.int32)
    additive_error=int(np.max(np.abs(reconstructed-master_int)))
    if additive_error>4:raise RuntimeError('Additive PCM24 stems failed')
    blocks=[float(np.sqrt(np.mean(mix[i:i+SR].astype(np.float64)**2))) for i in range(0,len(mix),SR)]
    silent=[i for i,rms in enumerate(blocks[:-5]) if rms<1e-5]
    run=0;max_run=0
    for rms in blocks[:-5]:run=run+1 if rms<1e-5 else 0;max_run=max(max_run,run)
    if max_run>5:raise RuntimeError('Unexpected dead passage')
    records=[verify_source(n) for n in sorted({a['source'] for a in assignments}|{'LICENSE','README.md','Readme.txt','Keys/Upright Piano/Info.txt','Keys/Upright Piano/MappingChart.txt'})]
    (out/'sample-sources.json').write_text(json.dumps(records,indent=2)+'\n');(out/'note-sample-assignments.json').write_text(json.dumps(assignments,indent=2)+'\n');(out/'LICENSE-VSCO-CC0.txt').write_bytes((base.CACHE/'LICENSE').read_bytes())
    if frozen_hashes()!=frozen:raise RuntimeError('Source changed during render')
    report=dict(title=comp['title'],track=args.track,duration_seconds=comp['duration_seconds'],frames=len(mix),sample_rate=SR,channels=2,pcm_bits=24,meter=comp['meter'],events=len(comp['notes']),sections=comp['sections'],integrated_lufs=lufs,true_peak_dbfs=peak,peak_dbfs=float(20*np.log10(np.max(np.abs(mix)))),pcm24_additive_max_lsb=additive_error,max_unexpected_silent_seconds=max_run,silent_seconds_before_tail=silent,rms_seconds=blocks,source_hashes=frozen,score_sha256=base.sha((out/'score.json').read_bytes()),mix_gain=gain*correction,mastering_origin=mastering_origin,exports=exports,approval='Creative audition only; no runtime mapping; human listening/sensitivity judgment remains open')
    (out/'render-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='rms_seconds'},indent=2))

if __name__=='__main__':main()