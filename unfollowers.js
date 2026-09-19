/**
 * Instagram Non-Followers Checker (console script) — v2, más conservador
 *
 * Pega este script en la consola del navegador (F12) estando logueado
 * en instagram.com. Escanea tu lista de seguidores y de seguidos usando
 * el endpoint web actual de Instagram (api/v1/friendships/...) y te
 * muestra quiénes seguís vos que no te siguen de vuelta.
 *
 * Reescrito porque el endpoint viejo (graphql/query?query_hash=...) que
 * usaban herramientas como https://github.com/agusmoles/instagram-unfollowers
 * fue deprecado por Instagram.
 *
 * v2: la primera versión pedía de a 50 usuarios por página con pausas
 * cortas (0.6-1.2s) y eso disparó el aviso de "actividad automatizada"
 * de Instagram. Esta versión pide de a 12 (el tamaño real que carga la
 * UI cuando scrolleás a mano), con pausas más largas y una pausa extra
 * cada 5 páginas, para parecerse más a un uso normal.
 *
 * Aun así, esto sigue usando la API privada/no documentada de Instagram
 * desde tu propia sesión — puede violar sus Términos de Servicio y
 * Instagram puede volver a marcarlo como sospechoso. Usalo poco
 * seguido (no todos los días), y si te vuelve a aparecer el aviso,
 * dejá de correrlo por un par de semanas.
 */
(async () => {
  const cookie = (name) => {
    const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? m[2] : null;
  };

  const userId = cookie('ds_user_id');
  const csrftoken = cookie('csrftoken');
  if (!userId || !csrftoken) {
    alert('No encontré tu sesión. Asegurate de estar logueado en Instagram.');
    return;
  }

  const APP_ID = '936619743392459'; // ID público de la app web de Instagram
  const PAGE_SIZE = 12; // igual al que usa la UI real
  let wwwClaim = localStorage.getItem('iu2-www-claim') || '0';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const randSleep = (min, max) => sleep(min + Math.random() * (max - min));

  const igFetch = async (url) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: '*/*',
        'X-Ig-App-Id': APP_ID,
        'X-Csrftoken': csrftoken,
        'X-Requested-With': 'XMLHttpRequest',
        'X-Ig-Www-Claim': wwwClaim,
      },
    });
    const newClaim = res.headers.get('x-ig-set-www-claim');
    if (newClaim) {
      wwwClaim = newClaim;
      localStorage.setItem('iu2-www-claim', newClaim);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    const data = await res.json();
    if (data.status && data.status !== 'ok') {
      throw new Error(
        `Instagram devolvió status "${data.status}" — probablemente te está frenando por actividad sospechosa. Parar y esperar unos días antes de reintentar.`
      );
    }
    return data;
  };

  const fetchAll = async (kind, onProgress) => {
    let users = [];
    let maxId = '';
    let hasMore = true;
    let page = 0;
    while (hasMore) {
      const url = `https://www.instagram.com/api/v1/friendships/${userId}/${kind}/?count=${PAGE_SIZE}${
        maxId ? `&max_id=${maxId}` : ''
      }`;
      const data = await igFetch(url);
      users = users.concat(data.users || []);
      maxId = data.next_max_id;
      hasMore = !!(data.has_more || data.big_list) && !!maxId;
      page++;
      onProgress && onProgress(users.length);

      if (!hasMore) break;

      // pausa larga cada 5 páginas, corta el resto del tiempo
      if (page % 5 === 0) {
        await randSleep(12000, 18000);
      } else {
        await randSleep(1800, 3200);
      }
    }
    return users;
  };

  document.body.innerHTML =
    '<div id="iu-status" style="font-family:sans-serif;padding:40px;font-size:20px;color:#333;background:#fff;">Escaneando...</div>';
  const statusEl = document.getElementById('iu-status');

  try {
    const followers = await fetchAll(
      'followers',
      (n) => (statusEl.textContent = `Escaneando seguidores... (${n})`)
    );

    // pausa entre "abrir lista de seguidores" y "abrir lista de seguidos",
    // como haría una persona real
    await randSleep(6000, 10000);

    const following = await fetchAll(
      'following',
      (n) => (statusEl.textContent = `Escaneando a quién seguís... (${n})`)
    );

    const followerIds = new Set(followers.map((u) => String(u.pk)));
    const nonFollowers = following.filter((u) => !followerIds.has(String(u.pk)));

    render(nonFollowers);
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    console.error(err);
  }

  function render(users) {
    document.body.style.cssText = 'font-family:sans-serif;background:#111;color:#eee;padding:20px;';
    document.body.innerHTML = `<h2>No te siguen de vuelta (${users.length})</h2><p style="opacity:.7;font-size:13px;">Recomendado: no dejes de seguir a más de 15-20 por tanda.</p><div id="grid" style="display:flex;flex-wrap:wrap;gap:16px;"></div><button id="unf-btn" style="margin-top:20px;padding:12px 20px;background:#dc2743;color:#fff;border:0;border-radius:8px;cursor:pointer;">Dejar de seguir seleccionados</button>`;
    const grid = document.getElementById('grid');
    const selected = new Set();

    users.forEach((u) => {
      const card = document.createElement('div');
      card.style.cssText = 'width:110px;text-align:center;cursor:pointer;padding:8px;border-radius:8px;';
      card.innerHTML = `<img src="${u.profile_pic_url}" style="width:70px;height:70px;border-radius:50%;border:2px solid #555;"><div style="font-size:12px;margin-top:6px;word-break:break-word;">${u.username}</div>`;
      card.onclick = () => {
        if (selected.has(u.pk)) {
          selected.delete(u.pk);
          card.style.background = 'transparent';
        } else {
          selected.add(u.pk);
          card.style.background = '#333';
        }
      };
      grid.appendChild(card);
    });

    document.getElementById('unf-btn').onclick = async () => {
      if (!selected.size) return;
      if (selected.size > 20 && !confirm(`Vas a dejar de seguir a ${selected.size} cuentas de una — te recomiendo hacer tandas de 15-20 para no levantar sospechas. ¿Seguir igual?`)) return;
      if (!confirm(`¿Dejar de seguir a ${selected.size} cuentas?`)) return;

      let i = 0;
      for (const pk of selected) {
        try {
          await fetch(`https://www.instagram.com/web/friendships/${pk}/unfollow/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              'x-csrftoken': csrftoken,
            },
          });
        } catch (e) {
          console.error('Fallo unfollow', pk, e);
        }
        i++;
        if (i % 5 === 0) {
          await randSleep(20000, 30000);
        } else {
          await randSleep(5000, 9000);
        }
      }
      alert('Listo!');
    };
  }
})();
