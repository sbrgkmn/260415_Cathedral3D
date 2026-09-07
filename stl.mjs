// Read source STL coordinates without fitting or procedural reconstruction.
export function decodeBinarySTL(buffer, name = 'Reference STL') {
  if (buffer.byteLength < 84) throw new Error('Incomplete binary STL header');
  const data = new DataView(buffer), count = data.getUint32(80, true);
  if (buffer.byteLength !== 84 + count * 50) throw new Error('Unexpected binary STL length');
  const vertices = [], faces = [], map = new Map();
  for (let face = 0; face < count; face++) {
    const indices = [];
    for (let corner = 0; corner < 3; corner++) {
      const offset = 84 + face * 50 + 12 + corner * 12;
      const point = [0,4,8].map(k => data.getFloat32(offset + k, true));
      if (!point.every(Number.isFinite)) throw new Error('Non-finite STL vertex');
      const key = point.join(',');
      if (!map.has(key)) map.set(key, vertices.push(point) - 1);
      indices.push(map.get(key));
    }
    faces.push(indices);
  }
  return { name, vertices, faces, motions: [], phase: 'reference', kind: 'reference' };
}
