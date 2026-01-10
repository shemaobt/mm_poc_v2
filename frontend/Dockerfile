# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Only copy package.json, not package-lock.json (avoids cross-platform native dependency issues)
COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build argument for VITE_API_URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
