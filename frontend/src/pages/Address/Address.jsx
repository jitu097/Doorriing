import { useState } from 'react';
import { useAddress } from '../../context/AddressContext';
import AddressForm from '../../components/common/AddressForm';
import './Address.css';

const Address = () => {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, isLoading } = useAddress();

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddress(id);
      } catch (err) {
        alert(err.message || 'Failed to delete address');
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
    } catch (err) {
      alert(err.message || 'Failed to set default address');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingAddress) {
        // Update existing address
        await updateAddress(editingAddress, formData);
      } else {
        // Add new address
        await addAddress(formData);
      }
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Error saving address');
    } finally {
      setIsSaving(false);
    }
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

        {isLoading ? (
          <div className="address-loading">Loading addresses...</div>
        ) : addresses.length === 0 ? (
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
          <AddressForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={!!editingAddress}
          />
        )}
      </div>
    </div>
  );
};

export default Address;