const storageKey = 'garpaProfile';

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const formatDateTime = () => {
  const now = new Date();
  return `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const setFeedback = (element, message, tone = 'info') => {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = !message;
};

const collectFormData = (form, deviceStatus, batteryEl, syncEl) => {
  const getValue = (name) => {
    const field = form.elements.namedItem(name);
    if (!field) return '';
    if (field instanceof RadioNodeList) {
      return field.value;
    }
    return field.value;
  };

  const getChecked = (name) => {
    const field = form.elements.namedItem(name);
    if (!field) return false;
    if (field instanceof RadioNodeList) {
      return field.value === 'on';
    }
    return field.checked;
  };

  const preferredDays = qsa('input[name="preferredDays"]:checked', form).map((input) => input.value);

  return {
    fullName: getValue('fullName'),
    age: getValue('age'),
    dominantHand: getValue('dominantHand'),
    email: getValue('email'),
    phone: getValue('phone'),
    diagnosis: getValue('diagnosis'),
    affectedHand: getValue('affectedHand'),
    painLevel: getValue('painLevel'),
    morningStiffness: getValue('morningStiffness'),
    functionalLimitation: getValue('functionalLimitation'),
    targetDuration: getValue('targetDuration'),
    defaultIntensity: getValue('defaultIntensity'),
    preferredTime: getValue('preferredTime'),
    preferredDays,
    emgThreshold: getValue('emgThreshold'),
    consentData: getChecked('consentData'),
    terms: getChecked('terms'),
    notifyPush: getChecked('notifyPush'),
    notifyEmail: getChecked('notifyEmail'),
    device: {
      isConnected: deviceStatus?.dataset.connected === 'true',
      label: deviceStatus?.textContent || 'Guante sin emparejar',
      battery: batteryEl?.textContent || '--%',
      lastSync: syncEl?.textContent || '--',
    },
    lastSavedAt: formatDateTime(),
  };
};

const populateForm = (form, data, refs) => {
  if (!data) return;
  const assignValue = (name, value) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field instanceof RadioNodeList) {
      Array.from(field).forEach((input) => {
        input.checked = input.value === value;
      });
    } else if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = value ?? '';
    }
  };

  assignValue('fullName', data.fullName);
  assignValue('age', data.age);
  assignValue('dominantHand', data.dominantHand);
  assignValue('email', data.email);
  assignValue('phone', data.phone);
  assignValue('diagnosis', data.diagnosis);
  assignValue('affectedHand', data.affectedHand);
  assignValue('painLevel', data.painLevel);
  assignValue('morningStiffness', data.morningStiffness);
  assignValue('functionalLimitation', data.functionalLimitation);
  assignValue('targetDuration', data.targetDuration);
  assignValue('defaultIntensity', data.defaultIntensity);
  assignValue('preferredTime', data.preferredTime);
  assignValue('emgThreshold', data.emgThreshold);
  assignValue('consentData', data.consentData);
  assignValue('terms', data.terms);
  assignValue('notifyPush', data.notifyPush);
  assignValue('notifyEmail', data.notifyEmail);

  qsa('input[name="preferredDays"]', form).forEach((input) => {
    input.checked = Array.isArray(data.preferredDays) ? data.preferredDays.includes(input.value) : false;
  });

  if (refs.painOutput) {
    refs.painOutput.textContent = data.painLevel || form.elements.namedItem('painLevel')?.value || '0';
  }

  if (data.device) {
    if (refs.deviceStatus) {
      refs.deviceStatus.textContent = data.device.label || 'Guante sin emparejar';
      refs.deviceStatus.dataset.connected = data.device.isConnected ? 'true' : 'false';
    }
    if (refs.batteryEl) {
      refs.batteryEl.textContent = data.device.battery || '--%';
    }
    if (refs.syncEl) {
      refs.syncEl.textContent = data.device.lastSync || '--';
    }
    if (refs.pairButton) {
      refs.pairButton.textContent = data.device.isConnected ? 'Desemparejar' : 'Emparejar';
    }
  }
};

const exportCsv = (data) => {
  if (!data) return;
  const rows = [
    ['Campo', 'Valor'],
    ['Nombre completo', data.fullName || ''],
    ['Edad', data.age || ''],
    ['Mano dominante', data.dominantHand || ''],
    ['Correo', data.email || ''],
    ['Teléfono', data.phone || ''],
    ['Diagnóstico', data.diagnosis || ''],
    ['Mano afectada', data.affectedHand || ''],
    ['Nivel de dolor', data.painLevel || ''],
    ['Rigidez matutina', data.morningStiffness || ''],
    ['Limitación funcional', data.functionalLimitation || ''],
    ['Duración objetivo', data.targetDuration || ''],
    ['Intensidad predeterminada', data.defaultIntensity || ''],
    ['Horario preferido', data.preferredTime || ''],
    ['Días preferidos', (data.preferredDays || []).join(' | ')],
    ['Umbral EMG', data.emgThreshold || ''],
    ['Notificaciones push', data.notifyPush ? 'Sí' : 'No'],
    ['Notificaciones email', data.notifyEmail ? 'Sí' : 'No'],
    ['Consentimiento datos', data.consentData ? 'Aceptado' : 'No aceptado'],
    ['Términos', data.terms ? 'Aceptados' : 'No aceptados'],
    ['Guante conectado', data.device?.isConnected ? 'Sí' : 'No'],
    ['Estado del guante', data.device?.label || ''],
    ['Batería', data.device?.battery || ''],
    ['Última sincronización', data.device?.lastSync || ''],
    ['Última actualización', data.lastSavedAt || ''],
  ];

  const csvContent = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'garpa-registro.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const initProfile = () => {
  const form = qs('[data-profile-form]');
  if (!form) return;

  const painRange = qs('input[name="painLevel"]', form);
  const painOutput = qs('[data-output="painLevel"]', form);
  const pairButton = qs('[data-action="pair"]', form);
  const calibrationButton = qs('[data-action="calibrate"]', form);
  const vibrationButton = qs('[data-action="vibration-test"]', form);
  const draftButton = qs('[data-action="save-draft"]', form);
  const exportButton = qs('[data-action="export"]', form);
  const deleteButton = qs('[data-action="delete"]', form);
  const feedbackEl = qs('[data-form-feedback]', form);
  const calibrationStatus = qs('[data-calibration-status]', form);
  const deviceStatus = qs('[data-device-connection]', form);
  const batteryEl = qs('[data-battery-level]', form);
  const syncEl = qs('[data-last-sync]', form);

  const refs = { painOutput, deviceStatus, batteryEl, syncEl, pairButton };

  if (deviceStatus && !deviceStatus.dataset.connected) {
    deviceStatus.dataset.connected = 'false';
  }

  /* Load draft if available */
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      populateForm(form, data, refs);
      setFeedback(feedbackEl, 'Se cargó el último borrador guardado.', 'info');
    }
  } catch (error) {
    console.error('No se pudo leer el borrador', error);
  }

  if (painRange && painOutput) {
    const updatePainOutput = () => {
      painOutput.textContent = painRange.value;
    };
    painRange.addEventListener('input', updatePainOutput);
    updatePainOutput();
  }

  const setDeviceConnected = (connected) => {
    if (!deviceStatus || !pairButton) return;
    deviceStatus.dataset.connected = connected ? 'true' : 'false';
    deviceStatus.textContent = connected ? 'Guante conectado' : 'Guante sin emparejar';
    pairButton.textContent = connected ? 'Desemparejar' : 'Emparejar';
    if (connected) {
      if (batteryEl) batteryEl.textContent = `${Math.floor(70 + Math.random() * 30)}%`;
      if (syncEl) syncEl.textContent = formatDateTime();
    } else {
      if (batteryEl) batteryEl.textContent = '--%';
      if (syncEl) syncEl.textContent = '--';
    }
  };

  if (pairButton) {
    pairButton.addEventListener('click', () => {
      const isConnected = deviceStatus?.dataset.connected === 'true';
      pairButton.disabled = true;
      pairButton.textContent = isConnected ? 'Desemparejando…' : 'Conectando…';
      setTimeout(() => {
        setDeviceConnected(!isConnected);
        pairButton.disabled = false;
        if (!isConnected) {
          setFeedback(feedbackEl, 'Guante emparejado correctamente.', 'success');
        } else {
          setFeedback(feedbackEl, 'Se desconectó el guante.', 'info');
        }
      }, 800);
    });
  }

  if (calibrationButton) {
    calibrationButton.addEventListener('click', () => {
      if (!calibrationStatus) return;
      calibrationStatus.hidden = false;
      calibrationStatus.textContent = 'Calibrando… mantené la mano en reposo.';
      setTimeout(() => {
        calibrationStatus.textContent = 'Calibración completa. El umbral quedó actualizado.';
      }, 1200);
    });
  }

  if (vibrationButton) {
    vibrationButton.addEventListener('click', () => {
      if (!calibrationStatus) return;
      calibrationStatus.hidden = false;
      calibrationStatus.textContent = 'Probando vibración…';
      setTimeout(() => {
        calibrationStatus.textContent = 'Vibración verificada. Ajustá la intensidad desde la app si lo necesitás.';
      }, 800);
    });
  }

  const saveData = (tone, message) => {
    try {
      const data = collectFormData(form, deviceStatus, batteryEl, syncEl);
      localStorage.setItem(storageKey, JSON.stringify(data));
      setFeedback(feedbackEl, message, tone);
    } catch (error) {
      console.error('No se pudo guardar el perfil', error);
      setFeedback(feedbackEl, 'No pudimos guardar los cambios. Intentá nuevamente.', 'error');
    }
  };

  if (draftButton) {
    draftButton.addEventListener('click', () => {
      saveData('success', 'Borrador guardado.');
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      setFeedback(feedbackEl, 'Revisá los campos obligatorios antes de guardar.', 'error');
      form.reportValidity();
      return;
    }
    saveData('success', 'Cambios guardados correctamente.');
  });

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      try {
        const data = collectFormData(form, deviceStatus, batteryEl, syncEl);
        exportCsv(data);
        setFeedback(feedbackEl, 'Se descargó el archivo CSV con tus datos.', 'success');
      } catch (error) {
        console.error('No se pudo exportar el perfil', error);
        setFeedback(feedbackEl, 'No pudimos exportar tus datos. Intentá nuevamente.', 'error');
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      const confirmed = window.confirm('¿Querés eliminar los datos guardados en este dispositivo?');
      if (!confirmed) return;
      localStorage.removeItem(storageKey);
      form.reset();
      setDeviceConnected(false);
      if (calibrationStatus) {
        calibrationStatus.hidden = true;
        calibrationStatus.textContent = '';
      }
      if (painRange && painOutput) {
        painOutput.textContent = painRange.value;
      }
      setFeedback(feedbackEl, 'Se eliminaron los datos locales.', 'info');
    });
  }
};

window.addEventListener('DOMContentLoaded', initProfile);
