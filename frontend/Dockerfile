# ---- build stage ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

# REACT_APP_BACKEND_URL is injected at build time via --build-arg
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

RUN npm run build

# ---- serve stage ----
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
