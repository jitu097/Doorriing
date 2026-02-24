# Booking Features - UI Documentation

This document describes the newly implemented booking UI features for the BazarSe User application.

## 📋 Overview

A comprehensive booking UI has been implemented:
1. **Table Booking** - For restaurant reservations

## 🎯 Features Implemented

### Table Booking UI (`TableBooking.jsx`)

**Location:** `frontend/src/pages/Restaurant/TableBooking.jsx`

**Features:**
- Personal information form (Name, Phone, Email)
- Date selection for reservation
- Time slot selection (11:00 AM - 10:30 PM)
- Number of guests selection (1-7+)
- Table type selection with 6 options:
  - Regular Table (2 Guests) - Free
  - Standard Table (4 Guests) - Free
  - Family Table (6 Guests) - Free
  - VIP Table (4 Guests) - ₹500
  - Corner Booth (4 Guests) - ₹300
  - Window Side (2-4 Guests) - ₹200
- Special requests/notes field
- Important information display (policies, timings)
- Fully responsive design (Desktop → Mobile)

**User Flow:**
1. Click "Reserve Table" button on restaurant card
2. Fill in personal details
3. Select date and number of guests
4. Choose preferred time slot
5. Select table type (optional)
6. Add special requests (optional)
7. Submit booking request

## 🎨 Design Highlights

- **Color Scheme:** Orange/Yellow gradient (matches restaurant theme)
- **Modal Style:** Smooth slide-up animation
- **Interactive Elements:** 
  - Time slots with hover effects
  - Table cards with selection indicators
  - Visual badges for selected items

## 📱 Responsive Behavior

The UI is fully responsive with breakpoints for:
- **Desktop (1024px+):** Full modal with side-by-side layouts
- **Tablet (768px - 1024px):** Adjusted spacing and grid layouts
- **Mobile (< 768px):** 
  - Bottom sheet style modals
  - Single column forms
  - Simplified grids (2 columns for time slots, 1-2 columns for options)
  - Full-width action buttons

## 🔧 Integration

### Restaurant Cards

The booking button is automatically displayed on restaurant cards showing "🍽️ Reserve Table" button.

### Files Modified
1. `frontend/src/pages/Restaurantcard/card.jsx` - Added booking button integration
2. `frontend/src/pages/Restaurantcard/card.css` - Added button styles

## 🎯 Usage Example

```jsx
<TableBooking 
  isOpen={showTableBooking}
  onClose={() => setShowTableBooking(false)}
  restaurant={restaurantData}
/>
```

## ⚠️ Important Notes

1. **No Backend Integration:** These are UI-only components. Booking submissions currently only:
   - Console log the booking data
   - Show an alert message
   - Close the modal

2. **Future Integration:** To integrate with backend:
   - Add API call in the `handleSubmit` function
   - Replace alert with success/error notifications
   - Add loading states during submission
   - Implement booking confirmation page

3. **Validation:** Basic HTML5 validation is implemented:
   - Required fields marked with *
   - Date validation (no past dates)
   - Email format validation
   - Phone number format

## 🎨 Customization

### Colors
- Modify gradient in `TableBooking.css` (.booking-header)

### Table Options
- Table options: Edit `tableOptions` array in `TableBooking.jsx`

### Time Slots
- Modify `timeSlots` array in `TableBooking.jsx`

## 🚀 Next Steps

To make this feature production-ready:
1. Integrate with backend API for actual bookings
2. Add payment gateway integration
3. Implement booking confirmation emails
4. Add booking management (view/cancel bookings)
5. Add available slot checking from database
6. Implement real-time availability updates
7. Add booking history for users
8. Add review system post-booking

---

**Created:** February 2026  
**Status:** UI Complete - Backend Integration Pending
