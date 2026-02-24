import React, { useState } from 'react';
import './MyBookings.css';

const MyBookings = () => {
  // Mock data for table bookings (replace with actual data from backend)
  const tableBookings = [
    {
      id: 'TB001',
      restaurantName: 'Spice Garden Restaurant',
      restaurantImage: '/restaurant-1.jpg',
      date: '2026-03-05',
      time: '7:00 PM',
      guests: 4,
      tableType: 'Window Side',
      status: 'confirmed',
      totalPrice: 200,
      bookingDate: '2026-02-20',
      specialRequests: 'Birthday celebration, please arrange cake'
    },
    {
      id: 'TB002',
      restaurantName: 'Ocean View Cafe',
      restaurantImage: '/restaurant-2.jpg',
      date: '2026-02-28',
      time: '12:30 PM',
      guests: 2,
      tableType: 'Regular Table',
      status: 'completed',
      totalPrice: 0,
      bookingDate: '2026-02-15'
    },
    {
      id: 'TB003',
      restaurantName: 'Mountain Top Bistro',
      restaurantImage: '/restaurant-3.jpg',
      date: '2026-02-26',
      time: '8:00 PM',
      guests: 6,
      tableType: 'VIP Table',
      status: 'cancelled',
      totalPrice: 500,
      bookingDate: '2026-02-18'
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      confirmed: { label: 'Confirmed', class: 'status-confirmed', icon: '✓' },
      pending: { label: 'Pending', class: 'status-pending', icon: '⏳' },
      completed: { label: 'Completed', class: 'status-completed', icon: '✓' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled', icon: '✕' }
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="my-bookings-section">
      <div className="bookings-header">
        <h2>My Bookings</h2>
        <p className="bookings-subtitle">View and manage all your table reservations</p>
      </div>

      {/* Table Bookings Content */}
      <div className="bookings-content">
        {tableBookings.length === 0 ? (
          <div className="empty-bookings">
            <div className="empty-icon">🍽️</div>
            <h3>No Table Reservations</h3>
            <p>You haven't made any table reservations yet</p>
            <button className="browse-btn">Browse Restaurants</button>
          </div>
        ) : (
          <div className="bookings-list">
            {tableBookings.map((booking) => {
              const statusInfo = getStatusBadge(booking.status);
              return (
                <div key={booking.id} className="booking-card">
                    <div className="booking-card-header">
                      <div className="booking-restaurant-info">
                        <div className="restaurant-image-placeholder">
                          <span>🍴</span>
                        </div>
                        <div>
                          <h3>{booking.restaurantName}</h3>
                          <p className="booking-id">Booking ID: {booking.id}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    <div className="booking-details">
                      <div className="detail-row">
                        <div className="detail-item">
                          <span className="detail-label">📅 Date</span>
                          <span className="detail-value">{formatDate(booking.date)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">⏰ Time</span>
                          <span className="detail-value">{booking.time}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-item">
                          <span className="detail-label">👥 Guests</span>
                          <span className="detail-value">{booking.guests} People</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">🪑 Table Type</span>
                          <span className="detail-value">{booking.tableType}</span>
                        </div>
                      </div>
                      {booking.specialRequests && (
                        <div className="detail-row full-width">
                          <div className="detail-item">
                            <span className="detail-label">📝 Special Requests</span>
                            <span className="detail-value">{booking.specialRequests}</span>
                          </div>
                        </div>
                      )}
                      {booking.totalPrice > 0 && (
                        <div className="booking-price">
                          <span>Total Amount:</span>
                          <strong>₹{booking.totalPrice.toLocaleString()}</strong>
                        </div>
                      )}
                    </div>

                    {booking.status === 'confirmed' && (
                      <div className="booking-actions">
                        <button className="btn-action btn-modify">Modify</button>
                        <button className="btn-action btn-cancel">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
};

export default MyBookings;
