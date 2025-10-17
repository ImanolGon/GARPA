(function () {
  const root = document.documentElement;
  if (!root) return;

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* Stepper logic */
  const stepperTabs = qsa('.stepper__tab');
  const stepperPanels = qsa('.stepper__panel');
  let currentTab = stepperTabs.find((tab) => tab.classList.contains('is-active')) || stepperTabs[0];

  const setActiveStep = (nextTab) => {
    if (!nextTab || nextTab === currentTab) return;

    stepperTabs.forEach((tab) => {
      const isActive = tab === nextTab;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    stepperPanels.forEach((panel) => {
      const match = panel.id === nextTab.getAttribute('aria-controls');
      panel.classList.toggle('is-active', match);
      panel.hidden = !match;
    });

    currentTab = nextTab;
    currentTab.focus();
  };

  stepperTabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveStep(tab));
    tab.addEventListener('keydown', (event) => {
      const { key } = event;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
        return;
      }

      event.preventDefault();
      const index = stepperTabs.indexOf(tab);
      if (key === 'Home') {
        setActiveStep(stepperTabs[0]);
      } else if (key === 'End') {
        setActiveStep(stepperTabs[stepperTabs.length - 1]);
      } else {
        const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
        const nextIndex = (index + direction + stepperTabs.length) % stepperTabs.length;
        setActiveStep(stepperTabs[nextIndex]);
      }
    });
  });

  /* FAQ accordion */
  const faqItems = qsa('[data-faq]');
  faqItems.forEach((item) => {
    const question = qs('.faq-item__question', item);
    const answer = qs('.faq-item__answer', item);
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = question.getAttribute('aria-expanded') === 'true';
      question.setAttribute('aria-expanded', String(!isOpen));
      answer.hidden = isOpen;
      item.classList.toggle('is-open', !isOpen);
    });
  });

  /* Modal logic */
  const modal = qs('[data-modal="video"]');
  const openButtons = qsa('[data-action="open-video"]');
  const closeButtons = qsa('[data-action="close-modal"]', modal || document);
  const videoFrame = modal ? qs('iframe', modal) : null;
  const videoSrc = videoFrame ? videoFrame.getAttribute('src') : null;
  if (videoFrame && videoSrc) {
    videoFrame.dataset.src = videoSrc;
    videoFrame.setAttribute('src', 'about:blank');
  }
  let lastFocusedElement = null;

  const toggleBodyScroll = (shouldLock) => {
    document.body.classList.toggle('modal-open', shouldLock);
  };

  const openModal = () => {
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add('is-visible');
      if (videoFrame) {
        const src = videoFrame.dataset.src || videoSrc;
        if (src) {
          videoFrame.setAttribute('src', src);
        }
      }
      const focusable = modal.querySelector('button, [href], [tabindex="0"]');
      if (focusable) focusable.focus();
    });
    toggleBodyScroll(true);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-visible');
    setTimeout(() => {
      if (!modal.classList.contains('is-visible')) {
        modal.hidden = true;
      }
    }, 200);
    if (videoFrame) {
      videoFrame.setAttribute('src', 'about:blank');
    }
    toggleBodyScroll(false);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  openButtons.forEach((button) => button.addEventListener('click', openModal));
  closeButtons.forEach((button) => button.addEventListener('click', closeModal));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
})();
