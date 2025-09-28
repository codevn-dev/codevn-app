# CodeVN - Makefile

.PHONY: help install dev build start lint clean db-setup db-push db-studio db-generate docker-up docker-down

# Default target
help: ## Show this help message
	@echo "CodeVN - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
install: ## Install dependencies
	pnpm install

dev-web:
	pnpm dev:web

dev-api:
	pnpm dev:api

dev-worker:
	pnpm dev:worker

dev:
	pnpm dev

build: ## Build for production
	pnpm build

start: ## Start production server
	pnpm start

lint: ## Run ESLint
	pnpm lint

type-check: ## Run TypeScript compiler
	pnpm type:check

format: ## Format code
	pnpm format

format-check: ## Check code formatting
	pnpm format:check

# Database commands
db-setup: ## Set up database with Docker Compose
	docker-compose up -d postgres
	@echo "Waiting for database to be ready..."
	@sleep 5
	pnpm db:push

db-push: ## Push database schema changes
	pnpm db:push

db-studio: ## Open Drizzle Studio
	pnpm db:studio

db-generate: ## Generate database migrations
	pnpm db:generate

# Docker commands
docker-up: ## Start all services with Docker Compose
	docker-compose up -d --build

docker-down: ## Stop all Docker services
	docker-compose down -v

docker-logs: ## View Docker logs
	docker-compose logs -f

# Cleanup commands
clean: ## Clean node_modules and build files
	rm -rf node_modules
	rm -rf .next
	rm -rf dist
	pnpm install

clean-docker: ## Clean Docker containers and volumes
	docker-compose down -v
	docker system prune -f

# Full setup
setup: install db-setup ## Complete project setup
	@echo "Setup complete! Run 'make dev' to start development server."

# Production deployment
deploy: build ## Build and prepare for deployment
	@echo "Build complete. Ready for deployment."

# Database reset
db-reset: docker-down docker-up db-push ## Reset database completely
	@echo "Database reset complete."

# Health check
health: ## Check if all services are running
	@echo "Checking services..."
	@docker-compose ps
	@echo "Checking database connection..."
	@pnpm db:push --dry-run

# Quick start for new developers
quick-start: install docker-up
	@echo "Waiting for database..."
	@sleep 10
	pnpm db:push
	@echo "Starting development server..."
	pnpm dev
