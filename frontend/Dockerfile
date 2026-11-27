FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@10.33.0
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
