# Inspection of the supplied STL targets

The measurements below come from the binary STL coordinates, not from the previous
JavaScript presets. All six targets plus the 8-triangle Cathedral file were read
and drawn in XY plan, XZ elevation, and axonometric projection.

| Target | Triangles | Width X | Depth Y | Height range Z |
| --- | ---: | ---: | ---: | ---: |
| Target 1 | 8,192 | 92.056 | 46.028 | 133.683 |
| Target 2 | 8,192 | 185.598 | 63.889 | 173.733 |
| Target 3 | 8,192 | 50.549 | 36.771 | 172.110 |
| Target 4 | 8,192 | 70.248 | 35.124 | 123.774 |
| Target 5 | 2,048 | 50.000 | 25.000 | 76.000 |
| Target 6 | 32,768 | 70.248 | 35.124 | 123.956 |

Units are the files' model units. Height is max Z minus min Z; some targets have
small portions below Z=0. The app's comparison view states its uniform display
normalization separately. Comparison-sheet panels preserve aspect ratios but use
independent framing, so use this table when comparing absolute dimensions.

## What differs from the earlier two-face study

- The target plans have multiple lobes and recursively divided internal regions.
  The previous study created only two initial ground recesses, then froze that
  footprint. It could add spikes to its silhouette but could not develop a richer
  plan organization.
- Targets 4 and 6 have a tall central group, lower lateral groups, and many smaller
  ridges. Their coarse plan becomes broad and approximately rectangular before
  acquiring additional lobes. Target 6 shares the same large-scale structure and
  has one more level of surface subdivision.
- Target 2 is much wider, with multiple subordinate spires distributed through
  depth. Target 3 is exceptionally slender. Target 5 has a strong central peak
  above lower, more regular branches. A single generic width/height preset does
  not represent all of them.
- Many upper branch points sit close to the outer plan rather than halfway back
  toward the original apex. For example, in Target 4's reconstructed 8-face parent,
  the original base corner is `(25,0,0)` and a new upper point is approximately
  `(21.25,0,59.57)`. Its X is 85% of the base corner's X. The opposite mirrored
  point is present too. This helps explain the targets' steep tower-like sides.

## Reconstructed parent geometry

The Processing code emits each recursive group as a center triangle followed by
its three corner triangles. The STL export reverses the first two vertices. After
accounting for that reversal, shared child positions can be checked and the three
outer parent corners recovered. Every sibling group is checked before reducing a
level; this process reaches two seed faces in every supplied target.

- Targets 1–4: `2 → 8 → 32 → 128 → 512 → 2,048 → 8,192`.
- Target 5: the same hierarchy ending at 2,048.
- Target 6: the same hierarchy continuing to 32,768.

For Target 4, the recovered seed is based on `(±25,0,0)`, `(0,25,0)`, and
`(0,0,89)`. Its first ground-edge split introduces `(±25,25,0)`, explaining the
initial transition from a triangular plan to a broad rectangular plan.

This reconstruction exposes coarse parent meshes, not a complete process log.
The source hierarchy changes XY and Z coordinates together; the STL alone does
not prove that its authoring process used a separate plan-then-height schedule.
The revised app deliberately separates those phases to make the rules inspectable.

## Outputs

- [All reference views](analysis/stl-reference-comparison.png)
- [Target 4 reconstructed hierarchy](analysis/Target_4-hierarchy.png)
- [Target 2 reconstructed hierarchy](analysis/Target_2-hierarchy.png)
- [Raw measurements](analysis/stl-measurements.json)

The new generator completes contour branching and local cell division first, then
introduces upright vertical branches and valleys. It remains a regular radial
interpretation. Matching the targets' less regular internal axes, the balance of
individual tower groups, and recursive surface relief will require further
development; loading a target in the viewer is clearly labeled as reference mode.
