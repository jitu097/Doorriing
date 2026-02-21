import addressService from './address.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class AddressController {
    constructor() {
        this.getAddresses = this.getAddresses.bind(this);
        this.addAddress = this.addAddress.bind(this);
        this.updateAddress = this.updateAddress.bind(this);
        this.deleteAddress = this.deleteAddress.bind(this);
        this.setDefaultAddress = this.setDefaultAddress.bind(this);
        this.formatPayload = this.formatPayload.bind(this);
        this.formatResponse = this.formatResponse.bind(this);
    }

    // Format received frontend payload to backend table columns
    formatPayload(body) {
        return {
            full_name: body.name,
            phone: body.phone,
            address_line_1: body.building,
            address_line_2: body.area,
            city: body.city,
            state: body.state,
            pincode: body.postalCode,
            landmark: body.landmark || null,
            address_type: body.type || 'Home',
            is_default: !!body.isDefault
        };
    }

    // Format backend table columns to expected frontend structure
    formatResponse(row) {
        return {
            id: row.id,
            name: row.full_name,
            phone: row.phone,
            building: row.address_line_1,
            area: row.address_line_2,
            city: row.city,
            state: row.state,
            postalCode: row.pincode,
            landmark: row.landmark,
            type: row.address_type,
            isDefault: row.is_default
        };
    }

    /**
     * Get all addresses
     * GET /api/user/addresses
     */
    async getAddresses(req, res, next) {
        try {
            const { customerId } = req.user;
            if (!customerId) return sendError(res, 'Customer account required', 403);

            const addresses = await addressService.getAddresses(customerId);
            const formatted = addresses.map(this.formatResponse);

            return sendSuccess(res, formatted, 'Addresses fetched successfully');
        } catch (error) {
            logger.error('GetAddresses controller error', { error: error.message });
            next(error);
        }
    }

    /**
     * Add a new address
     * POST /api/user/addresses
     */
    async addAddress(req, res, next) {
        try {
            const { customerId } = req.user;
            if (!customerId) return sendError(res, 'Customer account required', 403);

            const requiredFields = ['name', 'phone', 'building', 'area', 'city', 'state', 'postalCode'];
            const missing = requiredFields.filter(field => !req.body[field]);
            if (missing.length > 0) {
                return sendError(res, `Missing required fields: ${missing.join(', ')}`, 400);
            }

            const payload = this.formatPayload(req.body);
            const newAddress = await addressService.addAddress(customerId, payload);

            return sendSuccess(res, this.formatResponse(newAddress), 'Address added successfully', 201);
        } catch (error) {
            if (error.message.includes('limit') || error.message.includes('Identical')) {
                return sendError(res, error.message, 400);
            }
            logger.error('AddAddress controller error', { error: error.message });
            next(error);
        }
    }

    /**
     * Update address
     * PUT /api/user/addresses/:id
     */
    async updateAddress(req, res, next) {
        try {
            const { customerId } = req.user;
            const { id } = req.params;

            if (!customerId) return sendError(res, 'Customer account required', 403);
            if (!id) return sendError(res, 'Address ID required', 400);

            const payload = this.formatPayload(req.body);
            const updated = await addressService.updateAddress(customerId, id, payload);

            return sendSuccess(res, this.formatResponse(updated), 'Address updated successfully');
        } catch (error) {
            if (error.message.includes('unauthorized')) return sendError(res, error.message, 403);
            logger.error('UpdateAddress controller error', { error: error.message });
            next(error);
        }
    }

    /**
     * Delete address
     * DELETE /api/user/addresses/:id
     */
    async deleteAddress(req, res, next) {
        try {
            const { customerId } = req.user;
            const { id } = req.params;

            if (!customerId) return sendError(res, 'Customer account required', 403);
            if (!id) return sendError(res, 'Address ID required', 400);

            await addressService.deleteAddress(customerId, id);

            return sendSuccess(res, null, 'Address deleted successfully');
        } catch (error) {
            if (error.message.includes('unauthorized')) return sendError(res, error.message, 403);
            logger.error('DeleteAddress controller error', { error: error.message });
            next(error);
        }
    }

    /**
     * Set default address
     * PATCH /api/user/addresses/:id/default
     */
    async setDefaultAddress(req, res, next) {
        try {
            const { customerId } = req.user;
            const { id } = req.params;

            if (!customerId) return sendError(res, 'Customer account required', 403);
            if (!id) return sendError(res, 'Address ID required', 400);

            const updated = await addressService.setDefaultAddress(customerId, id);

            return sendSuccess(res, this.formatResponse(updated), 'Default address updated successfully');
        } catch (error) {
            if (error.message.includes('unauthorized')) return sendError(res, error.message, 403);
            logger.error('SetDefaultAddress controller error', { error: error.message });
            next(error);
        }
    }
}

export default new AddressController();
