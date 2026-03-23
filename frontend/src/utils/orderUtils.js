export const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
        case 'pending':
            return { label: 'Order Placed', colorClass: 'badge-yellow', message: 'Seller is reviewing your order.' };
        case 'accepted':
            return { label: 'Accepted', colorClass: 'badge-blue', message: 'Order accepted by seller.' };
        case 'confirmed':
            return { label: 'Confirmed', colorClass: 'badge-blue', message: 'Order confirmed by seller.' };
        case 'preparing':
        case 'packing':
            return { label: 'Preparing', colorClass: 'badge-orange', message: 'Your order is being prepared.' };
        case 'ready':
            return { label: 'Ready', colorClass: 'badge-orange', message: 'Your order is ready.' };
        case 'out_for_delivery':
            return { label: 'Out for Delivery', colorClass: 'badge-purple', message: 'Your order is out for delivery.' };
        case 'delivered':
            return { label: 'Delivered', colorClass: 'badge-green', message: 'Order has been delivered.' };
        case 'rejected':
            return { label: 'Rejected', colorClass: 'badge-red', message: 'Order rejected by seller.' };
        case 'expired':
            return { label: 'Order Expired', colorClass: 'badge-gray', message: 'Seller did not respond in time.' };
        case 'cancelled':
            return { label: 'Order Cancelled', colorClass: 'badge-dark-red', message: 'Order has been cancelled.' };
        default:
            return { label: status || 'Unknown', colorClass: 'badge-gray', message: '' };
    }
};
