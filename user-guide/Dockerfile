# Build stage
FROM python:3.9-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Build static site
RUN mkdocs build

# Serve stage
FROM nginx:alpine

# Copy built site to nginx serving directory
# We serve at /guide/ path, so we place content in a 'guide' subdirectory
# This ensures that Nginx finds the content when receiving requests with /guide/ prefix
COPY --from=builder /app/site /usr/share/nginx/html/guide

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
