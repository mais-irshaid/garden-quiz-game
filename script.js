// ===== بنك الأسئلة =====
// كل سؤال فيه نص وثلاث خيارات، وترتيب "correctIndex" يحدد مكان الإجابة الصحيحة (0 أو 1 أو 2)
// الأسئلة هون مأخوذة من درس "نظام التشغيل" بكتاب المهارات الرقمية - تقدرين تبدليها بسهولة
const questions = [
  { text: "شو بنسمي البرنامج الأساسي اللي بيشتغل وسيط بين المستخدم ومكونات جهاز الحاسوب؟", options: ["نظام التشغيل", "متصفح الإنترنت", "معالج النصوص"], correctIndex: 0 },
  { text: "أي من هذول مثال على نظام تشغيل طورته شركة مايكروسوفت؟", options: ["ماك أو إس", "ويندوز", "أندرويد"], correctIndex: 1 },
  { text: "مين الشركة اللي طورت نظام التشغيل ماك أو إس (MacOS)؟", options: ["مايكروسوفت", "آبل", "جوجل"], correctIndex: 1 },
  { text: "أنظمة التشغيل يلي شيفرتها المصدرية سرية وغير متاحة للجميع بتسمى؟", options: ["مفتوحة المصدر", "مغلقة المصدر", "مجانية بالكامل"], correctIndex: 1 },
  { text: "أنظمة التشغيل يلي بتسمح للمطورين يعدّلوا ويوزّعوا شيفرتها بحرية بتسمى؟", options: ["مغلقة المصدر", "مفتوحة المصدر", "محمية بحقوق الملكية"], correctIndex: 1 },
  { text: "شو اسم البرنامج اللي بيعرض العمليات النشطة والموارد المخصصة إلها متل الذاكرة ووحدة المعالجة؟", options: ["مدير المهام (Task Manager)", "مستكشف الملفات", "لوحة التحكم"], correctIndex: 0 },
  { text: "شو اسم المستخدم اللي إله صلاحيات كاملة وبقدر يغيّر إعدادات النظام ويدير حسابات المستخدمين الآخرين؟", options: ["المستخدم القياسي", "المستخدم المسؤول", "المستخدم الضيف"], correctIndex: 1 },
  { text: "أي وظيفة من وظائف نظام التشغيل بتهتم بإدارة البيانات الداخلة من لوحة المفاتيح والفأرة والخارجة للشاشة والطابعة؟", options: ["إدارة الذاكرة", "التحكم في عمليات الإدخال والإخراج", "إدارة البرامج"], correctIndex: 1 },
  { text: "قدرة نظام التشغيل على فتح وإدارة أكثر من برنامج بنفس الوقت بتسمى؟", options: ["Multitasking (المهام المتعددة)", "Open Source", "File Management"], correctIndex: 0 },
  { text: "شو اسم البرنامج المستخدم لاستكشاف وترتيب الملفات والمجلدات بنظام ويندوز؟", options: ["File Explorer (مستكشف الملفات)", "Finder", "Task Manager"], correctIndex: 0 },
];

const MAX_ATTEMPTS = 3;

// ===== أصوات بسيطة (بدون ملفات، مولّدة مباشرة بالمتصفح) =====
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, startTime, duration) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playCorrectSound() {
  const now = getAudioCtx().currentTime;
  playTone(660, now, 0.15);
  playTone(880, now + 0.12, 0.2);
}

function playWinSound() {
  const now = getAudioCtx().currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => playTone(freq, now + i * 0.15, 0.25));
}

function playWrongSound() {
  const now = getAudioCtx().currentTime;
  playTone(220, now, 0.18);
}

function playLoseSound() {
  const now = getAudioCtx().currentTime;
  [392, 329.63, 261.63].forEach((freq, i) => playTone(freq, now + i * 0.18, 0.3));
}

function playStartSound() {
  const now = getAudioCtx().currentTime;
  playTone(440, now, 0.12);
}

// ===== عناصر الصفحة =====
const startBtn = document.getElementById("startBtn");
const questionBubble = document.getElementById("questionBubble");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const attemptsIndicator = document.getElementById("attemptsIndicator");
const rock = document.getElementById("rock");
const girl = document.getElementById("girl");
const obstacleCountEl = document.getElementById("obstacleCount");
const flowerBasket = document.getElementById("flowerBasket");
const winOverlay = document.getElementById("winOverlay");
const loseOverlay = document.getElementById("loseOverlay");

// ===== حالة اللعبة =====
let currentObstacle = 0;
let attemptsLeft = MAX_ATTEMPTS;

// ===== مواقع المشي عبر الشاشة =====
// كل عائق إله موقع (كنسبة مئوية) على عرض المشهد، والبنت بتمشي وتوقف قبل الصخرة بمسافة بسيطة
const START_POSITION = 4;
const FINISH_POSITION = 92;
const WALK_STOP_OFFSET = 9;
const WALK_DURATION = 1050; // مطابق لمدة "transition: left" بملف style.css

function rockPositionFor(index) {
  const firstRock = 24;
  const lastRock = 82;
  const step = (lastRock - firstRock) / (questions.length - 1);
  return firstRock + index * step;
}

function placeGirlInstantly(percent) {
  girl.style.transition = "none";
  girl.style.left = percent + "%";
  void girl.offsetWidth; // نجبر المتصفح يطبّق الموقع فوراً قبل ما نرجّع الحركة
  girl.style.transition = "";
}

function walkGirlTo(percent, onArrive) {
  girl.classList.add("walking");
  girl.style.left = percent + "%";
  setTimeout(() => {
    girl.classList.remove("walking");
    if (onArrive) onArrive();
  }, WALK_DURATION);
}

function goToObstacle(index) {
  const rockPos = rockPositionFor(index);
  rock.classList.remove("solved");
  rock.style.left = rockPos + "%";
  walkGirlTo(rockPos - WALK_STOP_OFFSET, showQuestion);
}

function startGame() {
  playStartSound();
  currentObstacle = 0;
  attemptsLeft = MAX_ATTEMPTS;
  flowerBasket.innerHTML = "";
  obstacleCountEl.textContent = currentObstacle;
  winOverlay.classList.add("hidden");
  loseOverlay.classList.add("hidden");
  startBtn.classList.add("hidden");
  placeGirlInstantly(START_POSITION);
  goToObstacle(currentObstacle);
}

function showQuestion() {
  attemptsLeft = MAX_ATTEMPTS;
  const q = questions[currentObstacle];

  questionText.textContent = q.text;
  optionsContainer.innerHTML = "";

  q.options.forEach((optionLabel, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = optionLabel;
    btn.addEventListener("click", () => handleAnswer(index, btn));
    optionsContainer.appendChild(btn);
  });

  updateAttemptsIndicator();
  questionBubble.classList.remove("hidden");
}

function updateAttemptsIndicator() {
  attemptsIndicator.textContent = "❤️".repeat(attemptsLeft) + "🖤".repeat(MAX_ATTEMPTS - attemptsLeft);
}

function handleAnswer(index, btnEl) {
  const q = questions[currentObstacle];

  if (index === q.correctIndex) {
    btnEl.classList.add("correct");
    disableAllOptions();
    playCorrectSound();
    setTimeout(solveObstacle, 500);
  } else {
    attemptsLeft--;
    updateAttemptsIndicator();
    rock.classList.add("shake");
    btnEl.classList.add("wrong");
    playWrongSound();
    setTimeout(() => rock.classList.remove("shake"), 400);

    if (attemptsLeft <= 0) {
      disableAllOptions();
      setTimeout(loseGame, 600);
    } else {
      // زر الإجابة الخاطئة بيضل شغال، منشيل اللون الأحمر بعد لحظة عشان تقدر تجرب من جديد
      setTimeout(() => btnEl.classList.remove("wrong"), 400);
    }
  }
}

function disableAllOptions() {
  document.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
}

function flyFlowerToBasket() {
  const startRect = rock.getBoundingClientRect();
  const endRect = flowerBasket.getBoundingClientRect();

  const flyingFlower = document.createElement("div");
  flyingFlower.className = "flying-flower";
  flyingFlower.textContent = "🌸";
  flyingFlower.style.left = startRect.left + startRect.width / 2 - 14 + "px";
  flyingFlower.style.top = startRect.top + startRect.height / 2 - 14 + "px";
  document.body.appendChild(flyingFlower);

  const dx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const dy = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

  requestAnimationFrame(() => {
    flyingFlower.style.transform = `translate(${dx}px, ${dy}px) scale(0.4) rotate(360deg)`;
    flyingFlower.style.opacity = "0.3";
  });

  setTimeout(() => {
    flyingFlower.remove();
    const flowerIcon = document.createElement("span");
    flowerIcon.textContent = "🌸";
    flowerIcon.className = "basket-flower-pop";
    flowerBasket.appendChild(flowerIcon);
  }, 700);
}

function solveObstacle() {
  // الصخرة بتختفي وتتحول لوردة تطير لسلة الزهور
  rock.classList.add("solved");
  questionBubble.classList.add("hidden");
  girl.classList.add("bounce");
  setTimeout(() => girl.classList.remove("bounce"), 500);

  flyFlowerToBasket();

  currentObstacle++;
  obstacleCountEl.textContent = currentObstacle;

  if (currentObstacle >= questions.length) {
    setTimeout(() => walkGirlTo(FINISH_POSITION, winGame), 700);
  } else {
    setTimeout(() => goToObstacle(currentObstacle), 700);
  }
}

function winGame() {
  winOverlay.classList.remove("hidden");
  playWinSound();
}

function loseGame() {
  loseOverlay.classList.remove("hidden");
  questionBubble.classList.add("hidden");
  playLoseSound();
}

startBtn.addEventListener("click", startGame);
document.getElementById("playAgainWinBtn").addEventListener("click", startGame);
document.getElementById("playAgainLoseBtn").addEventListener("click", startGame);
