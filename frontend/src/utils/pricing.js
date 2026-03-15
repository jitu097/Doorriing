export const computeFinalPrice = (originalPrice, discountType, discountValue) => {
  if (originalPrice === undefined || originalPrice === null) {
    return originalPrice ?? null;
  }

  if (!discountType || discountValue === undefined || discountValue === null) {
    return originalPrice;
  }

  const priceNumber = Number(originalPrice);
  const discountNumber = Number(discountValue);

  if (Number.isNaN(priceNumber) || Number.isNaN(discountNumber)) {
    return originalPrice;
  }

  const normalizedType = discountType.toString().toLowerCase();
  let finalPrice = priceNumber;

  if (normalizedType === 'percentage' || normalizedType === 'percent') {
    finalPrice = priceNumber - priceNumber * (discountNumber / 100);
  } else if (normalizedType === 'flat' || normalizedType === 'amount') {
    finalPrice = priceNumber - discountNumber;
  } else {
    return originalPrice;
  }

  return finalPrice < 0 ? 0 : finalPrice;
};

export default computeFinalPrice;
