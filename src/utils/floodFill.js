export function floodFill(imageData, startX, startY, fillColor, tolerance = 32) {
  const { data, width, height } = imageData
  const toIdx = (x, y) => (y * width + x) * 4
  const si = toIdx(startX, startY)
  const tR = data[si], tG = data[si+1], tB = data[si+2], tA = data[si+3]
  const [fR, fG, fB, fA] = fillColor
  if (tR===fR && tG===fG && tB===fB && tA===fA) return imageData
  const match = i =>
    Math.abs(data[i]-tR)<=tolerance && Math.abs(data[i+1]-tG)<=tolerance &&
    Math.abs(data[i+2]-tB)<=tolerance && Math.abs(data[i+3]-tA)<=tolerance
  const visited = new Uint8Array(width * height)
  const stack = [[startX, startY]]
  while (stack.length) {
    const [x, y] = stack.pop()
    if (x<0||x>=width||y<0||y>=height) continue
    const vi = y*width+x
    if (visited[vi]) continue
    const i = toIdx(x,y)
    if (!match(i)) continue
    visited[vi]=1
    data[i]=fR; data[i+1]=fG; data[i+2]=fB; data[i+3]=fA
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])
  }
  return imageData
}

export function hexToRgba(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return [0,0,0,255]
  return [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16), 255]
}