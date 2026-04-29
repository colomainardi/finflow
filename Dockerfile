# Usamos una versión ligera de Node.js
FROM node:20-slim

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Compilamos TypeScript a JavaScript
RUN npm run build

# Exponemos el puerto que usa Cloud Run (8080 por defecto)
EXPOSE 8080

# Comando para arrancar la app
CMD ["npm", "start"]