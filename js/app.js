/* =============================================================
   Projeto Tanquinho — app offline (PWA)
   Tudo fica salvo no próprio celular (localStorage).
   ============================================================= */
(() => {
  "use strict";

  // ---------------- helpers ----------------
  const $ = (s, el = document) => el.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hojeKey = () => keyOf(new Date());
  const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
  const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

  // ---------------- estado ----------------
  const STORE = "tanquinho_v1";
  const padrao = () => ({
    dias: {},
    medidas: [],
    compras: {},
    escolhas: {},
    config: { som: true, vibrar: true, autoDescanso: true, lembrete: false, lembreteMin: 60, lastLembrete: 0 },
  });
  let S = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s) { const d = padrao(); return { ...d, ...s, config: { ...d.config, ...(s.config || {}) } }; }
    } catch (e) { /* ignora */ }
    return padrao();
  })();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* cheio */ } };
  const dia = (k = hojeKey()) => (S.dias[k] ||= { sets: {}, ativ: {}, refeicoes: {}, agua: [], habitos: {} });
  const lerDia = (k) => S.dias[k] || {};

  // ---------------- UI state ----------------
  const ui = { tab: "hoje", treinoDia: null, dietaSeg: "cardapio", graf: "peso", aberto: new Set() };

  // ---------------- cálculos ----------------
  const planoIdx = (k = hojeKey()) => {
    const d = lerDia(k);
    if (typeof d.plano === "number") return d.plano;
    const [y, m, dd] = k.split("-").map(Number);
    return new Date(y, m - 1, dd).getDay();
  };

  function progressoTreino(w, k) {
    const p = SEMANA[w], d = lerDia(k);
    let tot = 0, feito = 0;
    p.exercicios.forEach((id) => {
      tot += EX[id].series;
      feito += ((d.sets || {})[id] || []).filter(Boolean).length;
    });
    if (p.hiit) { tot += 4; if (d.hiit) feito += 4; }
    (p.atividades || []).forEach((_, i) => { tot += 1; if ((d.ativ || {})[i]) feito += 1; });
    return tot ? feito / tot : 0;
  }
  const treinoFeito = (k) => {
    const d = lerDia(k);
    if (d.treinoFeito) return true;
    return progressoTreino(planoIdx(k), k) >= 1;
  };

  const aguaTotal = (k = hojeKey()) => (lerDia(k).agua || []).reduce((a, b) => a + b.ml, 0);
  const aguaMeta = () => PERFIL.aguaMeta;

  function aguaEsperada(date = new Date()) {
    const h = date.getHours() + date.getMinutes() / 60;
    let ph = 7, pml = 0;
    for (const cp of AGUA_CHECKPOINTS) {
      if (h <= cp.hora) return pml + ((h - ph) / (cp.hora - ph)) * (cp.ml - pml) * (h > ph ? 1 : 0);
      ph = cp.hora; pml = cp.ml;
    }
    return aguaMeta();
  }

  const escolha = (mealId) => S.escolhas[mealId] ?? 0;
  const somaOpcao = (op) => op.itens.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, g: a.g + i.g }), { kcal: 0, p: 0, c: 0, g: 0 });
  function macrosComidos(k = hojeKey()) {
    const r = { kcal: 0, p: 0, c: 0, g: 0 }, ref = lerDia(k).refeicoes || {};
    DIETA.forEach((m) => {
      if (ref[m.id] === undefined) return;
      const s = somaOpcao(m.opcoes[ref[m.id]] || m.opcoes[0]);
      r.kcal += s.kcal; r.p += s.p; r.c += s.c; r.g += s.g;
    });
    return r;
  }
  function macrosPlano() {
    const r = { kcal: 0, p: 0, c: 0, g: 0 };
    DIETA.forEach((m) => { const s = somaOpcao(m.opcoes[escolha(m.id)]); r.kcal += s.kcal; r.p += s.p; r.c += s.c; r.g += s.g; });
    return r;
  }

  function streak() {
    let n = 0;
    const d = new Date();
    if (!treinoFeito(keyOf(d))) d.setDate(d.getDate() - 1);
    while (treinoFeito(keyOf(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  const pesoAtual = () => (S.medidas.length ? S.medidas[S.medidas.length - 1].peso : PERFIL.pesoInicial);

  // ---------------- componentes ----------------
  function ring(pct, label, sub, color = "url(#gRing)", size = 92) {
    const c = 2 * Math.PI * 40;
    const off = c * (1 - clamp(pct, 0, 1));
    return `<div class="ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 92 92"><circle class="trk" cx="46" cy="46" r="40"/>
      <circle class="bar" cx="46" cy="46" r="40" style="stroke:${color};stroke-dasharray:${c};stroke-dashoffset:${c}" data-off="${off}"/></svg>
      <div class="lbl"><div>${label}<small>${sub}</small></div></div></div>`;
  }
  const bar = (pct, cls = "") => `<div class="pbar ${cls}"><i style="width:0" data-w="${clamp(pct, 0, 1) * 100}%"></i></div>`;
  const emo = (e, cor, cls = "") => `<div class="emo ${cls}" style="--c:${cor}">${e}</div>`;

  // =============================================================
  //  VIEWS
  // =============================================================
  function viewHoje() {
    const now = new Date();
    const h = now.getHours();
    const saud = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const k = hojeKey(), d = lerDia(k);
    const w = planoIdx(k), p = SEMANA[w];
    const prog = progressoTreino(w, k);
    const feito = treinoFeito(k);
    const agua = aguaTotal(), meta = aguaMeta();
    const mc = macrosComidos();
    const st = streak();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    const frase = FRASES[doy % FRASES.length];

    // próxima refeição
    const hm = h * 60 + now.getMinutes();
    const ref = d.refeicoes || {};
    let prox = DIETA.find((m) => ref[m.id] === undefined && (() => { const [hh, mm] = m.hora.split(":").map(Number); return hh * 60 + mm + 90 >= hm; })())
      || DIETA.find((m) => ref[m.id] === undefined);
    let proxHtml = "";
    if (prox) {
      const op = prox.opcoes[escolha(prox.id)], s = somaOpcao(op);
      proxHtml = `<div class="card row" data-act="tab" data-tab="dieta" role="button">
        ${emo(prox.emoji, prox.cor, "lg")}
        <div class="grow"><small class="muted">${prox.hora} · ${prox.nome}</small>
          <h3 style="font-size:17px;margin:2px 0 4px">${op.nome}</h3>
          <div class="row" style="gap:6px;flex-wrap:wrap">${op.itens.map((i) => `<span title="${i.nome}" style="font-size:22px">${i.emoji}</span>`).join("")}</div>
        </div>
        <div class="center"><b style="font-size:18px">${fmt(s.kcal)}</b><br><small class="muted">kcal · ${s.p}g P</small></div>
      </div>`;
    } else {
      proxHtml = `<div class="card center">🎉 <b>Todas as refeições do dia marcadas!</b></div>`;
    }

    return `<section class="view">
      <header class="head">
        <div><small>${now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</small>
        <h1>${saud} <span class="wave-hand">👋</span></h1></div>
        <div class="streak" title="Dias seguidos de treino"><span class="f">🔥</span>${st}</div>
      </header>

      <p class="quote">${frase}</p>

      <div class="section-title">Treino de hoje</div>
      <div class="hero" style="--c:${p.cor}">
        <small>${p.dia}${typeof d.plano === "number" ? " (trocado)" : ""}</small>
        <h2>${p.titulo}</h2>
        <p>${p.resumo}</p>
        <div class="bar"><i style="width:0" data-w="${prog * 100}%"></i></div>
        <button class="btn" data-act="irTreino">${feito ? "✅ Concluído — ver treino" : prog > 0 ? "▶ Continuar treino" : "▶ Começar treino"}</button>
        <div class="hero-emoji">${p.emoji}</div>
      </div>

      <div class="grid2" style="margin-top:12px">
        <div class="mini">
          <div class="row" style="justify-content:space-between"><small>💧 Água</small><small>${Math.round((agua / meta) * 100)}%</small></div>
          <b>${fmt(agua)}<span class="muted" style="font-size:13px;font-weight:600"> / ${fmt(meta)} ml</span></b>
          <div style="margin:8px 0 10px">${bar(agua / meta, "water")}</div>
          <button class="btn water sm block" data-act="agua" data-ml="250">+ 1 copo (250 ml)</button>
        </div>
        <div class="mini">
          <div class="row" style="justify-content:space-between"><small>🍽️ Comido hoje</small></div>
          <b>${fmt(mc.kcal)}<span class="muted" style="font-size:13px;font-weight:600"> / ${fmt(PERFIL.kcalMeta)} kcal</span></b>
          <div style="margin:8px 0 6px">${bar(mc.kcal / PERFIL.kcalMeta)}</div>
          <small>🥩 Proteína: <b style="display:inline;font-size:13px">${mc.p}g</b> / ${PERFIL.proteinaMeta}g</small>
          <div style="margin-top:6px">${bar(mc.p / PERFIL.proteinaMeta, "ok")}</div>
        </div>
      </div>

      <div class="section-title">Próxima refeição</div>
      ${proxHtml}

      <div class="section-title">Hábitos de hoje</div>
      ${HABITOS.map((hb) => `<button class="check ${(d.habitos || {})[hb.id] ? "on" : ""}" data-act="habito" data-id="${hb.id}">
        <span class="box">✓</span><span style="font-size:20px">${hb.emoji}</span><span class="txt grow">${hb.nome}</span></button>`).join("")}
    </section>`;
  }

  // ---------------- TREINO ----------------
  function viewTreino() {
    const k = hojeKey();
    const hojeW = planoIdx(k);
    if (ui.treinoDia === null) ui.treinoDia = hojeW;
    const w = ui.treinoDia, p = SEMANA[w];
    const ehHoje = w === hojeW;
    const d = ehHoje ? lerDia(k) : {};
    const prog = ehHoje ? progressoTreino(w, k) : 0;

    // dias da semana atual concluídos
    const seg = new Date(); seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7));
    const feitosSemana = {};
    for (let i = 0; i < 7; i++) { const x = new Date(seg); x.setDate(seg.getDate() + i); if (treinoFeito(keyOf(x))) feitosSemana[planoIdx(keyOf(x))] = true; }

    const chips = ORDEM_SEMANA.map((i) => `<button class="chip ${i === w ? "on" : ""} ${i === hojeW ? "today" : ""} ${feitosSemana[i] && i !== w ? "done" : ""}" data-act="diaTreino" data-w="${i}">
      ${feitosSemana[i] ? "✓ " : ""}${DIAS_CURTOS[i]}</button>`).join("");

    const aviso = ehHoje ? "" : `<div class="note" style="margin-top:12px">👀 Você está vendo o treino de <b>${p.dia}</b>. Quer fazer ele hoje no lugar do de ${SEMANA[new Date().getDay()].dia}?
      <div style="margin-top:10px"><button class="btn sm primary" data-act="trocar" data-w="${w}">🔁 Fazer este treino hoje</button>
      <button class="btn sm ghost" data-act="diaTreino" data-w="${hojeW}">Voltar pro de hoje</button></div></div>`;

    const desfazTroca = ehHoje && typeof lerDia(k).plano === "number"
      ? `<button class="btn sm ghost" style="margin-top:10px" data-act="destrocar">↩ Voltar pro treino original de hoje</button>` : "";

    const aquec = `<div class="card">
      <div class="row">${emo("🔥", "#f59e0b")}
        <div class="grow"><h3 style="font-size:16px">Aquecimento · 5 min</h3>
        <small class="muted">${AQUECIMENTO.length} movimentos · guiado com timer</small></div>
        ${d.aquec ? '<span class="pill ok">✓ feito</span>' : ""}</div>
      <div class="fig-row">${AQUECIMENTO.map((a) => `<div><div class="fig mini" data-anim="${a.anim}"></div><small>${a.nome}</small></div>`).join("")}</div>
      <button class="btn block ${d.aquec ? "" : "primary"}" style="margin-top:12px" data-act="aquecer" ${ehHoje ? "" : "disabled"}>▶ ${d.aquec ? "Fazer de novo" : "Iniciar aquecimento guiado"}</button>
    </div>`;

    const exs = p.exercicios.map((id) => {
      const ex = EX[id];
      const arr = (d.sets || {})[id] || [];
      const nFeitas = arr.filter(Boolean).length;
      const done = nFeitas >= ex.series;
      const aberto = ui.aberto.has(id);
      const sets = Array.from({ length: ex.series }, (_, i) => {
        const on = !!arr[i];
        if (ex.tipo === "tempo") return `<button class="set ${on ? "on" : "play"}" data-act="set" data-id="${id}" data-i="${i}" ${ehHoje ? "" : "disabled"}>${on ? "✓" : "▶"} ${ex.seg}s</button>`;
        return `<button class="set ${on ? "on" : ""}" data-act="set" data-id="${id}" data-i="${i}" ${ehHoje ? "" : "disabled"}>${on ? "✓" : i + 1}</button>`;
      }).join("");
      return `<div class="card ex ${done ? "done" : ""} ${aberto ? "open" : ""}">
        <div class="ex-head"><div class="fig sm" data-anim="${id}" data-act="abrir" data-id="${id}" role="button" aria-label="Ver como fazer"></div>
          <div class="grow"><h3>${ex.nome}</h3>
            <div class="ex-meta"><span class="pill">${ex.series} × ${ex.tipo === "tempo" ? ex.seg + "s" : ex.reps}</span><span class="pill">⏱ ${ex.descanso}s descanso</span></div>
          </div></div>
        <div class="sets">${sets}</div>
        <button class="toggle-more" data-act="abrir" data-id="${id}">${aberto ? "▲ Fechar" : "▼ Como fazer"}</button>
        <div class="ex-more">
          ${aberto ? `<div class="fig lg" data-anim="${id}"></div>` : ""}
          <ol>${ex.como.map((c) => `<li>${c}</li>`).join("")}</ol>
          <div class="lvl"><div class="e"><b>Mais fácil</b>${ex.facil}</div><div class="h"><b>Mais difícil</b>${ex.dificil}</div></div>
        </div>
      </div>`;
    }).join("");

    let hiit = "";
    if (p.hiit) {
      const H = p.hiit === "curto" ? HIIT_CURTO : HIIT_LONGO;
      const min = Math.round((H.exercicios.length * (H.trabalho + H.descanso) * H.rodadas + (H.rodadas - 1) * 40) / 60);
      hiit = `<div class="section-title">Cardio intenso</div>
      <div class="card ${d.hiit ? "ex done" : ""}" style="${d.hiit ? "" : "background:linear-gradient(135deg,rgba(239,68,68,.18),rgba(236,72,153,.12))"}">
        <div class="row">${emo("⚡", "#ef4444")}
          <div class="grow"><h3 style="font-size:16px">${H.nome}</h3>
          <small class="muted">${H.trabalho}s forte / ${H.descanso}s descanso · ${H.rodadas} rodadas · ~${min} min</small></div>
          ${d.hiit ? '<span class="pill ok">✓ feito</span>' : ""}</div>
        <div class="fig-row">${H.exercicios.map((e) => `<div><div class="fig mini" data-anim="${e.anim}"></div><small>${e.nome}</small></div>`).join("")}</div>
        <button class="btn block primary" style="margin-top:14px" data-act="hiit" ${ehHoje ? "" : "disabled"}>▶ ${d.hiit ? "Fazer de novo" : "Iniciar HIIT com timer"}</button>
      </div>`;
    }

    const ativ = (p.atividades || []).map((a, i) => `<button class="check ${(d.ativ || {})[i] ? "on" : ""}" data-act="ativ" data-i="${i}" ${ehHoje ? "" : "disabled"}>
      <span class="box">✓</span><span class="txt grow">${a}</span></button>`).join("");

    return `<section class="view">
      <header class="head"><div><small>Em casa · sem academia</small><h1>Treino</h1></div>
        <div class="pill hot">⏱ descanso ${S.config.autoDescanso ? "automático" : "manual"}</div></header>
      <div class="chips">${chips}</div>

      <div class="hero" style="--c:${p.cor}">
        <small>${p.dia}${ehHoje ? " · hoje" : ""}</small>
        <h2>${p.titulo}</h2>
        <p>${p.resumo}</p>
        ${ehHoje ? `<div class="bar"><i style="width:0" data-w="${prog * 100}%"></i></div><p style="margin-top:6px;font-size:13px;font-weight:700">${Math.round(prog * 100)}% concluído</p>` : ""}
        <div class="hero-emoji">${p.emoji}</div>
      </div>
      ${aviso}${desfazTroca}

      <div class="section-title">Antes de tudo</div>
      ${aquec}

      ${p.exercicios.length ? `<div class="section-title">Exercícios · toque na série quando terminar</div><div class="stack">${exs}</div>` : ""}
      ${ativ ? `<div class="section-title">Atividades do dia</div>${ativ}` : ""}
      ${hiit}

      <div class="section-title">Regra da progressão</div>
      <div class="card small">
        <p>Toda semana tente <b>pelo menos uma</b>: +1–2 repetições · mais peso na mochila · descer em 3 segundos · variação mais difícil.</p>
        <p class="muted" style="margin-top:8px">Termine cada série com 1–2 repetições "sobrando". Treino fácil não muda o corpo. 💥</p>
      </div>
    </section>`;
  }

  // ---------------- DIETA ----------------
  function viewDieta() {
    const segs = [["cardapio", "🍽️ Cardápio"], ["regras", "📏 Regras"], ["compras", "🛒 Compras"]];
    let corpo = "";
    if (ui.dietaSeg === "cardapio") corpo = dietaCardapio();
    else if (ui.dietaSeg === "regras") corpo = REGRAS_DIETA.map((r) => `<div class="card rule">${emo(r.emoji, "#8b5cf6", "sm")}<div><h4>${r.titulo}</h4><p class="muted small">${r.texto}</p></div></div>`).join("")
      + `<div class="note" style="margin-top:14px">⚖️ Valores aproximados (tabela TACO / rótulos comuns). Cozinhe com pouco óleo: 1 colher de sopa de óleo = ~120 kcal escondidas.</div>`;
    else corpo = dietaCompras();

    return `<section class="view">
      <header class="head"><div><small>~${fmt(PERFIL.kcalMeta)} kcal · ${PERFIL.proteinaMeta} g de proteína</small><h1>Dieta</h1></div>
      <div class="emo sm" style="--c:#22c55e">🥗</div></header>
      <div class="seg">${segs.map(([id, n]) => `<button class="${ui.dietaSeg === id ? "on" : ""}" data-act="dietaSeg" data-id="${id}">${n}</button>`).join("")}</div>
      ${corpo}
    </section>`;
  }

  function dietaCardapio() {
    const k = hojeKey(), ref = lerDia(k).refeicoes || {};
    const mc = macrosComidos(), mp = macrosPlano();
    const resumo = `<div class="card macro-row">
      ${ring(mc.kcal / PERFIL.kcalMeta, fmt(mc.kcal), "de " + fmt(PERFIL.kcalMeta) + " kcal", "url(#gRing)", 104)}
      <div class="macros">
        <div class="m"><div><span>🥩 Proteína</span><b>${mc.p} / ${PERFIL.proteinaMeta} g</b></div>${bar(mc.p / PERFIL.proteinaMeta, "ok")}</div>
        <div class="m"><div><span>🍚 Carbo</span><b>${mc.c} / ${mp.c} g</b></div>${bar(mc.c / Math.max(mp.c, 1))}</div>
        <div class="m"><div><span>🥑 Gordura</span><b>${mc.g} / ${mp.g} g</b></div>${bar(mc.g / Math.max(mp.g, 1), "water")}</div>
      </div></div>
      <p class="muted small center" style="margin:10px 0 4px">Cardápio escolhido: <b style="color:var(--txt)">${fmt(mp.kcal)} kcal · ${mp.p} g proteína</b> · troque as opções à vontade</p>`;

    const meals = DIETA.map((m, mi) => {
      const sel = ref[m.id] !== undefined ? ref[m.id] : escolha(m.id);
      const op = m.opcoes[sel], s = somaOpcao(op);
      const comeu = ref[m.id] !== undefined;
      return `<div class="card meal ${comeu ? "eaten" : ""}" style="--c:${m.cor}">
        <div class="meal-top">${emo(m.emoji, m.cor)}
          <div class="grow"><small class="muted">${m.hora}</small><h3>${m.nome}</h3></div>
          <span class="pill">${fmt(s.kcal)} kcal</span></div>
        <div class="meal-opts">${m.opcoes.map((o, i) => `<button class="${i === sel ? "on" : ""}" data-act="opcao" data-m="${m.id}" data-i="${i}">${String.fromCharCode(65 + i)} · ${o.nome}</button>`).join("")}</div>
        <div class="foods">${op.itens.map((it, ii) => `<div class="food" style="animation-delay:${ii * 50}ms">
          <div class="emo food">${it.emoji}</div>
          <div class="grow"><h4>${it.nome}</h4><small class="muted">${it.qtd}</small></div>
          <div class="k"><b>${it.kcal} kcal</b>${it.p}g prot</div></div>`).join("")}</div>
        <div class="meal-foot"><div class="tot">🥩 <b>${s.p}g</b> prot · 🍚 <b>${s.c}g</b> carb · 🥑 <b>${s.g}g</b> gord</div>
          <button class="eat-btn ${comeu ? "on" : ""}" data-act="comer" data-m="${m.id}" data-i="${sel}">${comeu ? "✓ Comi" : "Marcar"}</button></div>
      </div>`;
    }).join("");
    return resumo + `<div class="stack" style="margin-top:12px">${meals}</div>`;
  }

  function dietaCompras() {
    const total = LISTA_COMPRAS.reduce((a, c) => a + c.itens.length, 0);
    const marcados = Object.values(S.compras).filter(Boolean).length;
    return `<div class="card row"><div class="grow"><b>Lista da semana</b><br><small class="muted">${marcados} de ${total} itens no carrinho</small>
      <div style="margin-top:8px">${bar(marcados / total, "ok")}</div></div>
      <button class="btn sm ghost" data-act="limparCompras">Limpar</button></div>
      ${LISTA_COMPRAS.map((c) => `<div class="section-title">${c.emoji} ${c.cat}</div>
        ${c.itens.map((it) => `<button class="check ${S.compras[it] ? "on" : ""}" data-act="compra" data-id="${it}"><span class="box">✓</span><span class="txt grow">${it}</span></button>`).join("")}`).join("")}`;
  }

  // ---------------- ÁGUA ----------------
  function bottleSVG(pct) {
    const y = 205 - clamp(pct, 0, 1.04) * 192;
    return `<svg viewBox="0 0 120 210">
      <defs>
        <clipPath id="bclip"><rect x="10" y="40" width="100" height="166" rx="26"/><rect x="40" y="14" width="40" height="34" rx="6"/></clipPath>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#4f46e5"/></linearGradient>
      </defs>
      <g clip-path="url(#bclip)">
        <rect x="0" y="0" width="120" height="210" fill="rgba(255,255,255,.05)"/>
        <g class="lvl-g" style="transform:translateY(205px)" data-y="${y}">
          <path class="wave2" fill="#818cf8" d="M0 2 Q30 -9 60 2 T120 2 T180 2 T240 2 V230 H0Z"/>
          <path class="wave" fill="url(#wg)" d="M0 4 Q30 -6 60 4 T120 4 T180 4 T240 4 V230 H0Z"/>
          <circle cx="35" cy="40" r="3" fill="rgba(255,255,255,.5)"><animate attributeName="cy" values="60;10" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;0" dur="3s" repeatCount="indefinite"/></circle>
          <circle cx="80" cy="60" r="2" fill="rgba(255,255,255,.5)"><animate attributeName="cy" values="80;15" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;0" dur="4s" repeatCount="indefinite"/></circle>
        </g>
      </g>
      <rect x="10" y="40" width="100" height="166" rx="26" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2.5"/>
      <rect x="40" y="14" width="40" height="30" rx="6" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2.5"/>
      <rect x="36" y="2" width="48" height="14" rx="5" fill="#38bdf8"/>
      <rect x="22" y="58" width="7" height="60" rx="3.5" fill="rgba(255,255,255,.25)"/>
    </svg>`;
  }

  function viewAgua() {
    const k = hojeKey(), d = lerDia(k);
    const total = aguaTotal(), meta = aguaMeta(), pct = total / meta;
    const esp = Math.round(aguaEsperada() / 50) * 50;
    const now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    let status;
    if (total >= meta) status = `<span class="pill ok">🏆 Meta batida!</span>`;
    else if (total >= esp - 100) status = `<span class="pill ok">✓ No ritmo</span>`;
    else status = `<span class="pill bad">⚠ −${fmt(esp - total)} ml</span>`;

    const proxCp = AGUA_CHECKPOINTS.find((c) => c.hora > h);
    const cps = AGUA_CHECKPOINTS.map((c) => {
      const passou = h >= c.hora, ok = total >= c.ml;
      const cls = ok ? "ok" : passou ? "late" : c === proxCp ? "now" : "";
      const ic = ok ? "✅" : passou ? "⏰" : c === proxCp ? "💧" : "○";
      const falta = !ok ? `<small class="muted">faltam ${fmt(c.ml - total)} ml</small>` : `<small style="color:#4ade80">feito</small>`;
      return `<div class="cp ${cls}"><div class="dot">${ic}</div><div class="grow"><b>Até ${c.hora}h → ${fmt(c.ml)} ml</b><br><small class="muted">${c.label}</small></div>${falta}</div>`;
    }).join("");

    const log = (d.agua || []).slice().reverse().map((a, ri) => {
      const i = d.agua.length - 1 - ri, t = new Date(a.t);
      return `<div class="row hist-i" style="padding:8px 2px"><span>💧</span><span class="grow"><b>${a.ml} ml</b></span><small class="muted">${pad(t.getHours())}:${pad(t.getMinutes())}</small>
        <button class="icon-btn" style="width:30px;height:30px;font-size:13px" data-act="aguaDel" data-i="${i}" aria-label="Remover">✕</button></div>`;
    }).join("") || `<p class="muted small center" style="padding:10px">Nenhum copo ainda hoje. Bora começar! 💦</p>`;

    const notifSup = "Notification" in window;

    return `<section class="view">
      <header class="head"><div><small>Meta do dia: ${fmt(meta)} ml</small><h1>Água</h1></div>${status}</header>

      <div class="card water-hero">
        <div class="bottle">${bottleSVG(pct)}</div>
        <div class="grow">
          <div class="water-num">${fmt(total)}<small> ml</small></div>
          <p class="muted">de ${fmt(meta)} ml · <b style="color:var(--water)">${Math.round(pct * 100)}%</b></p>
          <div style="margin:10px 0">${bar(pct, "water")}</div>
          <p class="small">${total >= meta ? "Hidratado! 💙" : `Agora o ideal seria ter <b>~${fmt(esp)} ml</b>.`}</p>
          ${proxCp && total < proxCp.ml ? `<p class="small muted" style="margin-top:4px">Próxima meta: ${fmt(proxCp.ml)} ml até ${proxCp.hora}h</p>` : ""}
        </div>
      </div>

      <div class="section-title">Registrar</div>
      <div class="cups">
        <button class="cup" data-act="agua" data-ml="150"><span>🥃</span>150 ml<small>copinho</small></button>
        <button class="cup" data-act="agua" data-ml="250"><span>🥛</span>250 ml<small>copo</small></button>
        <button class="cup" data-act="agua" data-ml="500"><span>🍶</span>500 ml<small>garrafinha</small></button>
      </div>
      ${(d.agua || []).length ? `<button class="btn ghost sm block" style="margin-top:10px" data-act="aguaUndo">↶ Desfazer último</button>` : ""}

      <div class="section-title">Metas por horário</div>
      <div class="card" style="padding:6px 14px">${cps}</div>

      <div class="section-title">Lembrete</div>
      <div class="card">
        <div class="row"><span style="font-size:24px">🔔</span><div class="grow"><b>Me lembrar de beber água</b><br><small class="muted">Só avisa se estiver atrasado na meta (8h–22h)</small></div>
          <button class="switch ${S.config.lembrete ? "on" : ""}" data-act="lembrete" aria-label="Lembrete"></button></div>
        ${S.config.lembrete ? `<div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap"><small class="muted">A cada:</small>
          ${[30, 45, 60, 90].map((m) => `<button class="chip ${S.config.lembreteMin === m ? "on" : ""}" style="padding:6px 11px" data-act="lembreteMin" data-m="${m}">${m} min</button>`).join("")}</div>` : ""}
        <p class="note" style="margin-top:12px">${notifSup ? "ℹ️ Sem internet e sem servidor, o celular só consegue avisar enquanto o app estiver aberto ou em segundo plano recente. Por isso o melhor é usar as <b>metas por horário</b> acima como checklist." : "ℹ️ Este navegador não suporta notificações. Use as metas por horário como checklist."}</p>
      </div>

      <div class="section-title">Hoje</div>
      <div class="card hist" style="padding:6px 14px">${log}</div>
    </section>`;
  }

  // ---------------- PROGRESSO ----------------
  function viewProgresso() {
    const atual = pesoAtual();
    const ini = PERFIL.pesoInicial, alvo = PERFIL.pesoMeta;
    const prog = (ini - atual) / (ini - alvo);
    const imc = atual / (PERFIL.altura * PERFIL.altura);
    const ultimos = S.medidas.slice(-7);
    const media7 = ultimos.length ? ultimos.reduce((a, b) => a + b.peso, 0) / ultimos.length : atual;
    const cints = S.medidas.filter((m) => m.cintura);
    const dCint = cints.length >= 2 ? cints[cints.length - 1].cintura - cints[0].cintura : null;

    // últimos 28 dias
    let heat = "", treinosMes = 0, aguaMes = 0;
    const base = new Date(); base.setDate(base.getDate() - 27);
    const off = (base.getDay() + 6) % 7;
    for (let i = 0; i < off; i++) heat += `<div style="background:transparent"></div>`;
    for (let i = 0; i < 28; i++) {
      const x = new Date(base); x.setDate(base.getDate() + i);
      const kk = keyOf(x), dd = lerDia(kk);
      const t = treinoFeito(kk), a = aguaTotal(kk) >= aguaMeta(), r = Object.keys(dd.refeicoes || {}).length >= 5;
      if (t) treinosMes++; if (a) aguaMes++;
      const lv = (t ? 1 : 0) + (a ? 1 : 0) + (r ? 1 : 0);
      heat += `<div class="l${lv} ${kk === hojeKey() ? "td" : ""}" title="${x.toLocaleDateString("pt-BR")}">${x.getDate()}</div>`;
    }

    const ultimaHoje = S.medidas.length && S.medidas[S.medidas.length - 1].data === hojeKey() ? S.medidas[S.medidas.length - 1] : null;
    const hist = S.medidas.slice().reverse().slice(0, 12).map((m, ri) => {
      const i = S.medidas.length - 1 - ri; const [y, mo, dd] = m.data.split("-");
      return `<div class="row"><span class="muted" style="width:52px">${dd}/${mo}</span><b class="grow">${fmt1(m.peso)} kg</b>
        <span class="muted">${m.cintura ? fmt1(m.cintura) + " cm" : "—"}</span>
        <button class="icon-btn" style="width:30px;height:30px;font-size:13px" data-act="medDel" data-i="${i}" aria-label="Apagar">✕</button></div>`;
    }).join("");

    return `<section class="view">
      <header class="head"><div><small>${fmt1(ini)} kg → ${fmt1(alvo)} kg</small><h1>Progresso</h1></div>
        <div class="streak"><span class="f">🔥</span>${streak()} dias</div></header>

      <div class="hero" style="--c:#6366f1">
        <small>Meta: pochete fora 🎯</small>
        <h2>${fmt1(atual)} kg</h2>
        <p>${atual <= alvo ? "Meta atingida! Agora foca na cintura e no espelho. 🏆" : `Faltam <b>${fmt1(atual - alvo)} kg</b> · já foram ${fmt1(Math.max(0, ini - atual))} kg`}</p>
        <div class="bar"><i style="width:0" data-w="${clamp(prog, 0, 1) * 100}%"></i></div>
        <div class="hero-emoji">🎯</div>
      </div>

      <div class="section-title">Registrar medida de hoje</div>
      <div class="card">
        <div class="inputs">
          <div class="field"><label>Peso (kg)</label><input id="inPeso" type="number" inputmode="decimal" step="0.1" placeholder="${fmt1(atual)}" value="${ultimaHoje ? ultimaHoje.peso : ""}"></div>
          <div class="field"><label>Cintura (cm)</label><input id="inCint" type="number" inputmode="decimal" step="0.5" placeholder="no umbigo" value="${ultimaHoje && ultimaHoje.cintura ? ultimaHoje.cintura : ""}"></div>
          <button class="btn primary" data-act="medSalvar">Salvar</button>
        </div>
        <p class="muted small" style="margin-top:10px">⚖️ Pese de manhã, em jejum, depois do banheiro. Cintura com fita na altura do umbigo, 1×/semana.</p>
      </div>

      <div class="grid2" style="margin-top:12px">
        <div class="mini"><small>Média 7 registros</small><b>${fmt1(media7)} kg</b></div>
        <div class="mini"><small>Cintura</small><b>${dCint === null ? "—" : (dCint > 0 ? "+" : "") + fmt1(dCint) + " cm"}</b></div>
        <div class="mini"><small>IMC</small><b>${fmt1(imc)}</b></div>
        <div class="mini"><small>Treinos (28 dias)</small><b>${treinosMes}</b></div>
      </div>

      <div class="section-title">Gráfico</div>
      <div class="card">
        <div class="seg" style="margin-bottom:10px">
          <button class="${ui.graf === "peso" ? "on" : ""}" data-act="graf" data-id="peso">⚖️ Peso</button>
          <button class="${ui.graf === "cintura" ? "on" : ""}" data-act="graf" data-id="cintura">📏 Cintura</button>
        </div>
        ${grafico()}
      </div>

      <div class="section-title">Últimas 4 semanas</div>
      <div class="card">
        <div class="heat">${["S", "T", "Q", "Q", "S", "S", "D"].map((l) => `<div style="background:transparent;aspect-ratio:auto">${l}</div>`).join("")}${heat}</div>
        <p class="muted small" style="margin-top:10px">Cor mais forte = mais coisas feitas no dia (treino · água · 5+ refeições). Água batida: ${aguaMes} dias.</p>
      </div>

      ${hist ? `<div class="section-title">Histórico</div><div class="card hist" style="padding:6px 14px">${hist}</div>` : ""}

      <div class="section-title">Configurações</div>
      <div class="card">
        ${[["som", "🔊 Sons do timer"], ["vibrar", "📳 Vibração"], ["autoDescanso", "⏱ Descanso automático após cada série"]].map(([id, n]) =>
          `<div class="row" style="padding:8px 0"><span class="grow">${n}</span><button class="switch ${S.config[id] ? "on" : ""}" data-act="cfg" data-id="${id}" aria-label="${n}"></button></div>`).join("")}
      </div>
      <div class="card">
        <b>💾 Backup</b><p class="muted small" style="margin:4px 0 12px">Os dados ficam só neste celular. Exporte de vez em quando pra não perder nada.</p>
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <button class="btn sm" data-act="exportar">⬇ Exportar</button>
          <button class="btn sm" data-act="importar">⬆ Importar</button>
          <button class="btn sm ghost" style="color:#f87171" data-act="resetar">Apagar tudo</button>
        </div>
        <input type="file" id="fileIn" accept="application/json" hidden>
      </div>
      ${installPrompt ? `<div class="card row"><span style="font-size:26px">📲</span><div class="grow"><b>Instalar no celular</b><br><small class="muted">Vira app na tela inicial e funciona sem internet.</small></div><button class="btn sm primary" data-act="instalar">Instalar</button></div>` : ""}
      <p class="muted small center" style="margin-top:22px">Projeto Tanquinho · feito pra você 💜<br>Não substitui orientação de médico/nutricionista.</p>
    </section>`;
  }

  function grafico() {
    const campo = ui.graf;
    const pts = S.medidas.filter((m) => m[campo]).map((m) => ({ d: m.data, v: m[campo] }));
    if (campo === "peso" && !pts.length) pts.push({ d: hojeKey(), v: PERFIL.pesoInicial });
    if (pts.length < 2) return `<p class="muted center" style="padding:30px 10px">📈 Registre ${campo === "peso" ? "o peso" : "a cintura"} em pelo menos 2 dias pra ver o gráfico.</p>`;
    const W = 320, H = 190, pl = 34, pr = 10, pt = 14, pb = 26;
    const vals = pts.map((p) => p.v);
    if (campo === "peso") vals.push(PERFIL.pesoMeta);
    let mn = Math.min(...vals), mx = Math.max(...vals);
    const padv = Math.max(0.5, (mx - mn) * 0.15); mn -= padv; mx += padv;
    const X = (i) => pl + (i / (pts.length - 1)) * (W - pl - pr);
    const Y = (v) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
    const area = `${line} L${X(pts.length - 1).toFixed(1)} ${H - pb} L${pl} ${H - pb}Z`;
    const ticks = [mn + padv, (mn + mx) / 2, mx - padv];
    const dd = (s) => s.slice(8) + "/" + s.slice(5, 7);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient>
      <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".35"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,.07)"/><text x="${pl - 6}" y="${Y(t) + 4}" fill="#6b6b85" font-size="10" text-anchor="end">${fmt1(t)}</text>`).join("")}
      ${campo === "peso" ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(PERFIL.pesoMeta)}" y2="${Y(PERFIL.pesoMeta)}" stroke="#22c55e" stroke-dasharray="5 5" stroke-width="1.5"/><text x="${W - pr}" y="${Y(PERFIL.pesoMeta) - 5}" fill="#4ade80" font-size="10" text-anchor="end">meta ${PERFIL.pesoMeta} kg</text>` : ""}
      <path d="${area}" fill="url(#ca)"/>
      <path class="ln" d="${line}"/>
      ${pts.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.v)}" r="${pts.length > 20 ? 2 : 3.5}" fill="#fff" stroke="#ec4899" stroke-width="2"/>`).join("")}
      <text x="${pl}" y="${H - 6}" fill="#6b6b85" font-size="10">${dd(pts[0].d)}</text>
      <text x="${W - pr}" y="${H - 6}" fill="#6b6b85" font-size="10" text-anchor="end">${dd(pts[pts.length - 1].d)}</text>
    </svg>`;
  }

  // =============================================================
  //  RENDER
  // =============================================================
  const app = $("#app");
  const VIEWS = { hoje: viewHoje, treino: viewTreino, dieta: viewDieta, agua: viewAgua, progresso: viewProgresso };

  function render(animar = false) {
    app.innerHTML = VIEWS[ui.tab]();
    if (!animar) app.querySelector(".view")?.style.setProperty("animation", "none");
    const aplicar = () => {
      app.querySelectorAll("[data-off]").forEach((el) => (el.style.strokeDashoffset = el.dataset.off));
      app.querySelectorAll("[data-w]").forEach((el) => (el.style.width = el.dataset.w));
      app.querySelectorAll("[data-y]").forEach((el) => (el.style.transform = `translateY(${el.dataset.y}px)`));
    };
    if (animar) requestAnimationFrame(() => requestAnimationFrame(aplicar));
    else {
      // sem animação de entrada: aplica direto, sem transição
      app.querySelectorAll("[data-off],[data-w],[data-y]").forEach((el) => (el.style.transition = "none"));
      aplicar();
      requestAnimationFrame(() => app.querySelectorAll("[data-off],[data-w],[data-y]").forEach((el) => (el.style.transition = "")));
    }
    document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ui.tab));
    if (typeof ANIM !== "undefined") ANIM.mount(app);
  }

  function irPara(tab) {
    if (ui.tab === tab) return window.scrollTo({ top: 0, behavior: "smooth" });
    ui.tab = tab;
    window.scrollTo(0, 0);
    render(true);
    try { history.replaceState(null, "", "#" + tab); } catch (e) { /* file:// */ }
  }

  $("#tabbar").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (b) { irPara(b.dataset.tab); vib(8); }
  });

  // =============================================================
  //  AÇÕES
  // =============================================================
  const ACT = {
    tab: (b) => irPara(b.dataset.tab),
    irTreino: () => { ui.treinoDia = planoIdx(); irPara("treino"); },
    diaTreino: (b) => { ui.treinoDia = +b.dataset.w; render(true); },
    trocar: (b) => { dia().plano = +b.dataset.w; save(); toast(`🔁 Hoje você vai fazer: ${SEMANA[+b.dataset.w].titulo}`); render(true); },
    destrocar: () => { delete dia().plano; save(); ui.treinoDia = planoIdx(); render(true); },
    abrir: (b) => { const id = b.dataset.id; ui.aberto.has(id) ? ui.aberto.delete(id) : ui.aberto.add(id); render(); },

    set: (b) => {
      const id = b.dataset.id, i = +b.dataset.i, ex = EX[id];
      const d = dia(); const arr = (d.sets[id] ||= []);
      if (ex.tipo === "tempo" && !arr[i]) {
        openPlayer(ex.nome, [
          { nome: ex.nome, emoji: ex.emoji, anim: id, seg: 5, fase: "prep", dica: "Se posiciona…" },
          { nome: ex.nome, emoji: ex.emoji, anim: id, seg: ex.seg, fase: "work", dica: ex.como[ex.como.length - 1] },
        ], () => { arr[i] = true; save(); posSerie(ex, id); });
        return;
      }
      arr[i] = !arr[i];
      save();
      if (arr[i]) { vib(25); posSerie(ex, id); } else render();
    },

    aquecer: () => {
      const steps = [{ nome: "Aquecimento", emoji: "🔥", anim: AQUECIMENTO[0].anim, seg: 5, fase: "prep", dica: "Bora soltar o corpo!" }]
        .concat(AQUECIMENTO.map((a) => ({ nome: a.nome, emoji: a.emoji, anim: a.anim, seg: a.seg, fase: "work", dica: a.dica })));
      openPlayer("Aquecimento", steps, () => { dia().aquec = true; save(); render(); });
    },
    hiit: () => {
      const p = SEMANA[planoIdx()];
      const H = p.hiit === "curto" ? HIIT_CURTO : HIIT_LONGO;
      const steps = [{ nome: "Prepara!", emoji: "⚡", anim: H.exercicios[0].anim, seg: 10, fase: "prep", dica: `${H.rodadas} rodadas de ${H.exercicios.length} exercícios` }];
      for (let r = 0; r < H.rodadas; r++) {
        H.exercicios.forEach((e, i) => {
          steps.push({ nome: e.nome, emoji: e.emoji, anim: e.anim, seg: H.trabalho, fase: "work", dica: `Rodada ${r + 1} de ${H.rodadas} · vai com tudo!` });
          const ultimo = i === H.exercicios.length - 1;
          const prox = H.exercicios[(i + 1) % H.exercicios.length].anim;
          if (!(ultimo && r === H.rodadas - 1)) {
            steps.push(ultimo
              ? { nome: "Descanso entre rodadas", emoji: "😮‍💨", anim: prox, seg: 40, fase: "rest", dica: "Bebe um gole d'água." }
              : { nome: "Descansa", emoji: "😮‍💨", anim: prox, seg: H.descanso, fase: "rest", dica: "Respira pelo nariz." });
          }
        });
      }
      openPlayer(H.nome, steps, () => { dia().hiit = true; save(); checaTreino(); render(); });
    },
    ativ: (b) => { const d = dia(); d.ativ[b.dataset.i] = !d.ativ[b.dataset.i]; save(); vib(20); checaTreino(); render(); },
    habito: (b) => { const d = dia(); d.habitos[b.dataset.id] = !d.habitos[b.dataset.id]; save(); vib(20); render(); },

    dietaSeg: (b) => { ui.dietaSeg = b.dataset.id; render(true); },
    opcao: (b) => {
      const d = dia();
      S.escolhas[b.dataset.m] = +b.dataset.i;
      if (d.refeicoes[b.dataset.m] !== undefined) d.refeicoes[b.dataset.m] = +b.dataset.i;
      save(); render();
    },
    comer: (b) => {
      const d = dia(), m = b.dataset.m;
      if (d.refeicoes[m] !== undefined) delete d.refeicoes[m];
      else { d.refeicoes[m] = +b.dataset.i; vib(25); }
      save();
      const mc = macrosComidos();
      if (d.refeicoes[m] !== undefined && mc.p >= PERFIL.proteinaMeta && !d.festaProt) { d.festaProt = true; d.habitos.proteina = true; save(); confetti(); toast("🥩 Meta de proteína batida!"); }
      render();
    },
    compra: (b) => { S.compras[b.dataset.id] = !S.compras[b.dataset.id]; save(); render(); },
    limparCompras: () => { S.compras = {}; save(); render(); },

    agua: (b) => addAgua(+b.dataset.ml, b),
    aguaUndo: () => { const d = dia(); d.agua.pop(); save(); render(); },
    aguaDel: (b) => { const d = dia(); d.agua.splice(+b.dataset.i, 1); save(); render(); },
    lembrete: async () => {
      if (!S.config.lembrete && "Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch (e) { /* ignore */ }
      }
      S.config.lembrete = !S.config.lembrete; save(); render();
      if (S.config.lembrete) toast("🔔 Lembrete ligado");
    },
    lembreteMin: (b) => { S.config.lembreteMin = +b.dataset.m; save(); render(); },

    graf: (b) => { ui.graf = b.dataset.id; render(); },
    medSalvar: () => {
      const p = parseFloat(String($("#inPeso").value).replace(",", "."));
      const c = parseFloat(String($("#inCint").value).replace(",", "."));
      if (!(p > 30 && p < 250)) return toast("Coloca um peso válido 🙂");
      const reg = { data: hojeKey(), peso: Math.round(p * 10) / 10 };
      if (c > 40 && c < 200) reg.cintura = Math.round(c * 10) / 10;
      const last = S.medidas[S.medidas.length - 1];
      if (last && last.data === reg.data) S.medidas[S.medidas.length - 1] = reg; else S.medidas.push(reg);
      save(); vib(30);
      const ant = S.medidas.length > 1 ? S.medidas[S.medidas.length - 2].peso : PERFIL.pesoInicial;
      toast(reg.peso < ant ? `📉 −${fmt1(ant - reg.peso)} kg! Tá indo!` : "✅ Medida salva");
      if (reg.peso <= PERFIL.pesoMeta) confetti();
      render(true);
    },
    medDel: (b) => { if (confirm("Apagar esta medida?")) { S.medidas.splice(+b.dataset.i, 1); save(); render(); } },
    cfg: (b) => { S.config[b.dataset.id] = !S.config[b.dataset.id]; save(); render(); },
    exportar: () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `tanquinho-backup-${hojeKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    importar: () => $("#fileIn").click(),
    resetar: () => {
      if (confirm("Apagar TODOS os dados do app? Isso não tem volta.") && confirm("Certeza mesmo?")) { S = padrao(); save(); toast("Tudo zerado"); render(true); }
    },
    instalar: async () => { if (!installPrompt) return; installPrompt.prompt(); try { await installPrompt.userChoice; } catch (e) { /* */ } installPrompt = null; render(); },
  };

  app.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    unlockAudio();
    const fn = ACT[b.dataset.act];
    if (fn) fn(b, e);
  });
  app.addEventListener("change", (e) => {
    if (e.target.id !== "fileIn" || !e.target.files[0]) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || typeof s !== "object" || !s.dias) throw new Error("x");
        const d = padrao(); S = { ...d, ...s, config: { ...d.config, ...(s.config || {}) } }; save();
        toast("✅ Backup importado"); render(true);
      } catch (err) { toast("Arquivo inválido 😕"); }
    };
    r.readAsText(e.target.files[0]);
  });

  function posSerie(ex, id) {
    const d = dia(), p = SEMANA[planoIdx()];
    const feitas = (d.sets[id] || []).filter(Boolean).length;
    let label;
    if (feitas < ex.series) label = `Próxima: ${ex.nome} · série ${feitas + 1}`;
    else {
      const idx = p.exercicios.indexOf(id);
      const prox = p.exercicios.slice(idx + 1).concat(p.exercicios.slice(0, idx)).find((x) => ((d.sets[x] || []).filter(Boolean).length < EX[x].series));
      label = prox ? `Próximo: ${EX[prox].nome}` : p.hiit && !d.hiit ? "Próximo: HIIT! ⚡" : "Último descanso 🏁";
      if (feitas === ex.series) toast(`✅ ${ex.nome} concluído!`);
    }
    const terminou = checaTreino();
    render();
    if (S.config.autoDescanso && !terminou) startRest(ex.descanso, label);
  }

  function checaTreino() {
    const k = hojeKey(), d = dia(k);
    if (!d.treinoFeito && progressoTreino(planoIdx(k), k) >= 1) {
      d.treinoFeito = true; save();
      stopRest();
      setTimeout(() => { confetti(); fanfarra(); toast(`🏆 Treino concluído! ${streak()} dia(s) seguidos 🔥`); }, 250);
      return true;
    }
    return false;
  }

  function addAgua(ml, el) {
    const d = dia();
    const antes = aguaTotal();
    d.agua.push({ t: Date.now(), ml });
    save(); vib(20); beep(880, 0.08, 0.12);
    if (el) {
      const r = el.getBoundingClientRect();
      const s = document.createElement("div");
      s.className = "drop-anim"; s.textContent = "💧";
      s.style.left = r.left + r.width / 2 - 15 + "px"; s.style.top = r.top + "px";
      document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
    }
    const depois = aguaTotal();
    if (antes < aguaMeta() && depois >= aguaMeta()) { setTimeout(() => { confetti(); toast("💙 Meta de água batida! Mandou bem!"); }, 200); }
    else toast(`💧 +${ml} ml · ${fmt(depois)} / ${fmt(aguaMeta())}`);
    // anima a garrafa subindo
    render();
    const g = app.querySelector("[data-y]");
    if (g) {
      const pctAntes = antes / aguaMeta();
      g.style.transition = "none";
      g.style.transform = `translateY(${205 - clamp(pctAntes, 0, 1.04) * 192}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transition = ""; g.style.transform = `translateY(${g.dataset.y}px)`; }));
    }
    app.querySelectorAll(".pbar.water i").forEach((i) => { i.style.transition = "none"; i.style.width = clamp(antes / aguaMeta(), 0, 1) * 100 + "%"; requestAnimationFrame(() => requestAnimationFrame(() => { i.style.transition = ""; i.style.width = i.dataset.w; })); });
  }

  // =============================================================
  //  SOM / VIBRAÇÃO / TOAST / CONFETTI
  // =============================================================
  let actx = null;
  function unlockAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
    } catch (e) { /* sem áudio */ }
  }
  function beep(f = 880, dur = 0.15, vol = 0.25, when = 0) {
    if (!S.config.som || !actx) return;
    try {
      const t = actx.currentTime + when;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* */ }
  }
  const fanfarra = () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.22, 0.25, i * 0.13));
  function vib(p) { if (S.config.vibrar && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* */ } }

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function confetti() {
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const cores = ["#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#38bdf8", "#fff"];
    const ps = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: cores[(Math.random() * cores.length) | 0], o: 1,
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (t - t0 > 1600) p.o -= 0.02;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.o); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
      });
      if (t - t0 < 3000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  // =============================================================
  //  TIMER DE DESCANSO
  // =============================================================
  const R = { end: 0, total: 0, iv: null, last: -1 };
  const restBar = $("#restBar"), RC = 2 * Math.PI * 44;
  restBar.style.strokeDasharray = RC;
  function startRest(sec, label) {
    R.total = sec; R.end = Date.now() + sec * 1000; R.last = -1;
    $("#restLabel").textContent = label || "Respira fundo…";
    $("#rest").hidden = false;
    clearInterval(R.iv); R.iv = setInterval(tickRest, 200); tickRest();
  }
  function stopRest() { clearInterval(R.iv); $("#rest").hidden = true; }
  function tickRest() {
    const left = Math.max(0, (R.end - Date.now()) / 1000), s = Math.ceil(left);
    $("#restTime").textContent = s;
    restBar.style.strokeDashoffset = RC * (1 - left / R.total);
    if (s !== R.last && s <= 3 && s > 0) beep(660, 0.1, 0.2);
    R.last = s;
    if (left <= 0) { stopRest(); beep(990, 0.35, 0.3); vib([200, 100, 200]); toast("💪 Bora, próxima série!"); }
  }
  $("#rest").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rest]"); if (!b) return;
    const v = b.dataset.rest;
    if (v === "skip") return stopRest();
    const left = Math.max(0, (R.end - Date.now()) / 1000) + (+v);
    if (left <= 0) return stopRest();
    R.end = Date.now() + left * 1000; R.total = Math.max(R.total, left); tickRest();
  });

  // =============================================================
  //  PLAYER (aquecimento / HIIT / prancha)
  // =============================================================
  const P = { steps: [], i: 0, end: 0, left: 0, paused: false, iv: null, onDone: null, last: -1, done: false, wake: null };
  const pBar = $("#pBar"), PC = 2 * Math.PI * 90;
  pBar.style.strokeDasharray = PC;
  const FASES = { prep: "PREPARA", work: "VAI!", rest: "DESCANSO", done: "CONCLUÍDO" };

  function openPlayer(title, steps, onDone) {
    stopRest();
    unlockAudio();
    Object.assign(P, { steps, i: 0, onDone, paused: false, done: false });
    $("#pTitle").textContent = title;
    $("#player").hidden = false;
    document.body.style.overflow = "hidden";
    wakeOn();
    startStep();
    clearInterval(P.iv); P.iv = setInterval(tickP, 150);
  }
  function startStep() {
    const st = P.steps[P.i];
    P.left = st.seg; P.end = Date.now() + st.seg * 1000; P.last = -1;
    $("#player").dataset.phase = st.fase;
    $("#pPhase").textContent = FASES[st.fase];
    $("#pEmoji").hidden = !!st.anim;
    $("#pEmoji").textContent = st.emoji;
    const fig = $("#pFig");
    fig.hidden = !st.anim;
    fig.classList.toggle("dim", st.fase !== "work");
    if (st.anim && fig.dataset.anim !== st.anim) ANIM.set(fig, st.anim);
    $("#pName").textContent = st.nome;
    $("#pTip").textContent = st.dica || "";
    const nx = P.steps.slice(P.i + 1).find((s) => s.fase === "work");
    $("#pNext").textContent = nx ? `Depois: ${nx.emoji} ${nx.nome}` : "Último! 🏁";
    const works = P.steps.filter((s) => s.fase !== "prep");
    const idxW = P.steps.slice(0, P.i + 1).filter((s) => s.fase !== "prep").length;
    $("#pCount").textContent = `${Math.max(idxW, 1)}/${works.length}`;
    $("#pPlay").textContent = P.paused ? "▶" : "❚❚";
    $("#pDots").innerHTML = P.steps.length <= 60 ? P.steps.map((s, i) => `<i class="${i < P.i ? "d" : i === P.i ? "c" : ""}"></i>`).join("") : "";
    tickP(true);
  }
  function tickP(force) {
    if (P.done || (P.paused && force !== true)) return;
    const left = P.paused ? P.left : Math.max(0, (P.end - Date.now()) / 1000);
    const s = Math.ceil(left), st = P.steps[P.i];
    const tEl = $("#pTime");
    tEl.textContent = s;
    pBar.style.strokeDashoffset = PC * (1 - left / st.seg);
    if (s !== P.last && !P.paused) {
      if (s <= 3 && s > 0 && P.last !== -1) { beep(660, 0.12, 0.25); tEl.classList.remove("tick"); void tEl.offsetWidth; tEl.classList.add("tick"); vib(40); }
      if (st.fase === "work" && st.seg >= 30 && s === Math.floor(st.seg / 2) && P.last !== -1) beep(520, 0.1, 0.12);
    }
    P.last = s;
    if (left <= 0 && !P.paused) nextStep();
  }
  function nextStep() {
    if (P.i < P.steps.length - 1) {
      P.i++;
      const st = P.steps[P.i];
      if (st.fase === "work") { beep(1046, 0.3, 0.3); vib([120, 60, 120]); } else { beep(523, 0.35, 0.25); vib(250); }
      startStep();
    } else finishPlayer();
  }
  function finishPlayer() {
    P.done = true; clearInterval(P.iv);
    $("#player").dataset.phase = "done";
    $("#pPhase").textContent = FASES.done;
    $("#pEmoji").textContent = "🏆";
    $("#pEmoji").hidden = false;
    $("#pFig").hidden = true;
    $("#pTime").textContent = "✓";
    $("#pName").textContent = "Mandou bem!";
    $("#pTip").textContent = "Respira, bebe água e segue o plano. 💪";
    $("#pNext").textContent = "";
    $("#pPlay").textContent = "OK";
    pBar.style.strokeDashoffset = 0;
    $("#pDots").querySelectorAll("i").forEach((i) => (i.className = "d"));
    fanfarra(); vib([100, 50, 100, 50, 300]); confetti();
    const cb = P.onDone; P.onDone = null;
    if (cb) cb();
  }
  function closePlayer() {
    clearInterval(P.iv); $("#player").hidden = true; document.body.style.overflow = ""; wakeOff();
  }
  $("#pPlay").addEventListener("click", () => {
    unlockAudio();
    if (P.done) return closePlayer();
    if (P.paused) { P.paused = false; P.end = Date.now() + P.left * 1000; $("#pPlay").textContent = "❚❚"; }
    else { P.left = Math.max(0, (P.end - Date.now()) / 1000); P.paused = true; $("#pPlay").textContent = "▶"; }
  });
  $("#pSkip").addEventListener("click", () => { if (!P.done) { P.paused = false; nextStep(); } });
  $("#pPrev").addEventListener("click", () => { if (!P.done && P.i > 0) { P.i--; P.paused = false; startStep(); } });
  $("#pClose").addEventListener("click", () => {
    if (P.done || confirm("Sair do timer? O progresso desse bloco não será marcado.")) closePlayer();
  });

  async function wakeOn() { try { if ("wakeLock" in navigator) P.wake = await navigator.wakeLock.request("screen"); } catch (e) { /* */ } }
  function wakeOff() { try { P.wake && P.wake.release(); } catch (e) { /* */ } P.wake = null; }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (!$("#player").hidden && !P.done) wakeOn();
      if (dataRender !== hojeKey()) { dataRender = hojeKey(); ui.treinoDia = null; render(); } // virou o dia
    }
  });
  let dataRender = hojeKey();

  // =============================================================
  //  LEMBRETE DE ÁGUA
  // =============================================================
  function checaLembrete() {
    if (!S.config.lembrete) return;
    const now = new Date(), h = now.getHours();
    if (h < 8 || h >= 22) return;
    const atraso = aguaEsperada(now) - aguaTotal();
    if (atraso < 200) return;
    if (Date.now() - (S.config.lastLembrete || 0) < S.config.lembreteMin * 60000) return;
    S.config.lastLembrete = Date.now(); save();
    const corpo = `Você está ${fmt(Math.round(atraso / 50) * 50)} ml atrás da meta. Bebe um copo agora! 💧`;
    if ("Notification" in window && Notification.permission === "granted") {
      const opts = { body: corpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "agua", renotify: true, vibrate: [200, 100, 200] };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then((r) => r.showNotification("Hora da água 💧", opts)).catch(() => {});
      else try { new Notification("Hora da água 💧", opts); } catch (e) { /* */ }
    }
    if (document.visibilityState === "visible") toast("💧 " + corpo);
  }
  setInterval(checaLembrete, 60000);
  setTimeout(checaLembrete, 5000);

  // =============================================================
  //  PWA
  // =============================================================
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; if (ui.tab === "progresso") render(); });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // gradiente global dos anéis
  document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs></svg>`);

  // start
  const h0 = (location.hash || "").slice(1);
  if (VIEWS[h0]) ui.tab = h0;
  render(true);
})();
