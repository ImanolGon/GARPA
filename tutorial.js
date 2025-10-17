(function () {
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* Accordion for steps */
  const accordionItems = qsa('[data-accordion]');
  accordionItems.forEach((item) => {
    const trigger = qs('.tutorial-step__trigger', item);
    const content = qs('.tutorial-step__content', item);
    if (!trigger || !content) return;

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      accordionItems.forEach((other) => {
        if (other === item) return;
        const otherTrigger = qs('.tutorial-step__trigger', other);
        const otherContent = qs('.tutorial-step__content', other);
        if (!otherTrigger || !otherContent) return;
        otherTrigger.setAttribute('aria-expanded', 'false');
        otherContent.hidden = true;
        other.classList.remove('is-open');
      });

      trigger.setAttribute('aria-expanded', String(!isOpen));
      content.hidden = isOpen;
      item.classList.toggle('is-open', !isOpen);
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
  const closeButtons = modal ? qsa('[data-action="close-modal"]', modal) : [];
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
        if (src) videoFrame.setAttribute('src', src);
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
