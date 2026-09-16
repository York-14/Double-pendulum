// seedから決定論的に初期条件・対称パラメータを導出する
// 同じseedなら同じ構造が再現され、異なるseedならカオスの初期値鋭敏性により
// 別構造になる（＝「唯一無二」の数式的根拠）

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// N回対称（6〜12）とミラー有無をseedから決定する
export function deriveSymmetry(seed) {
  const rng = mulberry32(seed);
  const N = 6 + Math.floor(rng() * 7); // 6..12
  const mirror = rng() < 0.5;
  return { N, mirror };
}

// 振り子の初期角度にseed由来の微小な非対称を与える
export function deriveInitialAngles(seed) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const theta1 = Math.PI / 2 + (rng() - 0.5) * 0.02;
  const theta2 = Math.PI / 2 + (rng() - 0.5) * 0.02;
  return { theta1, theta2 };
}
