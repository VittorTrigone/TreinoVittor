/* =============================================================
   Personagens animados (SVG desenhado em tempo real)
   - funcionam offline, sem imagens externas
   - músculos trabalhados em vermelho
   Cada animação = lista de poses (keyframes). O motor interpola.
   ============================================================= */
const ANIM = (() => {
  "use strict";

  // ---------- proporções do boneco ----------
  const L = { torso: 48, neck: 8, head: 10.5, ua: 27, fa: 25, th: 38, sh: 37, ft: 11 };
  const W = { ua: 9.5, fa: 8, th: 14, sh: 10.5, ft: 6.5, neck: 7.5, torso: 23 };
  const C = {
    skin: "#f1f1f5", skinB: "#cfd0db", line: "#76778a",
    shorts: "#3b3d4c", shortsB: "#2b2c38", shortsLine: "#1c1d26",
    hair: "#353644", mus: "#e0503a", musHi: "#f59479",
    prop: "#d7d8e2", propLine: "#9c9daf", propDark: "#b3b4c3", bag: "#5263b0", bagD: "#3d4c8f",
  };
  const GROUND = 176;

  // ---------- matemática ----------
  const rad = (a) => (a * Math.PI) / 180;
  const D = (a) => [Math.sin(rad(a)), Math.cos(rad(a))]; // 0 = baixo, 90 = frente (direita), 180 = cima
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const lerp2 = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const f1 = (n) => n.toFixed(1);

  function ik(root, to, a, b, s) {
    const dx = to[0] - root[0], dy = to[1] - root[1];
    const d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.01, Math.hypot(dx, dy)));
    const th = Math.atan2(dy, dx);
    const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    return [[root[0] + a * Math.cos(th + s * al), root[1] + a * Math.sin(th + s * al)], [root[0] + d * Math.cos(th), root[1] + d * Math.sin(th)]];
  }
  function limb(root, spec, a, b, bend) {
    if (Array.isArray(spec)) { const m = add(root, D(spec[0]), a); return [m, add(m, D(spec[1]), b), spec[2]]; }
    const r = ik(root, spec.to, a, b, spec.b ?? bend);
    return [r[0], r[1], spec.f];
  }

  // ---------- resolve juntas ----------
  function solve(p, front) {
    const t = p.t ?? 180, dt = D(t), hip = p.hip;
    const nb = add(hip, dt, L.torso);
    const pp = [-dt[1], dt[0]]; // perpendicular (lado direito da tela quando em pé)
    let sF = nb, sB = add(nb, [-1.5, -1]), hF = hip, hB = add(hip, [-1.5, -1]);
    if (front) { sF = add(nb, pp, 12.5); sB = add(nb, pp, -12.5); hF = add(hip, pp, 7.5); hB = add(hip, pp, -7.5); }
    const ht = t + (p.h || 0);
    const head = add(nb, D(ht), L.neck + L.head);
    const aF = limb(sF, p.aF ?? [3, 0], L.ua, L.fa, 1);
    const aB = limb(sB, p.aB ?? [-3, 0], L.ua, L.fa, 1);
    const lF = limb(hF, p.lF ?? [0, 0, 90], L.th, L.sh, -1);
    const lB = limb(hB, p.lB ?? [0, 0, 90], L.th, L.sh, -1);
    const ftl = front ? L.ft * 0.75 : L.ft;
    const tF = add(lF[1], D(lF[2] ?? 90), ftl);
    const tB = add(lB[1], D(lB[2] ?? (front ? -90 : 90)), ftl);
    return { t, dt, pp, hip, nb, sF, sB, hF, hB, head, ht, aF, aB, lF, lB, tF, tB, c: p.c || 0 };
  }

  // ---------- primitivas SVG ----------
  const ln = (p, q, w, col, op) => `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"${op ? ` opacity="${op}"` : ""}/>`;
  const qd = (p, c, q, w, col) => `<path d="M${f1(p[0])} ${f1(p[1])}Q${f1(c[0])} ${f1(c[1])} ${f1(q[0])} ${f1(q[1])}" fill="none" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"/>`;
  const ci = (c, r, col, op) => `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="${col}"${op ? ` opacity="${op}"` : ""}/>`;

  // camada com contorno: primeiro todos os contornos, depois os preenchimentos
  function layer(shapes, fill, ol = C.line) {
    let o = "", f = "";
    for (const s of shapes) {
      if (s.r) { o += ci(s.c, s.r + 1.6, ol); f += ci(s.c, s.r, s.col || fill); }
      else if (s.ctl) { o += qd(s.p, s.ctl, s.e, s.w + 3.2, ol); f += qd(s.p, s.ctl, s.e, s.w, s.col || fill); }
      else { o += ln(s.p, s.e, s.w + 3.2, ol); f += ln(s.p, s.e, s.w, s.col || fill); }
    }
    return o + f;
  }
  // faixa de músculo ao longo de um segmento, deslocada pro lado (off>0 = "frente" do membro)
  function band(p, q, a, b, off, w, op = 0.92) {
    const d = norm(sub(q, p)), n = [d[1], -d[0]];
    const A = add(lerp2(p, q, a), n, off), B = add(lerp2(p, q, b), n, off);
    return ln(A, B, w, C.mus, op) + ln(lerp2(A, B, 0.15), lerp2(A, B, 0.6), w * 0.32, C.musHi, op * 0.75);
  }
  const blob = (c, r, op = 0.92) => ci(c, r, C.mus, op) + ci(add(c, [-r * 0.3, -r * 0.3]), r * 0.38, C.musHi, op * 0.6);

  const armShapes = (root, l) => [{ p: root, e: l[0], w: W.ua }, { p: l[0], e: l[1], w: W.fa }, { c: l[1], r: 4.6 }];
  const legShapes = (root, l, toe) => [{ p: root, e: l[0], w: W.th }, { p: l[0], e: l[1], w: W.sh }, { p: l[1], e: toe, w: W.ft }];

  function limbMus(M, root, l, isArm, front, op) {
    let s = "";
    const o = front ? 0 : 1;
    if (isArm) {
      if (M.has("bi")) s += band(root, l[0], 0.22, 0.8, 2.6 * o, front ? 6 : 5.2, op);
      if (M.has("tri")) s += band(root, l[0], 0.22, 0.8, -2.6 * o, front ? 6 : 5.2, op);
    } else {
      if (M.has("quad")) s += band(root, l[0], 0.45, 0.92, 3.6 * o, front ? 9.5 : 7, op);
      if (M.has("ham")) s += band(root, l[0], 0.45, 0.92, -3.6 * o, 7, op);
      if (M.has("calf")) s += band(l[0], l[1], 0.1, 0.55, -2.6 * o, front ? 7 : 6.2, op);
    }
    return s;
  }

  function hair(J, front) {
    const r = L.head, u = D(J.ht), fw = D(J.ht - 90);
    const pu = Math.atan2(u[1], u[0]);
    const a1 = front ? pu + rad(78) : pu + rad(28), a2 = front ? pu - rad(78) : pu - rad(115);
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = a1 + (a2 - a1) * (i / 10); pts.push([J.head[0] + (r + 0.8) * Math.cos(a), J.head[1] + (r + 0.8) * Math.sin(a)]); }
    const inner = front ? add(J.head, u, r * 0.45) : add(add(J.head, fw, -r * 0.25), u, r * 0.3);
    pts.push(inner);
    let s = `<path d="M${pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L")}Z" fill="${C.hair}"/>`;
    if (!front) s += ci(add(add(J.head, fw, r * 0.98), u, -1.5), 2.3, C.skin); // nariz
    return s;
  }

  // ---------- props ----------
  function prop(pr, J) {
    const st = `fill="${C.prop}" stroke="${C.propLine}" stroke-width="1.6"`;
    switch (pr.k) {
      case "box": return `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${GROUND - pr.y}" rx="5" ${st}/>`;
      case "sofa": return `<rect x="${pr.bx}" y="${pr.by}" width="14" height="${GROUND - pr.by}" rx="6" fill="${C.propDark}" stroke="${C.propLine}" stroke-width="1.6"/>
        <rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${GROUND - pr.y}" rx="7" ${st}/>
        <line x1="${pr.x + 4}" y1="${pr.y + 9}" x2="${pr.x + pr.w - 4}" y2="${pr.y + 9}" stroke="${C.propLine}" stroke-width="1.2" opacity=".6"/>`;
      case "chair": {
        const bx = pr.backLeft ? pr.x : pr.x + pr.w - 6;
        return `<rect x="${bx}" y="${pr.y - 48}" width="6" height="48" rx="3" fill="${C.propDark}" stroke="${C.propLine}" stroke-width="1.4"/>
          <rect x="${pr.x + 2}" y="${pr.y}" width="5" height="${GROUND - pr.y}" fill="${C.propDark}"/><rect x="${pr.x + pr.w - 7}" y="${pr.y}" width="5" height="${GROUND - pr.y}" fill="${C.propDark}"/>
          <rect x="${pr.x}" y="${pr.y - 2}" width="${pr.w}" height="7" rx="3" ${st}/>`;
      }
      case "table": return `<rect x="${pr.x + 6}" y="${pr.y}" width="5" height="${GROUND - pr.y}" fill="${C.propDark}"/><rect x="${pr.x + pr.w - 11}" y="${pr.y}" width="5" height="${GROUND - pr.y}" fill="${C.propDark}"/>
        <rect x="${pr.x}" y="${pr.y - 6}" width="${pr.w}" height="7" rx="2.5" ${st}/>`;
      case "bar": return `<rect x="${pr.x1 - 8}" y="0" width="8" height="200" fill="${C.prop}" stroke="${C.propLine}" stroke-width="1.2"/><rect x="${pr.x2}" y="0" width="8" height="200" fill="${C.prop}" stroke="${C.propLine}" stroke-width="1.2"/>
        <line x1="${pr.x1 - 4}" y1="${pr.y}" x2="${pr.x2 + 4}" y2="${pr.y}" stroke="#6b6c7e" stroke-width="5" stroke-linecap="round"/>`;
      case "bag": {
        let c, rot = 0;
        if (pr.at === "back") {
          const d = norm(sub(J.nb, J.hip)), n = [d[1], -d[0]];
          c = add(lerp2(J.hip, J.nb, 0.58), n, 15); rot = 180 - J.t;
        } else {
          const h = pr.at === "handB" ? J.aB[1] : J.aF[1];
          c = add(h, [0, pr.dy ?? 9]);
        }
        return `<g transform="translate(${f1(c[0])} ${f1(c[1])}) rotate(${f1(rot)})">
          <rect x="-8" y="-10" width="16" height="20" rx="4.5" fill="${C.bag}" stroke="${C.bagD}" stroke-width="1.5"/>
          <rect x="-8" y="-10" width="16" height="8" rx="4" fill="${C.bagD}"/><rect x="-4" y="1" width="8" height="5" rx="1.5" fill="${C.bagD}" opacity=".7"/></g>`;
      }
    }
    return "";
  }

  // ---------- desenha uma pose ----------
  function draw(spec, pose) {
    const front = spec.v === "front";
    const J = solve(pose, front);
    const M = new Set(spec.m || []);
    const lift = pose.lift || 0;
    const props = spec.p || [];
    let s = "";

    if (!spec.noFloor) {
      const xs = [J.lF[1][0], J.lB[1][0], J.hip[0]];
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      s += `<ellipse cx="${f1(cx)}" cy="${GROUND + 2}" rx="${f1(Math.max(26, 46 - lift))}" ry="4.5" fill="rgba(40,40,80,.10)"/>`;
      s += `<line x1="6" y1="${GROUND + 0.8}" x2="194" y2="${GROUND + 0.8}" stroke="#cfd0dc" stroke-width="1.6"/>`;
    }
    props.filter((p) => p.k !== "bag").forEach((p) => (s += prop(p, J)));
    s += `<g transform="translate(0 ${f1(-lift)})">`;

    const dTor = norm(sub(J.nb, J.hip)), nTor = [dTor[1], -dTor[0]]; // nTor = costas (vista lateral)
    const ctl = add(lerp2(J.hip, J.nb, 0.5), J.pp, J.c);
    const neckEnd = add(J.nb, D(J.ht), L.neck);

    if (!front) {
      // --- longe (braço/perna de trás) ---
      s += layer([...armShapes(J.sB, J.aB), ...legShapes(J.hB, J.lB, J.tB)], C.skinB);
      s += layer([{ p: J.hB, e: lerp2(J.hB, J.lB[0], 0.42), w: W.th + 0.8 }], C.shortsB, C.shortsLine);
      s += limbMus(M, J.hB, J.lB, false, false, 0.5) + limbMus(M, J.sB, J.aB, true, false, 0.5);
      // --- corpo ---
      s += layer([
        { p: J.hip, ctl, e: J.nb, w: W.torso },
        { c: add(lerp2(J.hip, J.nb, 0.72), nTor, -3), r: 13 },
        { p: J.nb, e: neckEnd, w: W.neck },
        { c: J.head, r: L.head },
      ], C.skin);
      s += hair(J, false);
      s += layer([{ c: J.hip, r: 12.6 }, { p: J.hip, e: lerp2(J.hip, J.nb, 0.2), w: W.torso + 1 }], C.shorts, C.shortsLine);
      if (M.has("chest")) s += band(J.hip, J.nb, 0.62, 0.9, -7, 9);
      if (M.has("abs")) s += band(J.hip, J.nb, 0.26, 0.56, -8, 6);
      if (M.has("obl")) s += band(J.hip, J.nb, 0.26, 0.54, -1, 9);
      if (M.has("back")) s += band(J.hip, J.nb, 0.4, 0.86, 7.5, 10);
      if (M.has("glute")) s += blob(add(add(J.hip, nTor, 6.5), dTor, -1.5), 8.2, 0.85);
      props.filter((p) => p.k === "bag" && p.at === "back").forEach((p) => (s += prop(p, J)));
      // --- perna da frente ---
      s += layer(legShapes(J.hF, J.lF, J.tF), C.skin);
      s += layer([{ p: J.hF, e: lerp2(J.hF, J.lF[0], 0.42), w: W.th + 0.8 }], C.shorts, C.shortsLine);
      s += limbMus(M, J.hF, J.lF, false, false, 0.92);
      // --- braço da frente ---
      s += layer(armShapes(J.sF, J.aF), C.skin);
      s += limbMus(M, J.sF, J.aF, true, false, 0.92);
      if (M.has("delt")) s += blob(add(J.sF, nTor, -1), 6.2);
    } else {
      // ---------- vista de frente ----------
      s += layer([...legShapes(J.hB, J.lB, J.tB), ...legShapes(J.hF, J.lF, J.tF)], C.skin);
      s += layer([{ p: J.hB, e: lerp2(J.hB, J.lB[0], 0.4), w: W.th + 0.8 }, { p: J.hF, e: lerp2(J.hF, J.lF[0], 0.4), w: W.th + 0.8 }], C.shorts, C.shortsLine);
      s += limbMus(M, J.hB, J.lB, false, true, 0.92) + limbMus(M, J.hF, J.lF, false, true, 0.92);
      s += layer([
        { p: J.hip, ctl, e: J.nb, w: W.torso + 5 },
        { p: J.sB, e: J.sF, w: 13 },
        { p: J.nb, e: neckEnd, w: W.neck },
        { c: J.head, r: L.head },
      ], C.skin);
      s += hair(J, true);
      s += layer([{ p: J.hB, e: J.hF, w: 18 }], C.shorts, C.shortsLine);
      if (M.has("chest")) { const c = lerp2(J.hip, J.nb, 0.8); s += ln(add(c, J.pp, 3), add(c, J.pp, 11), 10, C.mus, 0.92) + ln(add(c, J.pp, -3), add(c, J.pp, -11), 10, C.mus, 0.92); }
      if (M.has("abs")) s += band(J.hip, J.nb, 0.22, 0.6, 0, 10);
      if (M.has("obl")) s += band(J.hip, J.nb, 0.2, 0.55, 10, 5) + band(J.hip, J.nb, 0.2, 0.55, -10, 5);
      s += layer([...armShapes(J.sB, J.aB), ...armShapes(J.sF, J.aF)], C.skin);
      s += limbMus(M, J.sB, J.aB, true, true, 0.92) + limbMus(M, J.sF, J.aF, true, true, 0.92);
      if (M.has("delt")) s += blob(J.sF, 6.2) + blob(J.sB, 6.2);
    }
    props.filter((p) => p.k === "bag" && p.at !== "back").forEach((p) => (s += prop(p, J)));
    s += "</g>";
    return spec.z ? `<g transform="translate(100 ${GROUND}) scale(${spec.z}) translate(-100 -${GROUND})">${s}</g>` : s;
  }

  // ---------- interpolação / linha do tempo ----------
  function mix(a, b, k) {
    if (typeof a === "number" || typeof b === "number") return (a ?? 0) + ((b ?? 0) - (a ?? 0)) * k;
    if (Array.isArray(a)) return a.map((v, i) => mix(v, b ? b[i] : v, k));
    if (a && typeof a === "object") {
      const o = {};
      for (const key of new Set([...Object.keys(a), ...Object.keys(b || {})])) o[key] = mix(a[key], b ? b[key] : undefined, k);
      return o;
    }
    return a ?? b;
  }
  const ease = (x) => 0.5 - Math.cos(Math.PI * x) / 2;
  function timeline(spec) {
    if (spec._tl) return spec._tl;
    const n = spec.f.length;
    const seq = spec.loop ? [...Array(n).keys()] : n > 1 ? [...Array(n).keys(), ...Array.from({ length: n - 2 }, (_, i) => n - 2 - i)] : [0];
    const at = (arr, i, def) => (arr ? arr[Math.min(i, arr.length - 1)] : def);
    const segs = seq.map((fi, i) => ({ a: fi, b: seq[(i + 1) % seq.length], h: at(spec.h, fi, 250), d: at(spec.d, fi, 900) }));
    return (spec._tl = { segs, total: segs.reduce((x, s) => x + s.h + s.d, 0) });
  }
  function poseAt(spec, ms) {
    const { segs, total } = timeline(spec);
    let t = ms % total;
    for (const s of segs) {
      if (t < s.h) return spec.f[s.a];
      t -= s.h;
      if (t < s.d) return mix(spec.f[s.a], spec.f[s.b], ease(t / s.d));
      t -= s.d;
    }
    return spec.f[0];
  }

  // =============================================================
  //  ANIMAÇÕES
  // =============================================================
  const A = {};
  const ST = (o = {}) => ({ hip: [100, 97], t: 180, lF: { to: [104, 171.5] }, lB: { to: [97, 171.5] }, aF: [3, 0], aB: [-3, 0], ...o });

  // ---- pernas ----
  A.agachamento = {
    m: ["quad", "glute"], d: [1000, 900], h: [250, 200],
    f: [ST({ aF: [85, 90], aB: [80, 88] }), ST({ hip: [80, 131], t: 142, aF: [95, 95], aB: [92, 93] })],
  };
  A.agachMochila = {
    m: ["quad", "glute"], d: [1300, 900], h: [250, 200], p: [{ k: "bag", at: "back" }],
    f: [ST({ aF: [25, 172], aB: [20, 170] }), ST({ hip: [80, 131], t: 142, aF: [-13, 134], aB: [-18, 132] })],
  };
  A.agachPausa = { ...A.agachMochila, h: [250, 1800], _tl: null };
  A.sumo = {
    v: "front", m: ["quad", "glute"], d: [1100, 900], h: [250, 300], p: [{ k: "bag", at: "handF", dy: 8 }],
    f: [
      { hip: [100, 99], t: 180, lF: { to: [128, 171.5], f: 75 }, lB: { to: [72, 171.5], f: -75, b: 1 }, aF: { to: [103, 128], b: -1 }, aB: { to: [97, 128], b: 1 } },
      { hip: [100, 131], t: 180, lF: { to: [128, 171.5], f: 75 }, lB: { to: [72, 171.5], f: -75, b: 1 }, aF: { to: [103, 158], b: -1 }, aB: { to: [97, 158], b: 1 } },
    ],
  };
  A.bulgaro = {
    m: ["quad", "glute"], d: [1200, 900], h: [250, 200], p: [{ k: "sofa", x: 10, y: 140, w: 50, bx: 4, by: 104 }],
    f: [
      { hip: [94, 100], t: 174, lF: { to: [118, 171.5] }, lB: { to: [50, 134], f: -95 }, aF: [3, 0], aB: [-3, 0] },
      { hip: [84, 131], t: 166, lF: { to: [118, 171.5] }, lB: { to: [50, 134], f: -95 }, aF: [8, 4], aB: [2, -2] },
    ],
  };
  A.afundoTras = {
    m: ["quad", "glute"], d: [1000, 900], h: [250, 200],
    f: [ST({ lF: { to: [106, 171.5] } }), { hip: [92, 128], t: 176, lF: { to: [106, 171.5] }, lB: { to: [56, 164], f: 50 }, aF: [6, 3], aB: [-4, -4] }],
  };
  A.afundoGiro = {
    m: ["quad", "glute", "obl"], d: [1000, 900], h: [200, 300],
    f: [ST({ aF: [88, 90], aB: [85, 88] }), { hip: [102, 128], t: 178, lF: { to: [140, 171.5] }, lB: { to: [68, 164], f: 50 }, aF: [110, 115], aB: [-70, -75] }],
  };
  A.pelvicaUni = {
    m: ["glute", "ham"], d: [800, 1000], h: [200, 600],
    f: [
      { hip: [104, 163], t: -88, h: 0, aF: [84, 90], aB: [86, 90], lF: { to: [136, 169] }, lB: [140, 140, 230] },
      { hip: [108, 140], t: -62, h: -26, aF: [72, 90], aB: [74, 90], lF: { to: [136, 169] }, lB: [118, 118, 208] },
    ],
  };
  A.panturrilha = {
    m: ["calf"], z: 0.8, d: [700, 900], h: [500, 200], p: [{ k: "box", x: 104, y: 149, w: 80 }],
    f: [
      { hip: [105.6, 62.7], t: 180, lF: [0, 0, 50], lB: [-8, -75, -20], aF: [60, 35], aB: [55, 30] },
      { hip: [105, 76.1], t: 180, lF: [0, 0, 125], lB: [-8, -75, -20], aF: [55, 30], aB: [50, 25] },
    ],
  };
  A.stiff = {
    m: ["ham", "glute"], d: [1300, 1000], h: [250, 250], p: [{ k: "bag", at: "handF", dy: 8 }],
    f: [
      { hip: [100, 97], t: 180, lF: { to: [104, 171.5] }, lB: [-4, -25, 60], aF: [2, 2], aB: [0, 0] },
      { hip: [88, 103], t: 98, h: 5, lF: { to: [104, 171.5] }, lB: [-82, -82, -5], aF: [0, 0], aB: [-2, -2] },
    ],
  };
  A.degrau = {
    m: ["quad", "glute"], z: 0.8, d: [1100, 1000], h: [300, 300], p: [{ k: "box", x: 110, y: 133, w: 62 }],
    f: [
      { hip: [93, 99], t: 174, lF: { to: [128, 128] }, lB: { to: [90, 171.5] }, aF: [-12, -6], aB: [12, 18] },
      { hip: [124, 60], t: 178, lF: { to: [128, 128] }, lB: { to: [116, 122] }, aF: [10, 16], aB: [-10, -6] },
    ],
  };

  // ---- empurrar ----
  const PU0 = { hip: [98, 137], t: 112, aF: { to: [142, 169] }, aB: { to: [139, 169] }, lF: { to: [24, 164], f: 10 }, lB: { to: [24, 164], f: 10 } };
  const PU1 = { hip: [98, 157], t: 94, aF: { to: [142, 169] }, aB: { to: [139, 169] }, lF: { to: [24, 164], f: 10 }, lB: { to: [24, 164], f: 10 } };
  A.flexao = { m: ["chest", "tri", "delt"], d: [1000, 800], h: [200, 150], f: [PU0, PU1] };
  A.diamante = { m: ["tri", "chest"], d: [1100, 800], h: [200, 150], f: [PU0, PU1] };
  A.flexaoInclinada = {
    m: ["chest", "tri"], d: [1000, 800], h: [200, 150], p: [{ k: "sofa", x: 140, y: 138, w: 58, bx: 186, by: 100 }],
    f: [
      { hip: [96, 120], t: 128, aF: { to: [148, 132] }, aB: { to: [145, 132] }, lF: { to: [35, 164], f: 10 }, lB: { to: [35, 164], f: 10 } },
      { hip: [105, 140], t: 112, aF: { to: [148, 132] }, aB: { to: [145, 132] }, lF: { to: [35, 164], f: 10 }, lB: { to: [35, 164], f: 10 } },
    ],
  };
  A.pike = {
    m: ["delt", "tri"], d: [1000, 800], h: [200, 150],
    f: [
      { hip: [98, 102], t: 50, aF: { to: [148, 170] }, aB: { to: [145, 170] }, lF: { to: [60, 166], f: 0 }, lB: { to: [60, 166], f: 0 } },
      { hip: [103, 106], t: 35, aF: { to: [148, 170] }, aB: { to: [145, 170] }, lF: { to: [60, 166], f: 0 }, lB: { to: [60, 166], f: 0 } },
    ],
  };
  A.mergulho = {
    m: ["tri", "chest"], d: [1000, 800], h: [200, 150], p: [{ k: "chair", x: 28, y: 120, w: 54, backLeft: true }],
    f: [
      { hip: [91, 114], t: 178, aF: { to: [80, 117] }, aB: { to: [77, 117] }, lF: { to: [135, 171.5] }, lB: { to: [131, 171.5] } },
      { hip: [92, 140], t: 178, aF: { to: [80, 117] }, aB: { to: [77, 117] }, lF: { to: [135, 171.5] }, lB: { to: [131, 171.5] } },
    ],
  };

  // ---- puxar ----
  A.barra = {
    m: ["back", "bi"], noFloor: true, d: [1100, 1300], h: [300, 300], p: [{ k: "bar", y: 22, x1: 40, x2: 160 }],
    f: [
      { hip: [100, 121], t: 177, aF: { to: [108, 22] }, aB: { to: [105, 22] }, lF: [8, -40, 20], lB: [6, -42, 18] },
      { hip: [101, 76], t: 177, aF: { to: [108, 22] }, aB: { to: [105, 22] }, lF: [10, -40, 20], lB: [8, -42, 18] },
    ],
  };
  A.remadaMesa = {
    m: ["back", "bi"], d: [900, 1100], h: [200, 300], p: [{ k: "table", x: 136, y: 80, w: 64 }],
    f: [
      { hip: [101, 146], t: 108.6, aF: { to: [150, 81] }, aB: { to: [147, 81] }, lF: { to: [30, 165], f: 175 }, lB: { to: [30, 165], f: 175 } },
      { hip: [98, 128], t: 119, aF: { to: [150, 81], b: -1 }, aB: { to: [147, 81], b: -1 }, lF: { to: [30, 165], f: 175 }, lB: { to: [30, 165], f: 175 } },
    ],
  };
  A.remadaMochila = {
    m: ["back", "bi"], d: [800, 1100], h: [200, 300], p: [{ k: "chair", x: 140, y: 128, w: 50 }, { k: "bag", at: "handF", dy: 8 }],
    f: [
      { hip: [86, 100], t: 104, h: -10, lF: { to: [112, 171.5] }, lB: { to: [70, 171.5] }, aB: { to: [152, 124] }, aF: { to: [131, 137] } },
      { hip: [86, 100], t: 104, h: -10, lF: { to: [112, 171.5] }, lB: { to: [70, 171.5] }, aB: { to: [152, 124] }, aF: { to: [112, 108], b: 1 } },
    ],
  };
  A.rosca = {
    m: ["bi"], d: [800, 1100], h: [200, 250], p: [{ k: "bag", at: "handF", dy: 7 }],
    f: [ST({ aF: [4, 4], aB: [2, 2] }), ST({ aF: [8, 160], aB: [6, 158] })],
  };

  // ---- core ----
  A.prancha = {
    m: ["abs", "delt"], d: [1500, 1500], h: [500, 500],
    f: [
      { hip: [92.4, 150.9], t: 97, h: 0, aF: [0, 90], aB: [2, 90], lF: [-83, -83, -5], lB: [-83, -83, -5] },
      { hip: [92.4, 152.2], t: 98.5, h: 2, aF: [0, 90], aB: [2, 90], lF: [-81.5, -81.5, -5], lB: [-81.5, -81.5, -5] },
    ],
  };
  A.pranchaLateral = {
    v: "front", m: ["obl", "delt"], d: [1500, 1500], h: [500, 500],
    f: [
      { hip: [90, 143], t: 102, h: 6, aF: [0, 90], aB: [178, 180], lF: { to: [16, 162], f: 0 }, lB: { to: [18, 153], f: 0 } },
      { hip: [90, 146], t: 100.5, h: 6, aF: [1, 90], aB: [176, 178], lF: { to: [16, 162], f: 0 }, lB: { to: [18, 153], f: 0 } },
    ],
  };
  A.hollow = {
    m: ["abs"], d: [1400, 1400], h: [300, 300],
    f: [
      { hip: [104, 164], t: -106, h: 12, aF: [-100, -100], aB: [-101, -101], lF: [100, 100, 185], lB: [101, 101, 186] },
      { hip: [104, 164], t: -103, h: 10, aF: [-97, -97], aB: [-98, -98], lF: [98, 98, 183], lB: [99, 99, 184] },
    ],
  };
  A.elevPernas = {
    m: ["abs"], d: [1000, 1300], h: [200, 250],
    f: [
      { hip: [112, 163], t: -90, aF: [80, 90], aB: [82, 90], lF: [97, 97, 190], lB: [98, 98, 191] },
      { hip: [112, 163], t: -90, aF: [80, 90], aB: [82, 90], lF: [178, 178, 268], lB: [176, 176, 266] },
    ],
  };
  A.canivete = {
    m: ["abs"], d: [700, 900], h: [200, 250],
    f: [
      { hip: [104, 164], t: -91, h: 0, aF: [-92, -92], aB: [-91, -91], lF: [92, 92, 182], lB: [91, 91, 181] },
      { hip: [104, 166], t: -138, h: 0, aF: [140, 140], aB: [138, 138], lF: [138, 138, 228], lB: [136, 136, 226] },
    ],
  };
  A.deadBug = {
    m: ["abs"], d: [1000, 1000], h: [250, 250],
    f: [
      { hip: [106, 164], t: -90, aF: [180, 180], aB: [178, 178], lF: [178, 90, 180], lB: [176, 88, 178] },
      { hip: [106, 164], t: -90, aF: [-95, -95], aB: [178, 178], lF: [178, 90, 180], lB: [95, 95, 185] },
    ],
  };
  A.bicicleta = {
    m: ["abs", "obl"], d: [600, 600], h: [100, 100], loop: true,
    f: [
      { hip: [106, 164], t: -112, h: 20, aF: [-150, 30], aB: [-146, 34], lF: [150, 70, 160], lB: [97, 97, 187] },
      { hip: [106, 164], t: -114, h: 20, aF: [-146, 34], aB: [-150, 30], lF: [97, 97, 187], lB: [150, 70, 160] },
    ],
  };

  // ---- aquecimento / HIIT ----
  A.polichinelo = {
    v: "front", m: ["delt", "calf"], d: [330, 330], h: [60, 60],
    f: [
      { hip: [100, 97], t: 180, aF: [12, 6], aB: [-12, -6], lF: { to: [106, 171.5], f: 60 }, lB: { to: [94, 171.5], f: -60, b: 1 } },
      { hip: [100, 95], t: 180, aF: [150, 165], aB: [-150, -165], lF: { to: [126, 169], f: 60 }, lB: { to: [74, 169], f: -60, b: 1 }, lift: 5 },
    ],
  };
  A.rotacaoBracos = {
    m: ["delt"], loop: true, d: [380], h: [0],
    f: [0, 90, 180, 270].map((a, i, arr) => ST({ aF: [a, a], aB: [a + 6, a + 6] })).concat([ST({ aF: [360, 360], aB: [366, 366] })]),
  };
  A.gatoVaca = {
    m: ["back", "abs"], d: [1400, 1400], h: [400, 400],
    f: [
      { hip: [95, 133], t: 100, h: 45, c: 9, aF: { to: [142, 170] }, aB: { to: [139, 170] }, lF: { to: [58, 169], f: -95 }, lB: { to: [56, 169], f: -95 } },
      { hip: [95, 131], t: 98, h: -55, c: -13, aF: { to: [142, 170] }, aB: { to: [139, 170] }, lF: { to: [58, 169], f: -95 }, lB: { to: [56, 169], f: -95 } },
    ],
  };
  A.mountain = {
    m: ["abs", "quad", "delt"], d: [260, 260], h: [40, 40],
    f: [
      { ...PU0, lF: { to: [24, 164], f: 10 }, lB: { to: [92, 166], f: 30 } },
      { ...PU0, lF: { to: [92, 166], f: 30 }, lB: { to: [24, 164], f: 10 } },
    ],
  };
  A.agachSalto = {
    m: ["quad", "glute", "calf"], z: 0.85, d: [380, 450], h: [150, 60],
    f: [
      { hip: [82, 131], t: 140, lF: { to: [104, 171.5] }, lB: { to: [97, 171.5] }, aF: [-30, -20], aB: [-34, -24] },
      { hip: [100, 97], t: 180, lF: { to: [104, 171.5], f: 40 }, lB: { to: [97, 171.5], f: 40 }, aF: [170, 175], aB: [166, 172], lift: 24 },
    ],
  };
  const BUR = {
    stand: { hip: [100, 97], t: 180, aF: { to: [110, 0], b: -1 }, aB: { to: [106, 0], b: -1 }, lF: { to: [104, 171.5] }, lB: { to: [97, 171.5] } },
    squat: { hip: [86, 140], t: 120, aF: { to: [128, 169] }, aB: { to: [125, 169] }, lF: { to: [104, 171.5] }, lB: { to: [97, 171.5] } },
    plank: { hip: [84, 137], t: 112, aF: { to: [128, 169] }, aB: { to: [125, 169] }, lF: { to: [12, 164], f: 10 }, lB: { to: [12, 164], f: 10 } },
  };
  A.burpee = {
    m: ["chest", "quad", "abs"], z: 0.88, loop: true, d: [380, 320, 320, 300, 300], h: [80, 60, 160, 60, 40],
    f: [BUR.stand, BUR.squat, BUR.plank, BUR.squat, { ...BUR.stand, lF: { to: [104, 171.5], f: 40 }, lB: { to: [97, 171.5], f: 40 }, lift: 20 }],
  };
  A.joelhoAlto = {
    m: ["quad", "calf"], d: [230, 230], h: [20, 20],
    f: [
      { hip: [100, 97], t: 180, lF: [88, 5, 90], lB: [0, 0, 90], aF: [-35, 55], aB: [35, 140], lift: 3 },
      { hip: [100, 97], t: 180, lF: [0, 0, 90], lB: [88, 5, 90], aF: [35, 140], aB: [-35, 55], lift: 3 },
    ],
  };
  const LU = (frente) => ({
    hip: [96, 128], t: 178,
    lF: frente ? { to: [130, 171.5] } : { to: [62, 164], f: 50 },
    lB: frente ? { to: [62, 164], f: 50 } : { to: [130, 171.5] },
    aF: frente ? [-30, -20] : [40, 60], aB: frente ? [40, 60] : [-30, -20],
  });
  const JU = { hip: [96, 99], t: 180, lF: { to: [104, 170], f: 40 }, lB: { to: [90, 170], f: 40 }, aF: [5, 5], aB: [-5, -5], lift: 20 };
  A.afundoSalto = { m: ["quad", "glute"], z: 0.9, loop: true, d: [330, 330, 330, 330], h: [130, 0, 130, 0], f: [LU(true), JU, LU(false), JU] };

  // =============================================================
  //  MONTAGEM / LOOP
  // =============================================================
  const figs = new Set();
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => (e.target._vis = e.isIntersecting))) : null;

  function paint(el, now) {
    const spec = A[el.dataset.anim];
    if (!spec || !el._g) return;
    el._g.innerHTML = draw(spec, reduz ? spec.f[spec.f.length - 1] : poseAt(spec, now));
  }
  function mount(root = document) {
    root.querySelectorAll("[data-anim]").forEach((el) => {
      if (el._g && el._id === el.dataset.anim) return;
      el._id = el.dataset.anim;
      el.innerHTML = `<svg viewBox="0 0 200 200" aria-hidden="true"><g></g></svg>`;
      el._g = el.querySelector("g");
      el._vis = true;
      if (io) io.observe(el);
      figs.add(el);
      paint(el, performance.now());
    });
  }
  function set(el, id) { el.dataset.anim = id || ""; if (!id) { el.innerHTML = ""; el._g = null; figs.delete(el); return; } mount(el.parentNode || document); }

  let last = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (reduz || now - last < 33) return;
    last = now;
    for (const el of figs) {
      if (!el.isConnected) { figs.delete(el); if (io) io.unobserve(el); continue; }
      if (el._vis === false) continue;
      paint(el, now);
    }
  }
  requestAnimationFrame(tick);

  return { A, mount, set, draw, poseAt };
})();
