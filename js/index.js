const app = document.querySelector("#app");
const DATA_URL = "./data/characters.json";
const ASSET = "./assets/";
const assetUrl = (path) =>
  `${ASSET}${path.split("/").map(encodeURIComponent).join("/")}`;
const uiSounds = {
  click: "audio/UI_click.wav",
  accept: "audio/UI_accept.wav",
  reject: "audio/UI_reject.wav",
};
let guests = [];
let gameConfig = {};
let state = {
  night: 1,
  guestIndex: 0,
  admitted: [],
  questions: 0,
  goodMistakes: 0,
  turnedAway: 0,
  wronglyKicked: 0,
};
const fallbackGuests = [
  {
    characterId: "c_cris",
    name: "Cris",
    face: "(｡•́‿•̀｡)",
    visible: ["Light skin", "Short hair"],
    says: "A room for me please!",
    actLog: "Cris was asleep.",
  },
  {
    characterId: "c_bryan",
    name: "Bryan",
    face: "(o_o)",
    visible: ["Tan skin", "Blue jacket"],
    says: "Just passing by.",
    actLog: "Bryan is hanging out with friends.",
  },
  {
    characterId: "c_kristine",
    name: "Kristine",
    face: "(＾▽＾)",
    visible: ["Light skin", "Long hair"],
    says: "Do you have a quiet room?",
    actLog: "Kristine was asleep.",
  },
  {
    characterId: "c_mara",
    name: "Mara",
    face: "(・_・)",
    visible: ["Pale skin", "Glasses"],
    says: "I have a reservation.",
    actLog: "Mara read a book in the room.",
  },
  {
    characterId: "c_caleb",
    name: "Caleb",
    face: "(¬‿¬)",
    visible: ["Dark hair", "Green coat"],
    says: "I will not be any trouble.",
    actLog: "Caleb was asleep.",
  },
];
const render = (html) => {
  app.innerHTML = html;
};
function playUiSound(type = "click") {
  const audio = new Audio(assetUrl(uiSounds[type] || uiSounds.click));
  audio.volume = type === "click" ? 0.45 : 0.65;
  audio.play().catch(() => {});
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const type =
    button.dataset.sound ||
    (button.id === "accept"
      ? "accept"
      : button.id === "reject" || button.classList.contains("kick")
        ? "reject"
        : "click");
  playUiSound(type);
});
const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>\"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[char],
  );

function normalizeCharacter(raw, index, anomaly = false) {
  const name = raw.name || raw["name:"] || `Guest ${index + 1}`;
  const dialogue = raw.dialogue || {};
  const anomalyInfo = raw.anomaly || {};
  const effect = raw.specialEffect || {};
  const lowerName = name.toLowerCase();
  const roleImage =
    {
      aba: "img/aba.jpg",
      lilli: "img/lilli.jpg",
      belz: "img/belz_1.png",
      legion: "img/legion.png",
      jesus: "img/jesus_at_the_door.jpeg",
      "false jesus": "img/jesus_at_the_door.jpeg",
    }[lowerName] || null;
  const roleSound =
    {
      aba: "audio/aba.wav",
      amon: "audio/amon.wav",
      lilli: "audio/lilli.wav",
      belz: "audio/belz_dialogue.mp3",
      legion: "audio/legion_hello.wav",
    }[lowerName] || null;
  const roleSpecial =
    {
      belz: "belz",
      "false jesus": "falseJesus",
      jesus: "falseJesus",
      luci: "luci",
      "revelation of the devil": "revelationDevil",
      "false prophet": "falseProphet",
      legion: "legion",
    }[lowerName] ||
    (raw.commandmentLink?.name?.toLowerCase() === "false prophet"
      ? "falseProphet"
      : null);
  return {
    characterId: raw.characterId || raw.id || `c_${index + 1}`,
    name,
    face: raw.face || "(・_・)",
    faceAsset: raw.faceAsset || raw.image || raw.asset || roleImage,
    soundAsset: roleSound,
    repeatSound: lowerName === "lilli" ? "audio/lilli-repeat.wav" : null,
    faceAssetType: "image",
    sees: raw.visible || raw.sees || [],
    says: raw.says || dialogue.greeting || "A room for me, please.",
    details: dialogue.askDetails || "Everything is in order.",
    id: raw.idInfo || raw.id || `id_${index + 1}`,
    isAnomaly: raw.isAnomaly ?? anomalyInfo.isAnomaly ?? anomaly,
    instantDeath: raw.instantDeath ?? raw.killsPlayer ?? false,
    actLog:
      raw.act_log || raw.actLog || raw.nightLog || "The guest was asleep.",
    special: raw.special || roleSpecial,
    specialEffect: effect,
    tellType: anomalyInfo.tellType || "none",
    commandmentLink: raw.commandmentLink || null,
    ifAdmittedNotKicked: raw.ifAdmittedNotKicked || "none",
    difficulty: raw.difficulty || 1,
  };
}
function buildGuests(data) {
  gameConfig = data.gameConfig || {};
  const groups = Array.isArray(data.characters)
    ? data.characters
    : [data.characters || data];
  const normal = groups.flatMap((group) =>
    Array.isArray(group.nonAnomaly) ? group.nonAnomaly : [],
  );
  const anomalies = groups.flatMap((group) =>
    Array.isArray(group.anomaly) ? group.anomaly : [],
  );
  const deadly = groups.flatMap((group) =>
    Array.isArray(group.instaDeathAnomaly) ? group.instaDeathAnomaly : [],
  );
  const sourceNormal = normal.length ? normal : fallbackGuests;
  const loaded = [
    ...sourceNormal.map((guest, i) => normalizeCharacter(guest, i)),
    ...anomalies.map((guest, i) =>
      normalizeCharacter(guest, i + sourceNormal.length, true),
    ),
    ...deadly.map((guest, i) =>
      normalizeCharacter(
        guest,
        i + sourceNormal.length + anomalies.length,
        true,
      ),
    ),
  ];
  return loaded;
}
function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}
function buildSchedule() {
  const goodPool = shuffle(
    guests.filter((guest) => !guest.isAnomaly && !guest.instantDeath),
  );
  const anomalyPool = shuffle(
    guests.filter((guest) => guest.isAnomaly && !guest.instantDeath),
  );
  const used = new Set();
  const configPlans = gameConfig.nights || [];
  const defaultPlans = [
    { guestCount: 5, anomalyMin: 1, anomalyMax: 2 },
    { guestCount: 6, anomalyMin: 3, anomalyMax: 4 },
    { guestCount: 5, anomalyMin: 3, anomalyMax: 4 },
  ];
  const plans = defaultPlans.map((defaultPlan, index) => {
    const configPlan = configPlans[index] || {};
    return {
      guestCount: configPlan.guestCount ?? defaultPlan.guestCount,
      anomalyMin: configPlan.anomalyCount?.min ?? defaultPlan.anomalyMin,
      anomalyMax: configPlan.anomalyCount?.max ?? defaultPlan.anomalyMax,
      deadlyChance: index === 0 ? 0 : 1,
    };
  });
  return plans.map((plan, nightIndex) => {
    const anomalyCount =
      Math.floor(Math.random() * (plan.anomalyMax - plan.anomalyMin + 1)) +
      plan.anomalyMin;
    const pickedAnomalies = [];
    const deadlyPool = guests
      .filter((guest) => guest.instantDeath && !used.has(guest.characterId))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (
      nightIndex > 0 &&
      deadlyPool.length &&
      Math.random() < plan.deadlyChance
    ) {
      const deadlyGuest =
        deadlyPool[Math.floor(Math.random() * deadlyPool.length)];
      pickedAnomalies.push(deadlyGuest);
      used.add(deadlyGuest.characterId);
    }
    const availableAnomalies = anomalyPool.filter(
      (guest) => !used.has(guest.characterId),
    );
    pickedAnomalies.push(
      ...availableAnomalies.slice(
        0,
        Math.max(0, anomalyCount - pickedAnomalies.length),
      ),
    );
    pickedAnomalies.forEach((guest) => used.add(guest.characterId));
    const pickedGood = goodPool
      .filter((guest) => !used.has(guest.characterId))
      .slice(0, Math.max(0, plan.guestCount - pickedAnomalies.length));
    pickedGood.forEach((guest) => used.add(guest.characterId));
    return shuffle([...pickedGood, ...pickedAnomalies]);
  });
}
async function loadGame() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
    guests = buildGuests(await response.json());
  } catch (error) {
    console.error(error);
    guests = [
      normalizeCharacter(
        {
          id: "fallback",
          name: "No guest data",
          visible: ["Data unavailable"],
          says: "Please add characters.json.",
        },
        0,
      ),
    ];
  }
  state.schedule = buildSchedule();
  intro();
}
function faceMarkup(guest) {
  if (guest.special === "legion")
    return `<span class="legion-stack"><img class="guest-image legion-image" src="${assetUrl("img/legion.png")}" alt="Legion" /></span>`;
  if (guest.special === "belz")
    return `<span class="belz-face"><img class="belz-closed" src="${assetUrl("img/belz_1.png")}" alt="Belz" /><img class="belz-open" src="${assetUrl("img/belz_2.png")}" alt="" aria-hidden="true" /></span>`;
  return guest.faceAsset
    ? `<img class="guest-image" src="${assetUrl(guest.faceAsset)}" alt="${escapeHtml(guest.name)}" />`
    : escapeHtml(guest.face);
}
function heartMarkup() {
  const hasLostHalf = state.goodMistakes > 0;
  const image = hasLostHalf ? "heart_half.svg" : "heart.svg";
  const label = hasLostHalf ? "Half a heart remaining" : "One heart remaining";
  return `<span class="life-heart" role="img" aria-label="${label}"><img src="${assetUrl(`img/${image}`)}" alt="" /></span>`;
}
function playLoseHeartSound() {
  const audio = new Audio(assetUrl("audio/lose-heart.wav"));
  audio.volume = 0.7;
  audio.play().catch((error) => {
    console.warn("Could not play the lose-heart sound.", error);
  });
}
function penalizeGoodGuest(guest) {
  state.goodMistakes += 1;
  playLoseHeartSound();
  if (state.goodMistakes >= 2) {
    badEnding(
      guest,
      "You rejected or kicked out two genuine guests. Your last heart is gone.",
    );
    return true;
  }
  return false;
}
function soundMarkup(guest) {
  if (!guest.soundAsset) return "";
  const repeat = guest.repeatSound
    ? `<audio src="${assetUrl(guest.repeatSound)}" autoplay loop></audio>`
    : "";
  const legion = guest.special === "legion";
  return `<audio${legion ? ' class="legion-audio" loop' : ""} src="${assetUrl(guest.soundAsset)}" autoplay></audio>${repeat}`;
}
function triggerLegionPanic() {
  const stack = document.querySelector(".legion-stack");
  const image = stack?.querySelector("img");
  if (!stack || !image) return;

  const duplicates = [];
  const duplicateInterval = window.setInterval(() => {
    const duplicate = image.cloneNode();
    duplicate.alt = "";
    duplicate.setAttribute("aria-hidden", "true");
    duplicate.classList.add("legion-duplicate");
    duplicate.style.setProperty("--offset-x", `${Math.random() * 180 - 90}px`);
    duplicate.style.setProperty("--offset-y", `${Math.random() * 180 - 90}px`);
    stack.append(duplicate);
    duplicates.push(duplicate);
  }, 100);

  window.setTimeout(() => {
    window.clearInterval(duplicateInterval);
    duplicates.forEach((duplicate) => duplicate.remove());
  }, 1500);
}
function intro() {
  render(
    `<section class="screen intro"><div class="intro-card"><div class="intro-bubble">*sighs* another busy day</div><div class="intro-face">(ಠ⌁ಠ)</div></div><div class="intro-caption">Cor Motel</div><button class="continue" id="start">continue</button></section>`,
  );
  document.querySelector("#start").onclick = introSecond;
}
function introSecond() {
  render(
    `<section class="screen intro"><div class="intro-card"><div class="intro-bubble">Cor Motel back in business!</div><div class="intro-face">(o⌁¬o)</div></div><button class="continue" id="start">begin Night ${state.night}</button></section>`,
  );
  document.querySelector("#start").onclick = showGuest;
}
function showGuest() {
  const guest = state.schedule[state.night - 1][state.guestIndex];
  state.questions = 0;
  render(
    `<section class="screen guest-screen"><header class="topbar"><span class="eyebrow">Cor Motel</span><span class="night">Night ${state.night} ${heartMarkup()}</span></header><div class="sight-panel"><div class="section-label">What you see</div><div class="sight-content"><span class="eye">👁</span><span>${guest.sees.map(escapeHtml).join(" &nbsp; ") || "No details recorded"}</span></div></div><div class="guest-card"><div class="speech">${escapeHtml(guest.says)}</div><div class="face">${faceMarkup(guest)}</div>${guest.special !== "falseJesus" ? `<div class="guest-name">${escapeHtml(guest.name)}</div>` : ""}</div><div class="actions"><button id="details">Ask for details</button><button id="id">Ask for ID</button><div class="decision-row"><button class="accept" id="accept">Accept</button><button class="reject" id="reject">Reject</button></div></div><div class="feedback" id="feedback"></div>${soundMarkup(guest)}</section>`,
  );
  document.querySelector("#details").onclick = () => ask("details", guest);
  document.querySelector("#id").onclick = () => ask("ID", guest);
  document.querySelector("#accept").onclick = () => acceptGuest(guest);
  document.querySelector("#reject").onclick = () => rejectGuest(guest);
  if (guest.special === "legion") {
    const audio = document.querySelector(".legion-audio");
    if (audio) audio.volume = 0.2;
    triggerLegionPanic();
  }
}
function rejectGuest(guest) {
  if (!guest.isAnomaly && !guest.instantDeath && penalizeGoodGuest(guest))
    return;
  nextGuest();
}
function ask(kind, guest) {
  if (state.questions >= 2) return;
  state.questions++;
  const idText =
    typeof guest.id === "object"
      ? `${guest.id.idName || guest.name}, ${guest.id.sex}, ${guest.id.hair}, ${guest.id.skin}, ${guest.id.build}`
      : guest.id;
  document.querySelector("#feedback").textContent =
    kind === "ID" ? `ID: ${idText}` : `${guest.name}: “${guest.details}”`;
  document.querySelector(kind === "ID" ? "#id" : "#details")?.remove();
}
function acceptGuest(guest) {
  if (guest.special === "luci") return delayedLuciDeath(guest);
  if (guest.instantDeath) return badEnding(guest);
  if (guest.special === "revelationDevil") return delayedDevilDeath(guest);
  state.admitted.push(guest);
  nextGuest();
}
function delayedLuciDeath(guest) {
  render(
    `<section class="screen guest-screen"><header class="topbar"><span class="eyebrow">Cor Motel</span><span class="night">Night ${state.night}</span></header><div class="guest-card"><div class="speech">${escapeHtml(guest.says)}</div><div class="face">${faceMarkup(guest)}</div><div class="guest-name">${escapeHtml(guest.name)}</div></div><p class="feedback">Guest accepted.</p></section>`,
  );
  window.setTimeout(() => badEnding(guest), 1500);
}
function delayedDevilDeath(guest) {
  render(
    `<section class="screen guest-screen devil-delay"><div class="guest-card"><div class="speech">${escapeHtml(guest.says)}</div><div class="face">${faceMarkup(guest)}</div><p>The visitor smiles.</p></div><p class="feedback">Guest accepted.</p></section>`,
  );
  window.setTimeout(() => badEnding(guest), 6000);
}
function nextGuest() {
  state.guestIndex++;
  if (state.guestIndex >= state.schedule[state.night - 1].length)
    return monitor();
  showGuest();
}
function monitor() {
  const logs = state.admitted.length
    ? state.admitted
        .map(
          (g) =>
            `<p class="log"><strong>${escapeHtml(g.name)}</strong> ${escapeHtml(g.actLog)}</p>`,
        )
        .join("")
    : `<p class="log">No guests were admitted.</p>`;
  const belzAudio = state.admitted.some((g) => g.special === "belz")
    ? `<audio src="${assetUrl("audio/Four Voices Whispering Horror Film Sound Effects.mp3")}" autoplay loop></audio>`
    : "";
  render(
    `<section class="screen monitor"><header class="topbar"><span class="eyebrow">Activity Monitor</span><span class="night">Night ${state.night} ${heartMarkup()}</span></header><div class="monitor-log">${logs}</div><div class="guest-list">${state.admitted.map((g) => `<div class="guest-row" id="row-${g.characterId}"><span>${escapeHtml(g.name)}</span><button class="kick danger" data-id="${g.characterId}">Kick</button></div>`).join("")}</div><button class="end-shift" id="end">Let the night pass</button>${belzAudio}</section>`,
  );
  document
    .querySelectorAll(".kick")
    .forEach((button) => (button.onclick = () => kick(button.dataset.id)));
  document.querySelector("#end").onclick = endShift;
}
function kick(id) {
  const guest = state.admitted.find(
    (candidate) => candidate.characterId === id,
  );
  document.querySelector(`#row-${id}`)?.remove();
  state.admitted = state.admitted.filter((g) => g.characterId !== id);
  if (guest && !guest.isAnomaly && !guest.instantDeath) {
    if (penalizeGoodGuest(guest)) return;
    return monitor();
  }
}
function endShift() {
  const dangerous = state.admitted.find(
    (guest) => guest.ifAdmittedNotKicked !== "none",
  );
  if (dangerous) return badEnding(dangerous);
  if (state.night >= 3) return goodEnding();
  state.night++;
  state.guestIndex = 0;
  state.admitted = [];
  introSecond();
}
function reset() {
  document.body.classList.remove("phone-glitch-active");
  state = {
    night: 1,
    guestIndex: 0,
    admitted: [],
    questions: 0,
    goodMistakes: 0,
    turnedAway: 0,
    wronglyKicked: 0,
  };
  state.schedule = buildSchedule();
  intro();
}
function badEnding(guest, reason = "You gave it a place in the motel.") {
  const uniqueImages = {
    luci: "img/revelation_devil_jumpscare.jpg",
    revelationDevil: "img/revelation_devil_jumpscare.jpg",
    falseProphet: "img/false_prophet_jumpscare.jpe",
  };
  const audioOption = Math.floor(Math.random() * 3) + 1;
  const image =
    guest.special === "falseJesus"
      ? null
      : uniqueImages[guest.special] ||
        `img/jumpscare_option${Math.floor(Math.random() * 5) + 1}.jpg`;
  const audio = `audio/jumpscare_option${audioOption}.mp3`;
  const title =
    guest.special === "falseJesus"
      ? "DISPLAY CORRUPTED"
      : guest.special === "revelationDevil"
        ? "It was never what it seemed."
        : reason.includes("two genuine guests")
          ? "Two genuine guests were turned away."
          : `${guest.name || "The guest"} was never safe.`;
  if (
    guest.special === "falseJesus" &&
    reason === "You gave it a place in the motel."
  )
    reason = "The image on your screen is no longer trustworthy.";
  document.body.classList.toggle(
    "phone-glitch-active",
    guest.special === "falseJesus",
  );
  render(
    `<section class="screen jumpscare ${guest.special || "random-jumpscare"}"><div class="phone-glitch-overlay" aria-hidden="true"><span class="glitch-status">DISPLAY SIGNAL LOST</span><span class="glitch-tear glitch-tear-one"></span><span class="glitch-tear glitch-tear-two"></span><span class="glitch-fragment">0xF4 // IMAGE CORRUPTED</span></div>${image ? `<img class="jumpscare-image" src="${assetUrl(image)}" alt="Jumpscare" />` : ""}<div class="jumpscare-content"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(reason)}</p><p class="danger">HEART LOST — BAD ENDING</p><button class="continue" id="retry">Try again</button></div><audio src="${assetUrl(audio)}" autoplay></audio></section>`,
  );
  const jumpAudio = document.querySelector(".jumpscare audio");
  if (jumpAudio) {
    jumpAudio.volume = 1;
    jumpAudio.play().catch(() => {});
  }
  if (navigator.vibrate) navigator.vibrate([180, 100, 260, 100, 500]);
  document.querySelector("#retry").onclick = reset;
}
function goodEnding() {
  render(
    `<section class="screen result"><div class="section-label">Night 3 complete</div><h1>Good job, Shepherd.</h1><p>You watched carefully, questioned what you saw, and kept Cor Motel safe.</p><button id="again">Play again</button></section>`,
  );
  document.querySelector("#again").onclick = reset;
}
loadGame();
