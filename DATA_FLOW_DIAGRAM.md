# Data Flow Diagram (DFD) - Restaurant Management System

## Table of Contents
1. [Level 0 - Context Diagram](#level-0---context-diagram)
2. [Level 1 - System Decomposition](#level-1---system-decomposition)
3. [Level 2 - Detailed Process Decomposition](#level-2---detailed-process-decomposition)

---

## Level 0 - Context Diagram

### Description
The Context Diagram shows the Restaurant Management System as a single process with all external entities and data flows.

### External Entities:
1. **Customer** - End user who browses restaurants, places orders, makes reservations
2. **Restaurant Admin** - Restaurant owner/manager who manages their restaurant operations
3. **System Admin** - System administrator who manages restaurants and users
4. **Payment Gateway (Stripe)** - External payment processing service
5. **Database** - Data storage system

### Data Flows:

#### Customer ↔ System:
- **Input Flows:**
  - Login credentials
  - Registration data
  - Restaurant search requests
  - Order requests
  - Reservation requests
  - Payment information
  - Review submissions
  - Table selection

- **Output Flows:**
  - Authentication responses
  - Restaurant listings
  - Menu information
  - Order confirmations
  - Reservation confirmations
  - Payment receipts
  - Order status updates
  - Reservation status updates

#### Restaurant Admin ↔ System:
- **Input Flows:**
  - Login credentials
  - Restaurant profile data
  - Table management data
  - Meal management data
  - Order status updates
  - Reservation status updates
  - Review responses

- **Output Flows:**
  - Authentication responses
  - Dashboard analytics
  - Order notifications
  - Reservation notifications
  - Table availability status
  - Revenue reports

#### System Admin ↔ System:
- **Input Flows:**
  - Login credentials
  - Restaurant approval/rejection
  - User management actions

- **Output Flows:**
  - Authentication responses
  - Restaurant listings
  - User listings
  - System reports

#### Payment Gateway ↔ System:
- **Input Flows:**
  - Payment requests
  - Transaction data

- **Output Flows:**
  - Payment confirmations
  - Transaction IDs
  - Payment status

#### Database ↔ System:
- **Input Flows:**
  - Data queries
  - Data updates
  - Data inserts
  - Data deletes

- **Output Flows:**
  - Query results
  - Data records
  - Confirmation messages

---

## Level 1 - System Decomposition

### Description
Level 1 DFD breaks down the Restaurant Management System into major functional processes and data stores.

### Processes:

#### 1.0 **User Authentication & Management**
- Handles user login, registration, password reset
- Manages user profiles and roles
- **Input:** Login credentials, registration data, password reset requests
- **Output:** Authentication tokens, user profiles, session data
- **Data Stores:** D1: Users

#### 2.0 **Restaurant Management**
- Manages restaurant profiles, registration, and approval
- Handles restaurant information updates
- **Input:** Restaurant registration data, profile updates, approval/rejection
- **Output:** Restaurant listings, restaurant details, approval status
- **Data Stores:** D2: Restaurants

#### 3.0 **Table Management**
- Manages restaurant tables (create, update, delete)
- Tracks table availability and status
- Handles table selection by customers
- **Input:** Table data, table selection, status updates
- **Output:** Table listings, availability status, table details
- **Data Stores:** D3: Tables

#### 4.0 **Meal Management**
- Manages restaurant menu items
- Handles meal creation, updates, availability
- **Input:** Meal data, category information, availability updates
- **Output:** Menu listings, meal details, category items
- **Data Stores:** D4: Meals

#### 5.0 **Order Management**
- Processes customer orders
- Manages order lifecycle (Pending → Preparing → Ready → Served → Completed)
- Handles order status updates
- **Input:** Order requests, order items, status updates
- **Output:** Order confirmations, order status, order history
- **Data Stores:** D5: Orders, D6: OrderItems

#### 6.0 **Reservation Management**
- Handles table reservations
- Manages reservation lifecycle (Pending → Confirmed → Arrived → Completed)
- Processes reservation requests and confirmations
- **Input:** Reservation requests, time suggestions, status updates
- **Output:** Reservation confirmations, reservation status, availability
- **Data Stores:** D7: Reservations

#### 7.0 **Payment Processing**
- Processes payments for orders
- Integrates with payment gateway
- Manages payment history
- **Input:** Payment requests, payment method, transaction data
- **Output:** Payment confirmations, receipts, payment history
- **Data Stores:** D8: Payments
- **External:** Payment Gateway

#### 8.0 **Review Management**
- Handles customer reviews and ratings
- Manages review submissions and responses
- **Input:** Review data, ratings, responses
- **Output:** Review listings, average ratings, review details
- **Data Stores:** D9: Reviews

#### 9.0 **Analytics & Reporting**
- Generates restaurant analytics
- Provides revenue reports and statistics
- Tracks popular items and trends
- **Input:** Order data, payment data, reservation data
- **Output:** Analytics reports, revenue statistics, popular items
- **Data Stores:** D5: Orders, D8: Payments, D7: Reservations

### Data Stores:
- **D1: Users** - User accounts, profiles, authentication data
- **D2: Restaurants** - Restaurant information, profiles, settings
- **D3: Tables** - Table information, capacity, status
- **D4: Meals** - Menu items, prices, categories, availability
- **D5: Orders** - Order records, status, totals
- **D6: OrderItems** - Individual order line items
- **D7: Reservations** - Reservation records, dates, times, status
- **D8: Payments** - Payment records, transactions, methods
- **D9: Reviews** - Customer reviews, ratings, responses

### Data Flows Between Processes:

**1.0 ↔ 2.0:** User role verification for restaurant access
**1.0 ↔ 5.0:** Customer information for orders
**1.0 ↔ 6.0:** Customer information for reservations
**2.0 ↔ 3.0:** Restaurant ID for table management
**2.0 ↔ 4.0:** Restaurant ID for meal management
**2.0 ↔ 5.0:** Restaurant information for orders
**2.0 ↔ 6.0:** Restaurant information for reservations
**3.0 ↔ 5.0:** Table status updates when orders placed
**3.0 ↔ 6.0:** Table availability for reservations
**4.0 ↔ 5.0:** Meal information for orders
**5.0 ↔ 7.0:** Order information for payments
**5.0 ↔ 8.0:** Order information for reviews
**7.0 ↔ 9.0:** Payment data for analytics
**5.0 ↔ 9.0:** Order data for analytics
**6.0 ↔ 9.0:** Reservation data for analytics

---

## Level 2 - Detailed Process Decomposition

### 1.0 User Authentication & Management Process (Level 2)

#### Description
Detailed breakdown of the User Authentication & Management process showing all user-related operations including registration, authentication, profile management, and user administration.

#### Sub-Processes:

##### 1.1 **User Registration**
- Validates registration data (name, email, password, phone)
- Checks email uniqueness in database
- Validates password strength requirements
- Hashes password using secure algorithm
- Creates user account with default role
- Generates authentication token
- Links restaurant admin to restaurant if applicable
- **Input:** Full Name, Email, Password, Phone Number, User Type, Restaurant ID (optional)
- **Output:** User ID, Registration Confirmation, Authentication Token, User Profile
- **Data Stores:** D1: Users, D2: Restaurants (if RestaurantAdmin)
- **External:** Email Service (welcome email)

##### 1.2 **User Login**
- Validates email format
- Retrieves user by email
- Verifies password hash
- Checks account status (active/disabled)
- Generates JWT authentication token
- Creates session record
- Returns user profile with role information
- **Input:** Email, Password
- **Output:** Authentication Token, User Profile, Role Information, Session ID, Restaurant ID (if admin)
- **Data Stores:** D1: Users, D2: Restaurants

##### 1.3 **Password Reset Request**
- Validates email exists
- Generates secure reset token
- Sets token expiration (e.g., 1 hour)
- Stores token in user record
- Sends password reset email with token link
- **Input:** Email
- **Output:** Reset Token, Email Sent Confirmation, Token Expiration
- **Data Stores:** D1: Users
- **External:** Email Service

##### 1.4 **Password Reset Complete**
- Validates reset token
- Checks token expiration
- Validates new password strength
- Hashes new password
- Updates user password
- Clears reset token
- **Input:** Reset Token, New Password
- **Output:** Password Update Confirmation, Login Redirect
- **Data Stores:** D1: Users

##### 1.5 **Retrieve User Profile**
- Validates user authentication
- Fetches user information
- Includes role and permissions
- Includes restaurant association (if admin)
- Returns complete profile
- **Input:** User ID, Authentication Token
- **Output:** User Profile, Role, Restaurant Info (if applicable)
- **Data Stores:** D1: Users, D2: Restaurants

##### 1.6 **Update User Profile**
- Validates user authentication
- Validates update permissions
- Updates allowed fields (name, phone)
- Maintains email uniqueness
- Returns updated profile
- **Input:** User ID, Updated Fields (Name, Phone)
- **Output:** Updated User Profile, Confirmation
- **Data Stores:** D1: Users

##### 1.7 **Admin: Get All Users**
- Validates admin role
- Fetches all users with filters
- Applies role filter (Customer/RestaurantAdmin/Admin)
- Includes restaurant associations
- Paginates results
- **Input:** Role Filter (optional), Page Number, Page Size
- **Output:** User List, Total Count, Pagination Info
- **Data Stores:** D1: Users, D2: Restaurants

##### 1.8 **Admin: Delete User**
- Validates admin role
- Checks for associated records (orders, reviews, reservations)
- Prevents deletion if dependencies exist
- Soft delete or hard delete based on policy
- Returns deletion confirmation
- **Input:** User ID
- **Output:** Deletion Confirmation, Error Message (if dependencies)
- **Data Stores:** D1: Users

#### Data Flows:
- **1.1 → D1:** Create user record
- **1.1 → D1:** Check email uniqueness
- **1.1 → D2:** Link restaurant (if RestaurantAdmin)
- **1.1 → Email Service:** Send welcome email
- **1.2 → D1:** Validate credentials
- **1.2 → D1:** Read user profile
- **1.2 → D2:** Read restaurant association
- **1.3 → D1:** Generate and store reset token
- **1.3 → Email Service:** Send reset email
- **1.4 → D1:** Validate token
- **1.4 → D1:** Update password
- **1.5 → D1:** Read user profile
- **1.5 → D2:** Read restaurant info
- **1.6 → D1:** Update user fields
- **1.7 → D1:** Read all users
- **1.7 → D2:** Read restaurant associations
- **1.8 → D1:** Check dependencies
- **1.8 → D1:** Delete user

---

### 2.0 Restaurant Management Process (Level 2)

#### Description
Detailed breakdown of the Restaurant Management process showing restaurant registration, approval, profile management, and information retrieval.

#### Sub-Processes:

##### 2.1 **Restaurant Registration**
- Validates restaurant data (name, address, contact)
- Checks restaurant name uniqueness
- Creates restaurant record with Pending status
- Links restaurant admin user to restaurant
- Sets default operating hours
- **Input:** Restaurant Name, Address, Phone, Email, Restaurant Admin User ID
- **Output:** Restaurant ID, Registration Confirmation, Status (Pending)
- **Data Stores:** D2: Restaurants, D1: Users

##### 2.2 **Admin: Approve Restaurant**
- Validates admin role
- Updates restaurant status to Approved
- Activates restaurant for operations
- Notifies restaurant admin
- **Input:** Restaurant ID, Approval Decision
- **Output:** Approval Confirmation, Status Update, Notification
- **Data Stores:** D2: Restaurants
- **External:** Email Service (notification)

##### 2.3 **Admin: Reject Restaurant**
- Validates admin role
- Updates restaurant status to Rejected
- Optionally stores rejection reason
- Notifies restaurant admin
- **Input:** Restaurant ID, Rejection Reason (optional)
- **Output:** Rejection Confirmation, Status Update, Notification
- **Data Stores:** D2: Restaurants
- **External:** Email Service (notification)

##### 2.4 **Restaurant Admin: Update Profile**
- Validates restaurant admin role
- Validates restaurant ownership
- Updates restaurant information
- Updates operating hours
- Updates contact information
- **Input:** Restaurant ID, Updated Fields (Name, Address, Phone, Email, Hours)
- **Output:** Updated Restaurant Profile, Confirmation
- **Data Stores:** D2: Restaurants

##### 2.5 **Get Restaurant Details**
- Validates restaurant exists
- Fetches complete restaurant information
- Includes operating hours
- Includes status
- Returns restaurant profile
- **Input:** Restaurant ID
- **Output:** Restaurant Details, Operating Hours, Status
- **Data Stores:** D2: Restaurants

##### 2.6 **Get All Restaurants (Public)**
- Fetches approved restaurants only
- Applies optional filters (location, cuisine)
- Sorts by popularity or name
- Paginates results
- Returns restaurant list
- **Input:** Status Filter (Approved), Location Filter (optional), Page Number
- **Output:** Restaurant List, Total Count
- **Data Stores:** D2: Restaurants

##### 2.7 **Admin: Get All Restaurants**
- Validates admin role
- Fetches all restaurants (all statuses)
- Includes status information
- Includes summary statistics
- **Input:** Status Filter (optional), Page Number
- **Output:** Restaurant List with Status, Summary Stats
- **Data Stores:** D2: Restaurants, D3: Tables, D4: Meals, D5: Orders

##### 2.8 **Admin: Get Restaurant Summary**
- Validates admin role
- Fetches restaurant details
- Calculates table count
- Calculates meal count
- Calculates open orders
- Calculates total revenue
- Returns summary statistics
- **Input:** Restaurant ID
- **Output:** Restaurant Summary (Tables, Meals, Orders, Revenue)
- **Data Stores:** D2: Restaurants, D3: Tables, D4: Meals, D5: Orders, D8: Payments

#### Data Flows:
- **2.1 → D2:** Create restaurant record
- **2.1 → D1:** Link restaurant admin
- **2.2 → D2:** Update status to Approved
- **2.2 → Email Service:** Send approval notification
- **2.3 → D2:** Update status to Rejected
- **2.3 → Email Service:** Send rejection notification
- **2.4 → D2:** Update restaurant profile
- **2.5 → D2:** Read restaurant details
- **2.6 → D2:** Read approved restaurants
- **2.7 → D2:** Read all restaurants
- **2.7 → D3:** Count tables
- **2.7 → D4:** Count meals
- **2.7 → D5:** Count orders
- **2.8 → D2:** Read restaurant
- **2.8 → D3:** Count tables
- **2.8 → D4:** Count meals
- **2.8 → D5:** Count open orders
- **2.8 → D8:** Calculate revenue

---

### 3.0 Table Management Process (Level 2)

#### Description
Detailed breakdown of the Table Management process showing table creation, updates, availability tracking, and customer table selection.

#### Sub-Processes:

##### 3.1 **Restaurant Admin: Create Table**
- Validates restaurant admin role
- Validates restaurant ownership
- Validates table number uniqueness within restaurant
- Creates table record
- Sets initial status to Available
- **Input:** Restaurant ID, Table Number, Capacity
- **Output:** Table ID, Table Details, Confirmation
- **Data Stores:** D3: Tables

##### 3.2 **Restaurant Admin: Update Table**
- Validates restaurant admin role
- Validates table ownership
- Updates table information
- Updates capacity if needed
- **Input:** Table ID, Updated Fields (Table Number, Capacity)
- **Output:** Updated Table Details, Confirmation
- **Data Stores:** D3: Tables

##### 3.3 **Restaurant Admin: Delete Table**
- Validates restaurant admin role
- Validates table ownership
- Checks for active orders/reservations
- Prevents deletion if table is in use
- Deletes table record
- **Input:** Table ID
- **Output:** Deletion Confirmation, Error (if in use)
- **Data Stores:** D3: Tables, D5: Orders, D7: Reservations

##### 3.4 **Get Restaurant Tables**
- Fetches all tables for a restaurant
- Includes table status
- Includes capacity information
- Returns table list
- **Input:** Restaurant ID
- **Output:** Table List with Status and Capacity
- **Data Stores:** D3: Tables

##### 3.5 **Get Available Tables**
- Fetches available tables for a restaurant
- Filters by status = Available
- Returns available table list
- **Input:** Restaurant ID
- **Output:** Available Table List
- **Data Stores:** D3: Tables

##### 3.6 **Customer: Select Table**
- Validates customer authentication (optional)
- Validates table availability
- Updates table status to Occupied
- Creates session/cart association
- Returns table selection confirmation
- **Input:** Restaurant ID, Table ID, Customer ID (optional)
- **Output:** Table Selection Confirmation, Table Details
- **Data Stores:** D3: Tables

##### 3.7 **Customer: Leave Table**
- Validates table selection
- Updates table status to Available
- Clears cart/session data
- Returns confirmation
- **Input:** Table ID
- **Output:** Leave Confirmation, Table Status Update
- **Data Stores:** D3: Tables

##### 3.8 **Update Table Status**
- Validates permissions (admin or system)
- Updates table status
- Tracks status change reason
- **Input:** Table ID, New Status, Reason (optional)
- **Output:** Status Update Confirmation
- **Data Stores:** D3: Tables

#### Data Flows:
- **3.1 → D3:** Create table record
- **3.1 → D3:** Check table number uniqueness
- **3.2 → D3:** Update table information
- **3.3 → D3:** Check for active orders/reservations
- **3.3 → D5:** Check active orders
- **3.3 → D7:** Check active reservations
- **3.3 → D3:** Delete table
- **3.4 → D3:** Read all tables
- **3.5 → D3:** Read available tables
- **3.6 → D3:** Check availability
- **3.6 → D3:** Update status to Occupied
- **3.7 → D3:** Update status to Available
- **3.8 → D3:** Update table status

---

### 4.0 Meal Management Process (Level 2)

#### Description
Detailed breakdown of the Meal Management process showing meal creation, updates, availability management, and menu retrieval.

#### Sub-Processes:

##### 4.1 **Restaurant Admin: Create Meal**
- Validates restaurant admin role
- Validates restaurant ownership
- Validates meal data (name, price, category)
- Creates meal record
- Sets initial availability to true
- Handles image upload if provided
- **Input:** Restaurant ID, Meal Name, Description, Price, Category, Image (optional)
- **Output:** Meal ID, Meal Details, Confirmation
- **Data Stores:** D4: Meals
- **External:** File Storage (image upload)

##### 4.2 **Restaurant Admin: Update Meal**
- Validates restaurant admin role
- Validates meal ownership
- Updates meal information
- Updates price if changed
- Updates description
- Handles image update if provided
- **Input:** Meal ID, Updated Fields (Name, Description, Price, Category, Image)
- **Output:** Updated Meal Details, Confirmation
- **Data Stores:** D4: Meals
- **External:** File Storage (if image updated)

##### 4.3 **Restaurant Admin: Delete Meal**
- Validates restaurant admin role
- Validates meal ownership
- Checks for active orders containing meal
- Prevents deletion if in active orders
- Deletes meal record
- **Input:** Meal ID
- **Output:** Deletion Confirmation, Error (if in use)
- **Data Stores:** D4: Meals, D6: OrderItems

##### 4.4 **Restaurant Admin: Toggle Meal Availability**
- Validates restaurant admin role
- Validates meal ownership
- Toggles IsAvailable flag
- Updates meal status
- **Input:** Meal ID, Availability Status
- **Output:** Availability Update Confirmation
- **Data Stores:** D4: Meals

##### 4.5 **Get Restaurant Meals**
- Fetches all meals for a restaurant
- Filters by availability (optional)
- Groups by category
- Includes meal details
- Returns menu list
- **Input:** Restaurant ID, Availability Filter (optional), Category Filter (optional)
- **Output:** Meal List, Grouped by Category
- **Data Stores:** D4: Meals

##### 4.6 **Get Meal Details**
- Fetches specific meal information
- Includes full details
- Includes availability status
- Returns meal information
- **Input:** Meal ID
- **Output:** Meal Details, Availability Status
- **Data Stores:** D4: Meals

##### 4.7 **Get Meals by Category**
- Fetches meals filtered by category
- Applies availability filter
- Sorts by name or price
- Returns category meal list
- **Input:** Restaurant ID, Category
- **Output:** Category Meal List
- **Data Stores:** D4: Meals

##### 4.8 **Admin: Disable Meal**
- Validates admin role
- Disables meal (sets unavailable)
- Stores disable reason
- Notifies restaurant admin
- **Input:** Restaurant ID, Meal ID, Disable Reason
- **Output:** Disable Confirmation, Notification
- **Data Stores:** D4: Meals
- **External:** Email Service (notification)

#### Data Flows:
- **4.1 → D4:** Create meal record
- **4.1 → File Storage:** Upload meal image
- **4.2 → D4:** Update meal information
- **4.2 → File Storage:** Update image (if changed)
- **4.3 → D4:** Check for active orders
- **4.3 → D6:** Check order items
- **4.3 → D4:** Delete meal
- **4.4 → D4:** Toggle availability
- **4.5 → D4:** Read restaurant meals
- **4.6 → D4:** Read meal details
- **4.7 → D4:** Read meals by category
- **4.8 → D4:** Disable meal
- **4.8 → Email Service:** Notify restaurant admin

---

### 5.0 Order Management Process (Level 2)

#### Description
Detailed breakdown of the Order Management process showing order creation, processing, and status management.

#### Sub-Processes:

##### 5.1 **Customer: Create Order**
- Validates customer authentication (optional for guest orders)
- Validates restaurant exists
- Validates table availability and status
- Validates all meal items exist and are available
- Validates quantities are positive
- Calculates order total (sum of all items)
- Creates order record with Pending status
- Creates order item records for each meal
- Updates table status to Occupied
- Sends real-time notification to restaurant
- **Input:** Customer ID (optional), Restaurant ID, Table ID, Order Items (Meal ID, Quantity), Cart Data
- **Output:** Order ID, Order Confirmation, Order Details, Total Amount
- **Data Stores:** D5: Orders, D6: OrderItems, D3: Tables, D4: Meals
- **External:** SignalR (real-time notification)

##### 5.2 **Restaurant Admin: Update Order Status**
- Validates restaurant admin role
- Validates order belongs to restaurant
- Validates status transition rules (workflow: Pending → Preparing → Ready → Served → Completed)
- Updates order status
- If status is Completed, checks if customer left table
- Updates table status (Available if customer left, Occupied if still at table)
- Sends real-time notification to customer
- **Input:** Order ID, New Status, Customer Left Flag (if Completed)
- **Output:** Updated Order Status, Table Status Update, Notification
- **Data Stores:** D5: Orders, D3: Tables
- **External:** SignalR (real-time notifications)

##### 5.3 **Retrieve Orders**
- Validates user permissions
- Fetches orders based on filters
- Applies customer/restaurant filters based on role
- Includes order items with meal details
- Includes table information
- Sorts by creation date (newest first)
- Paginates results
- **Input:** Customer ID (optional), Restaurant ID (optional), Status Filter, Date Range, Page Number
- **Output:** Order List, Order Details with Items, Pagination Info
- **Data Stores:** D5: Orders, D6: OrderItems, D3: Tables, D4: Meals

##### 5.4 **Cancel Order**
- Validates user permissions (customer or admin)
- Validates cancellation eligibility (cannot cancel if already served/completed)
- Updates order status to Cancelled
- Updates table status to Available
- Checks for payments
- Initiates refund process if payment was made
- Sends cancellation notification
- **Input:** Order ID, Cancellation Reason (optional)
- **Output:** Cancellation Confirmation, Refund Status, Notification
- **Data Stores:** D5: Orders, D3: Tables, D8: Payments
- **External:** Payment Gateway (refund if needed), SignalR (notification)

##### 5.5 **Get Order Details**
- Validates user permissions
- Fetches specific order information
- Includes all order items with meal details
- Includes payment information
- Includes table and restaurant information
- Returns complete order details
- **Input:** Order ID
- **Output:** Complete Order Details, Items, Payment Info
- **Data Stores:** D5: Orders, D6: OrderItems, D4: Meals, D8: Payments, D3: Tables, D2: Restaurants

##### 5.6 **Restaurant Admin: Get Active Orders**
- Validates restaurant admin role
- Fetches active orders (Pending, Preparing, Ready, Served)
- Filters by status (optional)
- Includes order items
- Sorts by priority (status, then time)
- Returns active order list
- **Input:** Restaurant ID, Status Filter (optional)
- **Output:** Active Order List, Order Details
- **Data Stores:** D5: Orders, D6: OrderItems, D3: Tables

#### Data Flows:
- **5.1 → D5:** Create order record
- **5.1 → D6:** Create order items
- **5.1 → D3:** Check table availability
- **5.1 → D3:** Update table status to Occupied
- **5.1 → D4:** Validate meal availability
- **5.1 → SignalR:** Send new order notification
- **5.2 → D5:** Update order status
- **5.2 → D3:** Update table status (if completed)
- **5.2 → SignalR:** Send status update notification
- **5.3 → D5:** Read orders
- **5.3 → D6:** Read order items
- **5.3 → D4:** Read meal details
- **5.3 → D3:** Read table details
- **5.4 → D5:** Update order to Cancelled
- **5.4 → D3:** Update table to Available
- **5.4 → D8:** Check payments
- **5.4 → Payment Gateway:** Process refund
- **5.4 → SignalR:** Send cancellation notification
- **5.5 → D5:** Read order details
- **5.5 → D6:** Read order items
- **5.5 → D4:** Read meal details
- **5.5 → D8:** Read payment info
- **5.5 → D3:** Read table details
- **5.5 → D2:** Read restaurant details
- **5.6 → D5:** Read active orders
- **5.6 → D6:** Read order items
- **5.6 → D3:** Read table details

---

### 6.0 Reservation Management Process (Level 2)

#### Description
Detailed breakdown of the Reservation Management process showing reservation creation, confirmation, and management.

#### Sub-Processes:

##### 6.1 **Customer: Create Reservation**
- Validates restaurant and table
- Checks date/time availability
- Validates guest count against table capacity
- Checks for time conflicts
- Creates reservation record
- **Input:** Customer ID, Restaurant ID, Table ID, Date, Time, Duration, Guest Count, Notes
- **Output:** Reservation ID, Reservation Confirmation, Status
- **Data Stores:** D7: Reservations
- **External:** D3: Tables (check capacity), D7: Reservations (check conflicts)

##### 6.2 **Restaurant Admin: Update Reservation Status**
- Receives status update (Confirm/Reject/Complete)
- Validates status transition
- Updates reservation status
- Updates table status if customer arrived
- Sends notifications
- **Input:** Reservation ID, New Status, Admin Notes
- **Output:** Updated Reservation Status, Table Status Update, Notification
- **Data Stores:** D7: Reservations, D3: Tables

##### 6.3 **Restaurant Admin: Suggest Alternative Time**
- Checks available time slots
- Suggests alternative time to customer
- Updates reservation with suggested time
- **Input:** Reservation ID, Suggested Time, Admin Notes
- **Output:** Suggested Time, Reservation Update
- **Data Stores:** D7: Reservations, D3: Tables

##### 6.4 **Retrieve Reservations**
- Fetches reservations based on filters
- Applies customer/restaurant filters
- Includes table and restaurant details
- **Input:** Customer ID (optional), Restaurant ID (optional), Status Filter, Date Filter
- **Output:** Reservation List, Reservation Details
- **Data Stores:** D7: Reservations, D3: Tables, D2: Restaurants

##### 6.5 **Customer: Cancel Reservation**
- Validates cancellation eligibility
- Updates reservation status to Cancelled
- Frees up table slot
- **Input:** Reservation ID
- **Output:** Cancellation Confirmation
- **Data Stores:** D7: Reservations

##### 6.6 **Customer: Accept Suggested Time**
- Validates customer ownership
- Validates reservation has suggested time
- Updates reservation time to suggested time
- Clears suggested time field
- Updates status to Confirmed
- Sends confirmation notification
- **Input:** Reservation ID
- **Output:** Confirmation, Updated Reservation Details
- **Data Stores:** D7: Reservations
- **External:** SignalR (notification)

##### 6.7 **Restaurant Admin: Get Available Time Slots**
- Validates restaurant admin role
- Validates table ownership
- Checks existing reservations for the date
- Calculates available time slots based on duration
- Considers restaurant operating hours
- Returns available time slots
- **Input:** Table ID, Date, Duration (minutes)
- **Output:** Available Time Slots List
- **Data Stores:** D7: Reservations, D3: Tables, D2: Restaurants

##### 6.8 **Get Reservation Details**
- Validates user permissions
- Fetches specific reservation information
- Includes table and restaurant details
- Includes customer information (if admin)
- Returns complete reservation details
- **Input:** Reservation ID
- **Output:** Complete Reservation Details, Table Info, Restaurant Info
- **Data Stores:** D7: Reservations, D3: Tables, D2: Restaurants, D1: Users

#### Data Flows:
- **6.1 → D7:** Create reservation record
- **6.1 → D3:** Check table capacity
- **6.1 → D2:** Validate restaurant
- **6.1 → D7:** Check time conflicts
- **6.2 → D7:** Update reservation status
- **6.2 → D3:** Update table status (if Arrived)
- **6.2 → SignalR:** Send status update notification
- **6.3 → D7:** Update with suggested time
- **6.3 → D3:** Check available slots
- **6.3 → D2:** Check operating hours
- **6.4 → D7:** Read reservations
- **6.4 → D3:** Read table details
- **6.4 → D2:** Read restaurant details
- **6.5 → D7:** Update to Cancelled
- **6.6 → D7:** Update reservation time and status
- **6.6 → SignalR:** Send confirmation notification
- **6.7 → D7:** Check existing reservations
- **6.7 → D3:** Read table details
- **6.7 → D2:** Read operating hours
- **6.8 → D7:** Read reservation details
- **6.8 → D3:** Read table details
- **6.8 → D2:** Read restaurant details
- **6.8 → D1:** Read customer details (if admin)

---

### 7.0 Payment Processing Process (Level 2)

#### Description
Detailed breakdown of the Payment Processing process showing payment creation, gateway integration, and receipt generation.

#### Sub-Processes:

##### 7.1 **Initiate Payment**
- Validates order and amount
- Determines payment method
- Creates payment record
- Routes to appropriate payment processor
- **Input:** Order ID, Payment Method, Amount, Transaction ID (optional)
- **Output:** Payment ID, Payment Status, Gateway Redirect (if online)
- **Data Stores:** D8: Payments, D5: Orders
- **External:** Payment Gateway

##### 7.2 **Process Online Payment**
- Integrates with Stripe payment gateway
- Processes card/UPI payments
- Handles payment confirmations
- Updates payment status
- **Input:** Payment Intent, Payment Method Details, Customer Info
- **Output:** Payment Confirmation, Transaction ID, Receipt
- **Data Stores:** D8: Payments
- **External:** Payment Gateway (Stripe)

##### 7.3 **Process Cash/Counter Payment**
- Records cash payment
- Marks payment as pending
- Updates order status appropriately
- **Input:** Order ID, Amount, Payment Mode
- **Output:** Payment Record, Receipt
- **Data Stores:** D8: Payments, D5: Orders

##### 7.4 **Generate Payment Receipt**
- Retrieves payment and order details
- Formats receipt data
- Generates receipt document
- **Input:** Payment ID, Order ID
- **Output:** Payment Receipt, Receipt Data
- **Data Stores:** D8: Payments, D5: Orders, D6: OrderItems

##### 7.5 **Retrieve Payment History**
- Fetches payment records
- Applies customer/restaurant filters
- Includes order details
- **Input:** Customer ID (optional), Restaurant ID (optional), Date Range
- **Output:** Payment History List, Payment Details
- **Data Stores:** D8: Payments, D5: Orders

##### 7.6 **Process Stripe Payment Intent**
- Receives Stripe payment intent confirmation
- Validates payment intent ID
- Updates payment status to Paid
- Records transaction ID
- Updates order status appropriately (maintains workflow)
- Sends payment confirmation
- **Input:** Payment Intent ID, Transaction ID, Order ID
- **Output:** Payment Confirmation, Updated Order Status
- **Data Stores:** D8: Payments, D5: Orders
- **External:** Payment Gateway (Stripe)

##### 7.7 **Process Refund**
- Validates refund eligibility
- Initiates refund through payment gateway (if online)
- Updates payment status to Refunded
- Records refund transaction ID
- Updates order status if needed
- **Input:** Payment ID, Refund Amount, Reason
- **Output:** Refund Confirmation, Transaction ID
- **Data Stores:** D8: Payments, D5: Orders
- **External:** Payment Gateway (refund processing)

#### Data Flows:
- **7.1 → D8:** Create payment record
- **7.1 → D5:** Validate order and amount
- **7.1 → Payment Gateway:** Initiate online payment (if online)
- **7.2 → Payment Gateway:** Process payment
- **7.2 → D8:** Update payment status to Paid
- **7.2 → D5:** Update order (maintain workflow)
- **7.3 → D8:** Create cash payment record
- **7.3 → D5:** Update order status (if needed)
- **7.4 → D8:** Read payment details
- **7.4 → D5:** Read order details
- **7.4 → D6:** Read order items
- **7.5 → D8:** Read payment history
- **7.5 → D5:** Read order details
- **7.6 → Payment Gateway:** Validate payment intent
- **7.6 → D8:** Update payment status
- **7.6 → D5:** Update order
- **7.7 → Payment Gateway:** Process refund
- **7.7 → D8:** Update payment status to Refunded
- **7.7 → D5:** Update order status

---

### 8.0 Review Management Process (Level 2)

#### Description
Detailed breakdown of the Review Management process showing review submission, retrieval, and management by customers and restaurant admins.

#### Sub-Processes:

##### 8.1 **Customer: Submit Review**
- Validates customer authentication
- Validates restaurant exists
- Checks if customer has ordered from restaurant (optional validation)
- Validates rating (1-5 scale)
- Creates review record
- Updates restaurant average rating
- **Input:** Restaurant ID, Customer ID, Rating (1-5), Comment
- **Output:** Review ID, Review Confirmation, Updated Average Rating
- **Data Stores:** D9: Reviews, D2: Restaurants

##### 8.2 **Get Restaurant Reviews**
- Fetches all reviews for a restaurant
- Includes customer information
- Sorts by date (newest first)
- Calculates average rating
- Paginates results
- **Input:** Restaurant ID, Page Number, Page Size
- **Output:** Review List, Average Rating, Total Reviews, Pagination Info
- **Data Stores:** D9: Reviews, D1: Users

##### 8.3 **Get Customer Reviews**
- Validates customer authentication
- Fetches all reviews by customer
- Includes restaurant information
- Sorts by date
- Returns customer review history
- **Input:** Customer ID
- **Output:** Customer Review List, Restaurant Details
- **Data Stores:** D9: Reviews, D2: Restaurants

##### 8.4 **Restaurant Admin: Get Restaurant Reviews**
- Validates restaurant admin role
- Validates restaurant ownership
- Fetches all reviews for restaurant
- Includes customer information
- Filters by rating (optional)
- Sorts by date or rating
- **Input:** Restaurant ID, Rating Filter (optional)
- **Output:** Review List with Customer Info, Average Rating
- **Data Stores:** D9: Reviews, D1: Users

##### 8.5 **Update Review**
- Validates customer ownership
- Validates review exists
- Updates review comment or rating
- Recalculates restaurant average rating
- Returns updated review
- **Input:** Review ID, Updated Rating (optional), Updated Comment (optional)
- **Output:** Updated Review, Updated Average Rating
- **Data Stores:** D9: Reviews, D2: Restaurants

##### 8.6 **Delete Review**
- Validates customer ownership or admin role
- Deletes review record
- Recalculates restaurant average rating
- Returns deletion confirmation
- **Input:** Review ID
- **Output:** Deletion Confirmation, Updated Average Rating
- **Data Stores:** D9: Reviews, D2: Restaurants

##### 8.7 **Calculate Restaurant Average Rating**
- Fetches all reviews for restaurant
- Calculates average rating
- Counts total reviews
- Updates restaurant record
- **Input:** Restaurant ID
- **Output:** Average Rating, Total Review Count
- **Data Stores:** D9: Reviews, D2: Restaurants

#### Data Flows:
- **8.1 → D9:** Create review record
- **8.1 → D2:** Validate restaurant
- **8.1 → D2:** Update average rating
- **8.2 → D9:** Read restaurant reviews
- **8.2 → D1:** Read customer information
- **8.2 → D9:** Calculate average rating
- **8.3 → D9:** Read customer reviews
- **8.3 → D2:** Read restaurant details
- **8.4 → D9:** Read restaurant reviews
- **8.4 → D1:** Read customer information
- **8.5 → D9:** Update review
- **8.5 → D2:** Recalculate average rating
- **8.6 → D9:** Delete review
- **8.6 → D2:** Recalculate average rating
- **8.7 → D9:** Read all reviews
- **8.7 → D2:** Update average rating

---

### 9.0 Analytics & Reporting Process (Level 2)

#### Description
Detailed breakdown of the Analytics & Reporting process showing revenue analysis, order statistics, popular items tracking, and business intelligence generation.

#### Sub-Processes:

##### 9.1 **Calculate Revenue Statistics**
- Fetches payment records for date range
- Filters by payment status (Paid)
- Calculates total revenue
- Calculates today's revenue
- Calculates pending payments
- Calculates average order value
- Returns revenue statistics
- **Input:** Restaurant ID, Start Date, End Date
- **Output:** Total Revenue, Today's Revenue, Pending Payments, Average Order Value
- **Data Stores:** D8: Payments, D5: Orders

##### 9.2 **Calculate Order Statistics**
- Fetches orders for date range
- Counts total orders
- Counts completed orders
- Counts cancelled orders
- Calculates completion rate
- Groups by status
- Returns order statistics
- **Input:** Restaurant ID, Start Date, End Date
- **Output:** Total Orders, Completed Orders, Cancelled Orders, Completion Rate, Status Breakdown
- **Data Stores:** D5: Orders

##### 9.3 **Generate Daily Revenue Report**
- Fetches orders for last N days
- Groups by date
- Calculates revenue per day
- Counts orders per day
- Returns daily revenue breakdown
- **Input:** Restaurant ID, Number of Days (default 7)
- **Output:** Daily Revenue List (Date, Revenue, Order Count)
- **Data Stores:** D5: Orders, D8: Payments

##### 9.4 **Identify Popular Items**
- Fetches order items for date range
- Groups by meal
- Calculates total quantity sold
- Calculates total revenue per item
- Counts number of orders containing item
- Sorts by quantity sold
- Returns top N popular items
- **Input:** Restaurant ID, Start Date, End Date, Top N (default 10)
- **Output:** Popular Items List (Meal Name, Quantity Sold, Revenue, Order Count)
- **Data Stores:** D6: OrderItems, D4: Meals, D5: Orders

##### 9.5 **Analyze Payment Methods**
- Fetches payment records for date range
- Groups by payment mode
- Counts transactions per method
- Calculates total amount per method
- Returns payment method breakdown
- **Input:** Restaurant ID, Start Date, End Date
- **Output:** Payment Method Breakdown (Mode, Count, Total Amount)
- **Data Stores:** D8: Payments

##### 9.6 **Identify Peak Hours**
- Fetches orders for date range
- Groups by hour of creation
- Counts orders per hour
- Calculates revenue per hour
- Sorts by order count
- Returns top peak hours
- **Input:** Restaurant ID, Start Date, End Date, Top N (default 5)
- **Output:** Peak Hours List (Hour, Order Count, Revenue)
- **Data Stores:** D5: Orders, D8: Payments

##### 9.7 **Generate Comprehensive Analytics**
- Combines all analytics data
- Fetches revenue statistics
- Fetches order statistics
- Fetches popular items
- Fetches payment method breakdown
- Fetches peak hours
- Returns comprehensive analytics report
- **Input:** Restaurant ID, Number of Days (default 30)
- **Output:** Complete Analytics Report (Revenue, Orders, Popular Items, Payment Methods, Peak Hours)
- **Data Stores:** D5: Orders, D6: OrderItems, D8: Payments, D4: Meals

##### 9.8 **Admin: Get System-Wide Analytics**
- Validates admin role
- Aggregates data across all restaurants
- Calculates system totals
- Returns system-wide statistics
- **Input:** Date Range
- **Output:** System Analytics (Total Restaurants, Total Orders, Total Revenue, etc.)
- **Data Stores:** D2: Restaurants, D5: Orders, D8: Payments

#### Data Flows:
- **9.1 → D8:** Read payment records
- **9.1 → D5:** Read order details
- **9.2 → D5:** Read orders
- **9.3 → D5:** Read orders by date
- **9.3 → D8:** Read payments by date
- **9.4 → D6:** Read order items
- **9.4 → D4:** Read meal details
- **9.4 → D5:** Count orders per item
- **9.5 → D8:** Read payments by method
- **9.6 → D5:** Read orders by hour
- **9.6 → D8:** Read payments by hour
- **9.7 → D5:** Read orders
- **9.7 → D6:** Read order items
- **9.7 → D8:** Read payments
- **9.7 → D4:** Read meals
- **9.8 → D2:** Read all restaurants
- **9.8 → D5:** Read all orders
- **9.8 → D8:** Read all payments

---

## Summary

This comprehensive Level 2 DFD decomposition covers all 9 major processes of the Restaurant Management System with detailed sub-process breakdowns:

1. **User Authentication & Management (1.0)** - 8 sub-processes covering registration, login, password management, profile updates, and user administration
2. **Restaurant Management (2.0)** - 8 sub-processes covering registration, approval/rejection, profile updates, and information retrieval
3. **Table Management (3.0)** - 8 sub-processes covering table CRUD operations, availability tracking, and customer interactions
4. **Meal Management (4.0)** - 8 sub-processes covering menu item management, availability, category operations, and image handling
5. **Order Management (5.0)** - 6 sub-processes covering order creation, status updates, cancellation, retrieval, and active order management
6. **Reservation Management (6.0)** - 8 sub-processes covering reservation creation, confirmation, time suggestions, cancellation, and availability checking
7. **Payment Processing (7.0)** - 7 sub-processes covering payment initiation, online/cash processing, receipts, history, and refunds
8. **Review Management (8.0)** - 7 sub-processes covering review submission, retrieval, updates, deletion, and rating calculations
9. **Analytics & Reporting (9.0)** - 8 sub-processes covering revenue analysis, order statistics, popular items, payment methods, peak hours, and comprehensive reporting

**Total Sub-Processes:** 68 detailed sub-processes across all 9 major processes

Each process includes:
- Detailed sub-process descriptions with step-by-step operations
- Complete input/output specifications
- Data store interactions (read/write operations)
- External entity communications (Payment Gateway, Email Service, SignalR)
- Comprehensive data flow mappings

---

## Data Dictionary

### Data Elements:

#### User Data:
- **UserID:** Integer, Primary Key
- **FullName:** String(150)
- **Email:** String(150), Unique
- **PasswordHash:** String(300)
- **UserType:** String(50) - Values: Customer, RestaurantAdmin, Admin
- **RestaurantID:** Integer, Foreign Key (nullable)
- **PhoneNumber:** String(20)

#### Restaurant Data:
- **RestaurantID:** Integer, Primary Key
- **Name:** String(200)
- **Address:** String(500)
- **PhoneNumber:** String(20)
- **Email:** String(150)
- **OpenTime:** Time
- **CloseTime:** Time
- **Status:** String(50) - Values: Pending, Approved, Rejected

#### Table Data:
- **TableID:** Integer, Primary Key
- **RestaurantID:** Integer, Foreign Key
- **TableNumber:** Integer
- **Capacity:** Integer
- **Status:** String(50) - Values: Available, Occupied, Reserved

#### Meal Data:
- **MealID:** Integer, Primary Key
- **RestaurantID:** Integer, Foreign Key
- **Name:** String(200)
- **Description:** String(1000)
- **Price:** Decimal(10,2)
- **Category:** String(100)
- **IsAvailable:** Boolean
- **ImageURL:** String(500)

#### Order Data:
- **OrderID:** Integer, Primary Key
- **RestaurantID:** Integer, Foreign Key
- **TableID:** Integer, Foreign Key
- **CustomerID:** Integer, Foreign Key (nullable)
- **OrderStatus:** String(50) - Values: Pending, Preparing, Ready, Served, Completed, Cancelled, Paid
- **TotalAmount:** Decimal(10,2)
- **CreatedAt:** DateTime

#### OrderItem Data:
- **OrderItemID:** Integer, Primary Key
- **OrderID:** Integer, Foreign Key
- **MealID:** Integer, Foreign Key
- **Quantity:** Integer
- **Price:** Decimal(10,2)
- **TotalPrice:** Decimal(10,2)

#### Reservation Data:
- **ReservationID:** Integer, Primary Key
- **RestaurantID:** Integer, Foreign Key
- **TableID:** Integer, Foreign Key
- **CustomerID:** Integer, Foreign Key (nullable)
- **ReservationDate:** Date
- **ReservationTime:** Time
- **Duration:** Integer (minutes)
- **NumberOfGuests:** Integer
- **Status:** String(50) - Values: Pending, Confirmed, Arrived, Rejected, Cancelled, Completed
- **SuggestedTime:** Time (nullable)
- **Notes:** String(500)
- **AdminNotes:** String(500)

#### Payment Data:
- **PaymentID:** Integer, Primary Key
- **OrderID:** Integer, Foreign Key
- **Amount:** Decimal(10,2)
- **PaymentMode:** String(50) - Values: Cash, Online, Card, UPI, Counter
- **PaymentStatus:** String(50) - Values: Pending, Paid, Failed, Refunded
- **TransactionID:** String(200)
- **CreatedAt:** DateTime

#### Review Data:
- **ReviewID:** Integer, Primary Key
- **RestaurantID:** Integer, Foreign Key
- **CustomerID:** Integer, Foreign Key
- **Rating:** Integer (1-5)
- **Comment:** String(1000)
- **CreatedAt:** DateTime

---

## Notes

1. **Real-time Updates:** The system uses SignalR for real-time order and reservation status updates to restaurant admins.

2. **Payment Gateway Integration:** Online payments are processed through Stripe payment gateway with secure token handling.

3. **Role-Based Access:** Different processes are accessible based on user roles (Customer, RestaurantAdmin, Admin).

4. **Data Consistency:** Table status is automatically updated when orders are placed or reservations are confirmed.

5. **Workflow Management:** Orders follow a strict workflow (Pending → Preparing → Ready → Served → Completed) with status validation.

6. **Conflict Resolution:** Reservation system checks for time conflicts before confirming reservations.

---

## Diagram Conventions

- **Process:** Rounded rectangles
- **Data Store:** Open rectangles (left side closed)
- **External Entity:** Rectangles
- **Data Flow:** Arrows with labels
- **Process Numbering:** X.Y format (X = level 1 process, Y = level 2 sub-process)

---

*This DFD document provides a comprehensive view of data flows in the Restaurant Management System. For visual diagrams, use tools like Draw.io, Lucidchart, or Visio to create the actual diagrams based on this specification.*

