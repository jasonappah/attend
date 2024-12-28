# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.12.0
FROM node:${NODE_VERSION}-alpine AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ARG YARN_VERSION=1.22.21
RUN npm install -g yarn@$YARN_VERSION --force


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install node modules
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# # I don't understand why this fixes stuff. But it does.
# # @tamagui/vite-plugin is already specified as a DIRECT DEV DEPENDENCY
# # but it's not being installed in the container when we run yarn???
# # So we add it here. smhhhh
# RUN yarn add -D @tamagui/vite-plugin


# Copy application code
COPY app app
COPY src src
COPY public public
COPY app.json drizzle.config.ts tsconfig.json vite.config.ts routes.d.ts ./

RUN --mount=type=secret,id=BUILD_DOTENV_B64 base64 -d /run/secrets/BUILD_DOTENV_B64 >> /tmp/.env && DOTENV_CONFIG_PATH=/tmp/.env yarn build:web && rm /tmp/.env


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "yarn", "serve" ]
