const app = document.querySelector("#app");
const guests = [
  {
    characterId: "c_01",
    name: "Cris",
    face: "(｡•́‿•̀｡)",
    sees: ["light skin", "short hair"],
    says: "A room for me please!",
    isAnomaly: false,
    actLog: "Cris was asleep.",
  },
  {
    characterId: "c_belz",
    name: "Belz",
    face: "(¬_¬)",
    sees: ["pale skin", "dark hair"],
    says: "I am a regular here! :) ",
    isAnomaly: true,
    actLog: "Belz never entered the room.",
  },
  {
    characterId: "c_03",
    name: "Bryan",
    face: "(o_o)",
    sees: ["tan skin", "blue jacket"],
    says: "Just passing by.",
    isAnomaly: false,
    actLog: "Bryan is hanging out with friends.",
  },
  {
    characterId: "c_04",
    name: "Kristine",
    face: "(＾▽＾)",
    sees: ["light skin", "long hair"],
    says: "Do you have a quiet room?",
    isAnomaly: false,
    actLog: "Kristine was asleep.",
  },
];
let state = { night: 1, guestIndex: 0, admitted: [], questions: 0 };
const render = (html) => {
  app.innerHTML = html;
};
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
  const guest = guests[state.guestIndex];
  state.questions = 0;
  render(
    `<section class="screen guest-screen"><header class="topbar"><span class="eyebrow">Cor Motel</span><span class="night">Night ${state.night} <span class="heart">♥</span></span></header><div class="sight-panel"><div class="section-label">What you see</div><div class="sight-content"><span class="eye">◉</span><span>${guest.sees.join(" &nbsp; ")}</span></div></div><div class="guest-card"><div class="speech">${guest.says}</div><div class="face">${guest.face}</div><div class="guest-name">Guest ${state.guestIndex + 1}</div></div><div class="actions"><button id="details">Ask for details <small>(0/2)</small></button><button id="id">Ask for ID <small>(0/2)</small></button><div class="decision-row"><button class="accept" id="accept">Accept</button><button class="reject" id="reject">Reject</button></div></div><div class="feedback" id="feedback"></div></section>`,
  );
  document.querySelector("#details").onclick = () => ask("details", guest);
  document.querySelector("#id").onclick = () => ask("ID", guest);
  document.querySelector("#accept").onclick = () => acceptGuest(guest);
  document.querySelector("#reject").onclick = nextGuest;
}
function ask(kind, guest) {
  if (state.questions >= 2) return;
  state.questions++;
  document.querySelector("#feedback").textContent =
    kind === "ID"
      ? `ID: ${guest.name} — Room ${201 + state.guestIndex}`
      : `${guest.name}: “Everything is in order.”`;
  document.querySelector("#details").innerHTML =
    `Ask for details <small>(${state.questions}/2)</small>`;
  document.querySelector("#id").innerHTML =
    `Ask for ID <small>(${state.questions}/2)</small>`;
  if (state.questions >= 2) {
    document.querySelector("#details").disabled = true;
    document.querySelector("#id").disabled = true;
  }
}
function acceptGuest(guest) {
  if (guest.isAnomaly) return badEnding(guest);
  state.admitted.push(guest);
  nextGuest();
}
function nextGuest() {
  state.guestIndex++;
  if (state.guestIndex >= guests.length) return monitor();
  showGuest();
}
function monitor() {
  const logs = state.admitted.length
    ? state.admitted
        .map(
          (g) =>
            `<p class="log ${g.isAnomaly ? "suspicious" : ""}"><strong>${g.name}</strong> ${g.actLog}</p>`,
        )
        .join("")
    : `<p class="log">No guests were admitted.</p>`;
  render(
    `<section class="screen monitor"><header class="topbar"><span class="eyebrow">Activity Monitor</span><span class="night">Night ${state.night}</span></header><div class="monitor-log">${logs}</div><div class="guest-list">${state.admitted.map((g) => `<div class="guest-row" id="row-${g.characterId}"><span>${g.name}</span><button class="kick danger" data-id="${g.characterId}">Kick</button></div>`).join("")}</div><button class="end-shift" id="end">Let the night pass</button></section>`,
  );
  document
    .querySelectorAll(".kick")
    .forEach((button) => (button.onclick = () => kick(button.dataset.id)));
  document.querySelector("#end").onclick = endShift;
}
function kick(id) {
  document.querySelector(`#row-${id}`).remove();
  state.admitted = state.admitted.filter((g) => g.characterId !== id);
}
function endShift() {
  if (state.night >= 3) return goodEnding();
  state.night++;
  state.guestIndex = 0;
  state.admitted = [];
  introSecond();
}
function badEnding(guest) {
  render(
    `<section class="screen jumpscare"><div class="face">${guest.face}</div><h1>${guest.name} was never a guest.</h1><p>You gave it a place in the motel.</p><p class="danger">HEART LOST — BAD ENDING</p><button class="continue" id="retry">Try again</button></section>`,
  );
  document.querySelector("#retry").onclick = () => {
    state = { night: 1, guestIndex: 0, admitted: [], questions: 0 };
    intro();
  };
}
function goodEnding() {
  render(
    `<section class="screen result"><div class="section-label">Night 3 complete</div><h1>Good job, Shepherd.</h1><p>You watched carefully, questioned what you saw, and kept Cor Motel safe.</p><button id="again">Play again</button></section>`,
  );
  document.querySelector("#again").onclick = () => {
    state = { night: 1, guestIndex: 0, admitted: [], questions: 0 };
    intro();
  };
}
intro();
