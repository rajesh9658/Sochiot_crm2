# Sochiot CRM - Customer Relationship Management System

A modern, multi-tenant Customer Relationship Management (CRM) platform built with Node.js, Express, TypeScript, and Prisma ORM. Designed for sales teams to manage customers, leads, activities, deals, and payments efficiently.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Models & Entities](#api-models--entities)
- [User Roles & Permissions](#user-roles--permissions)

---

## ✨ Features

### Multi-Tenancy
- Company-based multi-tenant architecture
- Isolated data per company
- Flexible subscription plans with customizable limits

### User Management
- Role-based access control (RBAC)
- Five system roles: SUPER_ADMIN, COMPANY_ADMIN, MANAGER, FIELD_SALES, SALES_EXECUTIVE
- User hierarchy with manager relationships
- Custom role support with granular permissions

### Lead & Customer Management
- Comprehensive lead lifecycle tracking (NEW → CONVERTED/LOST)
- Customer categorization and segmentation
- Lead source tracking and assignment
- Business details tracking (GST, PAN, credit limits)
- Contact information management

### Sales Activities
- Multiple activity types: CALL, VISIT, MEETING, EMAIL, WHATSAPP
- Activity outcome tracking
- Location tracking (latitude/longitude) for field activities
- Activity notes and internal comments
- Next follow-up scheduling

### Follow-ups & Tasks
- Priority-based follow-up management (LOW, MEDIUM, HIGH, URGENT)
- Follow-up status tracking (PENDING, COMPLETED, CANCELLED, RESCHEDULED)
- Multiple follow-up types (CALL, VISIT, MEETING, EMAIL)
- Assignment to team members

### Deal Management
- Deal creation with complete financial tracking
- Deal amount, discount, and tax calculations
- Deal status management (ACTIVE, COMPLETED, CANCELLED, ON_HOLD)
- Payment terms tracking
- Expected and actual delivery dates

### Payment Tracking
- Multiple payment methods (CASH, CHEQUE, BANK_TRANSFER, UPI, CARD)
- Payment status tracking (RECEIVED, PENDING_CLEARANCE, CLEARED, BOUNCED)
- Transaction reference management
- Collection by user tracking

### Sales Targets & Performance
- User-level sales targets (calls, visits, meetings)
- Sales collection targets
- New customer acquisition targets
- Monthly/periodic target tracking

### Product Interests
- Track customer interest in specific products
- Interest level assessment (LOW, MEDIUM, HIGH)
- Quantity and budget estimations
- Product category management

### Audit & Compliance
- Complete audit logging of all actions
- User action tracking with IP and user agent
- Entity-level change tracking (old vs new values)
- Compliance-ready audit trails

---

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js v5.2.1
- **ORM**: Prisma v7.3.0
- **Database**: PostgreSQL
- **Security**: CORS enabled
- **Environment**: dotenv for configuration

### DevDependencies
- TypeScript v5.9.3
- ts-node-dev v2.0.0
- @types/express v5.0.6
- @types/node v25.2.1

---

## 📊 Database Schema

### Core Entities

#### **Company** (Tenant Root)
- Multi-tenant root entity
- Subscription management (plans, status, end date)
- Resource limits tracking (users, storage)
- Company details (name, industry, contact, address)

#### **User**
- Global user accounts
- Email-based authentication
- Account verification and security tokens
- Super admin flag for platform-level access
- Login tracking

#### **CompanyUser** (Membership)
- Maps users to companies with roles
- Employee-specific details (code, territory, joining date)
- Manager hierarchy support
- System role assignment for access control
- Multiple company membership support

#### **Roles & Permissions**
- Company-specific roles
- RBAC with fine-grained permissions
- Resource-action based permissions (e.g., "customer:create", "deal:update")
- System roles that cannot be deleted

### CRM Entities

#### **Customer**
- Complete customer profile
- Business information (GST, PAN)
- Lead status lifecycle tracking
- Assignment to sales users
- Category-based segmentation
- Contact & location details

#### **Activity**
- All customer interactions logged
- Multiple activity types supported
- Outcome tracking
- Location coordinates for field visits
- Duration tracking
- Next follow-up scheduling

#### **ActivityNote**
- Detailed notes on activities
- Internal vs external notes
- User attribution
- Auditable history

#### **Followup**
- Scheduled follow-ups for customers
- Priority and status management
- Assigned to specific users
- Subject and description fields
- Completion tracking

#### **Deal**
- Sales deals with full financial tracking
- Deal number, date, and amounts
- Discount and tax calculations
- Payment terms
- Delivery date tracking

#### **Payment**
- Payment collection tracking
- Multiple payment methods
- Payment number and reference
- Status tracking (received, pending, cleared, bounced)
- Collector attribution

#### **UserTarget**
- Individual sales targets by user
- Activity targets (calls, visits, meetings)
- Sales amount targets
- Collection targets
- New customer acquisition targets

#### **ProductInterest**
- Customer product interests
- Interest level assessment
- Quantity and budget estimates
- Product category tracking

#### **Plan**
- Subscription plan definitions
- Feature toggles (JSON-based)
- User and storage limits
- Monthly and yearly pricing
- Currency support (default: INR)

### Supporting Tables

#### **CustomerCategory**
- Customer classification system
- Company-specific categories
- Soft delete support

#### **AuditLog**
- All actions logged for compliance
- User action attribution
- Entity change tracking
- IP and user agent logging

---

## 📁 Project Structure

```
sochiot_crm/
├── prisma/
│   ├── schema.prisma          # Database schema definitions
│   └── migrations/            # Database migrations
│       ├── migration_lock.toml
│       └── 20260220061120_initialize/
│           └── migration.sql
├── src/
│   ├── index.ts               # Application entry point
│   ├── config/                # Configuration files
│   ├── controllers/           # Route controllers
│   └── middlewares/           # Express middlewares
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── prisma.config.ts           # Prisma configuration
└── README.md                  # This file
```

---

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd sochiot_crm
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sochiot_crm?schema=public"

# Server
PORT=3000
NODE_ENV=development

# Prisma
PRISMA_QUERY_ENGINE_BINARY=<path-if-needed>
```

4. **Run Prisma migrations**
```bash
npm run prisma migrate dev
```

5. **Generate Prisma Client**
```bash
npm run prisma generate
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |

### Prisma Configuration

The Prisma client is configured to output to `src/generated/prisma` directory with PostgreSQL as the database provider.

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

Starts the application with ts-node-dev for hot-reload support.

### Production Build
```bash
npm run build
npm start
```

### Database Commands

```bash
# Create migration after schema changes
npm run prisma migrate dev --name <migration_name>

# Reset database (development only)
npm run prisma migrate reset

# Open Prisma Studio (visual database explorer)
npm run prisma studio

# View migration status
npm run prisma migrate status
```

---

## 👥 User Roles & Permissions

### System Roles

| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | Platform-level administrator with full system access |
| **COMPANY_ADMIN** | Company owner/administrator with full company access |
| **MANAGER** | Team manager with team oversight and reporting |
| **FIELD_SALES** | Field sales executive focused on customer visits |
| **SALES_EXECUTIVE** | Inside sales representative for phone/email sales |

### User Status States

- `ACTIVE` - User can access the system
- `INACTIVE` - User account is disabled
- `PENDING_VERIFICATION` - Email verification pending
- `SUSPENDED` - Account suspended by admin

### Permission Model

Permissions follow a resource-action model:
- **Resource**: customer, deal, report, activity, payment, etc.
- **Action**: create, read, update, delete, manage

Example permissions: `customer:create`, `deal:update`, `report:manage`

---

## 📊 Lead Status Lifecycle

```
NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → CONVERTED/LOST
                                                      → ON_HOLD
```

---

## 💰 Deal Status Lifecycle

```
ACTIVE → COMPLETED
      → ON_HOLD
      → CANCELLED
```

---

## 📝 Activity Types & Outcomes

### Activity Types
- CALL
- VISIT
- MEETING
- EMAIL
- WHATSAPP

### Activity Outcomes
- SUCCESSFUL
- NO_RESPONSE
- CALLBACK
- NOT_INTERESTED
- CONVERTED
- PENDING

---

## 🔄 Follow-up Management

### Follow-up Types
- CALL
- VISIT
- MEETING
- EMAIL

### Follow-up Priorities
- LOW
- MEDIUM
- HIGH
- URGENT

### Follow-up Status
- PENDING
- COMPLETED
- CANCELLED
- RESCHEDULED

---

## 💳 Payment Information

### Payment Methods
- CASH
- CHEQUE
- BANK_TRANSFER
- UPI
- CARD

### Payment Status
- RECEIVED
- PENDING_CLEARANCE
- CLEARED
- BOUNCED

---

## 📈 API Data Models

### Key Data Types

```typescript
// Dates
createdAt: DateTime  // ISO 8601 format
updatedAt: DateTime  // Auto-updated on changes
deletedAt: DateTime  // For soft deletes

// Decimal Fields (Pricing, Amounts)
@db.Decimal(15, 2)  // Up to 15 digits with 2 decimal places

// Locations
locationLatitude: Decimal(10, 8)    // GPS coordinates
locationLongitude: Decimal(11, 8)

// Status/Enum Fields
Automatic validation against predefined enums
```

---

## 🔐 Security Features

- **Email Verification**: Email verification tokens for account security
- **Password Management**: Password hashing and reset tokens
- **Audit Logging**: Comprehensive action tracking with IP/user agent
- **Soft Deletes**: Logical deletion for data recovery
- **CORS Support**: Cross-origin request handling
- **Multi-Tenancy**: Complete data isolation per company

---

## 📞 Support & Contribution

For issues, feature requests, or contributions, please contact the development team.

---

## 📄 License

ISC

---

**Last Updated**: February 20, 2026
**Version**: 1.0.0
