# Recursive E/C Cell Study

One triangle develops into a connected material section through repeated
expansion and contraction. The algorithm tracks shared vertices and parent/child
regions. Architectural parts are not inserted as separate generators.

## Run

```powershell
python -m http.server 8080
```

Open http://localhost:8080. No build or package installation is required.
The 2D app runs locally. The 3D viewer uses pinned Three.js 0.166.1 CDN imports.

## The grammar

The state is a set of clockwise material-cell loops with shared vertex IDs.
Each active cell has a ground mouth, a parent ID, a generation, and an inherited
height budget. The exposed boundary is traced from edges used by exactly one
cell; shared edges partition the material without adding internal walls.

**E — expand exposed edges.** Insert a midpoint on every exposed upper edge and
move it along an outward normal with vertical bias. The displacement is scaled
by expansion strength and `childScale ** generation`. Keep its X position within
its parent edge to preserve boundary ordering. Earlier endpoints stay in place.
This adds material area.

**C — contract and split.** First bring the endpoints of inherited cap junctions
closer: the outer shoulder moves 20% and the inner crown 65% of the scaled seam
length. Neighboring cells share these vertices and therefore move together.
Then insert inward-displaced midpoints on existing void edges. Finally, cut a
tapered notch from each eligible cell mouth, retaining a band to its upper
boundary. The notch splits the region into left and right children sharing the
remaining cap edge. Their height budgets inherit the child-scale factor.
This removes material area.

New notches have target width `0.82 * C * mouthWidth` and target height
`1.10 * C * inheritedBudget`, limited by the actual cell geometry and band
clearance. Existing void edges refine from a common snapshot so traversal order
cannot introduce asymmetric results. If neighboring refinements conflict,
the entire refinement batch is reduced together.

Zero-strength rules leave both geometry and lineage unchanged. Very small
mouths stop dividing; subsequent C steps can still refine inherited boundaries.
The vertex budget is applied to entire generations to preserve symmetry.

## Controls and inspection

- **Expansion / contraction:** strengths of all E or C operations.
- **Child scale:** attenuation of growth and inherited notch heights.
- **Vertical bias:** direction of outward growth.
- **E/C cycles:** builds alternating pairs, up to five cycles. Changing this
  control resets the sequence to alternating E/C; individual cards remain editable.
- **Minimum band:** reserves local notch and seam clearances and limits small
  subdivisions. It is not a uniform normal-offset wall thickness.
- **Cells:** shows the actual material partitions; cell titles identify parents
  and generations. **Construction** adds inherited outlines, junctions and movement arrows.

The default three cycles produce 1 → 2 → 4 → 8 cells and 0 → 1 → 3 → 7 voids.
All sequence drawings share one scale. A selected rule edit regenerates its
entire descendant state; earlier frames remain unchanged.

## Folded projection

The material boundary generates a symmetric five-station folded bay. The middle
slice is exactly the displayed section. Neighboring station profiles use uniform
scale and vertical translation, keeping the connecting strips planar and avoiding
crossings across thin bands. The interfaces are mirror copies, and material-only
end caps close the solid around its openings.

This is a folded projection of the 2D cell grammar, not a separate 3D recursion.
The prototype tests the section's generative logic before extending the cell
operations into three dimensions. No additional pinnacles are attached.

**Array** welds touching bays after removing internal caps. Positive gaps leave
separate closed bays. **Cutaway** affects the display only. **STL** exports the
complete volume in Z-up coordinates and is enabled only after mesh validation.

## Verification and example exports

```powershell
node --test cell-grammar.test.mjs cell-bay.test.mjs
node export-cell-study.mjs
```

The 15 tests cover area polarity, binary lineage, shared-edge partitions,
symmetry, parameter extremes and rule orders, zero strength, descendant edits,
actual section geometry, folded panel intersections, closed arrays, and float32
STL round-trips. The exporter also validates every stage and exported mesh.

`output/cell-study/` contains the section, cell partitions, seven-frame sequence,
lineage JSON, single-bay STL, array STL, and validation report. Generated files
are excluded from Git and can be regenerated with the command above.

## Earlier studies

- `section-study.html`: previous section/pinnacle study, documented in `SECTION_STUDY.md`.
- `plan-study.html`: branching tree / peak / roof study, documented in `BRANCHING_STUDY.md`.
- `directed-study.html`: earlier plan-first and selective E/C study, documented in `PLAN_STUDY.md`.
- `legacy.html`: the original 3D implementation.

The earlier implementations and the original STL references remain available
for comparison. The current experiment's core is `cell-grammar.mjs`.
