# CodeVN

A modern, full-featured forum application built with Next.js 15, TypeScript, and Tailwind CSS, designed for the developer community.

## Features

### 🔐 Authentication & Authorization

- User registration and login with email/password
- Role-based access control (User, Moderator, Admin)
- Secure session management with NextAuth.js
- Password hashing with bcryptjs

### 📊 Dashboard

- Overview of all articles with categories
- Search functionality across content
- Real-time data loading
- Responsive design

### 👤 User Management

- User profile pages with edit capabilities
- **View other users' profiles** with privacy protection
- **User discovery page** with search functionality
- Avatar upload support
- Role management for admins
- User statistics and activity tracking
- **Email privacy masking** for non-admin users

### 📝 Content Management

- Article publishing system with hierarchical categories
- Parent-child category relationships
- Rich text content support
- Content moderation tools

### 💬 Community Features

- Comment system for articles
- Like/unlike functionality
- Nested comment support
- Real-time interactions
- **Real-time chat system** with floating chat button
- **Chat sidebar** for conversation management
- **Direct messaging** between users
- **Chat window** with message history

### 🛠 Admin Panel

- User role management
- Content moderation
- Article management
- System statistics
- **Advanced user management** with pagination and search
- **Role-based email visibility** (admins see full emails)
- **User profile access** with admin privileges

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI components
- **Database**: PostgreSQL 17 with Drizzle ORM
- **Authentication**: NextAuth.js v5
- **Package Manager**: pnpm
- **Containerization**: Docker Compose

## Prerequisites

- Node.js 18+
- pnpm
- Docker and Docker Compose
- PostgreSQL 17 (or use Docker Compose)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd codevn
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the project root:

   ```env
   # Database Configuration
   DATABASE_URL="postgresql://codevn_user:codevn_password@localhost:5432/codevn"

   # Redis Configuration (for caching, sessions, rate limiting, and chat)
   REDIS_URL="redis://localhost:6379"
   # OR use individual Redis settings:
   # REDIS_HOST=localhost
   # REDIS_PORT=6379
   # REDIS_PASSWORD=
   # REDIS_DB=0

   # NextAuth Configuration
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production"

   # Environment
   NODE_ENV="development"
   ```

4. **Start PostgreSQL and Redis with Docker Compose**

   ```bash
   docker-compose up -d
   ```

   This will start both PostgreSQL and Redis services.

5. **Run database migrations**

   ```bash
   pnpm db:push
   ```

6. **Test Redis integration (optional)**

   ```bash
   pnpm test:redis
   ```

7. **Start the development server**

   ```bash
   pnpm dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:push` - Push database schema changes
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:generate` - Generate database migrations
- `pnpm test:redis` - Test Redis integration and caching
- `pnpm redis:flush` - Clear all Redis cache data

## Database Schema

The application uses the following main entities:

- **Users**: User accounts with roles (user, mod, admin)
- **Categories**: Hierarchical categories with parent-child relationships
- **Articles**: Content published with category assignments
- **Comments**: User comments on articles (with nesting support)
- **Likes**: User likes on articles

## API Endpoints

### Authentication

- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User sign in
- `GET /api/auth/sign-out` - User sign out

### Profile Management

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `GET /api/users/[id]` - Get user profile by ID (with role-based email masking)

### Content

- `GET /api/articles` - List published articles

### Chat System

- `GET /api/chat` - Get chat messages
- `POST /api/chat` - Send chat message
- `GET /api/chat/conversations` - Get user conversations

### Admin

- `GET /api/admin/users` - List all users (Admin)
- `PUT /api/admin/users` - Update user role (Admin)

## User Roles

### User

- View articles
- Comment on articles
- Like articles
- Edit own profile
- **View other users' profiles** (with masked email)
- **Discover and search users**
- **Send direct messages** via chat system

### Moderator

- All user permissions
- Create articles
- Moderate content

### Admin

- All moderator permissions
- Manage user roles
- Full system access
- User management
- **View full user information** (unmasked emails)
- **Access all user profiles** with admin privileges
- **Advanced user management** with search and pagination

## Docker Setup

The application includes a `docker-compose.yml` file for easy PostgreSQL setup:

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

- **User Profile System**: View other users' profiles with privacy protection
- **Real-time Chat**: Direct messaging system with floating chat interface
- **User Discovery**: Search and browse users in the community
- **Email Privacy**: Role-based email masking for user protection
- **Admin Enhancements**: Advanced user management with full privileges
- **Chat Management**: Auto-hide chat sidebar when windows are closed

## Roadmap

- [ ] Real-time notifications
- [ ] File upload support
- [ ] Advanced search with filters
- [ ] Email notifications
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Content versioning
- [ ] Advanced analytics
- [ ] Chat message encryption
- [ ] User online status
- [ ] Group chat functionality

---

Built with ❤️ for the developer community
