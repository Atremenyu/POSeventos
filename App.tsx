
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, ViewState, CartItem, PaymentMethod, Category, Table, OrderType, TakeawayType, OrderStatus, User, Shift } from './types';
import { storage } from './services/storage';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_TABLES, INITIAL_USERS, ROLES, Icons } from './constants';
import POSView from './components/POSView';
import DispatchView from './components/DispatchView';
import HistoryView from './components/HistoryView';
import TablesView from './components/TablesView';
import ProductManagement from './components/ProductManagement';
import TabNavigation from './components/TabNavigation';
import ActiveOrdersSlider from './components/ActiveOrdersSlider';
import { LoginView } from './components/LoginView';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  
  const [restaurantName, setRestaurantName] = useState('Mi Restaurante');
  const [eventType, setEventType] = useState('Evento Gastronómico');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNotification, setActiveNotification] = useState<{ id: string, message: string, type: 'ready' } | null>(null);
  const [showOrdersSlider, setShowOrdersSlider] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Load initial data
  useEffect(() => {
    const savedProducts = storage.getProducts();
    const savedCategories = storage.getCategories();
    const savedTables = storage.getTables();
    const savedOrders = storage.getOrders();
    const savedUsers = storage.getUsers();
    const savedShifts = storage.getShifts();
    const savedName = storage.getRestaurantName();
    const savedType = storage.getEventType();

    setProducts(savedProducts.length > 0 ? savedProducts : INITIAL_PRODUCTS);
    setCategories(savedCategories.length > 0 ? savedCategories : INITIAL_CATEGORIES);
    setTables(savedTables.length > 0 ? savedTables : INITIAL_TABLES);
    setOrders(savedOrders);
    setUsers(savedUsers.length > 0 ? savedUsers : INITIAL_USERS);
    setShifts(savedShifts);
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

  useEffect(() => {
    if (isLoaded) storage.saveUsers(users);
  }, [users, isLoaded]);

  useEffect(() => {
    if (isLoaded) storage.saveShifts(shifts);
  }, [shifts, isLoaded]);

  const restoreDatabase = (data: any) => {
    // 1. Persistencia inmediata y forzada para evitar fallos de renderizado
    if (data.products) storage.saveProducts(data.products);
    if (data.categories) storage.saveCategories(data.categories);
    if (data.tables) storage.saveTables(data.tables);
    if (data.orders) storage.saveOrders(data.orders);
    if (data.restaurantName) storage.saveRestaurantName(data.restaurantName);
    if (data.eventType) storage.saveEventType(data.eventType);
    if (data.users) storage.saveUsers(data.users);
    if (data.shifts) storage.saveShifts(data.shifts);

    // 2. Actualización de estado de React para reflejar en UI
    setProducts(data.products || []);
    setCategories(data.categories || []);
    setTables(data.tables || []);
    setOrders(data.orders || []);
    setUsers(data.users || INITIAL_USERS);
    setShifts(data.shifts || []);
    setRestaurantName(data.restaurantName || 'Mi Restaurante');
    setEventType(data.eventType || 'Evento Gastronómico');
    
    // 3. Limpiar carrito para evitar conflictos con productos viejos
    setCart([]);
    
    console.log("Base de datos restaurada correctamente en el estado global.");
  };

  const splitOrder = (orderId: string, splitQuantities: Record<number, number>, payment: PaymentMethod) => {
    setOrders(prev => {
      const order = prev.find(o => o.id === orderId);
      if (!order) return prev;

      let currentPaidTotal = 0;
      const updatedItems = order.items.map((item, idx) => {
        const qtyToPay = splitQuantities[idx] || 0;
        const currentPaid = item.paidQuantity || 0;
        const newPaid = currentPaid + qtyToPay;
        currentPaidTotal += item.price * qtyToPay;
        return { ...item, paidQuantity: newPaid };
      });

      const newPartialPayment = {
        method: payment,
        amount: currentPaidTotal,
        date: new Date().toISOString()
      };

      const partialPayments = [...(order.partialPayments || []), newPartialPayment];
      
      const allPaid = updatedItems.every(item => 
        (item.paidQuantity || 0) >= item.quantity
      );

      if (allPaid) {
        if (order.type === 'dine-in' && order.table) {
          setTables(prevTables => prevTables.map(t => 
            t.name === order.table ? { ...t, isOccupied: false } : t
          ));
        }
      }

      return prev.map(o => o.id === orderId ? {
        ...o,
        items: updatedItems,
        isPaid: allPaid,
        payment: allPaid ? payment : o.payment,
        status: allPaid ? 'delivered' : o.status,
        partialPayments
      } : o);
    });
  };

  const currentUserRole = useMemo(() => 
    ROLES.find(r => r.name === currentUser?.role),
  [currentUser]);

  const canAccessView = (v: ViewState) => {
    if (!currentUserRole) return false;
    return currentUserRole.permissions.includes(v);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    
    // Start shift
    const newShift: Shift = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      startTime: new Date().toISOString()
    };
    setShifts(prev => [newShift, ...prev]);
    setCurrentShiftId(newShift.id);

    // Set first available view
    const role = ROLES.find(r => r.name === user.role);
    if (role && role.permissions.length > 0) {
      setView(role.permissions[0]);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // End shift
    if (currentShiftId) {
      setShifts(prev => prev.map(s => 
        s.id === currentShiftId ? { ...s, endTime: new Date().toISOString() } : s
      ));
    }

    setCurrentUser(null);
    setCurrentShiftId(null);
    setView('login');
    setShowLogoutConfirm(false);
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

    const isPaidImmediately = type !== 'dine-in';
    const newOrder: Order = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      client: finalClient,
      table: finalTable,
      payment: isPaidImmediately ? payment : 'Pendiente',
      status: 'pending',
      type,
      takeawayType,
      total,
      items: cart.map(item => ({ 
        ...item, 
        status: 'pending' as OrderStatus,
        paidQuantity: isPaidImmediately ? item.quantity : 0 
      })),
      isPaid: isPaidImmediately,
      partialPayments: isPaidImmediately ? [{
        method: payment,
        amount: total,
        date: new Date().toISOString()
      }] : []
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
    const orderToPay = orders.find(o => o.id === orderId);
    if (!orderToPay) return;

    if (orderToPay.type === 'dine-in' && orderToPay.table) {
      const tableToFree = orderToPay.table;
      setTables(prev => prev.map(t => 
        t.name === tableToFree ? { ...t, isOccupied: false } : t
      ));
    }

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const alreadyPaid = o.partialPayments?.reduce((acc, p) => acc + p.amount, 0) || 0;
        const remainingAmount = Math.max(0, o.total - alreadyPaid);
        
        const finalPartialPayment = {
          method: payment,
          amount: remainingAmount,
          date: new Date().toISOString()
        };

        const updatedPartialPayments = [...(o.partialPayments || []), finalPartialPayment];

        return { 
          ...o, 
          isPaid: true, 
          payment, 
          status: 'delivered',
          partialPayments: updatedPartialPayments,
          items: o.items.map(item => ({ ...item, paidQuantity: item.quantity }))
        };
      }
      return o;
    }));
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

  if (!currentUser) {
    return <LoginView users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-black text-white shadow-md flex-shrink-0 z-[100] relative no-print border-b border-red-600">
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
            onViewChange={(newView) => {
              setView(newView);
              setShowOrdersSlider(false);
            }} 
            pendingCount={pendingCount} 
            activeOrdersCount={orders.filter(o => !(o.isPaid && o.status === 'delivered') && o.status !== 'cancelled').length}
            onToggleOrders={() => setShowOrdersSlider(true)}
            permissions={currentUserRole?.permissions || []}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          <div className="hidden lg:flex items-center space-x-3">
             <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] font-black uppercase text-red-500 tracking-tighter">{currentUser.role}</span>
                <span className="text-sm font-black uppercase tracking-tight">{currentUser.name}</span>
             </div>
             <button 
               onClick={() => {
                 console.log("Logout triggered");
                 handleLogout();
               }}
               className="p-2 rounded-xl bg-slate-100/10 text-white/50 hover:bg-red-600 hover:text-white transition-all border border-white/10 hover:border-red-600"
               title="Cerrar Sesión"
             >
               <Icons.X size={18} />
             </button>
          </div>
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
              onSplitOrder={splitOrder}
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
              users={users}
              setUsers={setUsers}
              shifts={shifts}
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
            className="fixed top-4 right-4 z-[180] w-full max-w-sm"
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

      {/* Custom Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative z-[1001] text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                <Icons.X size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Cerrar Sesión</h2>
              <p className="text-slate-500 font-medium tracking-tight mb-8">
                ¿Estás seguro que deseas salir? El turno actual se cerrará automáticamente.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={confirmLogout}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition shadow-lg shadow-red-200"
                >
                  Sí, Cerrar Sesión
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
