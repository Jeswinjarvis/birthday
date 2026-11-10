(() => {
  'use strict';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const $ = id => document.getElementById(id);
  const content = window.birthdayContent;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const photoDialog = $('photoDialog');
  const letterDialog = $('letterDialog');
  let activePhoto = 0;
  let lastFocus;
  const chapters = ['home', 'birthday', 'memories', 'letter', 'gifts'];
  let currentStage = 'home', unlocked = 0, candleTransition;
  let memoryIndex = 0, memoryTimer, memoryPaused = reducedMotion.matches, memoryAnimating = false;
  let memoryDirection = 1;
  let fastSwipesRemaining = 0;
  const cards = [];
  const bgMusic = $('bgMusic');
  let musicOn = false, userMuted = false, musicWasPlayingBeforeMic = false;

  if (bgMusic) {
    const configuredSong = content?.song;
    if (configuredSong && bgMusic.getAttribute('src') !== encodeURI(configuredSong)) {
      bgMusic.src = encodeURI(configuredSong);
    }
    bgMusic.loop = true;
    bgMusic.volume = 0.75;
  }

  function showStage(id) {
    const index = chapters.indexOf(id);
    if (index < 0 || index > unlocked) return;
    clearTimeout(candleTransition);
    stopMicrophone();
    currentStage = id;
    chapters.forEach(chapter => { $(chapter).hidden = chapter !== id; });
    document.querySelectorAll('.journey-nav button').forEach(button => {
      button.disabled = chapters.indexOf(button.dataset.go) > unlocked;
      if (button.dataset.go === id) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    $(id).querySelector('h1,h2').focus({ preventScroll: true });
    if (id === 'memories') {
      fastSwipesRemaining = cards.length;
      $('memoryDeck')?.classList.add('fast-deck');
    }
    scheduleMemory();
  }
  function advanceTo(id) { unlocked = Math.max(unlocked, chapters.indexOf(id)); showStage(id); }
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.go;
    if ((currentStage === 'memories' && id === 'letter') || (currentStage === 'letter' && id === 'gifts')) advanceTo(id);
    else showStage(id);
  }));
  $('celebrateButton').addEventListener('click', () => {
    advanceTo('birthday');
    if (!musicOn && !userMuted) {
      playMusic().catch(() => {});
    }
  });
  $('toMemories').addEventListener('click', () => advanceTo('memories'));

  function openDialog(dialog) {
    lastFocus = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    clearTimeout(memoryTimer);
  }
  for (const dialog of [photoDialog, letterDialog]) {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      lastFocus?.focus({ preventScroll: true });
      scheduleMemory();
    });
  }

  content.photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.className = 'memory-card';
    button.setAttribute('aria-label', `Open photo ${index + 1}: ${photo.title}`);
    const wrap = document.createElement('div');
    wrap.className = 'memory-photo';
    const img = document.createElement('img');
    img.src = `assets/${photo.file}`;
    img.alt = photo.alt;
    img.loading = index < 3 ? 'eager' : 'lazy';
    img.draggable = false;
    img.style.objectPosition = photo.position;
    const expand = document.createElement('span');
    expand.className = 'photo-expand'; expand.textContent = '↗'; expand.setAttribute('aria-hidden', 'true');
    wrap.append(img, expand);
    const title = document.createElement('h3'); title.textContent = photo.title;
    button.append(wrap, title);
    button.addEventListener('click', () => {
      if (performance.now() < suppressCardClickUntil || memoryAnimating) return;
      showPhoto(index); openDialog(photoDialog);
    });
    cards.push(button);
    $('memoryCards').append(button);
  });
  function renderDeck() {
    cards.forEach((card, index) => {
      const offset = (index - memoryIndex + cards.length) % cards.length;
      card.className = 'memory-card';
      card.style.setProperty('--depth', offset);
      card.style.zIndex = String(cards.length - offset);
      card.hidden = offset > 2;
      card.inert = offset !== 0;
      card.setAttribute('aria-hidden', String(offset !== 0));
      card.tabIndex = offset === 0 ? 0 : -1;
      if (offset === 0) card.classList.add('front-card');
    });
    $('memoryCount').textContent = `${String(memoryIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }
  function scheduleMemory() {
    clearTimeout(memoryTimer);
    if (currentStage !== 'memories' || memoryPaused || document.hidden || photoDialog.open || letterDialog.open) return;
    const isFast = fastSwipesRemaining > 0;
    if (isFast) {
      $('memoryDeck')?.classList.add('fast-deck');
    } else {
      $('memoryDeck')?.classList.remove('fast-deck');
    }
    const delay = isFast ? 400 : 2000;
    memoryTimer = setTimeout(() => {
      swipeMemory(1, memoryDirection);
      memoryDirection *= -1;
    }, delay);
  }
  function swipeMemory(step, direction = step) {
    if (memoryAnimating) return;
    clearTimeout(memoryTimer);
    memoryAnimating = true;
    const isFast = fastSwipesRemaining > 0;
    if (isFast) {
      fastSwipesRemaining--;
      if (fastSwipesRemaining === 0) {
        $('memoryDeck')?.classList.remove('fast-deck');
      }
    }
    const animDuration = isFast ? 240 : 480;
    const outgoing = cards[memoryIndex];
    outgoing.classList.add(direction > 0 ? 'fly-left' : 'fly-right');
    setTimeout(() => {
      memoryIndex = (memoryIndex + step + cards.length) % cards.length;
      renderDeck(); memoryAnimating = false; scheduleMemory();
    }, reducedMotion.matches ? 0 : animDuration);
  }
  $('previousMemory').addEventListener('click', () => {
    fastSwipesRemaining = 0;
    $('memoryDeck')?.classList.remove('fast-deck');
    swipeMemory(-1);
  });
  $('nextMemory').addEventListener('click', () => {
    fastSwipesRemaining = 0;
    $('memoryDeck')?.classList.remove('fast-deck');
    swipeMemory(1);
  });
  function updatePause() {
    $('pauseMemories').textContent = memoryPaused ? 'Play slideshow' : 'Pause slideshow';
    $('pauseMemories').setAttribute('aria-pressed', String(memoryPaused));
  }
  $('pauseMemories').addEventListener('click', () => { memoryPaused = !memoryPaused; updatePause(); scheduleMemory(); });
  let pointerStart = null, suppressCardClickUntil = 0;
  $('memoryDeck').addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  $('memoryDeck').addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      suppressCardClickUntil = performance.now() + 800;
      fastSwipesRemaining = 0;
      $('memoryDeck')?.classList.remove('fast-deck');
      swipeMemory(dx < 0 ? 1 : -1);
    }
  });
  $('memoryDeck').addEventListener('pointercancel', () => { pointerStart = null; });
  $('memoryDeck').addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      fastSwipesRemaining = 0;
      $('memoryDeck')?.classList.remove('fast-deck');
      swipeMemory(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  renderDeck(); updatePause();
  function showPhoto(index) {
    activePhoto = (index + content.photos.length) % content.photos.length;
    const photo = content.photos[activePhoto];
    $('largePhoto').src = `assets/${photo.file}`;
    $('largePhoto').alt = photo.alt;
    $('photoTitle').textContent = photo.title;
    $('photoCaption').textContent = photo.caption;
    $('photoNumber').textContent = `MEMORY 0${activePhoto + 1} / 0${content.photos.length}`;
  }
  $('previousPhoto').addEventListener('click', () => showPhoto(activePhoto - 1));
  $('nextPhoto').addEventListener('click', () => showPhoto(activePhoto + 1));
  photoDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(activePhoto - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(activePhoto + 1); }
  });
  let touchStart = 0;
  $('largePhoto').addEventListener('touchstart', event => { touchStart = event.changedTouches[0].screenX; }, { passive: true });
  $('largePhoto').addEventListener('touchend', event => {
    const distance = event.changedTouches[0].screenX - touchStart;
    if (Math.abs(distance) > 65) showPhoto(activePhoto + (distance < 0 ? 1 : -1));
  }, { passive: true });

  content.letter.forEach(text => { const p = document.createElement('p'); p.textContent = text; $('letterText').append(p); });
  $('letterSignature').textContent = content.signature;
  $('openLetter').addEventListener('click', () => openDialog(letterDialog));
  $('envelopeButton').addEventListener('click', () => openDialog(letterDialog));
  $('letterToGift').addEventListener('click', () => { letterDialog.close(); advanceTo('gifts'); });

  // One selection per browser. If storage is unavailable, the in-memory lock still applies.
  const giftKey = 'jithin-birthday-2026-gift-choice';
  let selectedGift = null;
  try {
    const saved = localStorage.getItem(giftKey);
    if (saved !== null && /^[0-8]$/.test(saved)) selectedGift = Number(saved);
  } catch { /* Storage may be unavailable in private/file browsing. */ }
  const giftButtons = [];
  for (let index = 0; index < 9; index++) {
    const button = document.createElement('button'); button.className = 'gift-box';
    const image = document.createElement('img'); image.src = 'assets/gift-box.svg'; image.alt = ''; image.draggable = false;
    const label = document.createElement('span'); label.textContent = `For you · ${String(index + 1).padStart(2, '0')}`;
    button.append(image, label); button.setAttribute('aria-label', `Open gift box ${index + 1}`);
    button.addEventListener('click', () => {
      if (selectedGift !== null) return;
      selectedGift = index;
      try { localStorage.setItem(giftKey, String(index)); } catch { /* Keep the current-session lock. */ }
      renderGift(); celebrate();
      $('giftResultTitle').focus({ preventScroll: true });
      $('giftResult').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    });
    giftButtons.push(button); $('giftGrid').append(button);
  }
  function renderGift() {
    giftButtons.forEach((button, index) => {
      const chosen = index === selectedGift;
      button.disabled = selectedGift !== null;
      button.classList.toggle('chosen', chosen);
      button.classList.toggle('locked', selectedGift !== null && !chosen);
      button.querySelector('img').src = chosen ? (content?.giftImage || 'assets/wallet.jpeg') : 'assets/gift-box.svg';
      button.querySelector('span').textContent = chosen ? 'Yours, with love ♡' : selectedGift !== null ? 'Sealed with love' : `For you · ${String(index + 1).padStart(2, '0')}`;
      button.setAttribute('aria-label', chosen ? `Gift box ${index + 1}, selected: a men's wallet` : `Gift box ${index + 1}${selectedGift !== null ? ', locked' : ', open'}`);
    });
    $('giftResult').hidden = selectedGift === null;
    if (content?.giftImage && $('giftResultImage')) $('giftResultImage').src = content.giftImage;
    $('giftStatus').textContent = selectedGift === null ? '' : `You chose box ${selectedGift + 1}. Your gift is a men’s wallet. The other eight boxes are locked.`;
    if (selectedGift !== null) $('giftInstructions').textContent = 'Your surprise is already waiting below, my love.';
  }
  renderGift();

  let candleOut = false;
  let micStream, micContext, micFrame, micTimeout;
  let micRequest = 0;
  let listening = false;
  function stopMicrophone() {
    micRequest++;
    listening = false;
    cancelAnimationFrame(micFrame);
    clearTimeout(micTimeout);
    micStream?.getTracks().forEach(track => track.stop());
    micStream = undefined;
    if (micContext) micContext.close().catch(() => {});
    micContext = undefined;
    $('micButton').disabled = false;
    $('micButton').textContent = 'Or blow using your microphone';
    if (musicWasPlayingBeforeMic) {
      musicWasPlayingBeforeMic = false;
      if (!userMuted && musicOn && bgMusic) {
        bgMusic.play().catch(() => {});
      }
    }
  }
  function blowCandle() {
    if (candleOut) return;
    candleOut = true;
    stopMicrophone();
    $('micStatus').textContent = '';
    document.querySelector('.cake-scene').classList.add('blown');
    $('wishStatus').textContent = 'Happy birthday, my love. Now, a few little pieces of us…';
    $('blowButton').textContent = 'Wish made, my love ♡';
    $('blowButton').disabled = true;
    $('candleButton').setAttribute('aria-label', 'Birthday candle is blown out');
    $('micButton').hidden = true;
    $('relightButton').hidden = false;
    $('toMemories').hidden = false;
    unlocked = Math.max(unlocked, 2);
    celebrate();
    candleTransition = setTimeout(() => { if (currentStage === 'birthday') advanceTo('memories'); }, 2200);
  }
  $('candleButton').addEventListener('click', blowCandle);
  $('blowButton').addEventListener('click', blowCandle);
  $('relightButton').addEventListener('click', () => {
    clearTimeout(candleTransition);
    candleOut = false;
    document.querySelector('.cake-scene').classList.remove('blown');
    $('wishStatus').textContent = 'All my wishes start and end with you.';
    $('blowButton').innerHTML = 'Blow out the candle <span aria-hidden="true">✧</span>';
    $('blowButton').disabled = false;
    $('candleButton').setAttribute('aria-label', 'Blow out the birthday candle');
    $('micButton').hidden = false;
    $('relightButton').hidden = true;
    $('toMemories').hidden = true;
  });
  $('micButton').addEventListener('click', async () => {
    if (listening) { stopMicrophone(); $('micStatus').textContent = 'Microphone off. You can still tap the candle.'; return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      $('micStatus').textContent = 'Microphone access needs localhost or a secure website. Tap the candle to make your wish.';
      return;
    }
    if (musicOn && bgMusic && !bgMusic.paused) {
      musicWasPlayingBeforeMic = true;
      bgMusic.pause();
    }
    const request = ++micRequest;
    $('micButton').disabled = true;
    $('micStatus').textContent = 'Allow microphone access to blow out the candle. Audio stays on your device and is never recorded.';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (request !== micRequest || candleOut || document.hidden) { stream.getTracks().forEach(track => track.stop()); return; }
      micStream = stream;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      micContext = new AudioContextClass();
      await micContext.resume();
      if (request !== micRequest || !micContext) return;
      const analyser = micContext.createAnalyser(); analyser.fftSize = 2048;
      micContext.createMediaStreamSource(stream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      let baseline = 0, samples = 0, strongFrames = 0;
      const started = performance.now();
      listening = true;
      $('micButton').disabled = false; $('micButton').textContent = 'Stop microphone';
      $('micStatus').textContent = 'One quiet second… then gently blow toward your microphone.';
      function listen(now) {
        if (!listening) return;
        analyser.getFloatTimeDomainData(data);
        const rms = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
        if (now - started < 1200) { baseline += rms; samples++; }
        else {
          $('micStatus').textContent = 'Listening… gently blow toward your microphone. Nothing is recorded.';
          const threshold = Math.max(.065, (baseline / Math.max(1, samples)) * 2.8);
          strongFrames = rms > threshold ? strongFrames + 1 : Math.max(0, strongFrames - 2);
          if (strongFrames > 10) { blowCandle(); return; }
        }
        micFrame = requestAnimationFrame(listen);
      }
      micFrame = requestAnimationFrame(listen);
      micTimeout = setTimeout(() => { stopMicrophone(); $('micStatus').textContent = 'Microphone switched off. Try again or tap the candle.'; }, 20000);
    } catch (error) {
      if (request !== micRequest) return;
      stopMicrophone();
      $('micStatus').textContent = 'Couldn’t use the microphone. You can tap the candle instead.';
    }
  });

  const canvas = $('confetti');
  const ctx = canvas.getContext('2d');
  let particles = [], confettiFrame, confettiStart;
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  function celebrate() {
    if (reducedMotion.matches) return;
    cancelAnimationFrame(confettiFrame);
    particles = Array.from({ length: innerWidth < 600 ? 100 : 180 }, () => ({
      x: innerWidth * (.15 + Math.random() * .7), y: innerHeight * (.2 + Math.random() * .25),
      vx: (Math.random() - .5) * 12, vy: -6 - Math.random() * 10,
      size: 3 + Math.random() * 6, angle: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .2, color: ['#a64e5c', '#d3ae78', '#ebbac0', '#c78a94'][Math.floor(Math.random() * 4)]
    }));
    confettiStart = performance.now();
    let last = confettiStart;
    function draw(now) {
      const step = Math.min((now - last) / 16.67, 2); last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.min(1, Math.max(0, (5200 - (now - confettiStart)) / 1000));
      particles.forEach(p => {
        p.vy += .15 * step; p.x += p.vx * step; p.y += p.vy * step; p.angle += p.spin * step;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .45); ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (now - confettiStart < 5200) confettiFrame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
    confettiFrame = requestAnimationFrame(draw);
  }

  // Background music arrangement: plays the selected song from the Song folder with synthesized fallback.
  let musicContext, master, musicTimer, synthMusicOn = false, noteIndex = 0;
  const melody = [261.63,329.63,392,523.25,440,392,329.63,293.66,261.63,349.23,440,523.25,493.88,392,329.63,293.66];
  function musicNote() {
    if (!synthMusicOn || musicContext?.state !== 'running') return;
    const now = musicContext.currentTime;
    const frequency = melody[noteIndex % melody.length];
    for (const [freq, volume] of [[frequency, .075], [frequency / 2, .035]]) {
      const osc = musicContext.createOscillator(); const gain = musicContext.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, now + 2.4);
      osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + 2.5);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    noteIndex++;
  }
  function stopSynthMusic() {
    synthMusicOn = false; clearInterval(musicTimer);
    musicContext?.suspend().catch(() => {});
  }
  async function playSynthMusic() {
    if (!musicContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      musicContext = new AudioContextClass(); master = musicContext.createGain();
      master.gain.value = .6; master.connect(musicContext.destination);
    }
    await musicContext.resume(); synthMusicOn = true; musicOn = true; musicNote(); musicTimer = setInterval(musicNote, 700);
    $('soundToggle').setAttribute('aria-pressed', 'true'); $('soundLabel').textContent = 'Sound on';
    $('soundToggle').setAttribute('aria-label', 'Pause background music');
  }
  async function playMusic() {
    if (bgMusic && bgMusic.src) {
      try {
        await bgMusic.play();
        musicOn = true;
        $('soundToggle').setAttribute('aria-pressed', 'true');
        $('soundLabel').textContent = 'Sound on';
        $('soundToggle').setAttribute('aria-label', 'Pause background music');
        return true;
      } catch (error) {
        console.warn('Audio element play failed, falling back to synth arrangement:', error);
      }
    }
    try {
      await playSynthMusic();
      return true;
    } catch {
      $('soundLabel').textContent = 'Sound unavailable';
      return false;
    }
  }
  function stopMusic() {
    musicOn = false;
    musicWasPlayingBeforeMic = false;
    if (bgMusic) bgMusic.pause();
    stopSynthMusic();
    $('soundToggle').setAttribute('aria-pressed', 'false'); $('soundLabel').textContent = 'Sound off';
    $('soundToggle').setAttribute('aria-label', 'Play gentle background music');
  }
  $('soundToggle').addEventListener('click', async () => {
    if (musicOn) { userMuted = true; stopMusic(); }
    else { userMuted = false; await playMusic(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopMusic(); stopMicrophone(); $('micStatus').textContent = ''; clearTimeout(memoryTimer); }
    else scheduleMemory();
  });
  window.addEventListener('pagehide', () => { stopMusic(); stopMicrophone(); });

  showStage('home');
})();
