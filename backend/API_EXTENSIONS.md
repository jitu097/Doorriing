# 📚 User-Side API Extensions

## Updated Endpoints for Category & Subcategory Support

---

## 🏪 Shop Module (Updated)

### Get Shops for Home Page
- **GET** `/shops/home`
  - **Auth**: Optional
  - **Query Params**:
    - `limit`: Number of shops per type (default: 6)
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Home page shops fetched successfully",
      "data": {
        "grocery": [
          {
            "id": "uuid",
            "name": "Fresh Mart",
            "description": "Your daily grocery store",
            "business_type": "grocery",
            "image_url": "https://...",
            "city": "New York",
            "is_active": true
          }
        ],
        "restaurant": [
          {
            "id": "uuid",
            "name": "Pizza Palace",
            "description": "Best pizza in town",
            "business_type": "restaurant",
            "image_url": "https://...",
            "city": "New York",
            "is_active": true
          }
        ]
      }
    }
    ```

### Browse Shops by Business Type
- **GET** `/shops/browse/:businessType`
  - **Auth**: Optional
  - **Path Params**:
    - `businessType`: `grocery` | `restaurant`
  - **Query Params**:
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 20, max: 100)
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Shops fetched successfully",
      "data": [
        {
          "id": "uuid",
          "name": "Fresh Mart",
          "description": "Your daily grocery store",
          "business_type": "grocery",
          "address": "123 Main St",
          "city": "New York",
          "image_url": "https://...",
          "is_active": true,
          "created_at": "2024-01-01T00:00:00.000Z",
          "category_count": 12,
          "subcategories": ["Bakery", "Beverages"]
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 45,
        "totalPages": 3
      }
    }
    ```

### Get Shop by ID (Updated)
- **GET** `/shops/:id`
  - **Auth**: Optional
  - **Query Params**:
    - `include_categories`: `true` | `false` (default: false)
  - **Response** (with include_categories=true):
    ```json
    {
      "success": true,
      "message": "Shop fetched successfully",
      "data": {
        "id": "uuid",
        "name": "Fresh Mart",
        "description": "Your daily grocery store",
        "business_type": "grocery",
        "address": "123 Main St",
        "city": "New York",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "phone": "+1234567890",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00.000Z",
        "category_count": 12
      }
    }
    ```

---

## 📂 Category Module (NEW)

### Get Categories by Shop
- **GET** `/categories/shop/:shopId`
  - **Auth**: Optional
  - **Path Params**:
    - `shopId`: Shop UUID
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Categories fetched successfully",
      "data": [
        {
          "id": "uuid",
          "shop_id": "uuid",
          "name": "Beverages",
          "description": "All kinds of drinks",
          "display_order": 1,
          "is_active": true,
          "created_at": "2024-01-01T00:00:00.000Z"
        },
        {
          "id": "uuid",
          "shop_id": "uuid",
          "name": "Snacks",
          "description": "Quick bites",
          "display_order": 2,
          "is_active": true,
          "created_at": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
    ```

### Get Category with Details
- **GET** `/categories/:categoryId`
  - **Auth**: Optional
  - **Path Params**:
    - `categoryId`: Category UUID
  - **Query Params** (Required):
    - `shop_id`: Shop UUID (ensures category belongs to correct shop)
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Category details fetched successfully",
      "data": {
        "category": {
          "id": "uuid",
          "shop_id": "uuid",
          "name": "Beverages",
          "description": "All kinds of drinks"
        },
        "subcategories": [
          {
            "id": "uuid",
            "category_id": "uuid",
            "name": "Soft Drinks",
            "description": "Carbonated beverages",
            "display_order": 1,
            "is_active": true
          },
          {
            "id": "uuid",
            "category_id": "uuid",
            "name": "Juices",
            "description": "Fresh fruit juices",
            "display_order": 2,
            "is_active": true
          }
        ],
        "grouped_items": [
          {
            "subcategory_id": "uuid",
            "subcategory_name": "Soft Drinks",
            "subcategory_description": "Carbonated beverages",
            "items": [
              {
                "id": "uuid",
                "shop_id": "uuid",
                "category_id": "uuid",
                "subcategory_id": "uuid",
                "name": "Coca Cola",
                "description": "500ml bottle",
                "price": 2.5,
                "image_url": "https://...",
                "is_active": true,
                "is_available": true,
                "stock_quantity": 50
              }
            ]
          },
          {
            "subcategory_id": "uuid",
            "subcategory_name": "Juices",
            "subcategory_description": "Fresh fruit juices",
            "items": [...]
          },
          {
            "subcategory_id": null,
            "subcategory_name": "Other Items",
            "subcategory_description": "Items without a specific subcategory",
            "items": [...]
          }
        ],
        "total_items": 25
      }
    }
    ```
  - **Notes**:
    - If category has NO subcategories, `subcategories` will be `[]`
    - If category has NO subcategories, `grouped_items` will have one group with `subcategory_id = null`
    - Items with `subcategory_id = NULL` are grouped as "Other Items"

### Get Subcategories by Category
- **GET** `/categories/:categoryId/subcategories`
  - **Auth**: Optional
  - **Path Params**:
    - `categoryId`: Category UUID
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Subcategories fetched successfully",
      "data": [
        {
          "id": "uuid",
          "category_id": "uuid",
          "name": "Soft Drinks",
          "description": "Carbonated beverages",
          "display_order": 1,
          "is_active": true
        }
      ]
    }
    ```

---

## 🍔 Item Module (Updated)

### Get Items by Shop (Updated)
- **GET** `/items/shop/:shopId`
  - **Auth**: Optional
  - **Query Params**:
    - `category_id`: Filter by category (NEW)
    - `subcategory_id`: Filter by subcategory (NEW)
    - `search`: Search by item name
    - `in_stock_only`: `true` | `false`
    - `page`: Page number
    - `page_size`: Items per page
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Items fetched successfully",
      "data": [
        {
          "id": "uuid",
          "shop_id": "uuid",
          "category_id": "uuid",
          "subcategory_id": "uuid",
          "name": "Coca Cola",
          "description": "500ml bottle",
          "price": 2.5,
          "image_url": "https://...",
          "is_active": true,
          "is_available": true,
          "stock_quantity": 50,
          "created_at": "2024-01-01T00:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 100,
        "totalPages": 5
      }
    }
    ```

### Get Items by Subcategory (NEW)
- **GET** `/items/subcategory/:subcategoryId`
  - **Auth**: Optional
  - **Path Params**:
    - `subcategoryId`: Subcategory UUID
  - **Query Params** (Required):
    - `shop_id`: Shop UUID
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 20)
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Items fetched successfully",
      "data": [
        {
          "id": "uuid",
          "shop_id": "uuid",
          "category_id": "uuid",
          "subcategory_id": "uuid",
          "name": "Coca Cola",
          "description": "500ml bottle",
          "price": 2.5,
          "image_url": "https://...",
          "is_active": true,
          "is_available": true,
          "stock_quantity": 50
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 15,
        "totalPages": 1
      }
    }
    ```

### Get Item by ID (Updated)
- **GET** `/items/:id`
  - **Auth**: Optional
  - **Response** (now includes subcategory_id):
    ```json
    {
      "success": true,
      "message": "Item fetched successfully",
      "data": {
        "id": "uuid",
        "shop_id": "uuid",
        "category_id": "uuid",
        "subcategory_id": "uuid",
        "name": "Coca Cola",
        "description": "500ml bottle",
        "price": 2.5,
        "image_url": "https://...",
        "is_active": true,
        "is_available": true,
        "stock_quantity": 50,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    }
    ```

---

## 🔄 Complete User Flow API Sequence

### Flow 1: Home Page
```
GET /api/shops/home
```

### Flow 2: Browse Grocery Shops
```
GET /api/shops/browse/grocery?page=1&page_size=20
```

### Flow 3: Shop Page (View Categories)
```
GET /api/categories/shop/{shopId}
```

### Flow 4: Category Page (View Subcategories & Items)
```
GET /api/categories/{categoryId}?shop_id={shopId}
```

### Flow 5: Items in a Specific Subcategory
```
GET /api/items/subcategory/{subcategoryId}?shop_id={shopId}
```

OR

```
GET /api/items/shop/{shopId}?category_id={categoryId}&subcategory_id={subcategoryId}
```

---

## 🚨 Important Notes

### Query Parameter Requirements
1. **Category Details**: `shop_id` is REQUIRED to prevent unauthorized access
2. **Items by Subcategory**: `shop_id` is REQUIRED for proper scoping
3. All filters are case-insensitive for search queries

### Data Filtering
All endpoints automatically filter:
- `is_active = true` (categories, subcategories, items)
- `is_available = true` (items only)
- Shop-scoped queries where applicable

### Pagination
- Default page size: 20
- Maximum page size: 100
- Page numbers start from 1

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errors": null
}
```

Common error codes:
- `400`: Bad request (missing required params)
- `404`: Resource not found
- `500`: Internal server error

---

## 🧪 Testing Examples

### Test Home Page
```bash
curl http://localhost:5001/api/shops/home
```

### Test Browse (Grocery)
```bash
curl "http://localhost:5001/api/shops/browse/grocery?page=1&page_size=10"
```

### Test Shop Categories
```bash
curl http://localhost:5001/api/categories/shop/550e8400-e29b-41d4-a716-446655440000
```

### Test Category Details
```bash
curl "http://localhost:5001/api/categories/550e8400-e29b-41d4-a716-446655440001?shop_id=550e8400-e29b-41d4-a716-446655440000"
```

### Test Items with Filters
```bash
curl "http://localhost:5001/api/items/shop/550e8400-e29b-41d4-a716-446655440000?category_id=550e8400-e29b-41d4-a716-446655440001&subcategory_id=550e8400-e29b-41d4-a716-446655440002"
```
