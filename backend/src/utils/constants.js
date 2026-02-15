export const ROLES = {
  CUSTOMER: 'customer',
  SELLER: 'seller',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const PAYMENT_METHOD = {
  COD: 'cod',
  ONLINE: 'online',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const BUSINESS_TYPE = {
  RESTAURANT: 'restaurant',
  GROCERY: 'grocery',
};

export const NOTIFICATION_TYPE = {
  ORDER: 'order',
  STOCK: 'stock',
  BOOKING: 'booking',
  PROMOTION: 'promotion',
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
