#!/bin/bash

# CodeVN Setup Script

echo "🚀 Setting up CodeVN..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start PostgreSQL with Docker Compose
echo "🐘 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Push database schema
echo "🗄️ Setting up database schema..."
pnpm db:push

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp env.example .env.local
    echo "✅ Created .env.local. Please update the values as needed."
fi

echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  pnpm dev"
echo ""
echo "To view the database, run:"
echo "  pnpm db:studio"
echo ""
echo "The application will be available at http://localhost:3000"
