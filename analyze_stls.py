"""Inspect the actual binary STL references and their validated 1:4 triangle hierarchy."""
from pathlib import Path
import json
import struct
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection, LineCollection

ROOT = Path(__file__).parent
OUT = ROOT / 'analysis'
OUT.mkdir(exist_ok=True)

def read_stl(path):
    data = path.read_bytes()
    count = struct.unpack_from('<I', data, 80)[0]
    assert len(data) == 84 + count * 50
    dtype = np.dtype([('normal', '<f4', (3,)), ('vertices', '<f4', (3, 3)), ('attribute', '<u2')])
    return np.frombuffer(data, dtype=dtype, offset=84)['vertices'].astype(float)

def hierarchy(triangles):
    # Toxiclibs' binary exporter reverses the first two vertices of each face.
    levels = [triangles[:, [1, 0, 2]]]
    while len(levels[0]) % 4 == 0:
        children = levels[0].reshape(-1, 4, 3, 3)
        # Original Processing order: center, corner A, corner B, corner C.
        expected = np.stack([children[:, 2, 2], children[:, 1, 2], children[:, 1, 1]], axis=1)
        if not np.allclose(children[:, 0], expected, atol=2e-5):
            break
        if not np.allclose(children[:, 3, 0], children[:, 1, 2], atol=2e-5): break
        if not np.allclose(children[:, 3, 1], children[:, 2, 2], atol=2e-5): break
        if not np.allclose(children[:, 2, 0], children[:, 1, 1], atol=2e-5): break
        parent = np.stack([children[:, 1, 0], children[:, 2, 1], children[:, 3, 2]], axis=1)
        levels.insert(0, parent)
    return levels

PROJECTIONS = {
    'Plan · XY': np.array([[1, 0, 0], [0, -1, 0], [0, 0, 1]]),
    'Elevation · XZ': np.array([[1, 0, 0], [0, 0, 1], [0, 1, 0]]),
    'Axonometric': np.array([[-.8944, .4472, 0], [-.18, -.36, .915], [.409, .818, .402]]),
}

def draw(ax, triangles, projection, bounds=None, lines=True):
    triangles = np.asarray(triangles, dtype=float)
    coords = triangles @ projection.T
    order = np.argsort(coords[:, :, 2].mean(axis=1))
    normal = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    length = np.linalg.norm(normal, axis=1)
    normal /= np.maximum(length[:, None], 1e-12)
    light = np.abs(normal @ np.array([-.6, .3, .74]))
    shades = np.clip(.55 + .36 * light, 0, 1)
    colors = np.stack([shades*.95, shades, shades*.94, np.ones_like(shades)], axis=1)
    ax.add_collection(PolyCollection(coords[order, :, :2], facecolors=colors[order], edgecolors='#38463540' if lines else 'none', linewidths=.25))
    pts = coords.reshape(-1, 3)
    if bounds is None: bounds = (pts[:, :2].min(axis=0), pts[:, :2].max(axis=0))
    low, high = bounds
    pad = max(high-low)*.07
    ax.set_xlim(low[0]-pad, high[0]+pad); ax.set_ylim(low[1]-pad, high[1]+pad)
    ax.set_aspect('equal'); ax.axis('off'); ax.set_facecolor('#f7f7f2')

report = []
targets = sorted((ROOT / 'Old Project FIles').glob('*.stl'))
fig, axes = plt.subplots(len(targets), 3, figsize=(12, len(targets)*3.1), layout='constrained')
fig.set_facecolor('#f7f7f2')
for row, path in enumerate(targets):
    triangles = read_stl(path)
    levels = hierarchy(triangles)
    assert len(levels[0]) == 2, f'Could not validate the complete hierarchy in {path.name}'
    vertices = triangles.reshape(-1, 3)
    lo, hi = vertices.min(axis=0), vertices.max(axis=0)
    stats = {'name':path.name, 'triangles':len(triangles), 'bounds':[lo.tolist(),hi.tolist()], 'dimensions':(hi-lo).tolist(), 'hierarchy':[len(x) for x in levels]}
    report.append(stats)
    for col, (name, projection) in enumerate(PROJECTIONS.items()):
        draw(axes[row,col], triangles, projection, lines=len(triangles)<10000)
        axes[row,col].set_title(f'{path.stem} — {name}\n{len(triangles):,} triangles', fontsize=10, loc='left')
    if path.name.startswith('Target_'):
        fig2, axs2 = plt.subplots(3,len(levels),figsize=(3.2*len(levels),9),layout='constrained',squeeze=False)
        fig2.set_facecolor('#f7f7f2')
        for r,(name,projection) in enumerate(PROJECTIONS.items()):
            projected=triangles.reshape(-1,3)@projection.T
            bounds=(projected[:,:2].min(axis=0),projected[:,:2].max(axis=0))
            for c,level in enumerate(levels):
                draw(axs2[r,c],level,projection,bounds,lines=len(level)<10000)
                axs2[r,c].set_title(f'{name}\n{len(level):,} faces',fontsize=10)
        fig2.suptitle(f'{path.name} — parent triangles reconstructed from validated child ordering',fontsize=14)
        fig2.savefig(OUT/f'{path.stem}-hierarchy.png',dpi=140)
        plt.close(fig2)
fig.savefig(OUT/'stl-reference-comparison.png',dpi=140)
plt.close(fig)
(OUT/'stl-measurements.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))

# Optional generated-study JSON is exported from the same module used by the app.
generated_path = OUT / 'generated-study.json'
if generated_path.exists():
    study = json.loads(generated_path.read_text(encoding='utf-8'))
    frames = study['frames']
    meshes = [np.array(f['vertices'],dtype=float)[np.array(f['faces'])] for f in frames]
    fig, axes = plt.subplots(3,len(frames),figsize=(3.2*len(frames),9),layout='constrained',squeeze=False)
    fig.set_facecolor('#f7f7f2')
    all_points = np.concatenate([t.reshape(-1,3) for t in meshes])
    for row,(name,proj) in enumerate(PROJECTIONS.items()):
        projected=all_points@proj.T
        bounds=(projected[:,:2].min(axis=0),projected[:,:2].max(axis=0))
        for col,(frame,mesh) in enumerate(zip(frames,meshes)):
            draw(axes[row,col],mesh,proj,bounds,lines=len(mesh)<3000)
            axes[row,col].set_title(f"{frame['phase'].upper()} · {frame['title']}\n{len(mesh):,} faces · {name}",fontsize=9)
    fig.savefig(OUT/'plan-first-progression.png',dpi=130)
    plt.close(fig)

    reference=read_stl(ROOT/'Old Project FIles/Target_4.stl')
    fig,axes=plt.subplots(2,3,figsize=(12,10),layout='constrained')
    fig.set_facecolor('#f7f7f2')
    for row,mesh in enumerate([meshes[-1],reference]):
        for col,(name,proj) in enumerate(PROJECTIONS.items()):
            draw(axes[row,col],mesh,proj,lines=False)
            axes[row,col].set_title(('Generated plan-first study' if row==0 else 'Original Target_4.stl')+'\n'+name,fontsize=11)
    fig.savefig(OUT/'generated-vs-target4.png',dpi=130)
    plt.close(fig)
