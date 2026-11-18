/* Small local SVG avatars. A seeded choice stays the same for an account. */
(() => {
  const avatars = [
    {id:'owl', name:'Сова в окулярах'},
    {id:'cat', name:'Кіт-випускник'},
    {id:'book', name:'Усміхнена книжка'},
    {id:'coffee', name:'Студентська кава'},
    {id:'backpack', name:'Рюкзак'},
    {id:'pencil', name:'Олівець'},
  ];
  function avatarFor(ownerId) {
    let hash=2166136261;
    for (const letter of String(ownerId || 'hustle')) hash=Math.imul(hash ^ letter.codePointAt(0),16777619);
    hash ^= hash >>> 16;
    return avatars[(hash >>> 0) % avatars.length];
  }
  function applyProfile(account) {
    const avatar=avatarFor(account.owner_id);
    document.querySelectorAll('[data-profile-avatar]').forEach(host => {
      if(host.dataset.avatar===avatar.id)return;
      const picture=document.createElement('img');
      picture.src=`avatars/${avatar.id}.svg`;
      picture.width=64; picture.height=64;
      picture.alt=host.closest('a[aria-label]')?'':avatar.name;
      host.replaceChildren(picture);
      host.dataset.avatar=avatar.id;
    });
    document.querySelectorAll('.sidebar-profile [data-name]').forEach(el => {
      const name=(account.fullname || '').trim();
      el.hidden=!name || name.toLocaleLowerCase('uk')==='гість';
      el.textContent=el.hidden?'':name;
    });
  }
  window.HustleBrand={avatars,avatarFor,applyProfile};
})();
