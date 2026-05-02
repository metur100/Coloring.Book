/**
 * Flood fill using iterative BFS.
 * fillColor must be [r, g, b, a] array.
 */
export function floodFill(imageData, startX, startY, fillColor, tolerance = 30) {
  const { data, width, height } = imageData
  const toIndex = (x, y) => (y * width + x) * 4

  const targetIdx = toIndex(startX, startY)
  const targetR = data[targetIdx]
  const targetG = data[targetIdx + 1]
  const targetB = data[targetIdx + 2]
  const targetA = data[targetIdx + 3]

  const [fillR, fillG, fillB, fillA] = fillColor

  if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA)
    return imageData

  const matchesTarget = (idx) =>
    Math.abs(data[idx]     - targetR) <= tolerance &&
    Math.abs(data[idx + 1] - targetG) <= tolerance &&
    Math.abs(data[idx + 2] - targetB) <= tolerance &&
    Math.abs(data[idx + 3] - targetA) <= tolerance

  const visited = new Uint8Array(width * height)
  const stack = [[startX, startY]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    const vi = y * width + x
    if (visited[vi]) continue
    const idx = toIndex(x, y)
    if (!matchesTarget(idx)) continue
    visited[vi] = 1
    data[idx]     = fillR
    data[idx + 1] = fillG
    data[idx + 2] = fillB
    data[idx + 3] = fillA
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  return imageData
}

/** Convert hex string to [r, g, b, 255] */
export function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0, 255]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255]
}