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
  │     ├── Dockerfile       # Instrucciones de compilación del contenedor Docker
  │     ├── db.js            # Módulo de conexión a PostgreSQL
  │     ├── init-db.js       # Script para crear la tabla y cargar datos semilla
  │     ├── server.js        # Servidor Express y endpoints API
  │     └── package.json     # Dependencias del Backend
  │
  ├── frontend/              # Interfaz de Usuario estática
  │     ├── index.html       # Estructura del Panel de Control
  │     ├── style.css        # Estilos visuales con Glassmorphism y animaciones
  │     ├── config.js        # Configuración de variables (URL de la API)
  │     └── app.js           # Controlador y llamadas Fetch a la API
  │
  └── terraform/             # Infraestructura como Código (AWS Cloud)
        ├── variables.tf     # Variables de entrada y credenciales sensibles
        ├── main.tf          # Configuración de red (VPC, Subredes, NAT)
        ├── services.tf      # Servicios de AWS (RDS, S3, CloudFront, ECR, App Runner)
        └── outputs.tf       # Direcciones de salida (URLs públicas)
```

---

## Guía 1: Despliegue en la Nube (AWS con Terraform)

Esta es la opción principal para desplegar todo en producción en AWS utilizando Terraform.

### Requisitos Previos en tu Computadora

1. Tener instalado [Terraform](https://developer.hashicorp.com/terraform/downloads).
2. Tener instalado [AWS CLI](https://aws.amazon.com/cli/) y configurado con tus credenciales (`aws configure`).
3. Tener instalado y corriendo [Docker Desktop](https://www.docker.com/products/docker-desktop/).

---

### Paso A: Levantar el Repositorio ECR de AWS

Dado que AWS App Runner requiere que la imagen Docker del backend ya esté en ECR para poder inicializarse, realizaremos un despliegue por objetivos de Terraform:

1. Entra a la carpeta de terraform:

   ```bash
   cd terraform
   ```

2. Inicializa Terraform:

   ```bash
   terraform init
   ```

3. Crea únicamente el repositorio ECR:

   ```bash
   terraform apply -target=aws_ecr_repository.backend
   ```

   _Escribe `yes` para confirmar._ Toma nota del link de salida de `ecr_repository_url` (ej: `123456789012.dkr.ecr.us-east-1.amazonaws.com/ordinario-nt-backend`).

---

### Paso B: Compilar y Subir la Imagen Docker del Backend a ECR

1. Abre tu terminal e inicia sesión en Docker para AWS ECR (Reemplaza `<TU_ACCOUNT_ID>` con tu ID de cuenta de AWS y usa tu región correspondiente):

   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <TU_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
   ```

2. Entra a la carpeta `backend` en tu terminal:

   ```bash
   cd ../backend
   ```

3. Compila la imagen Docker del backend:

   ```bash
   docker build -t ordinario-nt-backend .
   ```

4. Etiqueta la imagen para subirla a tu repositorio de AWS ECR (Reemplaza `<ECR_REPOSITORY_URL>` con la URL obtenida en el Paso A):

   ```bash
   docker tag ordinario-nt-backend:latest <ECR_REPOSITORY_URL>:latest
   ```

5. Sube la imagen a la nube de AWS:

   ```bash
   docker push <ECR_REPOSITORY_URL>:latest
   ```

---

### Paso C: Desplegar el resto de la Infraestructura en AWS

1. Regresa a la carpeta `terraform`:

   ```bash
   cd ../terraform
   ```

2. Lanza el despliegue completo de la VPC, RDS, S3, CloudFront y App Runner. Terraform te solicitará ingresar la contraseña que deseas asignar al administrador de PostgreSQL:

   ```bash
   terraform apply
   ```

   _Ingresa tu contraseña cuando lo pida (mínimo 8 caracteres) y confirma escribiendo `yes`._

Cuando termine el proceso (toma unos 5-8 minutos para crear el RDS y CloudFront), Terraform te mostrará las URLs de salida:

- `backend_url`: URL pública de tu API del Backend.
- `frontend_url`: URL pública de tu sitio web (CloudFront).
- `ecr_repository_url`: URL de tu repositorio ECR.
- `database_endpoint`: Endpoint privado de tu RDS.

---

### Paso D: Vincular y Cargar el Frontend

1. Abre el archivo [frontend/config.js](file:///c:/dev/TAREAS/NuevasTecnologias/frontend/config.js) y actualiza la URL para apuntar a tu backend en la nube (usa la URL del output `backend_url`):

   ```javascript
   const CONFIG = {
     API_BASE_URL: "https://xxxxxx.us-east-1.awsapprunner.com/api", // URL de tu App Runner + /api
   };
   export default CONFIG;
   ```

2. Sube los archivos estáticos de tu frontend al bucket S3 que creó Terraform (Reemplaza `<NOMBRE_DEL_BUCKET>` con el nombre correspondiente creado, lo puedes ver en tu consola de AWS S3 o usar el nombre dinámico generado):

   ```bash
   # Desde la raíz del proyecto
   aws s3 cp ../frontend s3://ordinario-nt-frontend-<SUFIJO_RANDOM>/ --recursive
   ```

3. ¡Listo! Abre la URL del output `frontend_url` en tu navegador para ver tu sistema funcionando al 100% en AWS.

---

## Guía 2: Despliegue Local (Para Desarrollo y Pruebas Rápidas)

Si deseas probar el código en tu computadora localmente, sigue los pasos de configuración y ejecución que se detallan a continuación.

### Requisitos Previos Locales

- Node.js (v16+)
- PostgreSQL local instalado (o una base gratuita creada en [Neon.tech](https://neon.tech/))

### Pasos de Ejecución Local

1. **Configurar Variables de Entorno del Backend:**
   Copia el archivo `.env.example` a `.env` en la carpeta `backend` y añade tus credenciales de PostgreSQL.
2. **Instalar Dependencias:**

   ```bash
   cd backend
   npm install
   ```

3. **Inicializar la base de datos local:**

   ```bash
   npm run init-db
   ```

4. **Levantar el Backend:**

   ```bash
   npm run dev
   ```

5. **Servir el Frontend:**

   ```bash
   npx serve -l 3000 frontend
   ```

6. Abre `http://localhost:3000` en tu navegador.
