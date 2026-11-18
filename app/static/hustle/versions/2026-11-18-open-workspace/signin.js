(() => {
 const error = document.querySelector('#auth-error');
 for (const id of ['google-login','guest-login']) document.getElementById(id).addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true; error.hidden = true;
  try {
   if (id === 'google-login') {
    const data = await UI.api('/api/auth/google/login?redirect=false');
    document.cookie = 'hustle_oauth_return=workspace; Path=/; Max-Age=600; SameSite=Lax';
    location.assign(data.auth_url);
   } else { await UI.api('/api/workspace/session'); location.assign('app.html'); }
  } catch (err) { error.textContent = err.message; error.hidden = false; button.disabled = false; }
 });
})();
