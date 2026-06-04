FROM nginx:alpine

# Copiar todos los archivos estáticos al directorio público de Nginx
COPY . /usr/share/nginx/html

# Exponer el puerto por defecto de Nginx
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
