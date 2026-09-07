// A small, explicit E/C grammar. Coordinates are Z-up; X=0 is the mirror plane.
// Build one half, share edge vertices, then mirror its topology at each snapshot.
export const DEFAULTS = Object.freeze({
  width: 70, height: 125, depth: 35,
  planCycles: 2, planExpansion: 0.5, planContraction: 0.24,
  contraction: 0.32, expansion: 0.45, uprightness: 0.8, decay: 0.58,
  generations: 1, detail: 1, relief: 0.04,
});

const mix = (a, b, t = 0.5) => a.map((n, i) => n + (b[i] - n) * t);
const key = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
const planarLength = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const onFloor = p => Math.abs(p[2]) < 1e-9;
const onSeam = p => Math.abs(p[0]) < 1e-9;

export function normalizeOptions(input = {}) {
  const p = { ...DEFAULTS };
  const limits = {
    width: [40, 240], height: [60, 220], depth: [15, 120],
    planCycles: [1, 3], planExpansion: [0, 0.8], planContraction: [0, 0.8],
    contraction: [0, 0.85], expansion: [0, 0.9], decay: [0.25, 0.85],
    uprightness: [0.5, 0.9],
    generations: [1, 3], detail: [0, 3], relief: [0, 0.15],
  };
  for (const [name, [low, high]] of Object.entries(limits)) {
    const value = Number(input[name] ?? p[name]);
    if (Number.isFinite(value)) p[name] = Math.min(high, Math.max(low, value));
  }
  p.generations = Math.round(p.generations);
  p.planCycles = Math.round(p.planCycles);
  p.detail = Math.round(p.detail);
  // One additional 1:4 plan-cell pass precedes vertical growth. Cap at 32,768.
  p.generations = Math.min(p.generations, Math.floor((6 - p.planCycles) / 2));
  p.detail = Math.min(p.detail, 6 - p.planCycles - 2 * p.generations);
  return p;
}

function edgeMap(mesh) {
  const edges = new Map();
  mesh.faces.forEach(([a, b, c]) => {
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const id = key(u, v);
      if (!edges.has(id)) edges.set(id, { a: Math.min(u, v), b: Math.max(u, v), count: 0 });
      edges.get(id).count++;
    }
  });
  return edges;
}

function developPlan(mesh, operation, p) {
  // Refine the fan's OUTER contour, not its heights. Each sector gets a new
  // boundary point and a radial division. Repeating E/C forms nested lobes.
  // Radial movement preserves angular order, keeping the footprint star-shaped.
  const vertices = mesh.vertices.map(v => [...v]);
  const faces = [], motions = [];
  for (const [apex, left, right] of mesh.faces) {
    const from = mix(vertices[left], vertices[right]);
    const origin = [vertices[apex][0], vertices[apex][1], 0];
    const radius = planarLength(from, origin);
    const amount = planarLength(vertices[left], vertices[right])
      * (operation === 'expand' ? p.planExpansion : -p.planContraction);
    const factor = radius > 1e-9 ? Math.max(0.12, 1 + amount / radius) : 1;
    const to = [origin[0] + (from[0] - origin[0]) * factor, origin[1] + (from[1] - origin[1]) * factor, 0];
    const mid = vertices.push(to) - 1;
    if (Math.abs(factor - 1) > 1e-9) motions.push({ from, to, operation });
    faces.push([apex, left, mid], [apex, mid, right]);
  }
  return { vertices, faces, motions };
}

function subdivide(mesh, operation, p, generation = 0) {
  const vertices = mesh.vertices.map(v => [...v]);
  const mids = new Map(), motions = [];
  for (const [id, edge] of edgeMap(mesh)) {
    const a = vertices[edge.a], b = vertices[edge.b];
    const floor = onFloor(a) && onFloor(b);
    const seam = onSeam(a) && onSeam(b);
    // Bias expansion splits toward the lower endpoint. The target STLs place
    // their main upper branch points close to the outer plan, making steep walls.
    // This picks a point ON the old edge; the subsequent movement is Z-only.
    let t = 0.5;
    if (operation === 'expand' && Math.abs(a[2]-b[2]) > 1e-9) {
      t = a[2] > b[2] ? p.uprightness : 1-p.uprightness;
    }
    const from = mix(a, b, t), to = [...from];
    const span = planarLength(a, b);
    if (!floor && (!seam || operation === 'expand' || operation === 'contract')) {
      if (operation === 'expand') {
        // Vertical polarity, scaled by the local edge's plan span.
        // Shorter descendant edges create subordinate peaks, not uniform spikes.
        to[2] += span * (p.height / (p.width / 2)) * p.expansion * p.decay ** generation;
      } else if (operation === 'contract') {
        // Move a NEW midpoint toward the ground. Existing apices stay fixed.
        to[2] *= 1 - p.contraction * p.decay ** generation;
      } else if (operation === 'detail' && edge.count === 2) {
        // Finishing E/C folds only affect interior edges, preserving the outline.
        const sign = generation % 2 === 0 ? 1 : -1;
        to[2] += sign * Math.min(from[2] * 0.2, span * p.relief);
      }
    }
    const mid = vertices.push(to) - 1;
    mids.set(id, mid);
    if (Math.hypot(...to.map((n, i) => n - from[i])) > 1e-8) {
      motions.push({ from, to, operation });
    }
  }
  const faces = [];
  for (const [a, b, c] of mesh.faces) {
    const ab = mids.get(key(a, b)), bc = mids.get(key(b, c)), ca = mids.get(key(c, a));
    // Three corner faces and one bridge face. All neighbors reuse edge points.
    faces.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
  }
  return { vertices, faces, motions };
}

function mirror(mesh, info) {
  const vertices = mesh.vertices.map(v => [...v]);
  const reflected = mesh.vertices.map((p, i) => onSeam(p) ? i : vertices.push([-p[0], p[1], p[2]]) - 1);
  const faces = mesh.faces.map(f => [...f]);
  mesh.faces.forEach(([a, b, c]) => faces.push([reflected[c], reflected[b], reflected[a]]));
  const motions = mesh.motions.flatMap(m => {
    const copy = { ...m, from: [...m.from], to: [...m.to] };
    if (onSeam(m.to)) return [copy];
    return [copy, { ...m, from: [-m.from[0], m.from[1], m.from[2]], to: [-m.to[0], m.to[1], m.to[2]] }];
  });
  return { ...info, vertices, faces, motions };
}

export function buildStudy(input = {}) {
  const options = normalizeOptions(input);
  const p = options;
  let mesh = {
    vertices: [[0, 0, p.height], [p.width / 2, 0, 0], [0, p.depth, 0]],
    faces: [[0, 1, 2]], motions: [],
  };
  const frames = [];
  const capture = (phase, kind, title, description, rule) => frames.push(mirror(mesh, {
    index: frames.length, phase, kind, title, description, rule,
  }));
  capture('seed', 'seed', 'Two-face seed', 'Two triangular faces share one ridge. Establish a branching footprint before adding any new heights.', 'One apex · two faces · bilateral symmetry');
  for (let cycle = 0; cycle < p.planCycles; cycle++) {
    mesh = developPlan(mesh, 'expand', p);
    capture('plan', 'expand', `Expand plan ${cycle + 1}`,
      'Split every ground contour segment and push its midpoint outward. New lobes establish additional radial branches; the original apex stays fixed.',
      'PLAN · XY movement only · no new heights');
    mesh = developPlan(mesh, 'contract', p);
    capture('plan', 'contract', `Contract plan ${cycle + 1}`,
      'Recess new contour midpoints toward the projected apex. Valleys separate the plan lobes while the radial sectors remain connected.',
      'PLAN · separate the branches before they rise');
  }
  mesh = subdivide(mesh, 'plan-grid', p);
  capture('plan', 'divide', 'Divide plan cells',
    'Split the radial sectors into smaller connected cells without deforming the surface. Their cross-connections establish local edges for the coming vertical branches.',
    'PLAN · local cells established · no vertical displacement');
  for (let generation = 0; generation < p.generations; generation++) {
    mesh = subdivide(mesh, 'expand', p, generation);
    capture('vertical', 'expand', `Raise branches ${generation + 1}`,
      'The branching footprint is now fixed. Lift new edge points above its radial sectors so apices develop throughout the plan, connected by bridge triangles.',
      'VERTICAL · Z movement only · footprint locked');
    mesh = subdivide(mesh, 'contract', p, generation);
    capture('vertical', 'contract', `Carve valleys ${generation + 1}`,
      'Lower new edge midpoints toward the ground. Earlier peaks remain in place while valleys separate their branches.',
      'VERTICAL · earlier peaks stay fixed · footprint locked');
  }
  for (let level = 0; level < p.detail; level++) {
    mesh = subdivide(mesh, 'detail', p, level);
    capture('surface', 'detail', `Surface subdivision ${level + 1}`,
      'Subdivide each face into four smaller triangles. Subtle alternating E/C relief articulates the interior; the silhouette stays fixed.',
      '1 face → 4 facets · outline preserved');
  }
  return { options, frames };
}

export function analyzeMesh(mesh) {
  const edges = edgeMap(mesh);
  let degenerate = 0, reversedPlan = 0;
  for (const [a, b, c] of mesh.faces) {
    const A = mesh.vertices[a], B = mesh.vertices[b], C = mesh.vertices[c];
    const u = B.map((n, i) => n - A[i]), v = C.map((n, i) => n - A[i]);
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...cross) < 1e-8) degenerate++;
    if (cross[2] <= 0) reversedPlan++;
  }
  const positionKey = p => p.map(n => Math.round(n * 1e7)).join(',');
  const points = new Set(mesh.vertices.map(positionKey));
  return {
    triangles: mesh.faces.length,
    vertices: mesh.vertices.length,
    boundaryEdges: [...edges.values()].filter(e => e.count === 1).length,
    nonManifoldEdges: [...edges.values()].filter(e => e.count > 2).length,
    degenerate, reversedPlan,
    symmetric: mesh.vertices.every(([x, y, z]) => points.has(positionKey([-x, y, z]))),
    euler: mesh.vertices.length - edges.size + mesh.faces.length,
  };
}

// Export the source coordinates directly so camera/view transforms never enter STL.
export function encodeBinarySTL(frame) {
  const buffer = new ArrayBuffer(84 + frame.faces.length * 50);
  const data = new DataView(buffer);
  const header = new TextEncoder().encode(`Cathedral polarity study | stage ${frame.index} | open surface`);
  new Uint8Array(buffer, 0, Math.min(header.length, 80)).set(header.slice(0, 80));
  data.setUint32(80, frame.faces.length, true);
  let offset = 84;
  for (const face of frame.faces) {
    const [a, b, c] = face.map(id => frame.vertices[id]);
    const u = b.map((n, i) => n - a[i]), v = c.map((n, i) => n - a[i]);
    const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...normal);
    for (const vector of [normal.map(n => n / length), a, b, c]) {
      for (const value of vector) { data.setFloat32(offset, value, true); offset += 4; }
    }
    data.setUint16(offset, 0, true); offset += 2;
  }
  return buffer;
}
