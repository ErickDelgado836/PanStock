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
import { reconcileAllProducts } from '../utils/lotUtils';
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
  deleteMovementFromSupabase,
  purgeMovementsFromSupabase,
  fetchAuditsFromSupabase,
  saveAuditToSupabase,
  registerSupabaseRealtimeCallback,
} from '../lib/supabase';
import { parseAnyDate } from '../utils/movementSearch';

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
      const hasSeeded = localStorage.getItem('panstock_products_seeded_v1');
      if (remoteProducts.length === 0 && INITIAL_PRODUCTS.length > 0 && !hasSeeded) {
        console.log('[Supabase Sync] Seeding initial products to Supabase...');
        await saveProductsToSupabase(INITIAL_PRODUCTS);
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        localStorage.setItem('panstock_products_seeded_v1', 'true');
      } else {
        localStorage.setItem('panstock_products_seeded_v1', 'true');
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(remoteProducts));
      }
    }

    // 5. Fetch Movements
    const remoteMovements = await fetchMovementsFromSupabase();
    if (remoteMovements) {
      const hasSeededMovs = localStorage.getItem('panstock_movements_seeded_v1');
      if (remoteMovements.length === 0 && INITIAL_MOVEMENTS.length > 0 && !hasSeededMovs) {
        console.log('[Supabase Sync] Seeding initial movements to Supabase...');
        for (const mov of INITIAL_MOVEMENTS) {
          await saveMovementToSupabase(mov);
        }
        localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
        localStorage.setItem('panstock_movements_seeded_v1', 'true');
      } else {
        localStorage.setItem('panstock_movements_seeded_v1', 'true');
        const sortedMovements = [...remoteMovements].sort((a, b) => {
          const dateA = parseAnyDate(a.date)?.getTime() || 0;
          const dateB = parseAnyDate(b.date)?.getTime() || 0;
          return dateB - dateA;
        });
        localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(sortedMovements));
      }
    }

    // 6. Fetch Audits
    const remoteAudits = await fetchAuditsFromSupabase();
    if (remoteAudits) {
      // Merge remote audits with any locally created audits not yet on server
      const localData = localStorage.getItem(KEYS.AUDITS);
      const localAudits: PhysicalAuditRecord[] = localData ? JSON.parse(localData) : [];
      const mergedMap = new Map<string, PhysicalAuditRecord>();

      // Remote audits first
      remoteAudits.forEach((a) => mergedMap.set(a.id, a));
      // Local audits if missing in remote
      localAudits.forEach((a) => {
        if (!mergedMap.has(a.id)) {
          mergedMap.set(a.id, a);
          saveAuditToSupabase(a).catch(() => {});
        }
      });

      const sortedAudits = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = parseAnyDate(a.date)?.getTime() || 0;
        const dateB = parseAnyDate(b.date)?.getTime() || 0;
        return dateB - dateA;
      });

      localStorage.setItem(KEYS.AUDITS, JSON.stringify(sortedAudits));
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
let lastSyncTimestamp = 0;
let realtimeDebounceTimer: any = null;

if (typeof window !== 'undefined') {
  if (checkIsSupabaseConfigured()) {
    setTimeout(() => {
      lastSyncTimestamp = Date.now();
      syncFromSupabase();
    }, 100);

    // Register realtime callback to trigger full sync when any changes are detected (debounced to avoid spam)
    registerSupabaseRealtimeCallback((payload) => {
      const table = payload?.table;
      // Chat and presence are handled separately in chatService, ignore here to avoid redundant table queries
      if (table === 'chat_messages' || table === 'user_presence') {
        return;
      }

      console.log('[Supabase Realtime] Change received in storage service for table:', table);
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      realtimeDebounceTimer = setTimeout(() => {
        lastSyncTimestamp = Date.now();
        syncFromSupabase().catch((err) => console.error('[Supabase Realtime Sync Error]', err));
      }, 1200);
    });

    // Relaxed background safety sync every 2 minutes (120s) - ONLY if tab is visible
    setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        checkIsSupabaseConfigured() &&
        Date.now() - lastSyncTimestamp > 90000
      ) {
        lastSyncTimestamp = Date.now();
        syncFromSupabase().catch((err) => console.error('[Background Sync Error]', err));
      }
    }, 120000);

    // Sync when user focuses back on the window if not synced recently
    window.addEventListener('focus', () => {
      if (
        document.visibilityState === 'visible' &&
        checkIsSupabaseConfigured() &&
        Date.now() - lastSyncTimestamp > 45000
      ) {
        lastSyncTimestamp = Date.now();
        syncFromSupabase().catch((err) => console.error('[Focus Sync Error]', err));
      }
    });
  }
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
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [DEFAULT_ADMIN_USER];
  } catch (e) {
    console.error('[Storage] Corrupt users data, resetting', e);
    const initial = [DEFAULT_ADMIN_USER];
    localStorage.setItem(KEYS.USERS, JSON.stringify(initial));
    return initial;
  }
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
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('[Storage] Corrupt current_user data', e);
    localStorage.removeItem(KEYS.CURRENT_USER);
    return null;
  }
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
  const users = getUsers().filter((u) => u.username.toLowerCase() !== username.toLowerCase());
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  notifyStorageChange();

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
  let cats: Category[] = DEFAULT_CATEGORIES;
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      cats = parsed;
    }
  } catch (e) {
    console.error('[Storage] Corrupt categories data', e);
  }
  let updated = false;

  DEFAULT_CATEGORIES.forEach((defCat) => {
    const existingIndex = cats.findIndex(
      (c) => c.id === defCat.id || c.codePrefix === defCat.codePrefix
    );
    if (existingIndex !== -1) {
      if (cats[existingIndex].name !== defCat.name || cats[existingIndex].codePrefix !== defCat.codePrefix) {
        cats[existingIndex].name = defCat.name;
        cats[existingIndex].codePrefix = defCat.codePrefix;
        updated = true;
      }
    } else {
      cats.push(defCat);
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
  }
  return cats;
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
    const reconciled = reconcileAllProducts(INITIAL_PRODUCTS);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(reconciled));
    return reconciled;
  }
  try {
    const parsed: Product[] = JSON.parse(data);
    return reconcileAllProducts(parsed);
  } catch (err) {
    return reconcileAllProducts(INITIAL_PRODUCTS);
  }
}

export function saveProducts(products: Product[]) {
  const reconciled = reconcileAllProducts(products);
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(reconciled));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    saveProductsToSupabase(reconciled).catch((err) => console.error('[Supabase Save Products Error]', err));
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
  try {
    const parsed: MovementRecord[] = JSON.parse(data);
    return parsed.sort((a, b) => {
      const dateA = parseAnyDate(a.date)?.getTime() || 0;
      const dateB = parseAnyDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });
  } catch (e) {
    return [];
  }
}

export function saveMovements(movements: MovementRecord[]) {
  localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(movements));
  notifyStorageChange();
}

export function addMovement(movement: MovementRecord) {
  const movements = getMovements();
  const filtered = movements.filter((m) => m.id !== movement.id);
  filtered.unshift(movement); // Newest first
  localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(filtered));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    saveMovementToSupabase(movement)
      .then(() => {
        syncFromSupabase();
      })
      .catch((err) => console.error('[Supabase Add Movement Error]', err));
  }
}

export async function deleteMovement(id: string) {
  const currentMovements = getMovements().filter((m) => m.id !== id);
  localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(currentMovements));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    try {
      await deleteMovementFromSupabase(id);
      await syncFromSupabase();
    } catch (err) {
      console.error('[Supabase Delete Movement Error]', err);
    }
  }
}

export async function purgeMovements(warehouseId: string, purgeType: string) {
  const currentMovements = getMovements();
  const filtered = currentMovements.filter((m) => {
    const matchWh =
      m.sourceWarehouseId === warehouseId ||
      m.targetWarehouseId === warehouseId;
    if (!matchWh) return true;
    if (purgeType === 'ALL') return false;
    return m.type !== purgeType;
  });

  localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(filtered));
  notifyStorageChange();

  if (checkIsSupabaseConfigured()) {
    try {
      await purgeMovementsFromSupabase(warehouseId, purgeType);
      await syncFromSupabase();
    } catch (err) {
      console.error('[Supabase Purge Movements Error]', err);
    }
  }
}

// Physical Audits
export function getPhysicalAudits(): PhysicalAuditRecord[] {
  const data = localStorage.getItem(KEYS.AUDITS);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
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
    saveAuditToSupabase(audit)
      .then(() => {
        syncFromSupabase();
      })
      .catch((err) => console.error('[Supabase Add Audit Error]', err));
  }
}

export function getLastAuditsMap(): WarehouseCategoryLastAudit {
  const data = localStorage.getItem(KEYS.LAST_AUDITS);
  if (!data) return {};
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
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
