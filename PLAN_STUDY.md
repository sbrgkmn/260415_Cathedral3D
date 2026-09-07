# Cathedral — Plan, then height

A parametric study of two mirrored triangular faces developing into a branching
cathedral-like surface. The sequence now completes its plan subdivision before
starting vertical expansion/contraction.

## Run

```powershell
python -m http.server 8080
```

Open [localhost:8080](http://localhost:8080). No build or package installation is
needed. Three.js and fonts load from public CDNs.

## Current sequence

| Stage | Phase | Operation | Triangles |
| --- | --- | --- | ---: |
| 0 | Seed | Two triangular faces sharing a ridge | 2 |
| 1 | Plan | Expand the ground contour | 4 |
| 2 | Plan | Contract new ground recesses | 8 |
| 3 | Plan | Expand secondary lobes | 16 |
| 4 | Plan | Separate the branches with recesses | 32 |
| 5 | Plan | Divide the sectors into connected local cells | 128 |
| 6 | Vertical | Raise the established branches | 512 |
| 7 | Vertical | Carve valleys between existing peaks | 2,048 |
| 8 | Surface | Add smaller facets and restrained relief | 8,192 |

**Inspect completed plan** jumps to the end of the plan phase in orthographic plan
view. The three phase buttons navigate between plan, vertical growth, and surface
articulation. Timeline cards, previous/next buttons, and playback expose every stage.
**Progressive series** pairs the real geometry of each stage with its plan, using
common projection bounds across the sequence.

Plan E/C cycles control the number of radial sectors: 1, 2, or 3 cycles create 8,
32, or 128 sectors. The final plan-cell division splits each sector 1:4 without
deforming the surface. Only then do vertical E/C operations begin. The depth
controls share a 32,768-triangle budget; unavailable combinations are disabled.

## Rules

Coordinates are Z-up, with X=0 as the bilateral mirror plane. One seed half is
`(0,0,H), (W/2,0,0), (0,D,0)`. Mirroring and welding the seam gives two faces.

1. **Plan expansion/contraction:** split each ground contour segment at its midpoint.
   Move that point radially away from or toward the projected apex, with displacement
   proportional to the local segment length. Split its parent sector into two.
   Alternate E/C for the selected number of cycles. Angular order stays fixed and
   inward displacement stops short of the origin, preserving a non-overlapping,
   star-shaped footprint. Existing vertices retain their coordinates.
2. **Plan cells:** subdivide each sector into four triangles using undisplaced edge
   midpoints. This establishes cross-connections and local edges before vertical
   development. Newly sampled heights interpolate the existing surface; there is
   no vertical deformation in this phase.
3. **Vertical expansion:** choose new edge points biased toward the lower endpoint
   by **Branch uprightness**. This positions upper branch points closer to their
   bases, giving steeper sides. Then raise them in Z by
   `planLength(edge) × H/(W/2) × expansion × decay^generation`.
4. **Vertical contraction:** insert edge midpoints and lower their Z coordinates by
   `z' = z × (1 - contraction × decay^generation)`. Earlier apices remain fixed.
   The center ridge can develop new peaks through depth while remaining welded
   to its mirror. Ground edges stay on the ground; the entire footprint is fixed.
5. **Surface:** subdivide 1:4 with small alternating positive/negative Z relief on
   interior half-mesh edges. All boundary points remain collinear with their parent
   boundary edges, preserving the developed outline.

The geometry is an open triangular surface without thickness or a ground cap.
**Export study STL** always exports the selected generated stage in Z-up coordinates.
The camera and reference display transforms do not affect the exported geometry.

## Actual STL comparisons

**Compare target STLs** loads the original `Target_1.stl` through `Target_6.stl`.
Choose **Generated study**, **Original target STL**, or **Study + target overlay**.
For comparison, the target is uniformly scaled to the final generated height and
its lowest Z is placed at zero. Its proportions and triangle coordinates relative
to one another are retained. This display normalization is not a fitted match.

The analysis includes plan/elevation/axonometric views of all targets, their
measured dimensions, and coarse parent meshes reconstructed from validated sibling
triangle ordering. See `STL_ANALYSIS.md` and the images linked from the reference
controls. The current generator is informed by that inspection; it does not claim
to reproduce any target exactly. Its radial plan sectors remain more regular than
the targets' recursive internal subdivisions.

The conceptual phase ordering follows the horizontal/vertical distinction in
[Gökmen (2020), Figures 6–7, pp. 61–62](https://jfa.arch.metu.edu.tr/uploads/docs/sayilar/sayi-37-1/metujfa2020105.pdf).
Numerical interpolation, radial contour growth, and split bias are implementation
choices for this study, not equations claimed to be specified by the paper.

## Files and verification

- `polarity.mjs` — geometric phases, immutable snapshots, mesh analysis, binary STL export.
- `stl.mjs` — original binary STL reader; no fitting or procedural substitution.
- `study.js`, `study.css`, `index.html` — viewer, stage drawings, controls, reference comparison.
- `polarity.test.mjs` — geometry, phase separation, and STL round-trip/reader tests.
- `analyze_stls.py` — source STL measurements and reconstructed parent views; uses NumPy and Matplotlib.
- `analysis/` — the reference report figures and measurements.
- `legacy.html`, `main.js`, `styles.css` — preserved previous implementation.
- `Old Project FIles/` — unchanged Processing sources and STL files.

```powershell
node --test polarity.test.mjs
python analyze_stls.py
```

Tests cover phase ordering, plan-only movement, branching density, neutral plan-cell
subdivision, preserved footprints and apices, topology, winding, symmetry, parameter
extremes, independent snapshots, recursion limits, and exact decoding of all six
source STLs. Binary STL tests check counts, unit normals, and Z-up vertex coordinates.
