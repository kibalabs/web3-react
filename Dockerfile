FROM node:18.2.0 as build

WORKDIR /app

# Install dependecies
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci

COPY . .

RUN make build
