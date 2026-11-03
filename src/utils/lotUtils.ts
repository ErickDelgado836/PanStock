import { Product, ProductLot, ProductStock } from '../types';

/**
 * Ensures a ProductLot has a valid stockByWarehouse object.
 * If missing, initializes it from warehouseId or defaults to '00'.
 */
export function getLotStockMap(lot: ProductLot): ProductStock {
  if (lot.stockByWarehouse && Object.keys(lot.stockByWarehouse).length > 0) {
    return { ...lot.stockByWarehouse };
  }
  const stockMap: ProductStock = {};
  const wh = lot.warehouseId || '00';
  stockMap[wh] = Number(lot.quantity) || 0;
  return stockMap;
}

/**
 * Gets stock quantity of a lot in a specific warehouse.
 */
export function getLotStockInWarehouse(lot: ProductLot, warehouseId: string): number {
  const stockMap = getLotStockMap(lot);
  return Number(stockMap[warehouseId] || 0);
}

/**
 * Calculates total stock across all warehouses for a given lot.
 */
export function getLotTotalStock(lot: ProductLot): number {
  const stockMap = getLotStockMap(lot);
  return Object.values(stockMap).reduce((sum, q) => sum + Number(q || 0), 0);
}

/**
 * Synchronizes lot quantities during an Entrada (Ingreso).
 */
export function addLotStockOnEntry(
  product: Product,
  warehouseId: string,
  quantity: number,
  lotNumber?: string,
  expirationDate?: string,
  notes?: string
) {
  if (!product.lots) product.lots = [];
  const cleanLotNum = (lotNumber || '').trim() || 'S/N';
  const cleanExpDate = expirationDate || product.expirationDate || '';

  // Find matching lot by expirationDate and lotNumber
  const existingLot = product.lots.find((l) => {
    const sameExp = cleanExpDate ? l.expirationDate === cleanExpDate : true;
    const sameNum = (l.lotNumber || 'S/N').trim().toLowerCase() === cleanLotNum.toLowerCase();
    return sameExp && sameNum;
  });

  if (existingLot) {
    const stockMap = getLotStockMap(existingLot);
    stockMap[warehouseId] = (stockMap[warehouseId] || 0) + quantity;
    existingLot.stockByWarehouse = stockMap;
    existingLot.quantity = getLotTotalStock(existingLot);
    if (cleanExpDate) existingLot.expirationDate = cleanExpDate;
    if (notes) existingLot.notes = notes;
  } else {
    const stockMap: ProductStock = { [warehouseId]: quantity };
    const newLot: ProductLot = {
      id: `lot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      lotNumber: cleanLotNum,
      expirationDate: cleanExpDate,
      quantity: quantity,
      warehouseId: warehouseId,
      stockByWarehouse: stockMap,
      notes: notes || undefined,
    };
    product.lots.push(newLot);
  }

  // Keep product expiration date synced with earliest active lot date
  const sortedDates = product.lots
    .map((l) => l.expirationDate)
    .filter(Boolean)
    .sort();
  if (sortedDates.length > 0) {
    product.expirationDate = sortedDates[0];
  } else if (cleanExpDate) {
    product.expirationDate = cleanExpDate;
  }
}

/**
 * Compares two lots for FIFO (First-In, First-Out by Expiration Date).
 * - If preferredLotId is specified, that lot is prioritized first.
 * - Lots WITH an expiration date are sorted earliest-first (nearest to expire first).
 * - Lots WITHOUT an expiration date ("Sin Fecha") are ordered after dated lots.
 */
export function compareLotsByFIFO(a: ProductLot, b: ProductLot, preferredLotId?: string): number {
  if (preferredLotId) {
    if (a.id === preferredLotId) return -1;
    if (b.id === preferredLotId) return 1;
  }
  const dateA = a.expirationDate?.trim() || '';
  const dateB = b.expirationDate?.trim() || '';

  // Both have expiration dates -> sort ascending (earliest expiring first)
  if (dateA && dateB) {
    return dateA.localeCompare(dateB);
  }
  // If one has date and the other doesn't, dated lot comes first
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  // Neither has date -> sort by lot number
  return (a.lotNumber || '').localeCompare(b.lotNumber || '');
}

export interface FifoAllocation {
  lotId?: string;
  lotNumber: string;
  expirationDate?: string;
  quantity: number;
  availableInLot: number;
  isUnassigned?: boolean;
}

/**
 * Calculates the exact allocation of quantity across lots according to Auto FIFO
 * or a specific preferred lot, detailing how many units come from each date / lot or without date.
 */
export function calculateFifoDistribution(
  product: Product,
  warehouseId: string,
  quantity: number,
  preferredLotId?: string
): FifoAllocation[] {
  if (quantity <= 0 || !product) return [];

  const allocations: FifoAllocation[] = [];
  let remaining = quantity;

  const totalWhStock = product.stockByWarehouse?.[warehouseId] || 0;
  const activeLots = (product.lots || [])
    .filter((l) => getLotStockInWarehouse(l, warehouseId) > 0)
    .sort((a, b) => compareLotsByFIFO(a, b, preferredLotId));

  let totalLotStockInWh = 0;

  for (const lot of activeLots) {
    if (remaining <= 0) break;
    const available = getLotStockInWarehouse(lot, warehouseId);
    totalLotStockInWh += available;

    const allocQty = Math.min(remaining, available);
    if (allocQty > 0) {
      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber || 'S/N',
        expirationDate: lot.expirationDate?.trim() || undefined,
        quantity: allocQty,
        availableInLot: available,
      });
      remaining -= allocQty;
    }
  }

  // If there is still quantity remaining and the warehouse has unassigned stock
  if (remaining > 0) {
    const unassignedStock = Math.max(0, totalWhStock - totalLotStockInWh);
    if (unassignedStock > 0) {
      const allocUnassigned = Math.min(remaining, unassignedStock);
      allocations.push({
        lotNumber: 'S/N',
        quantity: allocUnassigned,
        availableInLot: unassignedStock,
        isUnassigned: true,
      });
      remaining -= allocUnassigned;
    }
  }

  return allocations;
}

/**
 * Formats a short readable breakdown summary for tables or notifications:
 * e.g. "Auto FIFO: 4 kg (15/12/2026) + 6 kg (04/01/2027)"
 */
export function formatFifoDistributionSummary(
  allocations: FifoAllocation[],
  unit: string
): string {
  if (allocations.length === 0) return 'Sin asignación';
  return allocations
    .map((a) => {
      const dateText = a.expirationDate ? `Vence: ${a.expirationDate}` : 'Sin Fecha';
      return `${a.quantity} ${unit} (${a.lotNumber} • ${dateText})`;
    })
    .join(' + ');
}

/**
 * Synchronizes lot quantities during a Traslado (Transfer).
 * Deducts `quantity` from `sourceWhId` and adds it to `targetWhId`.
 * If `preferredLotId` is provided, transfers from that lot first, then remaining using FIFO.
 */
export function transferLotStock(
  product: Product,
  sourceWhId: string,
  targetWhId: string,
  quantity: number,
  preferredLotId?: string
) {
  if (quantity <= 0) return;

  if (!product.lots || product.lots.length === 0) {
    if (product.expirationDate) {
      addLotStockOnEntry(
        product,
        sourceWhId,
        (product.stockByWarehouse[sourceWhId] || 0) + quantity,
        'S/N',
        product.expirationDate
      );
    } else {
      return;
    }
  }

  let remaining = quantity;
  // Sort lots by preferredLotId first, then expiration date (FIFO)
  const sortedLots = [...product.lots].sort((a, b) => compareLotsByFIFO(a, b, preferredLotId));

  for (const lot of sortedLots) {
    if (remaining <= 0) break;

    const availableInSource = getLotStockInWarehouse(lot, sourceWhId);
    if (availableInSource <= 0) continue;

    const transferQty = Math.min(remaining, availableInSource);
    const stockMap = getLotStockMap(lot);

    stockMap[sourceWhId] = Math.max(0, availableInSource - transferQty);
    stockMap[targetWhId] = (stockMap[targetWhId] || 0) + transferQty;

    lot.stockByWarehouse = stockMap;
    lot.quantity = getLotTotalStock(lot);

    remaining -= transferQty;
  }
}

/**
 * Synchronizes lot quantities during a Descargo or Venta (Deduction).
 * If `preferredLotId` is provided, deducts from that lot first, then remaining using FIFO.
 */
export function deductLotStock(
  product: Product,
  warehouseId: string,
  quantity: number,
  preferredLotId?: string
) {
  if (quantity <= 0 || !product.lots || product.lots.length === 0) {
    return;
  }

  let remaining = quantity;
  const sortedLots = [...product.lots].sort((a, b) => compareLotsByFIFO(a, b, preferredLotId));

  for (const lot of sortedLots) {
    if (remaining <= 0) break;

    const available = getLotStockInWarehouse(lot, warehouseId);
    if (available <= 0) continue;

    const deductQty = Math.min(remaining, available);
    const stockMap = getLotStockMap(lot);

    stockMap[warehouseId] = Math.max(0, available - deductQty);
    lot.stockByWarehouse = stockMap;
    lot.quantity = getLotTotalStock(lot);

    remaining -= deductQty;
  }
}

/**
 * Reconciles a single Product's lot stock with its stockByWarehouse object.
 * Ensures lot stock in any warehouse never exceeds physical stock in that warehouse (deducts excess via FIFO).
 * Does NOT force unassigned stock into existing lots, allowing products to have unassigned units.
 */
export function reconcileProductLots(product: Product): Product {
  if (!product.stockByWarehouse) {
    product.stockByWarehouse = {};
  }
  if (!product.lots) {
    product.lots = [];
  }

  // Gather all warehouse IDs from stockByWarehouse and existing lots
  const whIds = new Set<string>();
  Object.keys(product.stockByWarehouse).forEach((id) => whIds.add(id));
  product.lots.forEach((lot) => {
    const map = getLotStockMap(lot);
    Object.keys(map).forEach((id) => whIds.add(id));
  });

  whIds.forEach((whId) => {
    const whStock = Math.max(0, Number(product.stockByWarehouse[whId] || 0));
    product.stockByWarehouse[whId] = whStock;

    // Calculate sum of lot stock in this warehouse
    const totalLotStockInWh = product.lots!.reduce(
      (sum, lot) => sum + getLotStockInWarehouse(lot, whId),
      0
    );

    if (whStock === 0) {
      // Zero out stock in this warehouse for all lots
      product.lots!.forEach((lot) => {
        const stockMap = getLotStockMap(lot);
        stockMap[whId] = 0;
        lot.stockByWarehouse = stockMap;
        lot.quantity = getLotTotalStock(lot);
      });
    } else if (totalLotStockInWh > whStock) {
      // Excess lot stock (e.g. after deduction/transfer) -> Deduct excess using FIFO
      let excess = totalLotStockInWh - whStock;
      const sortedLots = [...product.lots!].sort((a, b) =>
        (a.expirationDate || '').localeCompare(b.expirationDate || '')
      );

      for (const lot of sortedLots) {
        if (excess <= 0) break;
        const currentInWh = getLotStockInWarehouse(lot, whId);
        if (currentInWh <= 0) continue;

        const deduct = Math.min(excess, currentInWh);
        const stockMap = getLotStockMap(lot);
        stockMap[whId] = currentInWh - deduct;
        lot.stockByWarehouse = stockMap;
        lot.quantity = getLotTotalStock(lot);

        excess -= deduct;
      }
    }
  });

  // Recalculate lot total quantities
  product.lots.forEach((lot) => {
    lot.quantity = getLotTotalStock(lot);
  });

  // Keep lots that have total quantity > 0
  product.lots = product.lots.filter((lot) => getLotTotalStock(lot) > 0);

  // Sync product.expirationDate with earliest active lot date
  const activeDates = product.lots
    .filter((l) => getLotTotalStock(l) > 0 && l.expirationDate)
    .map((l) => l.expirationDate)
    .sort();

  if (activeDates.length > 0) {
    product.expirationDate = activeDates[0];
  } else {
    delete product.expirationDate;
  }

  return product;
}

/**
 * Reconciles an array of products so all lots and warehouse stocks match 100%.
 */
export function reconcileAllProducts(products: Product[]): Product[] {
  return products.map((p) => reconcileProductLots(p));
}
