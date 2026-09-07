# Cathedral — Recursive Nave Grammar

A single triangle develops into an abstract Gothic nave through recursive
expansion and contraction. The section and its local pinnacle outlines drive a symmetric,
triangulated folded bay with a closed interior/exterior boundary.

## Run

```powershell
python -m http.server 8080
```

Open [localhost:8080](http://localhost:8080). No build is required. The 2D study
runs locally; the 3D viewer uses the existing pinned Three.js 0.166.1 CDN imports.

## Formal development

| Step | Target | Operation | Result / retained elements |
| --- | --- | --- | --- |
| 0 | One triangle | Seed | Undivided, mirrored material section |
| 1 / E | Outer roof slope | Split, extend, raise | First buttress pair and central pinnacle; retain the carrier apex |
| 2 / C | Ground interval | Cut upward into the mass | Pointed nave; keep the roof and pier feet |
| 3 / E | Smaller child slope | Repeat the same expansion | A lower, subordinate buttress tier |
| 4 / C | Existing arch edges and outer mass | Establish springing; open side aisles | Vertical nave piers and lower aisle openings |
| 5 / E | Next outer child slope | Repeat at the smaller scale | Outer pinnacles |
| 6 / C | Arch shoulders and next pier interval | Subdivide arches; pinch spire collars | Segmented pointed arches, slender pinnacles, preserved vertical piers |

Every stage is rebuilt from its parent. The cards show actual generated sections
at a common scale. Selecting a card exposes that rule's target, retained elements,
and result. The rule and its individual strength can be edited; all descendants
then develop from the edited state. Reordering E/C can change the formal outcome.

### Expansion

For active peak A, outer foot B, horizontal span d, peak height H, and strength s:

```
shoulder = (A.x + 0.62d, H(0.38 + 0.29s))
pinnacle = (A.x + 0.86d, H(0.14 + 0.86s))
new foot = (B.x + 0.60sd, 0)
```

The smaller outer slope becomes the next recursion site. Earlier peaks and voids
remain fixed. Positive expansion adds material area. Very small branches stop
at a relative detail limit to avoid unstable microscopic geometry.

### Contraction

The first C cuts a triangular nave from below. The next refinement moves a new
point to the opening's outer radius at its springing height, establishing a
vertical pier. Later C steps retain those piers and subdivide the sloping arch
shoulders, moving new points outward into the material. A smaller pair of aisle
openings is cut from the next available outer interval.

**Nave span** sets the target span relative to the seed, modulated by the first C's
strength. **Springing height** is a fraction of the opening's crown height.
**Minimum web** reserves vertical clearance below the roof and horizontal
separation between aisle openings. It is an axis-based clearance, not a uniform
normal-offset shell thickness. When a high springing would breach the roof web,
the algorithm lowers the achieved springing while retaining vertical piers and
reports that limit in the step description.

Contraction removes section area. Zero-strength E/C steps retain the section.
The numerical rules are implementation choices for this study.

## Pinnacle outline refinement

Each recursive roof peak, including the central crown, receives a shoulder,
a raised stem and a needle tip. Expansion grows this local envelope; contraction
narrows the neck while retaining its tip and the carrier roof beneath it. The
arch-clearance checks use that carrier roof, so a decorative crown cannot conceal
an opening that has cut through its supporting web.

**Pinnacle rise** sets the height above the carrier peak (17–58% of the local
peak height over the supported slider range). **Pinnacle slenderness** sets how
strongly successive contractions pinch the stem. Slenderness becomes visible
when a C rule has acted on that peak. Zero-strength rules retain the geometry.

The silhouette interpretation comes from the narrow spires and stepped shoulders
on pages 16 and 31 of the supplied Mahla Behrooz studio PDF. Pages 26 and 40
inform the folds across the bay. These are simplified generators, not traced
reproductions of the drawings.

## A closed, articulated bay

The carrier profile is sampled at five depth planes: the two ends, two shoulders
at ±22% of bay depth, and the middle. The actual middle slice matches the refined
2D section. The lower end sections omit the middle pinnacles, allowing arrays
to join without spire intersections or duplicate internal caps.

At each peak, a patch of the carrier roof is replaced by an eight-sided shoulder
ring, a narrower neck ring, and one tip. The neck contracts in both X and Z.
Every crown is an isolated pyramidal pinnacle, rather than a ridge extended
along the bay. The attachment replaces the underlying roof faces; it contains
no overlapping closed solids or hidden internal roof.

**Buttress projection** flares the two shoulder planes, strongest toward the
lower supports, producing a battered, folded plan. **Vault fold** lifts the
upper panels at those planes, with a limit that retains the pinnacle shoulders.

**Longitudinal arch** raises the lower boundary between the middle and end
support planes. Its development follows C maturity: 1 − exp(−sum of C strengths).
The lift uses the height of the local buttress tier, tapering to zero at its
crown. This produces two pointed longitudinal spans per bay. The middle section
and both end interfaces retain grounded feet. This is a deformation of the
connected section web, not a simulation of masonry or a constant-thickness shell.

The complete bay and its triangulation mirror across X and Z. **Side** shows
the longitudinal openings; **Plan** shows the projecting shoulders and contracted
pinnacle footprints; **Axon** restores the oblique view. Drag to orbit.

**Array** repeats the bay. With zero gap, matching end vertices are welded and
internal caps are removed, yielding one closed body. A positive gap leaves
separate closed bays. **Cutaway** affects only the display; exported STL remains
complete. **Fold lines** displays the real triangle edges and stronger creases.

## Watertight validation and export

The viewer checks boundary edges, nonmanifold edges and vertex links, winding,
duplicate/degenerate faces, connected components, and positive signed volume.
Its status reports the result and disables STL export if closure fails.

```powershell
node --test section-grammar.test.mjs folded-bay.test.mjs
node export-section-study.mjs
```

The 30 tests cover geometry and rule invariants, vertical piers, roof clearance,
isolated pinnacle tips, longitudinal spans, geometric projection controls,
exact transverse/longitudinal triangle symmetry, end-cap material area, folded
panels, sample panel-intersection checks, arrays, parameter extremes, and the
watertightness of the actual float32 STL round-trip.

`output/section-study/` contains the default example:

- `nave-bay.stl`: one closed bay, 316 welded vertices / 628 triangles.
- `nave-array.stl`: five touching bays, one closed body, 1,372 vertices / 2,740 triangles.
- `nave-section.svg`: the final section drawing.
- `development-sequence.svg`: the compact six-step teaching sequence plus seed.
- `mesh-validation.json`: stage and exported-STL validation.
- `trimesh-validation.json`: independent Trimesh checks on both STL files.

Both exported examples were independently verified as watertight, consistently
wound positive volumes, with one connected body and Euler characteristic 2.
The dimensions use the study's model units; no physical structural analysis is
implied by geometric closure.

## Suggested next upgrades

1. Generate flying buttress ribs between the nave springing and each outer
   pinnacle base, then derive folded webs from those ribs.
2. Let rules target a selected tier (nave, aisle, outer buttress) and show the
   inherited parent edge for each local transformation.
3. Add rib subdivision and a physical minimum thickness check before fabrication.
   The present web parameter reserves section clearance, not uniform thickness.

The previous plan-first study remains available in `plan-study.html`.
