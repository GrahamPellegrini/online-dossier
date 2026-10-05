(() => {
  document.querySelectorAll('.info-button').forEach(button => button.addEventListener('click', () => {
    JSON.parse(button.dataset.infoUrls).forEach(url => window.open(url, '_blank', 'noopener'));
  }));
  const cards = [...document.querySelectorAll('.status-card, .gantt-entry:not(.gantt-print-notes .gantt-entry)')];
  const opened = [];
  const animations = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function change(card, expand) {
    const previous = animations.get(card);
    if (previous) previous.cancel();
    const start = card.getBoundingClientRect().height;
    card.open = true;
    const finish = expand ? card.scrollHeight : card.querySelector('summary').getBoundingClientRect().height + 2;
    if (reduced.matches) { card.open = expand; draw(); return; }
    card.style.overflow = 'hidden';
    const animation = card.animate([{height: `${start}px`}, {height: `${finish}px`}], {duration: 260, easing: 'ease-in-out'});
    animations.set(card, animation);
    animation.onfinish = () => { card.open = expand; card.style.overflow = ''; animations.delete(card); draw(); };
  }
  cards.forEach(card => card.querySelector('summary').addEventListener('click', event => {
    event.preventDefault();
    const index = opened.indexOf(card);
    if (index >= 0) { opened.splice(index, 1); change(card, false); }
    else {
      if (opened.length === 2) change(opened.shift(), false);
      opened.push(card); change(card, true);
    }
  }));
  const grid = document.querySelector('.status-grid');
  const svg = document.querySelector('.status-connections');
  function draw() {
    if (!svg || !grid) return;
    const bounds = grid.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 48 ${bounds.height}`);
    svg.innerHTML = '<defs><marker id="followup-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#8096ab"/></marker></defs>';
    [['foundation','pca',24], ['orbit','mesh',9], ['orbit','unity',39]].forEach(([from,to,x]) => {
      const first = document.querySelector(`#status-${from} summary`).getBoundingClientRect();
      const last = document.querySelector(`#status-${to} summary`).getBoundingClientRect();
      const y1 = first.top - bounds.top + first.height / 2;
      const y2 = last.top - bounds.top + last.height / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', `M47 ${y1} H${x} V${y2} H47`);
      path.setAttribute('fill','none'); path.setAttribute('stroke','#8096ab');
      path.setAttribute('stroke-width','1'); path.setAttribute('marker-end','url(#followup-arrow)');
      svg.append(path);
    });
  }
  if (grid) new ResizeObserver(draw).observe(grid);
  window.addEventListener('resize', draw); draw();
})();
