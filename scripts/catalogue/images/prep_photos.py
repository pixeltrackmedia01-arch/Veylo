# Prepares model photos from a Drive export (mimg/<model>/, listed in mimg/<model>.idx.json):
# drops excluded frames, trims screenshot edges, removes near-duplicates, puts the hero
# and studio shots first and writes WebP (max 1280 px) to web/<model>/ with a manifest.
# Files are uploaded to the vehicle-images bucket as <vehicle_id>/<file>.
import json,os
from PIL import Image,ImageStat
# model: (vehicle id, display name, hero index, excluded indexes)
M={
 "brezza":("13bbbb5f-e9a7-4d45-b234-345b6d061fb4","Maruti Suzuki Brezza",17,{41,44,46}),
 "swift":("62f0acc4-46e8-4215-a221-7fb66ffa1748","Maruti Suzuki Swift",3,set()),
 "dzire":("5f37cb6d-5e74-4afe-9727-9bba91ccdc89","Maruti Suzuki Dzire",41,{39,8}),
 "ertiga":("c49fa0e5-9652-4f84-bba5-4fe3ebc3b13a","Maruti Suzuki Ertiga",32,set()),
 "celerio":("d54f15bc-9422-45a6-9098-a188347d2622","Maruti Suzuki Celerio",11,set()),
 "s-presso":("c545331e-318f-4439-bd9e-ea5c1242f0da","Maruti Suzuki S-Presso",10,{6,9,14,18}),
 "wagonr":("0ac7d6da-3a1b-4b12-887e-259a867add01","Maruti Suzuki Wagon R",8,{17}),
 "eeco":("740b5fa8-98cb-4c7c-b584-6a2c80651e9a","Maruti Suzuki Eeco",1,set()),
 "alto-k10":("96c8cd69-f1b9-4b0c-a301-293b1411e49c","Maruti Suzuki Alto K10",3,{0,1,5,9}),
}
def trim(im):
    g=im.convert("L"); w,h=g.size
    def flat(box): return ImageStat.Stat(g.crop(box)).stddev[0]<6
    l=t=0;r,b=w,h
    for _ in range(14):
        if flat((l,0,l+1,h)): l+=1
        if flat((r-1,0,r,h)): r-=1
        if flat((0,t,w,t+1)): t+=1
        if flat((0,b-1,w,b)): b-=1
    return im.crop((l+2,t+2,r-2,b-2))  # also shave any anti-aliased screenshot edge
def dhash(im):
    g=im.convert("L").resize((9,8)); p=list(g.get_flattened_data())
    return sum(1<<i for i in range(64) if p[(i//8)*9+i%8]>p[(i//8)*9+i%8+1])
def studio(im):
    g=im.convert("L"); w,h=g.size
    return all(g.getpixel(xy)>225 for xy in [(5,5),(w-6,5),(5,h-6),(w-6,h-6)])
out=[]
for m,(vid,name,hero,excl) in M.items():
    files=json.load(open(f"mimg/{m}.idx.json"))
    items=[]
    for i,f in enumerate(files):
        if i in excl: continue
        im=trim(Image.open(f"mimg/{m}/{f}").convert("RGB"))
        items.append((i,im,dhash(im),studio(im)))
    kept=[]
    for it in sorted(items,key=lambda x:(x[0]!=hero,)):  # hero first so it wins dedupe
        if any(bin(it[2]^k[2]).count("1")<=6 for k in kept): continue
        kept.append(it)
    kept.sort(key=lambda x:(x[0]!=hero, not x[3], x[0]))
    os.makedirs(f"web/{m}",exist_ok=True)
    slug=name.lower().replace(" ","-")
    for n,(i,im,_,st) in enumerate(kept,1):
        if im.width>1280: im=im.resize((1280,round(im.height*1280/im.width)),Image.LANCZOS)
        fn=f"{slug}-{n}.webp"; im.save(f"web/{m}/{fn}","WEBP",quality=82,method=6)
        alt=f"{name} front three-quarter view" if n==1 else (f"{name} exterior, studio image {n}" if st else f"{name} photo {n}")
        out.append(dict(vehicle_id=vid,model=m,file=fn,alt=alt,sort=n-1,src=files[i]))
    print(m,len(files),"->",len(kept))
json.dump(out,open("web/manifest.json","w"),indent=0)
