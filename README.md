# Don Chepe · WebAR

Demo de realidad aumentada web con un **campesino colombiano 3D estilo caricatura** generado
100 % por código (Three.js). No usa archivos GLB previos, videos planos ni servicios externos:
toda la geometría (sombrero vueltiao, ruana con franjas y flecos, pañuelo, camisa, pantalón y
botas pantaneras) se construye con primitivas 3D y materiales.

![Vistas](docs/vistas.png)

## Qué incluye

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página de inicio con **código QR** (modo Directo o Web con botones) |
| `go.html` | **Modo QR directo**: abre la cámara de RA nativa de Android sin pasos intermedios |
| `viewer.html` | **Visor 3D** para el PC (rotar, zoom, animaciones, audio, exportar GLB). No necesita WebXR |
| `ar.html` | **Experiencia WebAR** (WebXR + hit-test): un toque → cámara → el personaje aparece solo en el piso |
| `ar.html?preview` | Vista previa de la escena AR en el PC (sin cámara) para depurar |
| `js/campesino.js` | Construcción procedural del personaje + clips de animación por keyframes |
| `js/animator.js` | Mezcla de animaciones (AnimationMixer) y **lip-sync** con Web Audio API |
| `models/campesino.glb` | GLB pre-generado con malla y 5 animaciones (validado con glTF-Validator: 0 errores) |
| `models/campesino-presentacion.glb` | **Modelo realista** (Tripo, con esqueleto) y su animación de 10 s, usado por el QR directo y por `ar.html` |
| `models/caricatura-presentacion.glb` | Versión caricatura horneada con el audio (copiarla sobre la anterior para volver a la caricatura) |
| `js/glb-actor.js` | Carga un GLB animado, lo ajusta a 1,72 m y sincroniza animación + audio |
| `tools/bake-presentacion.mjs` | Regenera el GLB de presentación de la caricatura a partir de cualquier MP3 (usa ffmpeg) |
| `audio/saludo.mp3` | Audio de ejemplo en español (voz sintética eSpeak NG). Reemplázalo por tu voz |
| `tools/export-glb.mjs` | Regenera el GLB desde el código, sin navegador (Node.js) |
| `serve.py` | Servidor HTTPS local con certificado autofirmado + QR para el teléfono |
| `vendor/` | Three.js r187 y qrcode-generator copiados en local (sin CDN) |

## Personaje

- **Jerarquía articulada**: `Campesino › Cadera › Torso › Cuello › Cabeza › Boca/Ojos/Sombrero`,
  `Hombro_L/R › Codo_L/R › Mano_L/R`, `Muslo_L/R › Rodilla_L/R`. Cada articulación es un nodo que rota.
- ~150 mallas, ~34 000 triángulos, materiales PBR (`MeshStandardMaterial`), sin texturas.
- Altura real ≈ 1,8 m (en AR arranca al 50 %, ≈ 0,9 m, y se puede escalar).

### Animaciones

![Animaciones](docs/animaciones.png)

| Clip | Descripción |
|---|---|
| `Reposo` | Respiración, balanceo de cabeza y brazos, parpadeo (loop) |
| `Saludo` | Levanta la mano derecha y saluda; inclina la cabeza |
| `Brazos` | Gesticula con ambos brazos como si explicara algo |
| `Cabeza` | Asiente (sí) y niega (no) |
| `Hablar` | Abre y cierra la boca en loop (útil en visores GLB sin audio) |

Los gestos se mezclan con *crossfade* y vuelven solos al reposo.

### Lip-sync con MP3

El `<audio>` se conecta a un `AnalyserNode` de Web Audio. En cada frame se calcula:

- **Energía (RMS)** de la señal → apertura de la boca (escala Y del nodo `Boca`).
- **Relación de agudos/graves** (1,5–4 kHz vs 150–900 Hz) → boca más estirada (e/i) o redonda (a/o).
- Ataque rápido y caída lenta para que se vea natural, y un leve movimiento de cabeza con la voz.

Funciona con cualquier MP3: en el visor usa **“Cargar otro MP3”**, o reemplaza `audio/saludo.mp3`.

## Cómo ejecutarlo

Requisitos: **Python 3** (servidor). Node.js solo hace falta para regenerar el GLB.

### 1. Probar en el computador

```bash
python serve.py --http        # o: python -m http.server 8080
```

Abre <http://localhost:8080/viewer.html>.

> Hay que usar un servidor: abrir el HTML con doble clic (`file://`) bloquea los módulos JS y el análisis de audio.

### 2. Probar la RA en Android (red local)

```bash
pip install cryptography qrcode   # opcionales: certificado y QR en terminal
python serve.py                   # HTTPS en el puerto 8443
```

1. El PC y el teléfono deben estar en la **misma red Wi-Fi**.
2. En el PC abre `https://localhost:8443/`: la página muestra el **QR** con la IP de tu red.
3. Escanéalo con el teléfono y ábrelo en **Chrome**. Como el certificado es autofirmado, toca
   *Configuración avanzada → Acceder al sitio*.
4. **Toca la pantalla** una vez, permite la cámara y apunta al piso moviendo el teléfono despacio:
   Don Chepe aparece solo, saluda y habla con el audio.
5. Botones: 🔊 hablar/pausar · 👋 🙌 🙂 gestos · − / ＋ tamaño · ⟳ girar · 📍 mover.

Si el firewall de Windows pregunta, permite el acceso de Python a redes privadas.

### 3. Modo QR directo (sin pasar por la página)

En `index.html` elige **“Directo (abre la cámara)”**. El QR apunta a `go.html`, que lanza de inmediato
el **visor de RA nativo de Android** (Scene Viewer, incluido gratis en “Servicios de Google Play para RA”)
en modo cámara:

- No hay botón “Iniciar AR”: se abre la cámara, detecta el piso y **Don Chepe aparece solo**.
- Reproduce la animación de presentación (saluda, gesticula, asiente y se despide) con el audio sincronizado.
- El usuario puede moverlo, girarlo y escalarlo con los dedos.

Condiciones y límites:

- Necesita el proyecto **publicado con HTTPS real** (GitHub Pages, paso 4). Con `serve.py` en la red
  local no funciona porque el visor nativo descarga el modelo por su cuenta y rechaza certificados autofirmados.
- Al escanear, Android abre el enlace en el navegador durante un instante y salta al visor. Si Chrome
  pide confirmación, aparece un botón grande **“Ver en mi espacio”** (un toque).
- Si el teléfono no tiene ARCore, se abre automáticamente la versión web.
- El visor nativo no tiene nuestros botones; la boca va “horneada” desde el MP3 (no se analiza en vivo).

**Cambiar el audio en modo directo**: reemplaza `audio/saludo.mp3` y regenera el GLB:
`node tools/bake-presentacion.mjs` (con ffmpeg) o, sin instalar nada, en el visor carga el MP3 y pulsa
**“GLB para QR directo”**; guarda el archivo como `models/campesino-presentacion.glb`.

### Por qué la versión web necesita un toque

Por seguridad, Chrome solo permite abrir la cámara de RA y reproducir audio después de un gesto del
usuario. `ar.html` lo reduce al mínimo: **un toque en cualquier parte** de la pantalla; después el
personaje se coloca solo al detectar el piso (con 📍 Mover se puede reubicar tocando otra superficie).

### 4. Publicación gratuita con HTTPS real (la opción más confiable)

GitHub Pages es gratis y da HTTPS válido, así el teléfono no muestra advertencias:

1. Crea un repositorio y sube el contenido de esta carpeta (`node_modules/` no es necesario).
2. *Settings → Pages → Deploy from a branch → main / (root)*.
3. Abre `https://<usuario>.github.io/<repo>/`: la página genera el QR (modo Directo o Web).

Alternativas: Netlify o Cloudflare Pages (planes gratuitos), o depuración USB con
`adb reverse tcp:8080 tcp:8080` y abrir `http://localhost:8080/ar.html` en el teléfono (localhost cuenta como seguro).

### Requisitos del teléfono

- Android 8 o superior, **Chrome** actualizado.
- **Servicios de Google Play para RA (ARCore)** instalado — [lista de dispositivos compatibles](https://developers.google.com/ar/devices).
- Si el teléfono no soporta WebXR, `ar.html` lo explica y ofrece el **visor 3D** o abrir el GLB en
  **Scene Viewer** (ARCore). Scene Viewer muestra la geometría y la animación, pero no el lip-sync con audio.

## Exportar a GLB

- **En el navegador**: botón **“⬇ GLB animado”** del visor (incluye las 5 animaciones).
- **Por línea de comandos**:
  ```bash
  npm install
  npm run export-glb      # → models/campesino.glb
  npm run bake            # → models/campesino-presentacion.glb (requiere ffmpeg)
  ```

El GLB se abre en Blender (*File → Import → glTF 2.0*), en <https://gltf-viewer.donmccurdy.com> o en cualquier visor glTF.
En el GLB, la boca se anima con el clip `Hablar`; el lip-sync con audio funciona en `viewer.html` y `ar.html`.

## Personalizar

- **Colores**: objeto `COLORS` al inicio de `js/campesino.js` (ruana, sombrero, piel, botas…).
- **Animaciones**: función `buildClips()` en `js/campesino.js`. Cada clip es una lista de `[tiempo, [rotX, rotY, rotZ]]` por articulación.
- **Sensibilidad del lip-sync**: `_analyse()` en `js/animator.js` (umbral `0.012` y rango `0.11`).
- **Tamaño inicial en AR**: `ar.html?scale=0.3` (30 %) o la variable `scale` en `ar.html`.
- **Otra voz**: reemplaza `audio/saludo.mp3`. Para regenerar el ejemplo con eSpeak NG (gratuito):
  ```bash
  espeak-ng -v es-419 -p 35 -s 145 -w saludo.wav "¡Buenas, buenas! ..."
  ffmpeg -i saludo.wav -b:a 96k audio/saludo.mp3
  ```

## Modelo realista

`models/campesino-presentacion.glb` es el personaje realista generado en Tripo (≈20 000 triángulos,
esqueleto Mixamo, animación de 9,96 s “en el sitio”), con texturas optimizadas a JPEG 2K (4,3 MB).
`audio/saludo.mp3` dura lo mismo para que el visor nativo los repita sincronizados.

- `ar.html` usa el realista a tamaño real (1,72 m). `ar.html?modelo=caricatura` usa la caricatura con lip-sync en vivo.
- Para cambiar el modelo: exporta desde Tripo en GLB (textura 2K, esqueleto, 1 animación, en el sitio)
  y reemplaza `models/campesino-presentacion.glb`. El audio debe durar lo mismo que la animación.

## Notas técnicas

- Three.js r187 (MIT) y qrcode-generator (MIT) están en `vendor/`. No se carga nada desde Internet.
- Blender no es necesario: el personaje se genera con Three.js y el GLB resultante se puede editar en Blender.
- La WebAR usa la API estándar WebXR Device API (`immersive-ar`, `hit-test`, `dom-overlay`). iPhone/Safari no soporta WebXR AR. En iOS el visor 3D sí funciona.
