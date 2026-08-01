import {
  Category,
  MovementRecord,
  PhysicalAuditRecord,
  Product,
  UserProfile,
  Warehouse,
  WarehouseCategoryLastAudit,
} from '../types';
import {
  DEFAULT_ADMIN_USER,
  DEFAULT_CATEGORIES,
  DEFAULT_WAREHOUSES,
  INITIAL_MOVEMENTS,
  INITIAL_PRODUCTS,
} from '../data/seedData';

const KEYS = {
  USERS: 'panstock_users_v1',
  CURRENT_USER: 'panstock_current_user_v1',
  CATEGORIES: 'panstock_categories_v1',
  PRODUCTS: 'panstock_products_v1',
  MOVEMENTS: 'panstock_movements_v1',
  AUDITS: 'panstock_audits_v1',
  LAST_AUDITS: 'panstock_last_audits_v1',
};

// Event emitter helper for reactive state updates
const STORAGE_EVENT = 'panstock_data_updated';

export function notifyStorageChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeToStorage(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  return () => window.removeEventListener(STORAGE_EVENT, callback);
}

// Warehouses
export function getWarehouses(): Warehouse[] {
  return DEFAULT_WAREHOUSES;
}

// Users
export function getUsers(): UserProfile[] {
  const data = localStorage.getItem(KEYS.USERS);
  if (!data) {
    const initial = [DEFAULT_ADMIN_USER];
    localStorage.setItem(KEYS.USERS, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function saveUsers(users: UserProfile[]) {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  notifyStorageChange();
}

export function getCurrentUser(): UserProfile | null {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  if (!data) return null;
  return JSON.parse(data);
}

export function setCurrentUser(user: UserProfile | null) {
  if (!user) {
    localStorage.removeItem(KEYS.CURRENT_USER);
  } else {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  }
  notifyStorageChange();
}

// Categories
export function getCategories(): Category[] {
  const data = localStorage.getItem(KEYS.CATEGORIES);
  if (!data) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(data);
}

export function addCategory(category: Category) {
  const categories = getCategories();
  categories.push(category);
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  notifyStorageChange();
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  notifyStorageChange();
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  notifyStorageChange();
}

// Products
export function getProducts(): Product[] {
  const data = localStorage.getItem(KEYS.PRODUCTS);
  if (!data) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  return JSON.parse(data);
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  notifyStorageChange();
}

export function addProduct(product: Product) {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
}

// Movements
export function getMovements(): MovementRecord[] {
  const data = localStorage.getItem(KEYS.MOVEMENTS);
  if (!data) {
    localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
    return INITIAL_MOVEMENTS;
  }
  return JSON.parse(data);
}

export function saveMovements(movements: MovementRecord[]) {
  localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(movements));
  notifyStorageChange();
}

export function addMovement(movement: MovementRecord) {
  const movements = getMovements();
  movements.unshift(movement); // Newest first
  saveMovements(movements);
}

// Physical Audits
export function getPhysicalAudits(): PhysicalAuditRecord[] {
  const data = localStorage.getItem(KEYS.AUDITS);
  return data ? JSON.parse(data) : [];
}

export function addPhysicalAudit(audit: PhysicalAuditRecord) {
  const audits = getPhysicalAudits();
  audits.unshift(audit);
  localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));

  // Update last audit map
  const lastAudits = getLastAuditsMap();
  const key = `${audit.warehouseId}_${audit.categoryId}`;
  lastAudits[key] = audit.date;
  localStorage.setItem(KEYS.LAST_AUDITS, JSON.stringify(lastAudits));

  notifyStorageChange();
}

export function getLastAuditsMap(): WarehouseCategoryLastAudit {
  const data = localStorage.getItem(KEYS.LAST_AUDITS);
  return data ? JSON.parse(data) : {};
}

// Utility for total stock calculation
export function calculateTotalStock(stockByWarehouse: { [key: string]: number }): number {
  return Object.values(stockByWarehouse).reduce((acc, curr) => acc + (curr || 0), 0);
}

// Reference Document Check
export function isDocRefDuplicate(docRef: string): boolean {
  if (!docRef.trim()) return false;
  const movements = getMovements();
  return movements.some((m) => m.docRef.trim().toLowerCase() === docRef.trim().toLowerCase());
}

// Product Code Duplicate Check (Scoped by Category/Subgroup if categoryId provided)
export function isProductCodeDuplicate(code: string, categoryId?: string): boolean {
  const products = getProducts();
  const cleanCode = code.trim().toLowerCase();
  return products.some((p) => {
    if (categoryId && p.categoryId !== categoryId) {
      return false;
    }
    const pCode = p.code.trim().toLowerCase();
    return pCode === cleanCode || pCode.endsWith(`-${cleanCode}`);
  });
}

// Product Name Duplicate Check (Scoped by Category/Subgroup if categoryId provided)
export function isProductNameDuplicate(name: string, categoryId?: string): boolean {
  const products = getProducts();
  const cleanName = name.trim().toLowerCase();
  return products.some((p) => {
    if (categoryId && p.categoryId !== categoryId) {
      return false;
    }
    return p.name.trim().toLowerCase() === cleanName;
  });
}
