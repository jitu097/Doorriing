import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const AddressContext = createContext();

export const useAddress = () => useContext(AddressContext);

export const AddressProvider = ({ children }) => {
    const { user, loading: authLoading } = useContext(AuthContext);
    const [addresses, setAddresses] = useState([]);
    const [activeAddress, setActiveAddress] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAddresses = useCallback(async () => {
        if (authLoading) return;
        if (!user) {
            setAddresses([]);
            setActiveAddress(null);
            return;
        }
        try {
            setIsLoading(true);
            const response = await api.get('/user/addresses');
            if (response.success) {
                setAddresses(response.data || []);
                const defaultAddress = response.data.find(a => a.isDefault);
                setActiveAddress(defaultAddress || response.data[0] || null);
            }
        } catch (error) {
            console.error('Failed to fetch addresses', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const addAddress = async (newAddressData) => {
        try {
            const response = await api.post('/user/addresses', newAddressData);
            if (response.success) {
                await fetchAddresses();
                return response.data;
            }
        } catch (error) {
            console.error('Failed to add address', error);
            throw error;
        }
    };

    const updateAddress = async (id, updatedData) => {
        try {
            const response = await api.put(`/user/addresses/${id}`, updatedData);
            if (response.success) {
                await fetchAddresses();
                return response.data;
            }
        } catch (error) {
            console.error('Failed to update address', error);
            throw error;
        }
    };

    const deleteAddress = async (id) => {
        try {
            const response = await api.delete(`/user/addresses/${id}`);
            if (response.success) {
                await fetchAddresses();
            }
        } catch (error) {
            console.error('Failed to delete address', error);
            throw error;
        }
    };

    const setDefaultAddress = async (id) => {
        try {
            const response = await api.patch(`/user/addresses/${id}/default`, {});
            if (response.success) {
                await fetchAddresses();
            }
        } catch (error) {
            console.error('Failed to set default address', error);
            throw error;
        }
    };

    // When the user manually clicks on a location from Navbar, it shouldn't hit the DB if we just want it to be active locally.
    // However, if we want sync, changing active location should probably just equal changing the "default" address, or saving an active memory separate from default.
    // Given the prompt "When marking default: Call PATCH endpoint Update UI instantly", active address logic can remain local until they actually hit "Save" / explicit default change.
    // The previous behaviour was changing setActiveAddress which we can still allow locally without an API call if desired, or map it.

    const value = {
        addresses,
        activeAddress,
        setActiveAddress,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        isLoading,
        refreshAddresses: fetchAddresses
    };

    return (
        <AddressContext.Provider value={value}>
            {children}
        </AddressContext.Provider>
    );
};
