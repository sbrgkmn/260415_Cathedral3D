import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";

let nextPointId = 1;

class Point extends THREE.Vector3 {
  constructor(
    origin = new THREE.Vector3(0, 0, 0),
    position = new THREE.Vector3(0, 0, 0),
    pol = null,
    state = true,
    id = null
  ) {
    super(position.x, position.y, position.z);
    this.origin = origin.clone();
    this.state = state;
    this.id = id ?? nextPointId++;
    this.ruleRole = null;
    if (pol) {
      this.pol = pol.clone();
    } else {
      this.pol = position.clone().sub(origin);
      if (this.pol.lengthSq() > 1e-12) {
        this.pol.normalize();
      }
    }
  }

  clone() {
    const clone = new Point(this.origin, this, this.pol, this.state, this.id);
    clone.ruleRole = this.ruleRole;
    return clone;
  }

  copy(v) {
    super.copy(v);
    if (v instanceof Point) {
      this.origin = v.origin.clone();
      this.state = v.state;
      this.pol = v.pol.clone();
      this.id = v.id;
      this.ruleRole = v.ruleRole;
    } else {
      this.origin = new THREE.Vector3(0, 0, 0);
      this.state = true;
      this.pol = new THREE.Vector3(0, 0, 1);
      this.id = nextPointId++;
      this.ruleRole = null;
    }
    return this;
  }
}

class Triangle {
  constructor(A, B, C, state, dir_A = false, dir_B = false, dir_C = false) {
    this.A = A;
    this.B = B;
    this.C = C;
    this.state = state;
    this.dir_A = dir_A;
    this.dir_B = dir_B;
    this.dir_C = dir_C;
  }

  getCenter() {
    return new THREE.Vector3(
      (this.A.x + this.B.x + this.C.x) / 3,
      (this.A.y + this.B.y + this.C.y) / 3,
      (this.A.z + this.B.z + this.C.z) / 3
    );
  }
}

const params = {
  Pos_A: 0.5526972177552076,
  Amp_A: -0.058801773595119566,
  Rot_A: 0.2973185149992459,
  Pos_B: 0.5526972177552076,
  Amp_B: 0.18311526952538104,
  Rot_B: 0.2973185149992459,
  Pos_C: 0.5526972177552076,
  Amp_C: 0.20341969568999735,
  Rot_C: 0.2973185149992459,
  Recursion: 1,
  Normal_len: 0,
  mass_h: 122.72695282857514,
  mass_d: 35.16549502485894,
  mass_w: 33.55696647242988,
  Con_Pos_A: 0.5956344869829946,
  Con_Amp_A: -0.8237810866450004,
  Con_Rot_A: 0.5431205148036403,
  Con_Pos_B: 0.5956344869829946,
  Con_Amp_B: 0.9929682976564163,
  Con_Rot_B: 0.5431205148036403,
  Con_Pos_C: 0.5956344869829946,
  Con_Amp_C: -0.28860063703997296,
  Con_Rot_C: 0.5431205148036403,
  Recursion_2: 5,
  Top_1: 0.5,
  Top_2: -0.19439367863448065,
  Top_3: 0.9370138302356651,
  definitionSmooth: 0,
  definitionPerturb: 0,
  div_threshold: 100,
  selectiveMode: false,
  seedMode: "double",
  watertightMode: true,
  facadeMode: true,
  facadeThickness: 2.8,
  verticalBranching: false,
  definitionOnSurface: false,
  quadSymmetry: true,
  activePreset: "Target_4.stl",
  studyTarget: "Target_4.stl",
  targetOverlay: false,
  targetOverlayPreset: "Target_4.stl",
  showWireframe: true,
  showStateColors: false,
  showDirections: false,
  showPolarity: true,
  formSpikiness: 0.48,
  planarBranchSteps: 2,
  planarSpread: 0.9,
  verticalLift: 1.1,
  expandContract: 0.46,
  verticalRule1: "Expand",
  verticalRule2: "Contract",
  verticalRule3: "Peak",
  edgeRuleA: "Follow",
  edgeRuleB: "Follow",
  edgeRuleC: "Follow",
  stepRise: 0.65,
  branchVariation: 0.32,
  splitDrift: 0.1,
  stepPulse: 0.28,
  edgeSpreadA: 1,
  edgeSpreadB: 1.1,
  edgeSpreadC: 1.0,
  mirrorBranching: true,
  showAdvancedControls: false
};

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("mode") === "custom") {
  params.activePreset = "Custom";
  params.seedMode = "double";
}
const branchParam = Number.parseInt(urlParams.get("branch"), 10);
if (Number.isFinite(branchParam)) {
  params.Recursion = THREE.MathUtils.clamp(branchParam, 0, 10);
}
const defineParam = Number.parseInt(urlParams.get("define"), 10);
if (Number.isFinite(defineParam)) {
  params.Recursion_2 = THREE.MathUtils.clamp(defineParam, 0, 10);
}
const seedParam = urlParams.get("seed");
if (["single", "double", "quadruple"].includes(seedParam)) {
  params.seedMode = seedParam;
}
if (urlParams.get("verticalBranch") === "1" || urlParams.get("vertical") === "1") {
  params.verticalBranching = true;
}
if (urlParams.get("surfaceDefine") === "0" || urlParams.get("definitionDisplacement") === "1") {
  params.definitionOnSurface = false;
}
const definitionSmoothParam = Number.parseFloat(urlParams.get("definitionSmooth") ?? urlParams.get("defSmooth"));
if (Number.isFinite(definitionSmoothParam)) {
  params.definitionSmooth = THREE.MathUtils.clamp(definitionSmoothParam, 0, 1);
}
const definitionPerturbParam = Number.parseFloat(urlParams.get("definitionPerturb") ?? urlParams.get("defPerturb"));
if (Number.isFinite(definitionPerturbParam)) {
  params.definitionPerturb = THREE.MathUtils.clamp(definitionPerturbParam, -1, 1);
}
if (urlParams.get("quadSymmetry") === "0") {
  params.quadSymmetry = false;
}
const overlayParam = urlParams.get("overlay");
if (overlayParam) {
  params.targetOverlayPreset = overlayParam.endsWith(".stl") ? overlayParam : `${overlayParam}.stl`;
  params.targetOverlay = true;
}

const MAX_TRIANGLES = 200_000;
const STL_FOLDER_URL = "./Old%20Project%20FIles/";
const PROCESSING_TO_THREE_ROTATION_X = -Math.PI / 2;
const UI_VERTICAL_SOURCE_POLARITY = new THREE.Vector3(0, 0, 1);
const SOURCE_XY_PLANE_POLARITY = "sourceXYPlane";

const UNUSED_CONTRACT_PARAMS = {
  Con_Pos_A: 0.5,
  Con_Amp_A: 0.5,
  Con_Rot_A: 0.5,
  Con_Pos_B: 0.5,
  Con_Amp_B: 0.5,
  Con_Rot_B: 0.5,
  Con_Pos_C: 0.5,
  Con_Amp_C: 0.5,
  Con_Rot_C: 0.5
};

const STL_PRESETS = [
  {
    name: "Cathedral_258.80115.stl",
    source: {
      triangles: 8,
      bbox: { dx: 50.0, dy: 25.0, minZ: 0.0, maxZ: 30.178 },
      fit: "legacy 8-triangle seed"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 0,
      mass_h: 30.259780162304395,
      mass_d: 25.005680337220767,
      mass_w: 11.701270887109558,
      Pos_A: 0.9336514529669424,
      Amp_A: -0.25155318262534854,
      Rot_A: 0.8793398204599261,
      Pos_B: 0.9336514529669424,
      Amp_B: 0.3036840962850991,
      Rot_B: 0.8793398204599261,
      Pos_C: 0.9336514529669424,
      Amp_C: 0.5146466560723146,
      Rot_C: 0.8793398204599261,
      Top_1: 0.8060550005536549,
      Top_2: -0.4688165171866734,
      Top_3: 0.7541896920237626
    }
  },
  {
    name: "Target_1.stl",
    source: {
      triangles: 8192,
      bbox: { dx: 92.056, dy: 46.028, minZ: -1.156, maxZ: 132.527 },
      fit: "ordered vertex and morphology fit"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 5,
      mass_h: 132.52708435058594,
      mass_d: 46.02788162231445,
      mass_w: 46.02788162231445,
      Pos_A: 0.013170875169450466,
      Amp_A: 0.2855835044063065,
      Rot_A: 1,
      Pos_B: 0.35260192035167875,
      Amp_B: 0.059851824685542,
      Rot_B: 1,
      Pos_C: 0.35942694765768485,
      Amp_C: 0.4526206728605794,
      Rot_C: 0.6595235093634649,
      Top_1: 0.436293536665532,
      Top_2: -0.08338117609222145,
      Top_3: 0.4978695650220509
    }
  },
  {
    name: "Target_2.stl",
    source: {
      triangles: 8192,
      bbox: { dx: 185.598, dy: 63.889, minZ: -1.726, maxZ: 172.007 },
      fit: "ordered vertex fit with bbox-corrected base scale"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 5,
      mass_h: 172.00698852539062,
      mass_d: 78.0,
      mass_w: 47.2,
      Pos_A: 0.40782633836457094,
      Amp_A: 0.081791689166747,
      Rot_A: 1,
      Pos_B: 0.20818206721241792,
      Amp_B: 0.1934294195319494,
      Rot_B: 1,
      Pos_C: 0.7160920284983444,
      Amp_C: 0.8131374494038728,
      Rot_C: 0.3029612438604796,
      Top_1: 0.5964694412431595,
      Top_2: -0.19783942595161488,
      Top_3: 0.5659582248035535
    }
  },
  {
    name: "Target_3.stl",
    source: {
      triangles: 8192,
      bbox: { dx: 50.549, dy: 36.771, minZ: -0.103, maxZ: 172.007 },
      fit: "ordered vertex fit with bbox-corrected base scale"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 5,
      mass_h: 172.00698852539062,
      mass_d: 16.0,
      mass_w: 17.9,
      Pos_A: 0.4568970479630498,
      Amp_A: 0.10476539201730875,
      Rot_A: 1,
      Pos_B: 0.2301629491717367,
      Amp_B: 0.21811065579907588,
      Rot_B: 1,
      Pos_C: 0.7389735985142101,
      Amp_C: 1,
      Rot_C: 0.4709499195391263,
      Top_1: 0.59570835165915,
      Top_2: -0.18880282495527065,
      Top_3: 0.5660340498100114
    }
  },
  {
    name: "Target_4.stl",
    source: {
      triangles: 8192,
      bbox: { dx: 70.248, dy: 35.124, minZ: -0.918, maxZ: 122.856 },
      fit: "legacy Cathedral_767 morphology with corrected renamed extents"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 5,
      mass_h: 122.85610961914062,
      mass_d: 35.12384033203125,
      mass_w: 35.12384033203125,
      Pos_A: 0.5526972177552076,
      Amp_A: -0.058801773595119566,
      Rot_A: 0.2973185149992459,
      Pos_B: 0.5526972177552076,
      Amp_B: 0.18311526952538104,
      Rot_B: 0.2973185149992459,
      Pos_C: 0.5526972177552076,
      Amp_C: 0.20341969568999735,
      Rot_C: 0.2973185149992459,
      Top_1: 0.5310418470371552,
      Top_2: -0.19439367863448065,
      Top_3: 0.9370138302356651
    }
  },
  {
    name: "Target_5.stl",
    source: {
      triangles: 2048,
      bbox: { dx: 50.0, dy: 25.0, minZ: 0.0, maxZ: 76.0 },
      fit: "legacy Cathedral_778 morphology with corrected renamed extents"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 4,
      mass_h: 76,
      mass_d: 25,
      mass_w: 25,
      Pos_A: 0.6720400644862725,
      Amp_A: -0.30402816468469407,
      Rot_A: 0,
      Pos_B: 0.6720400644862725,
      Amp_B: 0.09732367465285532,
      Rot_B: 0,
      Pos_C: 0.6720400644862725,
      Amp_C: -0.3221617738201936,
      Rot_C: 0,
      Top_1: 0.4730322209127005,
      Top_2: 0.21248604064135035,
      Top_3: 0.12569449138140804
    }
  },
  {
    name: "Target_6.stl",
    source: {
      triangles: 32768,
      bbox: { dx: 70.248, dy: 35.124, minZ: -1.1, maxZ: 122.856 },
      fit: "legacy Cathedral_815 morphology with corrected renamed extents"
    },
    params: {
      ...UNUSED_CONTRACT_PARAMS,
      seedMode: "double",
      selectiveMode: false,
      Recursion: 1,
      Recursion_2: 6,
      mass_h: 122.85610961914062,
      mass_d: 35.12384033203125,
      mass_w: 35.12384033203125,
      Pos_A: 0.5526972177552076,
      Amp_A: -0.058801773595119566,
      Rot_A: 0.2973185149992459,
      Pos_B: 0.5526972177552076,
      Amp_B: 0.18311526952538104,
      Rot_B: 0.2973185149992459,
      Pos_C: 0.5526972177552076,
      Amp_C: 0.20341969568999735,
      Rot_C: 0.2973185149992459,
      Top_1: 0.5310418470371552,
      Top_2: -0.19439367863448065,
      Top_3: 0.9370138302356651
    }
  }
];

const DEPTH_PROFILES = [
  { label: "2 branch + 3 define", recursion: 2, recursion2: 3 },
  { label: "3 branch + 2 define", recursion: 3, recursion2: 2 },
  { label: "4 branch + 1 define", recursion: 4, recursion2: 1 },
  { label: "3 branch + 3 define", recursion: 3, recursion2: 3 },
  { label: "4 branch + 2 define", recursion: 4, recursion2: 2 },
  { label: "5 branch + 1 define", recursion: 5, recursion2: 1 },
  { label: "5 branch + 2 define", recursion: 5, recursion2: 2 }
];

function getSeedFaceCount() {
  if (params.seedMode === "quadruple") return 4;
  if (params.seedMode === "double") return 2;
  return 1;
}

function shouldUseQuadSymmetry() {
  return params.seedMode === "quadruple" && params.quadSymmetry;
}

function branchValue(role, family) {
  const normalizedRole = shouldUseQuadSymmetry() ? "A" : role;
  return params[`${family}_${normalizedRole}`];
}

function hash01(...values) {
  let h = 2166136261;
  for (const value of values) {
    h ^= value;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function quantizeCoord(value) {
  return Math.round(value * 1000);
}

function getMirrorAwarePointKey(point) {
  return [
    quantizeCoord(params.mirrorBranching ? Math.abs(point.x) : point.x),
    quantizeCoord(point.y),
    quantizeCoord(point.z)
  ];
}

function getEdgeNoise(A, B, depth, role) {
  const aKey = getMirrorAwarePointKey(A);
  const bKey = getMirrorAwarePointKey(B);
  const first = aKey.join(":") <= bKey.join(":") ? aKey : bKey;
  const second = first === aKey ? bKey : aKey;
  return hash01(...first, ...second, depth + 1, role.charCodeAt(0)) * 2 - 1;
}

function getRoleSpread(role) {
  if (role === "A") return params.edgeSpreadA;
  if (role === "B") return params.edgeSpreadB;
  return params.edgeSpreadC;
}

function getDynamicBranchParams(A, B, role, p, i, r, depth, polarity) {
  const t = params.Recursion <= 1 ? 0 : depth / Math.max(1, params.Recursion - 1);
  const variation = THREE.MathUtils.clamp(params.branchVariation, 0, 1);
  const splitDrift = THREE.MathUtils.clamp(params.splitDrift, 0, 1);
  const planarSteps = THREE.MathUtils.clamp(params.planarBranchSteps, 0, params.Recursion);
  const isPlanarPhase = depth < planarSteps;
  const verticalT =
    depth <= planarSteps ? 0 : (depth - planarSteps) / Math.max(1, params.Recursion - planarSteps - 1);
  const planarSpread = Math.max(0, params.planarSpread);
  const verticalLift = Math.max(0, params.verticalLift);
  const stepRise = THREE.MathUtils.clamp(params.stepRise, -0.9, 2.5);
  const stepPulse = THREE.MathUtils.clamp(params.stepPulse, 0, 1.5);
  const roleSpread = Math.max(0, getRoleSpread(role));
  const edgeNoise = getEdgeNoise(A, B, depth, role);
  const phaseNoise = getEdgeNoise(A, B, depth + 17, role);
  const pulseSign = depth % 2 === 0 ? 1 : -0.55;
  const verticalScale = Math.max(0.08, 1 + stepRise * verticalT);
  const pulseScale = Math.max(0.12, 1 + stepPulse * pulseSign);
  const edgeScale = Math.max(0.08, 1 + edgeNoise * variation * (isPlanarPhase ? 0.5 : 0.85));
  const contractionScale = polarity ? 1 : THREE.MathUtils.lerp(0.62, 1.08, variation);
  const phaseScale = isPlanarPhase ? planarSpread : verticalLift * verticalScale;
  const amp = i * roleSpread * phaseScale * pulseScale * edgeScale * contractionScale;
  const driftSign = role === "B" ? -1 : 1;
  const split = clamp01(p + edgeNoise * splitDrift * (isPlanarPhase ? 0.28 : 0.14) * driftSign);
  const rot = clamp01(r + phaseNoise * variation * 0.18);

  return { p: split, i: isPlanarPhase ? amp : Math.max(0, amp), r: rot, edgeNoise, isPlanarPhase };
}

function getPlanarKochPolarity(A, B, role, edgeNoise) {
  const edge = B.clone().sub(A).setZ(0);
  let pol;

  if (edge.lengthSq() > 1e-12) {
    pol = new THREE.Vector3(-edge.y, edge.x, 0);
  } else {
    pol = A.clone().add(B).multiplyScalar(0.5).setZ(0);
  }

  const mid = A.clone().add(B).multiplyScalar(0.5).setZ(0);
  if (mid.lengthSq() > 1e-12 && pol.dot(mid) < 0) {
    pol.multiplyScalar(-1);
  }

  if (pol.lengthSq() <= 1e-12) {
    pol = role === "B" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  }

  if (!params.mirrorBranching && edgeNoise < 0) {
    pol.multiplyScalar(-1);
  }

  return pol.normalize();
}

function getDynamicBranchPolarity(A, B, role, depth, fallbackPolarity, dynamic) {
  if (!params.verticalBranching) return fallbackPolarity;
  return dynamic.isPlanarPhase
    ? getPlanarKochPolarity(A, B, role, dynamic.edgeNoise)
    : UI_VERTICAL_SOURCE_POLARITY;
}

function getStagedPhase(depth) {
  if (depth >= params.Recursion) {
    return {
      kind: "Refine",
      label: `Final subdivision ${depth - params.Recursion + 1}`,
      projection: "both"
    };
  }

  const planarCount = THREE.MathUtils.clamp(
    Math.round(params.planarBranchSteps),
    0,
    Math.max(0, params.Recursion - 1)
  );
  if (depth < planarCount) {
    const operation = depth % 2 === 0 ? "Contract" : "Expand";
    return {
      kind: "Planar",
      operation,
      label: `Planar XZ ${operation.toLowerCase()} ${depth + 1}`,
      projection: "plan"
    };
  }

  const verticalIndex = depth - planarCount;
  const cycleIndex = (verticalIndex % 3) + 1;
  const selectedRule = params[`verticalRule${cycleIndex}`] ?? "Neutral";
  const kind = selectedRule === "Peak" ? "Peaks" : selectedRule;
  return {
    kind,
    label: `${selectedRule} · vertical Y cycle ${verticalIndex + 1}`,
    projection: "elevation"
  };
}

function getEdgeOperation(phaseKind, role) {
  const edgeRule = params[`edgeRule${role}`] ?? "Follow";
  return resolveEdgeOperation(phaseKind, edgeRule);
}

function getStagedEdgeNoise(A, B, depth, salt = 0) {
  const aKey = getMirrorAwarePointKey(A);
  const bKey = getMirrorAwarePointKey(B);
  const first = aKey.join(":") <= bKey.join(":") ? aKey : bKey;
  const second = first === aKey ? bKey : aKey;
  return hash01(...first, ...second, depth + 101, salt + 37);
}

function clampToHalfPyramidFootprint(point) {
  point.x = THREE.MathUtils.clamp(point.x, params.verticalBranching ? 0 : -params.mass_d, params.mass_d);
  point.y = THREE.MathUtils.clamp(point.y, 0, params.mass_w);
  point.z = THREE.MathUtils.clamp(point.z, -params.mass_h * 0.01, params.mass_h);
  return point;
}

function getOutwardPlanarNormal(A, B, midpoint) {
  const edge = B.clone().sub(A).setZ(0);
  const normal = new THREE.Vector3(-edge.y, edge.x, 0);
  const radial = midpoint.clone().setZ(0);

  if (normal.lengthSq() <= 1e-12) {
    normal.copy(radial.lengthSq() > 1e-12 ? radial : new THREE.Vector3(0, 1, 0));
  }
  if (radial.lengthSq() > 1e-12 && normal.dot(radial) < 0) {
    normal.multiplyScalar(-1);
  }
  if (Math.abs(A.x) < 1e-6 && Math.abs(B.x) < 1e-6) {
    normal.x = 0;
    if (normal.y < 0) normal.y *= -1;
  }
  return normal.normalize();
}

function getCathedralPeakField(point, focus) {
  const x = point.x / Math.max(1, params.mass_d);
  const y = point.y / Math.max(1, params.mass_w);
  const centers = [
    { x: 0, y: 0.1, weight: 1 },
    { x: -0.58, y: 0.3, weight: 0.82 },
    { x: 0.58, y: 0.3, weight: 0.82 },
    { x: -0.28, y: 0.7, weight: 0.68 },
    { x: 0.28, y: 0.7, weight: 0.68 },
    { x: 0, y: 0.94, weight: 0.54 }
  ];
  const sigma = THREE.MathUtils.lerp(0.34, 0.115, focus);
  let field = 0;

  for (const center of centers) {
    const dx = x - center.x;
    const dy = y - center.y;
    const influence = center.weight * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    field = Math.max(field, influence);
  }

  const ribs = 0.9 + 0.1 * Math.cos((Math.abs(x) * 4.5 + y * 3.25) * Math.PI);
  return THREE.MathUtils.clamp(field * ribs, 0, 1);
}

function createStagedMidpoint(A, B, depth, role = "A") {
  const phase = getStagedPhase(depth);
  const midpoint = A.clone().lerp(B, 0.5);
  const position = midpoint.clone();
  const edgeLength = Math.max(1e-6, A.distanceTo(B));
  const noise = getStagedEdgeNoise(A, B, depth, 0);
  const peakFocus = THREE.MathUtils.clamp(params.formSpikiness, 0, 1);
  const pulse = THREE.MathUtils.clamp(params.expandContract, 0, 1);
  const roleScale = THREE.MathUtils.clamp(getRoleSpread(role), 0.35, 1.8);
  const operation =
    phase.kind === "Planar" ? phase.operation : getEdgeOperation(phase.kind, role);

  if (phase.kind === "Planar") {
    const normal = getOutwardPlanarNormal(A, B, midpoint);
    const depthFade = 1 - depth * 0.16;
    const contractionDepth = THREE.MathUtils.lerp(0.12, 0.26, pulse);
    const expansionDepth = THREE.MathUtils.lerp(0.1, 0.15, 1 - pulse);
    const phaseDepth = operation === "Contract" ? contractionDepth : expansionDepth;
    const amplitude =
      edgeLength *
      params.planarSpread *
      phaseDepth *
      depthFade *
      THREE.MathUtils.lerp(0.8, roleScale, 0.35);
    const direction = operation === "Contract" ? -1 : 1;
    position.addScaledVector(normal, amplitude * (0.84 + noise * 0.16) * direction);
  } else if (
    phase.kind !== "Refine" &&
    operation !== "Neutral" &&
    !(Math.abs(A.z) < 1e-7 && Math.abs(B.z) < 1e-7)
  ) {
    const availableHeight = Math.max(0, params.mass_h - midpoint.z);
    const heightRatio = THREE.MathUtils.clamp(midpoint.z / Math.max(1, params.mass_h), 0, 1);
    const peakField = getCathedralPeakField(midpoint, peakFocus);

    if (operation === "Expand") {
      position.z +=
        availableHeight * params.verticalLift * (0.07 + peakField * 0.18) * roleScale +
        edgeLength * params.stepRise * 0.035 * roleScale;
    } else if (operation === "Contract") {
      position.z -=
        midpoint.z * pulse * (0.1 + (1 - peakField) * 0.7) * Math.min(1.25, roleScale);
    } else {
      const peakRise = THREE.MathUtils.lerp(0.34, 0.78, peakFocus);
      const baseLift = THREE.MathUtils.lerp(0.035, 0.08, 1 - heightRatio);
      position.z +=
        availableHeight * params.verticalLift * (baseLift + peakRise * peakField) * roleScale;
    }
  }

  clampToHalfPyramidFootprint(position);
  if (phase.kind !== "Planar") position.z = Math.max(0, position.z);
  const polarity = position.clone().sub(midpoint);
  if (polarity.lengthSq() <= 1e-12) {
    polarity.copy(A.pol).lerp(B.pol, 0.5);
  }
  if (polarity.lengthSq() <= 1e-12) polarity.set(0, 0, 1);
  polarity.normalize();
  const point = new Point(midpoint, position, polarity, true);
  point.ruleRole = role;
  return point;
}

function stagedEdges(T, edgeCache, depth) {
  const make = (A, B, role) => {
    const key = edgeKey(A, B);
    if (!edgeCache.has(key)) edgeCache.set(key, createStagedMidpoint(A, B, depth, role));
    return edgeCache.get(key);
  };
  return { AB: make(T.A, T.B, "A"), BC: make(T.B, T.C, "B"), AC: make(T.C, T.A, "C") };
}

function mirrorRecordsAcrossYZ(records) {
  const mirroredPoints = new Map();
  const mirrorPoint = (point) => {
    if (Math.abs(point.x) < 1e-7) return point;
    if (!mirroredPoints.has(point.id)) {
      const origin = point.origin.clone();
      origin.x *= -1;
      const position = point.clone();
      position.x *= -1;
      const polarity = point.pol.clone();
      polarity.x *= -1;
      const mirroredPoint = new Point(origin, position, polarity, point.state);
      mirroredPoint.ruleRole = point.ruleRole;
      mirroredPoints.set(point.id, mirroredPoint);
    }
    return mirroredPoints.get(point.id);
  };

  const mirrored = records.map((record) => {
    const T = record.triangle;
    return {
      ...record,
      triangle: new Triangle(
        mirrorPoint(T.A),
        mirrorPoint(T.C),
        mirrorPoint(T.B),
        T.state,
        T.dir_A,
        T.dir_C,
        T.dir_B
      )
    };
  });
  return [...records, ...mirrored];
}

function getBoundaryLoops(surfaceTriangles) {
  const edgeData = new Map();
  const points = new Map();
  const addEdge = (A, B) => {
    points.set(A.id, A);
    points.set(B.id, B);
    const key = edgeKey(A, B);
    const entry = edgeData.get(key) ?? { A, B, count: 0 };
    entry.count += 1;
    edgeData.set(key, entry);
  };

  for (const T of surfaceTriangles) {
    addEdge(T.A, T.B);
    addEdge(T.B, T.C);
    addEdge(T.C, T.A);
  }

  const adjacency = new Map();
  const boundaryKeys = new Set();
  for (const [key, edge] of edgeData.entries()) {
    if (edge.count !== 1) continue;
    boundaryKeys.add(key);
    if (!adjacency.has(edge.A.id)) adjacency.set(edge.A.id, []);
    if (!adjacency.has(edge.B.id)) adjacency.set(edge.B.id, []);
    adjacency.get(edge.A.id).push(edge.B.id);
    adjacency.get(edge.B.id).push(edge.A.id);
  }

  const loops = [];
  while (boundaryKeys.size > 0) {
    const firstKey = boundaryKeys.values().next().value;
    const firstEdge = edgeData.get(firstKey);
    const loop = [firstEdge.A];
    let previousId = firstEdge.A.id;
    let currentId = firstEdge.B.id;
    boundaryKeys.delete(firstKey);

    while (currentId !== loop[0].id && loop.length <= edgeData.size + 1) {
      loop.push(points.get(currentId));
      const candidates = adjacency.get(currentId) ?? [];
      const nextId = candidates.find((candidateId) => {
        if (candidateId === previousId && candidates.length > 1) return false;
        const key = currentId < candidateId ? `${currentId}:${candidateId}` : `${candidateId}:${currentId}`;
        return boundaryKeys.has(key);
      });
      if (nextId === undefined) break;
      const key = currentId < nextId ? `${currentId}:${nextId}` : `${nextId}:${currentId}`;
      boundaryKeys.delete(key);
      previousId = currentId;
      currentId = nextId;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function buildGroundClosure(surfaceTriangles) {
  const closure = [];
  const groundPointMap = new Map();
  const groundPoint = (point) => {
    if (!groundPointMap.has(point.id)) {
      groundPointMap.set(
        point.id,
        new Point(
          new THREE.Vector3(point.x, point.y, 0),
          new THREE.Vector3(point.x, point.y, 0),
          new THREE.Vector3(0, 0, -1),
          true
        )
      );
    }
    return groundPointMap.get(point.id);
  };

  for (const loop of getBoundaryLoops(surfaceTriangles)) {
    const groundLoop = loop.map(groundPoint);
    for (let index = 0; index < loop.length; index += 1) {
      const A = loop[index];
      const B = loop[(index + 1) % loop.length];
      const groundA = groundLoop[index];
      const groundB = groundLoop[(index + 1) % loop.length];
      const aOnGround = Math.abs(A.z) < 1e-7;
      const bOnGround = Math.abs(B.z) < 1e-7;
      if (aOnGround && bOnGround) continue;
      if (aOnGround) {
        closure.push(new Triangle(A, B, groundB, true));
      } else if (bOnGround) {
        closure.push(new Triangle(A, B, groundA, true));
      } else {
        closure.push(new Triangle(A, B, groundB, true));
        closure.push(new Triangle(A, groundB, groundA, true));
      }
    }

    const centerPosition = groundLoop
      .reduce((sum, point) => sum.add(point), new THREE.Vector3())
      .divideScalar(groundLoop.length);
    centerPosition.z = 0;
    const center = new Point(centerPosition, centerPosition, new THREE.Vector3(0, 0, -1), true);
    for (let index = 0; index < groundLoop.length; index += 1) {
      closure.push(
        new Triangle(center, groundLoop[(index + 1) % groundLoop.length], groundLoop[index], true)
      );
    }
  }
  return closure;
}

function makeGeneratedSolid(surfaceTriangles) {
  return [...surfaceTriangles, ...buildGroundClosure(surfaceTriangles)];
}

function makeThickenedFacade(surfaceTriangles) {
  const halfThickness = Math.max(0.05, params.facadeThickness * 0.5);
  const frontPoints = new Map();
  const backPoints = new Map();
  const frontPoint = (point) => {
    if (!frontPoints.has(point.id)) {
      const position = point.clone();
      position.y -= halfThickness;
      const origin = point.origin.clone();
      origin.y -= halfThickness;
      const copy = new Point(origin, position, point.pol, point.state);
      copy.ruleRole = point.ruleRole;
      frontPoints.set(point.id, copy);
    }
    return frontPoints.get(point.id);
  };
  const backPoint = (point) => {
    if (!backPoints.has(point.id)) {
      const position = point.clone();
      position.y += halfThickness;
      const origin = point.origin.clone();
      origin.y += halfThickness;
      const copy = new Point(origin, position, point.pol, point.state);
      copy.ruleRole = point.ruleRole;
      backPoints.set(point.id, copy);
    }
    return backPoints.get(point.id);
  };

  const shell = [];
  const edgeData = new Map();
  const addEdge = (A, B) => {
    const key = edgeKey(A, B);
    const entry = edgeData.get(key) ?? { A, B, count: 0 };
    entry.count += 1;
    edgeData.set(key, entry);
  };

  for (const T of surfaceTriangles) {
    shell.push(
      new Triangle(frontPoint(T.A), frontPoint(T.B), frontPoint(T.C), T.state),
      new Triangle(backPoint(T.C), backPoint(T.B), backPoint(T.A), T.state)
    );
    addEdge(T.A, T.B);
    addEdge(T.B, T.C);
    addEdge(T.C, T.A);
  }

  for (const { A, B, count } of edgeData.values()) {
    if (count !== 1) continue;
    const frontA = frontPoint(A);
    const frontB = frontPoint(B);
    const backA = backPoint(A);
    const backB = backPoint(B);
    shell.push(
      new Triangle(frontA, frontB, backB, true),
      new Triangle(frontA, backB, backA, true)
    );
  }

  return shell;
}

const root = document.getElementById("app");
const statsEl = document.getElementById("stats");
const analysisPanelEl = document.getElementById("analysis-panel");
const stepPanelEl = document.getElementById("step-panel");
const stepSummaryEl = document.getElementById("step-summary");
const stepGridEl = document.getElementById("step-grid");
const rulePanelEl = document.getElementById("rule-panel");
const ruleCanvasEl = document.getElementById("rule-canvas");
const ruleSequenceEl = document.getElementById("rule-sequence");
const ruleStatusEl = document.getElementById("rule-status");
const rulePlanarInputEl = document.getElementById("rule-planar-stages");
const rulePlanarOutputEl = document.getElementById("rule-planar-output");
const ruleCycleEls = [1, 2, 3].map((index) => document.getElementById(`rule-cycle-${index}`));
const ruleEdgeEls = ["a", "b", "c"].map((role) => document.getElementById(`rule-edge-${role}`));
const panelTabButtons = Array.from(document.querySelectorAll("[data-panel-tab]"));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  4000
);
camera.position.set(150, 130, 180);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 50;
controls.maxDistance = 500;
controls.target.set(0, 55, -20);
controls.update();

function setPanelTab(tabName) {
  activeStepPanelTab = tabName;
  document.body.dataset.view = tabName;
  for (const button of panelTabButtons) {
    const isActive = button.dataset.panelTab === tabName;
    button.classList.toggle("active", isActive);
  }
  document.querySelectorAll(".panel-section").forEach((section) => {
    const targetSection = tabName === "steps" ? "step-panel" : tabName === "rules" ? "rule-panel" : "stats";
    section.classList.toggle("active", section.id === targetSection);
  });
  if (tabName === "rules") syncRuleLabFromParams();
  if (params.activePreset === "Custom") {
    params.targetOverlay = tabName === "compare";
    refreshGuiDisplay();
    updateTargetOverlay();
    updateStats();
  }
}

panelTabButtons.forEach((button) => {
  button.addEventListener("click", () => setPanelTab(button.dataset.panelTab));
});

const VERTICAL_RULE_OPTIONS = ["Expand", "Contract", "Peak", "Neutral"];
const EDGE_RULE_OPTIONS = ["Follow", "Invert", "Expand", "Contract", "Neutral"];

function populateRuleSelect(select, values) {
  select.textContent = "";
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function resolveEdgeOperation(phaseKind, edgeRule) {
  if (edgeRule === "Expand" || edgeRule === "Contract" || edgeRule === "Neutral") {
    return edgeRule;
  }
  if (edgeRule === "Invert") {
    if (phaseKind === "Expand") return "Contract";
    if (phaseKind === "Contract" || phaseKind === "Peaks" || phaseKind === "Peak") return "Expand";
    return "Neutral";
  }
  return phaseKind === "Peak" ? "Peaks" : phaseKind;
}

function getRuleColor(operation) {
  if (operation === "Expand") return "#1f9d69";
  if (operation === "Contract") return "#df5a4f";
  if (operation === "Peak" || operation === "Peaks") return "#7559d9";
  return "#8b929d";
}

function drawRuleLabDiagram() {
  if (!ruleCanvasEl) return;
  const ctx = ruleCanvasEl.getContext("2d");
  const width = ruleCanvasEl.width;
  const height = ruleCanvasEl.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f7f8fa";
  ctx.fillRect(0, 0, width, height);

  if (params.facadeMode) {
    const panels = [
      { x: 34, title: "Half-pyramid face" },
      { x: 286, title: "Primary A/B/C fold" },
      { x: 538, title: "Recursive façade" }
    ];
    ctx.fillStyle = "#25282d";
    ctx.font = '700 16px "Segoe UI", sans-serif';
    panels.forEach((panel) => ctx.fillText(panel.title, panel.x, 34));

    const triangles = panels.map((panel) => ({
      top: { x: panel.x + 94, y: 86 },
      left: { x: panel.x + 18, y: 302 },
      right: { x: panel.x + 184, y: 302 }
    }));
    const drawTriangle = ({ top, left, right }, stroke = "#5d6570") => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.stroke();
    };
    drawTriangle(triangles[0]);

    const primary = triangles[1];
    const centroid = {
      x: (primary.top.x + primary.left.x + primary.right.x) / 3,
      y: (primary.top.y + primary.left.y + primary.right.y) / 3
    };
    const baseMids = [
      { x: (primary.top.x + primary.left.x) / 2, y: (primary.top.y + primary.left.y) / 2 },
      { x: (primary.left.x + primary.right.x) / 2, y: (primary.left.y + primary.right.y) / 2 },
      { x: (primary.right.x + primary.top.x) / 2, y: (primary.right.y + primary.top.y) / 2 }
    ];
    const amps = [params.Amp_A, params.Amp_B, params.Amp_C];
    const displaced = baseMids.map((mid, index) => {
      const dx = mid.x - centroid.x;
      const dy = mid.y - centroid.y;
      const length = Math.hypot(dx, dy) || 1;
      const amount = THREE.MathUtils.clamp(amps[index] * 95, -26, 32);
      const point = { x: mid.x + (dx / length) * amount, y: mid.y + (dy / length) * amount };
      ctx.fillStyle = amps[index] < 0 ? "#df5a4f" : "#1f9d69";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#35383e";
      ctx.font = '650 11px "Segoe UI", sans-serif';
      ctx.fillText(`${String.fromCharCode(65 + index)} ${amps[index].toFixed(3)}`, point.x + 8, point.y - 8);
      return point;
    });
    const primaryFaces = [
      [primary.top, displaced[0], displaced[2]],
      [primary.left, displaced[1], displaced[0]],
      [primary.right, displaced[2], displaced[1]],
      [displaced[0], displaced[1], displaced[2]]
    ];
    ctx.strokeStyle = "#555d68";
    for (const face of primaryFaces) {
      ctx.beginPath();
      ctx.moveTo(face[0].x, face[0].y);
      ctx.lineTo(face[1].x, face[1].y);
      ctx.lineTo(face[2].x, face[2].y);
      ctx.closePath();
      ctx.stroke();
    }

    const recursive = triangles[2];
    drawTriangle(recursive);
    for (let level = 1; level <= Math.min(4, params.Recursion_2); level += 1) {
      const t = level / 5;
      const y = THREE.MathUtils.lerp(recursive.top.y, recursive.left.y, t);
      const halfSpan = (recursive.right.x - recursive.left.x) * t * 0.5;
      ctx.strokeStyle = level % 2 ? "#7559d9" : "#8a929e";
      ctx.beginPath();
      ctx.moveTo(recursive.top.x - halfSpan, y);
      ctx.lineTo(recursive.top.x, y - 18);
      ctx.lineTo(recursive.top.x + halfSpan, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#35383e";
    ctx.font = '650 12px "Segoe UI", sans-serif';
    ctx.fillText(`${params.Recursion_2} folds · relief ${params.Top_2.toFixed(3)}`, panels[2].x + 18, 334);
    ctx.fillText(`mirror YZ · thickness ${params.facadeThickness.toFixed(2)}`, panels[2].x + 18, 356);
    return;
  }

  ctx.fillStyle = "#25282d";
  ctx.font = '700 17px "Segoe UI", sans-serif';
  ctx.fillText(`PLAN XZ · ${params.planarBranchSteps} contraction / expansion steps`, 28, 34);
  const planLabels = [
    "Half-pyramid",
    ...Array.from({ length: params.planarBranchSteps }, (_, index) =>
      index % 2 === 0 ? `Contract ${index + 1}` : `Expand ${index + 1}`
    )
  ];
  const boxWidth = Math.min(150, (width - 56 - (planLabels.length - 1) * 18) / planLabels.length);
  planLabels.forEach((label, index) => {
    const x = 28 + index * (boxWidth + 18);
    ctx.fillStyle = index === 0 ? "#202226" : "#e3e8f5";
    ctx.beginPath();
    ctx.roundRect(x, 50, boxWidth, 42, 9);
    ctx.fill();
    ctx.fillStyle = index === 0 ? "#ffffff" : "#2f4b88";
    ctx.font = '650 12px "Segoe UI", sans-serif';
    ctx.fillText(label, x + 12, 76);
    if (index < planLabels.length - 1) {
      ctx.strokeStyle = "#8a929e";
      ctx.beginPath();
      ctx.moveTo(x + boxWidth + 4, 71);
      ctx.lineTo(x + boxWidth + 14, 71);
      ctx.stroke();
    }
  });

  const edgeRules = [params.edgeRuleA, params.edgeRuleB, params.edgeRuleC];
  const roleLabels = ["A · AB", "B · BC", "C · CA"];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const baseKind = params[`verticalRule${cycle + 1}`];
    const panelX = 28 + cycle * 244;
    const top = { x: panelX + 108, y: 146 };
    const left = { x: panelX + 22, y: 334 };
    const right = { x: panelX + 194, y: 334 };
    const centroid = { x: (top.x + left.x + right.x) / 3, y: (top.y + left.y + right.y) / 3 };
    const midpoints = [
      { x: (top.x + left.x) / 2, y: (top.y + left.y) / 2 },
      { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 },
      { x: (right.x + top.x) / 2, y: (right.y + top.y) / 2 }
    ];

    ctx.fillStyle = "#25282d";
    ctx.font = '750 14px "Segoe UI", sans-serif';
    ctx.fillText(`Y cycle ${cycle + 1} · ${baseKind}`, panelX + 14, 125);
    ctx.strokeStyle = "#a5abb4";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.stroke();

    const displaced = midpoints.map((midpoint, roleIndex) => {
      const operation = resolveEdgeOperation(baseKind, edgeRules[roleIndex]);
      const dx = midpoint.x - centroid.x;
      const dy = midpoint.y - centroid.y;
      const length = Math.hypot(dx, dy) || 1;
      let amount = operation === "Expand" ? 20 : operation === "Contract" ? -15 : 0;
      let point = { x: midpoint.x + (dx / length) * amount, y: midpoint.y + (dy / length) * amount };
      if (operation === "Peak" || operation === "Peaks") point = { x: midpoint.x, y: midpoint.y - 28 };
      ctx.fillStyle = getRuleColor(operation);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#35383e";
      ctx.font = '650 10px "Segoe UI", sans-serif';
      ctx.fillText(roleLabels[roleIndex], point.x + 10, point.y - 8);
      return point;
    });

    ctx.strokeStyle = "#555d68";
    ctx.lineWidth = 1.15;
    const faces = [
      [top, displaced[0], displaced[2]],
      [left, displaced[1], displaced[0]],
      [right, displaced[2], displaced[1]],
      [displaced[0], displaced[1], displaced[2]]
    ];
    for (const face of faces) {
      ctx.beginPath();
      ctx.moveTo(face[0].x, face[0].y);
      ctx.lineTo(face[1].x, face[1].y);
      ctx.lineTo(face[2].x, face[2].y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function renderRuleSequence() {
  if (!ruleSequenceEl) return;
  if (params.facadeMode) {
    const steps = [
      ["Seed", "Half-pyramid façade"],
      ["Primary", `A ${params.Amp_A.toFixed(3)} · B ${params.Amp_B.toFixed(3)} · C ${params.Amp_C.toFixed(3)}`],
      ["Recursive", `${params.Recursion_2} EC folds · relief ${params.Top_2.toFixed(3)}`],
      ["Symmetry", "Mirror across YZ"],
      ["Shell", `Thickness ${params.facadeThickness.toFixed(2)} · bridge perimeter`]
    ];
    ruleSequenceEl.innerHTML = steps
      .map(([title, label]) => `<div class="rule-sequence-step"><strong>${title}</strong><span>${label}</span></div>`)
      .join("");
    ruleStatusEl.textContent =
      "The recursion creates a folded façade surface only. Thickness is added afterward by duplicating the skin and bridging every perimeter edge into a watertight shell.";
    return;
  }
  const steps = [
    ["Seed", "Half-pyramid"],
    ...Array.from({ length: params.planarBranchSteps }, (_, index) => [
      `XZ ${index + 1}`,
      index % 2 === 0 ? "Contract · shared 1→4" : "Expand · shared 1→4"
    ]),
    ["Y 1", params.verticalRule1],
    ["Y 2", params.verticalRule2],
    ["Y 3", params.verticalRule3],
    ["Finish", `${params.Recursion_2} final facet passes + ground seal`]
  ];
  ruleSequenceEl.innerHTML = steps
    .map(([title, label]) => `<div class="rule-sequence-step"><strong>${title}</strong><span>${label}</span></div>`)
    .join("");
  ruleStatusEl.textContent = `Each vertical E/C/Peak cycle creates four shared child faces per triangle. Final EC subdivisions retain sharp facets. Edge response A/B/C: ${params.edgeRuleA} · ${params.edgeRuleB} · ${params.edgeRuleC}. Exact YZ mirroring and the ground seal preserve a watertight solid.`;
}

function readRuleLabIntoParams() {
  if (params.facadeMode) {
    params.Recursion_2 = Number.parseInt(rulePlanarInputEl.value, 10);
    const fallback = [0.06, 0.18, 0.2];
    ruleCycleEls.forEach((select, index) => {
      const key = `Amp_${String.fromCharCode(65 + index)}`;
      const magnitude = Math.max(0.01, Math.abs(params[key]) || fallback[index]);
      params[key] =
        select.value === "Contract"
          ? -magnitude
          : select.value === "Expand"
            ? magnitude
            : 0;
    });
    rulePlanarOutputEl.value = String(params.Recursion_2);
    drawRuleLabDiagram();
    renderRuleSequence();
    return;
  }
  params.planarBranchSteps = Number.parseInt(rulePlanarInputEl.value, 10);
  params.verticalRule1 = ruleCycleEls[0].value;
  params.verticalRule2 = ruleCycleEls[1].value;
  params.verticalRule3 = ruleCycleEls[2].value;
  params.edgeRuleA = ruleEdgeEls[0].value;
  params.edgeRuleB = ruleEdgeEls[1].value;
  params.edgeRuleC = ruleEdgeEls[2].value;
  params.Recursion = params.planarBranchSteps + 3;
  rulePlanarOutputEl.value = String(params.planarBranchSteps);
  drawRuleLabDiagram();
  renderRuleSequence();
}

function syncRuleLabFromParams() {
  if (!rulePlanarInputEl) return;
  if (params.facadeMode) {
    rulePlanarInputEl.value = String(params.Recursion_2);
    rulePlanarOutputEl.value = String(params.Recursion_2);
    ruleCycleEls.forEach((select, index) => {
      const amplitude = params[`Amp_${String.fromCharCode(65 + index)}`];
      select.value = amplitude < 0 ? "Contract" : amplitude > 0 ? "Expand" : "Neutral";
    });
    drawRuleLabDiagram();
    renderRuleSequence();
    return;
  }
  rulePlanarInputEl.value = String(params.planarBranchSteps);
  rulePlanarOutputEl.value = String(params.planarBranchSteps);
  ruleCycleEls.forEach((select, index) => {
    select.value = params[`verticalRule${index + 1}`];
  });
  ruleEdgeEls.forEach((select, index) => {
    select.value = params[`edgeRule${String.fromCharCode(65 + index)}`];
  });
  drawRuleLabDiagram();
  renderRuleSequence();
}

function initializeRuleLab() {
  ruleCycleEls.forEach((select) => populateRuleSelect(select, ["Contract", "Expand", "Neutral"]));
  ruleEdgeEls.forEach((select) => populateRuleSelect(select, EDGE_RULE_OPTIONS));
  [rulePlanarInputEl, ...ruleCycleEls, ...ruleEdgeEls].forEach((element) => {
    element.addEventListener("input", readRuleLabIntoParams);
    element.addEventListener("change", readRuleLabIntoParams);
  });
  document.getElementById("rule-reset").addEventListener("click", () => {
    params.Recursion_2 = 5;
    params.Amp_A = -0.058801773595119566;
    params.Amp_B = 0.18311526952538104;
    params.Amp_C = 0.20341969568999735;
    params.Top_1 = 0.5310418470371552;
    params.Top_2 = -0.19439367863448065;
    params.Top_3 = 0.9370138302356651;
    params.edgeRuleA = "Follow";
    params.edgeRuleB = "Follow";
    params.edgeRuleC = "Follow";
    syncRuleLabFromParams();
  });
  document.getElementById("rule-apply").addEventListener("click", () => {
    readRuleLabIntoParams();
    params.activePreset = "Custom";
    params.seedMode = "double";
    params.watertightMode = true;
    params.facadeMode = true;
    params.verticalBranching = false;
    refreshGuiDisplay();
    rebuildNow();
    setPanelTab("model");
  });
  syncRuleLabFromParams();
}

analysisPanelEl.addEventListener("pointerenter", () => {
  controls.enabled = false;
});
analysisPanelEl.addEventListener("pointerleave", () => {
  controls.enabled = true;
});

const ambient = new THREE.AmbientLight(0xb8b8b8, 0.85);
scene.add(ambient);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x777777, 0.75);
scene.add(hemiLight);

const directional = new THREE.DirectionalLight(0xffffff, 1.35);
directional.position.set(100, 150, -100);
scene.add(directional);

const fillDirectional = new THREE.DirectionalLight(0xd8e6ff, 0.55);
fillDirectional.position.set(-120, 80, 140);
scene.add(fillDirectional);

const worldGroup = new THREE.Group();
worldGroup.rotation.x = PROCESSING_TO_THREE_ROTATION_X;
scene.add(worldGroup);

const baseBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(100, 100, 100)),
  new THREE.LineBasicMaterial({ color: 0x111111 })
);
baseBox.position.set(0, 0, 50);
worldGroup.add(baseBox);

const modelGroup = new THREE.Group();
worldGroup.add(modelGroup);

const targetOverlayGroup = new THREE.Group();
worldGroup.add(targetOverlayGroup);

const axisScene = new THREE.Scene();
const axisCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
axisCamera.position.set(0, 0, 4);

const axisHelper = new THREE.AxesHelper(1.25);
axisScene.add(axisHelper);

function makeAxisLabel(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = "700 56px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, 48, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.32, 0.32, 0.32);
  return sprite;
}

const xLabel = makeAxisLabel("X", "#ff3333");
xLabel.position.set(1.55, 0, 0);
axisScene.add(xLabel);

const yLabel = makeAxisLabel("Y", "#1a9f35");
yLabel.position.set(0, 1.55, 0);
axisScene.add(yLabel);

const zLabel = makeAxisLabel("Z", "#3366ff");
zLabel.position.set(0, 0, 1.55);
axisScene.add(zLabel);

let triangles = [];
let currentMesh = null;
let triangleLimitHit = false;
let guiRef = null;
let branchRotationControllers = [];
let definitionDisplacementControllers = [];
let importedStats = null;
let importedStatus = "";
let importRequestId = 0;
let generatedEdgeStats = null;
let generatedSymmetryStats = null;
let targetOverlayStatus = "";
let targetOverlayRequestId = 0;
let recursionAnimationTimer = null;
let recursionAnimationStatus = "";
let definitionSurfaceControllers = [];
let advancedGuiFolders = [];
let activeStepPanelTab = "model";
let latestStepFrames = [];
let highlightedStepIndex = null;

const stlLoader = new STLLoader();

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function EC(A, B, p, i, r, state, forcedPol = null) {
  const origin = A.clone().lerp(B, clamp01(p));
  const intensity = forcedPol === UI_VERTICAL_SOURCE_POLARITY ? Math.max(0, i) : i;
  const pol =
    forcedPol === SOURCE_XY_PLANE_POLARITY
      ? A.pol.clone().lerp(B.pol, clamp01(r)).setZ(0)
      : forcedPol
        ? forcedPol.clone()
        : A.pol.clone().lerp(B.pol, clamp01(r));
  if (pol.lengthSq() > 1e-12) {
    pol.normalize();
  }
  const pos = origin.clone().addScaledVector(pol, A.distanceTo(B) * intensity);
  return new Point(origin, pos, pol, state);
}

function getBranchEdgePolarityOverride(A, B) {
  if (!params.verticalBranching) return null;
  const sourceXYPlaneEpsilon = 1e-6;
  return Math.abs(A.z) < sourceXYPlaneEpsilon && Math.abs(B.z) < sourceXYPlaneEpsilon
    ? SOURCE_XY_PLANE_POLARITY
    : UI_VERTICAL_SOURCE_POLARITY;
}

function selectiveSubdivide(T, polarity, dir) {
  const abPolarity = getBranchEdgePolarityOverride(T.A, T.B);
  const bcPolarity = getBranchEdgePolarityOverride(T.B, T.C);
  const acPolarity = getBranchEdgePolarityOverride(T.C, T.A);
  let AB;
  let BC;
  let CA;
  let divA = true;
  let divB = true;
  let divC = true;

  if (T.A.distanceTo(T.B) > params.div_threshold) {
    AB = polarity
      ? EC(
          T.A,
          T.B,
          dir > 0 ? params.Pos_A : 1 - params.Pos_A,
          params.Amp_A,
          dir > 0 ? params.Rot_A : 1 - params.Rot_A,
          dir > 0,
          abPolarity
        )
      : EC(
          T.A,
          T.B,
          dir > 0 ? params.Con_Pos_A : 1 - params.Con_Pos_A,
          params.Con_Amp_A,
          dir > 0 ? params.Con_Rot_A : 1 - params.Con_Rot_A,
          dir > 0,
          abPolarity
        );
  } else {
    AB = T.A;
    divA = false;
  }

  if (T.B.distanceTo(T.C) > params.div_threshold) {
    BC = polarity
      ? EC(
          T.B,
          T.C,
          dir > 0 ? 1 - params.Pos_B : params.Pos_B,
          params.Amp_B,
          dir > 0 ? 1 - params.Rot_B : params.Rot_B,
          dir > 0,
          bcPolarity
        )
      : EC(
          T.B,
          T.C,
          dir > 0 ? 1 - params.Con_Pos_B : params.Con_Pos_B,
          params.Con_Amp_B,
          dir > 0 ? 1 - params.Con_Rot_B : params.Con_Rot_B,
          dir > 0,
          bcPolarity
        );
  } else {
    BC = T.B;
    divB = false;
  }

  if (T.C.distanceTo(T.A) > params.div_threshold) {
    CA = polarity
      ? EC(
          T.C,
          T.A,
          dir > 0 ? params.Pos_C : 1 - params.Pos_C,
          params.Amp_C,
          dir > 0 ? params.Rot_C : 1 - params.Rot_C,
          dir > 0,
          acPolarity
        )
      : EC(
          T.C,
          T.A,
          dir > 0 ? params.Con_Pos_C : 1 - params.Con_Pos_C,
          params.Con_Amp_C,
          dir > 0 ? params.Con_Rot_C : 1 - params.Con_Rot_C,
          dir > 0,
          acPolarity
        );
  } else {
    CA = T.C;
    divC = false;
  }

  const out = [new Triangle(BC, CA, AB, true)];
  if (divA) out.push(new Triangle(T.A, AB, CA, true));
  if (divB) out.push(new Triangle(AB, T.B, BC, true));
  if (divC) out.push(new Triangle(CA, BC, T.C, true));
  return out;
}

function pushTriangle(T) {
  if (triangles.length >= MAX_TRIANGLES) {
    triangleLimitHit = true;
    return;
  }
  triangles.push(T);
}

function edgeKey(A, B) {
  return A.id < B.id ? `${A.id}:${B.id}` : `${B.id}:${A.id}`;
}

function cachedEC(edgeCache, A, B, p, i, r, state, forcedPol = null) {
  const key = edgeKey(A, B);
  const existing = edgeCache.get(key);
  if (existing) return existing;

  const point = EC(A, B, p, i, r, state, forcedPol);
  edgeCache.set(key, point);
  return point;
}

function dynamicCachedEC(edgeCache, A, B, role, p, i, r, state, forcedPol, depth, polarity) {
  const dynamic = getDynamicBranchParams(A, B, role, p, i, r, depth, polarity);
  const dynamicPolarity = getDynamicBranchPolarity(A, B, role, depth, forcedPol, dynamic);
  return cachedEC(edgeCache, A, B, dynamic.p, dynamic.i, dynamic.r, state, dynamicPolarity);
}

function standardExpansionEdges(T, polarity, edgeCache, depth = 0) {
  const abPolarity = getBranchEdgePolarityOverride(T.A, T.B);
  const bcPolarity = getBranchEdgePolarityOverride(T.B, T.C);
  const acPolarity = getBranchEdgePolarityOverride(T.C, T.A);
  const posA = branchValue("A", "Pos");
  const ampA = branchValue("A", "Amp");
  const rotA = branchValue("A", "Rot");
  const posB = branchValue("B", "Pos");
  const ampB = branchValue("B", "Amp");
  const rotB = branchValue("B", "Rot");
  const posC = branchValue("C", "Pos");
  const ampC = branchValue("C", "Amp");
  const rotC = branchValue("C", "Rot");
  const conPosA = branchValue("A", "Con_Pos");
  const conAmpA = branchValue("A", "Con_Amp");
  const conRotA = branchValue("A", "Con_Rot");
  const conPosB = branchValue("B", "Con_Pos");
  const conAmpB = branchValue("B", "Con_Amp");
  const conRotB = branchValue("B", "Con_Rot");
  const conPosC = branchValue("C", "Con_Pos");
  const conAmpC = branchValue("C", "Con_Amp");
  const conRotC = branchValue("C", "Con_Rot");

  const AB = polarity
    ? dynamicCachedEC(
        edgeCache,
        T.A,
        T.B,
        "A",
        T.dir_A ? posA : 1 - posA,
        ampA,
        T.dir_A ? rotA : 1 - rotA,
        T.dir_A,
        abPolarity,
        depth,
        polarity
      )
    : dynamicCachedEC(
        edgeCache,
        T.A,
        T.B,
        "A",
        T.dir_A ? conPosA : 1 - conPosA,
        conAmpA,
        T.dir_A ? conRotA : 1 - conRotA,
        T.dir_A,
        abPolarity,
        depth,
        polarity
      );

  const BC = polarity
    ? dynamicCachedEC(
        edgeCache,
        T.B,
        T.C,
        "B",
        T.dir_B ? 1 - posB : posB,
        ampB,
        T.dir_B ? 1 - rotB : rotB,
        T.dir_B,
        bcPolarity,
        depth,
        polarity
      )
    : dynamicCachedEC(
        edgeCache,
        T.B,
        T.C,
        "B",
        T.dir_B ? 1 - conPosB : conPosB,
        conAmpB,
        T.dir_B ? 1 - conRotB : conRotB,
        T.dir_B,
        bcPolarity,
        depth,
        polarity
      );

  const AC = polarity
    ? dynamicCachedEC(
        edgeCache,
        T.C,
        T.A,
        "C",
        T.dir_C ? posC : 1 - posC,
        ampC,
        T.dir_C ? rotC : 1 - rotC,
        T.dir_C,
        acPolarity,
        depth,
        polarity
      )
    : dynamicCachedEC(
        edgeCache,
        T.C,
        T.A,
        "C",
        T.dir_C ? conPosC : 1 - conPosC,
        conAmpC,
        T.dir_C ? conRotC : 1 - conRotC,
        T.dir_C,
        acPolarity,
        depth,
        polarity
      );

  return { AB, BC, AC };
}

function getDefinitionAmp() {
  return params.definitionOnSurface ? params.definitionPerturb : params.Top_2;
}

function getDefinitionRot() {
  return params.definitionOnSurface ? 0.5 : params.Top_3;
}

function topologicalEdges(T, dir, edgeCache) {
  const definitionAmp = getDefinitionAmp();
  const definitionRot = getDefinitionRot();
  return {
    AB: cachedEC(
      edgeCache,
      T.A,
      T.B,
      dir > 0 ? params.Top_1 : 1 - params.Top_1,
      definitionAmp,
      definitionRot,
      dir > 0
    ),
    BC: cachedEC(
      edgeCache,
      T.B,
      T.C,
      dir > 0 ? 1 - params.Top_1 : params.Top_1,
      definitionAmp,
      definitionRot,
      dir > 0
    ),
    AC: cachedEC(
      edgeCache,
      T.C,
      T.A,
      dir > 0 ? params.Top_1 : 1 - params.Top_1,
      definitionAmp,
      definitionRot,
      dir > 0
    )
  };
}

function standardChildren(T, AB, BC, AC, polarity, dir) {
  return [
    {
      triangle: new Triangle(
        BC,
        AC,
        AB,
        !T.state,
        T.state ? !T.dir_A : T.dir_A,
        T.state ? T.dir_B : !T.dir_B,
        T.state ? T.dir_C : !T.dir_C
      ),
      polarity: !polarity,
      dir: -dir
    },
    {
      triangle: new Triangle(
        T.A,
        AB,
        AC,
        T.state,
        T.state ? T.dir_A : !T.dir_A,
        T.state ? !T.dir_B : T.dir_B,
        T.state ? !T.dir_C : T.dir_C
      ),
      polarity: !polarity,
      dir
    },
    {
      triangle: new Triangle(
        AB,
        T.B,
        BC,
        T.state,
        T.state ? !T.dir_A : T.dir_A,
        T.state ? T.dir_B : !T.dir_B,
        T.state ? !T.dir_C : T.dir_C
      ),
      polarity: !polarity,
      dir
    },
    {
      triangle: new Triangle(
        AC,
        BC,
        T.C,
        T.state,
        T.state ? T.dir_A : !T.dir_A,
        T.state ? !T.dir_B : T.dir_B,
        T.state ? T.dir_C : !T.dir_C
      ),
      polarity: !polarity,
      dir
    }
  ];
}

function topologicalChildren(T, AB, BC, AC, polarity, dir) {
  return [
    {
      triangle: new Triangle(BC, AC, AB, true),
      polarity: !polarity,
      dir: -dir
    },
    {
      triangle: new Triangle(T.A, AB, AC, true),
      polarity: !polarity,
      dir
    },
    {
      triangle: new Triangle(AB, T.B, BC, true),
      polarity: !polarity,
      dir
    },
    {
      triangle: new Triangle(AC, BC, T.C, true),
      polarity: !polarity,
      dir
    }
  ];
}

function collectRecordPointData(records) {
  const points = new Map();
  const adjacency = new Map();
  const edgeCounts = new Map();

  const ensurePoint = (point) => {
    points.set(point.id, point);
    if (!adjacency.has(point.id)) adjacency.set(point.id, new Set());
  };

  const addEdge = (A, B) => {
    ensurePoint(A);
    ensurePoint(B);
    adjacency.get(A.id).add(B.id);
    adjacency.get(B.id).add(A.id);
    const key = edgeKey(A, B);
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  };

  for (const { triangle: T } of records) {
    addEdge(T.A, T.B);
    addEdge(T.B, T.C);
    addEdge(T.C, T.A);
  }

  const boundaryPointIds = new Set();
  for (const [key, count] of edgeCounts.entries()) {
    if (count !== 1) continue;
    const [aId, bId] = key.split(":").map(Number);
    boundaryPointIds.add(aId);
    boundaryPointIds.add(bId);
  }

  return { points, adjacency, boundaryPointIds };
}

function smoothDefinitionRecords(records) {
  const amount = THREE.MathUtils.clamp(params.definitionSmooth, 0, 1);
  if (amount <= 0) return;

  const { points, adjacency, boundaryPointIds } = collectRecordPointData(records);
  const nextPositions = new Map();
  const sourceXYPlaneEpsilon = 1e-6;

  for (const [id, point] of points.entries()) {
    if (boundaryPointIds.has(id)) continue;

    const neighbors = adjacency.get(id);
    if (!neighbors || neighbors.size === 0) continue;

    const avg = new THREE.Vector3();
    for (const neighborId of neighbors) {
      avg.add(points.get(neighborId));
    }
    avg.divideScalar(neighbors.size);

    if (Math.abs(point.z) < sourceXYPlaneEpsilon) {
      avg.z = 0;
    }

    nextPositions.set(id, point.clone().lerp(avg, amount));
  }

  for (const [id, nextPosition] of nextPositions.entries()) {
    const point = points.get(id);
    point.copy(nextPosition);
    point.pol.copy(point.clone().sub(point.origin));
    if (point.pol.lengthSq() > 1e-12) {
      point.pol.normalize();
    }
  }
}

function snapshotRecords(records) {
  const pointCopies = new Map();

  const copyPoint = (point) => {
    if (!pointCopies.has(point.id)) {
      pointCopies.set(point.id, point.clone());
    }
    return pointCopies.get(point.id);
  };

  return records.map((record) => ({
    ...record,
    triangle: new Triangle(
      copyPoint(record.triangle.A),
      copyPoint(record.triangle.B),
      copyPoint(record.triangle.C),
      record.triangle.state,
      record.triangle.dir_A,
      record.triangle.dir_B,
      record.triangle.dir_C
    )
  }));
}

function subdividePhaseRecords(records, depth, phase) {
  const edgeCache = new Map();
  const nextRecords = [];

  for (const record of records) {
    if (nextRecords.length >= MAX_TRIANGLES) {
      triangleLimitHit = true;
      break;
    }

    const T = record.triangle;
    const edges =
      phase === "Refine"
        ? topologicalEdges(T, record.dir, edgeCache)
        : stagedEdges(T, edgeCache, depth);
    const children =
      phase === "Refine"
        ? topologicalChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir)
        : standardChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir);
    nextRecords.push(...children);
  }

  return nextRecords;
}

function deformVerticalRecords(records, cycleIndex) {
  const points = collectRecordPointData(records).points;
  const baseRule = params[`verticalRule${cycleIndex + 1}`] ?? "Neutral";
  const peakFocus = THREE.MathUtils.clamp(params.formSpikiness, 0, 1);
  const pulse = THREE.MathUtils.clamp(params.expandContract, 0, 1);
  const lift = THREE.MathUtils.clamp(params.verticalLift, 0, 1.5);
  const epsilon = 1e-6;
  const nextHeights = new Map();

  for (const [id, point] of points.entries()) {
    if (point.z <= epsilon) {
      nextHeights.set(id, 0);
      continue;
    }

    const edgeRole = point.ruleRole ?? "A";
    const operation = resolveEdgeOperation(baseRule, params[`edgeRule${edgeRole}`] ?? "Follow");
    const peakField = getCathedralPeakField(point, peakFocus);
    const availableHeight = Math.max(0, params.mass_h - point.z);
    const heightRatio = THREE.MathUtils.clamp(point.z / Math.max(1, params.mass_h), 0, 1);
    const modulation =
      0.88 +
      0.12 *
        hash01(
          quantizeCoord(Math.abs(point.x)),
          quantizeCoord(point.y),
          cycleIndex + 401
        );
    let nextZ = point.z;

    if (operation === "Expand") {
      const rise = availableHeight * lift * (0.055 + peakField * 0.16) * modulation;
      nextZ += rise + params.mass_h * params.stepRise * 0.008 * (1 - heightRatio);
    } else if (operation === "Contract") {
      const protectedPeak = 0.28 + peakField * 0.5;
      nextZ -= point.z * pulse * (0.08 + (1 - peakField) * 0.24) * protectedPeak;
    } else if (operation === "Peak" || operation === "Peaks") {
      const focusedRise =
        availableHeight *
        lift *
        (0.025 + peakField * THREE.MathUtils.lerp(0.22, 0.58, peakFocus));
      nextZ += focusedRise * modulation;
    }

    nextHeights.set(id, THREE.MathUtils.clamp(nextZ, 0, params.mass_h));
  }

  for (const [id, nextZ] of nextHeights.entries()) {
    const point = points.get(id);
    point.z = nextZ;
    point.pol.copy(point.clone().sub(point.origin));
    if (point.pol.lengthSq() > 1e-12) point.pol.normalize();
  }
}

function facadePrimaryEdges(T, edgeCache) {
  const make = (A, B, role, position, amplitude, rotation, state) => {
    const point = cachedEC(edgeCache, A, B, position, amplitude, rotation, state);
    point.ruleRole = point.ruleRole ?? role;
    return point;
  };
  return {
    AB: make(
      T.A,
      T.B,
      "A",
      T.dir_A ? params.Pos_A : 1 - params.Pos_A,
      params.Amp_A,
      T.dir_A ? params.Rot_A : 1 - params.Rot_A,
      T.dir_A
    ),
    BC: make(
      T.B,
      T.C,
      "B",
      T.dir_B ? 1 - params.Pos_B : params.Pos_B,
      params.Amp_B,
      T.dir_B ? 1 - params.Rot_B : params.Rot_B,
      T.dir_B
    ),
    AC: make(
      T.C,
      T.A,
      "C",
      T.dir_C ? params.Pos_C : 1 - params.Pos_C,
      params.Amp_C,
      T.dir_C ? params.Rot_C : 1 - params.Rot_C,
      T.dir_C
    )
  };
}

function subdivideFacadePrimaryRecords(records) {
  const edgeCache = new Map();
  const nextRecords = [];
  for (const record of records) {
    const T = record.triangle;
    const edges = facadePrimaryEdges(T, edgeCache);
    nextRecords.push(
      ...standardChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir)
    );
  }
  return nextRecords;
}

function buildFacadeStageSequence(seedRecords, captureFrames = false) {
  let records = seedRecords;
  const frames = [];
  const capture = (stage) => {
    if (!captureFrames) return;
    const frame = snapshotRecords(mirrorRecordsAcrossYZ(records));
    frame.stage = stage;
    frames.push(frame);
  };

  capture({ kind: "Seed", label: "Half-pyramid façade seed", projection: "both" });
  records = subdivideFacadePrimaryRecords(records);
  capture({
    kind: "Primary",
    label: "Primary façade E/C fold",
    projection: "both"
  });

  for (let depth = 0; depth < params.Recursion_2; depth += 1) {
    records = subdividePhaseRecords(records, depth, "Refine");
    capture({
      kind: "Refine",
      label: `Recursive façade fold ${depth + 1}`,
      projection: "both"
    });
    if (triangleLimitHit) break;
  }

  return { records, frames };
}

function buildSeparatedStageSequence(seedRecords, captureFrames = false) {
  let records = seedRecords;
  const frames = [];
  const capture = (stage) => {
    if (!captureFrames) return;
    const frame = snapshotRecords(mirrorRecordsAcrossYZ(records));
    frame.stage = stage;
    frames.push(frame);
  };

  capture({ kind: "Seed", label: "Half-pyramid seed", projection: "both" });

  for (let depth = 0; depth < params.planarBranchSteps; depth += 1) {
    records = subdividePhaseRecords(records, depth, "Planar");
    const operation = depth % 2 === 0 ? "Contract" : "Expand";
    capture({
      kind: "Planar",
      label: `Planar XZ ${operation.toLowerCase()} ${depth + 1}`,
      projection: "plan"
    });
    if (triangleLimitHit) return { records, frames };
  }

  for (let cycleIndex = 0; cycleIndex < 3; cycleIndex += 1) {
    records = subdividePhaseRecords(
      records,
      params.planarBranchSteps + cycleIndex,
      "Vertical"
    );
    const rule = params[`verticalRule${cycleIndex + 1}`] ?? "Neutral";
    capture({
      kind: rule === "Peak" ? "Peaks" : rule,
      label: `${rule} · vertical Y cycle ${cycleIndex + 1}`,
      projection: "elevation"
    });
    if (triangleLimitHit) return { records, frames };
  }

  for (let depth = 0; depth < params.Recursion_2; depth += 1) {
    records = subdividePhaseRecords(records, depth, "Refine");
    capture({
      kind: "Refine",
      label: `Final faceted subdivision ${depth + 1}`,
      projection: "both"
    });
    if (triangleLimitHit) break;
  }

  return { records, frames };
}

function subdivideWatertight(seedRecords) {
  if (params.facadeMode) {
    const { records } = buildFacadeStageSequence(seedRecords);
    const surfaceTriangles = mirrorRecordsAcrossYZ(records).map((record) => record.triangle);
    for (const triangle of makeThickenedFacade(surfaceTriangles)) {
      pushTriangle(triangle);
      if (triangleLimitHit) return;
    }
    return;
  }

  if (params.verticalBranching) {
    const { records } = buildSeparatedStageSequence(seedRecords);
    const surfaceTriangles = mirrorRecordsAcrossYZ(records).map((record) => record.triangle);
    for (const triangle of makeGeneratedSolid(surfaceTriangles)) {
      pushTriangle(triangle);
      if (triangleLimitHit) return;
    }
    return;
  }

  let records = seedRecords;
  const maxDepth = params.Recursion + params.Recursion_2;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (triangleLimitHit) return;

    const edgeCache = new Map();
    const nextRecords = [];

    for (const record of records) {
      if (nextRecords.length >= MAX_TRIANGLES) {
        triangleLimitHit = true;
        break;
      }

      const T = record.triangle;
      const edges = params.verticalBranching
        ? stagedEdges(T, edgeCache, depth)
        : depth < params.Recursion
          ? standardExpansionEdges(T, record.polarity, edgeCache, depth)
          : topologicalEdges(T, record.dir, edgeCache);
      const children =
        depth < params.Recursion
          ? standardChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir)
          : topologicalChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir);

      nextRecords.push(...children);
    }

    if (depth >= params.Recursion) {
      smoothDefinitionRecords(nextRecords);
    }

    records = nextRecords;
  }

  const surfaceRecords = records;
  const surfaceTriangles = surfaceRecords.map((record) => record.triangle);
  const outputTriangles = surfaceTriangles;
  for (const triangle of outputTriangles) {
    pushTriangle(triangle);
    if (triangleLimitHit) return;
  }
}

function subdivideSel(T, origin, p, a, r, polarity, dir, C) {
  if (triangleLimitHit) return;
  if (C < params.Recursion) {
    const nextC = C + 1;
    const abPolarity = getBranchEdgePolarityOverride(T.A, T.B);
    const bcPolarity = getBranchEdgePolarityOverride(T.B, T.C);
    const acPolarity = getBranchEdgePolarityOverride(T.C, T.A);
    const divided = selectiveSubdivide(T, polarity, dir);
    let count = 0;
    for (const child of divided) {
      if (triangleLimitHit) return;
      subdivideSel(
        child,
        origin,
        p,
        a,
        r,
        !polarity,
        count === 0 ? -dir : dir,
        nextC
      );
      count += 1;
    }
  } else {
    pushTriangle(T);
  }
}

function subdivide(T, origin, p, a, r, polarity, dir, C) {
  if (triangleLimitHit) return;

  if (C < params.Recursion) {
    const nextC = C + 1;

    const AB = polarity
      ? EC(
          T.A,
          T.B,
          T.dir_A ? params.Pos_A : 1 - params.Pos_A,
          params.Amp_A,
          T.dir_A ? params.Rot_A : 1 - params.Rot_A,
          T.dir_A,
          abPolarity
        )
      : EC(
          T.A,
          T.B,
          T.dir_A ? params.Con_Pos_A : 1 - params.Con_Pos_A,
          params.Con_Amp_A,
          T.dir_A ? params.Con_Rot_A : 1 - params.Con_Rot_A,
          T.dir_A,
          abPolarity
        );

    const BC = polarity
      ? EC(
          T.B,
          T.C,
          T.dir_B ? 1 - params.Pos_B : params.Pos_B,
          params.Amp_B,
          T.dir_B ? 1 - params.Rot_B : params.Rot_B,
          T.dir_B,
          bcPolarity
        )
      : EC(
          T.B,
          T.C,
          T.dir_B ? 1 - params.Con_Pos_B : params.Con_Pos_B,
          params.Con_Amp_B,
          T.dir_B ? 1 - params.Con_Rot_B : params.Con_Rot_B,
          T.dir_B,
          bcPolarity
        );

    const AC = polarity
      ? EC(
          T.C,
          T.A,
          T.dir_C ? params.Pos_C : 1 - params.Pos_C,
          params.Amp_C,
          T.dir_C ? params.Rot_C : 1 - params.Rot_C,
          T.dir_C,
          acPolarity
        )
      : EC(
          T.C,
          T.A,
          T.dir_C ? params.Con_Pos_C : 1 - params.Con_Pos_C,
          params.Con_Amp_C,
          T.dir_C ? params.Con_Rot_C : 1 - params.Con_Rot_C,
          T.dir_C,
          acPolarity
        );

    subdivide(
      new Triangle(
        BC,
        AC,
        AB,
        !T.state,
        T.state ? !T.dir_A : T.dir_A,
        T.state ? T.dir_B : !T.dir_B,
        T.state ? T.dir_C : !T.dir_C
      ),
      origin,
      p,
      a,
      r,
      !polarity,
      -dir,
      nextC
    );

    subdivide(
      new Triangle(
        T.A,
        AB,
        AC,
        T.state,
        T.state ? T.dir_A : !T.dir_A,
        T.state ? !T.dir_B : T.dir_B,
        T.state ? !T.dir_C : T.dir_C
      ),
      origin,
      p,
      a,
      r,
      !polarity,
      dir,
      nextC
    );

    subdivide(
      new Triangle(
        AB,
        T.B,
        BC,
        T.state,
        T.state ? !T.dir_A : T.dir_A,
        T.state ? T.dir_B : !T.dir_B,
        T.state ? !T.dir_C : T.dir_C
      ),
      origin,
      p,
      a,
      r,
      !polarity,
      dir,
      nextC
    );

    subdivide(
      new Triangle(
        AC,
        BC,
        T.C,
        T.state,
        T.state ? T.dir_A : !T.dir_A,
        T.state ? !T.dir_B : T.dir_B,
        T.state ? T.dir_C : !T.dir_C
      ),
      origin,
      p,
      a,
      r,
      !polarity,
      dir,
      nextC
    );
  } else if (C < params.Recursion_2 + params.Recursion) {
    const nextC = C + 1;
    const definitionAmp = getDefinitionAmp();
    const definitionRot = getDefinitionRot();

    const AB = EC(
      T.A,
      T.B,
      dir > 0 ? params.Top_1 : 1 - params.Top_1,
      definitionAmp,
      definitionRot,
      dir > 0
    );

    const BC = EC(
      T.B,
      T.C,
      dir > 0 ? 1 - params.Top_1 : params.Top_1,
      definitionAmp,
      definitionRot,
      dir > 0
    );

    const AC = EC(
      T.C,
      T.A,
      dir > 0 ? params.Top_1 : 1 - params.Top_1,
      definitionAmp,
      definitionRot,
      dir > 0
    );

    subdivide(
      new Triangle(BC, AC, AB, true),
      origin,
      p,
      a,
      r,
      !polarity,
      -dir,
      nextC
    );
    subdivide(
      new Triangle(T.A, AB, AC, true),
      origin,
      p,
      a,
      r,
      !polarity,
      dir,
      nextC
    );
    subdivide(
      new Triangle(AB, T.B, BC, true),
      origin,
      p,
      a,
      r,
      !polarity,
      dir,
      nextC
    );
    subdivide(
      new Triangle(AC, BC, T.C, true),
      origin,
      p,
      a,
      r,
      !polarity,
      dir,
      nextC
    );
  } else {
    pushTriangle(T);
  }
}

function disposeSceneObject(obj) {
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => m.dispose());
    } else {
      obj.material.dispose();
    }
  }
}

function clearGroup(group) {
  while (group.children.length > 0) {
    const obj = group.children[group.children.length - 1];
    group.remove(obj);
    disposeSceneObject(obj);
  }
}

function clearModel() {
  clearGroup(modelGroup);
  currentMesh = null;
}

function clearTargetOverlay() {
  clearGroup(targetOverlayGroup);
}

function vertexEdgeKey(position, index) {
  const precision = 100000;
  const x = Math.round(position.getX(index) * precision);
  const y = Math.round(position.getY(index) * precision);
  const z = Math.round(position.getZ(index) * precision);
  return `${x},${y},${z}`;
}

function analyzeTriangleEdges(geometry) {
  const position = geometry.getAttribute("position");
  const edgeCounts = new Map();

  const addEdge = (a, b) => {
    const aKey = vertexEdgeKey(position, a);
    const bKey = vertexEdgeKey(position, b);
    const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  };

  for (let i = 0; i < position.count; i += 3) {
    addEdge(i, i + 1);
    addEdge(i + 1, i + 2);
    addEdge(i + 2, i);
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const count of edgeCounts.values()) {
    if (count === 1) boundaryEdges += 1;
    if (count > 2) nonManifoldEdges += 1;
  }

  return {
    uniqueEdges: edgeCounts.size,
    boundaryEdges,
    nonManifoldEdges
  };
}

function analyzeBilateralSymmetry(geometry) {
  const position = geometry.getAttribute("position");
  const precision = 10000;
  const keys = new Set();
  for (let index = 0; index < position.count; index += 1) {
    keys.add(
      `${Math.round(position.getX(index) * precision)},${Math.round(
        position.getY(index) * precision
      )},${Math.round(position.getZ(index) * precision)}`
    );
  }
  let missingVertices = 0;
  for (let index = 0; index < position.count; index += 1) {
    const mirrorKey = `${Math.round(-position.getX(index) * precision)},${Math.round(
      position.getY(index) * precision
    )},${Math.round(position.getZ(index) * precision)}`;
    if (!keys.has(mirrorKey)) missingVertices += 1;
  }
  return { missingVertices, symmetric: missingVertices === 0 };
}

function getActivePreset() {
  return STL_PRESETS.find((p) => p.name === params.activePreset);
}

function getPresetUrl(preset) {
  return `${STL_FOLDER_URL}${encodeURIComponent(preset.name)}`;
}

function updateTargetOverlay() {
  const shouldShow = params.activePreset === "Custom" && params.targetOverlay;
  const preset = STL_PRESETS.find((p) => p.name === params.targetOverlayPreset);
  targetOverlayRequestId += 1;

  if (!shouldShow || !preset) {
    targetOverlayStatus = "";
    clearTargetOverlay();
    return;
  }

  const requestId = targetOverlayRequestId;
  targetOverlayStatus = `Loading overlay ${preset.name}`;
  clearTargetOverlay();
  updateStats();

  stlLoader.load(
    getPresetUrl(preset),
    (geometry) => {
      if (requestId !== targetOverlayRequestId) {
        geometry.dispose();
        return;
      }

      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: 0x2f80ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          roughness: 0.9,
          metalness: 0
        })
      );
      targetOverlayGroup.add(mesh);

      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: 0x0055ff,
          opacity: 0.65,
          transparent: true,
          depthWrite: false
        })
      );
      targetOverlayGroup.add(wire);

      targetOverlayStatus = "";
      updateStats();
    },
    undefined,
    (error) => {
      if (requestId !== targetOverlayRequestId) return;
      targetOverlayStatus = `Could not load overlay ${preset.name}`;
      console.error(error);
      updateStats();
    }
  );
}

function buildImportedRenderObjects(geometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const meshMat = new THREE.MeshStandardMaterial({
    color: 0xc8c8c8,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0
  });
  const mesh = new THREE.Mesh(geometry, meshMat);
  modelGroup.add(mesh);
  currentMesh = mesh;

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x111111, opacity: 0.35, transparent: true })
  );
  modelGroup.add(wire);

  const position = geometry.getAttribute("position");
  const bbox = geometry.boundingBox;
  importedStats = {
    triangles: Math.floor(position.count / 3),
    vertices: position.count,
    bbox
  };
}

function loadImportedPreset(preset) {
  const requestId = ++importRequestId;
  triangleLimitHit = false;
  triangles = [];
  importedStats = null;
  importedStatus = `Loading ${preset.name}`;
  generatedEdgeStats = null;
  targetOverlayStatus = "";
  clearTargetOverlay();
  clearModel();
  updateStepPanel();
  updateStats();

  stlLoader.load(
    getPresetUrl(preset),
    (geometry) => {
      if (requestId !== importRequestId) {
        geometry.dispose();
        return;
      }
      importedStatus = "";
      clearModel();
      buildImportedRenderObjects(geometry);
      updateStepPanel();
      updateStats();
    },
    undefined,
    (error) => {
      if (requestId !== importRequestId) return;
      importedStats = null;
      importedStatus = `Could not load ${preset.name}`;
      console.error(error);
      updateStepPanel();
      updateStats();
    }
  );
}

function buildRenderObjects() {
  const positions = [];
  const colors = [];
  const dark = new THREE.Color(0x4f4f4f);
  const light = new THREE.Color(0xd0d0d0);

  for (const T of triangles) {
    const c = T.state ? dark : light;
    positions.push(T.A.x, T.A.y, T.A.z, T.B.x, T.B.y, T.B.z, T.C.x, T.C.y, T.C.z);
    if (params.showStateColors) {
      for (let i = 0; i < 3; i += 1) {
        colors.push(c.r, c.g, c.b);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (params.showStateColors) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }
  geometry.computeVertexNormals();

  const meshMat = new THREE.MeshStandardMaterial({
    color: 0xb8b8b8,
    vertexColors: params.showStateColors,
    side: THREE.DoubleSide,
    roughness: 0.78,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(geometry, meshMat);
  modelGroup.add(mesh);
  currentMesh = mesh;
  generatedEdgeStats = analyzeTriangleEdges(geometry);
  generatedSymmetryStats = analyzeBilateralSymmetry(geometry);

  if (params.showWireframe) {
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0x1a1a1a,
        opacity: 0.24,
        transparent: true,
        depthWrite: false
      })
    );
    modelGroup.add(wire);
  }

  if (params.showDirections) {
    const dirPositions = [];
    const dirColors = [];
    const red = new THREE.Color(0xff0000);
    const green = new THREE.Color(0x00ff00);

    const addDirection = (p0, p1, b) => {
      const col = b ? red : green;
      dirPositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      dirColors.push(col.r, col.g, col.b, col.r, col.g, col.b);
    };

    for (const T of triangles) {
      const center = T.getCenter();
      const A_p = T.A.clone().lerp(center, 0.2);
      const B_p = T.B.clone().lerp(center, 0.2);
      const C_p = T.C.clone().lerp(center, 0.2);
      const D = C_p.clone().lerp(A_p, 0.8);
      addDirection(A_p, B_p, T.dir_A);
      addDirection(B_p, C_p, T.dir_B);
      addDirection(C_p, D, T.dir_C);
    }

    const dirGeom = new THREE.BufferGeometry();
    dirGeom.setAttribute("position", new THREE.Float32BufferAttribute(dirPositions, 3));
    dirGeom.setAttribute("color", new THREE.Float32BufferAttribute(dirColors, 3));
    const dirLines = new THREE.LineSegments(
      dirGeom,
      new THREE.LineBasicMaterial({ vertexColors: true })
    );
    modelGroup.add(dirLines);
  }

  if (params.showPolarity && params.Normal_len > 0) {
    const normalPositions = [];
    const blue = new THREE.Color(0x0000ff);

    const addNormal = (p) => {
      const end = p.clone().addScaledVector(p.pol, params.Normal_len);
      normalPositions.push(p.x, p.y, p.z, end.x, end.y, end.z);
    };

    for (const T of triangles) {
      addNormal(T.A);
      addNormal(T.B);
      addNormal(T.C);
    }

    const normalGeom = new THREE.BufferGeometry();
    normalGeom.setAttribute("position", new THREE.Float32BufferAttribute(normalPositions, 3));
    const normalLines = new THREE.LineSegments(
      normalGeom,
      new THREE.LineBasicMaterial({ color: blue })
    );
    modelGroup.add(normalLines);
  }
}

function updateStats() {
  const activePreset = getActivePreset();
  const isImportedPreset = Boolean(activePreset);
  const tris = importedStats ? importedStats.triangles : triangles.length;
  const verts = importedStats ? importedStats.vertices : tris * 3;
  const bbox = importedStats?.bbox;
  statsEl.innerHTML = [
    `<strong>Triangles:</strong> ${tris.toLocaleString()}`,
    `<strong>Vertices:</strong> ${verts.toLocaleString()}`,
    `<strong>Mode:</strong> ${
      isImportedPreset
        ? "Imported STL"
        : params.facadeMode
          ? "Thickened façade shell"
          : params.selectiveMode
            ? "Selective"
            : "Standard"
    }`,
    `<strong>Orientation:</strong> STL Z-up -> Three.js Y-up`,
    !isImportedPreset && !params.selectiveMode
      ? `<strong>Edges:</strong> ${params.watertightMode ? "Shared / watertight" : "Original per-face"}`
      : "",
    !isImportedPreset
      ? `<strong>Branch Direction:</strong> ${
          params.facadeMode
            ? "Half-pyramid surface EC folds"
            : params.verticalBranching
              ? "Planar XZ first, then vertical Y"
              : "Polarity blend"
        }`
      : "",
    !isImportedPreset && (params.facadeMode || params.verticalBranching)
      ? `<strong>YZ Symmetry:</strong> ${
          generatedSymmetryStats?.symmetric ? "Exact" : `${generatedSymmetryStats?.missingVertices ?? 0} unmatched vertices`
        }`
      : "",
    !isImportedPreset
      ? params.facadeMode
        ? `<strong>Stages:</strong> 1 primary E/C fold + ${params.Recursion_2} recursive façade folds`
        : `<strong>Stages:</strong> ${params.planarBranchSteps} plan splits + 3 vertical branch splits + ${params.Recursion_2} final facet passes`
      : "",
    !isImportedPreset
      ? `<strong>Definition:</strong> Displaced EC facets`
      : "",
    !isImportedPreset
      ? `<strong>Facet Rule:</strong> split ${params.Top_1.toFixed(2)}, relief ${params.Top_2.toFixed(
          3
        )}, rotation ${params.Top_3.toFixed(2)}`
      : "",
    !isImportedPreset && params.facadeMode
      ? `<strong>Primary E/C:</strong> A ${params.Amp_A.toFixed(3)}, B ${params.Amp_B.toFixed(
          3
        )}, C ${params.Amp_C.toFixed(3)}`
      : "",
    !isImportedPreset && params.facadeMode
      ? `<strong>Façade Thickness:</strong> ${params.facadeThickness.toFixed(2)}`
      : "",
    !isImportedPreset && !params.facadeMode
      ? `<strong>Branching:</strong> ${params.planarBranchSteps} planar C/E splits, vertical lift ${params.verticalLift.toFixed(
          2
        )}, pulse ${params.expandContract.toFixed(2)}`
      : "",
    !isImportedPreset && params.verticalBranching
      ? `<strong>Y Rule Cycle:</strong> ${params.verticalRule1} → ${params.verticalRule2} → ${params.verticalRule3}`
      : "",
    !isImportedPreset && params.verticalBranching
      ? `<strong>Edge A/B/C:</strong> ${params.edgeRuleA} · ${params.edgeRuleB} · ${params.edgeRuleC}`
      : "",
    generatedEdgeStats && !isImportedPreset
      ? `<strong>Boundary Edges:</strong> ${generatedEdgeStats.boundaryEdges.toLocaleString()}`
      : "",
    generatedEdgeStats && !isImportedPreset
      ? `<strong>${params.facadeMode ? "Shell Closure" : "Ground Seal"}:</strong> ${
          generatedEdgeStats.boundaryEdges === 0 ? "Watertight" : "Open"
        }`
      : "",
    generatedEdgeStats && !isImportedPreset && generatedEdgeStats.nonManifoldEdges > 0
      ? `<span style="color:#a00;"><strong>Non-manifold Edges:</strong> ${generatedEdgeStats.nonManifoldEdges.toLocaleString()}</span>`
      : "",
    `<strong>Seed:</strong> ${params.seedMode}`,
    !isImportedPreset ? `<strong>Seed Faces:</strong> ${getSeedFaceCount()}` : "",
    !isImportedPreset && params.seedMode === "quadruple"
      ? `<strong>Quad Symmetry:</strong> ${params.quadSymmetry ? "on" : "off"}`
      : "",
    `<strong>Preset:</strong> ${params.activePreset}`,
    activePreset
      ? `<strong>Preset Target:</strong> ${activePreset.source.triangles.toLocaleString()} tris`
      : "",
    bbox
      ? `<strong>Bounds:</strong> ${bbox.min.x.toFixed(2)}..${bbox.max.x.toFixed(2)} x, ${bbox.min.y.toFixed(2)}..${bbox.max.y.toFixed(2)} y, ${bbox.min.z.toFixed(2)}..${bbox.max.z.toFixed(2)} z`
      : "",
    !isImportedPreset && params.targetOverlay
      ? `<strong>Target Overlay:</strong> ${params.targetOverlayPreset}`
      : "",
    targetOverlayStatus ? `<span style="color:#555;">${targetOverlayStatus}</span>` : "",
    recursionAnimationStatus ? `<span style="color:#555;">${recursionAnimationStatus}</span>` : "",
    importedStatus ? `<span style="color:#555;">${importedStatus}</span>` : "",
    triangleLimitHit
      ? `<span style="color:#a00;"><strong>Limit:</strong> Capped at ${MAX_TRIANGLES.toLocaleString()}</span>`
      : ""
  ]
    .filter(Boolean)
    .join("<br>");
}

function createSeedPoints() {
  nextPointId = 1;
  const lateralDepth = shouldUseQuadSymmetry() ? params.mass_d : params.mass_w;

  const O = new Point(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 1),
    true
  );

  const A = new Point(
    O,
    new THREE.Vector3(params.mass_d, 0, 0),
    new THREE.Vector3(1, 0, 0),
    true
  );
  const B = new Point(
    O,
    new THREE.Vector3(-params.mass_d, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    true
  );
  const C = new Point(
    O,
    new THREE.Vector3(0, lateralDepth, 0),
    new THREE.Vector3(0, 1, 0),
    true
  );
  const E = new Point(
    O,
    new THREE.Vector3(0, -lateralDepth, 0),
    new THREE.Vector3(0, -1, 0),
    true
  );
  const D = new Point(
    O,
    new THREE.Vector3(0, 0, params.mass_h),
    new THREE.Vector3(0, 0, 1),
    true
  );

  return { O, A, B, C, D, E };
}

function createSeedRecords(A, B, C, D, E) {
  if (params.facadeMode || params.verticalBranching) {
    return [
      {
        triangle: new Triangle(A, D, C, true, false, false, false),
        polarity: true,
        dir: 1
      }
    ];
  }

  if (params.seedMode === "quadruple") {
    return [
      {
        triangle: new Triangle(A, D, C, true, false, false, false),
        polarity: true,
        dir: 1
      },
      {
        triangle: new Triangle(C, D, B, true, false, false, false),
        polarity: true,
        dir: 1
      },
      {
        triangle: new Triangle(B, D, E, true, false, false, false),
        polarity: true,
        dir: 1
      },
      {
        triangle: new Triangle(E, D, A, true, false, false, false),
        polarity: true,
        dir: 1
      }
    ];
  }

  if (params.seedMode === "double") {
    return [
      {
        triangle: new Triangle(A, D, C, true, false, false, false),
        polarity: true,
        dir: 1
      },
      {
        triangle: new Triangle(B, D, C, true, false, false, false),
        polarity: true,
        dir: 1
      }
    ];
  }

  return [
    {
      triangle: new Triangle(B, D, C, true, false, false, false),
      polarity: true,
      dir: 1
    }
  ];
}

function rebuildGeometry() {
  const activePreset = getActivePreset();
  if (activePreset) {
    loadImportedPreset(activePreset);
    return;
  }

  importRequestId += 1;
  importedStats = null;
  importedStatus = "";
  generatedEdgeStats = null;
  recursionAnimationStatus = "";
  triangleLimitHit = false;
  triangles = [];

  const { O, A, B, C, D, E } = createSeedPoints();
  const seedRecords = createSeedRecords(A, B, C, D, E);

  if (!params.selectiveMode && params.watertightMode) {
    subdivideWatertight(seedRecords);
  } else if (params.selectiveMode) {
    for (const record of seedRecords) {
      subdivideSel(record.triangle, O, 0.5, 0.5, 0.5, true, record.dir, 0);
    }
  } else {
    for (const record of seedRecords) {
      subdivide(record.triangle, O, 0.5, 0.5, 0.5, record.polarity, record.dir, 0);
    }
  }

  clearModel();
  if (triangles.length > 0) {
    buildRenderObjects();
  }
  updateStepPanel();
  updateStats();
  updateTargetOverlay();
}

let rebuildQueued = false;
function queueRebuild() {
  stopRecursionAnimation();
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    rebuildGeometry();
  });
}

function rebuildNow() {
  stopRecursionAnimation();
  rebuildQueued = false;
  rebuildGeometry();
}

function buildWatertightFrames(seedRecords) {
  if (params.facadeMode) {
    return buildFacadeStageSequence(seedRecords, true).frames;
  }

  if (params.verticalBranching) {
    return buildSeparatedStageSequence(seedRecords, true).frames;
  }

  const seedSurface = params.verticalBranching ? mirrorRecordsAcrossYZ(seedRecords) : seedRecords;
  const seedFrame = snapshotRecords(seedSurface);
  seedFrame.stage = { kind: "Seed", label: "Half-pyramid seed", projection: "both" };
  const frames = [seedFrame];
  let records = seedRecords;
  const maxDepth = params.Recursion + params.Recursion_2;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const edgeCache = new Map();
    const nextRecords = [];

    for (const record of records) {
      const T = record.triangle;
      const edges = params.verticalBranching
        ? stagedEdges(T, edgeCache, depth)
        : depth < params.Recursion
          ? standardExpansionEdges(T, record.polarity, edgeCache, depth)
          : topologicalEdges(T, record.dir, edgeCache);
      const children =
        depth < params.Recursion
          ? standardChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir)
          : topologicalChildren(T, edges.AB, edges.BC, edges.AC, record.polarity, record.dir);

      nextRecords.push(...children);
      if (nextRecords.length > MAX_TRIANGLES) {
        triangleLimitHit = true;
        break;
      }
    }

    if (depth >= params.Recursion) {
      smoothDefinitionRecords(nextRecords);
    }

    records = nextRecords;
    const frameSurface = params.verticalBranching ? mirrorRecordsAcrossYZ(records) : records;
    const frame = snapshotRecords(frameSurface);
    frame.stage = params.verticalBranching
      ? getStagedPhase(depth)
      : {
          kind: depth < params.Recursion ? "Growth" : "Refine",
          label: depth < params.Recursion ? `Growth ${depth + 1}` : `Final subdivision ${depth - params.Recursion + 1}`,
          projection: "both"
        };
    frames.push(frame);
    if (triangleLimitHit) break;
  }

  return frames;
}

function getFrameBounds(frames) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity
  };

  for (const records of frames) {
    for (const { triangle: T } of records) {
      for (const point of [T.A, T.B, T.C]) {
        bounds.minX = Math.min(bounds.minX, point.x);
        bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxY = Math.max(bounds.maxY, point.y);
        bounds.minZ = Math.min(bounds.minZ, point.z);
        bounds.maxZ = Math.max(bounds.maxZ, point.z);
      }
    }
  }

  if (!Number.isFinite(bounds.minX)) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };
  }

  const padX = Math.max(1, (bounds.maxX - bounds.minX) * 0.12);
  const padY = Math.max(1, (bounds.maxY - bounds.minY) * 0.12);
  const padZ = Math.max(1, (bounds.maxZ - bounds.minZ) * 0.12);
  bounds.minX -= padX;
  bounds.maxX += padX;
  bounds.minY -= padY;
  bounds.maxY += padY;
  bounds.minZ -= padZ;
  bounds.maxZ += padZ;
  return bounds;
}

function drawStepThumbnail(canvas, records, bounds, stage) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = 320;
  const cssHeight = 178;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const gutter = 8;
  const labelHeight = 14;
  const plotWidth = (cssWidth - gutter) / 2;
  const plotHeight = cssHeight - labelHeight;
  const spanX = Math.max(1e-6, bounds.maxX - bounds.minX);
  const spanY = Math.max(1e-6, bounds.maxY - bounds.minY);
  const spanZ = Math.max(1e-6, bounds.maxZ - bounds.minZ);
  const projectPlan = (point) => ({
    x: ((point.x - bounds.minX) / spanX) * plotWidth,
    y: labelHeight + plotHeight - ((point.y - bounds.minY) / spanY) * plotHeight
  });
  const projectElevation = (point) => ({
    x: plotWidth + gutter + ((point.x - bounds.minX) / spanX) * plotWidth,
    y: labelHeight + plotHeight - ((point.z - bounds.minZ) / spanZ) * plotHeight
  });

  const stride = Math.max(1, Math.ceil(records.length / 700));
  ctx.lineWidth = 0.75;
  ctx.fillStyle = "#555555";
  ctx.font = '600 9px "Segoe UI", sans-serif';
  ctx.fillText("PLAN XZ", 3, 10);
  ctx.fillText("ELEVATION XY", plotWidth + gutter + 3, 10);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.beginPath();
  ctx.moveTo(plotWidth + gutter / 2, 0);
  ctx.lineTo(plotWidth + gutter / 2, cssHeight);
  ctx.stroke();
  ctx.strokeStyle = stage?.kind === "Refine" ? "rgba(34, 94, 168, 0.72)" : "rgba(20, 20, 20, 0.62)";

  for (let i = 0; i < records.length; i += stride) {
    const T = records[i].triangle;
    for (const project of [projectPlan, projectElevation]) {
      const A = project(T.A);
      const B = project(T.B);
      const C = project(T.C);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function getStepKind(stepIndex) {
  if (stepIndex === 0) return "Seed";
  return getStagedPhase(stepIndex - 1).kind;
}

function renderStepPanel(frames = latestStepFrames, activeIndex = highlightedStepIndex) {
  latestStepFrames = frames;
  highlightedStepIndex = activeIndex;
  stepGridEl.textContent = "";

  const activePreset = getActivePreset();
  if (activePreset) {
    stepSummaryEl.innerHTML = "";
    const message = document.createElement("div");
    message.className = "step-message";
    message.textContent = "Choose a sample target and build its staged study to see generation snapshots.";
    stepGridEl.appendChild(message);
    return;
  }

  if (!frames.length) {
    stepSummaryEl.innerHTML = "";
    const message = document.createElement("div");
    message.className = "step-message";
    message.textContent = "No recursion frames are available yet.";
    stepGridEl.appendChild(message);
    return;
  }

  const finalFrame = frames[frames.length - 1];
  stepSummaryEl.innerHTML = [
    `<strong>${frames.length}</strong> snapshots`,
    `<strong>${finalFrame.length.toLocaleString()}</strong> final surface triangles`,
    params.facadeMode
      ? `<strong>1</strong> primary E/C fold + <strong>${params.Recursion_2}</strong> recursive façade folds`
      : `<strong>${params.planarBranchSteps}</strong> plan splits + <strong>3</strong> vertical branch splits + <strong>${params.Recursion_2}</strong> final facet passes`
  ].join(" · ");

  const bounds = getFrameBounds(frames);
  frames.forEach((records, index) => {
    const row = document.createElement("div");
    row.className = "step-row";
    row.classList.toggle("active", index === activeIndex);

    const canvas = document.createElement("canvas");
    const stage = records.stage ?? {
      kind: getStepKind(index),
      label: getStepKind(index),
      projection: "both"
    };
    drawStepThumbnail(canvas, records, bounds, stage);

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "step-title";
    title.textContent = `Step ${index} · ${stage.label}`;
    const meta = document.createElement("div");
    meta.className = "step-meta";
    meta.textContent = `${records.length.toLocaleString()} triangles`;

    info.appendChild(title);
    info.appendChild(meta);
    row.appendChild(canvas);
    row.appendChild(info);
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Show step ${index}: ${stage.label}`);
    const selectFrame = () => {
      recursionAnimationStatus = `Showing step ${index} / ${frames.length - 1}: ${stage.label}`;
      renderStepPanel(frames, index);
      renderRecordFrame(records);
    };
    row.addEventListener("click", selectFrame);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectFrame();
      }
    });
    stepGridEl.appendChild(row);
  });
}

function updateStepPanel() {
  if (getActivePreset()) {
    renderStepPanel([]);
    return;
  }

  const limitBefore = triangleLimitHit;
  const { A, B, C, D, E } = createSeedPoints();
  const frames = buildWatertightFrames(createSeedRecords(A, B, C, D, E));
  triangleLimitHit = limitBefore || triangleLimitHit;
  renderStepPanel(frames);
}

function renderRecordFrame(records) {
  const surfaceTriangles = records.map((record) => record.triangle);
  triangles = params.facadeMode
    ? makeThickenedFacade(surfaceTriangles)
    : params.verticalBranching
      ? makeGeneratedSolid(surfaceTriangles)
      : surfaceTriangles;
  clearModel();
  if (triangles.length > 0) {
    buildRenderObjects();
  }
  updateStats();
}

function stopRecursionAnimation() {
  if (recursionAnimationTimer) {
    window.clearTimeout(recursionAnimationTimer);
    recursionAnimationTimer = null;
  }
  recursionAnimationStatus = "";
}

function animateRecursionSequence() {
  stopRecursionAnimation();
  params.activePreset = "Custom";
  params.selectiveMode = false;
  params.watertightMode = true;
  refreshGuiDisplay();

  importRequestId += 1;
  importedStats = null;
  importedStatus = "";
  generatedEdgeStats = null;
  triangleLimitHit = false;
  triangles = [];
  clearModel();
  updateTargetOverlay();

  const { A, B, C, D, E } = createSeedPoints();
  const frames = buildWatertightFrames(createSeedRecords(A, B, C, D, E));
  let step = 0;
  setPanelTab("steps");

  const showStep = () => {
    recursionAnimationStatus = `Recursion Step ${step} / ${frames.length - 1}`;
    renderStepPanel(frames, step);
    renderRecordFrame(frames[step]);
    step += 1;

    if (step < frames.length) {
      recursionAnimationTimer = window.setTimeout(showStep, 850);
    } else {
      recursionAnimationTimer = null;
    }
  };

  showStep();
}

function refreshGuiDisplay() {
  if (!guiRef) return;
  guiRef.controllersRecursive().forEach((controller) => controller.updateDisplay());
  updateVerticalBranchingGuiState();
  updateDefinitionGuiState();
  updateAdvancedGuiState();
}

function updateVerticalBranchingGuiState() {
  for (const controller of branchRotationControllers) {
    controller.domElement.style.display = params.verticalBranching ? "none" : "";
  }
}

function updateDefinitionGuiState() {
  for (const controller of definitionDisplacementControllers) {
    controller.domElement.style.display = params.definitionOnSurface ? "none" : "";
  }
  for (const controller of definitionSurfaceControllers) {
    controller.domElement.style.display = params.definitionOnSurface ? "" : "none";
  }
}

function updateAdvancedGuiState() {
  for (const folder of advancedGuiFolders) {
    folder.domElement.style.display = params.showAdvancedControls ? "" : "none";
  }
}

function applyPresetByName(name) {
  const preset = STL_PRESETS.find((p) => p.name === name);
  if (!preset) return;
  Object.assign(params, preset.params);
  params.activePreset = preset.name;
  refreshGuiDisplay();
  queueRebuild();
}

function applySimpleSpikiness() {
  const s = THREE.MathUtils.clamp(params.formSpikiness, 0, 1);
  const split = THREE.MathUtils.lerp(0.52, 0.58, s);
  params.Pos_A = split;
  params.Pos_B = split;
  params.Pos_C = split;
  params.Rot_A = 0.5;
  params.Rot_B = 0.5;
  params.Rot_C = 0.5;

  params.Amp_A = THREE.MathUtils.lerp(0.02, 0.3, s);
  params.Amp_B = THREE.MathUtils.lerp(0.06, 0.46, s);
  params.Amp_C = THREE.MathUtils.lerp(0.06, 0.52, s);

  params.Con_Pos_A = THREE.MathUtils.lerp(0.52, 0.62, s);
  params.Con_Pos_B = params.Con_Pos_A;
  params.Con_Pos_C = params.Con_Pos_A;
  params.Con_Amp_A = THREE.MathUtils.lerp(0.02, 0.2, s);
  params.Con_Amp_B = THREE.MathUtils.lerp(0.02, 0.24, s);
  params.Con_Amp_C = THREE.MathUtils.lerp(0.02, 0.18, s);
  params.Con_Rot_A = 0.5;
  params.Con_Rot_B = 0.5;
  params.Con_Rot_C = 0.5;

  params.Top_1 = THREE.MathUtils.lerp(0.5, 0.55, s);
  params.definitionPerturb = THREE.MathUtils.lerp(0, 0.045, s);
}

function applyTargetStudy(name = params.studyTarget) {
  const target = STL_PRESETS.find((preset) => preset.name === name);
  if (!target || !target.name.startsWith("Target_")) return;
  const totalDepth = Math.round(Math.log(target.source.triangles / 2) / Math.log(4));
  const targetNumber = Number.parseInt(target.name.match(/Target_(\d+)/)?.[1] ?? "4", 10);
  const characterByTarget = {
    1: { focus: 0.66, spread: 1.04, growth: 0.82, pulse: 0.48 },
    2: { focus: 0.76, spread: 1.12, growth: 0.96, pulse: 0.6 },
    3: { focus: 0.82, spread: 0.64, growth: 1.04, pulse: 0.62 },
    4: { focus: 0.72, spread: 0.92, growth: 0.88, pulse: 0.52 },
    5: { focus: 0.48, spread: 0.68, growth: 0.66, pulse: 0.32 },
    6: { focus: 0.78, spread: 0.96, growth: 0.92, pulse: 0.56 }
  };
  const character = characterByTarget[targetNumber] ?? characterByTarget[4];

  params.activePreset = "Custom";
  params.studyTarget = target.name;
  params.seedMode = "double";
  params.watertightMode = true;
  params.facadeMode = true;
  params.verticalBranching = false;
  params.definitionOnSurface = false;
  params.selectiveMode = false;
  params.quadSymmetry = false;
  params.targetOverlay = true;
  params.targetOverlayPreset = target.name;
  params.showWireframe = true;
  params.showStateColors = false;
  params.showDirections = false;
  params.showPolarity = false;
  params.Recursion = 1;
  params.Recursion_2 = Math.max(1, totalDepth - 1);
  for (const key of [
    "Pos_A",
    "Amp_A",
    "Rot_A",
    "Pos_B",
    "Amp_B",
    "Rot_B",
    "Pos_C",
    "Amp_C",
    "Rot_C"
  ]) {
    params[key] = target.params[key];
  }
  params.Top_1 = target.params.Top_1;
  params.Top_2 = target.params.Top_2;
  params.Top_3 = target.params.Top_3;
  params.mass_h = target.params.mass_h;
  params.mass_d = target.params.mass_d;
  params.mass_w = target.params.mass_w;
  params.facadeThickness = THREE.MathUtils.clamp(target.params.mass_w * 0.08, 1.2, 6);
  params.formSpikiness = character.focus;
  params.verticalRule1 = "Expand";
  params.verticalRule2 = "Contract";
  params.verticalRule3 = "Peak";
  params.edgeRuleA = target.params.Amp_A < 0 ? "Invert" : "Follow";
  params.edgeRuleB = target.params.Amp_B < 0 ? "Invert" : "Follow";
  params.edgeRuleC = target.params.Amp_C < 0 ? "Invert" : "Follow";
  params.mirrorBranching = true;
  params.definitionSmooth = 0;
  params.definitionPerturb = 0;
  refreshGuiDisplay();
  rebuildNow();
  setPanelTab("compare");
}

function applyTarget4Study() {
  applyTargetStudy("Target_4.stl");
}

function applyCharacterPreset(spikiness, smoothness) {
  params.activePreset = "Custom";
  params.watertightMode = true;
  params.facadeMode = true;
  params.verticalBranching = false;
  params.definitionOnSurface = false;
  params.selectiveMode = false;
  params.formSpikiness = spikiness;
  params.definitionSmooth = 0;
  const isSpiky = spikiness > 0.5;
  params.Recursion = 1;
  params.Recursion_2 = isSpiky ? 5 : 4;
  params.Amp_A = isSpiky ? -0.09 : -0.04;
  params.Amp_B = isSpiky ? 0.22 : 0.12;
  params.Amp_C = isSpiky ? 0.25 : 0.14;
  params.facadeThickness = isSpiky ? 2.6 : 3.4;
  params.Top_1 = isSpiky ? 0.54 : 0.5;
  params.Top_2 = isSpiky ? -0.19 : -0.08;
  params.Top_3 = isSpiky ? 0.86 : 0.5;
  params.mirrorBranching = true;
  refreshGuiDisplay();
  rebuildNow();
  setPanelTab("model");
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

const RULE_PRESETS = [
  {
    vertical: ["Expand", "Contract", "Peak"],
    edges: ["Follow", "Follow", "Follow"]
  },
  {
    vertical: ["Expand", "Contract", "Expand"],
    edges: ["Follow", "Invert", "Follow"]
  },
  {
    vertical: ["Contract", "Expand", "Peak"],
    edges: ["Invert", "Follow", "Follow"]
  },
  {
    vertical: ["Expand", "Expand", "Contract"],
    edges: ["Follow", "Follow", "Invert"]
  },
  {
    vertical: ["Expand", "Neutral", "Peak"],
    edges: ["Expand", "Contract", "Follow"]
  }
];

function applyRulePreset(rulePreset) {
  [params.verticalRule1, params.verticalRule2, params.verticalRule3] = rulePreset.vertical;
  [params.edgeRuleA, params.edgeRuleB, params.edgeRuleC] = rulePreset.edges;
  syncRuleLabFromParams();
}

function randomizeGeneratedForm() {
  params.activePreset = "Custom";
  params.seedMode = "double";
  params.watertightMode = true;
  params.definitionOnSurface = false;
  params.facadeMode = true;
  params.verticalBranching = false;
  params.showDirections = false;
  params.showStateColors = false;
  params.showWireframe = true;

  params.Recursion = 1;
  params.Recursion_2 = randomInt(3, 5);
  params.mass_h = randomBetween(70, 175);
  params.mass_d = randomBetween(18, 68);
  params.mass_w = randomBetween(18, 68);

  params.definitionSmooth = 0;
  const primarySplit = randomBetween(0.48, 0.62);
  const primaryRotation = randomBetween(0.18, 0.42);
  params.Pos_A = primarySplit;
  params.Pos_B = primarySplit;
  params.Pos_C = primarySplit;
  params.Rot_A = primaryRotation;
  params.Rot_B = primaryRotation;
  params.Rot_C = primaryRotation;
  params.Amp_A = -randomBetween(0.035, 0.14);
  params.Amp_B = randomBetween(0.1, 0.27);
  params.Amp_C = randomBetween(0.12, 0.3);
  params.Top_1 = randomBetween(0.49, 0.57);
  params.Top_2 = -randomBetween(0.1, 0.24);
  params.Top_3 = randomBetween(0.78, 0.98);
  params.facadeThickness = randomBetween(1.4, 5.5);
  params.mirrorBranching = true;

  refreshGuiDisplay();
  rebuildNow();
  setPanelTab("model");
}

function exportCurrentSTL() {
  if (!currentMesh) return;
  const exporter = new STLExporter();
  currentMesh.updateMatrixWorld(true);
  const data = exporter.parse(currentMesh, { binary: true });
  const blob = new Blob([data], { type: "model/stl" });
  const a = document.createElement("a");
  const rand = (Math.random() * 1000).toFixed(5);
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `Cathedral_${rand}.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildGui() {
  const gui = new GUI({ title: "Cathedral Controls", width: 354 });
  guiRef = gui;
  gui.domElement.style.left = "18px";
  gui.domElement.style.right = "auto";
  gui.domElement.style.top = "70px";
  const markCustomAndRebuild = () => {
    params.activePreset = "Custom";
    refreshGuiDisplay();
    queueRebuild();
  };

  const fSimple = gui.addFolder("Simple Generator");
  const simpleButtons = {
    Build_Target_Study: () => applyTargetStudy(params.studyTarget),
    Randomize_Form: randomizeGeneratedForm,
    Play_Sequence: animateRecursionSequence
  };
  fSimple
    .add(params, "studyTarget", {
      "Target 1": "Target_1.stl",
      "Target 2": "Target_2.stl",
      "Target 3": "Target_3.stl",
      "Target 4": "Target_4.stl",
      "Target 5": "Target_5.stl",
      "Target 6": "Target_6.stl"
    })
    .name("Sample Target");
  fSimple.add(simpleButtons, "Build_Target_Study").name("Build Target Study");
  fSimple.add(simpleButtons, "Randomize_Form").name("Randomize Symmetric Form");
  fSimple.add(simpleButtons, "Play_Sequence").name("Play Stage Sequence");
  fSimple.add(params, "Recursion_2", 2, 6, 1).name("Recursive Fold Depth").onChange(markCustomAndRebuild);
  fSimple.add(params, "facadeThickness", 0.5, 10, 0.1).name("Façade Thickness").onChange(markCustomAndRebuild);
  fSimple.add(params, "Amp_A", -0.35, 0, 0.005).name("Primary Contraction").onChange(markCustomAndRebuild);
  fSimple.add(params, "Amp_B", 0, 0.5, 0.005).name("Inner Expansion").onChange(markCustomAndRebuild);
  fSimple.add(params, "Amp_C", 0, 0.5, 0.005).name("Side Expansion").onChange(markCustomAndRebuild);
  fSimple.add(params, "Top_2", -0.35, 0.05, 0.005).name("Recursive Relief").onChange(markCustomAndRebuild);
  fSimple.add(params, "mass_h", 30, 190, 0.5).name("Height").onChange(markCustomAndRebuild);
  fSimple.add(params, "mass_d", 10, 90, 0.5).name("Width").onChange(markCustomAndRebuild);
  fSimple.add(params, "mass_w", 8, 70, 0.5).name("Façade Setback").onChange(markCustomAndRebuild);
  fSimple
    .add(params, "showAdvancedControls")
    .name("Advanced Controls")
    .onChange(() => {
      updateAdvancedGuiState();
    });

  const fPresets = gui.addFolder("STL Presets");
  const presetNames = STL_PRESETS.map((p) => p.name);
  fPresets
    .add(params, "activePreset", ["Custom", ...presetNames])
    .name("Active")
    .onChange((value) => {
      if (value !== "Custom") {
        applyPresetByName(value);
      } else {
        queueRebuild();
      }
    });

  const presetButtons = {};
  presetButtons.Use_Custom_Generator = () => {
    params.activePreset = "Custom";
    refreshGuiDisplay();
    queueRebuild();
  };
  fPresets.add(presetButtons, "Use_Custom_Generator").name("Use Custom Generator");
  presetButtons.Randomize_Form = randomizeGeneratedForm;
  fPresets.add(presetButtons, "Randomize_Form").name("Randomize Form");

  for (const preset of STL_PRESETS) {
    const key = `Load_${preset.name.replace(/\W/g, "_")}`;
    presetButtons[key] = () => applyPresetByName(preset.name);
    fPresets
      .add(presetButtons, key)
      .name(`Load ${preset.name.replace(".stl", "")} (${preset.source.triangles.toLocaleString()} tris)`);
  }

  const fDepth = gui.addFolder("Generation Depth");
  const depthButtons = {};
  for (const profile of DEPTH_PROFILES) {
    const key = `Depth_${profile.recursion}_${profile.recursion2}`;
    const triangleCount = 2 * 4 ** (profile.recursion + profile.recursion2);
    depthButtons[key] = () => {
      params.activePreset = "Custom";
      params.Recursion = profile.recursion;
      params.Recursion_2 = profile.recursion2;
      refreshGuiDisplay();
      queueRebuild();
    };
    fDepth
      .add(depthButtons, key)
      .name(`${profile.label} (${triangleCount.toLocaleString()} tris)`);
  }

  const fTargetDebug = gui.addFolder("Target Debug");
  fTargetDebug
    .add(params, "targetOverlay")
    .name("Show Target Overlay")
    .onChange(() => {
      updateTargetOverlay();
      updateStats();
    });
  fTargetDebug
    .add(params, "targetOverlayPreset", STL_PRESETS.map((p) => p.name))
    .name("Overlay Target")
    .onChange(() => {
      updateTargetOverlay();
      updateStats();
    });
  fTargetDebug
    .add(
      {
        Animate_Recursion: animateRecursionSequence
      },
      "Animate_Recursion"
    )
    .name("Animate Recursion");
  fTargetDebug
    .add(
      {
        Stop_Animation: () => {
          stopRecursionAnimation();
          updateStats();
        }
      },
      "Stop_Animation"
    )
    .name("Stop Animation");

  const fExpand = gui.addFolder("Expand");
  fExpand.add(params, "Pos_A", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fExpand.add(params, "Amp_A", -1, 1, 0.01).onChange(markCustomAndRebuild);
  branchRotationControllers.push(
    fExpand.add(params, "Rot_A", 0, 1, 0.01).onChange(markCustomAndRebuild)
  );
  fExpand.add(params, "Pos_B", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fExpand.add(params, "Amp_B", -1, 1, 0.01).onChange(markCustomAndRebuild);
  branchRotationControllers.push(
    fExpand.add(params, "Rot_B", 0, 1, 0.01).onChange(markCustomAndRebuild)
  );
  fExpand.add(params, "Pos_C", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fExpand.add(params, "Amp_C", -1, 1, 0.01).onChange(markCustomAndRebuild);
  branchRotationControllers.push(
    fExpand.add(params, "Rot_C", 0, 1, 0.01).onChange(markCustomAndRebuild)
  );

  const fBase = gui.addFolder("Base");
  fBase.add(params, "Recursion", 0, 10, 1).name("Branching Steps").onChange(markCustomAndRebuild);
  fBase.add(params, "Normal_len", 0, 50, 0.1).onChange(queueRebuild);
  fBase.add(params, "mass_h", 0, 200, 0.1).onChange(markCustomAndRebuild);
  fBase.add(params, "mass_d", 0, 150, 0.1).onChange(markCustomAndRebuild);
  fBase.add(params, "mass_w", 0, 150, 0.1).onChange(markCustomAndRebuild);

  const fContract = gui.addFolder("Contract");
  fContract.add(params, "Con_Pos_A", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Amp_A", -1, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Rot_A", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Pos_B", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Amp_B", -1, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Rot_B", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Pos_C", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Amp_C", -1, 1, 0.01).onChange(markCustomAndRebuild);
  fContract.add(params, "Con_Rot_C", 0, 1, 0.01).onChange(markCustomAndRebuild);

  const fTop = gui.addFolder("Top");
  fTop.add(params, "Recursion_2", 0, 10, 1).name("Definition Steps").onChange(markCustomAndRebuild);
  fTop.add(params, "Top_1", 0, 1, 0.01).onChange(markCustomAndRebuild);
  fTop
    .add(params, "definitionOnSurface")
    .name("Surface Definition")
    .onChange(() => {
      updateDefinitionGuiState();
      markCustomAndRebuild();
    });
  fTop
    .add(params, "definitionSmooth", 0, 0.5, 0.01)
    .name("Definition Smooth")
    .onChange(markCustomAndRebuild);
  definitionSurfaceControllers.push(
    fTop
      .add(params, "definitionPerturb", -0.12, 0.12, 0.005)
      .name("Surface Perturb")
      .onChange(markCustomAndRebuild)
  );
  definitionDisplacementControllers.push(
    fTop.add(params, "Top_2", -1, 1, 0.01).name("Definition Amp").onChange(markCustomAndRebuild)
  );
  definitionDisplacementControllers.push(
    fTop.add(params, "Top_3", 0, 1, 0.01).name("Definition Rot").onChange(markCustomAndRebuild)
  );

  const fDebug = gui.addFolder("Mode / Debug");
  fDebug.add(params, "div_threshold", 0, 100, 0.1).onChange(markCustomAndRebuild);
  fDebug
    .add(params, "seedMode", ["single", "double", "quadruple"])
    .name("seedMode")
    .onChange(markCustomAndRebuild);
  fDebug.add(params, "quadSymmetry").name("quadSymmetry").onChange(markCustomAndRebuild);
  fDebug.add(params, "watertightMode").name("watertightMode").onChange(markCustomAndRebuild);
  fDebug
    .add(params, "verticalBranching")
    .name("verticalBranching")
    .onChange(() => {
      updateVerticalBranchingGuiState();
      markCustomAndRebuild();
    });
  fDebug.add(params, "selectiveMode").onChange(markCustomAndRebuild);
  fDebug.add(params, "showWireframe").name("showWireframe").onChange(queueRebuild);
  fDebug.add(params, "showStateColors").name("showStateColors").onChange(queueRebuild);
  fDebug.add(params, "showDirections").onChange(queueRebuild);
  fDebug.add(params, "showPolarity").onChange(queueRebuild);

  advancedGuiFolders = [fPresets, fDepth, fTargetDebug, fExpand, fBase, fContract, fTop, fDebug];

  gui
    .add(
      {
        Export_STL: exportCurrentSTL
      },
      "Export_STL"
    )
    .name("Export STL");

  gui
    .add(
      {
        Reset_View: () => {
          camera.position.set(150, 130, 180);
          controls.target.set(0, 55, -20);
          controls.update();
        }
      },
      "Reset_View"
    )
    .name("Reset View");

  gui.domElement.addEventListener("pointerenter", () => {
    controls.enabled = false;
  });
  gui.domElement.addEventListener("pointerleave", () => {
    controls.enabled = true;
  });

  updateVerticalBranchingGuiState();
  updateDefinitionGuiState();
  updateAdvancedGuiState();
}

window.addEventListener("keydown", (ev) => {
  if (ev.key.toLowerCase() === "s") {
    ev.preventDefault();
    exportCurrentSTL();
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);

  const axisSize = Math.min(128, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.22));
  const axisInset = 14;
  axisCamera.position
    .copy(camera.position)
    .sub(controls.target)
    .normalize()
    .multiplyScalar(4);
  axisCamera.lookAt(axisScene.position);

  renderer.clearDepth();
  renderer.setScissorTest(true);
  renderer.setScissor(axisInset, axisInset, axisSize, axisSize);
  renderer.setViewport(axisInset, axisInset, axisSize, axisSize);
  renderer.render(axisScene, axisCamera);
  renderer.setScissorTest(false);
}

initializeRuleLab();
buildGui();
setPanelTab("model");
if (urlParams.get("animate") === "1") {
  animateRecursionSequence();
} else {
  rebuildGeometry();
}
animate();
