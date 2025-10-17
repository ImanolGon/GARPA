const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30_000;
const REMEMBER_KEY = 'garpaRememberedEmail';
const LOCK_KEY = 'garpaLoginLock';
const DEMO_EMAIL = 'demo@garpa.ar';
const DEMO_PASSWORD = 'GarpaDemo123';

const form = document.querySelector('#login-form');
const emailInput = form?.querySelector('#email');
const passwordInput = form?.querySelector('#password');
const rememberCheckbox = form?.querySelector('#remember');
const messageBox = document.querySelector('[data-auth-message]');
const placeholderLinks = document.querySelectorAll('[data-placeholder-link]');
const togglePasswordButtons = document.querySelectorAll('[data-toggle-password]');

let attempts = 0;
let lockInterval = null;
let lockedUntil = 0;

const restoreRememberedEmail = () => {
  const remembered = localStorage.getItem(REMEMBER_KEY);
  if (remembered && emailInput) {
    emailInput.value = remembered;
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
};

const updateMessage = (text = '', type = 'info') => {
  if (!messageBox) return;
  if (!text) {
    messageBox.hidden = true;
    messageBox.textContent = '';
    messageBox.classList.remove('is-error', 'is-success', 'is-info');
    return;
  }

  messageBox.hidden = false;
  messageBox.textContent = text;
  messageBox.classList.remove('is-error', 'is-success', 'is-info');
  messageBox.classList.add(`is-${type}`);
};

const persistLock = () => {
  if (!lockedUntil) {
    sessionStorage.removeItem(LOCK_KEY);
    return;
  }

  sessionStorage.setItem(
    LOCK_KEY,
    JSON.stringify({ attempts, unlockAt: lockedUntil })
  );
};

const setFormDisabled = (disabled) => {
  if (!form) return;
  const controls = form.querySelectorAll('input, button');
  controls.forEach((control) => {
    control.disabled = disabled;
  });
};

const finishLock = () => {
  lockedUntil = 0;
  attempts = 0;
  persistLock();
  if (lockInterval) {
    clearInterval(lockInterval);
    lockInterval = null;
  }
  setFormDisabled(false);
  updateMessage('Puedes intentarlo nuevamente.', 'info');
};

const startLockCountdown = (unlockAt) => {
  lockedUntil = unlockAt;
  persistLock();
  setFormDisabled(true);

  const renderCountdown = () => {
    const remaining = Math.max(0, lockedUntil - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    updateMessage(
      `Demasiados intentos. Espera ${seconds.toString().padStart(2, '0')} segundos para volver a intentar.`,
      'error'
    );

    if (remaining <= 0) {
      finishLock();
    }
  };

  renderCountdown();
  lockInterval = setInterval(renderCountdown, 1000);
};

const restoreLockState = () => {
  const stored = sessionStorage.getItem(LOCK_KEY);
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed.unlockAt !== 'number') return;
    if (Date.now() < parsed.unlockAt) {
      attempts = Number(parsed.attempts) || MAX_ATTEMPTS;
      startLockCountdown(parsed.unlockAt);
    } else {
      sessionStorage.removeItem(LOCK_KEY);
    }
  } catch (error) {
    sessionStorage.removeItem(LOCK_KEY);
  }
};

const validateForm = () => {
  if (!emailInput || !passwordInput) return false;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    updateMessage('Completa tu correo y contraseña para continuar.', 'error');
    return false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(email)) {
    updateMessage('El correo electrónico no tiene un formato válido.', 'error');
    return false;
  }

  if (password.length < 8) {
    updateMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
    return false;
  }

  return true;
};

const mockAuthenticate = (email, password) =>
  new Promise((resolve, reject) => {
    window.setTimeout(() => {
      const isValid = email === DEMO_EMAIL && password === DEMO_PASSWORD;
      if (isValid) {
        resolve({ ok: true });
      } else {
        reject(new Error('Credenciales inválidas'));
      }
    }, 650);
  });

const handleAuthSuccess = (email) => {
  attempts = 0;
  lockedUntil = 0;
  persistLock();
  updateMessage('Inicio de sesión correcto. Redirigiendo…', 'success');
  setFormDisabled(true);

  if (rememberCheckbox?.checked) {
    localStorage.setItem(REMEMBER_KEY, email);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }

  window.setTimeout(() => {
    window.location.href = 'training.html';
  }, 900);
};

const handleAuthError = () => {
  attempts += 1;
  updateMessage('No pudimos validar tus datos. Intenta nuevamente.', 'error');

  if (attempts >= MAX_ATTEMPTS) {
    const unlockAt = Date.now() + LOCK_DURATION_MS;
    startLockCountdown(unlockAt);
  } else if (passwordInput) {
    passwordInput.focus();
    passwordInput.select();
  }
};

const handleSubmit = async (event) => {
  event.preventDefault();
  if (!validateForm()) return;
  if (lockedUntil && Date.now() < lockedUntil) return;
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  updateMessage('Verificando credenciales…', 'info');
  setFormDisabled(true);

  try {
    await mockAuthenticate(email, password);
    handleAuthSuccess(email);
  } catch (error) {
    setFormDisabled(false);
    handleAuthError();
  }
};

const handlePlaceholderLink = (event) => {
  event.preventDefault();
  const target = event.currentTarget?.getAttribute('data-placeholder-link');
  if (!target) return;

  const messages = {
    recover: 'El flujo de recuperación estará disponible próximamente. Solicítalo a tu fisioterapeuta.',
    signup: 'La creación de cuentas se gestiona junto al equipo clínico. Contacta a tu profesional para obtener acceso.',
  };

  updateMessage(messages[target] ?? 'Funcionalidad en desarrollo.', 'info');
};

const handleTogglePassword = (event) => {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;

  const targetId = button.getAttribute('aria-controls');
  if (!targetId) return;
  const targetInput = document.getElementById(targetId);
  if (!(targetInput instanceof HTMLInputElement)) return;

  const isPassword = targetInput.type === 'password';
  targetInput.type = isPassword ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(isPassword));
  button.textContent = isPassword ? 'Ocultar' : 'Mostrar';
  targetInput.focus();
};

const init = () => {
  if (!form) return;

  restoreRememberedEmail();
  restoreLockState();
  updateMessage();

  form.addEventListener('submit', handleSubmit);
  placeholderLinks.forEach((link) =>
    link.addEventListener('click', handlePlaceholderLink)
  );
  togglePasswordButtons.forEach((button) =>
    button.addEventListener('click', handleTogglePassword)
  );
};

init();
