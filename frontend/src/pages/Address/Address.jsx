import { useState } from 'react';
import './Address.css';

const Address = () => {
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      type: 'Home',
      name: 'John Doe',
      phone: '+1 234-567-8901',
      building: 'Apartment 4B',
      area: '123 Main Street',
      landmark: 'Near Central Park',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      isDefault: true
    },
    {
      id: 2,
      type: 'Work',
      name: 'John Doe',
      phone: '+1 234-567-8901',
      building: 'Floor 5, Office 502',
      area: '456 Business Avenue',
      landmark: 'Opposite City Mall',
      city: 'New York',
      state: 'NY',
      postalCode: '10002',
      isDefault: false
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    type: 'Home',
    name: '',
    phone: '',
    building: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false
  });

  const addressTypes = ['Home', 'Work', 'Other'];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData({
      type: 'Home',
      name: '',
      phone: '',
      building: '',
      area: '',
      landmark: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: false
    });
    setShowModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address.id);
    setFormData(address);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      setAddresses(addresses.filter(addr => addr.id !== id));
    }
  };

  const handleSetDefault = (id) => {
    setAddresses(addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    })));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingAddress) {
      // Update existing address
      setAddresses(addresses.map(addr => 
        addr.id === editingAddress ? { ...formData, id: editingAddress } : addr
      ));
    } else {
      // Add new address
      const newAddress = {
        ...formData,
        id: Date.now()
      };
      
      // If this is set as default, unset others
      if (newAddress.isDefault) {
        setAddresses([newAddress, ...addresses.map(addr => ({ ...addr, isDefault: false }))]);
      } else {
        setAddresses([...addresses, newAddress]);
      }
    }
    
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingAddress(null);
  };

  const getAddressIcon = (type) => {
    const icons = {
      'Home': '🏠',
      'Work': '💼',
      'Other': '📍'
    };
    return icons[type] || '📍';
  };

  return (
    <div className="address-container">
      <div className="address-wrapper">
        <div className="address-header">
          <div>
            <h1>Saved Addresses</h1>
            <p>Manage your delivery addresses</p>
          </div>
          <button className="add-address-btn" onClick={handleAddNew}>
            + Add New Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="address-empty">
            <div className="empty-icon">📍</div>
            <h2>No addresses saved</h2>
            <p>Add your first delivery address to get started</p>
            <button className="add-first-btn" onClick={handleAddNew}>
              Add Address
            </button>
          </div>
        ) : (
          <div className="address-grid">
            {addresses.map(address => (
              <div key={address.id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
                {address.isDefault && (
                  <div className="default-badge">Default</div>
                )}
                
                <div className="address-card-header">
                  <div className="address-type">
                    <span className="type-icon">{getAddressIcon(address.type)}</span>
                    <span className="type-label">{address.type}</span>
                  </div>
                </div>

                <div className="address-details">
                  <h3>{address.name}</h3>
                  <p className="address-phone">📞 {address.phone}</p>
                  <p className="address-text">
                    {address.building}, {address.area}
                    {address.landmark && `, ${address.landmark}`}
                  </p>
                  <p className="address-text">
                    {address.city}, {address.state} - {address.postalCode}
                  </p>
                </div>

                <div className="address-actions">
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEdit(address)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDelete(address.id)}
                  >
                    🗑️ Delete
                  </button>
                  {!address.isDefault && (
                    <button 
                      className="action-btn default"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Address Modal */}
        {showModal && (
          <div className="address-modal-overlay" onClick={handleCancel}>
            <div className="address-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
                <button className="modal-close" onClick={handleCancel}>×</button>
              </div>

              <form onSubmit={handleSubmit} className="address-form">
                <div className="form-section">
                  <label className="form-label">Address Type</label>
                  <div className="address-types">
                    {addressTypes.map(type => (
                      <button
                        key={type}
                        type="button"
                        className={`type-btn ${formData.type === type ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, type })}
                      >
                        <span className="type-icon-large">{getAddressIcon(type)}</span>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 234-567-8900"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Flat / House No / Building *</label>
                  <input
                    type="text"
                    name="building"
                    value={formData.building}
                    onChange={handleInputChange}
                    placeholder="e.g., Apartment 4B, House No. 123"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Area / Street / Sector *</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="e.g., Main Street, Sector 5"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Landmark (Optional)</label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="e.g., Near Central Park"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postal Code *</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="ZIP code"
                      required
                    />
                  </div>
                </div>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="isDefault">Set as default address</label>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingAddress ? 'Update Address' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Address;