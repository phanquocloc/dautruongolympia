# Use official lightweight Node.js image
FROM node:20-alpine

WORKDIR /app

# Copy package definition
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port (Render/Railway sets PORT dynamically)
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start command
CMD ["node", "server.js"]
