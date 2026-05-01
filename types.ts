
export type Category = string;

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
}

export interface CartItem extends Product {
  quantity: number;
  note?: string;
  status?: OrderStatus;
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Pendiente' | 'Uber' | 'Didi';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderType = 'dine-in' | 'takeaway';
export type TakeawayType = 'local' | 'delivery' | 'uber' | 'didi';

export interface Order {
  id: string;
  date: string;
  client: string;
  table: string;
  payment: PaymentMethod;
  status: OrderStatus;
  type: OrderType;
  takeawayType?: TakeawayType;
  total: number;
  items: CartItem[];
  isPaid: boolean;
  estimatedMinutes?: number;
  preparingAt?: string;
  readyAt?: string;
}

export type ViewState = 'pos' | 'dispatch' | 'history' | 'settings' | 'tables';

export interface Table {
  id: string;
  name: string;
  status: 'free' | 'occupied' | 'reserved';
  currentOrderId?: string;
}
