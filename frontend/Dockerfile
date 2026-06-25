FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install packages with peer-deps bypass
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
