# 📱 App Móvil — PlastControl (Almacén)

**Tecnología:** React Native (Expo) + TypeScript + Axios

Aplicación móvil enfocada al **personal de Almacén** para la gestión de materia prima
en la fábrica de plásticos.

---

## 🧑‍🔧 ¿Para quién es esta app?

La app está pensada para el rol **ALMACÉN**. Sus tareas son:

- ✅ Consultar inventario / stock de materia prima en silos.
- ✅ Registrar **entradas** de materia prima (báscula) con lote, proveedor y factura.
- ✅ Ver las **solicitudes** de producción y **aprobar/despachar** materiales
  (descontando del inventario).
- ✅ Consultar el **historial de movimientos** (entradas, salidas, consumo, merma).
- ✅ Ver **alertas** de stock bajo / crítico.

> Crear solicitudes de producción y registrar consumo/merma es tarea de los roles
> **PRODUCCIÓN** / **SUPERVISOR**, por lo que no están en esta app.

---

## 🔐 Credenciales de almacén (sembradas por el backend)

| Campo | Valor |
| :--- | :--- |
| Correo | `jorge.ramirez@plastcontrol.com` |
| Contraseña | `admin123` |
| Rol | `ALMACEN` |

Puedes ver/editar estos usuarios en
`backend/src/users/users.service.ts` (método `onModuleInit`).

---

## 🖥️ Pantallas

- **Inicio** — accesos rápidos según tareas de almacén.
- **Inventario** — consulta de stock con búsqueda, filtros y barra de estado.
- **Movimientos** — historial de entradas/salidas/consumo/merma con filtros.
- **Alertas** — stock bajo y crítico.
- **Registrar Entrada** — alta de lote/nueva entrega de materia prima.
- **Solicitudes y Despacho** — aprueba y despacha solicitudes de producción.
- **Mi Perfil** — datos de sesión y cierre de sesión.

---

## 🚀 Cómo Iniciar la App Móvil

1. **Instalar dependencias**:
   ```bash
   cd mobile-app
   npm install
   ```

2. **Configurar la URL del backend** en `src/services/api.ts`
   (constante `API_BASE_URL`):
   - Android emulador: `http://10.0.2.2:3000`
   - Dispositivo físico (Expo Go): tu IP local (ej: `http://192.168.1.10:3000`)
   - Web/Vercel: la URL pública del backend, o usa la variable de entorno
     `EXPO_PUBLIC_API_URL`.

3. **Iniciar Expo**:
   ```bash
   npx expo start
   ```
   Escanea el QR con **Expo Go** (Android/iOS).

---

## 🌐 Despliegue web en Vercel (URL pública)

1. Para la versión web se usa el comando:
   ```bash
   npm run build:web
   ```
   Genera la carpeta `dist/` con el bundle estático.

2. En **Vercel**:
   - Importa el directorio `mobile-app` como proyecto (ya trae `vercel.json`).
   - En **Settings → Environment Variables** agrega:
     - `EXPO_PUBLIC_API_URL` con la URL pública de tu backend
       (ej: `https://tu-backend.vercel.app` o el host donde corra NestJS).
   - Vercel ejecutará `npm install && npm run build:web` y publicará `dist/`.
   - Obtendrás una URL tipo `https://tu-app.vercel.app`.

> El backend (NestJS) debe estar desplegado y accesible públicamente para que la
> app web/ móvil funcione en línea (login, stock, entradas, etc.).

---

## 🧪 Verificación

- TypeScript: `npm run typecheck`
