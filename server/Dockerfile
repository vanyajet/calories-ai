FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV PORT=8787
EXPOSE 8787
CMD ["node", "src/index.ts"]
