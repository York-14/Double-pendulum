// chaosIndex(0..1) を 淡いブルー⇔淡いピンク のHSLグラデーションへ写像する
// t=0（秩序的）→ ブルー寄り、t=1（カオス的）→ ピンク寄り

// 加算合成(Additive blending)で重なると白飛びしやすいため、
// 2D版よりも彩度を上げ明度を落とした値にしている
const BLUE = { h: 199, s: 75, l: 55 };
const PINK = { h: 332, s: 80, l: 62 };

function lerpHsl(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const h = BLUE.h + (PINK.h - BLUE.h) * clamped;
  const s = BLUE.s + (PINK.s - BLUE.s) * clamped;
  const l = BLUE.l + (PINK.l - BLUE.l) * clamped;
  return { h, s, l };
}

export function interpolatePinkBlue(t) {
  const { h, s, l } = lerpHsl(t);
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

// Three.jsの頂点カラー用にRGB(0..1)を返す
export function pinkBlueRGB(t) {
  const { h, s, l } = lerpHsl(t);
  return hslToRgb(h / 360, s / 100, l / 100);
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    hue2rgb(p, q, h + 1 / 3),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1 / 3),
  ];
}
