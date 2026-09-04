# AI-Powered Tender Discovery and Matching Platform

A production-ready platform that helps businesses automatically discover relevant tenders from public procurement websites and receive AI-powered matching recommendations.

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Queue System**: BullMQ
- **AI**: OpenAI API (GPT-4)
- **Scraping**: Playwright
- **Email**: Resend
- **Containerization**: Docker + Docker Compose

## Features

1. **Authentication**
   - User registration and login
   - JWT-based authentication
   - Role-based access control (user/admin)

2. **Company Profile Management**
   - Company name, industry, services, keywords
   - Country, description, certifications
   - Website URL

3. **Tender Collection Engine**
   - Automated scraping from configured sources
   - Store title, description, deadline, source URL
   - Organization, category, budget range, location
   - Playwright-based web scraping

4. **AI Matching Engine**
   - Compare company profile against tenders
   - Generate match score from 0-100
   - AI-powered explanations for matches
   - OpenAI GPT-4 integration

5. **Notifications**
   - Email alerts when score > 80%
   - Store notification history
   - Resend email integration

6. **Dashboard**
   - List matched tenders
   - Filter by score, category, search
   - View tender details with match explanations
   - Statistics overview

7. **AI Assistant**
   - Natural language queries about tenders
   - "Find AI-related tenders"
   - "Show tenders above 90% score"
   - "Why is this tender relevant?"

8. **Background Jobs**
   - Scheduled scraping with BullMQ
   - Match calculation jobs
   - Email sending jobs

9. **Admin Panel**
   - Manage users
   - Manage scraping sources
   - View system logs
   - System statistics

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── company/           # Company profile management
│   │   ├── tenders/           # Tender collection & scraping
│   │   ├── matching/          # AI matching engine
│   │   ├── notifications/     # Email notifications
│   │   ├── dashboard/         # Dashboard API
│   │   ├── assistant/         # AI assistant
│   │   ├── admin/             # Admin panel
│   │   ├── jobs/              # Background jobs
│   │   ├── common/            # Shared utilities
│   │   ├── config/            # Configuration
│   │   ├── database/          # Database schema
│   │   ├── app.module.ts      # Main module
│   │   └── main.ts            # Application entry point
│   ├── database/
│   │   └── schema.sql         # PostgreSQL schema
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/          # Authentication pages
│   │   │   ├── dashboard/     # Dashboard UI
│   │   │   ├── profile/       # Company profile UI
│   │   │   ├── assistant/     # AI assistant UI
│   │   │   ├── admin/         # Admin panel UI
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Home page
│   │   │   └── globals.css    # Global styles
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # Utilities
│   │   ├── types/             # TypeScript types
│   │   └── hooks/             # Custom hooks
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml          # Docker Compose configuration
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- OpenAI API key
- Resend API key

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tender-discovery-platform
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

3. **Start the application with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

5. **Initialize the database**
   The database schema will be automatically initialized on first startup.

## Local Development Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

4. **Run database migrations**
   ```bash
   # Start PostgreSQL and Redis with Docker
   docker-compose up postgres redis -d
   
   # Apply schema
   psql -h localhost -U postgres -d tender_discovery -f database/schema.sql
   ```

5. **Start the backend server**
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

4. **Start the frontend server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user profile

### Company Profile
- `POST /company` - Create company profile
- `GET /company/my-profile` - Get user's company profile
- `PUT /company/:id` - Update company profile
- `DELETE /company/:id` - Delete company profile

### Tenders
- `GET /tenders` - List all tenders (with pagination, filtering)
- `GET /tenders/:id` - Get tender details
- `POST /tenders` - Create tender (admin only)
- `PUT /tenders/:id` - Update tender (admin only)
- `DELETE /tenders/:id` - Delete tender (admin only)

### Scraping Sources
- `GET /tenders/scraping-sources/all` - List all scraping sources (admin)
- `POST /tenders/scraping-sources` - Create scraping source (admin)
- `PUT /tenders/scraping-sources/:id` - Update scraping source (admin)
- `DELETE /tenders/scraping-sources/:id` - Delete scraping source (admin)

### Matching
- `POST /matching/calculate` - Calculate match for company and tender
- `GET /matching/company/:companyId` - Get matches for company
- `GET /matching/tender/:tenderId` - Get matches for tender
- `POST /matching/calculate-all/company/:companyId` - Calculate all matches for company
- `POST /matching/calculate-all/tender/:tenderId` - Calculate all matches for tender

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/tenders` - Get matched tenders for user
- `GET /dashboard/tenders/:tenderId` - Get tender details with match
- `GET /dashboard/top-matches` - Get top matches for user
- `GET /dashboard/categories` - Get tender categories

### Notifications
- `GET /notifications` - Get user notifications
- `GET /notifications/history` - Get notification history
- `POST /notifications/queue-high-score-matches` - Queue high-score match emails (admin)

### AI Assistant
- `POST /assistant/ask` - Ask AI assistant a question
- `GET /assistant/history` - Get conversation history
- `POST /assistant/search-tenders` - Search tenders using AI

### Admin Panel
- `GET /admin/stats` - Get system statistics
- `GET /admin/users` - List all users
- `GET /admin/users/:id` - Get user details
- `PUT /admin/users/:id/role` - Update user role
- `PUT /admin/users/:id/status` - Toggle user status
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/logs` - Get system logs
- `POST /admin/logs` - Create system log

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts and authentication
- **company_profiles** - Company information and services
- **scraping_sources** - Configured tender sources
- **tenders** - Scraped tender opportunities
- **tender_matches** - AI-generated match scores
- **notifications** - Email notifications
- **notification_history** - Notification history
- **system_logs** - System logging
- **ai_conversations** - AI assistant conversations

See `backend/database/schema.sql` for the complete schema.

## Background Jobs

The platform uses BullMQ for background job processing:

- **Scraping Jobs** (`scraping` queue)
  - `scrape-source` - Scrape a single source
  - `scrape-all-sources` - Scrape all active sources

- **Matching Jobs** (`matching` queue)
  - `calculate-match` - Calculate match for company and tender
  - `calculate-all-matches-company` - Calculate all matches for a company
  - `calculate-all-matches-tender` - Calculate all matches for a tender

- **Notification Jobs** (`notifications` queue)
  - `send-email` - Send single email notification
  - `send-batch-emails` - Send batch email notifications

## Security Considerations

- JWT tokens for authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation with class-validator
- SQL injection prevention with TypeORM
- CORS configuration
- Environment variable protection

## Monitoring and Logging

- System logs stored in database
- Log levels: info, warning, error, debug
- Admin panel for viewing logs
- Structured logging with metadata

## Deployment

### Docker Deployment

1. Build and start all services:
   ```bash
   docker-compose up -d --build
   ```

2. View logs:
   ```bash
   docker-compose logs -f
   ```

3. Stop services:
   ```bash
   docker-compose down
   ```

### Production Considerations

- Change all default passwords and secrets
- Use environment-specific configurations
- Enable HTTPS/SSL
- Set up proper backup strategy for PostgreSQL
- Configure Redis persistence
- Monitor resource usage
- Set up log aggregation
- Implement rate limiting
- Use a reverse proxy (nginx) for production

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

### Redis Connection Issues
- Ensure Redis is running
- Check Redis credentials in `.env`

### Scraping Issues
- Verify Playwright is installed
- Check scraping source configurations
- Review system logs for errors

### AI Matching Issues
- Verify OpenAI API key is valid
- Check API quota and billing
- Review match calculation logs

### Email Issues
- Verify Resend API key
- Check email domain configuration
- Review notification logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the repository.
