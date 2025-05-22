# FoleyFilmZ - Rodeo Video Marketplace

## Overview

FoleyFilmZ is a video marketplace web application for rodeo events. It allows users to browse events, view riders, and purchase videos of their performances. The application features a clean user interface with a dark theme, and an administrative backend for managing events, riders, and viewing sales data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **React**: Single-page application built with React
- **Wouter**: Lightweight routing library
- **TanStack Query**: Data fetching and state management
- **Shadcn UI**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework

### Backend

- **Express.js**: Node.js web server framework
- **Passport.js**: Authentication middleware
- **Drizzle ORM**: SQL query builder and schema management
- **PostgreSQL**: Relational database (via Neon serverless)

### Payment Processing

- **Stripe**: Primary payment processor
- **PayPal**: Alternative payment option

## Key Components

### Database Schema

The application uses a PostgreSQL database with the following tables:

1. **users**: Admin users for managing the application
   - `id`: Primary key
   - `username`: Unique username
   - `password`: Stored password (consider implementing proper hashing)

2. **events**: Rodeo events
   - `id`: Primary key
   - `name`: Event name
   - `date`: Event date
   - `thumbnailUrl`: URL to event thumbnail image
   - `createdAt`: Timestamp when record was created

3. **riders**: Participants in events
   - `id`: Primary key
   - `name`: Rider name
   - `eventId`: Foreign key to events table
   - `price`: Video price (default: $80)
   - `thumbnailUrl`: URL to rider thumbnail image
   - `videoUrl`: URL to rider's performance video
   - `createdAt`: Timestamp when record was created

4. **purchases**: Record of video sales
   - `id`: Primary key
   - `email`: Customer email
   - `riderId`: Foreign key to riders table
   - `paymentMethod`: Payment method used
   - `amount`: Purchase amount
   - `createdAt`: Timestamp when record was created

### Frontend Routes

1. `/`: Home page with list of events
2. `/event/:id`: Event page with list of riders
3. `/admin`: Admin dashboard (protected route)

### API Endpoints

1. **Authentication**
   - `POST /api/login`: Admin login
   - `GET /api/user`: Get current user
   - `POST /api/logout`: Admin logout

2. **Events**
   - `GET /api/events`: Get all events
   - `GET /api/events/:id`: Get specific event
   - `POST /api/events`: Create event (admin only)
   - `DELETE /api/events/:id`: Delete event (admin only)

3. **Riders**
   - `GET /api/riders`: Get all riders (or filter by event ID)
   - `GET /api/riders/:id`: Get specific rider
   - `POST /api/riders`: Create rider (admin only)
   - `DELETE /api/riders/:id`: Delete rider (admin only)

4. **Purchases**
   - `POST /api/purchases`: Record a purchase
   - `GET /api/purchases/check`: Check if a video has been purchased
   - `GET /api/stats/sales`: Get sales statistics (admin only)

5. **Payments**
   - `POST /order`: Create a PayPal order
   - `POST /order/:id/capture`: Capture a PayPal payment

## Data Flow

1. **User Video Purchase**:
   - User browses events on homepage
   - User selects an event to view riders
   - User chooses a rider and initiates purchase
   - User provides email (stored in localStorage)
   - User completes payment (Stripe or PayPal)
   - Backend records purchase and user can view video

2. **Admin Workflow**:
   - Admin logs in through footer link
   - Admin can create/delete events
   - Admin can create/delete riders for events
   - Admin can view sales statistics

## External Dependencies

### Frontend Libraries

- **@radix-ui**: UI component primitives
- **@tanstack/react-query**: Data fetching and cache management
- **class-variance-authority**: Managing component variants
- **clsx & tailwind-merge**: Class name utilities
- **wouter**: Routing
- **react-hook-form**: Form management
- **zod**: Schema validation

### Payment Gateways

- **Stripe**: Primary payment processing
  - @stripe/react-stripe-js
  - @stripe/stripe-js
- **PayPal**: Alternative payment option
  - @paypal/paypal-server-sdk

### Backend Libraries

- **Express**: Web server framework
- **Passport**: Authentication middleware
- **Drizzle ORM**: Database ORM
  - drizzle-zod: Schema validation integration

## Deployment Strategy

The application is configured for deployment on Replit:

1. **Development**:
   - Run `npm run dev` to start the development server
   - Vite handles frontend bundling and HMR
   - Backend Express server runs concurrently

2. **Production**:
   - Build step: `npm run build`
     - Vite builds the frontend to static assets
     - esbuild bundles the server code
   - Start command: `npm run start`
     - Runs the production Node.js server

3. **Database**:
   - Uses Neon serverless PostgreSQL
   - Connection string stored in environment variable `DATABASE_URL`
   - Schema migrations handled by Drizzle

## Setup Instructions

1. **Environment Variables**:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: Secret for session encryption
   - `STRIPE_SECRET_KEY`: Stripe API secret key
   - `STRIPE_PUBLIC_KEY`: Stripe publishable key
   - `PAYPAL_CLIENT_ID`: PayPal client ID
   - `PAYPAL_CLIENT_SECRET`: PayPal client secret

2. **Database Setup**:
   - Run `npm run db:push` to apply the schema to the database

3. **Running the Application**:
   - Development: `npm run dev`
   - Production: `npm run build && npm run start`

## Implementation Notes

1. **Authentication**: Currently using a simple username/password strategy with Passport.js. Consider improving with password hashing and possibly JWT.

2. **Payment Processing**: The PayPal integration uses a critical code block that should not be modified to maintain compatibility.

3. **Storage**: The application currently uses a memory store for sessions. For production, consider using a more robust solution like Redis.

4. **Media Storage**: The application references external URLs for images and videos. Consider implementing proper media upload and storage.

5. **Mobile Responsiveness**: The UI is designed to be responsive across different screen sizes.