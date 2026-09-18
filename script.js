/* رحلة في بستان الأنظمة — لعبة تعليمية ثابتة بلا خادم */

/* بنك الأسئلة (questionBank) موجود بملف questions.js */
const QUESTIONS_PER_GAME = 10;
let questions = [];
let recentlyUsed = new Set();

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* نسحب 10 أسئلة جديدة من البنك (نفضّل الأسئلة اللي ما طلعت بالألعاب السابقة)، ونخلط ترتيب الخيارات */
function pickQuestions() {
  let fresh = questionBank.filter((q) => !recentlyUsed.has(q));
  if (fresh.length < QUESTIONS_PER_GAME) {
    recentlyUsed = new Set();
    fresh = [...questionBank];
  }
  const picked = shuffle(fresh).slice(0, QUESTIONS_PER_GAME);
  picked.forEach((q) => recentlyUsed.add(q));
  return picked.map((q) => {
    const correctText = q.options[q.correctIndex];
    const options = shuffle(q.options);
    return { text: q.text, options, correctIndex: options.indexOf(correctText) };
  });
}

const scene = document.getElementById("scene");
const girl = document.getElementById("girl");
const rock = document.getElementById("rock");
const finish = document.getElementById("finish");
const bubble = document.getElementById("questionBubble");
const questionText = document.getElementById("questionText");
const questionNumber = document.getElementById("questionNumber");
const answers = document.getElementById("answers");
const hearts = document.getElementById("hearts");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const flowers = document.getElementById("flowers");
const basket = document.getElementById("basket");
const startHint = document.getElementById("startHint");
const startButton = document.getElementById("startButton");
const statusMessage = document.getElementById("statusMessage");
const winOverlay = document.getElementById("winOverlay");
const loseOverlay = document.getElementById("loseOverlay");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = soundToggle.querySelector(".sound-icon");

let currentObstacle = 0;
let attemptsLeft = 3;
let started = false;
let busy = false;
let muted = false;
let audioContext = null;
const WALK_MS = 650; // لازم يطابق مدة "transition: left" للكلاس .girl بملف style.css

const arabicNumber = (value) => String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[digit]);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function setStatus(message) {
  statusMessage.textContent = message;
}

function getAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function tone(frequency, delay, duration, type = "sine") {
  if (muted) return;
  const audio = getAudio();
  if (!audio) return;
  const startAt = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.001, startAt);
  gain.gain.exponentialRampToValueAtTime(.25, startAt + .02);
  gain.gain.exponentialRampToValueAtTime(.001, startAt + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + .03);
}

function playSound(kind) {
  if (kind === "start") tone(440, 0, .12);
  if (kind === "correct") { tone(660, 0, .15); tone(880, .12, .2); }
  if (kind === "wrong") tone(220, 0, .18);
  if (kind === "win") [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, index * .15, .25));
  if (kind === "lose") [392, 329.63, 261.63].forEach((frequency, index) => tone(frequency, index * .18, .3));
}

function updateProgress() {
  progressText.textContent = `العوائق: ${arabicNumber(currentObstacle)} من ١٠`;
  progressFill.style.width = `${currentObstacle * 10}%`;
  basket.setAttribute("aria-label", `الورد الذي جمعته: ${currentObstacle} من 10`);
}

function setGirlPosition(position, animate = true) {
  if (!animate) girl.style.transition = "none";
  girl.style.left = `${position}%`;
  if (!animate) {
    requestAnimationFrame(() => { girl.style.transition = ""; });
  }
}

/* المواقع كنسبة من عرض المشهد؛ على الشاشات الضيقة نعوّض عرض البنت والصخرة بالبكسل حتى لا تنقص البنت من الحافة ولا تتداخل مع الصخرة */
function layout() {
  const sceneWidth = scene.clientWidth || 1;
  const girlHalf = girl.offsetWidth / 2;
  const rockHalf = rock.offsetWidth / 2;
  const start = Math.max(4, (girlHalf + 10) / sceneWidth * 100);
  const gap = Math.max(9, (girlHalf + rockHalf + 8) / sceneWidth * 100);
  const firstRock = Math.max(24, start + gap);
  return { start, gap, firstRock };
}

function obstaclePosition(index) {
  const { firstRock } = layout();
  return firstRock + index * (82 - firstRock) / 9;
}

function resetVisuals() {
  currentObstacle = 0;
  attemptsLeft = 3;
  busy = false;
  started = false;
  rock.className = "rock";
  rock.style.left = `${obstaclePosition(0)}%`;
  setGirlPosition(layout().start, false);
  bubble.hidden = true;
  startHint.classList.remove("hide");
  startButton.hidden = false;
  flowers.innerHTML = "";
  updateProgress();
}

function renderHearts() {
  hearts.textContent = "❤️".repeat(attemptsLeft) + "🖤".repeat(3 - attemptsLeft);
}

function renderQuestion() {
  const question = questions[currentObstacle];
  questionNumber.textContent = `السؤال ${arabicNumber(currentObstacle + 1)} من ١٠`;
  questionText.textContent = question.text;
  answers.innerHTML = "";
  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.textContent = option;
    button.addEventListener("click", () => answerQuestion(index, button));
    answers.appendChild(button);
  });
  renderHearts();
  bubble.hidden = false;
  setStatus(`السؤال ${currentObstacle + 1}: ${question.text}`);
}

async function walkToObstacle(index) {
  if (!started) return;
  busy = true;
  rock.className = "rock";
  rock.style.left = `${obstaclePosition(index)}%`;
  setGirlPosition(obstaclePosition(index) - layout().gap, true);
  girl.classList.add("walking");
  await wait(WALK_MS + 50);
  girl.classList.remove("walking");
  if (started) {
    busy = false;
    renderQuestion();
  }
}

function showLose() {
  started = false;
  busy = false;
  bubble.hidden = true;
  playSound("lose");
  loseOverlay.hidden = false;
  setStatus("انتهت المحاولات الثلاث. حاولي مرة أخرى.");
}

function addFlower() {
  const flower = document.createElement("span");
  flower.className = "collected-flower";
  flower.textContent = "🌸";
  flower.setAttribute("aria-label", "وردة");
  flowers.appendChild(flower);
}

function flyFlower() {
  return new Promise((resolve) => {
    const rockRect = rock.getBoundingClientRect();
    const basketRect = basket.getBoundingClientRect();
    const flying = document.createElement("span");
    flying.className = "flying-flower";
    flying.textContent = "🌸";
    flying.style.left = `${rockRect.left + rockRect.width / 2 - 16}px`;
    flying.style.top = `${rockRect.top}px`;
    flying.style.setProperty("--dx", `${basketRect.left + basketRect.width / 2 - (rockRect.left + rockRect.width / 2)}px`);
    flying.style.setProperty("--dy", `${basketRect.top + basketRect.height / 2 - rockRect.top}px`);
    document.body.appendChild(flying);
    flying.addEventListener("animationend", () => {
      flying.remove();
      addFlower();
      resolve();
    }, { once: true });
  });
}

async function answerQuestion(index, selectedButton) {
  if (!started || busy) return;
  const question = questions[currentObstacle];
  if (index === question.correctIndex) {
    busy = true;
    selectedButton.classList.add("correct");
    [...answers.children].forEach((button) => { button.disabled = true; });
    playSound("correct");
    setStatus("إجابة صحيحة! تحولت الصخرة إلى وردة.");
    await wait(250);
    bubble.hidden = true;
    rock.classList.add("crumble");
    girl.classList.add("happy");
    const flowerFlight = flyFlower();
    await wait(120);
    currentObstacle += 1;
    updateProgress();
    await flowerFlight;
    await wait(60);
    girl.classList.remove("happy");
    if (currentObstacle < questions.length) {
      await wait(60);
      if (started) await walkToObstacle(currentObstacle);
    } else {
      await finishJourney();
    }
  } else {
    attemptsLeft -= 1;
    renderHearts();
    selectedButton.classList.remove("wrong-flash");
    void selectedButton.offsetWidth;
    selectedButton.classList.add("wrong-flash");
    rock.classList.remove("shake");
    void rock.offsetWidth;
    rock.classList.add("shake");
    playSound("wrong");
    setStatus(`إجابة غير صحيحة. بقيت ${attemptsLeft} محاولات.`);
    if (attemptsLeft === 0) {
      busy = true;
      [...answers.children].forEach((button) => { button.disabled = true; });
      await wait(600);
      showLose();
    }
  }
}

async function finishJourney() {
  if (!started) return;
  busy = true;
  setStatus("أحسنتِ! البنت تتجه إلى راية النهاية.");
  setGirlPosition(92 - 5, true);
  girl.classList.add("walking");
  await wait(WALK_MS + 100);
  girl.classList.remove("walking");
  started = false;
  busy = false;
  playSound("win");
  winOverlay.hidden = false;
  setStatus("مبروك! لقد فزتِ وجمعتِ ١٠ وردات.");
}

function beginGame() {
  winOverlay.hidden = true;
  loseOverlay.hidden = true;
  questions = pickQuestions();
  resetVisuals();
  started = true;
  startButton.hidden = true;
  startHint.classList.add("hide");
  playSound("start");
  setStatus("بدأت الرحلة. البنت تمشي إلى أول صخرة.");
  walkToObstacle(0);
}

soundToggle.addEventListener("click", () => {
  muted = !muted;
  soundToggle.setAttribute("aria-pressed", String(muted));
  soundToggle.setAttribute("aria-label", muted ? "تشغيل الصوت" : "كتم الصوت");
  soundIcon.textContent = muted ? "🔇" : "🔊";
  soundToggle.querySelector(".sound-label").textContent = muted ? "صامت" : "الصوت";
  if (!muted) playSound("start");
});
startButton.addEventListener("click", beginGame);
document.getElementById("playAgainButton").addEventListener("click", beginGame);
document.getElementById("restartButton").addEventListener("click", beginGame);

resetVisuals();