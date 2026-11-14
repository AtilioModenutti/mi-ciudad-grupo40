<div align="center">
  <img src="assets/branding/mi-colon-logo.png" alt="Logo de Mi Colón" width="240" />

# Mi Colón

**Tu guía para descubrir Colón, Entre Ríos**

Trabajo Final Integrador · **Desarrollo para Móviles** · **UNER** · **Grupo 40** · **2026**

</div>

---

## 1. Descripción

**Mi Colón** es una aplicación móvil de guía turística de la ciudad de **Colón, Entre Ríos (Argentina)**. Permite explorar lugares de interés, ubicarlos en un mapa, consultar eventos, escuchar audioguías y registrar las visitas realizadas.

El proyecto se desarrolló para el **Trabajo Final Integrador de la materia Desarrollo para Móviles, de la Universidad Nacional de Entre Ríos (UNER)**. Integra las implementaciones de los cuatro integrantes del Grupo 40 y sigue como base el PRD **«Mi Ciudad — Guía Turística de Colón»**, con la identidad visual final **Mi Colón**.

La aplicación se conecta a una API REST de la cátedra y conserva información seleccionada en el dispositivo para continuar funcionando sin conexión en los casos previstos.

## 2. Integrantes — Grupo 40

| Integrante                 | Responsabilidades principales                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Atilio M. Modenutti**    | Catálogo de lugares, autenticación, sesión, favoritos, consulta offline del catálogo y sincronización offline. |
| **Mássimo Adriel Quirolo** | Mapa turístico, ubicación, distancias, indicaciones y orientación del dispositivo.                             |
| **Pablo Amadio**           | Agenda de eventos, recordatorios, notificaciones y audioguías.                                                 |
| **Joaquín Carrera**        | Mi recorrido, registro de visitas manual/QR/GPS, fotografías.                                                  |

## 3. Funcionalidades

### Lugares turísticos y favoritos

- Listado de lugares obtenido de la API, con búsqueda y filtros por categoría.
- Fichas con información, imágenes, horarios, ubicación y demás datos disponibles.
- Favoritos por cuenta, con sincronización con el backend.
- Consulta del catálogo almacenado localmente cuando no hay conexión.
- Descarga del catálogo por páginas desde la API y presentación como listado continuo.

### Mapa turístico

- Marcadores de lugares turísticos con filtros por categoría y por favoritos.
- Ubicación actual, cálculo de distancia y consulta de lugares próximos.
- Acceso a indicaciones para llegar a un destino.
- Orientación mediante sensores del dispositivo.
- Avisos locales de cercanía configurables por el usuario (100, 250 o 500 metros), con control para evitar avisos repetidos. **El monitoreo de cercanía implementado se realiza con la aplicación activa**; no es geofencing permanente en segundo plano.

### Agenda, notificaciones y audioguías

- Consulta de eventos y detalle de fecha, hora, estado y duración cuando los datos están disponibles.
- Guardado de eventos por usuario.
- Recordatorios locales para eventos próximos.
- Registro del dispositivo para recibir notificaciones push de cambios de eventos.
- Reproducción de audioguías, pausa, avance y descargas para escucharlas sin conexión.
- Reproducción de audio en segundo plano en los dispositivos y compilaciones compatibles.

### Mi recorrido

- Registro manual de visitas, con notas.
- Registro de visitas al escanear códigos QR turísticos.
- Registro por proximidad GPS cuando se cumplen las condiciones de distancia.
- Asociación de una fotografía tomada con la cámara o seleccionada de la galería.
- Historial de visitas separado por usuario.
- Guardado de visitas sin conexión y sincronización posterior con la API, incluidas sus fotografías.
- Confirmación háptica al registrar visitas, en dispositivos compatibles.

### Cuenta y seguridad

- Registro e ingreso de usuarios mediante la API.
- Almacenamiento protegido del token mediante `expo-secure-store`.
- Sesión persistente y opción de bloqueo/desbloqueo biométrico.
- Acceso a información privada según el usuario autenticado.

## 4. Tecnologías

| Tecnología                                             | Uso en el proyecto                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| **Expo SDK 57 / React Native**                         | Desarrollo de la aplicación móvil.                               |
| **TypeScript**                                         | Tipos, servicios, pantallas y lógica de aplicación.              |
| **Expo Router**                                        | Navegación basada en archivos, bajo `src/app/`.                  |
| **Axios**                                              | Consumo de endpoints JSON de la API REST.                        |
| **expo-sqlite**                                        | Persistencia estructurada del catálogo y de las visitas locales. |
| **expo-sqlite/kv-store**                               | Preferencias y otros valores locales sencillos.                  |
| **expo-secure-store / expo-local-authentication**      | Token de sesión y autenticación biométrica.                      |
| **expo-network**                                       | Detección de conectividad y sincronización.                      |
| **react-native-maps / expo-location / expo-sensors**   | Mapas, GPS y orientación.                                        |
| **expo-camera / expo-image-picker / expo-file-system** | Escaneo QR, captura/selección y almacenamiento de fotografías.   |
| **expo-audio**                                         | Reproducción y descarga de audioguías.                           |
| **expo-notifications**                                 | Recordatorios locales y notificaciones push.                     |
| **expo-haptics**                                       | Respuesta táctil de confirmación.                                |
| **EAS Build**                                          | Compilaciones de desarrollo y distribución, cuando se necesitan. |

Para subir archivos de imagen, el servicio utiliza también `File`, `FormData` y `expo/fetch`. El resto de las solicitudes JSON se centraliza a través de Axios.

## 5. Requisitos para ejecutar el proyecto

- **Node.js y npm** instalados (se recomienda usar una versión LTS compatible con Expo SDK 57).
- **Git**, para clonar el repositorio.
- Un teléfono Android con una **development build** compatible instalada, o un emulador Android correctamente configurado.
- Acceso a la API REST para las funciones que requieren conexión.
- Para generar builds nativas: cuenta de Expo/EAS y las configuraciones de Android correspondientes.

> La implementación y las pruebas principales se realizaron en **Android**. Aunque Expo también contempla iOS, eso no equivale a afirmar que todas las funciones hayan sido validadas en un dispositivo iOS.

## 6. Instalación y configuración

### 6.1. Clonar el repositorio

```bash
git clone https://github.com/AtilioModenutti/mi-ciudad-grupo40.git
cd mi-ciudad-grupo40
```

> Si el repositorio es privado, hace falta tener acceso autorizado en GitHub.

### 6.2. Instalar dependencias

```bash
npm ci
```

Se utiliza **npm** y el archivo `package-lock.json` incluido en el repositorio. `npm ci` instala las versiones fijadas por el proyecto.

### 6.3. Crear el archivo de entorno

Copiar **`.env.example`** como **`.env`** en la raíz del proyecto y completar las variables correspondientes:

```dotenv
EXPO_PUBLIC_API_URL=https://api-miciudad.lansdev.com.ar
GOOGLE_MAPS_API_KEY=TU_CLAVE_AUTORIZADA
```

- **`EXPO_PUBLIC_API_URL`**: URL base de la API REST, sin `/` al final. La dirección indicada es la instancia de desarrollo utilizada durante el proyecto; debe estar disponible para utilizarla.
- **`GOOGLE_MAPS_API_KEY`**: clave habilitada y restringida apropiadamente para Google Maps en las compilaciones Android que lo requieran. `app.config.ts` la emplea durante la configuración nativa.

**Importante sobre seguridad:** no subir `.env`, tokens, certificados privados ni claves secretas al repositorio. Las variables con prefijo `EXPO_PUBLIC_` son accesibles desde el código de la aplicación; **nunca** colocar secretos en ellas. La clave de Maps debe restringirse en Google Cloud según el uso autorizado.

El proyecto configura también Firebase/FCM para las notificaciones push de Android mediante `google-services.json` y el perfil nativo correspondiente. Si se reproduce el proyecto en otro entorno, se deben utilizar los recursos de Firebase y EAS autorizados para esa aplicación. Para compilaciones en la nube, configurar las variables necesarias en el entorno de EAS; un `.env` local no garantiza que estén disponibles en el servidor de compilación.

### 6.4. Ejecutar la aplicación durante el desarrollo

```bash
npx expo start --clear
```

Abrir la **development build** instalada en el teléfono y conectarla al servidor Metro mediante el QR o la dirección que muestra la terminal. En el emulador Android, puede utilizarse la opción `a` del terminal si está correctamente configurado.

Si la red local impide la conexión, puede probarse:

```bash
npx expo start --tunnel
```

El modo túnel puede requerir instalar o configurar `@expo/ngrok`.

> **Expo Go no equivale a la development build del proyecto.** La aplicación usa varios módulos y configuraciones nativas; para reproducir todas las funciones, especialmente mapas, notificaciones push, galería y respuesta háptica, utilizar una compilación nativa compatible.

### 6.5. Verificaciones técnicas

```bash
npx tsc --noEmit
npx expo install --check
npx expo-doctor
```

Los primeros dos comandos comprueban tipos TypeScript y compatibilidad de dependencias. `expo-doctor` puede aportar diagnósticos adicionales del entorno y la configuración.

## 7. Compilaciones con EAS (opcional para desarrollo)

El proyecto dispone de perfiles `development`, `preview` y `production` en `eas.json`.

Para crear una **development build** Android:

```bash
npx eas-cli build --platform android --profile development
```

Para generar una compilación interna que pueda ejecutarse sin Metro:

```bash
npx eas-cli build --platform android --profile preview
```

La build debe contar con las variables de entorno, la configuración de Maps y los recursos de notificaciones necesarios. **Agregar una dependencia nativa nueva requiere volver a compilar e instalar una build compatible**; cambiar TypeScript o estilos generalmente no lo requiere mientras se desarrolla con Metro.

## 8. Estructura del proyecto

```text
mi-ciudad-grupo40/
├── assets/
│   ├── branding/             # Identidad visual Mi Colón
│   └── images/               # Ícono, splash y recursos gráficos
├── src/
│   ├── app/                  # Pantallas y rutas de Expo Router
│   │   ├── index.tsx          # Inicio, catálogo, filtros y accesos
│   │   ├── mapa.tsx
│   │   ├── agenda.tsx
│   │   ├── audioguias.tsx
│   │   ├── visitas.tsx
│   │   ├── escanear.tsx
│   │   ├── foto-visita.tsx
│   │   ├── visita-manual.tsx
│   │   ├── visita-proximidad.tsx
│   │   ├── ingresar.tsx
│   │   ├── registrarse.tsx
│   │   ├── lugar/[id].tsx
│   │   └── evento/[id].tsx
│   ├── components/           # Componentes reutilizables
│   ├── contextos/            # Sesión, favoritos y avisos de proximidad
│   ├── servicios/            # API, caché, visitas, notificaciones, etc.
│   ├── tipos/                # Tipos e interfaces de TypeScript
│   └── lib/                  # Funciones auxiliares
├── app.json                  # Configuración de Expo e identidad
├── app.config.ts             # Configuración dinámica nativa
├── eas.json                  # Perfiles de compilación
├── package.json
└── README.md
```

La navegación se configura en `src/app/_layout.tsx`. Las llamadas a los endpoints JSON se centralizan en `src/servicios/api.ts` y se reutilizan desde servicios especializados.

## 9. API REST y sincronización

**API de desarrollo:** `https://api-miciudad.lansdev.com.ar`

**Documentación interactiva (Swagger):** `https://api-miciudad.lansdev.com.ar/docs`

La API es un servicio independiente de la aplicación móvil. Este repositorio contiene el **cliente Expo/React Native**, no el código del backend.

Principales grupos de endpoints utilizados:

| Recurso       | Operaciones representativas                                                        |
| ------------- | ---------------------------------------------------------------------------------- |
| Autenticación | `POST /auth/registro`, `POST /auth/ingreso`, `GET /yo`                             |
| Catálogo      | `GET /categorias`, `GET /lugares`, `GET /lugares/:id`, consulta por QR             |
| Favoritos     | `GET /yo/favoritos`, `PUT /yo/favoritos/:lugarId`, `DELETE /yo/favoritos/:lugarId` |
| Agenda        | Consulta de eventos y sus detalles; guardados del usuario                          |
| Visitas       | `GET /yo/visitas`, creación/actualización y subida de fotografías                  |
| Dispositivos  | Registro, baja y pruebas de notificaciones push                                    |

La API utiliza un token de sesión **Bearer** para los endpoints privados. La aplicación guarda el token en `SecureStore` y separa los datos locales según la cuenta.

**Funcionamiento sin conexión:** el catálogo se guarda en SQLite; las visitas locales también se conservan en SQLite y se sincronizan cuando vuelve la conectividad. Los favoritos y las preferencias cuentan con almacenamiento local específico. Algunas acciones siguen necesitando acceso a la API, como validar o renovar información de sesión y obtener cambios recientes.

## 10. Permisos y capacidades del dispositivo

La aplicación solicita permisos cuando necesita acceder a funciones específicas:

- **Ubicación:** mapa, cercanía y registro por proximidad.
- **Cámara:** escaneo de códigos QR y captura de fotografías.
- **Galería:** selección de una fotografía existente.
- **Notificaciones:** recordatorios locales, cambios de eventos y avisos de cercanía.
- **Biometría:** desbloqueo de sesión cuando el usuario habilita esa opción.

Rechazar un permiso no debe impedir el uso de las secciones que no dependen de él. La disponibilidad de algunas capacidades depende del hardware y de la versión de Android.

## 11. Recorrido sugerido para la demostración

1. Ingresar con una cuenta de prueba y mostrar el catálogo, búsqueda y categorías.
2. Marcar un favorito y comprobarlo en Inicio y en el mapa.
3. Mostrar ubicación, indicaciones y orientación del mapa.
4. Consultar un evento, guardarlo y explicar recordatorios/notificaciones.
5. Reproducir una audioguía y mostrar la descarga offline.
6. Registrar una visita manual, por QR o por GPS.
7. Agregar una fotografía, desconectar el dispositivo y mostrar una visita pendiente.
8. Recuperar la conexión y comprobar la sincronización con la API mediante Swagger.
9. Mostrar sesión persistente, almacenamiento seguro y desbloqueo biométrico.

Para la defensa, cada integrante debe poder explicar el flujo de su módulo y la diferencia entre la información guardada localmente y la obtenida desde la API.

## 12. Verificaciones realizadas y límites conocidos

Durante la integración se probaron en Android las funciones principales: ingreso/registro, favoritos, mapa, visitas manuales y por QR/GPS, fotografías, sincronización offline, audioguías, recordatorios locales, push, avisos por proximidad, orientación, respuesta háptica e identidad visual de la app.

Alcance y consideraciones:

- Las **notificaciones de proximidad** implementadas se monitorean con la app activa; no se presenta como monitoreo permanente con la app cerrada.
- La galería, las notificaciones push y otras capacidades nativas requieren una build compatible con las dependencias instaladas.
- Los horarios turísticos se presentan según los datos que proporciona la API; el backend es responsable de mantenerlos actualizados cuando cambian por temporada.
- No se incluye un panel administrativo ni funciones de reservas, pagos o valoraciones.
- No se publican contraseñas, tokens ni cuentas personales en este README.

## 13. Proyecto y documentación

- **Repositorio:** [AtilioModenutti/mi-ciudad-grupo40](https://github.com/AtilioModenutti/mi-ciudad-grupo40)
- **Materia:** Desarrollo para Móviles — UNER, 2026.
- **Equipo:** Grupo 40.
- **Referencia funcional:** PRD «Mi Ciudad — Guía Turística de Colón» y consigna del Trabajo Final Integrador proporcionados por la cátedra.
- **Identidad de la aplicación:** **Mi Colón**.

---

<div align="center">
  <strong>Mi Colón</strong><br />
  Una guía para conocer, recorrer y disfrutar Colón, Entre Ríos.<br />
  <small>Trabajo Final Integrador — Grupo 40 — UNER, 2026</small>
</div>
