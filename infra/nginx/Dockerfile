# Build context is the REPO ROOT (see docker-compose.yml's `context: .`),
# not this directory -- that's what lets this Dockerfile COPY from
# ../frontend as a sibling path. Building the frontend HERE, inside the
# image build, rather than as a separate CI step producing an artifact to
# copy in, keeps the Docker build fully reproducible from source alone.

FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

EXPOSE 80
