// Escalender-Website: Handy-Vorschau skalieren, «Ausprobieren» als Überlagerung
(function () {
  const BASIS = document.documentElement.dataset.basis || '';

  // Das iframe ist immer 390×844 (iPhone) und wird auf die Breite des Rahmens skaliert
  function skaliere(telefon) {
    const glas = telefon.querySelector('.glas');
    const f = telefon.querySelector('iframe');
    if (!glas || !f) return;
    // Oben bleibt Platz für die Statusleiste (Uhrzeit, Akku) wie auf einem echten iPhone – sonst läuft der Titel in die Kerbe
    // Das Glas füllt den Rahmen ganz (inset im CSS); das iframe wird so hoch, dass es bis zum unteren Rand reicht
    const s = glas.clientWidth / 390, BALKEN = 47;
    f.style.height = Math.ceil(glas.clientHeight / s - BALKEN) + 'px';
    f.style.transform = `translateY(${BALKEN * s}px) scale(${s})`;
    // Statusleiste in der Farbe des Kalenders (jedes Design hat seinen eigenen Hintergrund)
    if (!f.dataset.farbe) { f.dataset.farbe = '1'; f.addEventListener('load', () => { try { glas.style.background = getComputedStyle(f.contentDocument.body).backgroundColor; } catch (e) {} }); }
  }
  function alleSkalieren() { document.querySelectorAll('.telefon').forEach(skaliere); }
  window.addEventListener('resize', alleSkalieren);
  document.addEventListener('DOMContentLoaded', alleSkalieren);
  alleSkalieren();

  // Ausprobieren: Türchen n des Demo-Kalenders im Handy zeigen
  // n = Türchen im Demo-Kalender (Ausprobieren) oder null (Vorlage durchspielen, dann ist url gesetzt).
  // Der Demo-Kalender erfährt über #t=<n>&probe…, wie er geöffnet wurde – davon hängt sein Zurück-Pfeil ab.
  function demo(n, url, tipp = 'Direkt im Handy lösen – die Antwort steht im Text.', karte = null) {
    const schmal = window.innerWidth < 600;
    if (n) url = BASIS + 'demo/#t=' + n + (schmal ? '&probe' : '&probe=ueberlagerung');
    if (schmal) { merke(karte); location.href = url; return; }   // im selben Tab, damit «Zurück» hierher führt
    const hg = document.createElement('div');
    hg.className = 'demo-hintergrund';
    hg.innerHTML = `<div class="telefon"><button class="demo-zu" aria-label="Schliessen">×</button><div class="rahmen"><div class="glas"><iframe title="Rätsel ausprobieren" src="${url}" allow="camera"></iframe></div></div><p class="tipp">${tipp}</p></div>`;
    let offen = true;
    const zu = (vomVerlauf) => {
      if (!offen) return; offen = false;
      hg.remove(); document.body.classList.remove('demo-offen');
      document.removeEventListener('keydown', taste); window.removeEventListener('message', nachricht); window.removeEventListener('popstate', zurueck);
      if (vomVerlauf !== true && history.state && history.state.escalenderDemo) history.back();
      zeigeKarte(karte, false);   // Überlagerung: die Seite hat sich nicht bewegt – nur kurz aufleuchten
    };
    // Zurück-Pfeil im Probe-Türchen, Escape, Klick daneben, × und Browser-Zurück schliessen die Überlagerung
    const nachricht = (e) => { if (e.data === 'escalender:schliessen' || e.data === 'escalender:escape') zu(); };
    const zurueck = () => zu(true);
    const taste = (e) => { if (e.key === 'Escape') zu(); };
    window.addEventListener('message', nachricht);
    history.pushState({ escalenderDemo: true }, '');
    window.addEventListener('popstate', zurueck);
    hg.addEventListener('click', (e) => { if (e.target === hg) zu(); });
    hg.querySelector('.demo-zu').addEventListener('click', () => zu());
    document.addEventListener('keydown', taste);
    document.body.append(hg); document.body.classList.add('demo-offen');
    skaliere(hg.querySelector('.telefon'));
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.probe[data-tuer]');
    if (b) { e.preventDefault(); demo(b.dataset.tuer, null, undefined, b.closest('.karte')); }
    const v = e.target.closest('.probe-vorlage[data-vorlage]');
    if (v) { e.preventDefault(); demo(null, BASIS + 'vorlagen/' + v.dataset.vorlage + '/', 'Alle Türchen offen. Wo TODO steht, trägst du später deins ein.', v.closest('.vorlage')); }
  });

  // ───────── Scroll-Position ─────────
  // Drei Regeln:
  //  1. Ein neu geöffneter Link beginnt zuoberst (ausser mit Sprungmarke wie #preise).
  //  2. Zurück landet an derselben Stelle. Normalerweise macht das der Browser; scrollt aber ein umgebendes Fenster
  //     (z. B. die Vorschau im Chat), kennt er die Stelle nicht – dann springt die Seite selbst zum gemerkten Abschnitt.
  //  3. Nach «Ausprobieren» als eigene Seite (Handy): zurück an die Oberkante der ausprobierten Karte, nicht auf Höhe des Knopfs.
  const PFAD = location.pathname;
  const lies = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const schreib = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
  const loesch = (k) => { try { sessionStorage.removeItem(k); } catch (e) {} };

  // Regel 3: ausprobierte Karte merken
  const KARTE = 'escalender:karte:' + PFAD;
  function kennung(karte) {
    const k = karte && karte.querySelector('[data-tuer], [data-vorlage]');
    return k ? (k.dataset.tuer ? 't' + k.dataset.tuer : 'v' + k.dataset.vorlage) : null;
  }
  function merke(karte) {
    const id = kennung(karte);
    if (id) schreib(KARTE, id);
  }
  function zeigeKarte(karte, springen = true) {
    if (!karte) return;
    if (springen) karte.scrollIntoView({ block: 'start' });   // Abstand oben über scroll-margin-top im CSS
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { karte.classList.remove('zuletzt'); void karte.offsetWidth; karte.classList.add('zuletzt'); }
  }

  // Regel 2: welcher Abschnitt ist gerade zuoberst sichtbar? IntersectionObserver sieht das auch durch ein umgebendes Fenster hindurch.
  const STELLE = 'escalender:stelle:' + PFAD;
  const MARKEN = 'header:not(.kopf), section, h1, h2, .katalog-kopf p, .karte, .vorlage, .schritt, .wen > a, .preis, .fragen details, .hilfe p, .weg-liste li, footer';
  const marken = [...document.querySelectorAll(MARKEN)];
  const sicht = new Map();
  if ('IntersectionObserver' in window) {
    const beob = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) e.isIntersecting ? sicht.set(e.target, e) : sicht.delete(e.target);
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
    marken.forEach((m) => beob.observe(m));
  }
  function merkeStelle() {
    let beste = null;
    for (const [el, e] of sicht) if (!beste || e.intersectionRect.top < beste.e.intersectionRect.top || (e.intersectionRect.top === beste.e.intersectionRect.top && e.boundingClientRect.height < beste.e.boundingClientRect.height)) beste = { el, e };
    const stelle = { y: Math.round(window.scrollY) };
    if (beste) { stelle.i = marken.indexOf(beste.el); stelle.ab = Math.round(beste.e.intersectionRect.top - beste.e.boundingClientRect.top); }
    schreib(STELLE, JSON.stringify(stelle));
  }
  // Sprünge innerhalb der Seite (Menü «Preise», «So geht es») sanft – nur dort, sonst stört es das Wiederherstellen beim Neuladen
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented) return;
    const ziel = new URL(a.href, location.href);
    if (ziel.pathname !== PFAD || !ziel.hash) return;
    const el = document.getElementById(decodeURIComponent(ziel.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', ziel.hash);
  });
  // vor jedem Seitenwechsel über einen Link auf dieser Website
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.defaultPrevented) return;
    const ziel = new URL(a.href, location.href);
    if (ziel.origin !== location.origin || (ziel.pathname === PFAD && ziel.hash)) return;
    merkeStelle();
  }, true);
  window.addEventListener('pagehide', merkeStelle);
  function springeZu(stelle) {
    const el = marken[stelle.i];
    if (!el) return;
    // unsichtbare Marke an genau der gemerkten Höhe, damit auch der Teil eines grossen Abschnitts stimmt
    const m = document.createElement('div');
    m.style.cssText = `position:absolute;left:0;width:1px;height:1px;top:${el.getBoundingClientRect().top + window.scrollY + (stelle.ab || 0)}px;pointer-events:none`;
    document.body.append(m); m.scrollIntoView({ block: 'start' }); m.remove();
  }

  function navigationsArt() {
    try { return performance.getEntriesByType('navigation')[0].type; } catch (e) { return 'navigate'; }
  }
  window.addEventListener('pageshow', (ev) => {
    const zurueck = ev.persisted || navigationsArt() === 'back_forward';
    const id = lies(KARTE); loesch(KARTE);
    let stelle = null; try { stelle = JSON.parse(lies(STELLE) || 'null'); } catch (e) {}
    // nach dem Layout (Schriften, Handy im Hero) springen, sonst stimmt die Höhe nicht
    const spaeter = (f) => requestAnimationFrame(() => setTimeout(f, 60));
    if (zurueck && id) {   // Regel 3
      const knopf = document.querySelector(id[0] === 't' ? `[data-tuer="${id.slice(1)}"]` : `[data-vorlage="${id.slice(1)}"]`);
      const karte = knopf && knopf.closest('.karte, .vorlage');
      if (karte) return spaeter(() => zeigeKarte(karte));
    }
    if (zurueck) {   // Regel 2 – nur eingreifen, wenn der Browser die Stelle nicht selbst hergestellt hat
      if (stelle && !(stelle.y > 0 && Math.abs(window.scrollY - stelle.y) < 40)) spaeter(() => { if (!(stelle.y > 0 && Math.abs(window.scrollY - stelle.y) < 40)) springeZu(stelle); });
      return;
    }
    if (navigationsArt() === 'navigate' && !location.hash) { try { document.documentElement.scrollIntoView({ block: 'start' }); } catch (e) { window.scrollTo(0, 0); } }   // Regel 1
  });

  // ── Kopfzeile: schlanker beim Scrollen, auf dem Handy weg beim Runter- und zurück beim Hochscrollen; Menü-Knopf ──
  document.addEventListener('DOMContentLoaded', () => {
    const kopf = document.querySelector('.kopf');
    if (!kopf) return;
    const nav = kopf.querySelector('nav');
    const bauen = nav && nav.querySelector('a.knopf');
    if (nav) {
      if (!nav.id) nav.id = 'hauptmenue';
      // Handy: «Kalender bauen» bleibt sichtbar, der Rest kommt ins Menü
      if (bauen) { const cta = bauen.cloneNode(true); cta.classList.add('kopf-cta'); kopf.append(cta); }
      const knopf = document.createElement('button');
      knopf.type = 'button'; knopf.className = 'menu-knopf'; knopf.setAttribute('aria-label', 'Menü'); knopf.setAttribute('aria-expanded', 'false'); knopf.setAttribute('aria-controls', nav.id);
      const linien = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
      const kreuz = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      knopf.innerHTML = linien;
      const setze = (auf) => { kopf.classList.toggle('offen', auf); knopf.setAttribute('aria-expanded', String(auf)); knopf.innerHTML = auf ? kreuz : linien; if (auf) kopf.classList.remove('weg'); };
      knopf.addEventListener('click', (e) => { e.stopPropagation(); setze(!kopf.classList.contains('offen')); });
      nav.addEventListener('click', (e) => { if (e.target.closest('a')) setze(false); });
      document.addEventListener('click', (e) => { if (!kopf.contains(e.target)) setze(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setze(false); });
      kopf.append(knopf);
    }
    const handy = window.matchMedia('(max-width: 560px)');
    let letzt = window.scrollY, geplant = false;
    const pruefe = () => {
      geplant = false;
      const y = Math.max(0, window.scrollY);
      kopf.classList.toggle('klein', y > 8);
      if (handy.matches && !kopf.classList.contains('offen')) {
        if (y > letzt + 4 && y > 90) kopf.classList.add('weg');
        else if (y < letzt - 4 || y < 90) kopf.classList.remove('weg');
      } else kopf.classList.remove('weg');
      letzt = y;
    };
    window.addEventListener('scroll', () => { if (!geplant) { geplant = true; requestAnimationFrame(pruefe); } }, { passive: true });
    pruefe();
  });

  // ── Preis-Etiketten: Kärtchen mit Stufe, Preis und Erklärung, Link «Alle Preise» ──
  let kaertchen = null;
  const schliesseKaertchen = () => { if (kaertchen) { kaertchen.remove(); kaertchen = null; } document.querySelectorAll('.stufe-tipp[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false')); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.stufe-tipp');
    if (!t) { if (kaertchen && !kaertchen.contains(e.target)) schliesseKaertchen(); return; }
    e.preventDefault();
    const offen = t.getAttribute('aria-expanded') === 'true';
    schliesseKaertchen();
    if (offen) return;
    const k = document.createElement('div');
    k.className = 'stufen-kaertchen stufe-' + t.dataset.stufe; k.setAttribute('role', 'dialog'); k.setAttribute('aria-label', t.dataset.name);
    const esc = (x) => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    k.innerHTML = `<div class="sk-kopf"><b>${esc(t.dataset.name)}</b><span>${esc(t.dataset.preis)}</span></div>${t.dataset.betrag ? `<p class="sk-betrag">Diese Vorlage: ${esc(t.dataset.betrag)}</p>` : ''}<p>${esc(t.dataset.text)}</p><a href="${BASIS}#preise">Alle Preise →</a>`;
    document.body.append(k);
    const r = t.getBoundingClientRect(), b = k.getBoundingClientRect();
    const links = Math.max(12, Math.min(window.innerWidth - b.width - 12, r.left + r.width / 2 - b.width / 2));
    const oben = r.bottom + 8 + b.height > window.innerHeight - 8 && r.top - 8 - b.height > 8 ? r.top - 8 - b.height : r.bottom + 8;
    k.style.left = links + window.scrollX + 'px'; k.style.top = oben + window.scrollY + 'px';
    t.setAttribute('aria-expanded', 'true'); kaertchen = k;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseKaertchen(); });
  window.addEventListener('resize', schliesseKaertchen);
})();
