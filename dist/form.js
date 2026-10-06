(() => {
  const form = document.querySelector('#consultation-form');
  if (!form) return;
  const fields = [...form.querySelectorAll('input[required]')];
  const status = document.querySelector('#form-status');
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
  fields.forEach(field => {
    field.addEventListener('blur', () => {if (field.value || field.getAttribute('aria-invalid') === 'true') validate(field);});
    field.addEventListener('input', () => {if (field.getAttribute('aria-invalid') === 'true') validate(field); status.hidden = true;});
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); status.hidden = true;
    const valid = fields.map(validate);
    if (valid.some(result => !result)) {fields[valid.indexOf(false)].focus(); return;}
    // This design-review form deliberately does not transmit or persist lead data.
    status.innerHTML = 'This preview does not send your details. To book your consultation, <a href="tel:+12602226467">call (260) 222-6467</a> or <a href="https://www.beautifulblindsandshades.com/contact" target="_blank" rel="noopener">use our contact page</a>.';
    status.hidden = false;
  });
})();
