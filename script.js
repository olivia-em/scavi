// https://codepen.io/paulvddool/pen/mROEGa

const level = document.querySelector(".level");
const siegeButton = document.getElementById("seige");
const remote = document.getElementById("remote");
const tooltip = document.getElementById("tooltip");
const groundText = document.getElementById("groundText");
const groundReveal = document.getElementById("groundReveal");
let siegeOn = false;

// groundReveal.textContent = groundText.textContent;

setTimeout(() => {
  level.scrollIntoView({ block: "start" });
}, 0);

function seige() {
  console.log("Siege mode toggled");
  document.body.classList.toggle("siege-on", siegeOn);
  siegeButton.textContent = siegeOn ? "Seige: ON" : "Seige: OFF";
  siegeButton.setAttribute("aria-pressed", String(siegeOn));
  level.scrollIntoView({ block: "start" });
  siegeOn = !siegeOn;
}

function myFunction(e) {
  const rect = remote.getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  remote.style.setProperty("--mx", `${x}px`);
  remote.style.setProperty("--my", `${y}px`);

  tooltip.style.left = `${x - tooltip.offsetWidth / 2}px`;
  tooltip.style.top = `${y - tooltip.offsetHeight / 2}px`;
  tooltip.style.opacity = "1";
}

remote.addEventListener("mouseleave", () => {
  tooltip.style.opacity = "0";
});
