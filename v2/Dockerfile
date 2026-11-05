# Pointili on Google Cloud Run — the backup to Vercel (see CLOUDRUN.md). Vercel never reads this file.
#
# Built by Google Cloud Build from scripts/cloudrun.sh. The NEXT_PUBLIC_* values are baked into the
# browser's code at build time from .env.production, which the script writes from .env.cloudrun just
# before uploading (public values only; the secrets go to the running service, never into the image).

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_STANDALONE=1
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=8080
# owned by node: the server writes its page cache under .next at run time
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
