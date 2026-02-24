import React, { useState } from 'react';
import './TableBooking.css';
import bookingService from '../../services/booking.service';

const TableBooking = ({ isOpen, onClose, restaurant }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!restaurant?.id) {
        alert('Restaurant information is missing. Please try again.');
        return;
      }

      // Prepare booking data
      const bookingData = {
        shopId: restaurant.id,
        customerName: formData.name,
        customerPhone: formData.phone,
        numberOfGuests: parseInt(formData.guests),
        bookingDate: formData.date,
        bookingTime: formData.time
      };

      // Send to backend
      const response = await bookingService.createBooking(bookingData);
      
      alert('✅ Party booking enquiry submitted successfully! The restaurant will contact you soon.');
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        date: '',
        time: '',
        guests: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Booking submission error:', error);
      alert('❌ Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="table-booking-overlay" onClick={onClose}>
      <div className="table-booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-header">
          <div className="booking-header-content">
            <h2>Party Booking Enquiry</h2>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="guests">Number of Guests *</label>
            <input
              type="number"
              id="guests"
              name="guests"
              value={formData.guests}
              onChange={handleInputChange}
              placeholder="Enter number of guests"
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date for Booking *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="time">Time *</label>
            <input
              type="time"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="btn-submit-enquiry" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TableBooking;
