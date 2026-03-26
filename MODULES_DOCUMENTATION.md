# Buyology E-Commerce Dashboard - Module Documentation

## Overview

The Buyology E-Commerce Dashboard is a comprehensive React-based admin interface built with TypeScript, Vite, and Tailwind CSS. It provides administrators with tools to manage all aspects of an e-commerce platform, including products, stores, users, couriers, content, and analytics. The dashboard integrates with a backend API for data management and supports features like authentication, file uploads, real-time updates, and responsive design.

This documentation outlines each module, the specific jobs they accomplish, the pages/components they include, and the functionality they provide.

## Authentication Module

**Job Done:** Handles user authentication and session management for admin users.

### Features
- Secure login/logout with JWT tokens
- Automatic token refresh for session persistence
- Protected routes requiring admin authentication
- Session expiry handling with automatic redirect to login

### Pages/Components
- `SignIn` - Login form with email/password
- `SignUp` - Registration form for new admin accounts
- `ProtectedRoute` - Route wrapper that checks authentication status

### API Integration
- POST `/auth/login` - User authentication
- POST `/auth/refresh` - Token refresh
- GET `/auth/me` - Current user info

## Dashboard/Home Module

**Job Done:** Provides an overview of key business metrics and recent activity for quick insights.

### Features
- Real-time statistics display (total sales, orders, users, etc.)
- Interactive charts for sales trends and analytics
- Recent orders and activities feed
- Quick access to common admin tasks

### Pages/Components
- `Home` - Main dashboard page with metrics and charts

### API Integration
- GET `/dashboard/stats` - Dashboard statistics
- GET `/dashboard/recent-activity` - Recent orders/activities

## Products Module

**Job Done:** Manages the entire product catalog, including creation, editing, categorization, and quality control.

### Features
- Full CRUD operations for products
- Product categorization and branding
- Specification management
- Image upload and management
- Product reviews and Q&A moderation
- Bulk operations and search/filtering

### Pages/Components
- `Products` - Product listing with pagination, search, and filters
- `ProductDetail` - Individual product view and editing
- `NewProduct` - Product creation form with file uploads
- `ProductsTrash` - Deleted products management
- `Categories` - Product category management
- `Brands` - Brand management
- `Specs` - Product specifications management
- `Reviews` - Product review moderation
- `Questions` - Product Q&A management

### API Integration
- GET `/products` - List products with filters
- POST `/products` - Create new product
- GET `/products/{id}` - Get product details
- PATCH `/products/{id}` - Update product
- DELETE `/products/{id}` - Delete product
- GET `/categories` - List categories
- POST `/categories` - Create category
- GET `/brands` - List brands
- POST `/brands` - Create brand
- GET `/specs` - List specifications
- POST `/specs` - Create specification
- GET `/reviews` - List reviews
- PATCH `/reviews/{id}` - Moderate review
- GET `/questions` - List questions
- PATCH `/questions/{id}` - Answer question

## Stores Module

**Job Done:** Manages store partnerships, locations, and product assignments for multi-vendor marketplace operations.

### Features
- Store onboarding and profile management
- Geographic store distribution management
- Product assignment to stores
- Store performance tracking
- Country/region management for localization

### Pages/Components
- `Stores` - Store listing and management
- `NewStore` - Store creation form
- `StoreDetail` - Individual store profile and settings
- `StoreProducts` - Products assigned to a store
- `AssignProduct` - Product assignment interface
- `Countries` - Country/region management

### API Integration
- GET `/stores` - List stores
- POST `/stores` - Create new store
- GET `/stores/{id}` - Get store details
- PATCH `/stores/{id}` - Update store
- DELETE `/stores/{id}` - Delete store
- GET `/stores/{id}/products` - Get store products
- POST `/stores/{id}/products` - Assign product to store
- DELETE `/stores/{id}/products/{productId}` - Remove product from store
- GET `/countries` - List countries
- POST `/countries` - Create country entry

## Users Module

**Job Done:** Manages customer accounts and admin user permissions for platform access control.

### Features
- Customer account management and support
- Admin user role management
- User profile viewing and editing
- Account status management (active/suspended)

### Pages/Components
- `Users` - Customer user listing and management
- `UserDetail` - Individual customer profile
- `Admins` - Admin user listing
- `AdminDetail` - Individual admin profile and permissions

### API Integration
- GET `/users` - List users
- GET `/users/{id}` - Get user details
- PATCH `/users/{id}` - Update user
- GET `/admins` - List admin users
- GET `/admins/{id}` - Get admin details
- PATCH `/admins/{id}` - Update admin permissions

## Couriers Module

**Job Done:** Manages delivery personnel accounts, vehicle information, and operational status for order fulfillment.

### Features
- Courier account creation with document verification
- Vehicle type and registration management
- Driving license verification for motorized vehicles
- Real-time availability status management
- Courier performance tracking
- Operational status control (active/suspended/offline)

### Pages/Components
- `Couriers` - Courier listing with filters and search
- `CourierDetail` - Individual courier profile and management
- `NewCourier` - Courier registration form with file uploads
- `EditCourier` - Courier profile editing

### API Integration
- GET `/api/admin/couriers` - List couriers with filters
- POST `/api/admin/couriers` - Create courier (multipart)
- GET `/api/admin/couriers/{id}` - Get courier details
- PATCH `/api/admin/couriers/{id}` - Update courier profile (multipart)
- PATCH `/api/admin/couriers/{id}/status` - Update operational status
- PATCH `/api/admin/couriers/{id}/availability` - Toggle availability
- DELETE `/api/admin/couriers/{id}` - Delete courier

### File Upload Support
- Profile images (JPEG/PNG/WebP, max 10MB)
- Vehicle registration documents
- Driving licence front/back images (required for scooters/cars)

## Stories Module

**Job Done:** Manages content marketing through story creation and publishing for user engagement.

### Features
- Story creation and editing
- Media upload and management
- Story publishing workflow
- Content moderation

### Pages/Components
- `Stories` - Story listing and management
- `NewStory` - Story creation form

### API Integration
- GET `/stories` - List stories
- POST `/stories` - Create new story
- GET `/stories/{id}` - Get story details
- PATCH `/stories/{id}` - Update story
- DELETE `/stories/{id}` - Delete story

## Other Utility Modules

### Calendar Module
**Job Done:** Provides scheduling and event management capabilities.

- `Calendar` - Calendar interface for scheduling

### User Profiles Module
**Job Done:** Allows admin users to manage their own profiles and settings.

- `UserProfiles` - Admin profile management

### UI Elements Module
**Job Done:** Showcases and tests UI components for design consistency.

- `Videos`, `Images`, `Alerts`, `Badges`, `Avatars`, `Buttons` - Component demos
- `LineChart`, `BarChart` - Chart component examples

### Forms Module
**Job Done:** Demonstrates form handling and validation patterns.

- `FormElements` - Form component examples

### Tables Module
**Job Done:** Shows data table implementations with sorting and pagination.

- `BasicTables` - Table component examples

### Other Pages
- `Blank` - Empty page template
- `NotFound` - 404 error page

## Shared Components

### Common Components
- `PageMeta` - SEO and meta tag management
- `PageBreadcrumb` - Navigation breadcrumbs
- `ProtectedRoute` - Authentication guard
- `ScrollToTop` - Auto-scroll to top on navigation
- `ThemeToggleButton` - Dark/light theme switching

### Form Components
- `Form`, `Label`, `Select`, `MultiSelect`, `DatePicker` - Form elements

### UI Components
- `Badge`, `Button`, `Card` - Basic UI elements
- `ChartTab` - Chart display wrapper

### Layout Components
- `AppHeader`, `AppSidebar`, `AppLayout` - Main layout structure
- `Backdrop`, `SidebarWidget` - Layout helpers

## Technical Architecture

### Frontend Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with custom components
- **State Management:** React Context (Auth, Theme, Sidebar)
- **Routing:** React Router v6
- **HTTP Client:** Custom HttpClient with automatic token refresh
- **File Handling:** Native FormData for multipart uploads

### API Integration
- **Base URL:** Configurable via `VITE_API_BASE_URL`
- **Authentication:** JWT Bearer tokens with refresh
- **Error Handling:** Centralized error management with user feedback
- **File Uploads:** Multipart/form-data support for images and documents

### Environment Configuration
- `VITE_API_BASE_URL` - Backend API endpoint
- `VITE_COURIER_IMAGE_BASE_URL` - Courier image serving URL (optional)

### Build and Deployment
- **Development:** Hot reload with Vite dev server
- **Production:** Static build optimized for performance
- **Proxy:** Development proxy for API requests to avoid CORS

## Security Features

- JWT-based authentication with automatic refresh
- Protected routes requiring admin roles
- Secure file upload validation (type, size limits)
- CSRF protection via HttpOnly cookies
- Input validation and sanitization
- Role-based access control

## Performance Optimizations

- Lazy loading of routes and components
- Image optimization and responsive loading
- Efficient API calls with caching where appropriate
- Minimal bundle size through tree shaking
- Fast build times with Vite

## Accessibility and UX

- Responsive design for all device sizes
- Keyboard navigation support
- Screen reader friendly components
- Loading states and error handling
- Intuitive navigation and user flows
- Dark/light theme support

This documentation covers all major modules and their functionalities. Each module is designed to handle specific business operations while maintaining consistency in user experience and technical implementation.