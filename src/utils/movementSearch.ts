import { MovementRecord, Warehouse } from '../types';

/**
 * Formats a Date object into a highly robust and beautiful Venezuelan/Spanish format:
 * "DD/MM/YYYY, hh:mm:ss a. m. / p. m."
 * Always uses the browser's local time (which matches the user's computer screen and wall-clock),
 * avoiding any artificial timezone shifts if the user's OS timezone is misconfigured.
 */
export const formatVE = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p. m.' : 'a. m.';

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Safely parses any date format (ISO, Spanish locale e.g. "31/7/2026, 12:08:37 p. m.", YYYY-MM-DD, etc.)
 */
export const parseAnyDate = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. Try DD/MM/YYYY or D/M/YYYY (Spanish format like "31/7/2026, 12:08:37 p. m." or "31/07/2026")
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.\s*m\.|p\.\s*m\.|am|pm)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const ampm = timeMatch[4] ? timeMatch[4].toLowerCase().replace(/\s/g, '') : '';

      if ((ampm.includes('p') || ampm.includes('pm')) && hours < 12) {
        hours += 12;
      } else if ((ampm.includes('a') || ampm.includes('am')) && hours === 12) {
        hours = 0;
      }
    }

    const parsed = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 2. Try standard JavaScript Date constructor
  const stdDate = new Date(trimmed);
  if (!isNaN(stdDate.getTime())) {
    return stdDate;
  }

  // 3. Try YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);

    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

/**
 * Advanced movement search matcher.
 * Matches:
 * - Dates (e.g. "17/07", "17/7", "31/7/2026", "2026", "12:08")
 * - Movement Types & Synonyms (e.g. "tras" -> TRASLADO, "ent" -> ENTRADA, "desc" -> DESCARGO, "vent" -> VENTA)
 * - Responsible User (e.g. "admin", "erick")
 * - Document Number & Reference (e.g. "TRS-2026-9025", "TRS-ESP-6224")
 * - Warehouse Names & Codes (e.g. "01", "DESPACHO", "MATERIA PRIMA")
 * - Product Code & Name (e.g. "JAM-001", "Queso Paisa")
 * - Notes & Observations
 * Supports multi-word queries like "admin tras 31/7" where all terms must match.
 */
export const matchesMovementSearch = (
  mov: MovementRecord,
  rawQuery: string,
  warehouses: Warehouse[] = []
): boolean => {
  if (!rawQuery || !rawQuery.trim()) return true;

  const tokens = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const searchableTextParts: string[] = [];

  // 1. Movement Number & Doc Ref
  if (mov.movementNumber) searchableTextParts.push(mov.movementNumber.toLowerCase());
  if (mov.docRef) searchableTextParts.push(mov.docRef.toLowerCase());

  // 2. Responsible User
  if (mov.responsibleUser) searchableTextParts.push(mov.responsibleUser.toLowerCase());

  // 3. Movement Type & Human Synonyms
  if (mov.type) {
    const typeLower = mov.type.toLowerCase();
    searchableTextParts.push(typeLower);

    switch (mov.type) {
      case 'ENTRADA':
        searchableTextParts.push('entrada', 'entradas', 'ingreso', 'ingresos', 'ent', 'ing');
        break;
      case 'TRASLADO':
        searchableTextParts.push('traslado', 'traslados', 'traslado interno', 'tras', 'trasla', 'intern', 'interno');
        break;
      case 'DESCARGO':
        searchableTextParts.push('descargo', 'descargos', 'salida', 'salidas', 'desc', 'desca', 'sal');
        break;
      case 'VENTA':
        searchableTextParts.push('venta', 'ventas', 'vent');
        break;
      case 'AJUSTE_INVENTARIO':
        searchableTextParts.push('ajuste', 'ajustes', 'inventario', 'auditoria', 'fisico', 'ajus');
        break;
    }
  }

  // 4. Warehouses (Source & Target)
  if (warehouses && warehouses.length > 0) {
    if (mov.sourceWarehouseId) {
      const srcWh = warehouses.find((w) => w.id === mov.sourceWarehouseId);
      if (srcWh) {
        searchableTextParts.push(srcWh.code.toLowerCase());
        searchableTextParts.push(srcWh.name.toLowerCase());
      }
    }
    if (mov.targetWarehouseId) {
      const tgtWh = warehouses.find((w) => w.id === mov.targetWarehouseId);
      if (tgtWh) {
        searchableTextParts.push(tgtWh.code.toLowerCase());
        searchableTextParts.push(tgtWh.name.toLowerCase());
      }
    }
  }

  // 5. Date parsing and formatted date variants
  if (mov.date) {
    searchableTextParts.push(mov.date.toLowerCase());

    const d = parseAnyDate(mov.date);
    if (d) {
      const day = d.getDate();
      const dayPad = String(day).padStart(2, '0');
      const month = d.getMonth() + 1;
      const monthPad = String(month).padStart(2, '0');
      const year = d.getFullYear();

      searchableTextParts.push(`${day}/${month}`);
      searchableTextParts.push(`${dayPad}/${monthPad}`);
      searchableTextParts.push(`${day}/${month}/${year}`);
      searchableTextParts.push(`${dayPad}/${monthPad}/${year}`);
      searchableTextParts.push(`${dayPad}-${monthPad}-${year}`);
      searchableTextParts.push(`${year}-${monthPad}-${dayPad}`);
      searchableTextParts.push(d.toLocaleDateString('es-ES').toLowerCase());
      searchableTextParts.push(d.toLocaleString('es-ES').toLowerCase());
    }
  }

  // 6. Notes
  if (mov.notes) {
    searchableTextParts.push(mov.notes.toLowerCase());
  }

  // 7. Products / Items inside movement
  if (mov.items && mov.items.length > 0) {
    for (const item of mov.items) {
      if (item.productCode) searchableTextParts.push(item.productCode.toLowerCase());
      if (item.productName) searchableTextParts.push(item.productName.toLowerCase());
    }
  }

  const combinedText = searchableTextParts.join(' ');

  return tokens.every((token) => combinedText.includes(token));
};
