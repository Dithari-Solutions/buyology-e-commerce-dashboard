# Buyology E-Commerce Dashboard - API Services List

This document provides a comprehensive list of all API services used in the Buyology E-Commerce Dashboard. Each service handles specific business logic and API interactions for different modules of the application.

## Services Overview

The services are organized in the `src/api/services/` directory and provide a clean abstraction layer between the UI components and the backend API. Each service includes methods for CRUD operations, data normalization, and error handling.

## Complete Services List

### 1. Authentication Service (`auth.service.ts`)
- **Purpose:** Handles user authentication, login/logout, and session management
- **Key Methods:**
  - `login(credentials)` - User authentication
  - `logout()` - Session termination
  - `refreshToken()` - JWT token refresh
  - `getCurrentUser()` - Get authenticated user info

### 2. Brands Service (`brands.service.ts`)
- **Purpose:** Manages product brands and manufacturer information
- **Key Methods:**
  - `getBrands()` - List all brands
  - `createBrand(data)` - Create new brand
  - `updateBrand(id, data)` - Update brand information
  - `deleteBrand(id)` - Remove brand

### 3. Categories Service (`categories.service.ts`)
- **Purpose:** Handles product categorization and category hierarchy
- **Key Methods:**
  - `getCategories()` - List all categories
  - `createCategory(data)` - Create new category
  - `updateCategory(id, data)` - Update category
  - `deleteCategory(id)` - Remove category

### 4. Couriers Service (`couriers.service.ts`)
- **Purpose:** Manages delivery personnel, vehicles, and operational status
- **Key Methods:**
  - `getCouriers(params)` - List couriers with filters
  - `getCourierById(id)` - Get courier details
  - `createCourier(data)` - Create new courier (multipart)
  - `updateCourier(id, data)` - Update courier profile (multipart)
  - `updateCourierStatus(id, status)` - Update operational status
  - `toggleAvailability(id)` - Toggle courier availability
  - `deleteCourier(id)` - Remove courier

### 5. Products Service (`products.service.ts`)
- **Purpose:** Manages the complete product catalog and inventory
- **Key Methods:**
  - `getProducts(params)` - List products with filters/pagination
  - `getProductById(id)` - Get detailed product information
  - `createProduct(data)` - Create new product (multipart)
  - `updateProduct(id, data)` - Update product information
  - `deleteProduct(id)` - Soft delete product
  - `restoreProduct(id)` - Restore deleted product

### 6. Questions Service (`questions.service.ts`)
- **Purpose:** Handles product Q&A functionality and customer inquiries
- **Key Methods:**
  - `getQuestions(params)` - List questions with filters
  - `getQuestionById(id)` - Get question details
  - `answerQuestion(id, answer)` - Provide answer to question
  - `deleteQuestion(id)` - Remove question

### 7. Reviews Service (`reviews.service.ts`)
- **Purpose:** Manages product reviews and ratings moderation
- **Key Methods:**
  - `getReviews(params)` - List reviews with filters
  - `getReviewById(id)` - Get review details
  - `moderateReview(id, action)` - Approve/reject review
  - `deleteReview(id)` - Remove review

### 8. Roles Service (`roles.service.ts`)
- **Purpose:** Manages user roles and permissions for admin access control
- **Key Methods:**
  - `getRoles()` - List all available roles
  - `createRole(data)` - Create new role
  - `updateRole(id, data)` - Update role permissions
  - `deleteRole(id)` - Remove role

### 9. Specifications Service (`specs.service.ts`)
- **Purpose:** Handles product specifications and technical details
- **Key Methods:**
  - `getSpecs()` - List all specifications
  - `createSpec(data)` - Create new specification
  - `updateSpec(id, data)` - Update specification
  - `deleteSpec(id)` - Remove specification

### 10. Store Products Service (`storeProducts.service.ts`)
- **Purpose:** Manages product assignments to specific stores in multi-vendor setup
- **Key Methods:**
  - `getStoreProducts(storeId, params)` - List products for a store
  - `assignProductToStore(storeId, productId)` - Assign product to store
  - `removeProductFromStore(storeId, productId)` - Remove product from store
  - `bulkAssignProducts(storeId, productIds)` - Bulk product assignment

### 11. Stores Service (`stores.service.ts`)
- **Purpose:** Manages store partnerships and multi-vendor marketplace operations
- **Key Methods:**
  - `getStores(params)` - List stores with filters
  - `getStoreById(id)` - Get store details
  - `createStore(data)` - Create new store
  - `updateStore(id, data)` - Update store information
  - `deleteStore(id)` - Remove store

### 12. Stories Service (`stories.service.ts`)
- **Purpose:** Handles content marketing through story creation and management
- **Key Methods:**
  - `getStories(params)` - List stories with filters
  - `getStoryById(id)` - Get story details
  - `createStory(data)` - Create new story (multipart)
  - `updateStory(id, data)` - Update story content
  - `deleteStory(id)` - Remove story

### 13. Users Service (`users.service.ts`)
- **Purpose:** Manages customer accounts and user data
- **Key Methods:**
  - `getUsers(params)` - List users with filters
  - `getUserById(id)` - Get user details
  - `updateUser(id, data)` - Update user information
  - `deleteUser(id)` - Remove user account

## Service Architecture

### Common Patterns
- **HTTP Client:** All services use a shared `HttpClient` instance with automatic JWT token handling
- **Error Handling:** Centralized error management with user-friendly messages
- **Data Normalization:** Services normalize API responses for consistent UI consumption
- **File Upload Support:** Services support multipart/form-data for image and document uploads

### API Base Configuration
- **Base URL:** Configured via `VITE_API_BASE_URL` environment variable
- **Authentication:** JWT Bearer tokens with automatic refresh
- **Content Types:** JSON for standard requests, multipart/form-data for file uploads

### Response Normalization
Most services include normalization functions to transform API responses into consistent data structures:
- `normalizeSummary()` - For list views
- `normalizeDetail()` - For detailed views
- `normalizeForForm()` - For form pre-population

## Dependencies

All services depend on:
- `src/api/client.ts` - HTTP client with authentication
- `src/config/env.ts` - Environment configuration
- `src/api/types/api.types.ts` - Shared type definitions

## Usage Example

```typescript
import { couriersService } from '@/api/services/couriers.service';

// Get list of couriers
const couriers = await couriersService.getCouriers({ status: 'active' });

// Create new courier with file uploads
const formData = new FormData();
formData.append('name', 'John Doe');
formData.append('profileImage', imageFile);

const newCourier = await couriersService.createCourier(formData);
```

This services list provides a complete reference for all API interactions in the Buyology E-Commerce Dashboard.