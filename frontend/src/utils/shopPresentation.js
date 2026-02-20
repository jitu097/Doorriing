const IMAGE_CANDIDATES = [
  'image_url',
  'image',
  'logo_url',
  'banner_url',
  'thumbnail_url',
  'cover_image',
  'profile_image',
  'shop_image',
  'shop_image_url',
  'shop_logo',
  'photo_url',
  'display_image',
];

const parseNumeric = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveShopImage = (shop = {}) => {
  for (const key of IMAGE_CANDIDATES) {
    const rawValue = shop[key];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return null;
};

export const getShopCategoryCount = (shop = {}) => {
  const candidates = [shop.category_count, shop.categories_count, shop.total_categories];
  for (const entry of candidates) {
    const parsed = parseNumeric(entry);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

export const getShopStockCount = (shop = {}) => {
  const candidates = [
    shop.total_stock_quantity,
    shop.inventory_quantity,
    shop.stock_quantity,
    shop.items_in_stock,
  ];

  for (const entry of candidates) {
    const parsed = parseNumeric(entry);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

export const getShopStatusMeta = (shop = {}) => {
  const isActive = shop.is_active !== false;
  const isOpen = typeof shop.is_open === 'boolean' ? shop.is_open : isActive;
  let label = shop.status_label || shop.shop_status || shop.status;

  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    label = isOpen ? 'Open' : 'Closed';
  } else {
    const trimmed = label.trim();
    label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return {
    label,
    isOpen,
    isClosed: !isOpen,
  };
};

export const formatCount = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return new Intl.NumberFormat('en-IN').format(numeric);
};
