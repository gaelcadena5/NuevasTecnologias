# Usar una imagen base ligera de Node.js
FROM node:18-alpine

# Definir el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo las dependencias de producción para optimizar el tamaño de la imagen
RUN npm ci --only=production

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto del servidor de Express (5000 por defecto)
EXPOSE 5000

# Comando para ejecutar la aplicación
CMD ["node", "server.js"]
