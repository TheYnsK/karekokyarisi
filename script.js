const STAGE1_ROUNDS = 3;
const STAGE1_ROUND_TIME = 10;
const STAGE2_TIME = 45;
const STAGE3_TIME = 35;
const STAGE2_QUESTIONS = 3;
const STAGE2_ANSWER_CARDS = 4;
const STAGE3_SELECTION_LIMIT = 2;

const stageDefinitions = [
  {
    id: 1,
    type: "mole",
    title: "Aşama 1 • Köstebek Yakalama",
    eyebrow: "3 Tur • 10 Saniye",
    instruction: "Köklü sayıya en yakın tam sayının yazdığı köstebeğe vur. Doğru vurursan puan alırsın.",
  },
  {
    id: 2,
    type: "match",
    title: "Aşama 2 • Kök İçine Alma",
    eyebrow: "3 Soru • 4 Kart",
    instruction: "3 işlemi sürükle-bırak ile eşleştir. Sonuç kartlarından biri şaşırtmacadır.",
  },
  {
    id: 3,
    type: "select",
    title: "Aşama 3 • Tam Kare Avı",
    eyebrow: "5 Sayıdan 2'si",
    instruction: "5 sayı içinden tam kare olan 2 tanesini seç ve final puanını topla.",
  },
];

const state = {
  playerName: "",
  stageIndex: 0,
  totalScore: 0,
  totalTimeSpent: 0,
  stageScores: [0, 0, 0],
  stageData: null,
  matchAssignments: {},
  selectedNumbers: [],
  timer: STAGE1_ROUND_TIME,
  intervalId: null,
  locked: false,
  gameInProgress: false,
  moleRounds: [],
  currentRoundIndex: 0,
  currentRoundScore: 0,
  roundAnswered: false,
};

const stagePools = {
  stage1: createStage1Pool(),
  stage2: createStage2Pool(),
  stage3: createStage3Pool(),
};

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");

const startGameBtn = document.getElementById("startGameBtn");
const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
const openLeaderboardTopBtn = document.getElementById("openLeaderboardTopBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const homeBtn = document.getElementById("homeBtn");
const submitStageBtn = document.getElementById("submitStageBtn");
const resetStageBtn = document.getElementById("resetStageBtn");
const nextStageBtn = document.getElementById("nextStageBtn");
const playerNameInput = document.getElementById("playerName");

const stageEyebrow = document.getElementById("stageEyebrow");
const stageTitle = document.getElementById("stageTitle");
const stageInstruction = document.getElementById("stageInstruction");
const playerBadge = document.getElementById("playerBadge");
const timerValue = document.getElementById("timerValue");
const timerCard = document.getElementById("timerCard");
const roundLabel = document.getElementById("roundLabel");
const roundStatus = document.getElementById("roundStatus");
const currentTotalScore = document.getElementById("currentTotalScore");
const progressLine = document.getElementById("progressLine");

const moleStage = document.getElementById("moleStage");
const closestRootValue = document.getElementById("closestRootValue");
const moleGrid = document.getElementById("moleGrid");
const matchingStage = document.getElementById("matchingStage");
const selectionStage = document.getElementById("selectionStage");
const questionColumn = document.getElementById("questionColumn");
const answerBank = document.getElementById("answerBank");
const numberPool = document.getElementById("numberPool");
const trainWrapper = document.getElementById("trainWrapper");

const leaderboardBody = document.getElementById("leaderboardBody");
const leaderboardEmpty = document.getElementById("leaderboardEmpty");

const stageResultModal = document.getElementById("stageResultModal");
const modalBadge = document.getElementById("modalBadge");
const modalTitle = document.getElementById("modalTitle");
const modalSummary = document.getElementById("modalSummary");
const modalCorrect = document.getElementById("modalCorrect");
const modalBonus = document.getElementById("modalBonus");
const modalStageScore = document.getElementById("modalStageScore");
const toast = document.getElementById("toast");
const fireworksLayer = document.getElementById("fireworksLayer");

bindEvents();
// Sayfa ilk yüklendiğinde skorları API'den çek
renderLeaderboard();

function bindEvents() {
  startGameBtn.addEventListener("click", startGame);

  // Liderlik tablosu butonlarına API çağrısı eklendi
  openLeaderboardBtn.addEventListener("click", async () => {
    showScreen("leaderboard");
    await renderLeaderboard();
  });

  openLeaderboardTopBtn.addEventListener("click", async () => {
    showScreen("leaderboard");
    await renderLeaderboard();
  });

  closeLeaderboardBtn.addEventListener("click", closeLeaderboard);
  homeBtn.addEventListener("click", goHome);
  submitStageBtn.addEventListener("click", () => submitStage(false));
  resetStageBtn.addEventListener("click", resetCurrentStage);
  nextStageBtn.addEventListener("click", handleNextStage);
  playerNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") startGame();
  });
}

function startGame() {
  const name = playerNameInput.value.trim();
  if (!name) {
    showToast("Önce oyuncu adını yazmalısın.");
    return;
  }

  state.playerName = name;
  state.stageIndex = 0;
  state.totalScore = 0;
  state.totalTimeSpent = 0;
  state.stageScores = [0, 0, 0];
  state.gameInProgress = true;
  state.locked = false;

  playerBadge.textContent = state.playerName;
  currentTotalScore.textContent = "0";

  showScreen("game");
  startStage(0);
}

function startStage(index) {
  clearTimer();
  state.stageIndex = index;
  state.matchAssignments = {};
  state.selectedNumbers = [];
  state.locked = false;
  state.roundAnswered = false;

  const def = stageDefinitions[index];
  stageEyebrow.textContent = def.eyebrow;
  stageTitle.textContent = def.title;
  stageInstruction.textContent = def.instruction;
  progressLine.style.width = `${((index + 1) / stageDefinitions.length) * 100}%`;

  moleStage.classList.add("hidden");
  matchingStage.classList.add("hidden");
  selectionStage.classList.add("hidden");

  if (def.type === "mole") {
    submitStageBtn.classList.add("hidden");
    resetStageBtn.classList.add("hidden");
    roundLabel.textContent = "Tur";
    state.moleRounds = pickRandomItems(stagePools.stage1, STAGE1_ROUNDS);
    state.currentRoundIndex = 0;
    state.currentRoundScore = 0;
    moleStage.classList.remove("hidden");
    startMoleRound();
    return;
  }

  resetStageBtn.classList.remove("hidden");
  submitStageBtn.classList.remove("hidden");
  roundLabel.textContent = "Aşama";
  roundStatus.textContent = `${index + 1}/3`;

  if (def.type === "match") {
    matchingStage.classList.remove("hidden");
    state.stageData = getRandomMatchStageData(stagePools.stage2);
    state.timer = STAGE2_TIME;
    renderMatchingStage();
    updateTimerUI();
    state.intervalId = setInterval(() => {
      state.timer -= 1;
      updateTimerUI();
      if (state.timer <= 0) submitStage(true);
    }, 1000);
  } else {
    selectionStage.classList.remove("hidden");
    state.stageData = getRandomSelectionScenario(stagePools.stage3);
    state.timer = STAGE3_TIME;
    renderSelectionStage();
    updateTimerUI();
    state.intervalId = setInterval(() => {
      state.timer -= 1;
      updateTimerUI();
      if (state.timer <= 0) submitStage(true);
    }, 1000);
  }
}

function startMoleRound() {
  clearTimer();
  state.locked = false;
  state.roundAnswered = false;
  state.timer = STAGE1_ROUND_TIME;

  const round = state.moleRounds[state.currentRoundIndex];
  closestRootValue.textContent = round.root;
  roundStatus.textContent = `${state.currentRoundIndex + 1}/${STAGE1_ROUNDS}`;
  renderMoleRound(round);
  updateTimerUI();

  state.intervalId = setInterval(() => {
    state.timer -= 1;
    updateTimerUI();
    if (state.timer <= 0) {
      handleMoleTimeout();
    }
  }, 1000);
}

function renderMoleRound(round) {
  moleGrid.innerHTML = round.options.map((option) => `
    <div class="mole-hole">
      <button class="mole-btn" data-value="${option}" aria-label="${option}">
        <span class="mole-pupil"></span>
        <span class="mole-pupil right"></span>
        <span class="mole-number">${option}</span>
      </button>
    </div>
  `).join("");

  document.querySelectorAll(".mole-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleMoleChoice(Number(btn.dataset.value), btn));
  });
}

function handleMoleChoice(value, button) {
  if (state.locked || state.roundAnswered) return;
  state.locked = true;
  state.roundAnswered = true;
  clearTimer();

  const round = state.moleRounds[state.currentRoundIndex];
  const correct = value === round.correct;
  round.answeredCorrectly = correct;

  const bonus = calculateTimeBonus(state.timer, STAGE1_ROUND_TIME, 20);
  const gained = correct ? 25 + bonus : 0;

  state.currentRoundScore += gained;
  state.totalScore += gained;
  state.totalTimeSpent += (STAGE1_ROUND_TIME - state.timer);
  currentTotalScore.textContent = String(state.totalScore);

  button.classList.add(correct ? "correct-hit" : "wrong-hit", "locked");
  button.insertAdjacentHTML("beforeend", `<span class="hammer-burst">${correct ? "🔨✨" : "💥"}</span>`);

  if (!correct) {
    const correctBtn = [...document.querySelectorAll(".mole-btn")].find((item) => Number(item.dataset.value) === round.correct);
    if (correctBtn) correctBtn.classList.add("correct-hit", "locked");
  }

  showToast(correct ? `Doğru! +${gained} puan` : `Yanlış. Doğru cevap ${round.correct}`);
  setTimeout(nextMoleRound, 700);
}

function handleMoleTimeout() {
  if (state.locked || state.roundAnswered) return;
  state.locked = true;
  state.roundAnswered = true;
  clearTimer();
  state.totalTimeSpent += STAGE1_ROUND_TIME;

  const round = state.moleRounds[state.currentRoundIndex];
  const correctBtn = [...document.querySelectorAll(".mole-btn")].find((item) => Number(item.dataset.value) === round.correct);
  if (correctBtn) correctBtn.classList.add("correct-hit", "locked");

  showToast(`Süre doldu. Doğru cevap ${round.correct}`);
  setTimeout(nextMoleRound, 750);
}

function nextMoleRound() {
  if (state.currentRoundIndex < STAGE1_ROUNDS - 1) {
    state.currentRoundIndex += 1;
    startMoleRound();
    return;
  }

  const correctCount = state.moleRounds.reduce((total, round) => total + (round.answeredCorrectly ? 1 : 0), 0);
  state.stageScores[0] = state.currentRoundScore;
  showStageResultModal({
    correctCount,
    bonus: Math.max(0, state.currentRoundScore - correctCount * 25),
    stageScore: state.currentRoundScore,
    summary: `3 turun tamamı bitti. ${correctCount} turu doğru bildin.`,
  }, false);
}

function resetCurrentStage() {
  if (state.locked) return;

  if (stageDefinitions[state.stageIndex].type === "match") {
    state.matchAssignments = {};
    renderMatchingStage();
    showToast("Eşleştirmeler sıfırlandı.");
  } else if (stageDefinitions[state.stageIndex].type === "select") {
    state.selectedNumbers = [];
    renderSelectionStage();
    showToast("Seçimler sıfırlandı.");
  }
}

function renderMatchingStage() {
  const { questions, answers } = state.stageData;
  const assignedAnswerIds = new Set(Object.values(state.matchAssignments));

  questionColumn.innerHTML = questions.map((question) => {
    const assignedId = state.matchAssignments[question.id];
    const assignedAnswer = answers.find((answer) => answer.id === assignedId);

    return `
      <div class="drop-item" data-question-id="${question.id}">
        <div class="drop-question">${question.left}</div>
        <div class="drop-zone ${assignedAnswer ? "assigned" : ""}" data-question-id="${question.id}">
          ${assignedAnswer
        ? `<div class="assigned-pill"><span>${assignedAnswer.right}</span><button class="clear-assignment" data-question-id="${question.id}" title="Seçimi temizle">×</button></div>`
        : `<span class="placeholder">Sonuç kartını buraya bırak</span>`}
        </div>
      </div>
    `;
  }).join("");

  answerBank.innerHTML = answers
      .filter((answer) => !assignedAnswerIds.has(answer.id))
      .map((answer) => `<div class="answer-card" draggable="true" data-answer-id="${answer.id}">${answer.right}</div>`)
      .join("");

  bindMatchingInteractions();
}

function bindMatchingInteractions() {
  const answerCards = document.querySelectorAll(".answer-card");
  const dropZones = document.querySelectorAll(".drop-zone");
  const clearButtons = document.querySelectorAll(".clear-assignment");

  answerCards.forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", card.dataset.answerId);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  dropZones.forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      if (state.locked) return;
      event.preventDefault();
      zone.classList.add("over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (event) => {
      if (state.locked) return;
      event.preventDefault();
      zone.classList.remove("over");
      assignAnswer(zone.dataset.questionId, event.dataTransfer.getData("text/plain"));
    });
  });

  clearButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.locked) return;
      delete state.matchAssignments[button.dataset.questionId];
      renderMatchingStage();
    });
  });
}

function assignAnswer(questionId, answerId) {
  const currentQuestionId = Object.keys(state.matchAssignments).find((key) => state.matchAssignments[key] === answerId);
  if (currentQuestionId) delete state.matchAssignments[currentQuestionId];
  state.matchAssignments[questionId] = answerId;
  renderMatchingStage();
}

function renderSelectionStage() {
  const scenario = state.stageData;
  if (trainWrapper) trainWrapper.classList.remove("departing");

  numberPool.innerHTML = scenario.numbers.map((num, index) => {
    const selected = state.selectedNumbers.includes(num);
    const lockedClass = !selected && state.selectedNumbers.length >= STAGE3_SELECTION_LIMIT ? "locked" : "";
    return `
      <button class="number-card train-wagon color-${index % 5} ${selected ? "selected" : ""} ${lockedClass}" data-number="${num}">
        <span>${num}</span>
      </button>`;
  }).join("");

  document.querySelectorAll(".number-card").forEach((card) => {
    card.addEventListener("click", () => toggleNumberSelection(Number(card.dataset.number)));
  });
}

function toggleNumberSelection(number) {
  if (state.locked) return;

  const currentCard = document.querySelector(`.number-card[data-number="${number}"]`);
  const isSelected = state.selectedNumbers.includes(number);
  if (isSelected) {
    state.selectedNumbers = state.selectedNumbers.filter((item) => item !== number);
    renderSelectionStage();
    return;
  }

  if (state.selectedNumbers.length >= STAGE3_SELECTION_LIMIT) {
    showToast("En fazla 2 sayı seçebilirsin.");
    if (currentCard) animateWrongTrainChoice(currentCard);
    return;
  }

  state.selectedNumbers.push(number);
  const isCorrect = state.stageData.correctNumbers.includes(number);
  renderSelectionStage();
  const freshCard = document.querySelector(`.number-card[data-number="${number}"]`);
  if (isCorrect) {
    animateTrainChoice(freshCard);
  } else if (freshCard) {
    animateWrongTrainChoice(freshCard);
  }
}

function submitStage(isAuto) {
  if (state.locked || stageDefinitions[state.stageIndex].type === "mole") return;

  clearTimer();
  state.locked = true;

  const isSelectionStage = stageDefinitions[state.stageIndex].type === "select";
  const stageTime = stageDefinitions[state.stageIndex].type === "match" ? STAGE2_TIME : STAGE3_TIME;
  state.totalTimeSpent += (stageTime - state.timer);

  const result = stageDefinitions[state.stageIndex].type === "match"
      ? evaluateMatchStage()
      : evaluateSelectionStage();

  state.stageScores[state.stageIndex] = result.stageScore;
  state.totalScore += result.stageScore;
  currentTotalScore.textContent = String(state.totalScore);

  if (isSelectionStage) {
    animateTrainDeparture(() => showStageResultModal(result, isAuto));
    return;
  }

  showStageResultModal(result, isAuto);
}

function evaluateMatchStage() {
  const { questions, answers } = state.stageData;
  let correctCount = 0;

  questions.forEach((question) => {
    const assignedAnswerId = state.matchAssignments[question.id];
    const assignedAnswer = answers.find((answer) => answer.id === assignedAnswerId);
    const row = document.querySelector(`.drop-item[data-question-id="${question.id}"]`);
    const isCorrect = Boolean(assignedAnswer && assignedAnswer.right === question.right);
    row.classList.remove("correct", "wrong");
    row.classList.add(isCorrect ? "correct" : "wrong");
    if (isCorrect) correctCount += 1;
  });

  const baseScore = correctCount * 25;
  const bonus = calculateTimeBonus(state.timer, STAGE2_TIME, 25);
  const stageScore = baseScore + bonus;

  return {
    correctCount,
    bonus,
    stageScore,
    summary: `3 sorudan ${correctCount} tanesini doğru eşleştirdin.`,
  };
}

function evaluateSelectionStage() {
  const correctSet = new Set(state.stageData.correctNumbers);
  let correctCount = 0;

  document.querySelectorAll(".number-card").forEach((card) => {
    const value = Number(card.dataset.number);
    const selected = state.selectedNumbers.includes(value);
    const shouldBeSelected = correctSet.has(value);

    card.classList.remove("correct", "wrong");

    if (selected && shouldBeSelected) {
      card.classList.add("correct");
      correctCount += 1;
    } else if ((selected && !shouldBeSelected) || (!selected && shouldBeSelected)) {
      card.classList.add("wrong");
    }
  });

  const allCorrect = correctCount === 2 && state.selectedNumbers.length === 2 && state.selectedNumbers.every((n) => correctSet.has(n));
  const baseScore = allCorrect ? 60 : correctCount * 20;
  const bonus = calculateTimeBonus(state.timer, STAGE3_TIME, 20);
  const stageScore = baseScore + bonus;

  return {
    correctCount,
    bonus,
    stageScore,
    summary: `Tam kare olan 2 sayıdan ${correctCount} tanesini doğru seçtin.`,
  };
}

function showStageResultModal(result, isAuto) {
  modalBadge.textContent = isAuto ? "Süre Doldu • Otomatik Kontrol" : "Aşama Sonucu";
  modalTitle.textContent = result.correctCount >= 2 ? "Süpersin!" : "Devam, daha iyisi gelir!";
  modalSummary.textContent = `${result.summary} Süre bonusun eklendi.`;
  modalCorrect.textContent = String(result.correctCount);
  modalBonus.textContent = String(result.bonus);
  modalStageScore.textContent = String(result.stageScore);
  nextStageBtn.textContent = state.stageIndex === stageDefinitions.length - 1 ? "Final Skorunu Gör" : "Sonraki Aşamaya Geç";
  stageResultModal.classList.remove("hidden");
}

function handleNextStage() {
  stageResultModal.classList.add("hidden");
  if (state.stageIndex === stageDefinitions.length - 1) {
    finishGame();
    return;
  }
  startStage(state.stageIndex + 1);
}

// BİTİŞ EKRANI - ASYNC/AWAIT MANTIGI İLE GÜNCELLENDİ (MONGODB API İSTEKLERİ)
async function finishGame() {
  showToast("Skor sunucuya kaydediliyor...");

  await saveScore();
  await renderLeaderboard();

  showScreen("leaderboard");
  triggerFinalFireworks();
  showToast(`${state.playerName}, oyunu ${state.totalScore} puanla bitirdin!`);
}

function showScreen(screenName) {
  homeScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  leaderboardScreen.classList.add("hidden");

  if (screenName === "home") {
    homeScreen.classList.remove("hidden");
    homeBtn.classList.add("hidden");
  } else if (screenName === "game") {
    gameScreen.classList.remove("hidden");
    homeBtn.classList.remove("hidden");
  } else if (screenName === "leaderboard") {
    leaderboardScreen.classList.remove("hidden");
    homeBtn.classList.remove("hidden");
  }
}

function closeLeaderboard() {
  showScreen(state.gameInProgress ? "game" : "home");
}

function goHome() {
  clearTimer();
  stageResultModal.classList.add("hidden");
  state.playerName = "";
  state.stageIndex = 0;
  state.gameInProgress = false;
  showScreen("home");
}

function updateTimerUI() {
  timerValue.textContent = String(Math.max(state.timer, 0));
  timerCard.classList.toggle("warning", state.timer <= 5);
}

function calculateTimeBonus(remainingSeconds, totalSeconds, maxBonus) {
  return Math.floor((Math.max(remainingSeconds, 0) / totalSeconds) * maxBonus);
}

function clearTimer() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

// MONGODB'YE KAYIT YAPAN YENİ FONKSİYON (POST ISTEGI)
async function saveScore() {
  const scoreData = {
    name: state.playerName,
    totalScore: state.totalScore,
    stage1: state.stageScores[0],
    stage2: state.stageScores[1],
    stage3: state.stageScores[2],
    totalTime: state.totalTimeSpent,
  };

  try {
    const res = await fetch('/api/saveScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData)
    });

    if (!res.ok) {
      throw new Error(`Sunucu Hatası: ${res.status}`);
    }
  } catch (err) {
    console.error("Skor kaydedilemedi. (Lokalde test ediyorsanız bu normaldir):", err);
  }
  state.gameInProgress = false;
}

// MONGODB'DEN VERİLERİ ÇEKEN FONKSİYON
async function renderLeaderboard() {
  leaderboardBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Skorlar yükleniyor... ⏳</td></tr>';
  leaderboardEmpty.classList.add("hidden");

  try {
    const res = await fetch('/api/getScores');

    // Eğer gelen yanıt OK değilse (örn. 404), HTML'i JSON yapmaya çalışmadan hataya düşür
    if (!res.ok) {
      throw new Error(`Sunucu Hatası: ${res.status}`);
    }

    const json = await res.json();
    const scores = json.data || [];

    leaderboardBody.innerHTML = "";
    leaderboardEmpty.classList.toggle("hidden", scores.length === 0);

    if (scores.length === 0) return;

    leaderboardBody.innerHTML = scores.map((score, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(score.name)}</td>
        <td><strong>${score.totalScore}</strong></td>
        <td>${score.stage1}</td>
        <td>${score.stage2}</td>
        <td>${score.stage3}</td>
        <td>${score.totalTime} sn</td>
        <td>${formatDate(score.playedAt)}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Skorlar çekilemedi:", err);
    leaderboardBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: #ff7c93;">Şu an sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.</td></tr>';
  }
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(text) {
  return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timerId);
  showToast.timerId = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function animateTrainChoice(card) {
  if (!card) return;
  card.classList.remove("bump");
  void card.offsetWidth;
  card.classList.add("bump");
  setTimeout(() => card.classList.remove("bump"), 420);
}

function animateWrongTrainChoice(card) {
  if (!card) return;
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
  setTimeout(() => card.classList.remove("shake"), 400);
}

function animateTrainDeparture(onComplete) {
  if (!trainWrapper) {
    onComplete?.();
    return;
  }

  trainWrapper.classList.remove("departing");
  void trainWrapper.offsetWidth;
  trainWrapper.classList.add("departing");
  setTimeout(() => {
    onComplete?.();
  }, 1350);
}

function triggerFinalFireworks() {
  if (!fireworksLayer) return;
  fireworksLayer.innerHTML = "";

  const bursts = [
    { left: 18, top: 28 },
    { left: 50, top: 20 },
    { left: 78, top: 34 },
    { left: 34, top: 54 },
    { left: 66, top: 58 },
  ];

  bursts.forEach((burst, index) => {
    setTimeout(() => createFireworkBurst(burst.left, burst.top), index * 260);
  });

  setTimeout(() => {
    fireworksLayer.innerHTML = "";
  }, 2600);
}

function createFireworkBurst(leftPercent, topPercent) {
  const colors = ["#ffd84f", "#7ee7ff", "#ff91dd", "#7dffbe", "#9d8bff", "#ff8d6a"];
  const burst = document.createElement("div");
  burst.className = "firework-burst";
  burst.style.left = `${leftPercent}%`;
  burst.style.top = `${topPercent}%`;

  const count = 18;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("span");
    particle.className = "firework-particle";
    const angle = (Math.PI * 2 * i) / count;
    const radius = 45 + Math.random() * 55;
    particle.style.setProperty("--dx", `${Math.cos(angle) * radius}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * radius}px`);
    particle.style.setProperty("--particle-color", colors[i % colors.length]);
    particle.style.animationDelay = `${(Math.random() * 0.08).toFixed(2)}s`;
    burst.appendChild(particle);
  }

  fireworksLayer.appendChild(burst);
  setTimeout(() => burst.remove(), 1400);
}

function getRandomMatchStageData(pool) {
  const picked = pickUniqueQuestions(pool, STAGE2_QUESTIONS, (item) => item.right);
  const distractor = pool.find((item) => !picked.some((p) => p.right === item.right));
  const answerTexts = [...picked.map((item) => item.right), distractor.right].slice(0, STAGE2_ANSWER_CARDS);
  return {
    questions: picked,
    answers: shuffleArray(answerTexts.map((text, index) => ({
      id: `a-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      right: text,
    }))),
  };
}

function getRandomSelectionScenario(pool) {
  const scenario = pool[Math.floor(Math.random() * pool.length)];
  return {
    numbers: shuffleArray([...scenario.numbers]),
    correctNumbers: [...scenario.correctNumbers],
  };
}

function pickUniqueQuestions(pool, count, uniqueKeyFn) {
  const shuffled = shuffleArray([...pool]);
  const result = [];
  const seen = new Set();
  for (const item of shuffled) {
    const key = uniqueKeyFn(item);
    if (seen.has(key)) continue;
    result.push(item);
    seen.add(key);
    if (result.length === count) break;
  }
  return result;
}

function pickRandomItems(items, count) {
  return shuffleArray([...items]).slice(0, count).map((item) => ({ ...item, answeredCorrectly: false }));
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createStage1Pool() {
  const pool = [];
  for (let rootValue = 5; rootValue <= 225; rootValue++) {
    const exact = Math.sqrt(rootValue);
    if (Number.isInteger(exact)) continue;
    const nearest = Math.round(exact);
    if (nearest < 2 || nearest > 15) continue;

    const options = new Set([nearest]);
    const candidates = [nearest - 2, nearest - 1, nearest + 1, nearest + 2, nearest - 3, nearest + 3].filter((n) => n >= 1 && n <= 15);
    for (const candidate of shuffleArray(candidates)) {
      if (options.size >= 4) break;
      options.add(candidate);
    }
    if (options.size < 4) continue;

    pool.push({
      root: `√${rootValue}`,
      value: rootValue,
      correct: nearest,
      options: shuffleArray([...options]),
    });
  }
  return shuffleArray(pool).slice(0, 120);
}

function createStage2Pool() {
  const pool = [];
  const seen = new Set();
  for (let coefficient = 2; coefficient <= 15; coefficient++) {
    for (let rootInside = 2; rootInside <= 15; rootInside++) {
      const totalInside = coefficient * coefficient * rootInside;
      if (totalInside > 225) continue;
      const left = `${coefficient}√${rootInside}`;
      const right = `√${totalInside}`;
      const key = `${left}-${right}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ id: `s2-${coefficient}-${rootInside}`, left, right });
    }
  }
  return shuffleArray(pool);
}

function createStage3Pool() {
  const scenarios = [];
  const perfectSquares = [];
  for (let i = 2; i <= 15; i++) perfectSquares.push(i * i);

  const nonSquares = [];
  for (let i = 5; i <= 225; i++) {
    if (!Number.isInteger(Math.sqrt(i))) nonSquares.push(i);
  }

  const used = new Set();
  while (scenarios.length < 100) {
    const correctNumbers = shuffleArray(perfectSquares).slice(0, 2);
    const wrongNumbers = shuffleArray(nonSquares).slice(0, 3);
    const numbers = [...correctNumbers, ...wrongNumbers].sort((a, b) => a - b);
    const key = numbers.join("-");
    if (used.has(key)) continue;
    used.add(key);
    scenarios.push({ numbers, correctNumbers });
  }
  return scenarios;
}