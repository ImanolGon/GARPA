(function () {
  const selector = document.querySelector('.intensity-selector');
  if (!selector) {
    return;
  }

  const highlight = selector.querySelector('.intensity-highlight');
  const inputs = selector.querySelectorAll('input[type="radio"]');

  if (!highlight || inputs.length === 0) {
    return;
  }

  const updateHighlight = (input) => {
    const option = input.closest('.intensity-option');
    if (!option) {
      return;
    }

    const optionRect = option.getBoundingClientRect();
    const containerRect = selector.getBoundingClientRect();

    const offsetLeft = optionRect.left - containerRect.left;
    const width = optionRect.width;

    selector.style.setProperty('--highlight-x', `${offsetLeft}px`);
    selector.style.setProperty('--highlight-width', `${width}px`);
  };

  const setReadyState = () => {
    selector.classList.add('is-ready');
  };

  const handleChange = (event) => {
    updateHighlight(event.target);
  };

  const handleResize = () => {
    const activeInput = selector.querySelector('input[type="radio"]:checked');
    if (activeInput) {
      updateHighlight(activeInput);
    }
  };

  inputs.forEach((input) => {
    input.addEventListener('change', handleChange);
    input.addEventListener('focus', () => selector.classList.add('is-focused'));
    input.addEventListener('blur', () => selector.classList.remove('is-focused'));
  });

  window.addEventListener('resize', handleResize);

  const initial = selector.querySelector('input[type="radio"]:checked') || inputs[0];
  if (initial) {
    updateHighlight(initial);
    requestAnimationFrame(() => {
      setReadyState();
    });
  }
})();
