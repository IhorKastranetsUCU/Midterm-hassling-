(() => {
  const H = window.Hustle;
  const form = document.querySelector('#registration-form');
  const login = new URLSearchParams(location.search).get('mode') === 'login';
  const password = form.elements.password;
  const toggle = form.querySelector('.password-toggle');
  const submit = form.querySelector('[type="submit"]');
  if (login) {
    document.querySelector('.auth-illustration-title').innerHTML = 'Твій план<br>уже чекає.';
    document.title = 'Увійти — Hustle';
    document.querySelector('#registration-title').textContent = 'Увійти';
    form.elements.name.required = false;
    form.elements.name.closest('.form-field').hidden = true;
    password.autocomplete = 'current-password';
    password.placeholder = '';
    document.querySelector('.onboarding-steps').hidden = true;
    submit.innerHTML = 'Увійти <span aria-hidden="true">→</span>';
    const mode = document.querySelector('[data-auth-mode]');
    mode.textContent = 'Створити акаунт';
    mode.href = 'register.html';
  }
  function validate(field) {
    let message = '';
    if (field.name === 'name' && !login && !field.value.trim()) message = 'Вкажи своє ім’я.';
    if (field.name === 'email' && !field.validity.valid) message = 'Вкажи коректний email.';
    if (field.name === 'password' && field.value.length < 8) message = 'Щонайменше 8 символів.';
    const error = document.getElementById(field.getAttribute('aria-describedby'));
    error.textContent = message; error.hidden = !message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }
  for (const field of form.querySelectorAll('input')) field.addEventListener('input', () => { if (field.hasAttribute('aria-invalid')) validate(field); });
  toggle.addEventListener('click', () => {
    const show = password.type === 'password'; password.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Сховати пароль' : 'Показати пароль');
    toggle.setAttribute('aria-pressed', String(show));
    toggle.querySelector('[data-eye-slash]').toggleAttribute('hidden', !show);
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); form.elements.email.value = form.elements.email.value.trim();
    const invalid = [...form.querySelectorAll('input')].filter(field => !validate(field));
    if (invalid.length) { invalid[0].focus(); form.querySelector('[role="alert"]').textContent = 'Перевір позначені поля.'; return; }
    H.update({ registered: true, name: login ? H.state.name || 'Студент' : form.elements.name.value.trim() });
    password.value = ''; // No password or email is stored or transmitted by the prototype.
    location.href = login && H.state.ready ? 'app.html' : 'connect.html';
  });
  submit.disabled = false;
})();
