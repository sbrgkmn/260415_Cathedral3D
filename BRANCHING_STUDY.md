# Branching roof study

Open `http://localhost:8080/plan-study.html`. The new study replaces the plan-first
page with a graph-driven form experiment. The earlier directed E/C implementation
is preserved at `directed-study.html`; its engine and controls are unchanged.

## Geometry

1. A root at `(0,0)` forks into two children. Children turn by half the fork angle relative to their parent heading. The
   full fork angle halves with each generation; branch length is
   `firstLength * childLengthRatio^(generation-1)`. An independently sized rear stem completes the
   central three-way junction. The whole graph is bilaterally symmetric.
2. Every tree node becomes a peak. Its height is
   `eaveHeight + (centralHeight - eaveHeight) * childRatio^generation`.
   This interprets the sketch as a high center and lower peripheral peaks.
3. Each edge gains a midpoint saddle below both its peaks:
   `eaveHeight + (min(endpointHeights) - eaveHeight) * valleyRatio`.
4. Offset branch corridors establish eaves. Angular miter intersections join
   their boundaries at junctions. Eight roof triangles per branch connect the
   two peaks, saddle, and side boundaries. Terminal gables close the roof ends.
5. The exposed roof perimeter receives vertical walls and a triangulated base.
   Shared vertex indices connect the roof, walls, and base into one solid.

Branch width is an explicit length in model units. It is limited by the
shortest branch, miter clearances and crossing checks. The UI reports the actual
width. Roof footprint simplicity and projected-area equality are checked before
closing the solid. The mesh is checked for edge and vertex manifoldness, winding,
degenerate/duplicate triangles, connectivity and positive signed volume.

The tree, lifted junctions, roof, and closed volume are construction views of one
model, not E/C transformation stages. Heights can change without changing the
tree topology. No historical Gothic component library is used. This is a solid
formal study with ground closure, not a hollow, occupiable building shell.

## Verification and exports

```powershell
node --test branching.test.mjs
node export-branching.mjs
```

Tests cover graph hierarchy, true local peaks, roof triangle symmetry, combined
parameter extremes, geometry controls, and float32 STL round trips. Generated
files go to `output/branching/` and are excluded from Git. STL coordinates are
Z-up; the geometry is unitless. Browser export always exports the closed volume,
regardless of the selected construction view.

Each branch uses a perpendicular collar centered on its saddle. The two roof
triangles sharing each peak-to-saddle ridge are geometric reflections across
that ridge's vertical plane, at both ends of the branch. Terminal peaks therefore
have the same two-face wedge as internal peaks. Separate transition triangles
connect those wedges to the junction eaves; the end gable closes the wedge.

## Symmetry of surface construction

Symmetry applies to face connectivity as well as the silhouette. Terminal
gables split on their centerlines. Every perimeter wall uses two triangles. Its diagonal is assigned from the
adjacent roof cell peak, so paired panels have reflected diagonals without
adding a center vertex or an X-shaped fan. The base projects the roof cell complex
to ground, sharing coincident XY vertices and omitting collapsed gable faces.
This preserves the branch topology on the underside without unrelated ear
clipping. Tests compare reflected face coordinates for the complete solid and
for each terminal half-branch about its own local vertical symmetry plane.
At asymmetric junctions, transition triangles follow the actual neighboring
branches; they are not claimed to be locally mirror-symmetric where the graph
itself is asymmetric.

## Angle and length controls

Fork angle is the full included angle between sibling branches, in degrees.
First branch length, rear stem length, branch width, central height and eave
height use unitless model lengths. Child length and height ratios remain
multipliers. Changing the number of generations adds descendants without
changing the earlier branch lengths or directions. Old spread/depth URL
bookmarks are migrated using their first segment's measured length and angle;
the descendant layout follows the new local-angle grammar.

## Uncapped numeric experiments

Every slider has a direct number field without the former minimum/maximum
range clamps. Entering beyond a slider's current range extends that slider.
Ratios are entered as percentages (120 means 1.2). Peak values per generation
are displayed beside the hierarchy controls. Editing parameters preserves the
camera framing, so height changes remain visible; Fit reframes explicitly.

Positive lengths and non-degenerate roof dimensions are required to close the
volume. Invalid combinations retain the attempted controls while displaying
the last valid form and disabling export. The interactive graph retains a
512-peak resource budget to prevent exponential generation from freezing the
browser. Branch width fitting still reports the actual non-crossing width.

## Compact branch preset

The browser uses the original separate-branch surface topology: locally mirrored
roof wedges, paired wall diagonals, and a base inheriting the roof connectivity.
The gaps between branches remain open. Branch width fits the available junction
space; the requested and actual widths are both shown.

The compact preset keeps a 90-degree fork, first length 25, child length ratio
52%, rear stem 13, requested width 27, central height 180, eave height 8, child
height ratio 48%, and valley ratio 72%. Peak heights are 180, 90.56 and 47.6288.

Sliders extend on release at either endpoint. Numeric fields remain uncapped;
height readouts and fixed camera framing remain available. Export examples use
the compact branch preset. Run `node --test branching.test.mjs` to verify it.

## Independent branch thickening

Width is fitted locally at each branch midpoint and terminal, rather than using
one minimum for the whole tree. Neighboring centerlines define the available
clearance; junction corner reach is shortened so the side surfaces taper into
the fork. The upper branches can therefore broaden while terminal forks retain
open gaps. No envelope or infill is added between branches. Each width is applied
symmetrically to both sides of its branch. The UI reports the resulting width
range. The compact preset's main branches reach width 20, compared with the old
uniform junction limit of approximately 5.17, without increasing triangle count.

## Repeated lateral growth

The Cascading mountain preset enables a deterministic parametric L-system-style production on every tree edge (including the rear stem): `F(L) -> F(s)[+B][-B] ... F(remainder)`. Long edges accumulate paired lateral spurs. Growth passes repeat the production on newly created spurs; station spacing scales by the recursive spacing ratio per pass. A spur peak has `eave + (attachmentHeight-eave)*descent`, so each lateral generation cascades downward. Main-edge station heights interpolate their endpoints.

Controls: growth passes (0 restores the original tree), branch spacing, side branch length ratio, side branch angle, and side peak height ratio. The length ratio is relative to station spacing; available clearance can shorten spurs to preserve branch separation. Existing individual-width roof construction and watertight validation remain in use. Interactive growth is limited to 512 peaks and five lateral passes; invalid combinations retain the last valid form.

Validation: 16 geometry tests, including additional generations, length-dependent accumulation, mirrored peak positions, descending side peaks, and a single watertight body. This is a regulated ridge scaffold, not yet a continuous terrain surface between separate branches.


### Inherited recursive rules

Main fork angles now use `angle * angleRatio^(generation-1)`. First-pass lateral length uses station spacing times the side-length ratio; later lengths use the actual parent length times `growthLength`. Side turns use `spurAngle * growthAngle^pass`; spacing uses `spacing * spacingRatio^pass`. Clearance can shorten the requested length. Side peak rise inherits the attachment rise times `descent`. Previous/Next growth step controls rebuild the cumulative grammar at the chosen depth while retaining the camera. Existing construction stages still inspect tree, lifted peaks, roof and closed volume separately.


### Fuller branches and progressive angles

Branch fullness scales shared-junction width clearance and junction reach independently of requested branch width. Separate-branch clearance remains below half the distance between ridges, preserving open gaps. Branch width's initial slider range now extends to 120 (numeric inputs still extend it). Fork and side-angle increments add degrees per generation to the inherited angle: `initial * ratio^step + increment * step`. Zero increments and 100% fullness preserve earlier bookmarks. Try 150% fullness with +10 degrees per step; crowded geometries can still reach local clearance limits.


## Continuous nave thickness

The browser now enables `nave=1`: branch sides are parallel offsets with shared mitered junctions rather than independently pinched midpoint collars. Width is applied directly. Clear branch spans are augmented by junction shoulders, and if distant branches collide the main spine station spacing expands while side projection lengths remain fixed. This changes overall plan dimensions; it is not a fixed-centerline offset or a convex enclosing outline. Disable "Reserve space for branch thickness" to compare the legacy geometry.

`branchTaper` is the side/spine width ratio, compounded by branch order (0.5 gives half-width first-order projections and quarter-width second-order projections). `branchReach` scales clear side lengths independently, leaving room for their junctions. Existing spine/projection multipliers and fullness still multiply these widths. The 21 tests include widths 8, 28, 60 and 179, unchanged requested width, symmetric peaks, watertight STL round trips, and independent taper/length controls. Invalid crossing directions produce an error rather than reducing architectural widths.


## Compact study and massing atlas

The primary UI reduces the parameter space to six coordinated design axes (density, spread, mass, vertical proportion, cascade and relief). This is a hand-authored control mapping, not PCA or a learned latent model. Detailed controls remain in Advanced. Morphology selects forked, axial, cruciform or six-arm seeds.

Thickness reservation preserves vertical proportions by scaling roof rise above the eaves by the actual plan-radius expansion. Absolute heights can be retained by disabling the proportion lock. Vertical subdivision remains enabled and uses the same area-based termination. Compact clear spans use `packing=0.6` in the browser; changing density sets 0.55.

Geometry updates are debounced by 100 ms and executed in a module worker, with stale responses discarded and a four-model cache. Rendering runs during interaction then stops while idle. The 4x4 atlas builds sequentially off-thread and uses canvas raster previews of the validated meshes instead of sixteen WebGL contexts. Cards preserve full refinement and load their exact parameters into the study. Atlas rows compare four morphologies; columns coordinate thickness, height and taper. Previews are fitted independently, not at a common scale. Crossing combinations can still be rejected and are shown explicitly.


## Tip-directed vertical E/C (replaces centroid bumps)

After plan layout and height assignment, each eligible internal sloping roof edge gets two shared vertices: E at 42% toward its higher tip, lifted by 0.8 times strength times edge rise; C at 64%, lowered by 0.6 times strength times rise. At the default 30% strength, E reaches 66% of the rise and C returns to 46%, making a genuine notch. The next cycle develops only the C-to-tip segment. Main tips and horizontal positions stay unchanged.

Both adjacent triangles must exceed the minimum projected-area threshold at every cycle. Shared edge chains are retriangulated together using an unchanged parent-plane interior hub, so unequal stopping depths cannot leave T-junctions. Outer eaves, vertical gables and base outline are retained. The closed base uses the matching projected roof complex. Strength is bounded to 55% to keep folds below their local original tip and above their lower endpoint. Previous/Next E/C controls inspect successive full cycles; step 0 is the unarticulated roof. This rule creates architectural shoulders/notches, not smooth ornament or stone tracery.


### Terminal noses

Browser defaults now use `tipNose=0.6`: each degree-one tree end projects outward by 60% of its local half-width. The projected point sits at 30% of the end peak rise and joins the peak and two side eaves as a mirrored pair of faces. These faces have nonzero footprint and share a visible nose ridge. E/C now evaluates their true surface area (and propagates that designation to their children), so steep end faces can refine even with a small plan footprint. Other roof faces retain the projected-area threshold. Setting tip projection to zero restores the flat end. Nose geometry participates in the existing non-overlap checks, wall closure, base projection and STL validation.


## Marginal differentiation

After the branch mass and noses are established, marginal growth replaces each eligible perimeter segment with a symmetric sequence: outward lobe at 25%, inward notch at 50%, outward lobe at 75%. Amplitude scales with segment length and adjoining cell altitude. Lobe heights rise with amplitude, linking plan and elevation. Subsequent margin cycles operate on the shorter new edges and stop below `marginMin`. Candidates are checked for perimeter crossings and overlapping projected cells; amplitude is halved if needed. Roof faces are rebuilt against the exact new edge chain, then vertical E/C develops the resulting faces. Walls and the flat base close that same outline. No convex enclosing outline is used and original branch peaks remain fixed.

The browser starts with one marginal cycle. The primary Surface E/C detail axis coordinates vertical cycles with up to two margin cycles; Advanced exposes independent margin cycles, amplitude and stopping length. The status reports generated lobes. A 25th geometry test covers changed footprint, reflection symmetry, unchanged branch nodes, a flat underside and watertight STL round-trip.


## Generation sequence tab

Marginal growth controls are visible outside Advanced: Margin cycles, Margin amplitude (percentage), and Minimum margin edge length (model units). The primary vertical-detail slider now changes vertical E/C only, leaving the marginal settings independent.

The Steps tab builds a sequence from the current valid parameters: seed and each lateral growth pass, lifted peak graph, open folded roof, closed mass, each margin pass, and each vertical E/C pass. Thumbnails use the current final model's common projected bounds for a shared scale. Every card is generated through the same geometry worker and can be loaded back into the study at its exact construction stage. Refresh sequence rebuilds it from the current study. This tab uses lightweight raster thumbnails and cancels pending display updates when switching tabs.


## Body balance and monochrome representation

The browser uses balanced body seeds (`balanceMode=1`). Bilateral fan, axial, cruciform and six-arm seeds are symmetric across both plan axes at `leftRight=frontBack=0.5`. Positive/negative half-axis lengths are weighted by `2*c` and `2*(1-c)` before lateral growth, so unequal lengths can accumulate unequal branch counts. Coefficients exclude the collapsed endpoints 0 and 1. Legacy `balanceMode=0` retains the original three-arm seed for existing engine use.

Atlas columns now vary body balance, branching density, spread, width, height, taper and projection reach. Columns are divergent regimes rather than a uniform size sweep. Atlas recipes cap marginal cycles at one and vertical cycles at two for responsive comparisons; selecting a card loads its exact recipe.

The default fixed isometric camera looks along (1,1,1). White surfaces occlude hidden lines; fine black triangle edges show facets and camera-facing silhouette edges use 2.4 px screen-space strokes. Orbit is optional. Steps/atlas use the same isometric projection in monochrome canvas previews with heavier silhouette strokes. Dense surface refinement naturally produces denser linework; Facets can be disabled in the main study for a cleaner silhouette. Main-control explanatory paragraphs are hidden to reduce reading load; labels and this documentation retain the definitions.


### Separate lineweights

Silhouette, Triangle edges, and Branch ridges each have independent pixel-width sliders and numeric inputs. Zero hides that line class. The main viewport uses screen-space wide-line geometry for consistent widths; ridges require the existing Ridge tree display toggle. Triangle and silhouette settings also redraw existing atlas/step raster previews without rebuilding geometry; ridge width controls the plan/lift graph previews. Settings persist locally in the browser and do not affect the STL.


### Grayscale and soft shadows

Shading controls preserve the existing lineweight settings. Grayscale strength adjusts neutral ambient/directional facet lighting (0 returns white surfaces); Soft shadows toggles filtered shadow maps and a transparent ground shadow receiver. Light/shadow bounds follow the model extents. Preview cards use lightweight directional grayscale fills and a blurred ground footprint rather than full shadow-map rendering. Changes redraw previews without rebuilding geometry and persist locally; exported STL geometry is unchanged.


### Face palette and contour hierarchy

Face shade contrast now controls a five-level orientation-based grayscale palette through per-face vertex colors. Basic materials keep the chosen tones stable rather than darkening the whole model through lighting. Ground shadows remain independent. Zero contrast restores white faces.

Outer silhouette and Inner silhouette now have separate pixel weights. Fixed-isometric contour candidates are classified by testing projected triangle coverage on either side of their midpoint: contours bordering the background are outer; contours with form on both sides are inner. Hidden segments still use the depth buffer in the main view. Classification is cached per mesh and shared with raster previews. This midpoint classification is an approximation on edges that change occlusion class along their length. Thin triangle-edge strokes remain separately adjustable.


### Proportional base panels

`baseRiseRatio` raises low perimeter eaves toward the lowest higher vertex of their adjacent roof cells before marginal and vertical refinement. The browser defaults to 30%, replacing the visually shallow uniform closure strip with taller locally scaled panels. Existing higher nose points are never lowered; main branch peaks and plan coordinates stay fixed. Advanced / Nave widths and vertical development exposes Base panel height ratio; zero restores the former low base. Roof, walls and bottom remain connected. Test coverage includes unchanged nodes, raised boundary heights, and watertight detailed STL exports.
