FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# installMediaDownload loads the official watermark SVG from this runtime path.
COPY --from=build /app/src/assets ./src/assets

EXPOSE 8080
CMD ["node", "dist/server.cjs"]
