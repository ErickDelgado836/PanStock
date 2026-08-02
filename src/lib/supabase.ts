import { createClient } from '@supabase/supabase-js';
import {
  Category,
  MovementRecord,
  PhysicalAuditRecord,
  Product,
  UserProfile,
  Warehouse,
} from '../types';

// Helper to clean Supabase URL (strips trailing slashes and /rest/v1)
export function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

// Helper to resolve Supabase credentials from localStorage or Vite env
export function getSupabaseCredentials(): { url: string; key: string } {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('panstock_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('panstock_supabase_anon_key') || '' : '';

  const env = (import.meta as any).env || {};
  const envUrl = env.VITE_SUPABASE_URL || '';
  const envKey = env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: cleanSupabaseUrl(localUrl || envUrl),
    key: (localKey || envKey).trim(),
  };
}

export function checkIsSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(
    url &&
      key &&
      url.startsWith('https://') &&
      !url.includes('your-project-ref') &&
      !key.includes('your-anon-key')
  );
}

export let isSupabaseConfigured = checkIsSupabaseConfigured();

const initialCreds = getSupabaseCredentials();
const safeUrl = checkIsSupabaseConfigured() ? initialCreds.url : 'https://placeholder.supabase.co';
const safeKey = checkIsSupabaseConfigured() ? initialCreds.key : 'placeholder-anon-key';

export let supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function updateSupabaseClient(url: string, key: string) {
  const cleanedUrl = cleanSupabaseUrl(url);
  const cleanedKey = key.trim();

  if (typeof window !== 'undefined') {
    if (cleanedUrl && cleanedKey) {
      localStorage.setItem('panstock_supabase_url', cleanedUrl);
      localStorage.setItem('panstock_supabase_anon_key', cleanedKey);
    } else {
      localStorage.removeItem('panstock_supabase_url');
      localStorage.removeItem('panstock_supabase_anon_key');
    }
  }

  isSupabaseConfigured = checkIsSupabaseConfigured();
  const currentCreds = getSupabaseCredentials();
  const activeUrl = isSupabaseConfigured ? currentCreds.url : 'https://placeholder.supabase.co';
  const activeKey = isSupabaseConfigured ? currentCreds.key : 'placeholder-anon-key';

  supabase = createClient(activeUrl, activeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  if (isSupabaseConfigured) {
    console.log('[Supabase Configuration] Client re-initialized with URL:', activeUrl);
  } else {
    console.warn('[Supabase Configuration] Client reset to Local Sync mode.');
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Configuration] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid. Operating in Local Sync mode.'
  );
} else {
  console.log('[Supabase Configuration] Supabase credentials loaded successfully:', initialCreds.url);
}

// Helper for logging execution results cleanly without throwing unhandled console errors
const logSupabase = (action: string, success: boolean, dataOrError: any) => {
  const timestamp = new Date().toLocaleTimeString();
  if (success) {
    console.log(`[Supabase ${timestamp}] ✅ ${action}:`, dataOrError);
  } else {
    const msg = dataOrError?.message || dataOrError?.details || JSON.stringify(dataOrError);
    console.warn(`[Supabase ${timestamp}] ⚠️ ${action}: ${msg}`);
  }
};

// ==========================================
// 1. USUARIOS (USERS)
// ==========================================

export async function fetchUsersFromSupabase(): Promise<UserProfile[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    console.log('[Supabase] Fetching users from table "usuarios"...');
    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) {
      logSupabase('fetchUsers', false, error);
      return null;
    }
    logSupabase('fetchUsers', true, `Retrieved ${data?.length || 0} users`);
    return data.map((row: any) => ({
      username: row.username,
      password: row.password,
      roleName: row.role_name || row.roleName || 'Operador',
      isAdmin: Boolean(row.is_admin ?? row.isAdmin),
      permissions: row.permissions || {
        canEntries: true,
        canExits: true,
        canTransfers: true,
        canExpiry: true,
        canSales: true,
        canPhysicalInventory: true,
        allowedWarehouses: ['00', '01', '02', '002', '03', '09', '05', '06', '07', '08'],
      },
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt,
      isSuspended: Boolean(row.is_suspended ?? row.isSuspended),
      suspendedAt: row.suspended_at || row.suspendedAt,
      isDeleted: Boolean(row.is_deleted ?? row.isDeleted),
      deletedAt: row.deleted_at || row.deletedAt,
    }));
  } catch (err) {
    logSupabase('fetchUsers Exception', false, err);
    return null;
  }
}

export async function saveUserToSupabase(user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      username: user.username,
      password: user.password,
      role_name: user.roleName,
      is_admin: user.isAdmin,
      permissions: user.permissions,
      is_suspended: user.isSuspended || false,
      is_deleted: user.isDeleted || false,
      updated_at: new Date().toISOString(),
    };
    console.log('[Supabase] Upserting user:', user.username);
    const { error } = await supabase.from('usuarios').upsert(payload, { onConflict: 'username' });
    if (error) {
      logSupabase('saveUser', false, error);
      return false;
    }
    logSupabase('saveUser', true, user.username);
    return true;
  } catch (err) {
    logSupabase('saveUser Exception', false, err);
    return false;
  }
}

export async function deleteUserFromSupabase(username: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    console.log('[Supabase] Deleting user from "usuarios":', username);
    const { error } = await supabase.from('usuarios').delete().eq('username', username);
    if (error) {
      logSupabase('deleteUser', false, error);
      return false;
    }
    logSupabase('deleteUser', true, username);
    return true;
  } catch (err) {
    logSupabase('deleteUser Exception', false, err);
    return false;
  }
}

// ==========================================
// 2. ALMACENES (WAREHOUSES)
// ==========================================

export async function fetchWarehousesFromSupabase(): Promise<Warehouse[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    console.log('[Supabase] Fetching warehouses from "almacenes"...');
    const { data, error } = await supabase.from('almacenes').select('*').order('code', { ascending: true });
    if (error) {
      logSupabase('fetchWarehouses', false, error);
      return null;
    }
    logSupabase('fetchWarehouses', true, `Retrieved ${data?.length || 0} warehouses`);
    return data.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || '',
      isMainEntry: Boolean(row.is_main_entry ?? row.isMainEntry),
      isSalesWarehouse: Boolean(row.is_sales_warehouse ?? row.isSalesWarehouse),
    }));
  } catch (err) {
    logSupabase('fetchWarehouses Exception', false, err);
    return null;
  }
}

export async function saveWarehousesToSupabase(warehouses: Warehouse[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = warehouses.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      description: w.description,
      is_main_entry: w.isMainEntry || false,
      is_sales_warehouse: w.isSalesWarehouse || false,
    }));
    console.log('[Supabase] Upserting warehouses...');
    const { error } = await supabase.from('almacenes').upsert(payload, { onConflict: 'id' });
    if (error) {
      logSupabase('saveWarehouses', false, error);
      return false;
    }
    logSupabase('saveWarehouses', true, `${warehouses.length} warehouses saved`);
    return true;
  } catch (err) {
    logSupabase('saveWarehouses Exception', false, err);
    return false;
  }
}

// ==========================================
// 3. CATEGORIAS (CATEGORIES)
// ==========================================

export async function fetchCategoriesFromSupabase(): Promise<Category[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    console.log('[Supabase] Fetching categories from "categorias"...');
    const { data, error } = await supabase.from('categorias').select('*').order('name', { ascending: true });
    if (error) {
      logSupabase('fetchCategories', false, error);
      return null;
    }
    logSupabase('fetchCategories', true, `Retrieved ${data?.length || 0} categories`);
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      codePrefix: row.code_prefix || row.codePrefix,
      isDefault: Boolean(row.is_default ?? row.isDefault),
    }));
  } catch (err) {
    logSupabase('fetchCategories Exception', false, err);
    return null;
  }
}

export async function saveCategoryToSupabase(category: Category): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: category.id,
      name: category.name,
      code_prefix: category.codePrefix,
      is_default: category.isDefault || false,
    };
    console.log('[Supabase] Upserting category:', category.name);
    const { error } = await supabase.from('categorias').upsert(payload, { onConflict: 'id' });
    if (error) {
      logSupabase('saveCategory', false, error);
      return false;
    }
    logSupabase('saveCategory', true, category.name);
    return true;
  } catch (err) {
    logSupabase('saveCategory Exception', false, err);
    return false;
  }
}

export async function deleteCategoryFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    console.log('[Supabase] Deleting category:', id);
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) {
      logSupabase('deleteCategory', false, error);
      return false;
    }
    logSupabase('deleteCategory', true, id);
    return true;
  } catch (err) {
    logSupabase('deleteCategory Exception', false, err);
    return false;
  }
}

// ==========================================
// 4. PRODUCTOS (PRODUCTS)
// ==========================================

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    console.log('[Supabase] Fetching products from "productos"...');
    const { data, error } = await supabase.from('productos').select('*').order('code', { ascending: true });
    if (error) {
      logSupabase('fetchProducts', false, error);
      return null;
    }
    logSupabase('fetchProducts', true, `Retrieved ${data?.length || 0} products`);
    return data.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      categoryId: row.category_id || row.categoryId,
      unit: row.unit,
      stockByWarehouse: row.stock_by_warehouse || row.stockByWarehouse || {},
      expirationDate: row.expiration_date || row.expirationDate,
      lots: row.lots || [],
      entryDate: row.entry_date || row.entryDate || new Date().toISOString().split('T')[0],
      notes: row.notes,
      minStockAlert: row.min_stock_alert ?? row.minStockAlert,
    }));
  } catch (err) {
    logSupabase('fetchProducts Exception', false, err);
    return null;
  }
}

export async function saveProductsToSupabase(products: Product[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category_id: p.categoryId,
      unit: p.unit,
      stock_by_warehouse: p.stockByWarehouse,
      expiration_date: p.expirationDate || null,
      lots: p.lots || [],
      entry_date: p.entryDate,
      notes: p.notes || '',
      min_stock_alert: p.minStockAlert || 0,
    }));
    console.log('[Supabase] Upserting products count:', products.length);
    const { error } = await supabase.from('productos').upsert(payload, { onConflict: 'id' });
    if (error) {
      logSupabase('saveProducts', false, error);
      return false;
    }
    logSupabase('saveProducts', true, `${products.length} products updated`);
    return true;
  } catch (err) {
    logSupabase('saveProducts Exception', false, err);
    return false;
  }
}

export async function saveSingleProductToSupabase(product: Product): Promise<boolean> {
  return saveProductsToSupabase([product]);
}

export async function deleteProductFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    console.log('[Supabase] Deleting product:', id);
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) {
      logSupabase('deleteProduct', false, error);
      return false;
    }
    logSupabase('deleteProduct', true, id);
    return true;
  } catch (err) {
    logSupabase('deleteProduct Exception', false, err);
    return false;
  }
}

// ==========================================
// 5. MOVIMIENTOS (MOVEMENTS)
// ==========================================

export async function fetchMovementsFromSupabase(): Promise<MovementRecord[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    console.log('[Supabase] Fetching movements from "movimientos"...');
    const { data, error } = await supabase.from('movimientos').select('*').order('date', { ascending: false });
    if (error) {
      logSupabase('fetchMovements', false, error);
      return null;
    }
    logSupabase('fetchMovements', true, `Retrieved ${data?.length || 0} movements`);
    return data.map((row: any) => ({
      id: row.id,
      movementNumber: row.movement_number || row.movementNumber,
      type: row.type,
      docRef: row.doc_ref || row.docRef || '',
      date: row.date,
      responsibleUser: row.responsible_user || row.responsibleUser,
      sourceWarehouseId: row.source_warehouse_id || row.sourceWarehouseId,
      targetWarehouseId: row.target_warehouse_id || row.targetWarehouseId,
      notes: row.notes || '',
      items: row.items || [],
    }));
  } catch (err) {
    logSupabase('fetchMovements Exception', false, err);
    return null;
  }
}

export async function saveMovementToSupabase(movement: MovementRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: movement.id,
      movement_number: movement.movementNumber,
      type: movement.type,
      doc_ref: movement.docRef,
      date: movement.date,
      responsible_user: movement.responsibleUser,
      source_warehouse_id: movement.sourceWarehouseId || null,
      target_warehouse_id: movement.targetWarehouseId || null,
      notes: movement.notes,
      items: movement.items,
    };
    console.log('[Supabase] Upserting movement:', movement.movementNumber);
    const { error } = await supabase.from('movimientos').upsert(payload, { onConflict: 'id' });
    if (error) {
      logSupabase('saveMovement', false, error);
      return false;
    }
    logSupabase('saveMovement', true, movement.movementNumber);
    return true;
  } catch (err) {
    logSupabase('saveMovement Exception', false, err);
    return false;
  }
}

// ==========================================
// 6. AUDITORIAS (AUDITS)
// ==========================================

export async function fetchAuditsFromSupabase(): Promise<PhysicalAuditRecord[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    console.log('[Supabase] Fetching physical audits from "auditorias"...');
    const { data, error } = await supabase.from('auditorias').select('*').order('date', { ascending: false });
    if (error) {
      logSupabase('fetchAudits', false, error);
      return null;
    }
    logSupabase('fetchAudits', true, `Retrieved ${data?.length || 0} audit records`);
    return data.map((row: any) => ({
      id: row.id,
      warehouseId: row.warehouse_id || row.warehouseId,
      categoryId: row.category_id || row.categoryId,
      date: row.date,
      responsibleUser: row.responsible_user || row.responsibleUser,
      items: row.items || [],
    }));
  } catch (err) {
    logSupabase('fetchAudits Exception', false, err);
    return null;
  }
}

export async function saveAuditToSupabase(audit: PhysicalAuditRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: audit.id,
      warehouse_id: audit.warehouseId,
      category_id: audit.categoryId,
      date: audit.date,
      responsible_user: audit.responsibleUser,
      items: audit.items,
    };
    console.log('[Supabase] Upserting audit record:', audit.id);
    const { error } = await supabase.from('auditorias').upsert(payload, { onConflict: 'id' });
    if (error) {
      logSupabase('saveAudit', false, error);
      return false;
    }
    logSupabase('saveAudit', true, audit.id);
    return true;
  } catch (err) {
    logSupabase('saveAudit Exception', false, err);
    return false;
  }
}

// SQL Script generator for Supabase setup
export const SUPABASE_SETUP_SQL = `-- ========================================================
-- SENTENCIAS SQL PARA CONFIGURAR LA BASE DE DATOS SUPABASE
-- PanStock Inventory System
-- Ejecutar estas consultas en el "SQL Editor" de Supabase
-- ========================================================

-- 1. TABLA DE USUARIOS (usuarios)
CREATE TABLE IF NOT EXISTS public.usuarios (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role_name TEXT NOT NULL DEFAULT 'Operador',
    is_admin BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '{"canEntries": true, "canExits": true, "canTransfers": true, "canExpiry": true, "canSales": true, "canPhysicalInventory": true, "allowedWarehouses": ["00", "01", "02", "002", "03", "09", "05", "06", "07", "08"]}',
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    suspended_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DE ALMACENES (almacenes)
CREATE TABLE IF NOT EXISTS public.almacenes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_main_entry BOOLEAN NOT NULL DEFAULT false,
    is_sales_warehouse BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA DE CATEGORIAS / SUBGRUPOS (categorias)
CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code_prefix TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA DE PRODUCTOS (productos)
CREATE TABLE IF NOT EXISTS public.productos (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'unidades',
    stock_by_warehouse JSONB NOT NULL DEFAULT '{}',
    expiration_date TEXT,
    lots JSONB NOT NULL DEFAULT '[]',
    entry_date TEXT NOT NULL,
    notes TEXT,
    min_stock_alert NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE MOVIMIENTOS (movimientos)
CREATE TABLE IF NOT EXISTS public.movimientos (
    id TEXT PRIMARY KEY,
    movement_number TEXT NOT NULL,
    type TEXT NOT NULL,
    doc_ref TEXT,
    date TEXT NOT NULL,
    responsible_user TEXT NOT NULL,
    source_warehouse_id TEXT,
    target_warehouse_id TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA DE AUDITORIAS FISICAS (auditorias)
CREATE TABLE IF NOT EXISTS public.auditorias (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    date TEXT NOT NULL,
    responsible_user TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. DESACTIVAR O HABILITAR RLS PERMISIVO PARA ACCESO CON ANON KEY
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditorias ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura pública con Anon Key
DROP POLICY IF EXISTS "Anon Full Access Usuarios" ON public.usuarios;
CREATE POLICY "Anon Full Access Usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access Almacenes" ON public.almacenes;
CREATE POLICY "Anon Full Access Almacenes" ON public.almacenes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access Categorias" ON public.categorias;
CREATE POLICY "Anon Full Access Categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access Productos" ON public.productos;
CREATE POLICY "Anon Full Access Productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access Movimientos" ON public.movimientos;
CREATE POLICY "Anon Full Access Movimientos" ON public.movimientos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Full Access Auditorias" ON public.auditorias;
CREATE POLICY "Anon Full Access Auditorias" ON public.auditorias FOR ALL USING (true) WITH CHECK (true);

-- 8. INSERTAR DATOS INICIALES (Almacenes base y Usuario Administrador)
INSERT INTO public.usuarios (username, password, role_name, is_admin, permissions)
VALUES (
  'admin',
  '192021',
  'Administrador General',
  true,
  '{"canEntries": true, "canExits": true, "canTransfers": true, "canExpiry": true, "canSales": true, "canPhysicalInventory": true, "allowedWarehouses": ["00", "01", "02", "002", "03", "09", "05", "06", "07", "08"]}'
) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

INSERT INTO public.almacenes (id, code, name, description, is_main_entry, is_sales_warehouse) VALUES
('00', '00', 'Almacén de Distribución Interna', 'Principal: Toda mercancía que ingrese al sistema debe pasar por este almacén.', true, false),
('01', '01', 'DESPACHO', 'Almacén para despacho directo y atención a ventas.', false, true),
('02', '02', 'MERCANCÍA PARA LA VENTA', 'Productos exhibidos y listos para venta comercial.', false, false),
('002', '002', 'VENTAS AL MAYOR', 'Almacén especializado para despachos y pedidos al mayor.', false, true),
('03', '03', 'MATERIA PRIMA', 'Harinas, azúcares, mantecas y levaduras para producción.', false, false),
('09', '09', 'PAPELERÍA Y MANTENIMIENTO', 'Papelería, rollos térmicos, balanzas, cintas de embalar y lápices.', false, false),
('05', '05', 'BOLSAS DE EMPAQUE', 'Bolsas plásticas, de papel y empaques especiales.', false, false),
('06', '06', 'EDIFICIO LOS ILUSTRES', 'Almacén anexo para bolsas, repuestos y depósitos diversos.', false, false),
('07', '07', 'PRODUCTOS EN PROCESO', 'Panes y masas en etapa cruda o fermentación.', false, false),
('08', '08', 'PRODUCTOS TERMINADOS', 'Panes recién horneados e inventario final para empaque.', false, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_main_entry = EXCLUDED.is_main_entry, is_sales_warehouse = EXCLUDED.is_sales_warehouse;

INSERT INTO public.categorias (id, name, code_prefix, is_default) VALUES
('cat-ch', 'CHARCUTERÍA', 'CH', true),
('cat-lac', 'LÁCTEOS', 'LAC', true),
('cat-be', 'BEBIDAS', 'BE', true),
('cat-vi', 'VÍVERES', 'VI', true),
('cat-pa', 'PAPELERÍA', 'PA', true),
('cat-ma', 'MATERIA PRIMA', 'MA', true),
('cat-pan', 'PANIFICACIÓN', 'PAN', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code_prefix = EXCLUDED.code_prefix;
`;
