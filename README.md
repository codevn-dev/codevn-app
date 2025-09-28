# CodeVN

A modern, full-featured forum application built with Next.js 15, TypeScript, and Tailwind CSS, designed for the developer community.

## Features

### 🔐 Authentication & Authorization

- User registration and login with email/password
- **Google OAuth integration** for social login
- Role-based access control (User, Moderator, Admin)
- **Custom JWT-based authentication** with Redis session management
- Password hashing with bcryptjs
- **Rate limiting** and security middleware

### 📊 Dashboard & Content

- Overview of all articles with hierarchical categories
- **Advanced search functionality** with filters and pagination
- **Real-time data loading** with infinite scroll
- **Responsive design** with mobile-first approach
- **Rich text editor** with TipTap (code blocks, images, links, formatting)
- **Image upload and compression** for articles and avatars
- **Featured articles** with time-decay scoring algorithm
- **Related articles** with intelligent content matching

### 👤 User Management

- User profile pages with edit capabilities
- **View other users' profiles** with privacy protection
- **User discovery page** with search functionality
- **Avatar upload support** with image compression
- Role management for admins
- User statistics and activity tracking
- **Email privacy masking** for non-admin users

### 💬 Community Features

- **Real-time comment system** with WebSocket support
- Like/unlike functionality
- Nested comment support with threading
- **Real-time chat system** with floating chat button
- **Chat sidebar** for conversation management
- **Direct messaging** between users with typing indicators
- **Chat window** with message history and emoji support
- **Online presence** indicators
- **Unread message indicators** with persistent state management
- **System user messaging** for notifications and announcements

### 🤖 System User & Worker Jobs

- **System User Management** - Create and manage system users for automated messaging
- **Redis-backed Worker Queue** - Scalable background job processing system
- **Bulk Message Broadcasting** - Send messages to multiple users or all users at once
- **Batch Processing** - Efficient handling of large-scale message distribution
- **Admin Message Interface** - User-friendly UI for system administrators
- **Real-time Job Processing** - WebSocket integration for immediate message delivery
- **Message Persistence** - All system messages stored in database with encryption
- **Unread State Management** - Server-side tracking of message read status

### 🏆 Leaderboard System

- **Multi-timeframe rankings** (7 days, 30 days, 90 days, 1 year, all-time)
- **Advanced scoring algorithm** based on posts, likes, comments, and views
- **Real-time updates** with Redis caching for performance
- **User engagement metrics** - posts (10pts), likes (5pts), comments (3pts), views (log-scaled)
- **Interactive leaderboard** with user profiles and chat integration
- **Responsive design** - compact widget and full page view
- **Performance optimized** with batched queries and intelligent caching
- **Gamification elements** to encourage community participation

### 🔍 Content Discovery

- **Featured Articles System** with intelligent time-decay scoring
- **Related Articles Algorithm** based on category hierarchy and author similarity
- **Time-based ranking** - recent articles get higher scores with exponential decay
- **Category-based matching** - same category (300pts), related category (200pts)
- **Author-based recommendations** - articles from same author (100pts)
- **Engagement scoring** - likes, comments, views, and dislikes weighted
- **Redis caching** for performance optimization (1-hour cache)
- **Smart content filtering** to avoid duplicate recommendations

### 🛠 Admin Panel

- User role management
- Content moderation
- Article management
- System statistics
- **Advanced user management** with pagination and search
- **Role-based email visibility** (admins see full emails)
- **User profile access** with admin privileges
- **System User Management** - Create, edit, and delete system users
- **Bulk Messaging Interface** - Send messages to selected users or all users
- **Message Broadcasting** - Real-time message delivery with worker queue
- **User Search & Selection** - Advanced user selection with search and pagination

### 🔐 Session Management

- **Multi-device session tracking** with device and browser detection
- **Active session monitoring** with login time and last activity
- **Session termination** - terminate individual or all other sessions
- **Geographic tracking** with country detection
- **Device information** display (OS, browser, device type)
- **Real-time session status** updates
- **Security controls** - logout from suspicious devices
- **Session history** with detailed activity logs

### 🌐 Internationalization

- **Multi-language support** (English/Vietnamese)
- **Language switcher** with persistent preferences
- **Localized content** throughout the application

### 📁 File Management

- **Image upload system** with validation and compression
- **Avatar management** with crop and resize functionality
- **File type validation** and size limits
- **Secure file storage** with unique naming

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Fastify (standalone API server)
- **Styling**: Tailwind CSS 4, Radix UI components, Framer Motion
- **Database**: PostgreSQL 17 with Drizzle ORM
- **Authentication**: Custom JWT with Passport.js (Local + Google OAuth)
- **Real-time**: WebSocket with Redis pub/sub
- **Caching**: Redis for sessions, caching, and real-time features
- **Worker System**: Redis-backed job queue with background processing
- **File Processing**: Sharp for image optimization, browser-image-compression
- **Package Manager**: pnpm
- **Containerization**: Docker Compose with multi-service architecture
- **Reverse Proxy**: Nginx with rate limiting and load balancing

## Prerequisites

- Node.js 18+
- pnpm
- Docker and Docker Compose
- PostgreSQL 17 (or use Docker Compose)
- Redis (or use Docker Compose)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd codevn
   ```

2. **Install pnpm**

   ```bash
   npm install -g pnpm
   ```

3. **Install dependencies**

   ```bash
   pm install -g pnpm
   pnpm install
   ```

4. **Set up environment variables**
   Create a `.env` file in the project root:

   ```env
   # Site Url
   NEXT_PUBLIC_SITE_NAME=CodeVN

   # API Url
   API_URL=http://localhost:3001
   APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:3000

   # Auth
   JWT_SECRET=your-super-secret-key-that-is-at-least-32-characters-long
   JWT_ACCESS_TOKEN_EXPIRES_IN=900
   JWT_REFRESH_TOKEN_EXPIRES_IN=604800

   # Chat
   CHAT_ENCRYPTION_KEY=your-chat-encryption-key-that-is-at-least-30-characters-long
   CHAT_ENCRYPTION_SALT=your-chat-encryption-salt

   # Postgres
   POSTGRES_HOST=localhost
   POSTGRES_DB=codevn
   POSTGRES_USER=codevn_user
   POSTGRES_PASSWORD=codevn_password
   POSTGRES_PORT=5432
   POSTGRES_SSL=false
   PGADMIN_DEFAULT_EMAIL=admin@codevn.dev
   PGADMIN_DEFAULT_PASSWORD=123456

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=codevn_password
   REDIS_DB=0

   # Google Credentials
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   ```

5. **Start services with Docker Compose**

   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL 17 database
   - Redis for caching and real-time features
   - pgAdmin for database management
   - RedisInsight for Redis management
   - Nginx reverse proxy

6. **Run database migrations**

   ```bash
   pnpm db:push
   ```

7. **Seed initial data (optional)**

   ```bash
   # Seed users
   pnpm seed:users

   # Seed articles
   pnpm seed:articles
   ```

8. **Start the development servers**

   ```bash
   # Start both frontend and backend
   pnpm dev

   # Or start them separately:
   # Frontend only
   pnpm dev:web

   # Backend API only
   pnpm dev:api
   ```

9. **Access the application**
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **API**: [http://localhost:3001](http://localhost:3001)
   - **pgAdmin**: [http://localhost:5433](http://localhost:5433)
   - **RedisInsight**: [http://localhost:5540](http://localhost:5540)

## Available Scripts

### Development

- `pnpm dev` - Start both frontend and backend development servers
- `pnpm dev:web` - Start Next.js frontend development server
- `pnpm dev:api` - Start Fastify backend API server
- `pnpm api` - Run backend API server (production mode)

### Building & Production

- `pnpm build` - Build Next.js application for production
- `pnpm start` - Start Next.js production server

### Code Quality

- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm type:check` - Run TypeScript type checking

### Database

- `pnpm db:push` - Push database schema changes
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:generate` - Generate database migrations

### Seeding

- `pnpm seed:users` - Seed initial users
- `pnpm seed:articles` - Seed initial articles

## Database Schema

The application uses the following main entities:

- **Users**: User accounts with roles (user, mod, admin)
- **Categories**: Hierarchical categories with parent-child relationships
- **Articles**: Content published with category assignments
- **Comments**: User comments on articles (with nesting support)
- **Likes**: User likes on articles

## API Endpoints

### Health Check

- `GET /api/health` - Health check endpoint

### Authentication

- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User sign in (Local strategy)
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/check-email` - Check email availability
- `POST /api/auth/sign-out` - User sign out

### Profile Management

- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update user profile
- `GET /api/users/[id]` - Get user profile by ID (with role-based email masking)

### Leaderboard

- `GET /api/users/leaderboard` - Get leaderboard data with timeframe and limit filters

### Articles

- `GET /api/articles` - List published articles with pagination
- `GET /api/articles/[id]` - Get article by ID
- `GET /api/articles/featured` - Get featured articles with time-decay scoring
- `GET /api/articles/[id]/related` - Get related articles based on category and author
- `POST /api/articles` - Create new article (Admin)
- `PUT /api/articles/[id]` - Update article (Admin)
- `DELETE /api/articles/[id]` - Delete article (Admin)

### Categories

- `GET /api/categories` - List all categories
- `GET /api/categories/[id]` - Get category by ID
- `POST /api/categories` - Create new category (Admin)
- `PUT /api/categories/[id]` - Update category (Admin)
- `DELETE /api/categories/[id]` - Delete category (Admin)

### Comments

- `GET /api/comments` - Get comments for an article
- `POST /api/comments` - Create new comment
- `PUT /api/comments/[id]` - Update comment
- `DELETE /api/comments/[id]` - Delete comment

### Chat System

- `GET /api/chat/conversations` - Get user conversations
- `GET /api/chat/messages/[peerId]` - Get messages with a user
- `POST /api/chat/messages` - Send chat message
- `PUT /api/chat/messages/[id]/seen` - Mark message as seen

### File Upload

- `POST /api/upload/image` - Upload image file
- `POST /api/upload/avatar` - Upload avatar image

### Session Management

- `GET /api/session` - Get user's active sessions with device info
- `POST /api/session/terminate` - Terminate specific sessions
- `GET /api/sessions` - List all user sessions (Admin)
- `DELETE /api/sessions/[id]` - Terminate session by ID (Admin)

### Admin

- `GET /api/admin/users` - List all users with pagination (Admin)
- `PUT /api/admin/users/[id]/role` - Update user role (Admin)
- `GET /api/admin/stats` - Get system statistics (Admin)

## User Roles

### Member

- View articles
- Comment on articles
- Like articles
- Edit own profile
- **View other users' profiles** (with masked email)
- **Discover and search users**
- **Send direct messages** via chat system
- **Manage own sessions** - view and terminate active sessions
- **Session security** - logout from other devices
- **View leaderboard** - see community rankings and compete for top spots
- **Content discovery** - access featured and related articles

### Admin

- All member permissions
- Create articles
- Moderate content
- Manage user roles
- Full system access
- User management
- **View full user information** (unmasked emails)
- **Access all user profiles** with admin privileges
- **Advanced user management** with search and pagination
- **Session management** - view and terminate any user's sessions
- **Security monitoring** - track user login activities

### System

- System-level operations
- Automated processes
- Internal system tasks

## Docker Setup

The application uses a multi-service Docker Compose architecture with the following services:

### Services Overview

- **web** (Next.js Frontend) - Port 3000
- **api** (Fastify Backend) - Port 3001
- **postgres** (PostgreSQL 17) - Port 5432
- **redis** (Redis 8) - Port 6379
- **nginx** (Reverse Proxy) - Port 80
- **pgadmin** (Database Management) - Port 5433
- **redisinsight** (Redis Management) - Port 5540

### Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Development with Docker

```bash
# Start only database services for local development
docker-compose up -d postgres redis pgadmin redisinsight

# Run frontend and backend locally
pnpm dev
```

### Environment Configuration

The Docker setup uses environment variables from `.env` file. Key variables include:

- Database credentials and connection strings
- Redis configuration
- JWT secrets
- Google OAuth credentials (optional)
- Server ports and hosts

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@codevn.dev or create an issue in the repository.

## Recent Updates

### ✅ Completed Features

- **Multi-service Architecture**: Separate Fastify backend and Next.js frontend
- **Custom Authentication**: JWT-based auth with Passport.js and Google OAuth
- **Real-time Features**: WebSocket chat system with typing indicators and online presence
- **File Upload System**: Image upload with compression and validation
- **Internationalization**: Multi-language support (English/Vietnamese)
- **Rich Text Editor**: TipTap integration with code blocks, images, and formatting
- **Advanced Search**: Filtered search with pagination and infinite scroll
- **User Management**: Profile system with privacy protection and role-based access
- **Leaderboard System**: Advanced ranking system with multi-timeframe scoring
- **Content Discovery**: Featured and related articles with intelligent algorithms
- **Admin Panel**: Comprehensive admin interface with user and content management
- **System User Management**: Create and manage system users for automated messaging
- **Worker Job System**: Redis-backed background job processing for scalable messaging
- **Bulk Message Broadcasting**: Send messages to multiple users or all users at once
- **Unread Message Management**: Persistent unread state with server-side tracking
- **Session Management**: Multi-device session tracking with security controls
- **Docker Setup**: Complete containerization with Nginx reverse proxy
- **Redis Integration**: Caching, sessions, and real-time features
- **Database Management**: Drizzle ORM with PostgreSQL and migration system

## Roadmap

### Short Term

- [ ] Real-time notifications system
- [ ] Email notifications for comments and messages
- [ ] Advanced analytics dashboard
- [ ] Content versioning and history
- [ ] API rate limiting improvements
- [ ] Chat message encryption

### Medium Term

- [ ] Mobile app (React Native)
- [ ] Advanced search with AI-powered recommendations
- [ ] Group chat functionality
- [ ] File sharing beyond images
- [ ] User badges and achievements
- [ ] Content moderation tools

### Long Term

- [ ] Microservices architecture
- [ ] Advanced caching strategies
- [ ] Performance monitoring and optimization
- [ ] Multi-tenant support
- [ ] API documentation with OpenAPI
- [ ] Automated testing and CI/CD

---

Built with ❤️ for the developer community
