
import { Product, Order, Category, Table, User, Shift, CashShift, UserRole, StoreSettings, Ingredient } from '../types';

const KEYS = {
  PRODUCTS: 'comanda_productos',
  ORDERS: 'comanda_ordenes',
  CATEGORIES: 'comanda_categorias',
  TABLES: 'comanda_tablas',
  RESTAURANT_NAME: 'comanda_restaurant_name',
  EVENT_TYPE: 'comanda_event_type',
  SETTINGS: 'comanda_store_settings',
  USERS: 'comanda_usuarios',
  SHIFTS: 'comanda_turnos',
  CASH_SHIFTS: 'comanda_turnos_caja',
  ROLES: 'comanda_roles',
  INGREDIENTS: 'comanda_ingredientes',
};

export const storage = {
  getSettings: (): StoreSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) {
      return JSON.parse(data);
    }
    // Fallback for backwards compatibility
    return {
      name: localStorage.getItem(KEYS.RESTAURANT_NAME) || 'Mi Restaurante',
      eventType: localStorage.getItem(KEYS.EVENT_TYPE) || 'Restaurante',
      currency: 'MXN',
      taxRate: 0,
    };
  },
  saveSettings: (settings: StoreSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    // For backwards compatibility and parts of the app that rely on it
    localStorage.setItem(KEYS.RESTAURANT_NAME, settings.name);
    localStorage.setItem(KEYS.EVENT_TYPE, settings.eventType);
  },
  getRoles: (): UserRole[] => {
    const data = localStorage.getItem(KEYS.ROLES);
    return data ? JSON.parse(data) : [];
  },
  saveRoles: (roles: UserRole[]) => {
    localStorage.setItem(KEYS.ROLES, JSON.stringify(roles));
  },
  getProducts: (): Product[] => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },
  getOrders: (): Order[] => {
    const data = localStorage.getItem(KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  },
  saveOrders: (orders: Order[]) => {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },
  getCategories: (): Category[] => {
    const data = localStorage.getItem(KEYS.CATEGORIES);
    return data ? JSON.parse(data) : [];
  },
  saveCategories: (categories: Category[]) => {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },
  getTables: (): Table[] => {
    const data = localStorage.getItem(KEYS.TABLES);
    return data ? JSON.parse(data) : [];
  },
  saveTables: (tables: Table[]) => {
    localStorage.setItem(KEYS.TABLES, JSON.stringify(tables));
  },
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  getShifts: (): Shift[] => {
    const data = localStorage.getItem(KEYS.SHIFTS);
    return data ? JSON.parse(data) : [];
  },
  saveShifts: (shifts: Shift[]) => {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  },
  getCashShifts: (): CashShift[] => {
    const data = localStorage.getItem(KEYS.CASH_SHIFTS);
    return data ? JSON.parse(data) : [];
  },
  saveCashShifts: (shifts: CashShift[]) => {
    localStorage.setItem(KEYS.CASH_SHIFTS, JSON.stringify(shifts));
  },
  getRestaurantName: (): string => {
    return localStorage.getItem(KEYS.RESTAURANT_NAME) || 'Mi Restaurante';
  },
  saveRestaurantName: (name: string) => {
    localStorage.setItem(KEYS.RESTAURANT_NAME, name);
  },
  getEventType: (): string => {
    return localStorage.getItem(KEYS.EVENT_TYPE) || 'Restaurante';
  },
  saveEventType: (type: string) => {
    localStorage.setItem(KEYS.EVENT_TYPE, type);
  },
  getIngredients: (): Ingredient[] => {
    const data = localStorage.getItem(KEYS.INGREDIENTS);
    return data ? JSON.parse(data) : [];
  },
  saveIngredients: (ingredients: Ingredient[]) => {
    localStorage.setItem(KEYS.INGREDIENTS, JSON.stringify(ingredients));
  },
};
