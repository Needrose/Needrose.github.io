// --- Audio Dots Animation ---
let visualizerAvg = 256; // Default average for normalization
let visualizerMax = 512; // Default max for normalization

// --- Efficient Dots Preload (minimal RAM, no unnecessary re-creation) ---
(function setupDots() {
  let lastCols = 0, lastRows = 0;
  function createDots() {
    const dotsContainer = document.querySelector('.dots');
    if (!dotsContainer) return;
    const DOT_SPACING = 30, DOT_RADIUS = 2;
    const width = window.innerWidth, height = window.innerHeight;
    const DOT_COLS = Math.ceil(width / DOT_SPACING), DOT_ROWS = Math.ceil(height / DOT_SPACING);
    // Only recreate if grid size changed
    if (window.dotsArr && window.dotsArr.length === DOT_COLS * DOT_ROWS) return;
    dotsContainer.innerHTML = '';
    dotsContainer.style.width = width + 'px';
    dotsContainer.style.height = height + 'px';
    window.dotsArr = new Array(DOT_ROWS * DOT_COLS);
    for (let y = 0; y < DOT_ROWS; y++) {
      for (let x = 0; x < DOT_COLS; x++) {
        const idx = y * DOT_COLS + x;
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = `${DOT_RADIUS * 2}px`;
        dot.style.height = `${DOT_RADIUS * 2}px`;
        dot.style.borderRadius = '50%';
        dot.style.background = 'rgba(168, 85, 247, 0.10)';
        dot.style.left = `${x * DOT_SPACING}px`;
        dot.style.top = `${y * DOT_SPACING}px`;
        dot.dataset.baseX = x * DOT_SPACING;
        dot.dataset.baseY = y * DOT_SPACING;
        dot.dataset.col = x;
        dot.dataset.row = y;
        dotsContainer.appendChild(dot);
        window.dotsArr[idx] = dot;
      }
    }
    lastCols = DOT_COLS;
    lastRows = DOT_ROWS;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDots);
  } else {
    createDots();
  }
  window.addEventListener('resize', createDots);
})();

function setupAudioVisualizer(audio) {
  if (!window.AudioContext) return;
  if (!window.audioCtx || window.audioCtx.state === 'closed') {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window.audioSource = window.audioCtx.createMediaElementSource(audio);
    window.audioAnalyser = window.audioCtx.createAnalyser();
    window.audioAnalyser.fftSize = 128;
    window.audioSource.connect(window.audioAnalyser);
    window.audioAnalyser.connect(window.audioCtx.destination);
    window.audioDataArray = new Uint8Array(window.audioAnalyser.frequencyBinCount);
    window.audioTimeArray = new Uint8Array(window.audioAnalyser.fftSize);
  }

  visualizerAvg = 256;
  visualizerMax = 512;
  let avgSamples = [];
  let maxSamples = [];
  let avgFrames = 0;
  function sampleAvg() {
    window.audioAnalyser.getByteFrequencyData(window.audioDataArray);
    window.audioAnalyser.getByteTimeDomainData(window.audioTimeArray);
    let sum = 0;
    let count = 0;
    let maxVal = 0;
    const DOT_COLS = Math.ceil(window.innerWidth / 30);
    const DOT_ROWS = Math.ceil(window.innerHeight / 30);
    const center = Math.floor(DOT_COLS / 2);
    for (let y = 0; y < DOT_ROWS; y++) {
      const freqBin = Math.floor(((DOT_ROWS - 1 - y) / DOT_ROWS) * window.audioDataArray.length);
      for (let x = 0; x < DOT_COLS; x++) {
        let dist = Math.abs(x - center);
        let maxDist = Math.max(center, DOT_COLS - center - 1);
        let pitchNorm = maxDist === 0 ? 0 : dist / maxDist;
        const pitchBin = Math.floor(pitchNorm * (window.audioDataArray.length - 1));
        let amp = (window.audioDataArray[freqBin] + window.audioDataArray[pitchBin]) / 2 || 0;
        let wave = window.audioTimeArray[(y * DOT_COLS + x) % window.audioTimeArray.length] || 128;
        let norm = amp / 128;
        let waveNorm = (wave - 128) / 128;
        let mixed = (norm + 0.5 * waveNorm) * 0.5;
        sum += Math.abs(mixed);
        if (Math.abs(mixed) > maxVal) maxVal = Math.abs(mixed);
        count++;
      }
    }
    avgSamples.push(sum / count);
    maxSamples.push(maxVal);
    avgFrames++;
    if (avgFrames < 20) {
      requestAnimationFrame(sampleAvg);
    } else {
      avgSamples.sort((a, b) => a - b);
      maxSamples.sort((a, b) => a - b);
      visualizerAvg = avgSamples[Math.floor(avgSamples.length / 2)] || 1;
      visualizerMax = maxSamples[Math.floor(maxSamples.length * 0.95)] || 1;
      if (visualizerAvg < 0.1) visualizerAvg = 0.1;
      if (visualizerMax < 0.2) visualizerMax = 0.2;
    }
  }
  sampleAvg();

  if (window.animationId) cancelAnimationFrame(window.animationId);
  animateDotsToAudio();
}

function animateDotsToAudio() {
  const DOT_SPACING = 30;
  if (!window.audioAnalyser || !window.dotsArr || !window.dotsArr.length) return;

  window.audioAnalyser.getByteFrequencyData(window.audioDataArray);
  if (!window.audioTimeArray || window.audioTimeArray.length !== window.audioAnalyser.fftSize) {
    window.audioTimeArray = new Uint8Array(window.audioAnalyser.fftSize);
  }
  window.audioAnalyser.getByteTimeDomainData(window.audioTimeArray);

  const DOT_COLS = Math.ceil(window.innerWidth / DOT_SPACING);
  const DOT_ROWS = Math.ceil(window.innerHeight / DOT_SPACING);

  if (!window._dotSmooth2d || window._dotSmooth2d.length !== DOT_ROWS * DOT_COLS) {
    window._dotSmooth2d = new Float32Array(DOT_ROWS * DOT_COLS);
  }

  const center = Math.floor(DOT_COLS / 2);
  const freqLen = window.audioDataArray.length;
  const timeLen = window.audioTimeArray.length;
  const maxDist = Math.max(center, DOT_COLS - center - 1);

  for (let y = 0; y < DOT_ROWS; y++) {
    const freqBin = Math.floor(((DOT_ROWS - 1 - y) / DOT_ROWS) * freqLen);

    for (let x = 0; x < DOT_COLS; x++) {
      const idx = y * DOT_COLS + x;
      const dot = window.dotsArr[idx];
      if (!dot) continue;
      let dist = Math.abs(x - center);
      let pitchNorm = maxDist === 0 ? 0 : dist / maxDist;
      const pitchBin = Math.floor(pitchNorm * (freqLen - 1));
      let amp = (window.audioDataArray[freqBin] + window.audioDataArray[pitchBin]) * 0.5;
      let wave = window.audioTimeArray[(y * DOT_COLS + x) % timeLen] || 128;
      let norm = amp / 128;
      let waveNorm = (wave - 128) / 128;
      let mixed = (norm + 0.5 * waveNorm) * 0.5;
      let normalized = mixed / visualizerAvg;
      normalized = Math.min(normalized, visualizerMax / visualizerAvg, 2.2);
      normalized = Math.max(0, normalized);

      window._dotSmooth2d[idx] += (normalized - window._dotSmooth2d[idx]) * 0.28;
      const scale = 1 + Math.max(0, Math.min(window._dotSmooth2d[idx], 1.5)) * 0.5;

      if (!dot._willChangeSet) {
        dot.style.willChange = 'transform';
        dot._willChangeSet = true;
      }

      if (!dot._lastScale || Math.abs(dot._lastScale - scale) > 0.03) {
        dot.style.transform = `scale3d(${scale},${scale},1)`;
        dot._lastScale = scale;
      }
    }
  }
  window.animationId = requestAnimationFrame(animateDotsToAudio);
}

document.addEventListener("DOMContentLoaded", function() {
  // gradient
  document.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.querySelectorAll(".mouse-gradient").forEach(layer => {
      layer.style.setProperty("--mouse-x", `${x}%`);
      layer.style.setProperty("--mouse-y", `${y}%`);
    });
  });

  // cursor
  const customCursor = document.querySelector(".custom-cursor");
  let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.35;
    cursorY += (mouseY - cursorY) * 0.35;
    if (customCursor) {
      customCursor.style.left = cursorX + "px";
      customCursor.style.top = cursorY + "px";
    }
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // dots
  const dotsContainer = document.querySelector('.dots');
  const DOT_SPACING = 30, DOT_RADIUS = 2, PUSH_RADIUS = 60, PUSH_STRENGTH = 40;
  window.dotsArr = [];
  window.audioAnalyser = null;
  window.audioDataArray = null;
  window.audioSource = null;
  window.audioCtx = null;
  window.animationId = null;

  // --- Optimized Maze Dots ---
  let mazeMouseX = null, mazeMouseY = null;
  let mazeAnimFrame = null;

  function createMazeDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    dotsContainer.style.background = 'none';
    const width = window.innerWidth, height = window.innerHeight;
    const DOT_COLS = Math.ceil(width / DOT_SPACING), DOT_ROWS = Math.ceil(height / DOT_SPACING);
    dotsContainer.style.width = width + 'px';
    dotsContainer.style.height = height + 'px';
    window.dotsArr = [];
    for (let y = 0; y < DOT_ROWS; y++) {
      for (let x = 0; x < DOT_COLS; x++) {
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = `${DOT_RADIUS * 2}px`;
        dot.style.height = `${DOT_RADIUS * 2}px`;
        dot.style.borderRadius = '50%';
        dot.style.background = 'rgba(168, 85, 247, 0.10)';
        dot.style.left = `${x * DOT_SPACING}px`;
        dot.style.top = `${y * DOT_SPACING}px`;
        dot.dataset.baseX = x * DOT_SPACING;
        dot.dataset.baseY = y * DOT_SPACING;
        dot._baseX = x * DOT_SPACING;
        dot._baseY = y * DOT_SPACING;
        dot._offsetX = 0;
        dot._offsetY = 0;
        dot.dataset.col = x;
        dot.dataset.row = y;
        dotsContainer.appendChild(dot);
        window.dotsArr.push(dot);
      }
    }
  }

  function mazeOnMouseMove(e) {
    const rect = dotsContainer.getBoundingClientRect();
    mazeMouseX = e.clientX - rect.left;
    mazeMouseY = e.clientY - rect.top;
    if (!mazeAnimFrame) {
      mazeAnimFrame = requestAnimationFrame(mazeAnimateDots);
    }
  }

  function mazeAnimateDots() {
    if (mazeMouseX === null || mazeMouseY === null) {
      mazeAnimFrame = null;
      return;
    }
    for (let i = 0; i < window.dotsArr.length; i++) {
      const dot = window.dotsArr[i];
      const baseX = dot._baseX, baseY = dot._baseY;
      const dx = mazeMouseX - baseX, dy = mazeMouseY - baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let targetOffsetX = 0, targetOffsetY = 0;
      if (dist < PUSH_RADIUS) {
        const angle = Math.atan2(dy, dx);
        const push = (1 - dist / PUSH_RADIUS) * PUSH_STRENGTH;
        targetOffsetX = -Math.cos(angle) * push;
        targetOffsetY = -Math.sin(angle) * push;
      }
      // Smoothly interpolate offsets for a fluid effect
      dot._offsetX += (targetOffsetX - dot._offsetX) * 0.25;
      dot._offsetY += (targetOffsetY - dot._offsetY) * 0.25;
      // Only update style if changed enough
      if (
        Math.abs(dot._offsetX) > 0.5 || Math.abs(dot._offsetY) > 0.5 ||
        dot.style.left !== `${baseX + dot._offsetX}px` ||
        dot.style.top !== `${baseY + dot._offsetY}px`
      ) {
        dot.style.left = `${baseX + dot._offsetX}px`;
        dot.style.top = `${baseY + dot._offsetY}px`;
      }
    }
    mazeAnimFrame = requestAnimationFrame(mazeAnimateDots);
  }

  function mazeOnMouseLeave() {
    mazeMouseX = null;
    mazeMouseY = null;
    // Animate dots back to base positions
    function animateBack() {
      let stillMoving = false;
      for (let i = 0; i < window.dotsArr.length; i++) {
        const dot = window.dotsArr[i];
        dot._offsetX += (0 - dot._offsetX) * 0.18;
        dot._offsetY += (0 - dot._offsetY) * 0.18;
        if (Math.abs(dot._offsetX) > 0.5 || Math.abs(dot._offsetY) > 0.5) {
          stillMoving = true;
        }
        dot.style.left = `${dot._baseX + dot._offsetX}px`;
        dot.style.top = `${dot._baseY + dot._offsetY}px`;
      }
      if (stillMoving) {
        mazeAnimFrame = requestAnimationFrame(animateBack);
      } else {
        mazeAnimFrame = null;
      }
    }
    if (!mazeAnimFrame) {
      mazeAnimFrame = requestAnimationFrame(animateBack);
    }
  }

  createMazeDots();
  window.addEventListener('resize', createMazeDots);

  // Remove old handler if present
  if (window._mazeDotHandler) {
    document.removeEventListener('mousemove', window._mazeDotHandler);
    dotsContainer.removeEventListener('mouseleave', window._mazeDotLeaveHandler);
  }
  window._mazeDotHandler = mazeOnMouseMove;
  window._mazeDotLeaveHandler = mazeOnMouseLeave;
  document.addEventListener('mousemove', mazeOnMouseMove);
  dotsContainer.addEventListener('mouseleave', mazeOnMouseLeave);

  function enableMouseCursor() {
    document.body.classList.remove('no-mouse');
  }
  function disableMouseCursor() {
    document.body.classList.add('no-mouse');
  }

  let mouseDetectionDone = false;
  function setupInputDetection() {
    window.addEventListener('touchstart', function onTouch() {
      if (!mouseDetectionDone) {
        disableMouseCursor();
        mouseDetectionDone = true;
      }
    }, { once: true, passive: true });

    window.addEventListener('mousemove', function onMouse() {
      if (!mouseDetectionDone) {
        enableMouseCursor();
        mouseDetectionDone = true;
      }
    }, { once: true, passive: true });
  }
  setupInputDetection();

  disableMouseCursor();
});

function createFPSCounter() {
  if (document.getElementById('fps-counter')) return;
  const topbar = document.querySelector('.topbar .container');
  if (!topbar) return;
  let fpsDiv = document.createElement('div');
  fpsDiv.id = 'fps-counter';
  fpsDiv.style.background = 'rgba(31,31,46,0.92)';
  fpsDiv.style.color = '#fff';
  fpsDiv.style.fontFamily = "'Segoe UI', sans-serif";
  fpsDiv.style.fontSize = '1.05rem';
  fpsDiv.style.padding = '4px 18px';
  fpsDiv.style.borderRadius = '10px';
  fpsDiv.style.boxShadow = '0 2px 12px 0 #a855f7aa, 0 0 0 1.5px #a855f7';
  fpsDiv.style.zIndex = 1001;
  fpsDiv.style.pointerEvents = 'none';
  fpsDiv.style.opacity = '0.92';
  fpsDiv.style.userSelect = 'none';
  fpsDiv.style.margin = '0 18px';
  fpsDiv.innerHTML = 'FPS: <span id="fps-value">0</span>';
  const logo = topbar.querySelector('.logo');
  const nav = topbar.querySelector('.nav-wrapper');
  if (logo && nav) {
    topbar.insertBefore(fpsDiv, nav);
  } else {
    topbar.appendChild(fpsDiv);
  }
}
createFPSCounter();

(function fpsLoop() {
  let last = performance.now(), frames = 0, fps = 0;
  function loop(now) {
    frames++;
    if (now - last >= 1000) {
      fps = frames;
      frames = 0;
      last = now;
      const el = document.getElementById('fps-value');
      if (el) el.textContent = fps;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

function showAutoplayPopup() {
  let old = document.getElementById('autoplay-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'autoplay-popup';
  popup.innerHTML = `
    <span style="margin-right:8px;"><i class="fa-solid fa-volume-xmark"></i></span>
    Please enable autoplay or interact with the page to start music!
  `;
  popup.style.position = 'fixed';
  popup.style.right = '32px';
  popup.style.bottom = '32px';
  popup.style.background = 'rgba(31, 31, 46, 0.97)';
  popup.style.color = '#fff';
  popup.style.fontFamily = "'Segoe UI', sans-serif";
  popup.style.fontSize = '1.08rem';
  popup.style.padding = '16px 28px';
  popup.style.borderRadius = '14px';
  popup.style.boxShadow = '0 4px 24px 0 #a855f7aa, 0 0 0 2px #a855f7';
  popup.style.zIndex = 999999;
  popup.style.display = 'flex';
  popup.style.alignItems = 'center';
  popup.style.gap = '8px';
  popup.style.opacity = '0';
  popup.style.transition = 'opacity 0.4s';

  document.body.appendChild(popup);
  setTimeout(() => { popup.style.opacity = '1'; }, 10);
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 600);
  }, 4000);
}

document.addEventListener("DOMContentLoaded", function() {
  const playlist = [
    {
      title: "Chris",
      artist: "C418",
      url: "/music/Chris.mp3",
      cover: "/images/minecraft.jpeg"
    },
    {
      title: "Day at the Races",
      artist: "scntfc",
      url: "/music/Day at the Races.mp3",
      cover: "/images/sasquatch.jpg"
    },
    {
      title: "Sneaky Sasquatch",
      artist: "scntfc",
      url: "/music/Sneaky Sasquatch.mp3",
      cover: "/images/sasquatch.jpg"
    },
    {
      title: "Radio Jams",
      artist: "A Shell In The Pit",
      url: "/music/Radio Jams.mp3",
      cover: "/images/sasquatch.jpg"
    },
    {
      title: "Windy Pines",
      artist: "A Shell In The Pit",
      url: "/music/Windy Pines.mp3",
      cover: "/images/sasquatch.jpg"
    }
  ];
  let current = 0;
  let isPlaying = false;
  let isRepeat = false;
  let shuffledOrder = shuffleArray([...Array(playlist.length).keys()]);

  const player = document.getElementById('audio-player');
  const audio = document.getElementById('player-audio');
  const playBtn = player.querySelector('.player__play');
  const prevBtn = player.querySelector('.player__prev');
  const nextBtn = player.querySelector('.player__next');
  const volumeSlider = player.querySelector('#player-volume');
  const songEl = document.getElementById('player-song');
  const artistEl = document.getElementById('player-artist');
  const bgEl = document.getElementById('player-bg');
  const controlsBgEl = document.getElementById('player-controls-bg');
  const coverImg = document.getElementById('player-cover-img');

  function ensureVisualizerAndPlay() {
    setupAudioVisualizer(audio);
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audio.play().catch(() => {
      showAutoplayPopup();
      const tryPlay = () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        audio.play().then(() => {
          let popup = document.getElementById('autoplay-popup');
          if (popup) popup.remove();
        }).catch(() => {

        });
        document.removeEventListener('click', tryPlay);
        document.removeEventListener('keydown', tryPlay);
      };
      document.addEventListener('click', tryPlay);
      document.addEventListener('keydown', tryPlay);
    });
    isPlaying = true;
    updatePlayIcon();
  }

  function updatePlayer(idx) {
    const track = playlist[idx];
    songEl.textContent = track.title;
    artistEl.textContent = track.artist;
    audio.src = track.url;

    const cover = track.cover;
    if (coverImg) coverImg.src = cover;
    if (bgEl) bgEl.style.backgroundImage = `url('${cover}')`;
    if (controlsBgEl) controlsBgEl.style.backgroundImage = `url('${cover}')`;
    setupAudioVisualizer(audio);
  }

  function playTrack(idx) {
    current = idx;
    updatePlayer(current);
    ensureVisualizerAndPlay();
  }

  function updatePlayIcon() {
    const icon = playBtn.querySelector('.player__icon-play');
    if (isPlaying) {
      icon.classList.remove('icon-play');
      icon.classList.add('icon-pause');
      icon.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      icon.classList.remove('icon-pause');
      icon.classList.add('icon-play');
      icon.innerHTML = '';
    }
  }

  playBtn.querySelector('.player__icon-play').innerHTML = '';

  playBtn.addEventListener('click', function() {
    if (audio.paused) {
      ensureVisualizerAndPlay();
    } else {
      audio.pause();
      isPlaying = false;
      updatePlayIcon();
    }
  });

  audio.addEventListener('play', function() {
    isPlaying = true;
    updatePlayIcon();
  });
  audio.addEventListener('pause', function() {
    isPlaying = false;
    updatePlayIcon();
  });

  nextBtn.addEventListener('click', function() {
    let idx = getNextIndex();
    playTrack(idx);
  });
  prevBtn.addEventListener('click', function() {
    let idx = getPrevIndex();
    playTrack(idx);
  });

  volumeSlider.addEventListener('input', function() {
    audio.volume = parseFloat(volumeSlider.value);
  });

  audio.addEventListener('ended', function() {
    if (isRepeat) {
      audio.currentTime = 0;
      audio.play();
    } else {
      let idx = getNextIndex();
      playTrack(idx);
    }
  });

  function getNextIndex() {
    let idx = shuffledOrder.indexOf(current);
    return shuffledOrder[(idx + 1) % shuffledOrder.length];
  }
  function getPrevIndex() {
    let idx = shuffledOrder.indexOf(current);
    return shuffledOrder[(idx - 1 + shuffledOrder.length) % shuffledOrder.length];
  }
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startShuffledMusic() {
    shuffledOrder = shuffleArray([...Array(playlist.length).keys()]);
    current = shuffledOrder[0];
    updatePlayer(current);
    ensureVisualizerAndPlay();
  }

  startShuffledMusic();

  let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
  let targetX = null, targetY = null, animating = false;
  let dragStartOffsetX = 0, dragStartOffsetY = 0;
  let initialLeft = null, initialTop = null;

  const playerMeta = player.querySelector('.player__meta');

  playerMeta.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    isDragging = true;
    player.classList.add('dragging');
    const rect = player.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    player.style.left = `${initialLeft}px`;
    player.style.top = `${initialTop}px`;
    player.style.right = 'auto';
    player.style.bottom = 'auto';
    player.style.transform = 'none';
    dragStartOffsetX = e.clientX - rect.left;
    dragStartOffsetY = e.clientY - rect.top;
    targetX = rect.left;
    targetY = rect.top;
    document.body.style.userSelect = 'none';
  });

  player.querySelector('.player__controls').addEventListener('mousedown', function(e) {
    e.stopPropagation();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    targetX = e.clientX - dragStartOffsetX;
    targetY = e.clientY - dragStartOffsetY;
    targetX = Math.max(0, Math.min(window.innerWidth - player.offsetWidth, targetX));
    targetY = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, targetY));
    if (!animating) {
      animating = true;
      requestAnimationFrame(animatePlayer);
    }
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      player.classList.remove('dragging');
      document.body.style.userSelect = '';
    }
  });

  function animatePlayer() {
    if (targetX === null || targetY === null) {
      animating = false;
      return;
    }
    const rect = player.getBoundingClientRect();
    let curX = rect.left, curY = rect.top;
    let nextX = curX + (targetX - curX) * 0.18;
    let nextY = curY + (targetY - curY) * 0.18;
    if (Math.abs(nextX - targetX) < 1) nextX = targetX;
    if (Math.abs(nextY - targetY) < 1) nextY = targetY;
    player.style.left = nextX + 'px';
    player.style.top = nextY + 'px';
    player.style.right = 'auto';
    player.style.bottom = 'auto';
    player.style.position = 'fixed';
    player.style.transform = 'none';
    if ((nextX !== targetX || nextY !== targetY) && (isDragging || (Math.abs(nextX - targetX) > 0.5 || Math.abs(nextY - targetY) > 0.5))) {
      requestAnimationFrame(animatePlayer);
    } else {
      animating = false;
    }
  }

  player.addEventListener('dragstart', e => e.preventDefault());

  function restorePlayerToCenter() {
    if (!isDragging && (!player.style.left || player.style.left === "" || player.style.left === "50%")) {
      player.style.left = "50%";
      player.style.bottom = "40px";
      player.style.top = "";
      player.style.right = "";
      player.style.transform = "translateX(-50%)";
    }
  }
});