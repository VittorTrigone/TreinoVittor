# 💪 Projeto Tanquinho

App pessoal pra tirar a pochete: **treino em casa com timer**, **dieta com cardápio**, **controle de água** e **gráfico de progresso**.
Funciona **sem internet** e instala no Android como se fosse um app normal.

## O que tem

| Aba | O que faz |
|---|---|
| 🏠 **Hoje** | Treino do dia, água, calorias/proteína, próxima refeição e hábitos (passos, sono…) |
| 🏋️ **Treino** | Plano de segunda a domingo, aquecimento guiado, séries com **descanso automático**, prancha com timer, **HIIT com timer de intervalos** (bipes + vibração), "como fazer" de cada exercício |
| 🍽️ **Dieta** | Cardápio de ~2.000 kcal / 130 g de proteína com 2 opções por refeição, marcar o que comeu, regras e **lista de compras** |
| 💧 **Água** | Garrafa animada, botões de 150/250/500 ml, **metas por horário** (até 9h → 500 ml … até 21h → 2,5 L) e lembrete |
| 📈 **Progresso** | Registrar peso e cintura, gráfico, calendário de 4 semanas, backup |

Os dados ficam salvos **só no seu celular**. Use *Progresso → Backup → Exportar* de vez em quando.

---

## 🚀 Colocar no GitHub Pages (5 minutos)

1. Crie uma conta em https://github.com (se não tiver).
2. Clique em **New repository** → nome: `tanquinho` → **Public** → *Create repository*.
3. Na página do repositório clique em **uploading an existing file**.
4. Arraste **todos os arquivos e pastas** deste projeto (`index.html`, `manifest.webmanifest`, `sw.js`, `README.md` e as pastas `css`, `js`, `icons`) → **Commit changes**.
5. Vá em **Settings → Pages** → em *Branch* escolha `main` e `/ (root)` → **Save**.
6. Espere 1–2 minutos. O link vai ser:
   `https://SEU-USUARIO.github.io/tanquinho/`

## 📲 Instalar no Android (vira "app", funciona offline)

1. Abra o link acima no **Chrome** do celular.
2. Menu **⋮** → **Instalar app** (ou "Adicionar à tela inicial").
3. Pronto: ícone na tela inicial, abre em tela cheia, e **funciona sem internet** depois da primeira abertura.

> Dica: na aba **Progresso** aparece um botão "Instalar" quando o Chrome permite.

## 📦 Quer um APK de verdade?

Dá sim, sem programar:

1. Com o site já no GitHub Pages, entre em **https://www.pwabuilder.com**
2. Cole o seu link → **Start** → **Package for stores** → **Android** → *Download*.
3. Ele gera um `.apk` que você instala no celular (precisa permitir "instalar de fontes desconhecidas").

## ✏️ Como mudar treino, dieta ou metas

Tudo fica em **`js/data.js`**:
- `PERFIL` → peso meta, calorias, proteína, água
- `AGUA_CHECKPOINTS` → metas de água por horário
- `EX` → exercícios (séries, reps, descanso)
- `SEMANA` → qual treino em cada dia
- `DIETA` → refeições, alimentos e calorias

Depois de alterar e subir de novo no GitHub, **abra o `sw.js` e mude** `tanquinho-v1` para `tanquinho-v2` (v3, v4…) pro celular baixar a versão nova.

## 🔔 Sobre o lembrete de água

Sem servidor e sem internet, o celular só consegue avisar enquanto o app está aberto (ou foi aberto há pouco). Por isso o app tem as **metas por horário**: é só bater o olho e ver se você está no ritmo.

---

⚠️ *Valores de calorias são aproximados. Não substitui orientação de médico, nutricionista ou educador físico.*
