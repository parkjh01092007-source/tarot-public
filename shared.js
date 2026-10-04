// 複数ページで使う共通部分（名前の保存・読み込み、単語の抽選と確率計算）

const NAME_KEY = "tarot-name";
const DEFAULT_NAME = "本人ちゃん";

// 名前の保存。localStorage が使えない環境（設定で無効、プライベートモードなど）では何もしない
function saveName(value) {
  try {
    localStorage.setItem(NAME_KEY, value);
  } catch (e) {
    // 保存できなくても画面は動かす（他のページでは既定の名前になる）
  }
}

// 保存済みの名前（空欄・読み込み失敗のときは入力欄に入れる用に空文字）
function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch (e) {
    return "";
  }
}

// 表示に使う名前。空欄なら「本人ちゃん」
function getName() {
  return loadName().trim() || DEFAULT_NAME;
}

// 今日の称号の結果（3枚のカード番号と向き、選ばれた単語とそのランク・確率、はやし立ての番号）を
// sessionStorage に保存する。保存できたら true、できなければ false
const RESULT_KEY = "tarot-title-result";

function saveTitleResult(result) {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    return true;
  } catch (e) {
    return false;
  }
}

// 保存済みの結果を返す。無い・壊れている・データと合わないときは null
function loadTitleResult() {
  try {
    const r = JSON.parse(sessionStorage.getItem(RESULT_KEY));
    const ok = r && r.cards.length === 3 && r.words.length === 3 && r.ranks.length === 3 && r.probs.length === 3
      && r.cards.every(c => CARDS.some(card => card.no === c.no))
      && TEMPLATES[r.templateIndex] !== undefined;
    return ok ? r : null;
  } catch (e) {
    return null;
  }
}

// タロット占いの結果（カード番号、向き、テーマ）を sessionStorage に保存する。保存できたら true
const READING_KEY = "tarot-reading-result";

// MEANINGS にそのテーマの意味データがあるか（無いテーマは「準備中」扱い）
function hasTheme(theme) {
  return typeof theme === "string" && Object.hasOwn(MEANINGS, theme);
}

function saveReadingResult(result) {
  try {
    sessionStorage.setItem(READING_KEY, JSON.stringify(result));
    return true;
  } catch (e) {
    return false;
  }
}

// 保存済みの占い結果を返す。無い・壊れている・データと合わないときは null
function loadReadingResult() {
  try {
    const r = JSON.parse(sessionStorage.getItem(READING_KEY));
    const ok = r && hasTheme(r.theme) && MEANINGS[r.theme][r.no] !== undefined
      && CARDS.some(card => card.no === r.no) && typeof r.reversed === "boolean";
    return ok ? r : null;
  } catch (e) {
    return null;
  }
}

// 番号をローマ数字にする（0 は "0"、1〜21 は I〜XXI）。カードの表に出す
function toRoman(n) {
  const table = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI",
    "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  return table[n];
}

// 単語の配列から、RARITY の重みに比例して1つ選ぶ。選んだ単語と、その選ばれる確率を返す
function pickWord(list) {
  const total = list.reduce((sum, x) => sum + RARITY[x.r], 0);
  let rest = Math.random() * total;
  const chosen = list.find(x => (rest -= RARITY[x.r]) < 0) || list[list.length - 1];
  return { w: chosen.w, r: chosen.r, p: RARITY[chosen.r] / total };
}

// 出現確率 = 3枚の組 1/(22×21×20) × 向き (1/2)^3 × 3つの単語それぞれの選ばれる確率
// wordProbs は pickWord が返した p の配列
function calcProbability(wordProbs) {
  const n = CARDS.length;
  return (1 / (n * (n - 1) * (n - 2))) * (1 / 8) * wordProbs.reduce((prod, p) => prod * p, 1);
}

// 分母 = 1 ÷ 確率。有効数字2桁にして、1万以上は「16万」のように万単位、1億以上は「3.2億」のように億単位で読む
function formatDenominator(probability) {
  const denom = 1 / probability;
  const sig2 = n => Number(n.toPrecision(2)).toLocaleString("ja-JP");
  // 丸めた結果が1万万(=1億)に達するときも億単位にする
  if (Number((denom / 10000).toPrecision(2)) >= 10000) return sig2(denom / 100000000) + "億";
  return denom >= 10000 ? sig2(denom / 10000) + "万" : sig2(denom);
}

// パーセントは極小値なので有効数字2桁
function formatPercent(probability) {
  return (probability * 100).toPrecision(2) + "%";
}
