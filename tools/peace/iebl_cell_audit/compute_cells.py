import json,collections,math,sys
from pathlib import Path
S=sys.argv[1]
# Repo root from this file's location (tools/peace/iebl_cell_audit -> repo), not a fixed drive.
R=Path(__file__).resolve().parents[3].as_posix()+'/'
scope='bosanska_krupa bosanski_petrovac bosanski_samac doboj foca gorazde gracanica gradacac ilidza jajce kalesija kljuc kupres lopare mostar novo_sarajevo odzak orasje pale sanski_most skender_vakuf stari_grad_sarajevo stolac titov_drvar trebinje trnovo ugljevik zvornik srebrenica bratunac cajnice rogatica visegrad brcko'.split()
areas=json.load(open(R+'data/derived/operational/osid_areas.json',encoding='utf-8'))['areas']
ops=json.load(open(R+'data/derived/operational/operational_settlements.geojson',encoding='utf-8'))
geo=json.load(open(R+'data/derived/settlements_wgs84_1990.geojson',encoding='utf-8'))
cen=json.load(open(R+'data/source/bih_census_1991.json',encoding='utf-8'))
rows=json.load(open(R+'data/source/municipality_post1995_to_mun1990.json',encoding='utf-8'))['rows']
code2name={x['post1995_code']:x['post1995_name'] for x in rows}
code2name['20397']='Novi Grad (Bosanski Novi)'
def entity(code):
    return {'1':'FED','2':'RS','3':'special'}[code[0]]
def ring_area(ring):
    lat0=sum(p[1] for p in ring)/len(ring)
    kx=111.32*math.cos(math.radians(lat0)); ky=110.574
    a=0
    for i in range(len(ring)):
        x1,y1=ring[i][0]*kx,ring[i][1]*ky; x2,y2=ring[(i+1)%len(ring)][0]*kx,ring[(i+1)%len(ring)][1]*ky
        a+=x1*y2-x2*y1
    return abs(a)/2
def geom_area(g):
    if g is None: return 0
    polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    tot=0
    for poly in polys:
        tot+=ring_area(poly[0])-sum(ring_area(r) for r in poly[1:])
    return tot
def centroid(g):
    polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    xs=[];ys=[]
    for poly in polys:
        for p in poly[0]: xs.append(p[0]); ys.append(p[1])
    return (round(sum(xs)/len(xs),4), round(sum(ys)/len(ys),4))
sid2feat={f['properties']['sid']:f for f in geo['features']}
out={}
for f in ops['features']:
    p=f['properties']; osid=p['osid']; mun=osid.split(':')[1]
    if mun not in scope: continue
    if osid not in areas: continue
    sett=[]
    ent_area=collections.Counter(); ent_pop=collections.Counter(); codes=collections.Counter()
    for sid in p['constituent_sids']:
        sf=sid2feat.get(sid)
        if not sf:
            sett.append({'sid':sid,'name':'?','note':'no geo'}); continue
        sp=sf['properties']; a=geom_area(sf['geometry'])
        cids=sp.get('census_ids',[])
        parts=[]
        for c in cids:
            cr=cen['settlements'].get(c)
            if cr: parts.append((c,cr['m'],cr['p'][0]))
        if not parts:
            sett.append({'sid':sid,'name':sp['settlement_name'],'area':round(a,2),'note':'no census code'}); continue
        totp=sum(x[2] for x in parts) or 1
        split=len(set(x[1] for x in parts))>1
        for c,m,pp in parts:
            w=(pp/totp) if split else 1.0/len(parts)
            ent_area[entity(m)]+=a*w; ent_pop[entity(m)]+=pp; codes[(m,code2name.get(m,m))]+=a*w
        sett.append({'sid':sid,'name':sp['settlement_name'],'area':round(a,2),'pop':sp.get('population_total'),
                     'post1995':[(m,code2name.get(m,m),pp) for c,m,pp in parts],'split':split})
    ta=sum(ent_area.values()) or 1
    out[osid]={'mun':mun,'area_km2':areas[osid],'name':p['settlement_name'],'centroid':centroid(f['geometry']),
               'ethnic_key':p.get('ethnic_key'),'pop':p.get('population_total'),
               'share_area':{k:round(v/ta*100,1) for k,v in ent_area.items()},
               'share_pop':{k:round(v/(sum(ent_pop.values()) or 1)*100,1) for k,v in ent_pop.items()},
               'post1995_codes':{f'{m} {n}':round(v/ta*100,1) for (m,n),v in codes.items()},
               'settlements':sett}
# check scope coverage vs areas
for mun in scope:
    cells=[k for k in areas if k.split(':')[1]==mun]
    miss=[k for k in cells if k not in out]
    if miss: print('MISSING cells for',mun,miss)
json.dump(out,open(S+'/work/cells_computed.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('cells',len(out))
# summary print
for mun in scope:
    print('\n==',mun)
    for osid,v in sorted(out.items()):
        if v['mun']!=mun: continue
        sp=v['share_area']; flag=' CROSSED' if len(sp)>1 and min(sp.values())>=5 else ''
        print(f"  {osid:42s} {v['area_km2']:7.1f} {v['name'][:28]:28s} {v['ethnic_key']} {json.dumps(v['share_area'])} {json.dumps(v['post1995_codes'],ensure_ascii=False)}{flag}")
