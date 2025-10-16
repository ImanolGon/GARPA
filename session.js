(function () {
  const timeElement = document.getElementById('session-time');
  const pauseButton = document.getElementById('pause-button');
  const dialog = document.getElementById('pause-dialog');
  const resumeButton = document.getElementById('resume-button');
  const finishButton = document.getElementById('finish-button');
  const dialogBackdrop = dialog ? dialog.querySelector('[data-dialog-dismiss]') : null;
  const dialogMessage = document.getElementById('pause-message');
  const intensityLabel = document.getElementById('current-intensity');
  const emgLegend = document.getElementById('emg-legend');
  const intensityButtons = Array.from(
    document.querySelectorAll('.session-intensity__controls .chip')
  );
  const canvas = document.getElementById('emg-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  if (!timeElement || !pauseButton) {
    return;
  }

  const removeLegacyPlaceholder = () => {
    const legacySelectors = [
      '.session-placeholder',
      '.session-coming-soon',
      '.session-legacy',
    ];

    for (const selector of legacySelectors) {
      const legacySection = document.querySelector(selector);
      if (legacySection) {
        legacySection.remove();
        return;
      }
    }

    const legacyTrigger = Array.from(
      document.querySelectorAll('a, button')
    ).find((element) =>
      element.textContent && element.textContent.trim().toLowerCase() === 'volver a configurar'
    );

    if (legacyTrigger) {
      const legacySection = legacyTrigger.closest('section');
      if (legacySection) {
        legacySection.remove();
        return;
      }

      const legacyMain = legacyTrigger.closest('main');
      if (legacyMain && legacyMain.childElementCount <= 3) {
        legacyMain.remove();
      }
    }
  };

  const intensityMap = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
  };

  const intensityDescriptions = {
    baja: 'Activación suave',
    media: 'Activación moderada',
    alta: 'Activación intensa',
  };

  removeLegacyPlaceholder();

  const params = new URLSearchParams(window.location.search);
  const durationParam = parseInt(params.get('duration') || '', 10);
  const initialMinutes = Number.isFinite(durationParam) && durationParam > 0 ? durationParam : 20;
  const initialIntensityParam = (params.get('intensity') || 'baja').toLowerCase();

  let remainingSeconds = Math.max(initialMinutes * 60, 0);
  let timerId = null;
  let isPaused = false;
  let isFinished = false;
  let currentIntensity = Object.prototype.hasOwnProperty.call(intensityMap, initialIntensityParam)
    ? initialIntensityParam
    : 'baja';

  let emgPoints = [];
  let emgPhase = 0;

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.max(totalSeconds % 60, 0);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const updateTimeDisplay = () => {
    const safeSeconds = Math.max(remainingSeconds, 0);
    timeElement.textContent = formatTime(safeSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    timeElement.setAttribute('datetime', `PT${minutes}M${seconds}S`);
  };

  const focusPrimaryDialogButton = () => {
    if (!dialog) {
      return;
    }

    const target = resumeButton && !resumeButton.classList.contains('is-hidden')
      ? resumeButton
      : finishButton;

    if (target) {
      window.requestAnimationFrame(() => {
        target.focus();
      });
    }
  };

  const openDialog = (mode) => {
    if (!dialog) {
      return;
    }

    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');

    if (mode === 'complete') {
      if (dialogMessage) {
        dialogMessage.textContent = '¡Buen trabajo! El entrenamiento finalizó.';
      }
      if (resumeButton) {
        resumeButton.classList.add('is-hidden');
      }
    } else {
      if (dialogMessage) {
        dialogMessage.textContent = 'Selecciona una opción para continuar.';
      }
      if (resumeButton) {
        resumeButton.classList.remove('is-hidden');
      }
    }

    focusPrimaryDialogButton();
  };

  const closeDialog = () => {
    if (!dialog) {
      return;
    }

    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
  };

  const stopTimer = () => {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerId = window.setInterval(() => {
      if (remainingSeconds <= 0) {
        handleCompletion();
        return;
      }

      remainingSeconds -= 1;
      updateTimeDisplay();

      if (remainingSeconds <= 0) {
        handleCompletion();
      }
    }, 1000);
  };

  const intensityAmplitude = {
    baja: 0.28,
    media: 0.42,
    alta: 0.58,
  };

  const resizeCanvas = () => {
    if (!canvas || !ctx) {
      return;
    }

    const width = Math.max(Math.floor(canvas.clientWidth), 320);
    const height = Math.max(Math.floor(canvas.clientHeight), 180);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      emgPoints = new Array(width).fill(height / 2);
    }
  };

  const drawEmg = () => {
    if (!canvas || !ctx) {
      return;
    }

    resizeCanvas();

    const width = canvas.width;
    const height = canvas.height;
    const baseline = height / 2;
    const amplitude = intensityAmplitude[currentIntensity] || 0.35;
    const noiseMagnitude = amplitude * height * 0.18;

    const sample =
      baseline +
      Math.sin(emgPhase) * amplitude * height * 0.32 +
      (Math.random() - 0.5) * noiseMagnitude;

    emgPhase += 0.22 + amplitude * 0.2;

    emgPoints.push(Math.max(0, Math.min(height, sample)));
    if (emgPoints.length > width) {
      emgPoints.splice(0, emgPoints.length - width);
    }

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const horizontalStep = height / 6;
    for (let y = horizontalStep; y < height; y += horizontalStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    const verticalStep = width / 12;
    for (let x = verticalStep; x < width; x += verticalStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(66, 194, 164, 0.9)';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, emgPoints[0] ?? baseline);
    for (let x = 1; x < emgPoints.length; x += 1) {
      const prev = emgPoints[x - 1] ?? baseline;
      const current = emgPoints[x] ?? baseline;
      const midX = x - 0.5;
      ctx.quadraticCurveTo(midX, prev, x, current);
    }
    ctx.stroke();
    ctx.restore();
  };

  const animateEmg = () => {
    drawEmg();
    window.requestAnimationFrame(animateEmg);
  };

  const setIntensity = (level) => {
    if (!Object.prototype.hasOwnProperty.call(intensityMap, level)) {
      return;
    }

    currentIntensity = level;

    if (intensityLabel) {
      intensityLabel.textContent = intensityMap[level];
    }

    if (emgLegend) {
      emgLegend.textContent = `${intensityDescriptions[level]} · Nivel ${intensityMap[level]}`;
    }

    intensityButtons.forEach((button) => {
      const buttonLevel = button.dataset.intensity;
      const isActive = buttonLevel === level;
      button.classList.toggle('chip-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const pauseTimer = () => {
    if (isPaused || isFinished) {
      return;
    }

    isPaused = true;
    stopTimer();
    pauseButton.disabled = true;
    openDialog('pause');
  };

  const resumeTimer = () => {
    if (isFinished || !isPaused) {
      return;
    }

    closeDialog();
    isPaused = false;
    pauseButton.disabled = false;
    startTimer();
  };

  const handleCompletion = () => {
    if (isFinished) {
      return;
    }

    isFinished = true;
    stopTimer();
    remainingSeconds = 0;
    updateTimeDisplay();

    pauseButton.disabled = true;
    pauseButton.textContent = 'Finalizado';
    pauseButton.classList.remove('btn-critical');
    pauseButton.classList.add('btn-outline');

    openDialog('complete');
  };

  if (pauseButton) {
    pauseButton.addEventListener('click', pauseTimer);
  }

  if (resumeButton) {
    resumeButton.addEventListener('click', () => {
      resumeTimer();
    });
  }

  if (finishButton) {
    finishButton.addEventListener('click', () => {
      window.location.href = 'training.html';
    });
  }

  if (dialogBackdrop) {
    dialogBackdrop.addEventListener('click', () => {
      if (isFinished) {
        return;
      }
      resumeTimer();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog && dialog.classList.contains('is-open')) {
      if (!isFinished) {
        resumeTimer();
      }
    }
  });

  intensityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { intensity } = button.dataset;
      if (intensity) {
        setIntensity(intensity);
      }
    });
  });

  window.addEventListener('resize', resizeCanvas);

  setIntensity(currentIntensity);
  updateTimeDisplay();

  if (remainingSeconds > 0) {
    startTimer();
  } else {
    handleCompletion();
  }

  animateEmg();
})();
