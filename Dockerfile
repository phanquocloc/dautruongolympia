# Use official lightweight Node.js image
FROM node:20-alpine

WORKDIR /app

# Copy package definition
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose ports: 3001 is first so Render routes to detected port 3001
EXPOSE 3001
EXPOSE 3000
EXPOSE 10000

ENV NODE_ENV=production

# Start command
CMD ["node", "server.js"]
