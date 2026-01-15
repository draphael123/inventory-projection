# Inventory Projections

A HIPAA-compliant web application that analyzes historical order data from spreadsheet uploads and projects future inventory needs based on identified trends.

## Security Features (HIPAA Compliance)

### Authentication & Authorization
- **JWT-based authentication** with access and refresh tokens
- **Role-Based Access Control (RBAC)**: Admin, Analyst, Viewer roles
- **Session management** with configurable timeouts
- **Account lockout** after failed login attempts
- **Mandatory password change** for new users
- **Strong password requirements** enforced

### Audit Logging
- **Immutable audit trail** - logs cannot be modified or deleted
- Tracks all user actions: logins, data access, exports, changes
- IP address and user agent logging
- Searchable and filterable audit log viewer

### Security Measures
- **Rate limiting** on API endpoints
- **Secure headers** via Helmet.js (CSP, HSTS, etc.)
- **Input validation** with Zod schemas
- **Password hashing** with bcrypt (configurable rounds)
- **HTTPS ready** for production deployment
- **XSS prevention** through input sanitization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - Login/Authentication UI                                  │
│  - Dashboard with projections                               │
│  - Admin panel (user management, audit logs)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express.js)                      │
│  - Authentication API                                       │
│  - User management API                                      │
│  - Data API (orders, projections)                           │
│  - Audit logging                                            │
│  - Rate limiting & security middleware                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Encrypted connection
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  - Users & sessions                                         │
│  - Audit logs (immutable)                                   │
│  - Order data                                               │
│  - Projection settings                                      │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE inventory_projections;
```

2. Copy environment file and configure:
```bash
cd server
cp .env.example .env
# Edit .env with your database credentials and secrets
```

3. Run database migrations:
```bash
cd server
npm install
npm run db:migrate
```

4. Seed initial admin user:
```bash
npm run db:seed
```

**Default admin credentials:**
- Email: `admin@inventory.local`
- Password: `Admin123!`
- **⚠️ Change immediately after first login!**

### Running the Application

**Start the backend:**
```bash
cd server
npm install
npm run dev
```
Server runs on http://localhost:3001

**Start the frontend:**
```bash
# From project root
npm install
npm run dev
```
Frontend runs on http://localhost:3000

### Production Deployment

1. **Environment Variables** - Set all production values:
   - Strong `JWT_SECRET` (32+ characters)
   - Database credentials with SSL
   - `NODE_ENV=production`

2. **Build frontend:**
```bash
npm run build
```

3. **Build backend:**
```bash
cd server
npm run build
npm start
```

4. **Configure HTTPS** - Required for HIPAA compliance

5. **Database Security:**
   - Enable SSL connections
   - Use strong passwords
   - Implement regular backups
   - Consider encryption at rest

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: manage users, view audit logs, all data operations |
| **Analyst** | Upload data, run projections, export reports |
| **Viewer** | View projections and reports (read-only) |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (admin only)
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Current user info

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `POST /api/users/:id/unlock` - Unlock account
- `POST /api/users/:id/reset-password` - Reset password

### Audit Logs (Admin only)
- `GET /api/audit` - List audit logs
- `GET /api/audit/actions` - Available actions
- `GET /api/audit/user/:id/summary` - User activity summary

### Data
- `GET /api/data/summary` - Data summary
- `GET /api/data/files` - Uploaded files
- `GET /api/data/orders` - Order records
- `GET /api/data/products` - Product aggregates
- `DELETE /api/data/files/:id` - Delete file
- `DELETE /api/data/all` - Delete all data

## Features

### Data Import
- Drag & drop CSV and Excel (.xlsx) files
- Automatic column mapping
- Data validation with error reporting

### Analysis & Projections
- Three forecasting methods: SMA, WMA, Linear Regression
- Configurable timeframes (1-12 weeks, 1-6 months)
- Confidence intervals
- Trend detection and outlier identification

### Dashboard
- Interactive charts (historical + projected)
- Product filtering and search
- Sortable projection table
- Export to CSV/Excel

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT authentication
- Zod validation

## Project Structure

```
├── src/                    # Frontend source
│   ├── components/
│   │   ├── admin/          # Admin panel components
│   │   ├── auth/           # Auth components
│   │   └── ui/             # Reusable UI components
│   ├── context/            # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Business logic
│   └── types/              # TypeScript types
│
├── server/                 # Backend source
│   └── src/
│       ├── config/         # Configuration
│       ├── db/             # Database schema & connection
│       ├── middleware/     # Express middleware
│       ├── routes/         # API routes
│       ├── services/       # Business logic
│       └── types/          # TypeScript types
```

## HIPAA Compliance Checklist

- [x] User authentication required
- [x] Role-based access control
- [x] Audit logging (immutable)
- [x] Session timeout
- [x] Strong password requirements
- [x] Account lockout
- [x] Secure headers
- [x] Rate limiting
- [x] Input validation
- [ ] HTTPS (configure for production)
- [ ] Database encryption at rest (configure for production)
- [ ] Regular backups (configure for production)
- [ ] Employee training (organizational)
- [ ] Business Associate Agreements (organizational)

## License

ISC
