
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, ViewState, CartItem, PaymentMethod, Category, Table, OrderType, TakeawayType, OrderStatus, User, Shift, SelectedModifier, CashShift, UserRole, PaymentRecord, StoreSettings, AdminTabType, ComboOption, Ingredient } from './types';
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
import CashOpeningModal from './components/CashOpeningModal';
import CashClosingModal from './components/CashClosingModal';
import AdminCRM from './components/AdminCRM';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [cashShifts, setCashShifts] = useState<CashShift[]>([]);
  const [roles, setRoles] = useState<UserRole[]>(ROLES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'Mi Restaurante',
    eventType: 'Evento Gastronómico',
    currency: 'MXN',
    taxRate: 0,
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNotification, setActiveNotification] = useState<{ id: string, message: string, type: 'ready' } | null>(null);
  const [showOrdersSlider, setShowOrdersSlider] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [adminView, setAdminView] = useState<AdminTabType>('overview');

  // Load initial data
  useEffect(() => {
    const savedProducts = storage.getProducts();
    const savedIngredients = storage.getIngredients() || [];
    const savedCategories = storage.getCategories();
    const savedTables = storage.getTables();
    const savedOrders = storage.getOrders();
    const savedUsers = storage.getUsers();
    const savedShifts = storage.getShifts();
    const savedCashShifts = storage.getCashShifts();
    const savedRoles = storage.getRoles();
    const savedSettings = storage.getSettings();

    const rawProducts = savedProducts.length > 0 ? savedProducts : INITIAL_PRODUCTS;
    const cleanedProducts = rawProducts.map((p: any) => ({
      ...p,
      modifierGroups: p.modifierGroups?.filter((mg: any) => 
        !mg.name.toLowerCase().includes('término') && 
        !mg.name.toLowerCase().includes('meat')
      )
    }));
    setProducts(cleanedProducts);
    setIngredients(savedIngredients);
    setCategories(savedCategories.length > 0 ? savedCategories : INITIAL_CATEGORIES);
    setTables(savedTables.length > 0 ? savedTables : INITIAL_TABLES);
    const migratedOrders = savedOrders.map((o: any) => ({
      ...o,
      payments: o.payments || o.partialPayments?.map((p: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        amount: p.amount,
        method: p.method,
        tip: 0,
        timestamp: p.date || o.date
      })) || [],
      tip: o.tip || 0
    }));
    setOrders(migratedOrders);
    setUsers(savedUsers.length > 0 ? savedUsers : INITIAL_USERS);
    setShifts(savedShifts);
    setCashShifts(savedCashShifts);
    setRoles(savedRoles.length > 0 ? savedRoles : ROLES);
    setSettings(savedSettings);
    setIsLoaded(true);
  }, []);

  // Save on changes (individual effects)
  useEffect(() => {
    if (isLoaded) storage.saveProducts(products);
  }, [products, isLoaded]);

  useEffect(() => {
    if (isLoaded) storage.saveIngredients(ingredients);
  }, [ingredients, isLoaded]);

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

  useEffect(() => {
    if (isLoaded) storage.saveCashShifts(cashShifts);
  }, [cashShifts, isLoaded]);

  useEffect(() => {
    if (isLoaded) storage.saveRoles(roles);
  }, [roles, isLoaded]);

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
    if (data.cashShifts) storage.saveCashShifts(data.cashShifts);
    if (data.roles) storage.saveRoles(data.roles);

    // 2. Actualización de estado de React para reflejar en UI
    setProducts(data.products || []);
    setCategories(data.categories || []);
    setTables(data.tables || []);
    const migratedOrders = (data.orders || []).map((o: any) => ({
      ...o,
      payments: o.payments || o.partialPayments?.map((p: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        amount: p.amount,
        method: p.method,
        tip: 0,
        timestamp: p.date || o.date
      })) || [],
      tip: o.tip || 0
    }));
    setOrders(migratedOrders);
    setUsers(data.users || INITIAL_USERS);
    setShifts(data.shifts || []);
    setCashShifts(data.cashShifts || []);
    setRoles(data.roles || ROLES);
    setSettings(data.settings || storage.getSettings());
    
    // 3. Limpiar carrito para evitar conflictos con productos viejos
    setCart([]);
    
    console.log("Base de datos restaurada correctamente en el estado global.");
  };

  const splitOrder = (orderId: string, splitQuantities: Record<number, number>, payment: PaymentMethod, tip: number = 0) => {
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

      const newPayment: PaymentRecord = {
        id: Math.random().toString(36).substr(2, 9),
        method: payment,
        amount: currentPaidTotal,
        tip: tip,
        timestamp: new Date().toISOString()
      };

      const payments = [...(order.payments || []), newPayment];
      
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
        tip: (o.tip || 0) + tip,
        payments
      } : o);
    });
  };

  const currentUserRole = useMemo(() => 
    roles.find(r => r.name === currentUser?.role),
  [currentUser, roles]);

  const canAccessView = (v: ViewState) => {
    if (!currentUserRole) return false;
    return currentUserRole.permissions.includes(v);
  };

  // Migrate old roles to new roles
  useEffect(() => {
    setRoles(prevRoles => {
      let needsMigration = false;
      const updatedRoles = prevRoles.map(role => {
        if (role.permissions.includes('history') || role.permissions.includes('settings')) {
          needsMigration = true;
          return {
            ...role,
            permissions: Array.from(new Set(role.permissions.filter(p => p !== 'history' && p !== 'settings').concat('central' as ViewState)))
          };
        }
        return role;
      });
      return needsMigration ? updatedRoles : prevRoles;
    });
  }, []);

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
    const role = roles.find(r => r.name === user.role);
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

  const handleOpenCashShift = (initialFund: number) => {
    if (!currentUser) return;
    const newShift: CashShift = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      openingTime: new Date().toISOString(),
      initialFund,
      status: 'open'
    };
    setCashShifts(prev => [...prev, newShift]);
    setView('pos');
  };

  const handleCloseCashShift = (actualAmount: number, notes?: string) => {
    setCashShifts(prev => prev.map(s => {
      if (s.status === 'open') {
        const { expectedAmount } = getCashShiftStats(s);
        
        return {
          ...s,
          closingTime: new Date().toISOString(),
          actualAmount,
          expectedAmount,
          difference: actualAmount - expectedAmount,
          status: 'closed',
          notes
        };
      }
      return s;
    }));
    setShowClosingModal(false);
  };

  const getCashShiftStats = (shift: CashShift) => {
    const shiftOrders = orders.filter(o => 
      o.status === 'delivered' && 
      o.isPaid && 
      new Date(o.date) > new Date(shift.openingTime)
    );
    const salesTotal = shiftOrders.reduce((acc, o) => acc + o.total, 0);
    const expectedAmount = shift.initialFund + salesTotal;
    return { salesTotal, expectedAmount };
  };

  const pendingCount = useMemo(() => 
    orders.filter(o => o.status === 'pending' || o.status === 'preparing').length, 
  [orders]);

  const hasOpenCashShift = useMemo(() => {
    return cashShifts.some(s => s.status === 'open');
  }, [cashShifts]);

  const currentOpenCashShift = useMemo(() => {
    return cashShifts.find(s => s.status === 'open');
  }, [cashShifts]);

  const addToCart = (product: Product, selectedModifiers?: SelectedModifier[], note?: string, isCombo?: boolean, selectedComboOptions?: ComboOption[]) => {
    if (!hasOpenCashShift && (currentUser?.role === 'Admin' || currentUser?.role === 'Caja')) {
      alert('Debes abrir la caja antes de tomar pedidos.');
      // Switch view to cash audit if possible or show modal
      setView('history');
      return;
    }
    
    // Check stock if needed (Advanced: could warn if stock is low)
    // For now, we just discount on order creation
    
    setCart(prev => {
      const modifierKey = selectedModifiers ? JSON.stringify(selectedModifiers) : '';
      const comboKey = JSON.stringify(selectedComboOptions || []);
      const existing = prev.find(item => 
        item.id === product.id && 
        JSON.stringify(item.selectedModifiers || []) === modifierKey &&
        (item.note || '') === (note || '') &&
        (item.isCombo || false) === (isCombo || false) &&
        JSON.stringify(item.selectedComboOptions || []) === comboKey
      );

      if (existing) {
        return prev.map(item => 
          (item.id === product.id && 
           JSON.stringify(item.selectedModifiers || []) === modifierKey &&
           (item.note || '') === (note || '') &&
           (item.isCombo || false) === (isCombo || false) &&
           JSON.stringify(item.selectedComboOptions || []) === comboKey)
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }

      // Calculate base price + modifiers + combo extra
      const extrasPrice = selectedModifiers?.reduce((acc, m) => acc + m.extraPrice, 0) || 0;
      const comboExtra = isCombo ? (selectedComboOptions?.reduce((acc, o) => acc + o.extraPrice, 0) || 0) : 0;
      const finalPrice = product.price + extrasPrice + comboExtra;

      return [...prev, { 
        ...product, 
        price: finalPrice, 
        quantity: 1, 
        note: note || '', 
        selectedModifiers,
        isCombo,
        selectedComboOptions
      }];
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

  const discountStock = (cartItems: CartItem[]) => {
    setIngredients(prev => {
      const newIngredients = [...prev];
      cartItems.forEach(item => {
        // Original product recipe
        const originalProduct = products.find(p => p.id === item.id);
        if (originalProduct?.recipe) {
          originalProduct.recipe.forEach(ri => {
            const ingIndex = newIngredients.findIndex(i => i.id === ri.ingredientId);
            if (ingIndex !== -1) {
              newIngredients[ingIndex] = { 
                ...newIngredients[ingIndex], 
                stock: newIngredients[ingIndex].stock - (ri.quantity * item.quantity) 
              };
            }
          });
        }

        // Selected modifiers recipes
        item.selectedModifiers?.forEach(sm => {
          const modifier = originalProduct?.modifierGroups?.flatMap(g => g.modifiers).find(m => m.id === sm.modifierId);
          if (modifier?.recipe) {
            modifier.recipe.forEach(ri => {
              const ingIndex = newIngredients.findIndex(i => i.id === ri.ingredientId);
              if (ingIndex !== -1) {
                newIngredients[ingIndex] = { 
                  ...newIngredients[ingIndex], 
                  stock: newIngredients[ingIndex].stock - (ri.quantity * item.quantity) 
                };
              }
            });
          }
        });
      });
      return newIngredients;
    });
  };

  const createOrder = (
    client: string, 
    table: string, 
    payment: PaymentMethod, 
    type: OrderType, 
    takeawayType?: TakeawayType
  ) => {
    if (cart.length === 0) return;

    // Discount stock before clearing cart
    discountStock(cart);

    const finalClient = client.trim() === '' ? 'Mostrador' : client;
    const finalTable = table.trim() === '' ? 'Mostrador' : table;

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Check if it's a dine-in order and if there's already an open order for this table
    if (type === 'dine-in' && finalTable !== 'Mostrador') {
      const existingOrder = orders.find(o => o.table === finalTable && o.type === 'dine-in' && !o.isPaid && o.status !== 'cancelled');
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
    const newPayment: PaymentRecord[] = isPaidImmediately ? [{
      id: Math.random().toString(36).substr(2, 9),
      method: payment,
      amount: total,
      tip: 0,
      timestamp: new Date().toISOString()
    }] : [];

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
      tip: 0,
      items: cart.map(item => ({ 
        ...item, 
        status: 'pending' as OrderStatus,
        paidQuantity: isPaidImmediately ? item.quantity : 0 
      })),
      isPaid: isPaidImmediately,
      payments: newPayment
    };

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setSelectedTableId(null);
    
    // Check if can access dispatch before redirecting, otherwise go to first allowed view
    if (canAccessView('dispatch')) {
      setView('dispatch');
    } else {
      const firstAllowed = currentUserRole?.permissions[0] || 'login';
      setView(firstAllowed);
    }
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

  const recordPayment = (orderId: string, amount: number, method: PaymentMethod, tip: number = 0) => {
    setOrders(prev => {
      const orderToPay = prev.find(o => o.id === orderId);
      if (!orderToPay) return prev;

      const newPayment: PaymentRecord = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        method,
        tip,
        timestamp: new Date().toISOString()
      };

      const updatedPayments = [...(orderToPay.payments || []), newPayment];
      const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
      const allPaid = totalPaid >= orderToPay.total;

      if (allPaid && orderToPay.type === 'dine-in' && orderToPay.table) {
        setTables(prevTables => prevTables.map(t => 
          t.name === orderToPay.table ? { ...t, isOccupied: false } : t
        ));
      }

      return prev.map(o => {
        if (o.id === orderId) {
          return { 
            ...o, 
            isPaid: allPaid, 
            payment: allPaid ? method : o.payment, 
            status: allPaid ? 'delivered' : o.status,
            payments: updatedPayments,
            tip: (o.tip || 0) + tip,
            items: o.items.map(item => ({ 
              ...item, 
              paidQuantity: allPaid ? item.quantity : (item.paidQuantity || 0) + (item.quantity * (amount / o.total))
            }))
          };
        }
        return o;
      });
    });
  };

  const payOrder = (orderId: string, payment: PaymentMethod, tip: number = 0, amount?: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const alreadyPaid = order.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remaining = Math.max(0, order.total - alreadyPaid);
    
    const amountToPay = amount !== undefined ? Math.min(amount, remaining) : remaining;
    
    recordPayment(orderId, amountToPay, payment, tip);
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => {
      const order = prev.find(o => o.id === orderId);
      if (order && order.type === 'dine-in' && order.table) {
        setTables(prevTables => prevTables.map(t => 
          t.name === order.table ? { ...t, isOccupied: false } : t
        ));
      }
      return prev.map(o => 
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      );
    });
  };

  const transferOrder = (orderId: string, newTable: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, table: newTable } : o
    ));
  };

  const handleUpdateSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    storage.saveSettings(newSettings);
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
              <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">{settings.name}</h1>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{settings.eventType}</p>
            </div>
          </div>
          
          <TabNavigation 
            activeView={view} 
            onViewChange={(newView) => {
              setView(newView);
              setShowOrdersSlider(false);
            }} 
            adminView={adminView}
            onAdminViewChange={setAdminView}
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
          {view === 'pos' && canAccessView('pos') && (
            <POSView 
              products={products}
              categories={categories}
              cart={cart}
              orders={orders}
              tables={tables}
              initialTableId={selectedTableId}
              hasOpenCashShift={hasOpenCashShift}
              onOpenShift={() => setShowOpeningModal(true)}
              onCloseShift={() => setShowClosingModal(true)}
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
          {view === 'central' && canAccessView('central') && (
            <AdminCRM 
              activeTab={adminView}
              setActiveTab={setAdminView}
              products={products}
              categories={categories}
              tables={tables}
              orders={orders}
              cashShifts={cashShifts}
              users={users}
              roles={roles}
              shifts={shifts}
              settings={settings}
              hasOpenCashShift={hasOpenCashShift}
              onUpdateProducts={setProducts}
              onUpdateCategories={setCategories}
              onUpdateTables={setTables}
              onUpdateUsers={setUsers}
              onUpdateRoles={setRoles}
              onUpdateSettings={handleUpdateSettings}
              onRestoreDatabase={restoreDatabase}
              onCloseCashShift={() => setShowClosingModal(true)}
              ingredients={ingredients}
              setIngredients={setIngredients}
            />
          )}
          {view === 'dispatch' && canAccessView('dispatch') && (
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
              restaurantName={settings.name}
            />
          )}
          {view === 'tables' && canAccessView('tables') && (
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
              restaurantName={settings.name}
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

        {showOpeningModal && (
          <CashOpeningModal 
            onOpen={(fund) => {
              handleOpenCashShift(fund);
              setShowOpeningModal(false);
            }}
            onClose={() => setShowOpeningModal(false)}
          />
        )}

        {showClosingModal && currentOpenCashShift && (
          <CashClosingModal 
            expectedAmount={getCashShiftStats(currentOpenCashShift).expectedAmount}
            initialFund={currentOpenCashShift.initialFund}
            salesTotal={getCashShiftStats(currentOpenCashShift).salesTotal}
            onConfirm={handleCloseCashShift}
            onClose={() => setShowClosingModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
