// chaosIndex(0..1) を 淡いブルー⇔淡いピンク のHSLグラデーションへ写像する
// t=0（秩序的）→ ブルー寄り、t=1（カオス的）→ ピンク寄り

const BLUE = { h: 199, s: 54, l: 78 }; // #A9D6E5 相当
const PINK = { h: 332, s: 68, l: 85 }; // #F7B8D0 相当

export function interpolatePinkBlue(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const h = BLUE.h + (PINK.h - BLUE.h) * clamped;
  const s = BLUE.s + (PINK.s - BLUE.s) * clamped;
  const l = BLUE.l + (PINK.l - BLUE.l) * clamped;
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}
