
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, ViewState, CartItem, PaymentMethod, Category, Table, OrderType, TakeawayType, OrderStatus } from './types';
import { storage } from './services/storage';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_TABLES, Icons } from './constants';
import POSView from './components/POSView';
import DispatchView from './components/DispatchView';
import HistoryView from './components/HistoryView';
import TablesView from './components/TablesView';
import ProductManagement from './components/ProductManagement';
import TabNavigation from './components/TabNavigation';
import ActiveOrdersSlider from './components/ActiveOrdersSlider';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [restaurantName, setRestaurantName] = useState('Mi Restaurante');
  const [eventType, setEventType] = useState('Evento Gastronómico');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNotification, setActiveNotification] = useState<{ id: string, message: string, type: 'ready' } | null>(null);
  const [showOrdersSlider, setShowOrdersSlider] = useState(false);

  // Load initial data
  useEffect(() => {
    const savedProducts = storage.getProducts();
    const savedCategories = storage.getCategories();
    const savedTables = storage.getTables();
    const savedOrders = storage.getOrders();
    const savedName = storage.getRestaurantName();
    const savedType = storage.getEventType();

    setProducts(savedProducts.length > 0 ? savedProducts : INITIAL_PRODUCTS);
    setCategories(savedCategories.length > 0 ? savedCategories : INITIAL_CATEGORIES);
    setTables(savedTables.length > 0 ? savedTables : INITIAL_TABLES);
    setOrders(savedOrders);
    setRestaurantName(savedName);
    setEventType(savedType);
    setIsLoaded(true);
  }, []);

  // Save on changes (individual effects)
  useEffect(() => {
    if (isLoaded) storage.saveProducts(products);
  }, [products, isLoaded]);

  useEffect(() => {
    if (isLoaded) storage.saveCategories(categories);
  }, [categories, isLoaded]);

  useEffect(() => {
    if (isLoaded) storage.saveTables(tables);
  }, [tables, isLoaded]);

  useEffect(() => {
    if (isLoaded) storage.saveOrders(orders);
  }, [orders, isLoaded]);

  const restoreDatabase = (data: any) => {
    // 1. Persistencia inmediata y forzada para evitar fallos de renderizado
    if (data.products) storage.saveProducts(data.products);
    if (data.categories) storage.saveCategories(data.categories);
    if (data.tables) storage.saveTables(data.tables);
    if (data.orders) storage.saveOrders(data.orders);
    if (data.restaurantName) storage.saveRestaurantName(data.restaurantName);
    if (data.eventType) storage.saveEventType(data.eventType);

    // 2. Actualización de estado de React para reflejar en UI
    setProducts(data.products || []);
    setCategories(data.categories || []);
    setTables(data.tables || []);
    setOrders(data.orders || []);
    setRestaurantName(data.restaurantName || 'Mi Restaurante');
    setEventType(data.eventType || 'Evento Gastronómico');
    
    // 3. Limpiar carrito para evitar conflictos con productos viejos
    setCart([]);
    
    console.log("Base de datos restaurada correctamente en el estado global.");
  };

  const pendingCount = useMemo(() => 
    orders.filter(o => o.status === 'pending' || o.status === 'preparing').length, 
  [orders]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, note: '' }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateCartNote = (id: string, note: string) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, note } : item
    ));
  };

  const createOrder = (
    client: string, 
    table: string, 
    payment: PaymentMethod, 
    type: OrderType, 
    takeawayType?: TakeawayType
  ) => {
    if (cart.length === 0) return;

    const finalClient = client.trim() === '' ? 'Mostrador' : client;
    const finalTable = table.trim() === '' ? 'Mostrador' : table;

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Check if it's a dine-in order and if there's already an open order for this table
    if (type === 'dine-in' && finalTable !== 'Mostrador') {
      const existingOrder = orders.find(o => o.table === finalTable && o.type === 'dine-in' && !o.isPaid);
      if (existingOrder) {
        // Add items to existing order
        setOrders(prev => prev.map(o => {
          if (o.id === existingOrder.id) {
            const updatedItems = [...o.items];
            cart.forEach(cartItem => {
              // New items are always 'pending'
              const newItem = { ...cartItem, status: 'pending' as OrderStatus };
              
              // We don't merge same products if statuses would be different, 
              // but for simplicity in kitchen view, we'll append unique item entries if they are new
              updatedItems.push(newItem);
            });
            return {
              ...o,
              items: updatedItems,
              total: o.total + total,
              status: 'pending', // Mark as pending again for kitchen to notice new items
            };
          }
          return o;
        }));
        setCart([]);
        setView('dispatch');
        return;
      }
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      client: finalClient,
      table: finalTable,
      payment: type === 'dine-in' ? 'Pendiente' : payment,
      status: 'pending',
      type,
      takeawayType,
      total,
      items: cart.map(item => ({ ...item, status: 'pending' as OrderStatus })),
      isPaid: type === 'dine-in' ? false : true,
    };

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setSelectedTableId(null);
    setView('dispatch'); 
  };

  const updateItemStatus = (orderId: string, itemIdx: number, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newItems = [...o.items];
        newItems[itemIdx] = { ...newItems[itemIdx], status };
        
        // Auto-update order status if all items are delivered
        const allDelivered = newItems.every(i => i.status === 'delivered');
        const newOrderStatus = allDelivered ? 'delivered' : o.status;

        return { ...o, items: newItems, status: newOrderStatus };
      }
      return o;
    }));
  };

  const deliverOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { 
        ...o, 
        status: 'delivered' as const,
        items: o.items.map(item => ({ ...item, status: 'delivered' as OrderStatus }))
      } : o
    ));
  };

  const startPreparingOrder = (orderId: string, minutes: number) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { 
        ...o, 
        status: 'preparing' as const, 
        estimatedMinutes: minutes,
        preparingAt: new Date().toISOString(),
        items: o.items.map(item => ({ 
          ...item, 
          status: (item.status === 'delivered' || item.status === 'ready') ? item.status : ('preparing' as OrderStatus) 
        }))
      } : o
    ));
  };

  const updateOrderTime = (orderId: string, minutes: number) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, estimatedMinutes: minutes } : o
    ));
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio notification failed', e);
    }
  };

  const markOrderReady = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setOrders(prev => prev.map(o => 
      o.id === orderId ? { 
        ...o, 
        status: 'ready' as const,
        readyAt: new Date().toISOString(),
        items: o.items.map(item => ({ 
          ...item, 
          status: item.status === 'delivered' ? 'delivered' : ('ready' as OrderStatus) 
        }))
      } : o
    ));

    const location = order.type === 'dine-in' ? `Mesa ${order.table}` : (order.takeawayType?.toUpperCase() || 'LLEVAR');
    const message = `ORDEN LISTA: ${location} (${order.client})`;
    
    playNotificationSound();
    setActiveNotification({ id: orderId, message, type: 'ready' });
    
    // Auto hide notification after 10 seconds
    setTimeout(() => {
      setActiveNotification(prev => prev?.id === orderId ? null : prev);
    }, 10000);
  };

  const payOrder = (orderId: string, payment: PaymentMethod) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, isPaid: true, payment } : o
    ));
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: 'cancelled' } : o
    ));
  };

  const transferOrder = (orderId: string, newTable: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, table: newTable } : o
    ));
  };

  const handleUpdateSettings = (name: string, type: string) => {
    setRestaurantName(name);
    setEventType(type);
    storage.saveRestaurantName(name);
    storage.saveEventType(type);
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin text-red-600"><Icons.Settings /></div>
          <p className="font-black uppercase tracking-widest text-xs">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-black text-white shadow-md flex-shrink-0 z-[60] relative no-print border-b border-red-600">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-red-600">
              <Icons.ChefHat />
            </span>
            <div className="leading-tight">
              <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">{restaurantName}</h1>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{eventType}</p>
            </div>
          </div>
          
          <TabNavigation 
            activeView={view} 
            onViewChange={setView} 
            pendingCount={pendingCount} 
            activeOrdersCount={orders.filter(o => !(o.isPaid && o.status === 'delivered') && o.status !== 'cancelled').length}
            onToggleOrders={() => setShowOrdersSlider(true)}
          />
        </div>
      </header>

      <main className="flex-grow overflow-auto pb-24 md:pb-0">
        <div className="h-full">
          {view === 'pos' && (
            <POSView 
              products={products}
              categories={categories}
              cart={cart}
              orders={orders}
              tables={tables}
              initialTableId={selectedTableId}
              onAddToCart={addToCart} 
              onUpdateQuantity={updateCartQuantity}
              onUpdateNote={updateCartNote}
              onCheckout={createOrder}
              onDeliver={deliverOrder}
              onUpdateItemStatus={updateItemStatus}
              onPay={payOrder}
              onCancel={cancelOrder}
              onToggleOrders={() => setShowOrdersSlider(true)}
            />
          )}
          {view === 'dispatch' && (
            <DispatchView 
              orders={orders} 
              tables={tables}
              onDeliver={deliverOrder}
              onPay={payOrder}
              onCancel={cancelOrder}
              onTransfer={transferOrder}
              onStartPreparing={startPreparingOrder}
              onMarkReady={markOrderReady}
              onUpdateTime={updateOrderTime}
              onUpdateItemStatus={updateItemStatus}
              restaurantName={restaurantName}
            />
          )}
          {view === 'history' && (
            <HistoryView 
              orders={orders} 
              tables={tables}
              restaurantName={restaurantName} 
            />
          )}
          {view === 'tables' && (
            <TablesView 
              tables={tables} 
              orders={orders}
              onSelectTable={(tableId) => {
                setSelectedTableId(tableId);
                setView('pos');
              }}
              onPay={payOrder}
              onCancel={cancelOrder}
              onDeliver={deliverOrder}
              restaurantName={restaurantName}
            />
          )}
          {view === 'settings' && (
            <ProductManagement 
              products={products} 
              setProducts={setProducts}
              categories={categories}
              setCategories={setCategories}
              tables={tables}
              setTables={setTables}
              orders={orders}
              setOrders={setOrders}
              restaurantName={restaurantName}
              eventType={eventType}
              onUpdateSettings={handleUpdateSettings}
              onRestoreDatabase={restoreDatabase}
            />
          )}
        </div>
      </main>
      
      <footer className="hidden md:block bg-black text-slate-500 border-t border-red-900 text-center py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] no-print safe-bottom">
        Sistema POS - Red & Black Edition - {new Date().getFullYear()}
      </footer>

      <ActiveOrdersSlider 
        isOpen={showOrdersSlider}
        onClose={() => setShowOrdersSlider(false)}
        orders={orders}
        onDeliver={deliverOrder}
        onUpdateItemStatus={updateItemStatus}
        onPay={payOrder}
        onCancel={cancelOrder}
      />

      {/* Global Notification */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-4 right-4 z-[100] w-full max-w-sm"
          >
             <div className="bg-black text-white p-4 rounded-2xl shadow-2xl border-l-4 border-green-500 flex items-center space-x-4">
                <div className="bg-green-600 p-2 rounded-lg text-white">
                   <Icons.Check />
                </div>
                <div className="flex-grow">
                   <p className="text-[9px] font-black uppercase tracking-widest text-green-500">Pedido Listo</p>
                   <p className="text-xs font-bold uppercase tracking-tight leading-tight">{activeNotification.message}</p>
                </div>
                <button 
                  onClick={() => setActiveNotification(null)}
                  className="text-slate-500 hover:text-white transition p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
