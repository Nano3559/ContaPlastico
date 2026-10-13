# Etapa 1: Build de la aplicación con Node.js
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependencias e instalar
COPY package*.json ./
RUN npm install

# Copiar código fuente y compilar bundle de producción
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx ultra ligero para producción
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
