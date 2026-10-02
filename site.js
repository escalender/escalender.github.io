// Escalender-Website: Handy-Vorschau skalieren, «Ausprobieren» als Überlagerung
(function () {
  const BASIS = document.documentElement.dataset.basis || '';

  // Das iframe ist immer 390×844 (iPhone) und wird auf die Breite des Rahmens skaliert
  function skaliere(telefon) {
    const glas = telefon.querySelector('.glas');
    const f = telefon.querySelector('iframe');
    if (!glas || !f) return;
    const s = glas.clientWidth / 390;
    f.style.transform = `scale(${s})`;
    glas.style.height = Math.round(844 * s) + 'px';
  }
  function alleSkalieren() { document.querySelectorAll('.telefon').forEach(skaliere); }
  window.addEventListener('resize', alleSkalieren);
  document.addEventListener('DOMContentLoaded', alleSkalieren);
  alleSkalieren();

  // Ausprobieren: Türchen n des Demo-Kalenders im Handy zeigen
  function demo(n) {
    const url = BASIS + 'demo/#t=' + n;
    if (window.innerWidth < 600) { window.open(url, '_blank'); return; }
    const hg = document.createElement('div');
    hg.className = 'demo-hintergrund';
    hg.innerHTML = `<div class="telefon"><button class="demo-zu" aria-label="Schliessen">×</button><div class="rahmen"><div class="glas"><iframe title="Rätsel ausprobieren" src="${url}" allow="camera"></iframe></div></div><p class="tipp">Direkt im Handy lösen – die Antwort steht im Text.</p></div>`;
    const zu = () => { hg.remove(); document.body.classList.remove('demo-offen'); document.removeEventListener('keydown', taste); };
    const taste = (e) => { if (e.key === 'Escape') zu(); };
    hg.addEventListener('click', (e) => { if (e.target === hg) zu(); });
    hg.querySelector('.demo-zu').addEventListener('click', zu);
    document.addEventListener('keydown', taste);
    document.body.append(hg); document.body.classList.add('demo-offen');
    skaliere(hg.querySelector('.telefon'));
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.probe[data-tuer]');
    if (b) { e.preventDefault(); demo(b.dataset.tuer); }
  });
})();
