# Ordinario: Nuevas Tecnologías - Arquitectura de 3 Capas

Este proyecto escolar implementa una arquitectura limpia y moderna de 3 capas:
1. **Frontend (Capa de Presentación):** Diseñado con HTML5, CSS3 Vanilla (estilos premium con soporte de modo oscuro y variables HSL) y JavaScript moderno (ES6 modules).
2. **Backend (Capa de Lógica de Negocio):** API Rest construida en Node.js con Express, con CORS configurado y variables de entorno.
3. **Base de Datos (Capa de Datos):** Servidor PostgreSQL que almacena la información de los usuarios.

---

## Estructura del Proyecto

```text
/ordOpt
  ├── backend/               # Servidor de API y Conexión a Base de Datos
  │     ├── .env.example     # Plantilla de variables de entorno
  │     ├── db.js            # Módulo de conexión a PostgreSQL (Pool)
  │     ├── init-db.js       # Script para crear la tabla y cargar datos semilla
  │     ├── server.js        # Servidor Express y endpoints API
  │     └── package.json     # Dependencias del Backend
  │
  └── frontend/              # Interfaz de Usuario estática
        ├── index.html       # Estructura del Panel de Control
        ├── style.css        # Estilos visuales con Glassmorphism y animaciones
        ├── config.js        # Configuración de variables (URL de la API)
        └── app.js           # Controlador y llamadas Fetch a la API
```

---

## Requisitos Previos

Asegúrate de tener instalado en tu sistema:
- [Node.js](https://nodejs.org/) (versión 16 o superior recomendada)
- Un servidor de base de datos **PostgreSQL** activo, ya sea:
  - **Local:** Instalado directamente en tu computadora.
  - **En la nube (Recomendado para pruebas rápidas):** Una base de datos gratuita creada en menos de 2 minutos en [Neon.tech](https://neon.tech/) o [Supabase](https://supabase.com/).

---

## Guía de Instalación y Configuración

### 1. Configuración de la Base de Datos

#### Opción A: Base de datos local (PostgreSQL)
1. Abre tu terminal de base de datos (ej. `psql` o PGAdmin) y crea una nueva base de datos vacía:
   ```sql
   CREATE DATABASE ordinario_db;
   ```

#### Opción B: Base de datos en la nube (Neon.tech - Rápido)
1. Ve a [Neon.tech](https://neon.tech/) y regístrate para obtener una base de datos gratuita.
2. Copia la cadena de conexión (Connection String) que te provee el sitio (inicia con `postgres://...`).

---

### 2. Configurar el Backend

1. Entra al directorio `backend`:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea tu archivo de configuración de variables de entorno duplicando la plantilla:
   - En Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
   - En macOS/Linux:
     ```bash
     cp .env.example .env
     ```
4. Abre el archivo `.env` creado y edita las credenciales:

   *Si usas la Opción A (DB Local):*
   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:3000 # O la URL donde levantarás tu frontend

   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=tu_usuario_postgres
   DB_PASSWORD=tu_contraseña
   DB_DATABASE=ordinario_db
   ```

   *Si usas la Opción B (DB en la nube):*
   Reemplaza todas las variables de DB por una sola llamada `DATABASE_URL`:
   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:3000

   DATABASE_URL=postgres://tu_usuario:tu_password@host-de-neon/neondb
   ```

---

### 3. Inicializar la Base de Datos

Para crear automáticamente la tabla `usuarios` e insertar los 3 registros semilla de prueba, ejecuta el script de inicialización desde la carpeta `backend`:
```bash
npm run init-db
```
Deberías ver un mensaje confirmando que la conexión fue exitosa, la tabla `usuarios` fue creada y los registros fueron insertados.

---

### 4. Levantar el Servidor Backend

Inicia el servidor en modo de desarrollo (con autorecarga en caso de cambios en el código):
```bash
npm run dev
```
El backend estará escuchando en `http://localhost:5000`.

---

### 5. Levantar el Frontend

Como el frontend utiliza HTML5, CSS y JS nativo en formato de módulos, para evitar errores de CORS en el navegador se recomienda servir los archivos usando un servidor web estático local en lugar de dar doble clic al archivo HTML.

#### Opción 1: Usando `serve` de npm (Recomendado)
Desde la raíz del proyecto o desde la carpeta `frontend`, ejecuta:
```bash
npx serve -l 3000 frontend
```
Esto levantará el frontend en la dirección `http://localhost:3000`.

#### Opción 2: Extensión Live Server de VS Code
Si utilizas Visual Studio Code:
1. Instala la extensión **Live Server**.
2. Abre la carpeta del proyecto en VS Code.
3. Haz clic derecho sobre `frontend/index.html` y selecciona **Open with Live Server**.
4. Modifica la variable `FRONTEND_URL` en tu archivo `.env` del backend para que coincida con el puerto asignado por Live Server (generalmente `http://127.0.0.1:5500` o `http://localhost:5500`).

---

## Verificación de Funcionamiento

Una vez que ambas capas estén activas:
1. **Verificación de API:** Abre `http://localhost:5000/api/users` en tu navegador. Deberías ver la respuesta JSON estructurada con la información de los usuarios.
2. **Health Check:** Abre `http://localhost:5000/api/health` para comprobar el estado interno de la API y su conectividad directa con PostgreSQL.
3. **Verificación del Frontend:** Abre `http://localhost:3000` (o el puerto correspondiente). Deberías ver:
   - El panel de control con un diseño premium y animado.
   - Dos badges indicadores en la barra superior en color verde brillante (`Backend: En línea` y `Base de Datos: Conectado`).
   - La tabla con los 3 usuarios semilla.
   - La funcionalidad para alternar la vista entre tabla estructurada y tarjetas (grid).
   - El buscador interactivo que filtra a los usuarios en tiempo real.
