# 🏋️ Diario de gimnasio

App web instalable en Android para llevar un diario de entrenamientos de gimnasio.

## Qué hace

- **Biblioteca de ejercicios:** más de 870 ejercicios con fotos de la posición inicial y final, que se alternan para mostrar el movimiento. Incluye músculos trabajados, material e instrucciones. Se puede buscar en español (por ejemplo «sentadilla», «press banca», «pecho») y filtrar por músculo y material.
- **Rutinas:** crea rutinas como «Pierna» o «Empuje», añade ejercicios de la biblioteca y ordénalos.
- **Entrenar:** empieza un entrenamiento desde una rutina o en libre. En cada ejercicio apuntas las **series**, y en cada serie las **repeticiones** y el **peso**. Se muestra en gris lo que hiciste la última vez; al pulsar ✓ en una serie vacía se usan esos valores.
- **Historial:** entrenamientos anteriores con duración, series y kilos totales, y el progreso de cada ejercicio (mejor serie y últimas sesiones).
- **Copia de seguridad:** exporta e importa tus datos en un archivo JSON.

Funciona sin conexión una vez instalada. Los datos se guardan solo en el móvil.

## Instalar en Android

1. Abre la dirección de la app en **Chrome** en el móvil.
2. Menú ⋮ → **Instalar app** (o «Añadir a pantalla de inicio»).
3. Se abrirá a pantalla completa desde su icono, como cualquier otra app.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la página |
| `styles.css` | Diseño (modo claro y oscuro) |
| `app.js` | Toda la lógica: biblioteca, rutinas, entrenamientos, historial |
| `sw.js` | Service worker: permite usar la app sin conexión |
| `manifest.webmanifest` | Nombre, icono y colores para instalarla como app |
| `data/exercises.json` | Biblioteca de ejercicios |

Al publicar cambios, sube el número de `VERSION` en `sw.js` para que los móviles descarguen la versión nueva.

## Créditos

Ejercicios e imágenes de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), de dominio público (Unlicense).
