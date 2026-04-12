export const getNotificationTarget = (notification) => {
  const type = notification?.type;
  const referenceId = notification?.reference_id;

  if (
    type === 'order_placed' ||
    type === 'order_accepted' ||
    type === 'order_shipped' ||
    type === 'order_delivered'
  ) {
    return referenceId ? `/orders/${referenceId}` : '/orders';
  }

  if (type === 'offer') {
    return '/offers';
  }

  return null;
};
