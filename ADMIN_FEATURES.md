# Admin Features Documentation

## Overview

The KLTN Coliving platform now includes comprehensive admin functionality for managing users, rooms, and system-wide operations. This document outlines all admin features and how to use them.

## Features Implemented

### 1. User Account Management

#### 1.1 View Users
- **Endpoint**: `GET /api/admin/users`
- **Authentication**: Required (ADMIN role)
- **Features**:
  - List all users with pagination (default: 20 per page)
  - Filter by role (CUSTOMER, HOST, ADMIN)
  - Filter by status (ACTIVE, LOCKED, DELETED)
  - Search by name, email, or phone
  - View user statistics (bookings count, rooms count)

**Response Example**:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "fullName": "User Full Name",
      "phone": "+84...",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "createdAt": "2026-05-07T...",
      "updatedAt": "2026-05-07T...",
      "_count": {
        "bookings": 5,
        "rooms": 0
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

#### 1.2 Lock User Account
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Action**: `lock`
- **Purpose**: Prevent a user from accessing the platform
- **Use Cases**: 
  - User violation of terms
  - Fraudulent activity
  - Payment default

**Request Body**:
```json
{
  "action": "lock",
  "reason": "Violation of community guidelines"
}
```

#### 1.3 Unlock User Account
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Action**: `unlock`
- **Purpose**: Restore access to a locked account

**Request Body**:
```json
{
  "action": "unlock",
  "reason": "Issue resolved"
}
```

#### 1.4 Delete User Account (Soft Delete)
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Action**: `delete`
- **Purpose**: Mark account as deleted (data is preserved, not hard deleted)
- **Business Rule**: Soft delete recommended for audit trail and data retention

**Request Body**:
```json
{
  "action": "delete",
  "reason": "User requested account deletion"
}
```

#### 1.5 Update User Role/Permissions
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Action**: `update_role`
- **Available Roles**: `CUSTOMER`, `HOST`, `ADMIN`

**Request Body**:
```json
{
  "action": "update_role",
  "newRole": "HOST",
  "reason": "User upgraded to landlord"
}
```

### 2. System Dashboard

**Access**: `GET /admin`

The admin dashboard displays real-time statistics:

#### User Statistics
- Total users in system
- Number of active tenants (CUSTOMER role)
- Number of active landlords (HOST role)
- Number of locked accounts
- Number of deleted accounts
- New users this month
- Monthly user growth trend (12 months)

#### Room Statistics
- Total rooms in system
- Available rooms (ready for booking)
- Occupied rooms (actively booked)
- Pending rooms (awaiting approval)
- Hidden rooms (not listed)

#### Revenue Statistics
- Total revenue from completed bookings
- Total completed bookings count
- Average revenue per booking

### 3. User Management Interface

**Access**: `GET /admin/users`

Interactive dashboard for managing users:

#### Features
- Real-time search and filtering
- Filter by role and status
- Paginated user list
- Quick action buttons (Lock/Unlock/Delete)
- Confirmation dialogs for sensitive actions
- User statistics at a glance

#### User Details Displayed
- Email and full name
- Phone number
- Role and status with color coding
- Number of bookings and rooms
- Account creation date

### 4. Reports & Analytics

**Access**: `GET /admin/reports`

Comprehensive reporting interface with:

#### User Reports
- User growth statistics
- Monthly new user registrations
- Breakdown by role (tenants vs. landlords)
- Locked vs. active account counts

#### Room Reports
- Room status distribution
- Available vs. occupied ratio
- Pending approval count
- Hidden rooms count

#### Summary Metrics
- User growth (new users this month)
- Room utilization rate (%)
- Average revenue per booking

### 5. Audit Logs

**Access**: `GET /admin/logs`

Complete audit trail for all admin actions:

#### Logged Information
- Admin who performed the action
- Action type (lock_user, unlock_user, delete_user, update_user_role, etc.)
- Target user/entity affected
- Old and new values (JSON)
- Reason/description provided
- IP address and user agent
- Timestamp of action

#### Query Capabilities
- Filter by action type
- Filter by target type (user, room, booking)
- Filter by admin user
- Pagination support

**API Endpoint**: `GET /api/admin/logs`

### 6. Statistics Endpoints

#### User Statistics
**Endpoint**: `GET /api/admin/stats/users`

Returns:
```json
{
  "total": 100,
  "tenants": 70,
  "landlords": 25,
  "locked": 3,
  "deleted": 2,
  "newThisMonth": 15,
  "byMonth": [
    { "month": "2026-05", "count": 15 },
    // ... 11 more months
  ]
}
```

#### Room Statistics
**Endpoint**: `GET /api/admin/stats/rooms`

Returns:
```json
{
  "total": 500,
  "available": 120,
  "occupied": 350,
  "pending": 20,
  "hidden": 10,
  "revenue": {
    "total": 1500000,
    "completedBookings": 450
  }
}
```

## Database Schema Changes

### New User Status Enum
```prisma
enum UserStatus {
  ACTIVE
  LOCKED
  DELETED
}
```

### Updated Room Status Enum
```prisma
enum RoomStatus {
  AVAILABLE
  OCCUPIED
  PENDING
  HIDDEN
}
```

### AdminLog Model
```prisma
model AdminLog {
  id           String   @id @default(uuid())
  adminId      String
  admin        User     @relation("AdminAction", ...)
  targetUserId String?
  targetUser   User?    @relation("AffectedUser", ...)
  action       String
  targetId     String?
  targetType   String
  oldValue     String?
  newValue     String?
  description  String?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())
}
```

## Security Considerations

1. **Admin-Only Access**: All admin endpoints require ADMIN role token
2. **Audit Trail**: All actions are logged with admin information
3. **Soft Deletes**: User data is preserved for audit purposes
4. **Rate Limiting**: Recommended to implement rate limiting on admin endpoints
5. **IP Logging**: Admin actions log IP address for security investigation

## API Authentication

All admin endpoints require:
- **Header**: `Authorization: Bearer <jwt_token>`
- **Token Must Have**: `role: ADMIN`

Example:
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  https://api.example.com/api/admin/users`
``

## Frontend Components

### AdminProtectedRoute
- Client-side protection wrapper
- Redirects non-admin users to login page
- Shows loading state during auth verification

### Admin Layout
- Persistent sidebar navigation
- Collapsible menu for mobile
- Responsive design
- Quick access to all admin sections

## Usage Examples

### Lock a User
```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "lock",
    "reason": "Suspicious activity detected"
  }' \
  https://api.example.com/api/admin/users/user-id
```

### Get User Statistics
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/api/admin/stats/users
```

### Search Users
```bash
curl -H "Authorization: Bearer <token>" \
  'https://api.example.com/api/admin/users?search=john&status=ACTIVE&page=1'
```

## Future Enhancements

- Email notifications for admin actions
- Batch operations for multiple users
- Advanced filtering and export functionality
- Custom date range reports
- Room approval workflow
- Payment dispute handling
- User behavior analytics
- Scheduled automated reports

## Business Rules

1. **No Hard Deletes**: User data is soft-deleted for compliance and audit purposes
2. **Admin Logging**: Every admin action is logged with timestamp and reason
3. **Role Hierarchy**: Admins can manage all user roles
4. **Status Transitions**:
   - ACTIVE ↔ LOCKED (reversible)
   - Any status → DELETED (one-way)
5. **Data Preservation**: Locked users retain their data but cannot access the platform

## Support & Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Verify JWT token in Authorization header
   - Confirm user has ADMIN role
   - Check token hasn't expired

2. **Statistics Not Loading**
   - Verify database connectivity
   - Check pagination parameters
   - Ensure sufficient permissions

3. **Audit Logs Not Recording**
   - Verify AdminLog table exists
   - Check target user/entity exists
   - Verify admin user ID is valid

For more help, refer to the main [README.md](./README.md) and [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
