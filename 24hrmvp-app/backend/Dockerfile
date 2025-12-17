FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm install --legacy-peer-deps
COPY prisma ./prisma/
RUN ./node_modules/.bin/prisma generate
COPY . .
RUN npm run build

FROM node:22-alpine AS production
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["npm", "start"]
