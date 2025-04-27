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
  let dotsArr = [];

  function createMazeDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    dotsContainer.style.background = 'none';
    const width = window.innerWidth, height = window.innerHeight;
    const DOT_COLS = Math.ceil(width / DOT_SPACING), DOT_ROWS = Math.ceil(height / DOT_SPACING);
    dotsContainer.style.width = width + 'px';
    dotsContainer.style.height = height + 'px';
    dotsArr = [];
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
        dotsContainer.appendChild(dot);
        dotsArr.push(dot);
      }
    }
    function handleMouseMove(e) {
      const rect = dotsContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      dotsArr.forEach(dot => {
        const baseX = parseFloat(dot.dataset.baseX);
        const baseY = parseFloat(dot.dataset.baseY);
        const dx = mouseX - baseX, dy = mouseY - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PUSH_RADIUS) {
          const angle = Math.atan2(dy, dx);
          const push = (1 - dist / PUSH_RADIUS) * PUSH_STRENGTH;
          dot.style.left = `${baseX - Math.cos(angle) * push}px`;
          dot.style.top = `${baseY - Math.sin(angle) * push}px`;
        } else {
          dot.style.left = `${baseX}px`;
          dot.style.top = `${baseY}px`;
        }
      });
    }
    if (window._mazeDotHandler) {
      document.removeEventListener('mousemove', window._mazeDotHandler);
    }
    window._mazeDotHandler = handleMouseMove;
    document.addEventListener('mousemove', handleMouseMove);
  }
  createMazeDots();
  window.addEventListener('resize', createMazeDots);
});

// --- Audio Player Functionality ---
document.addEventListener("DOMContentLoaded", function() {
  // Playlist with per-song cover art
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
    // Add more songs as needed
  ];
  let current = 0;
  let isPlaying = false;
  let isRepeat = false;
  // Always shuffle on load
  let shuffledOrder = shuffleArray([...Array(playlist.length).keys()]);

  // Elements
  const player = document.getElementById('audio-player');
  const audio = document.getElementById('player-audio');
  const playBtn = player.querySelector('.player__play');
  const prevBtn = player.querySelector('.player__prev');
  const nextBtn = player.querySelector('.player__next');
  // const shuffleBtn = player.querySelector('.player__shuffle');
  // const repeatBtn = player.querySelector('.player__repeat');
  const volumeSlider = player.querySelector('#player-volume');
  const songEl = document.getElementById('player-song');
  const artistEl = document.getElementById('player-artist');
  const bgEl = document.getElementById('player-bg');
  const controlsBgEl = document.getElementById('player-controls-bg');
  const coverImg = document.getElementById('player-cover-img');

  function updatePlayer(idx) {
    const track = playlist[idx];
    songEl.textContent = track.title;
    artistEl.textContent = track.artist;
    audio.src = track.url;
    // Use per-song cover if available, fallback to default
    const cover = track.cover || "/images/star-galaxy.jpg";
    if (coverImg) coverImg.src = cover;
    if (bgEl) bgEl.style.backgroundImage = `url('${cover}')`;
    if (controlsBgEl) controlsBgEl.style.backgroundImage = `url('${cover}')`;
  }

  function playTrack(idx) {
    current = idx;
    updatePlayer(current);
    audio.play();
    isPlaying = true;
    updatePlayIcon();
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

  // Set initial icon
  playBtn.querySelector('.player__icon-play').innerHTML = '';

  // Play/Pause
  playBtn.addEventListener('click', function() {
    if (audio.paused) {
      audio.play();
      isPlaying = true;
    } else {
      audio.pause();
      isPlaying = false;
    }
    updatePlayIcon();
  });

  audio.addEventListener('play', function() {
    isPlaying = true;
    updatePlayIcon();
  });
  audio.addEventListener('pause', function() {
    isPlaying = false;
    updatePlayIcon();
  });

  // Next/Prev
  nextBtn.addEventListener('click', function() {
    let idx = getNextIndex();
    playTrack(idx);
  });
  prevBtn.addEventListener('click', function() {
    let idx = getPrevIndex();
    playTrack(idx);
  });

  // Volume
  volumeSlider.addEventListener('input', function() {
    audio.volume = parseFloat(volumeSlider.value);
  });

  // Ended
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

  // Initial load
  updatePlayer(current);

  // --- Slippery Draggable Player ---
  let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
  let targetX = null, targetY = null, animating = false;
  let dragStartOffsetX = 0, dragStartOffsetY = 0;

  // Only allow dragging from the top meta area (not controls/buttons)
  const playerMeta = player.querySelector('.player__meta');

  playerMeta.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    isDragging = true;
    player.classList.add('dragging');
    const rect = player.getBoundingClientRect();
    // Use mouse position relative to the top-left of the player
    dragStartOffsetX = e.clientX - rect.left;
    dragStartOffsetY = e.clientY - rect.top;
    // Set target to current position
    targetX = rect.left;
    targetY = rect.top;
    document.body.style.userSelect = 'none';
  });

  // Prevent drag from controls/buttons
  player.querySelector('.player__controls').addEventListener('mousedown', function(e) {
    e.stopPropagation();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    // Calculate target position so the mouse stays at the same offset inside the player
    targetX = e.clientX - dragStartOffsetX;
    targetY = e.clientY - dragStartOffsetY;
    // Clamp to viewport
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
    // More slippery movement (lerp factor lower than cursor)
    let nextX = curX + (targetX - curX) * 0.18;
    let nextY = curY + (targetY - curY) * 0.18;
    // Snap if close
    if (Math.abs(nextX - targetX) < 1) nextX = targetX;
    if (Math.abs(nextY - targetY) < 1) nextY = targetY;
    player.style.left = nextX + 'px';
    player.style.top = nextY + 'px';
    player.style.right = 'auto';
    player.style.bottom = 'auto';
    player.style.position = 'fixed';
    if ((nextX !== targetX || nextY !== targetY) && (isDragging || (Math.abs(nextX - targetX) > 0.5 || Math.abs(nextY - targetY) > 0.5))) {
      requestAnimationFrame(animatePlayer);
    } else {
      animating = false;
    }
  }

  player.addEventListener('dragstart', e => e.preventDefault());
});