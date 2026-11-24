// ===============================================================
//  DADOS DO APP — edite aqui pra mudar treino, dieta e metas
// ===============================================================

const PERFIL = {
  idade: 22,
  altura: 1.69,
  pesoInicial: 71,
  pesoMeta: 65,
  kcalMeta: 2000,
  proteinaMeta: 130, // gramas
  aguaMeta: 2500, // ml
  passosMeta: 9000,
};

// ---------------- ÁGUA: quanto já deveria ter bebido até cada horário
const AGUA_CHECKPOINTS = [
  { hora: 9, ml: 500, label: "Ao acordar + café" },
  { hora: 12, ml: 1000, label: "Até o almoço" },
  { hora: 15, ml: 1500, label: "Meio da tarde" },
  { hora: 18, ml: 2000, label: "Fim da tarde / treino" },
  { hora: 21, ml: 2500, label: "Até a noite" },
];

// ---------------- AQUECIMENTO (todo dia, ~5 min)
const AQUECIMENTO = [
  { nome: "Polichinelo", emoji: "⭐", seg: 60, dica: "Ritmo leve, só pra esquentar." },
  { nome: "Agachamento livre", emoji: "🦵", seg: 40, dica: "10 reps devagar, desce até onde for confortável." },
  { nome: "Rotação de braços", emoji: "🔄", seg: 30, dica: "10 pra frente, 10 pra trás." },
  { nome: "Gato-vaca", emoji: "🐈", seg: 40, dica: "De quatro apoios: arredonda e arqueia as costas, 10x." },
  { nome: "Afundo com giro de tronco", emoji: "🌀", seg: 40, dica: "Abre o quadril e a coluna, 5 de cada lado." },
  { nome: "Prancha", emoji: "🧱", seg: 20, dica: "Barriga contraída, quadril alinhado." },
];

// ---------------- BIBLIOTECA DE EXERCÍCIOS
// tipo "reps" = séries x repetições | tipo "tempo" = segura X segundos
const EX = {
  bulgaro: {
    nome: "Agachamento búlgaro", emoji: "🦵", tipo: "reps", series: 4, reps: "8–12 cada perna", descanso: 75,
    como: ["Pé de trás apoiado no sofá ou cadeira.", "Desce reto até o joelho de trás quase encostar no chão.", "Sobe empurrando pelo calcanhar da frente."],
    facil: "Sem apoio atrás (afundo parado)", dificil: "Com mochila pesada nas costas",
  },
  agachMochila: {
    nome: "Agachamento com mochila", emoji: "🎒", tipo: "reps", series: 3, reps: "15–20", descanso: 60,
    como: ["Mochila com livros/garrafas nas costas.", "Pés na largura dos ombros, desce até a coxa ficar paralela.", "Peito aberto, joelho acompanhando a ponta do pé."],
    facil: "Sem mochila", dificil: "Desce em 3 segundos + pausa embaixo",
  },
  pelvicaUni: {
    nome: "Elevação pélvica 1 perna", emoji: "🍑", tipo: "reps", series: 3, reps: "12 cada", descanso: 60,
    como: ["Deitado, um pé no chão e a outra perna esticada.", "Sobe o quadril apertando o glúteo.", "Segura 1 segundo lá em cima."],
    facil: "Com as duas pernas", dificil: "Costas apoiadas no sofá",
  },
  afundoTras: {
    nome: "Afundo para trás", emoji: "↩️", tipo: "reps", series: 3, reps: "10 cada", descanso: 60,
    como: ["Dá um passo largo para trás.", "Desce até os dois joelhos fazerem 90°.", "Volta empurrando pela perna da frente."],
    facil: "Segurando numa cadeira", dificil: "Com mochila",
  },
  panturrilha: {
    nome: "Panturrilha 1 perna", emoji: "🦶", tipo: "reps", series: 3, reps: "15 cada", descanso: 45,
    como: ["Ponta do pé na borda de um degrau.", "Desce o calcanhar o máximo e sobe o máximo.", "Segura na parede para equilíbrio."],
    facil: "Duas pernas", dificil: "Pausa de 2s lá em cima",
  },
  prancha: {
    nome: "Prancha", emoji: "🧱", tipo: "tempo", series: 3, seg: 40, descanso: 45,
    como: ["Antebraços no chão, corpo reto da cabeça ao pé.", "Aperta barriga e glúteo.", "Não deixa o quadril cair nem subir."],
    facil: "Com joelhos no chão", dificil: "Tira um pé do chão",
  },
  flexao: {
    nome: "Flexão", emoji: "💪", tipo: "reps", series: 4, reps: "8–15", descanso: 75,
    como: ["Mãos um pouco mais abertas que os ombros.", "Corpo reto, desce até o peito quase encostar.", "Cotovelos a ~45° do corpo, não abertos."],
    facil: "Mãos apoiadas no sofá/mesa", dificil: "Pés elevados no sofá",
  },
  pike: {
    nome: "Flexão pike (ombro)", emoji: "🔺", tipo: "reps", series: 3, reps: "8–12", descanso: 75,
    como: ["Faz um 'V' de cabeça pra baixo com o corpo.", "Desce a cabeça em direção ao chão entre as mãos.", "Empurra de volta."],
    facil: "Pés mais perto das mãos e amplitude menor", dificil: "Pés elevados na cadeira",
  },
  mergulho: {
    nome: "Mergulho na cadeira", emoji: "🪑", tipo: "reps", series: 3, reps: "10–15", descanso: 60,
    como: ["Mãos na beirada de uma cadeira firme, atrás do corpo.", "Desce dobrando os cotovelos até 90°.", "Sobe esticando o braço (tríceps)."],
    facil: "Joelhos dobrados", dificil: "Pernas esticadas em outra cadeira",
  },
  diamante: {
    nome: "Flexão diamante", emoji: "💎", tipo: "reps", series: 2, reps: "até falhar", descanso: 60,
    como: ["Mãos juntas formando um losango embaixo do peito.", "Cotovelos colados no corpo.", "Desce controlado."],
    facil: "Com joelhos no chão", dificil: "Descida em 3 segundos",
  },
  barra: {
    nome: "Barra fixa (ou negativa)", emoji: "🧗", tipo: "reps", series: 4, reps: "máximo", descanso: 90,
    como: ["Pega pronada, um pouco mais aberta que os ombros.", "Sem conseguir subir? Pula até o topo e desce em 4–5 segundos.", "Vale ouro pras costas: compra uma barra de porta!"],
    facil: "Só ficar pendurado 20–30s", dificil: "Com mochila",
  },
  remadaMesa: {
    nome: "Remada invertida na mesa", emoji: "🛏️", tipo: "reps", series: 4, reps: "8–12", descanso: 75,
    como: ["Deita embaixo de uma mesa BEM firme.", "Segura a borda e puxa o peito até a mesa.", "Corpo reto, aperta as escápulas."],
    facil: "Joelhos dobrados", dificil: "Pernas esticadas e pausa em cima",
  },
  remadaMochila: {
    nome: "Remada unilateral com mochila", emoji: "🎒", tipo: "reps", series: 3, reps: "12 cada", descanso: 60,
    como: ["Apoia uma mão e um joelho no sofá.", "Puxa a mochila até a cintura.", "Desce devagar."],
    facil: "Mochila mais leve", dificil: "Mais peso + pausa em cima",
  },
  rosca: {
    nome: "Rosca com mochila", emoji: "💪", tipo: "reps", series: 3, reps: "12–15", descanso: 45,
    como: ["Segura a mochila pela alça com as palmas pra cima.", "Sobe dobrando só o cotovelo.", "Desce em 3 segundos."],
    facil: "Menos peso", dificil: "Rosca com toalha + mochila",
  },
  flexaoInclinada: {
    nome: "Flexão inclinada", emoji: "📐", tipo: "reps", series: 3, reps: "12–15", descanso: 60,
    como: ["Mãos no sofá ou mesa.", "Corpo reto, peito vai até o apoio.", "Ótima pra volume de peito."],
    facil: "Apoio mais alto", dificil: "Apoio mais baixo",
  },
  hollow: {
    nome: "Hollow hold (banana)", emoji: "🍌", tipo: "tempo", series: 3, seg: 25, descanso: 45,
    como: ["Deitado, lombar COLADA no chão.", "Tira ombros e pernas do chão, braços pra trás.", "Segura sem deixar a lombar descolar."],
    facil: "Joelhos dobrados", dificil: "Pernas mais baixas",
  },
  agachPausa: {
    nome: "Agachamento com pausa", emoji: "⏸️", tipo: "reps", series: 4, reps: "12–15", descanso: 75,
    como: ["Com mochila.", "Desce e segura 2 segundos lá embaixo.", "Sobe explosivo."],
    facil: "Sem mochila", dificil: "Pausa de 4 segundos",
  },
  stiff: {
    nome: "Stiff 1 perna", emoji: "🦩", tipo: "reps", series: 3, reps: "10 cada", descanso: 60,
    como: ["Em pé numa perna, mochila na mão.", "Leva o quadril pra trás inclinando o tronco, costas retas.", "Sente alongar a parte de trás da coxa e volta."],
    facil: "Duas pernas", dificil: "Mais peso",
  },
  degrau: {
    nome: "Subida no degrau", emoji: "🪜", tipo: "reps", series: 3, reps: "10 cada", descanso: 60,
    como: ["Cadeira firme ou degrau alto.", "Sobe empurrando só com a perna de cima.", "Desce devagar."],
    facil: "Degrau mais baixo", dificil: "Com mochila",
  },
  sumo: {
    nome: "Agachamento sumô", emoji: "🤼", tipo: "reps", series: 3, reps: "15", descanso: 60,
    como: ["Pés bem abertos, pontas pra fora.", "Mochila segurada na frente.", "Desce reto, joelhos pra fora."],
    facil: "Sem peso", dificil: "Pausa embaixo",
  },
  elevPernas: {
    nome: "Elevação de pernas", emoji: "🦿", tipo: "reps", series: 3, reps: "12–15", descanso: 45,
    como: ["Deitado, mãos embaixo do quadril.", "Sobe as pernas esticadas até 90°.", "Desce devagar sem encostar no chão."],
    facil: "Joelhos dobrados", dificil: "Pendurado na barra",
  },
  pranchaLateral: {
    nome: "Prancha lateral", emoji: "📏", tipo: "tempo", series: 3, seg: 30, descanso: 30,
    como: ["De lado, apoiado no antebraço.", "Quadril alto, corpo reto.", "Faz os dois lados em cada série."],
    facil: "Joelho de baixo no chão", dificil: "Eleva a perna de cima",
  },
  canivete: {
    nome: "Abdominal canivete", emoji: "✂️", tipo: "reps", series: 3, reps: "12", descanso: 30,
    como: ["Deitado com braços e pernas esticados.", "Sobe mãos e pés ao mesmo tempo pra se encontrarem.", "Desce controlado."],
    facil: "Joelhos dobrados (tuck)", dificil: "Mais lento",
  },
  deadBug: {
    nome: "Dead bug", emoji: "🪲", tipo: "reps", series: 3, reps: "10 cada lado", descanso: 30,
    como: ["Barriga pra cima, braços e joelhos pro alto.", "Estica braço e perna opostos devagar.", "Lombar sempre colada no chão."],
    facil: "Só as pernas", dificil: "Mais devagar",
  },
  bicicleta: {
    nome: "Abdominal bicicleta", emoji: "🚲", tipo: "reps", series: 3, reps: "20", descanso: 30,
    como: ["Mãos atrás da cabeça sem puxar o pescoço.", "Cotovelo vai no joelho oposto.", "Gira o tronco, não só o cotovelo."],
    facil: "Mais devagar", dificil: "Pausa em cada lado",
  },
};

// ---------------- HIIT
const HIIT_CURTO = {
  nome: "HIIT 10 min", trabalho: 40, descanso: 20, rodadas: 2,
  exercicios: [
    { nome: "Mountain climber", emoji: "⛰️" },
    { nome: "Polichinelo", emoji: "⭐" },
    { nome: "Agachamento com salto", emoji: "🦘" },
    { nome: "Burpee", emoji: "🔥" },
    { nome: "Corrida parada (joelho alto)", emoji: "🏃" },
  ],
};
const HIIT_LONGO = {
  nome: "HIIT 20 min", trabalho: 40, descanso: 20, rodadas: 4,
  exercicios: [
    { nome: "Burpee", emoji: "🔥" },
    { nome: "Agachamento com salto", emoji: "🦘" },
    { nome: "Mountain climber", emoji: "⛰️" },
    { nome: "Afundo alternado com salto", emoji: "⚡" },
    { nome: "Polichinelo", emoji: "⭐" },
  ],
};

// ---------------- SEMANA (índice = getDay(): 0 domingo ... 6 sábado)
const SEMANA = [
  {
    dia: "Domingo", titulo: "Descanso ativo", emoji: "🌿", cor: "#22c55e",
    resumo: "Caminhada leve 30–60 min + alongamento. O músculo cresce no descanso!",
    exercicios: [], hiit: null,
    atividades: ["Caminhada leve 30–60 min", "Alongamento 10 min", "Planejar as refeições da semana"],
  },
  {
    dia: "Segunda", titulo: "Pernas + Core", emoji: "🦵", cor: "#8b5cf6",
    resumo: "Base do corpo: perna forte queima mais caloria o dia todo.",
    exercicios: ["bulgaro", "agachMochila", "pelvicaUni", "afundoTras", "panturrilha", "prancha"], hiit: null,
  },
  {
    dia: "Terça", titulo: "Peito, Ombro, Tríceps + HIIT", emoji: "💪", cor: "#f43f5e",
    resumo: "Empurrar + 10 min de HIIT no final pra acelerar a queima.",
    exercicios: ["flexao", "pike", "mergulho", "diamante"], hiit: "curto",
  },
  {
    dia: "Quarta", titulo: "Cardio leve + Mobilidade", emoji: "🚶", cor: "#0ea5e9",
    resumo: "Caminhada rápida 40–60 min. Simples e queima muita gordura.",
    exercicios: [], hiit: null,
    atividades: ["Caminhada rápida 40–60 min (ou bike)", "Alongamento de quadril 3 min", "Alongamento posterior de coxa 3 min", "Alongamento de peito 2 min"],
  },
  {
    dia: "Quinta", titulo: "Pernas + Core (B)", emoji: "🍑", cor: "#a855f7",
    resumo: "Variação de pernas focada em posterior e glúteo.",
    exercicios: ["agachPausa", "stiff", "degrau", "sumo", "elevPernas", "pranchaLateral"], hiit: null,
  },
  {
    dia: "Sexta", titulo: "Costas, Bíceps + Peito", emoji: "🧗", cor: "#f59e0b",
    resumo: "Puxar: costas largas deixam a cintura visualmente mais fina.",
    exercicios: ["barra", "remadaMesa", "remadaMochila", "rosca", "flexaoInclinada", "hollow"], hiit: null,
  },
  {
    dia: "Sábado", titulo: "Condicionamento + Abdômen", emoji: "🔥", cor: "#ef4444",
    resumo: "20 min de HIIT + circuito de abdômen. O dia mais suado!",
    exercicios: ["canivete", "deadBug", "bicicleta", "prancha"], hiit: "longo",
  },
];

// ---------------- DIETA (~2000 kcal / ~130 g proteína)
// cada refeição tem opções; o app soma as opções escolhidas
const DIETA = [
  {
    id: "cafe", nome: "Café da manhã", hora: "07:30", emoji: "☀️", cor: "#f59e0b",
    opcoes: [
      {
        nome: "Ovos + pão + fruta",
        itens: [
          { nome: "Ovos mexidos", qtd: "3 unidades", emoji: "🍳", kcal: 210, p: 18, c: 1, g: 15 },
          { nome: "Pão francês", qtd: "1 unidade", emoji: "🥖", kcal: 140, p: 4, c: 28, g: 2 },
          { nome: "Banana", qtd: "1 média", emoji: "🍌", kcal: 90, p: 1, c: 23, g: 0 },
          { nome: "Café sem açúcar", qtd: "1 xícara", emoji: "☕", kcal: 5, p: 0, c: 1, g: 0 },
        ],
      },
      {
        nome: "Tapioca de frango",
        itens: [
          { nome: "Tapioca", qtd: "3 col. sopa de goma", emoji: "🫓", kcal: 170, p: 0, c: 42, g: 0 },
          { nome: "Frango desfiado", qtd: "80 g", emoji: "🍗", kcal: 130, p: 25, c: 0, g: 3 },
          { nome: "Queijo branco", qtd: "1 fatia (30 g)", emoji: "🧀", kcal: 80, p: 5, c: 1, g: 6 },
          { nome: "Mamão", qtd: "1 fatia", emoji: "🍈", kcal: 45, p: 0, c: 11, g: 0 },
        ],
      },
    ],
  },
  {
    id: "lanche1", nome: "Lanche da manhã", hora: "10:00", emoji: "🍎", cor: "#22c55e",
    opcoes: [
      {
        nome: "Iogurte com aveia",
        itens: [
          { nome: "Iogurte natural", qtd: "1 pote (170 g)", emoji: "🥛", kcal: 110, p: 7, c: 9, g: 5 },
          { nome: "Aveia", qtd: "2 col. sopa", emoji: "🌾", kcal: 75, p: 3, c: 12, g: 2 },
          { nome: "Mel", qtd: "1 col. chá", emoji: "🍯", kcal: 20, p: 0, c: 5, g: 0 },
        ],
      },
      {
        nome: "Fruta + amendoim",
        itens: [
          { nome: "Maçã", qtd: "1 média", emoji: "🍎", kcal: 70, p: 0, c: 19, g: 0 },
          { nome: "Amendoim torrado", qtd: "1 punhado (20 g)", emoji: "🥜", kcal: 115, p: 5, c: 3, g: 10 },
        ],
      },
    ],
  },
  {
    id: "almoco", nome: "Almoço", hora: "12:30", emoji: "🍛", cor: "#ef4444",
    opcoes: [
      {
        nome: "Prato feito com frango",
        itens: [
          { nome: "Arroz", qtd: "4 col. sopa (100 g)", emoji: "🍚", kcal: 130, p: 3, c: 28, g: 0 },
          { nome: "Feijão", qtd: "1 concha", emoji: "🫘", kcal: 75, p: 5, c: 13, g: 1 },
          { nome: "Frango grelhado", qtd: "150 g (palma da mão grande)", emoji: "🍗", kcal: 240, p: 45, c: 0, g: 5 },
          { nome: "Salada à vontade", qtd: "+ 1 col. chá de azeite", emoji: "🥗", kcal: 55, p: 1, c: 4, g: 4 },
        ],
      },
      {
        nome: "Carne moída com legumes",
        itens: [
          { nome: "Arroz", qtd: "4 col. sopa (100 g)", emoji: "🍚", kcal: 130, p: 3, c: 28, g: 0 },
          { nome: "Feijão", qtd: "1 concha", emoji: "🫘", kcal: 75, p: 5, c: 13, g: 1 },
          { nome: "Patinho moído", qtd: "130 g", emoji: "🥩", kcal: 250, p: 35, c: 0, g: 12 },
          { nome: "Legumes refogados", qtd: "abobrinha, cenoura...", emoji: "🥕", kcal: 60, p: 2, c: 10, g: 1 },
        ],
      },
    ],
  },
  {
    id: "lanche2", nome: "Lanche da tarde (pré-treino)", hora: "16:00", emoji: "🥪", cor: "#8b5cf6",
    opcoes: [
      {
        nome: "Sanduíche de atum",
        itens: [
          { nome: "Pão integral", qtd: "2 fatias", emoji: "🍞", kcal: 130, p: 6, c: 24, g: 2 },
          { nome: "Atum em água", qtd: "1 lata", emoji: "🐟", kcal: 110, p: 25, c: 0, g: 1 },
          { nome: "Requeijão light", qtd: "1 col. sopa", emoji: "🧈", kcal: 30, p: 2, c: 1, g: 2 },
        ],
      },
      {
        nome: "Whey + banana",
        itens: [
          { nome: "Whey protein", qtd: "1 scoop (30 g)", emoji: "🥤", kcal: 120, p: 24, c: 3, g: 2 },
          { nome: "Banana", qtd: "1 média", emoji: "🍌", kcal: 90, p: 1, c: 23, g: 0 },
        ],
      },
    ],
  },
  {
    id: "jantar", nome: "Jantar", hora: "19:30", emoji: "🌙", cor: "#0ea5e9",
    opcoes: [
      {
        nome: "Omelete + batata-doce",
        itens: [
          { nome: "Omelete com legumes", qtd: "3 ovos + tomate, cebola", emoji: "🍳", kcal: 230, p: 19, c: 4, g: 15 },
          { nome: "Batata-doce", qtd: "150 g", emoji: "🍠", kcal: 130, p: 2, c: 30, g: 0 },
          { nome: "Salada verde", qtd: "à vontade", emoji: "🥬", kcal: 20, p: 1, c: 3, g: 0 },
        ],
      },
      {
        nome: "Frango/peixe + arroz",
        itens: [
          { nome: "Frango ou tilápia", qtd: "120 g", emoji: "🐠", kcal: 190, p: 30, c: 0, g: 5 },
          { nome: "Arroz", qtd: "4 col. sopa (100 g)", emoji: "🍚", kcal: 130, p: 3, c: 28, g: 0 },
          { nome: "Brócolis / legumes", qtd: "1 prato de sobremesa", emoji: "🥦", kcal: 50, p: 3, c: 8, g: 0 },
        ],
      },
    ],
  },
  {
    id: "ceia", nome: "Ceia", hora: "22:00", emoji: "🌜", cor: "#64748b",
    opcoes: [
      {
        nome: "Leite com cacau",
        itens: [
          { nome: "Leite desnatado", qtd: "1 copo (200 ml)", emoji: "🥛", kcal: 70, p: 6, c: 10, g: 0 },
          { nome: "Cacau em pó 100%", qtd: "1 col. chá", emoji: "🍫", kcal: 15, p: 1, c: 1, g: 1 },
        ],
      },
      {
        nome: "Ovos cozidos",
        itens: [
          { nome: "Ovos cozidos", qtd: "2 unidades", emoji: "🥚", kcal: 140, p: 12, c: 1, g: 10 },
        ],
      },
    ],
  },
];

const REGRAS_DIETA = [
  { emoji: "🥩", titulo: "Proteína em toda refeição", texto: "É o que segura o músculo enquanto a gordura vai embora. Meta: ~130 g/dia." },
  { emoji: "🥤", titulo: "Zero caloria líquida", texto: "Refrigerante, suco de caixinha e álcool travam o resultado. Prefira água, café e chá." },
  { emoji: "🥗", titulo: "Metade do prato é salada/legume", texto: "Enche o estômago com pouca caloria." },
  { emoji: "⚖️", titulo: "Pese por 2 semanas", texto: "Depois você aprende no olho. Arroz e azeite são os que mais enganam." },
  { emoji: "🍕", titulo: "1 refeição livre por semana", texto: "Uma refeição, não um dia inteiro. Aproveita sem culpa e volta no plano." },
  { emoji: "📉", titulo: "Cintura parou 2 semanas?", texto: "Tira ~150–200 kcal (ex.: 2 col. de arroz) ou adiciona 2 mil passos/dia." },
];

const LISTA_COMPRAS = [
  { cat: "Proteínas", emoji: "🍗", itens: ["Ovos (2–3 dúzias)", "Peito de frango (1,5 kg)", "Patinho moído (500 g)", "Atum em água (4 latas)", "Tilápia (500 g)", "Iogurte natural (6 potes)", "Queijo branco", "Leite desnatado", "Whey (opcional)"] },
  { cat: "Carboidratos", emoji: "🍚", itens: ["Arroz", "Feijão", "Batata-doce (1 kg)", "Pão francês / integral", "Aveia", "Goma de tapioca"] },
  { cat: "Frutas", emoji: "🍌", itens: ["Banana (1 penca)", "Maçã (6)", "Mamão"] },
  { cat: "Verduras e legumes", emoji: "🥦", itens: ["Alface / rúcula", "Tomate", "Cebola", "Brócolis", "Abobrinha", "Cenoura"] },
  { cat: "Outros", emoji: "🧂", itens: ["Azeite", "Amendoim torrado", "Requeijão light", "Cacau 100%", "Mel", "Temperos naturais"] },
];

const HABITOS = [
  { id: "passos", emoji: "👟", nome: "8–10 mil passos" },
  { id: "sono", emoji: "😴", nome: "Dormi 7h ou mais" },
  { id: "semDoce", emoji: "🚫", nome: "Sem refri / doce / álcool" },
  { id: "proteina", emoji: "🥩", nome: "Bati a proteína" },
];

const FRASES = [
  "A pochete não vai embora sozinha. Bora! 🔥",
  "Constância > intensidade. Faz o de hoje.",
  "Abdômen se faz na cozinha e se mostra no treino.",
  "Cada série conta. Cada copo d'água conta.",
  "Daqui 3 meses você vai agradecer o você de hoje.",
  "Não precisa ser perfeito, precisa ser todo dia.",
  "Tanquinho é consequência. Foca no processo.",
];
