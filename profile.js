const storageKey = 'garpa.profile';
const statusTimers = new Map();
const form = document.querySelector('[data-profile-form]');

if (form) {
  const sections = Array.from(
    form.querySelectorAll('.profile-section[data-section]:not([data-section="actions"])')
  );
  const totalSections = sections.length;
  const progressCount = document.querySelector('[data-progress-count]');
  const progressUpdated = document.querySelector('[data-progress-updated]');
  const progressDevice = document.querySelector('[data-device-status]');
  const deviceStatus = document.querySelector('[data-device-connection]');
  const batteryLevel = document.querySelector('[data-battery-level]');
  const lastSync = document.querySelector('[data-last-sync]');
  const calibrationStatus = document.querySelector('[data-calibration-status]');
  const finalStatus = document.querySelector('[data-final-status]');

  const profileData = loadProfileData();

  populateFields(profileData);
  updateProgressSummary();
  updateDeviceSummary();
  updateCalibrationSummary();
  enhanceRangeOutputs();
  enhanceChipToggles();

  form.addEventListener('input', handleFieldValidation, true);
  form.addEventListener('change', handleFieldValidation, true);

  form.querySelectorAll('[data-save-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.closest('.profile-section');
      if (!section) return;
      saveSection(section);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    finalStatus && clearStatus(finalStatus);

    const results = sections.map((section) => saveSection(section, { silent: true }));
    const allValid = results.every(Boolean);

    if (allValid) {
      showStatus(finalStatus, 'Perfil actualizado correctamente.', 'success');
    } else {
      showStatus(finalStatus, 'Revisa los campos marcados antes de continuar.', 'error');
      const firstInvalid = form.querySelector('.field.is-error .field-input, .field.is-error select');
      if (firstInvalid) {
        firstInvalid.focus();
      }
    }
  });

  const pairButton = form.querySelector('[data-action="pair"]');
  pairButton?.addEventListener('click', handlePairDevice);

  const calibrateButton = form.querySelector('[data-action="calibrate"]');
  calibrateButton?.addEventListener('click', handleCalibration);

  const vibrationButton = form.querySelector('[data-action="vibration-test"]');
  vibrationButton?.addEventListener('click', handleVibrationTest);

  const exportButton = form.querySelector('[data-action="export"]');
  exportButton?.addEventListener('click', handleExport);

  const deleteButton = form.querySelector('[data-action="delete"]');
  deleteButton?.addEventListener('click', handleDelete);

  function handleFieldValidation(event) {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
      return;
    }

    validateField(field);

    if (field.id === 'painLevel') {
      updateRangeOutput(field);
    }
  }

  function saveSection(section, { silent = false } = {}) {
    const fields = getSectionFields(section);
    let isValid = true;

    fields.forEach((field) => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    if (!isValid) {
      if (!silent) {
        showSectionStatus(section, 'Revisa los campos obligatorios.', 'error');
      }
      const firstInvalid = section.querySelector('.field.is-error .field-input, .field.is-error select');
      firstInvalid?.focus();
      return false;
    }

    const sectionData = collectSectionData(fields);
    const fieldNames = fields.map((field) => field.name);

    fieldNames.forEach((name) => {
      if (!(name in sectionData)) {
        delete profileData.fields[name];
      }
    });

    Object.assign(profileData.fields, sectionData);

    const sectionKey = section.dataset.section || 'general';
    const timestamp = new Date().toISOString();
    profileData.sections[sectionKey] = timestamp;
    profileData.lastUpdated = timestamp;

    persistProfile();
    updateProgressSummary();

    if (!silent) {
      showSectionStatus(section, 'Cambios guardados correctamente.', 'success');
    }

    return true;
  }

  function validateField(field) {
    const targetKey = field.dataset.feedbackTarget || field.name || field.id;
    const feedback = getFeedbackElement(field, targetKey);
    clearStatus(feedback);

    let message = '';
    let valid = true;

    if (field.type === 'checkbox' && field.dataset.single === 'true') {
      if (field.required && !field.checked) {
        valid = false;
        message = 'Debes aceptar esta opción para continuar.';
      }
    } else if (field.type === 'checkbox') {
      const group = form.querySelectorAll(`input[name="${CSS.escape(field.name)}"]`);
      const anyChecked = Array.from(group).some((input) => input.checked);
      if (field.required && !anyChecked) {
        valid = false;
        message = 'Selecciona al menos una opción.';
      }
    } else if (field.type === 'radio') {
      const group = form.querySelectorAll(`input[name="${CSS.escape(field.name)}"]`);
      const anyChecked = Array.from(group).some((input) => input.checked);
      if (field.required && !anyChecked) {
        valid = false;
        message = 'Selecciona una intensidad predeterminada.';
      }
    } else {
      const value = field.value.trim();
      if (field.required && !value) {
        valid = false;
        message = 'Este campo es obligatorio.';
      } else if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          valid = false;
          message = 'Ingresa un correo válido.';
        }
      } else if (field.type === 'number' && value) {
        const numericValue = Number(value);
        if (field.min && numericValue < Number(field.min)) {
          valid = false;
          message = `Debe ser mayor o igual a ${field.min}.`;
        } else if (field.max && numericValue > Number(field.max)) {
          valid = false;
          message = `Debe ser menor o igual a ${field.max}.`;
        }
      }
    }

    toggleFieldError(field, feedback, valid, message);
    return valid;
  }

  function collectSectionData(fields) {
    const data = {};

    fields.forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
        return;
      }

      if (field.type === 'checkbox') {
        if (field.dataset.single === 'true') {
          data[field.name] = field.checked;
        } else {
          if (!Array.isArray(data[field.name])) {
            data[field.name] = [];
          }
          if (field.checked) {
            data[field.name].push(field.value);
          }
        }
      } else if (field.type === 'radio') {
        if (field.checked) {
          data[field.name] = field.value;
        } else if (!(field.name in data)) {
          data[field.name] = '';
        }
      } else {
        data[field.name] = field.value.trim();
      }
    });

    return data;
  }

  function getSectionFields(section) {
    return Array.from(section.querySelectorAll('input[name], select[name]'));
  }

  function toggleFieldError(field, feedback, valid, message) {
    const container = field.closest('.field') || field.closest('.checkbox') || field.closest('.fieldset');
    if (!container) return;

    if (valid) {
      container.classList.remove('is-error');
      if (feedback) {
        feedback.textContent = '';
        feedback.removeAttribute('data-status');
        feedback.hidden = true;
      }
    } else {
      container.classList.add('is-error');
      if (feedback) {
        feedback.textContent = message;
        feedback.dataset.status = 'error';
        feedback.hidden = false;
      }
    }
  }

  function getFeedbackElement(field, key) {
    if (!key) return null;
    const section = field.closest('.profile-section');
    if (!section) return null;
    return section.querySelector(`[data-error-for="${CSS.escape(key)}"]`);
  }

  function showSectionStatus(section, message, variant) {
    const status = section.querySelector('[data-section-status]');
    showStatus(status, message, variant);
  }

  function showStatus(element, message, variant) {
    if (!element) return;
    element.textContent = message;
    element.dataset.status = variant;
    element.hidden = false;
    if (statusTimers.has(element)) {
      clearTimeout(statusTimers.get(element));
    }
    const timeoutId = window.setTimeout(() => {
      clearStatus(element);
    }, 5000);
    statusTimers.set(element, timeoutId);
  }

  function clearStatus(element) {
    if (!element) return;
    element.textContent = '';
    element.dataset.status = '';
    element.hidden = true;
    if (statusTimers.has(element)) {
      clearTimeout(statusTimers.get(element));
      statusTimers.delete(element);
    }
  }

  function persistProfile() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profileData));
    } catch (error) {
      console.warn('No se pudo guardar localmente el perfil.', error);
    }
  }

  function updateProgressSummary() {
    if (progressCount) {
      const completed = Object.keys(profileData.sections).length;
      progressCount.textContent = `${completed} de ${totalSections}`;
    }
    if (progressUpdated) {
      progressUpdated.textContent = profileData.lastUpdated
        ? formatDate(profileData.lastUpdated)
        : 'No registrado';
    }
  }

  function updateDeviceSummary() {
    const status = profileData.device?.status || 'Sin emparejar';
    const battery = profileData.device?.battery;
    const sync = profileData.device?.lastSync;

    if (progressDevice) {
      progressDevice.textContent = status;
    }
    if (deviceStatus) {
      deviceStatus.textContent = status;
    }
    if (batteryLevel) {
      batteryLevel.textContent = typeof battery === 'number' ? `${battery}%` : '--%';
    }
    if (lastSync) {
      lastSync.textContent = sync ? formatDate(sync) : 'Sin datos';
    }
  }

  function updateCalibrationSummary() {
    if (!calibrationStatus) return;
    const lastCal = profileData.calibration?.lastRun;
    if (lastCal) {
      calibrationStatus.textContent = `Calibración realizada el ${formatDate(lastCal)}.`;
      calibrationStatus.dataset.status = 'success';
      calibrationStatus.hidden = false;
    } else {
      calibrationStatus.textContent = '';
      calibrationStatus.hidden = true;
    }
  }

  function enhanceRangeOutputs() {
    const ranges = form.querySelectorAll('input[type="range"][name]');
    ranges.forEach((range) => updateRangeOutput(range));
  }

  function updateRangeOutput(range) {
    const key = range.name || range.id;
    const output = form.querySelector(`[data-output="${CSS.escape(key)}"]`);
    if (output) {
      output.textContent = range.value;
    }
  }

  function enhanceChipToggles() {
    form.querySelectorAll('.chip input[type="checkbox"]').forEach((input) => {
      toggleChipState(input);
      input.addEventListener('change', () => toggleChipState(input));
    });
  }

  function toggleChipState(input) {
    const chip = input.closest('.chip');
    if (!chip) return;
    chip.classList.toggle('chip-active', input.checked);
  }

  function populateFields(data) {
    const values = data.fields || {};
    const fields = form.querySelectorAll('input[name], select[name]');

    fields.forEach((field) => {
      if (field.type === 'checkbox') {
        if (field.dataset.single === 'true') {
          field.checked = Boolean(values[field.name]);
        } else {
          const list = Array.isArray(values[field.name]) ? values[field.name] : [];
          field.checked = list.includes(field.value);
        }
      } else if (field.type === 'radio') {
        field.checked = values[field.name] === field.value;
      } else {
        if (values[field.name] != null) {
          field.value = values[field.name];
        }
      }
    });
  }

  function handlePairDevice() {
    const button = this;
    button.disabled = true;
    showSectionStatus(button.closest('.profile-section'), 'Buscando dispositivos cercanos...', 'info');

    window.setTimeout(() => {
      const battery = Math.floor(70 + Math.random() * 25);
      const now = new Date().toISOString();
      profileData.device = {
        status: 'Emparejado via BLE',
        battery,
        lastSync: now,
      };
      persistProfile();
      updateDeviceSummary();
      showSectionStatus(button.closest('.profile-section'), 'Guante emparejado correctamente.', 'success');
      button.disabled = false;
    }, 1600);
  }

  function handleCalibration() {
    const button = this;
    const section = button.closest('.profile-section');
    button.disabled = true;
    showSectionStatus(section, 'Calibrando sensores EMG...', 'info');
    calibrationStatus && clearStatus(calibrationStatus);

    window.setTimeout(() => {
      const now = new Date().toISOString();
      profileData.calibration = {
        lastRun: now,
      };
      persistProfile();
      updateCalibrationSummary();
      showSectionStatus(section, 'Calibración completada con éxito.', 'success');
      button.disabled = false;
    }, 2200);
  }

  function handleVibrationTest() {
    showSectionStatus(
      this.closest('.profile-section'),
      'Probando vibración durante 5 segundos... (simulado)',
      'info'
    );
    window.setTimeout(() => {
      showSectionStatus(this.closest('.profile-section'), 'Vibración verificada correctamente.', 'success');
    }, 5200);
  }

  function handleExport() {
    const rows = Object.entries(profileData.fields).map(([key, value]) => {
      const normalised = Array.isArray(value) ? value.join('; ') : value;
      return `${key},"${String(normalised).replace(/"/g, '""')}"`;
    });
    const header = 'campo,valor';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    link.download = `garpa-registro-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDelete() {
    const confirmation = window.confirm(
      'Esta acción eliminará tus datos locales del registro personal. ¿Deseas continuar?'
    );
    if (!confirmation) return;

    localStorage.removeItem(storageKey);
    window.location.reload();
  }

  function formatDate(isoString) {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch (error) {
      return isoString;
    }
  }
}

function loadProfileData() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return getDefaultProfile();
    }
    const parsed = JSON.parse(stored);
    return {
      ...getDefaultProfile(),
      ...parsed,
      fields: parsed.fields || {},
      sections: parsed.sections || {},
      device: parsed.device || getDefaultProfile().device,
      calibration: parsed.calibration || {},
    };
  } catch (error) {
    console.warn('No se pudo leer el perfil guardado.', error);
    return getDefaultProfile();
  }
}

function getDefaultProfile() {
  return {
    fields: {},
    sections: {},
    device: {
      status: 'Sin emparejar',
      battery: null,
      lastSync: null,
    },
    calibration: {},
    lastUpdated: null,
  };
}
