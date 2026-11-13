/* Shared helpers for Ellie's Games.
   Load just before a game's own <script>, at the end of <body>:
   <script src="shared/kit.js?v=3"></script>
   Bump ?v= in every game when this file changes (see CLAUDE.md).

   On load it blocks pinch/double-tap zoom, fills #stars (if present), and
   sets the tab icon to a 🎮.
   Then the game can use: Kit.shuffle, Kit.confetti, Kit.audio, Kit.tone. */
(function () {
    /* Prevent pinch-zoom on iOS */
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());
    document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

    /* Safari zooms on a quick double-tap and doesn't always honor touch-action (kit.css),
       so cancel the second tap of a double-tap and replay it as a plain click: no zoom,
       and the game still gets both taps. Drags and multi-finger touches are left alone. */
    let tapStart = null;
    let lastTap = { time: -1e9, x: 0, y: 0 };
    document.addEventListener('touchstart', e => {
        tapStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    document.addEventListener('touchend', e => {
        const t = e.changedTouches[0];
        if (!tapStart || e.touches.length || !t) return;
        if (Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y) > 10) return;   // a drag, not a tap
        const quick = e.timeStamp - lastTap.time < 350 &&
            Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 40;
        lastTap = { time: e.timeStamp, x: t.clientX, y: t.clientY };
        if (!quick || !e.cancelable) return;
        e.preventDefault();
        e.target.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window,
            clientX: t.clientX, clientY: t.clientY, screenX: t.screenX, screenY: t.screenY,
        }));
    }, { passive: false });

    /* ── Stars ── */
    const starsEl = document.getElementById('stars');
    if (starsEl) {
        for (let i = 0; i < 70; i++) {
            const s = document.createElement('div');
            s.className = 'star';
            const sz = (Math.random() * 2.5 + 0.8).toFixed(1);
            s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${(Math.random()*3+2).toFixed(1)}s;--delay:-${(Math.random()*5).toFixed(1)}s`;
            starsEl.appendChild(s);
        }
    }

    /* ── Tab icon: a game controller on every page, drawn as a tiny SVG ── */
    if (!document.querySelector('link[rel~="icon"]')) {
        const icon = document.createElement('link');
        icon.rel = 'icon';
        icon.href = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<text x="50" y="54" font-size="88" text-anchor="middle" dominant-baseline="middle">🎮</text></svg>');
        document.head.appendChild(icon);
    }

    /* ── Sound ──
       iOS starts an AudioContext suspended until a touch, so resume it on every use. */
    let audioCtx = null;
    function audio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    /* A single beep that fades out. Never throws — sound is optional. */
    function tone(freq, dur = 0.15, type = 'sine', vol = 0.15) {
        try {
            const a = audio();
            const o = a.createOscillator();
            const g = a.createGain();
            o.type = type; o.frequency.value = freq; g.gain.value = vol;
            o.connect(g); g.connect(a.destination);
            o.start();
            g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
            o.stop(a.currentTime + dur);
        } catch (e) {}
    }

    /* Returns a shuffled copy; the original array is left alone. */
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /* ── Confetti ──
       Drops `count` pieces into #confetti (created if missing). Each piece removes
       itself when it lands, so bursts can overlap without piling up. */
    const CONFETTI_COLORS = ['#ffd700','#ff6bbd','#a855f7','#38bdf8','#34d399','#fb923c','#f43f5e'];
    function confetti(count = 80) {
        let wrap = document.getElementById('confetti');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'confetti-wrap';
            wrap.id = 'confetti';
            document.body.appendChild(wrap);
        }
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'cp';
            const w  = Math.random() * 10 + 6;
            const h  = Math.random() * 10 + 6;
            const br = Math.random() > 0.5 ? '50%' : '2px';
            p.style.cssText = `left:${Math.random()*100}%;width:${w}px;height:${h}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${br};--fd:${(Math.random()*2+1.5).toFixed(2)}s;--del:${(Math.random()*.8).toFixed(2)}s`;
            p.addEventListener('animationend', () => p.remove());
            wrap.appendChild(p);
        }
    }

    window.Kit = { shuffle, confetti, audio, tone };
})();
