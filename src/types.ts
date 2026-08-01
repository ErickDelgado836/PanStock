export type UnitOfMeasure = 'unidades' | 'kg' | 'L';

export interface UserPermissions {
  canEntries: boolean;
  canExits: boolean;
  canTransfers: boolean;
  canExpiry: boolean;
  canSales: boolean;
  canPhysicalInventory: boolean;
  allowedWarehouses: string[]; // Warehouse IDs allowed, e.g. ['00', '01', '02', '002', '03', '09', '05', '06', '07', '08']
}

export interface UserProfile {
  username: string;
  password: string;
  roleName: string;
  isAdmin: boolean;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt?: string;
  isSuspended?: boolean;
  suspendedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Warehouse {
  id: string; // '00', '01', '02', '002', '03', '09', '05', '06', '07', '08'
  code: string;
  name: string;
  description: string;
  isMainEntry?: boolean; // '00' is main entry
  isSalesWarehouse?: boolean; // '01' and '002' are sales warehouses
}

export interface Category {
  id: string;
  name: string;
  codePrefix: string; // e.g., 'CH', 'LAC', 'BE', 'VI', 'PA', 'MA', 'PAN'
  isDefault?: boolean;
}

export interface ProductStock {
  [warehouseId: string]: number;
}

export interface ProductLot {
  id: string;
  lotNumber: string;
  expirationDate: string; // YYYY-MM-DD
  quantity: number;
  warehouseId: string;
  notes?: string;
}

export interface Product {
  id: string;
  code: string; // e.g. 'CH-001'
  name: string;
  categoryId: string;
  unit: UnitOfMeasure;
  stockByWarehouse: ProductStock;
  expirationDate?: string; // YYYY-MM-DD
  lots?: ProductLot[];
  entryDate: string;
  notes?: string;
  minStockAlert?: number;
}

export type MovementType = 'ENTRADA' | 'TRASLADO' | 'DESCARGO' | 'VENTA' | 'AJUSTE_INVENTARIO';

export interface MovementItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: UnitOfMeasure;
}

export interface MovementRecord {
  id: string;
  movementNumber: string;
  type: MovementType;
  docRef: string; // Unique reference document
  date: string;
  responsibleUser: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  notes: string;
  items: MovementItem[];
}

export interface PhysicalAuditItem {
  productId: string;
  productCode: string;
  productName: string;
  unit: UnitOfMeasure;
  systemStock: number;
  physicalStock: number;
  difference: number; // physicalStock - systemStock
}

export interface PhysicalAuditRecord {
  id: string;
  warehouseId: string;
  categoryId: string;
  date: string;
  responsibleUser: string;
  items: PhysicalAuditItem[];
}

export interface WarehouseCategoryLastAudit {
  [key: string]: string; // `${warehouseId}_${categoryId}` => date string
}
