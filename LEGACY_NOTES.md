# Cathedral 3D (Processing to Web Port)

This browser study translates the recursive triangle grammar in `Old Project FIles` into a focused generator for thickened, Target-4-like cathedral façades.

## Current geometric grammar

The procedural path deliberately creates a partial façade rather than a full cathedral volume:

1. Start from one triangular half-pyramid face.
2. Apply one primary edge cycle. Edge A contracts while edges B and C expand, segmenting the large face into four folded faces.
3. Recursively apply the displaced EC subdivision to every resulting face. Each pass replaces one face with four sharp triangular facets; no smoothing is used.
4. Mirror the completed half across the YZ plane, preserving exact bilateral symmetry.
5. Duplicate the façade skin by the selected thickness and bridge every perimeter edge to form a closed shell.

Target 4 uses one primary fold followed by five recursive folds. Its stage counts are `2, 8, 32, 128, 512, 2,048, 8,192` mirrored surface triangles. Shell thickness is added only after the recursive surface is complete.

Shared edges are computed once per recursion level and reused by adjacent faces. This keeps the sharp recursive hierarchy while avoiding the cracks produced by the original Processing sketch's face-local edge points. The Stats panel verifies YZ symmetry, boundary edges, non-manifold edges, and shell closure.

## Run

Start a static server in this folder:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Files

- `index.html` — application shell and view tabs.
- `main.js` — recursive geometry, shell construction, controls, rendering, and STL export.
- `styles.css` — workspace and control styling.
- `Old Project FIles/` — original Processing sources and reference STL files.
- `STL_PRESETS.md` — notes about the imported targets and procedural reconstruction.

## Workspace views

- `3D Form` — orbit the generated watertight shell.
- `2D Stages` — full-canvas plan and elevation plots of every recursive stage. Click a card to display that intermediate form; `Play Stage Sequence` animates them.
- `Façade Grammar` — choose Contract, Expand, or Neutral for the three primary half-face edges and set recursive fold depth.
- `Target Compare` — overlay the selected reference STL in blue.

## Simple controls

- `Sample Target` and `Build Target Study` load a procedural study using the selected target's fitted EC values.
- `Recursive Fold Depth` controls the repeated EC hierarchy after the primary fold.
- `Façade Thickness` controls only the final closed shell depth.
- `Primary Contraction`, `Inner Expansion`, and `Side Expansion` control the first face-segmentation cycle.
- `Recursive Relief` controls the displaced EC facets in subsequent cycles.
- `Height`, `Width`, and `Façade Setback` control the half-pyramid seed proportions.
- `Randomize Symmetric Form` varies this reduced grammar while retaining symmetry and watertight construction.

The detailed source parameters remain available under `Advanced Controls`.

## Export

Click `Export STL` or press `S`. The exported mesh is the same mirrored, thickened shell reported by the topology checks.

## Notes

- The imported `Target_4.stl` remains the startup reference; `Build Target Study` switches to its procedural reconstruction and comparison overlay.
- Target 4 itself contains disconnected/open surface regions. The generated version interprets its morphology as a single closed façade shell instead of copying those gaps.
- Triangle generation is capped at 200,000 to keep the browser responsive.
