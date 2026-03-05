
import React, { useState, useEffect } from 'react';
import ImageScroller from '../../components/common/ImageScroller';
import HomeButtons from './HomeButtons';
import ItemCard from '../../components/common/ItemCard';
import { getShopsByBusinessType } from '../../services/shop.service';
import { itemService } from '../../services/item.service';
import './Home.css';

const Home = () => {
  const [groceryItems, setGroceryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroceryItems = async () => {
      try {
        setLoading(true);
        // First, get grocery shops
        const { shops } = await getShopsByBusinessType('grocery', { page: 1, page_size: 5 });
        
        if (shops && shops.length > 0) {
          // Fetch items from all grocery shops
          const itemsPromises = shops.map(shop => 
            itemService.getItemsByShop(shop.id, {}, 1, 10)
              .then(response => ({
                shopId: shop.id,
                shopName: shop.name,
                shopType: 'grocery',
                items: response.data || []
              }))
              .catch(err => {
                console.error(`Failed to fetch items for shop ${shop.id}:`, err);
                return { shopId: shop.id, shopName: shop.name, items: [] };
              })
          );

          const allShopItems = await Promise.all(itemsPromises);
          
          // Flatten all items into a single array
          const allItems = allShopItems.flatMap(shopData => 
            shopData.items.map(item => ({
              ...item,
              shopId: shopData.shopId,
              shopName: shopData.shopName,
              shopType: shopData.shopType
            }))
          );

          setGroceryItems(allItems);
        }
      } catch (error) {
        console.error('Error fetching grocery items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroceryItems();
  }, []);

  return (
    <div className="home-page">
      <ImageScroller />
      <HomeButtons />
      <div className="home-content">
        <h1>Welcome to BazarSe</h1>
        <p>Your local marketplace</p>
        
        {/* Grocery Items Section */}
        <div className="home-items-section">
          <h2 className="section-title">Fresh Grocery Items</h2>
    <h2 className="section-title">Fresh </h2>
           {loading ? (
            <div className="loading-message">Loading items...</div>
          ) : groceryItems.length > 0 ? (
            <div className="items-grid">
              {groceryItems.map(item => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  image={item.image_url}
                  isAvailable={item.is_available}
                  stockQuantityLabel={item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : 'Out of stock'}
                  stockQuantityValue={item.stock_quantity}
                  shopId={item.shopId}
                  shopType={item.shopType}
                />
              ))}
            </div>
          ) : (
            <p className="no-items-message">No grocery items available at the moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
