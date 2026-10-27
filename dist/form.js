(() => {
  const form = document.querySelector('#consultation-form');
  if (!form) return;
  const fields = [...form.querySelectorAll('input[required]')];
  const status = document.querySelector('#form-status');
  const button = form.querySelector('button[type="submit"]');
  const success = document.querySelector('#consultation-success');
  const CALL_US = 'We couldn’t confirm your request. Please call (260) 222-6467 before submitting again.';
  // netlify/lib/consultation.mjs rejects anything sent sooner than this after the page loads.
  const MIN_FILL_MS = 3000;
  let pending = false;
  function validate(field) {
    const value = field.value.trim();
    let error = '';
    if (!value) error = 'Please enter your ' + field.labels[0].textContent.toLowerCase() + '.';
    else if (field.type === 'email' && !field.validity.valid) error = 'Please enter a valid email address.';
    else if (field.type === 'tel') {
      const digits = value.replace(/\D/g, '');
      if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith('1')))) error = 'Please enter a 10-digit US phone number.';
    }
    field.setAttribute('aria-invalid', String(!!error));
    const message = document.getElementById(field.id + '-error');
    message.textContent = error; message.hidden = !error;
    return !error;
  }
  // Google Ads "Submit Lead Forms" conversion, with enhanced-conversion user data set first.
  // Called only for a lead GHL confirmed. The transaction id is keyed by the contact id,
  // which GHL reuses when the same person submits again, so Google counts that person once.
  // Tracking must never hold up or break the form.
  function reportLeadConversion(contactId) {
    try {
      if (typeof gtag !== 'function') return;
      const digits = form.phone.value.replace(/\D/g, '');
      gtag('set', 'user_data', {email: form.email.value.trim().toLowerCase(), phone_number: '+' + (digits.length === 10 ? '1' + digits : digits)});
      gtag('event', 'conversion', {send_to: 'AW-18483436683/KcYjCIqetaIdEIu5y-1E', transaction_id: 'lead_' + contactId});
    } catch {
      // A blocked or broken tag skips the conversion; the lead is already in GHL.
    }
  }
  fields.forEach(field => {
    field.addEventListener('blur', () => {if (field.value || field.getAttribute('aria-invalid') === 'true') validate(field);});
    field.addEventListener('input', () => {if (field.getAttribute('aria-invalid') === 'true') validate(field); status.hidden = true;});
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    status.hidden = true;
    const valid = fields.map(validate);
    if (valid.some(result => !result)) {fields[valid.indexOf(false)].focus(); return;}
    pending = true;
    button.disabled = true;
    button.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');
    try {
      // Someone whose browser autofills the form can be faster than the minimum;
      // wait it out rather than have the lead rejected.
      const wait = MIN_FILL_MS + 100 - performance.now();
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      const payload = Object.fromEntries(new FormData(form));
      // Time since the page started loading, on this browser's own clock.
      payload.elapsedMs = Math.round(performance.now());
      // FormData leaves an unticked box out and sends a ticked one as "on"; send a boolean.
      payload.smsOptIn = form.smsOptIn.checked === true;
      const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        // AbortSignal.timeout is missing before Safari 16; send without a timeout there rather than fail.
        signal: AbortSignal.timeout?.(20000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || CALL_US);
      reportLeadConversion(result.contactId);
      form.hidden = true;
      form.reset();
      success.hidden = false;
      success.focus();
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error instanceof TypeError || error instanceof SyntaxError ? CALL_US : error.message;
      status.hidden = false;
      status.focus();
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = 'Get My Free Quote';
      form.removeAttribute('aria-busy');
    }
  });
})();
