FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]