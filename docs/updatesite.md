# updatesite: actualizar un sitio a la versión actual de su plantilla

`createsite` copia `_templates/sites/<plantilla>` a `web/<host>` una sola vez. `updatesite` lleva después ese sitio a la versión de la plantilla que haya en el servidor, sin tocar lo que se modificó a mano. Los dos están en el paquete `dkl-web` y se corren desde la raíz de Devkron (la carpeta donde están `dkl`, `_templates/` y `web/`).

## Uso

```
./dkl updatesite <plantilla> <host> [simular] [revertir=<fecha>|ultimo] [forzar=<archivo>[,<archivo>…]] [hash=net|exec|dk2] [adoptar]
```

| Argumento | Qué hace |
|---|---|
| `<plantilla>` | Carpeta de `_templates/sites` (por ejemplo `v12`). Debe tener `site.manifest`. |
| `<host>` | Carpeta de `web/` (por ejemplo `empresa.v12.induxsoft.net`). El sitio debe existir; si no, `createsite`. |
| `simular` | Solo reporta lo que haría. No copia, no respalda y no escribe el registro. |
| `revertir=<fecha>` | Deshace una actualización con su respaldo `web/<host>/_protected/_respaldo/<fecha>/`. `revertir=ultimo` toma el más reciente. |
| `forzar=<archivo>` | Reemplaza ese archivo aunque se haya modificado a mano (con respaldo). Ruta relativa al sitio, con `/`. Se puede repetir o separar con comas. En `revertir`, restaura el archivo aunque haya cambiado después de la actualización. |
| `hash=…` | Cómo se calcula el sha256 (ver abajo). Por omisión `net`. |
| `adoptar` | Actualiza un sitio sin registro aunque ninguno de sus archivos coincida con una versión publicada de la plantilla (ver «Sitios sin registro»). |

También se aceptan `--simular`, `--forzar=…`, etc., y la forma `clave:valor`. Las opciones del intérprete (`-hide-log`…) se ignoran.

Ejemplos:

```
./dkl updatesite v12 empresa.v12.induxsoft.net simular
./dkl updatesite v12 empresa.v12.induxsoft.net
./dkl updatesite v12 empresa.v12.induxsoft.net forzar=_protected/render.dk
./dkl updatesite v12 empresa.v12.induxsoft.net revertir=20261102-143005
./dkl updatesite v12 empresa.v12.induxsoft.net revertir=ultimo
```

## Qué hace con cada archivo

Solo trabaja sobre los archivos que lista el manifiesto de la plantilla. Para cada uno compara el sha256 del archivo del sitio con:

1. el del archivo de la plantilla (versión nueva);
2. el que el registro del sitio dice que se instaló;
3. el `sha256` del manifiesto y su `history` (todas las versiones publicadas antes).

| Situación | Resultado |
|---|---|
| No existe en el sitio | **copiado** |
| Es igual al de la plantilla | **igual** (no se hace nada) |
| Coincide con 2 o 3 | **reemplazado**, con respaldo |
| No coincide con ninguno | **modificado a mano**: no se toca y sale en el reporte. No cuenta como error. |
| Está en `forzar=` | **reemplazado (forzado)**, con respaldo |
| No se pudo leer, copiar o calcular su sha256 | **error** |

- **Nunca borra** archivos del sitio que no estén en el manifiesto (código del cliente, páginas sueltas, imágenes).
- **Respaldo:** antes de reemplazar, copia el archivo a `web/<host>/_protected/_respaldo/<AAAAMMDD-HHMMSS>/<ruta>`. En esa carpeta deja también `_updatesite.json` (qué se copió y qué se reemplazó) y la copia del registro anterior. Si ya existe una carpeta con esa fecha, agrega `-2`, `-3`…
- **Registro:** al terminar escribe `web/<host>/_protected/site.installed.json`. Si no hubo cambios, el registro ya tenía esa versión y lo que dice de cada archivo no cambió (huella y marca de modificado), no escribe nada: una segunda corrida no cambia el sitio. Un archivo que pasa a «modificado a mano» (o deja de estarlo) sí reescribe el registro, aunque no se copie nada.
- Si el registro dice que el sitio se instaló con otra plantilla, se detiene.
- Si el `sha256` del manifiesto no es el del archivo de la plantilla, avisa (manifiesto desactualizado) y usa el del archivo.

## Revertir

`revertir=<fecha>` lee `_respaldo/<fecha>/_updatesite.json` y:

- **restaura** los archivos reemplazados, si siguen como los dejó la actualización (si cambiaron después, los reporta como modificados y no los toca, salvo `forzar=`);
- **quita** los archivos que la actualización copió porque no existían, si no han cambiado;
- **restaura el registro** anterior, o lo quita si el sitio no tenía.

Si hubo varias actualizaciones, se revierten de la más reciente a la más vieja. `simular` también sirve con `revertir`.

## Sitios sin registro

Los sitios creados antes de `updatesite` no tienen `site.installed.json`. Para ellos cuenta el historial del manifiesto: si su archivo coincide con alguna versión publicada, se reemplaza; si no, se reporta. Como protección, si **ninguno** de los archivos que ya existen coincide con una versión publicada, se detiene sin cambiar nada (probablemente es otra plantilla). `adoptar` lo deja seguir: aun así no toca los modificados, solo copia los que faltan.

`createsite` ya escribe el registro al crear el sitio (desde el manifiesto de la plantilla) y no copia `site.manifest` al sitio.

## Salida

Una línea por archivo y un resumen al final:

```
updatesite: plantilla v12 1.0.235 -> web/empresa.v12.induxsoft.net
registro:   no tiene (primera vez con updatesite)

  reemplazado             _protected/render.dk
  igual                   _protected/routes.map
  modificado a mano       js/lib.js  (no se tocó; para reemplazarlo: forzar=js/lib.js)
  copiado                 js/induxsoft.controls.opcanva.js

Respaldo: web/empresa.v12.induxsoft.net/_protected/_respaldo/20261102-143005   (para deshacer: ./dkl updatesite v12 empresa.v12.induxsoft.net revertir=20261102-143005)
Registro: web/empresa.v12.induxsoft.net/_protected/site.installed.json

RESULTADO: OK  copiados=1 reemplazados=1 iguales=1 modificados=1 quitados=0 errores=0 avisos=0
```

- **Código de salida:** 0 si no hubo errores; 1 si algún archivo terminó en error; 2 si faltan o sobran argumentos. Los modificados a mano no son error.
- La última línea siempre empieza con `RESULTADO: OK` o `RESULTADO: ERROR`. `updatev12` la busca, porque `_exec` no entrega el código de salida.

## sha256 en Devkron 1 y Devkron 2

DKL no tiene una función de sha256 de archivos común a las dos versiones. `updatesite` usa:

| `hash=` | Cómo | Dónde funciona |
|---|---|---|
| `net` (por omisión) | `file.rbytes` + `System.Security.Cryptography.SHA256.HashData` + `System.Convert.ToHexString`, mapeados con `_map_function`. Antes llama a `hmacsha256` para que el ensamblado de criptografía de .NET quede cargado. | Devkron 1 (.NET 5) y Devkron 2 (.NET 10): las dos funciones existen desde .NET 5. |
| `exec` | El programa `sha256sum` del sistema. | Linux, con cualquier versión de Devkron. |
| `dk2` | `hash.sha256_file` de `hash.dkh`, que se incluye en tiempo de ejecución solo con esta opción, a través de `updatesite.hash.dkh` (un archivo incluido con `include` en ejecución se analiza aparte y necesita su propio `#include "dkli.dkh"`, que `hash.dkh` no trae). Si falta `hash.dkh`, termina con error. | Devkron 2.0.1 o posterior. |

Con `net`, si .NET no calcula el sha256 de un archivo y `sha256sum` sí, avisa y sigue con `exec`. En Devkron 1, la criptografía de .NET en Linux necesita libssl 1.1; donde falte, `md5()` y SHA256 pueden tumbar el intérprete sin excepción: ahí se usa `hash=exec`.

## Formato del manifiesto de la plantilla

`_templates/sites/<plantilla>/site.manifest`, JSON:

```json
{
  "template": "v12",
  "version": "1.0.234",
  "files": [
    {
      "path": "_protected/render.dk",
      "sha256": "7f9d8438edff74b30e35a6b8cb0f688ed96a7f199114b528f371849d8ce752ea",
      "history": [
        "025bc6d9d812907437c03e178056e0d72f82245bd8c1a21206233d3bb7696eff",
        "034f3e11bbbc2ae3c77ef7a96f97bb01b64d5e7e24e477fc61e2c67353962a4c"
      ]
    }
  ]
}
```

| Campo | Descripción |
|---|---|
| `template` | Nombre de la plantilla. |
| `version` | Versión de la plantilla (la del paquete que la trae). Se guarda en el registro del sitio. |
| `files[].path` | Ruta relativa a la plantilla, con `/`, sin `..`. El propio `site.manifest` no se lista. |
| `files[].sha256` | sha256 del archivo tal como se publica (hexadecimal en minúsculas). |
| `files[].history` | Opcional. sha256 de las versiones publicadas anteriores de ese archivo. |

El historial va dentro de cada archivo, no en un objeto aparte por ruta, porque en DKL las claves de un registro no pueden llevar `/` (`@@`, `field.str` y `field.exist` las toman como rutas anidadas).

En V12 el manifiesto lo genera `herramientas/site-manifest.py` del repo `Induxsoft/v12`, a partir del historial git, con la forma CRLF con que el empaquetador publica los archivos.

## Formato del registro del sitio

`web/<host>/_protected/site.installed.json`, JSON:

```json
{
  "template": "v12",
  "version": "1.0.234",
  "date": "2026-11-02 14:30:05",
  "files": [
    { "path": "_protected/render.dk", "sha256": "7f9d8438…" },
    { "path": "js/lib.js", "sha256": "", "modificado": 1 }
  ]
}
```

- `files[].sha256` es lo que `updatesite` instaló o encontró igual.
- Para un archivo modificado a mano guarda el sha256 que tenía registrado antes (vacío si no había) y `"modificado": 1`, así que sigue reportándose en las corridas siguientes hasta que se fuerce o se deje como estaba.

## Respaldo (`_updatesite.json`)

```json
{
  "fecha": "20261102-143005",
  "date": "2026-11-02 14:30:05",
  "template": "v12",
  "version_anterior": "",
  "version": "1.0.234",
  "registro_previo": 0,
  "copiados": [ { "path": "js/induxsoft.controls.opcanva.js", "sha256": "…" } ],
  "reemplazados": [ { "path": "_protected/render.dk", "sha256_anterior": "…", "sha256": "…" } ]
}
```

## Con updatev12

`updatev12` (paquete `v12`, rama `apariencia-v12`), al terminar de desplegar, corre `updatesite` para cada sitio cuyo `_config/<host>.json` (lo escribe `connectv12`, con `{"qname": "<conexión>"}`) tiene el `qname` de la base que actualiza. La plantilla sale del registro del sitio; sin registro, se deduce: `v12` si existe `_protected/render.dk`, `v12-content-site` si existe `index.dkl`. Se apaga con `sinsitios`.

### Qué necesita `dkl-web` para que `updatev12` lo despliegue

Leído en `updatev12.dkl` y `deployv12.dkl` (`Induxsoft/v12`):

1. **Aparecer en la consulta de paquetes instalados.** `updatev12` recorre `sys_app_catalog` unido con `sys_packs` (`FROM sys_app_catalog LEFT JOIN sys_packs`): un paquete sin aplicaciones, como `dkl-web`, `dkl-ddm` o `v12`, no sale aunque tenga fila en `sys_packs`.
2. **Entrada en `manifest.json` de la fuente**, con su `id`, `version` y `schema_ver`. Es contra lo que compara.
3. **`pack.manifest` en la raíz del zip.** `deployv12` lo guarda como `_deployed/<md5 de la fuente>/<zip>.manifest`; `updatev12` lee ahí la versión desplegada. Sin él, la versión local es desconocida.
4. **`schema_ver`.** Se compara con `sys_packs.schema_ver`; un paquete sin instalador nunca escribe esa fila, así que `updatev12` pediría instalarlo en cada corrida (no hace nada, porque no hay `_install/`).

Con este repo se cumple el 3. El 2 lo hace quien publica. Para el 1, la rama `apariencia-v12` de `Induxsoft/v12` propone que `updatev12` despliegue aparte el núcleo sin aplicaciones (`nucleo=dkl-ddm,dkl-web,v12`, se apaga con `sinnucleo`).
