
import { Product, Order, Category, Table, User, Shift } from '../types';

const KEYS = {
  PRODUCTS: 'comanda_productos',
  ORDERS: 'comanda_ordenes',
  CATEGORIES: 'comanda_categorias',
  TABLES: 'comanda_tablas',
  RESTAURANT_NAME: 'comanda_restaurant_name',
  EVENT_TYPE: 'comanda_event_type',
  USERS: 'comanda_usuarios',
  SHIFTS: 'comanda_turnos',
};

export const storage = {
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
  getRestaurantName: (): string => {
    return localStorage.getItem(KEYS.RESTAURANT_NAME) || 'Mi Restaurante';
  },
  saveRestaurantName: (name: string) => {
    localStorage.setItem(KEYS.RESTAURANT_NAME, name);
  },
  getEventType: (): string => {
    return localStorage.getItem(KEYS.EVENT_TYPE) || 'Evento Gastronómico';
  },
  saveEventType: (type: string) => {
    localStorage.setItem(KEYS.EVENT_TYPE, type);
  },
};
