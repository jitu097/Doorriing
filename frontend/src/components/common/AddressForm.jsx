import React from 'react';

const AddressForm = ({ formData, setFormData, onSubmit, onCancel, isEditing }) => {
    const addressTypes = ['Home', 'Work', 'Other'];
    const deliveryAreas = ['Dhrampur', 'Jublee Chowk', 'Thana Chowk', 'Bypass', 'Bustand', 'Mako', 'Station','Chatnahi' , 'Station road', 'Navoday', 'Mako', 'Bus Stand', 'Circuit House' , 'Block', 'charmuhan',  'shivpuri','Amwatikar','Paharpuri',  'Chandandih','Main road latehar','Bijlee ofice', ' Near Celebration','Navrang chowk','Gandhi college','BS college'];
    const postalCodes = ['829206', '829207'];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Prevent changes to locked fields
        if (['city', 'state'].includes(name)) {
            return;
        }

        let newValue = type === 'checkbox' ? checked : value;

        // Restrict phone input to digits only and cap at 10 digits.
        if (name === 'phone') {
            newValue = String(value || '').replace(/\D/g, '').slice(0, 10);
        }

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const phone = (formData.phone || '').trim();
        const indianPhoneRegex = /^[6-9]\d{9}$/;
        if (!indianPhoneRegex.test(phone)) {
            alert('Please enter a valid 10-digit Indian phone number.');
            return;
        }
        onSubmit(e);
    };

    const getAddressIcon = (type) => {
        const icons = { 'Home': '🏠', 'Work': '💼', 'Other': '📍' };
        return icons[type] || '📍';
    };

    return (
        <div className="address-modal-overlay" onClick={onCancel}>
            <div className="address-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Address' : 'Add New Address'}</h2>
                    <button className="modal-close" onClick={onCancel}>×</button>
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
                            <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} placeholder="Enter your full name" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone Number *</label>
                            <input type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} name="phone" value={formData.phone || ''} onChange={handleInputChange} placeholder="e.g., 9876543210" required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Flat / House No / Building *</label>
                        <input type="text" name="building" value={formData.building || ''} onChange={handleInputChange} placeholder="e.g., Apartment 4B, House No. 123" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Area / Street / Sector *</label>
                        <select name="area" value={formData.area || ''} onChange={handleInputChange} required className="area-dropdown">
                            <option value="">Select Delivery Area</option>
                            {deliveryAreas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Landmark (Optional)</label>
                        <input type="text" name="landmark" value={formData.landmark || ''} onChange={handleInputChange} placeholder="e.g., Near Central Park" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">City *</label>
                            <input type="text" name="city" value="Latehar" readOnly className="locked-input" placeholder="Enter city" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State *</label>
                            <input type="text" name="state" value="Jharkhand" readOnly className="locked-input" placeholder="Enter state" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Postal Code *</label>
                            <select name="postalCode" value={formData.postalCode || '829206'} onChange={handleInputChange} required className="area-dropdown">
                                {postalCodes.map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-checkbox">
                        <input type="checkbox" id="isDefault" name="isDefault" checked={formData.isDefault} onChange={handleInputChange} />
                        <label htmlFor="isDefault">Set as default address</label>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                        <button type="submit" className="save-btn">{isEditing ? 'Update Address' : 'Save Address'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddressForm;
