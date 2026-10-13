# 📚 Catálogo y Estructura de Librerías - PlastControl

Este documento detalla el inventario tecnológico completo de **librerías, dependencias y herramientas de desarrollo** utilizadas en cada módulo de **PlastControl**, explicando el propósito técnico y el caso de uso específico dentro del sistema industrial.

---

## 📌 Tabla de Contenidos
1. [Backend — API REST (NestJS & Prisma)](#1-backend--api-rest-nestjs--prisma)
2. [Frontend Web — Dashboard Administrativo (React 19 & Vite)](#2-frontend-web--dashboard-administrativo-react-19--vite)
3. [Mobile App — Almacén y Báscula (React Native & Expo SDK 51)](#3-mobile-app--almacén-y-báscula-react-native--expo-sdk-51)
4. [Matriz de Decisiones Técnicas y Criterios de Selección](#4-matriz-de-decisiones-técnicas-y-criterios-de-selección)

---

## 1. Backend — API REST (NestJS & Prisma)

Ubicación: `/backend/package.json`

### 🔹 Dependencias Principales (Runtime)

| Librería | Versión | Categoría | Propósito y Caso de Uso en PlastControl |
| :--- | :--- | :--- | :--- |
| **`@nestjs/core`** | `^10.0.0` | Framework Core | Núcleo del servidor NestJS, inyección de dependencias y orquestación del ciclo de vida de la aplicación. |
| **`@nestjs/common`** | `^10.0.0` | Framework Core | Decoradores HTTP (`@Get`, `@Post`), pipes, interceptores y filtros de excepciones para manejo uniforme de errores. |
| **`@nestjs/platform-express`** | `^10.0.0` | Servidor HTTP | Adaptador de Express para el procesamiento y enrutamiento rápido de peticiones HTTP. |
| **`@nestjs/config`** | `^3.2.0` | Configuración | Carga y tipado de variables de entorno desde el archivo `.env` (puertos, credenciales de BD, JWT secrets). |
| **`@nestjs/swagger`** | `^7.3.0` | Documentación API | Generación automática de especificación OpenAPI e interfaz interactiva para pruebas de endpoints en `/api/docs`. |
| **`@prisma/client`** | `^5.12.0` | ORM / Persistencia | Cliente de base de datos fuertemente tipado que traduce operaciones de TypeScript a SQL en PostgreSQL con soporte transaccional ACID (`$transaction`). |
| **`@nestjs/jwt`** | `^10.2.0` | Autenticación | Creación, firma y verificación criptográfica de tokens JSON Web Tokens (JWT) para sesiones de usuarios. |
| **`passport`** | `^0.7.0` | Seguridad | Middleware de autenticación estándar de la industria Node.js. |
| **`@nestjs/passport`** | `^10.0.3` | Seguridad | Integración modular de Passport dentro del ecosistema de inyección de dependencias de NestJS. |
| **`passport-jwt`** | `^4.0.1` | Seguridad | Estrategia de Passport para extraer y validar el Bearer Token en el encabezado `Authorization`. |
| **`bcrypt`** | `^5.1.1` | Criptografía | Algoritmo de hashing adaptativo unidireccional con salt para almacenar de forma segura las contraseñas de los usuarios. |
| **`class-validator`** | `^0.14.1` | Validación de Datos | Decoradores declarativos (`@IsString`, `@IsPositive`, `@IsNotEmpty`) en DTOs para impedir el ingreso de datos corruptos al backend. |
| **`class-transformer`** | `^0.5.1` | Serialización | Conversión de payloads JSON planos en instancias de clases DTO tipadas con métodos y validaciones activas. |
| **`@nestjs/schedule`** | `^4.0.0` | Tareas Programadas | Ejecución de Cron Jobs automáticos para auditar periódicamente los niveles de tolvas/silos y emitir alertas de stock mínimo. |
| **`exceljs`** | `^4.4.0` | Reportes | Motor para construir y dar formato a hojas de cálculo Excel (`.xlsx`) con balance de masa, stock de resinas y kardex de movimientos. |
| **`pdfkit`** | `^0.15.0` | Reportes | Motor para generar documentos PDF vectoriales descargables con certificados de pesaje y reportes de merma por turno. |
| **`rxjs`** | `^7.8.1` | Programación Reactiva | Manejo de flujos de datos asíncronos y observables requerido internamente por NestJS. |
| **`reflect-metadata`** | `^0.2.0` | Metaprogramación | Soporte de tiempo de ejecución para la reflexión de tipos y metadatos de decoradores de TypeScript. |

### 🔸 Dependencias de Desarrollo (DevDependencies)

| Librería | Versión | Propósito |
| :--- | :--- | :--- |
| **`prisma`** | `^5.12.0` | CLI de Prisma para ejecutar migraciones (`prisma migrate dev`), generar el cliente y visualizar datos (`prisma studio`). |
| **`typescript`** | `^5.1.3` | Compilador de TypeScript que garantiza tipado estricto en todo el código de backend. |
| **`@nestjs/cli`** | `^10.0.0` | Herramienta de línea de comandos para compilar (`nest build`) y crear recursos en NestJS. |
| **`jest`** | `^30.4.2` | Framework de pruebas automatizadas para test unitarios y de integración de controladores y servicios. |
| **`ts-jest`** | `^29.4.12` | Transformador de TypeScript para ejecutar pruebas en Jest sin pre-compilación manual. |
| **`ts-node`** | `^10.9.1` | Ejecutor de archivos TypeScript directamente en Node.js (usado para el script de seed). |

---

## 2. Frontend Web — Dashboard Administrativo (React 19 & Vite)

Ubicación: `/frontend-web/package.json`

### 🔹 Dependencias Principales (Runtime)

| Librería | Versión | Categoría | Propósito y Caso de Uso en PlastControl |
| :--- | :--- | :--- | :--- |
| **`react`** | `^19.2.8` | UI Library Core | Biblioteca de renderizado declarativo basada en componentes funcionales y hooks para gestionar el estado del panel administrativo. |
| **`react-dom`** | `^19.2.8` | UI Library Core | Adaptador de React para manipular el DOM del navegador web de manera eficiente mediante Virtual DOM. |
| **`lucide-react`** | `^1.32.0` | Iconografía | Conjunto de iconos vectoriales limpios y modernos para indicar estados de silos (alerta, óptimo, bajo), líneas de extrusión y báscula. |
| **`clsx`** | `^2.1.1` | Utilidad UI | Construcción dinámica de clases CSS condicionales (ej. cambiar el color de una tarjeta si el stock es crítico). |
| **`tailwind-merge`** | `^3.6.0` | Utilidad UI | Resolución inteligente de conflictos en clases de TailwindCSS, garantizando que los estilos sobreescritos prevalezcan sin colisiones. |

### 🔸 Dependencias de Desarrollo (DevDependencies)

| Librería | Versión | Propósito |
| :--- | :--- | :--- |
| **`vite`** | `^6.2.0` | Empaquetador ultrarrápido y servidor de desarrollo con Hot Module Replacement (HMR) basado en módulos ES nativos. |
| **`@vitejs/plugin-react`** | `^4.3.4` | Plugin oficial para habilitar soporte completo de React con Fast Refresh en Vite. |
| **`tailwindcss`** | `^3.4.17` | Framework CSS utilitario para implementar una interfaz industrial limpia, moderna y responsiva sin CSS custom desordenado. |
| **`postcss`** | `^8.4.38` | Herramienta para transformar el CSS con plugins de JavaScript. |
| **`autoprefixer`** | `^10.5.4` | Plugin de PostCSS que añade automáticamente prefijos de navegador (`-webkit-`, `-moz-`) a las reglas CSS para máxima compatibilidad. |
| **`oxlint`** | `^1.75.0` | Linter estático ultrarrápido escrito en Rust para detectar errores comunes y código muerto en milisegundos. |
| **`typescript`** | `~5.7.2` | Verificación de tipos estática en componentes, props y modelos de datos en el cliente web. |

---

## 3. Mobile App — Almacén y Báscula (React Native & Expo SDK 51)

Ubicación: `/mobile-app/package.json`

### 🔹 Dependencias Principales (Runtime)

| Librería | Versión | Categoría | Propósito y Caso de Uso en PlastControl |
| :--- | :--- | :--- | :--- |
| **`react-native`** | `0.74.1` | Mobile Framework | Framework que compila vistas declarativas de React a componentes nativos de Android e iOS. |
| **`expo`** | `~51.0.0` | Mobile Platform | Plataforma SDK que provee herramientas de compilación, acceso a APIs nativas y ejecución rápida con Expo Go sin necesidad de Android Studio/Xcode locales. |
| **`@react-native-async-storage/async-storage`** | `1.23.1` | Persistencia Local | Sistema de almacenamiento clave-valor asíncrono para guardar de manera segura el token JWT de sesión y las preferencias del operario. |
| **`axios`** | `^1.6.8` | Cliente HTTP | Cliente basado en promesas para interactuar con la API REST de NestJS, configurando interceptores para el token Bearer y manejo de caídas de red. |
| **`@react-navigation/native`** | `^6.1.9` | Navegación | Contenedor principal para la gestión del historial, transiciones y estado de rutas en la app móvil. |
| **`@react-navigation/bottom-tabs`** | `^6.5.20` | Navegación UI | Barra de pestañas inferior táctil para cambiar rápidamente entre Inventario, Entradas, Movimientos y Alertas. |
| **`@react-navigation/native-stack`** | `^6.9.17` | Navegación Nativa | Navegación de pila nativa optimizada que utiliza las primitivas de transición de pantalla nativas de Android e iOS. |
| **`lucide-react-native`** | `^0.370.0` | Iconografía Móvil | Versión nativa de la familia de iconos Lucide optimizada para interfaces táctiles de uso rudo en almacén. |
| **`react-native-safe-area-context`** | `4.10.1` | Adaptabilidad UI | Manejo automático y flexible de muescas (notches), barras de estado y barras de gestos de los dispositivos móviles modernos. |
| **`react-native-screens`** | `3.31.1` | Rendimiento Nativo | Asigna vistas nativas (`UIViewController` en iOS, `Fragment` en Android) para cada pantalla, liberando memoria RAM de pantallas no visibles. |
| **`react-native-web`** | `~0.19.10` | Multiplataforma | Permite compilar y previsualizar los componentes de la app móvil directamente en un navegador web. |
| **`expo-status-bar`** | `~1.12.1` | Experiencia Móvil | Control dinámico del estilo y color de la barra de estado según el tema visual de la pantalla. |
| **`@expo/metro-runtime`** | `~3.2.3` | Dev Tooling | Runtime para recarga rápida en caliente (Fast Refresh) en emuladores y dispositivos físicos. |

---

## 4. Matriz de Decisiones Técnicas y Criterios de Selección

A continuación se fundamenta la razón de por qué se eligieron estas librerías frente a alternativas populares:

### 1. ¿Por qué Prisma ORM en lugar de TypeORM o Mongoose?
* **Decisión:** Prisma ofrece generación automática de tipos TypeScript a partir del esquema (`schema.prisma`). Si se renombra un campo o cambia un tipo en la base de datos, TypeScript genera un error en tiempo de compilación en el backend, eliminando errores en tiempo de ejecución.
* **Integridad Transaccional:** La API `prisma.$transaction([...])` es esencial para el negocio del plástico, pues garantiza que el registro de una entrada en báscula y el incremento del stock del silo ocurran de forma atómica.

### 2. ¿Por qué ExcelJS y PDFKit para Reportes?
* **Decisión:** Los jefes de planta y supervisores de calidad requieren auditoría física. `exceljs` permite generar hojas de cálculo nativas con fórmulas y formatos de celda para auditorías de inventario, mientras que `pdfkit` permite componer documentos con logotipos, tablas y firmas de recepción sin depender de un navegador headless pesado como Puppeteer.

### 3. ¿Por qué React Navigation Native-Stack en Mobile?
* **Decisión:** `react-navigation/native-stack` utiliza los componentes nativos de la plataforma (`UINavigationController` en iOS y `FragmentActivity` en Android), lo que proporciona animaciones fluidas a 60 FPS y un consumo de memoria mínimo en teléfonos gama baja y media de uso rudo en almacén.

### 4. ¿Por qué TailwindCSS + clsx + tailwind-merge en Web?
* **Decisión:** Evita la acumulación de archivos `.css` globales difíciles de mantener. `tailwind-merge` permite crear componentes reutilizables (como botones o badges de estado) donde las clases pasadas por `props` reemplazan limpiamente a los valores predeterminados sin crear conflictos de especificidad en CSS.
