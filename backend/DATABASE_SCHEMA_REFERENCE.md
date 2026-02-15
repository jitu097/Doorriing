# 🧾 BazarSe – User Side Database Schema Reference (Production Ready)

This document defines **all database tables required for the USER SIDE application**  
(Customer-facing app) using **Supabase PostgreSQL + Firebase Auth**.

> ⚠️ Seller-side tables (shops, items, categories, etc.) already exist and are **shared**.
> This document only focuses on **User-specific tables and shared access rules**.

---

## 🔐 Authentication Model

- Authentication is handled via **Firebase Auth**
- `firebase_uid` is the **single source of identity**
- Same Firebase UID / Email **can exist as both Seller and Customer**
- Roles are determined by **table presence**, NOT email

---

# 🧱 CORE USER TABLES

---

## 1️⃣ customers  
Stores user profile and identity mapping.

### Purpose
- Represents a **customer account**
- One row per Firebase user

**Table: `customers`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Internal customer ID |
| `firebase_uid` | `text` (unique) | Firebase Auth UID |
| `email` | `text` | User email |
| `full_name` | `text` | Customer name |
| `phone` | `text` | Phone number |
| `created_at` | `timestamptz` | Account creation time |
| `updated_at` | `timestamptz` | Last update |

---

## 2️⃣ customer_addresses

Stores delivery addresses for checkout.

### Purpose

- Multiple addresses per customer
- Supports future map & GPS features

**Table: `customer_addresses`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Address ID |
| `customer_id` | `uuid` (FK → customers.id) | Owner |
| `label` | `text` | Home / Office |
| `address` | `text` | Full address |
| `city` | `text` | City |
| `state` | `text` | State |
| `pincode` | `text` | Postal code |
| `latitude` | `numeric` | Optional GPS |
| `longitude` | `numeric` | Optional GPS |
| `is_default` | `boolean` | Default address |
| `created_at` | `timestamptz` | Created time |

---

# 🛒 CART SYSTEM (MVP + SCALE READY)

## 3️⃣ carts

Each customer can have one active cart at a time.

### Purpose

- Ensures cart is scoped to one shop
- Prevents cross-shop order errors

**Table: `carts`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Cart ID |
| `customer_id` | `uuid` (FK → customers.id) | Owner |
| `shop_id` | `uuid` (FK → shops.id) | Shop being ordered from |
| `updated_at` | `timestamptz` | Last modification |

## 4️⃣ cart_items

Items inside a cart.

### Purpose

- Stores quantities before order placement

**Table: `cart_items`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Cart item ID |
| `cart_id` | `uuid` (FK → carts.id) | Parent cart |
| `item_id` | `uuid` (FK → items.id) | Product |
| `quantity` | `integer` | Quantity |
| `created_at` | `timestamptz` | Added time |

---

# 📦 ORDERS (SHARED TABLES)

Orders are shared between Seller & User apps

## 5️⃣ orders (Shared)
### Purpose

- Created by User
- Managed by Seller

**Table: `orders`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Order ID |
| `shop_id` | `uuid` (FK → shops.id) | Seller shop |
| `customer_id` | `uuid` (FK → customers.id) | Buyer |
| `order_number` | `text` | Public order code |
| `customer_name` | `text` | Snapshot |
| `customer_phone` | `text` | Snapshot |
| `delivery_address` | `text` | Snapshot |
| `items_total` | `numeric` | Item total |
| `delivery_charge` | `numeric` | Delivery fee |
| `total_amount` | `numeric` | Final total |
| `status` | `text` | Order status |
| `payment_method` | `text` | COD / Online |
| `payment_status` | `text` | Pending / Paid |
| `created_at` | `timestamptz` | Order time |
| `updated_at` | `timestamptz` | Last update |

## 6️⃣ order_items (Shared)

**Table: `order_items`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Row ID |
| `order_id` | `uuid` (FK → orders.id) | Order |
| `item_id` | `uuid` (FK → items.id) | Product |
| `name` | `text` | Snapshot name |
| `quantity` | `integer` | Quantity |
| `price` | `numeric` | Snapshot price |
| `portion` | `text` | Full / Half |
| `created_at` | `timestamptz` | Created |

---

# ❤️ USER ENGAGEMENT

## 7️⃣ favorites

Allows users to save shops or items.

**Table: `favorites`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Favorite ID |
| `customer_id` | `uuid` (FK → customers.id) | User |
| `shop_id` | `uuid` (FK → shops.id) | Optional |
| `item_id` | `uuid` (FK → items.id) | Optional |
| `created_at` | `timestamptz` | Added time |

## 8️⃣ reviews

Customer feedback system.

**Table: `reviews`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Review ID |
| `customer_id` | `uuid` (FK → customers.id) | Reviewer |
| `shop_id` | `uuid` (FK → shops.id) | Shop |
| `order_id` | `uuid` (FK → orders.id) | Order |
| `rating` | `integer` | 1–5 |
| `comment` | `text` | Feedback |
| `created_at` | `timestamptz` | Created |

---

# 🔔 NOTIFICATIONS (SHARED)

## 9️⃣ notifications

Used by both Seller & User apps.

**Table: `notifications`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Notification ID |
| `seller_id` | `uuid` (FK → sellers.id) | Optional |
| `customer_id` | `uuid` (FK → customers.id) | Optional |
| `title` | `text` | Short title |
| `message` | `text` | Body |
| `type` | `text` | order / stock / booking |
| `is_read` | `boolean` | Read status |
| `created_at` | `timestamptz` | Created |

---

# 🔐 SECURITY RULES (RLS – HIGH LEVEL)

Customers can only access rows where:

`customers.firebase_uid = auth.uid()`

**Orders:**

- Customer → `orders.customer_id`
- Seller → `orders.shop_id`

Cart & Addresses strictly scoped to customer
