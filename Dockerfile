FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

USER node
ENTRYPOINT ["node", "src/cli.js"]
CMD ["doctor"]
