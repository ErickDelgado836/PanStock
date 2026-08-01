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
import {
  checkIsSupabaseConfigured,
  fetchUsersFromSupabase,
  saveUserToSupabase,
  deleteUserFromSupabase,
  fetchWarehousesFromSupabase,
  saveWarehousesToSupabase,
  fetchCategoriesFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  fetchProductsFromSupabase,
  saveProductsToSupabase,
  deleteProductFromSupabase,
  fetchMovementsFromSupabase,
  saveMovementToSupabase,
  fetchAuditsFromSupabase,
  saveAuditToSupabase,
} from '../lib/supabase';

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

// Global Supabase Sync status tracker
export type SupabaseSyncState = 'idle' | 'syncing' | 'connected' | 'error' | 'not_configured';

let currentSyncState: SupabaseSyncState = checkIsSupabaseConfigured() ? 'idle' : 'not_configured';
let lastSyncErrorMessage: string | null = null;

export function getSupabaseSyncStatus() {
  const isConfigured = checkIsSupabaseConfigured();
  return {
    state: currentSyncState,
    isConfigured,
    errorMessage: lastSyncErrorMessage,
  };
}

// Master Async Sync Function to fetch all tables from Supabase
export async function syncFromSupabase(): Promise<boolean> {
  if (!checkIsSupabaseConfigured()) {
    currentSyncState = 'not_configured';
    return false;
  }

  currentSyncState = 'syncing';
  notifyStorageChange();

  console.log('[Supabase Sync] 🔄 Initializing real-time sync with Supabase...');

  try {
    // 1. Fetch Users
    const remoteUsers = await fetchUsersFromSupabase();
    if (remoteUsers) {
      if (remoteUsers.length === 0) {
        // Seed default admin if empty
        console.log('[Supabase Sync] Seeding initial admin user to Supabase...');
        await saveUserToSupabase(DEFAULT_ADMIN_USER);
        localStorage.setItem(KEYS.USERS, JSON.stringify([DEFAULT_ADMIN_USER]));
      } else {
        localStorage.setItem(KEYS.USERS, JSON.stringify(remoteUsers));
      }
    }

    // 2. Fetch Warehouses
    const remoteWarehouses = await fetchWarehousesFromSupabase();
    if (remoteWarehouses) {
      if (remoteWarehouses.length === 0) {
        console.log('[Supabase Sync] Seeding initial warehouses to Supabase...');
        await saveWarehousesToSupabase(DEFAULT_WAREHOUSES);
      }
    }

    // 3. Fetch Categories
    const remoteCategories = await fetchCategoriesFromSupabase();
    if (remoteCategories) {
      if (remoteCategories.length === 0) {
        console.log('[Supabase Sync] Seeding initial categories to Supabase...');
        for (const cat of DEFAULT_CATEGORIES) {
          await saveCategoryToSupabase(cat);
        }
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      } else {
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(remoteCategories));
      }
    }

    // 4. Fetch Products
    const remoteProducts = await fetchProductsFromSupabase();
    if (remoteProducts) {
      if (remoteProducts.length === 0 && INITIAL_PRODUCTS.length > 0) {
        console.log('[Supabase Sync] Seeding initial products to Supabase...');
        await saveProductsToSupabase(INITIAL_PRODUCTS);
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      } else {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(remoteProducts));
      }
    }

    // 5. Fetch Movements
    const remoteMovements = await fetchMovementsFromSupabase();
    if (remoteMovements) {
      if (remoteMovements.length === 0 && INITIAL_MOVEMENTS.length > 0) {
        console.log('[Supabase Sync] Seeding initial movements to Supabase...');
        for (const mov of INITIAL_MOVEMENTS) {
          await saveMovementToSupabase(mov);
        }
        localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
      } else {
        localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(remoteMovements));
      }
    }

    // 6. Fetch Audits
    const remoteAudits = await fetchAuditsFromSupabase();
    if (remoteAudits) {
      localStorage.setItem(KEYS.AUDITS, JSON.stringify(remoteAudits));
    }

    const allFailed =
      remoteUsers === null &&
      remoteWarehouses === null &&
      remoteCategories === null &&
      remoteProducts === null &&
      remoteMovements === null &&
      remoteAudits === null;

    if (allFailed) {
      currentSyncState = 'error';
      lastSyncErrorMessage =
        'Las tablas aún no existen en tu proyecto de Supabase. Por favor abre el panel "Supabase SQL" y ejecuta el script de instalación.';
      console.warn(
        '[Supabase Sync] ⚠️ Supabase tables not found. Operating in local mode until SQL script is executed.'
      );
      notifyStorageChange();
      return false;
    }

    currentSyncState = 'connected';
    lastSyncErrorMessage = null;
    console.log('[Supabase Sync] ✅ All tables successfully synced with Supabase!');
    notifyStorageChange();
    return true;
  } catch (err: any) {
    currentSyncState = 'error';
    lastSyncErrorMessage = err?.message || 'Error al conectar con Supabase';
    console.warn('[Supabase Sync] ⚠️ Error syncing data from Supabase:', err);
    notifyStorageChange();
    return false;
  }
}

// Auto-trigger sync on module load if Supabase is configured
if (typeof window !== 'undefined' && checkIsSupabaseConfigured()) {
  setTimeout(() => {
    syncFromSupabase();
  }, 100);
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

  // Async push to Supabase
  if (checkIsSupabaseConfigured()) {
    users.forEach((u) => {
      saveUserToSupabase(u).catch((err) => console.error('[Supabase Push Error]', err));
    });
  }
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

export function deleteUser(username: string) {
  const users = getUsers().filter((u) => u.username !== username);
  saveUsers(users);

  if (checkIsSupabaseConfigured()) {
    deleteUserFromSupabase(username).catch((err) => console.error('[Supabase Delete User Error]', err));
  }
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

  if (checkIsSupabaseConfigured()) {
    saveCategoryToSupabase(category).catch((err) => console.error('[Supabase Add Category Error]', err));
  }
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    categories.forEach((cat) => {
      saveCategoryToSupabase(cat).catch((err) => console.error('[Supabase Save Category Error]', err));
    });
  }
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    deleteCategoryFromSupabase(id).catch((err) => console.error('[Supabase Delete Category Error]', err));
  }
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

  if (checkIsSupabaseConfigured()) {
    saveProductsToSupabase(products).catch((err) => console.error('[Supabase Save Products Error]', err));
  }
}

export function addProduct(product: Product) {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
}

export function deleteProduct(id: string) {
  const products = getProducts().filter((p) => p.id !== id);
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    deleteProductFromSupabase(id).catch((err) => console.error('[Supabase Delete Product Error]', err));
  }
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
  localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(movements));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    saveMovementToSupabase(movement).catch((err) => console.error('[Supabase Add Movement Error]', err));
  }
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

  if (checkIsSupabaseConfigured()) {
    saveAuditToSupabase(audit).catch((err) => console.error('[Supabase Add Audit Error]', err));
  }
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
