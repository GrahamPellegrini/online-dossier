(function () {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".rail a")];
  const progress = document.getElementById("progress-bar");
  const pointer = document.createElement("div");
  pointer.className = "laser-pointer";
  document.body.appendChild(pointer);

  let pointerOn = false;

  function activeIndex() {
    let active = 0;
    let best = Infinity;
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().top);
      if (distance < best) {
        best = distance;
        active = index;
      }
    });
    return active;
  }

  function go(index) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    slides[next].scrollIntoView({ behavior: "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", `#${slides[next].id}`);
  }

  function update() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    if (progress) progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    const active = activeIndex();
    dots.forEach((dot, index) => dot.classList.toggle("active", index === active));
  }

  document.addEventListener("keydown", event => {
    const key = event.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(key)) {
      event.preventDefault();
      go(activeIndex() + 1);
    }
    if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(key)) {
      event.preventDefault();
      go(activeIndex() - 1);
    }
    if (key === "Home") {
      event.preventDefault();
      go(0);
    }
    if (key === "End") {
      event.preventDefault();
      go(slides.length - 1);
    }
    if (key.toLowerCase() === "p") {
      pointerOn = !pointerOn;
      pointer.classList.toggle("on", pointerOn);
    }
  });

  document.addEventListener("pointermove", event => {
    if (!pointerOn) return;
    pointer.style.transform = `translate(${event.clientX - 12}px, ${event.clientY - 12}px)`;
  }, { passive: true });

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
