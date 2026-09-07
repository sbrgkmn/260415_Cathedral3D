# STL Preset and Reconstruction Notes

These notes describe the previous implementation, now accessible through
`legacy.html`. The new default two-face rule study is documented in `README.md`.

Named presets in `main.js` load the reference STL exports from `Old Project FIles/` through `STLLoader`. They remain exact visual baselines for the procedural generator.

Processing/STL coordinates are Z-up. The display rotates model groups by -90 degrees around X to use Three.js Y-up navigation.

## Included references

- `Cathedral_258.80115.stl` — 8 triangles
- `Target_1.stl` — 8,192 triangles
- `Target_2.stl` — 8,192 triangles
- `Target_3.stl` — 8,192 triangles
- `Target_4.stl` — 8,192 triangles
- `Target_5.stl` — 2,048 triangles
- `Target_6.stl` — 32,768 triangles

## Target 4 reading

Target 4 is treated as a thickened façade developing from one half-pyramid face, not as a complete cathedral body. Its key fitted grammar is:

- Primary edge A contraction: `Amp_A = -0.0588018`
- Primary edge B inner expansion: `Amp_B = 0.1831153`
- Primary edge C side expansion: `Amp_C = 0.2034197`
- Recursive split: `Top_1 = 0.5310418`
- Recursive relief: `Top_2 = -0.1943937`
- Recursive polarity rotation: `Top_3 = 0.9370138`
- One primary fold plus five recursive EC folds

The original Processing recursion creates edge points independently for each triangle. That reproduces the source's aggressive fractured morphology, but it also permits adjacent faces to disagree along a shared edge. The web reconstruction instead caches one point per topological edge at each level. It preserves the recursive face hierarchy while producing a continuous surface.

After recursion, the computed half is mirrored across YZ. The surface is then duplicated front/back and all boundary loops are bridged. Thickness is therefore a finishing operation and does not alter the EC recursion.

## Verification

The generated Stats panel reports:

- exact YZ symmetry;
- shared-edge construction;
- boundary-edge count;
- non-manifold-edge count when nonzero;
- final shell closure.

Target 4's procedural study should report 8,192 final surface triangles and zero boundary edges after thickening. The shell contains additional back and perimeter triangles, so its exported total is higher than the reference surface count.

## Other modes

The older plan/vertical experiment, selective subdivision, quadruple seed, and detailed source parameters remain in `main.js` and under `Advanced Controls` for comparison. They are not part of the default façade grammar.
