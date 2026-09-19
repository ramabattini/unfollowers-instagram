# Instagram Non-Followers Checker

Script de consola para ver, dentro de tu propia sesión de Instagram, quiénes seguís que no te siguen de vuelta.

Nace porque el script original de [agusmoles/instagram-unfollowers](https://github.com/agusmoles/instagram-unfollowers) dejó de funcionar: Instagram deprecó el endpoint viejo (`graphql/query?query_hash=...`) que usaba para traer la lista de seguidos. Este script reimplementa la misma idea usando el endpoint web actual (`api/v1/friendships/...`), reverseado a mano inspeccionando la pestaña Network del navegador.

## Uso

1. Entrá a [instagram.com](https://www.instagram.com) y logueate normalmente.
2. Abrí la consola del navegador (`F12` o `Ctrl+Shift+J` en Windows/Linux, `Cmd+Option+J` en Mac).
3. Si el navegador te pide confirmación para pegar código (aviso de seguridad "self-XSS"), escribí `allow pasting` y dale Enter.
4. Copiá y pegá el contenido de [`unfollowers.js`](./unfollowers.js) en la consola y presioná Enter.
5. Esperá a que termine de escanear — te va a mostrar todos los que no te siguen de vuelta.
6. Podés seleccionar cuentas haciendo click y usar el botón "Dejar de seguir seleccionados" para dejar de seguirlas en tandas, con pausas entre cada una.

## Cómo funciona

- Lee tu `user_id` y `csrftoken` de las cookies de tu propia sesión.
- Pagina sobre `api/v1/friendships/{userId}/followers/` y `.../following/` (de a 50 por página) hasta traer las listas completas.
- Calcula la diferencia: gente que seguís que no está en tu lista de seguidores.
- Guarda el resultado anterior en `localStorage` para poder marcar quiénes son nuevos en la próxima corrida.

## Limitaciones y riesgos

- Usa la API privada/no documentada de Instagram desde tu propia sesión — no es una API pública ni soportada. Esto puede violar los Términos de Servicio de Instagram.
- Instagram cambia estos endpoints e identificadores internos con cierta frecuencia (como medida anti-scraping), así que este script puede volver a romperse en cualquier momento.
- Si eso pasa, hay que volver a inspeccionar la pestaña Network del navegador (Followers/Following → filtrar por `Fetch/XHR`) para encontrar la URL y los headers actualizados.
- No se envía ninguna información a servidores de terceros: todo el tráfico va directo a `instagram.com` usando tu sesión ya logueada en el navegador.

## Créditos

Inspirado en [agusmoles/instagram-unfollowers](https://github.com/agusmoles/instagram-unfollowers).
