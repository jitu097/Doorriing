import React, { createContext, useContext, useState } from 'react';

const RecentOrderContext = createContext();

export const RecentOrderProvider = ({ children }) => {
  const [recentOrder, setRecentOrder] = useState(null);

  const setOrderAsRecent = (order) => {
    setRecentOrder(order);
  };

  const clearRecentOrder = () => {
    setRecentOrder(null);
  };

  return (
    <RecentOrderContext.Provider value={{ recentOrder, setOrderAsRecent, clearRecentOrder }}>
      {children}
    </RecentOrderContext.Provider>
  );
};

export const useRecentOrder = () => {
  const context = useContext(RecentOrderContext);
  if (!context) {
    throw new Error('useRecentOrder must be used within RecentOrderProvider');
  }
  return context;
};
