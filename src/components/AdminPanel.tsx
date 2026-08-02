import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Category, Warehouse, MovementRecord, UserPermissions } from '../types';
import {
  getUsers,
  saveUsers,
  getCategories,
  addCategory,
  deleteCategory,
  saveCategories,
  getProducts,
  saveProducts,
  getWarehouses,
  getMovements,
  saveMovements,
  addMovement,
  subscribeToStorage,
} from '../services/storage';
import { ALL_WAREHOUSE_IDS } from '../data/seedData';
import { matchesMovementSearch } from '../utils/movementSearch';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Check,
  X,
  Tag,
  Trash2,
  Pencil,
  ArrowRight,
  RefreshCcw,
  Sliders,
  Building2,
  ListFilter,
  CheckSquare,
  Square,
  AlertTriangle,
  PlusCircle,
  FolderPlus,
  Box,
  Save,
  Package,
  Eye,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Sparkles,
  CheckCircle2,
  Filter,
  RotateCcw,
  UserX,
  UserCheck,
  Clock,
  Calendar,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { AdminProducts } from './AdminProducts';
import { generateMovementPDF } from '../utils/pdfGenerator';
import { CustomSelect } from './Common/CustomSelect';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(getUsers);
  const [categories, setCategories] = useState<Category[]>(getCategories);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [movements, setMovements] = useState<MovementRecord[]>(getMovements);

  // Active Tab in Admin
  const [activeTab, setActiveTab] = useState<'USERS' | 'CATEGORIES' | 'PRODUCTS' | 'HISTORY_PURGE'>('USERS');

  // User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleName, setNewRoleName] = useState('Operador');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>({
    canEntries: true,
    canExits: true,
    canTransfers: true,
    canExpiry: true,
    canSales: true,
    canPhysicalInventory: true,
    allowedWarehouses: [...ALL_WAREHOUSE_IDS],
  });

  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  const [userErrorMsg, setUserErrorMsg] = useState('');

  // Category Form & Modal States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPrefix, setNewCategoryPrefix] = useState('');
  const [catMsg, setCatMsg] = useState('');

  // Editing Category State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatPrefix, setEditCatPrefix] = useState('');
  const [editCatModalOpen, setEditCatModalOpen] = useState(false);

  // Category Deletion & Reassignment Wizard State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [affectedProducts, setAffectedProducts] = useState<any[]>([]);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [stockRelocations, setStockRelocations] = useState<any[]>([]);
  const [reassignNotes, setReassignNotes] = useState<string>('');
  const [confirmDeleteCatOpen, setConfirmDeleteCatOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  // Prominent Top Notification Banner State
  interface AdminBannerNotification {
    id: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    categoryTag?: string;
  }
  const [notification, setNotification] = useState<AdminBannerNotification | null>(null);

  const triggerNotification = (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'info' | 'error' = 'success',
    categoryTag?: string
  ) => {
    const id = Date.now().toString();
    setNotification({ id, title, message, type, categoryTag });

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setNotification((prev) => (prev?.id === id ? null : prev));
    }, 6000);
  };

  // History Purge, Search, Filter & Pagination State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('01');
  const [purgeType, setPurgeType] = useState<'DESCARGO' | 'TRASLADO' | 'ENTRADA' | 'VENTA' | 'ALL'>('DESCARGO');
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);
  const [selectedMovementForDetail, setSelectedMovementForDetail] = useState<MovementRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [singleMovementToDelete, setSingleMovementToDelete] = useState<MovementRecord | null>(null);
  const [confirmSingleDeleteOpen, setConfirmSingleDeleteOpen] = useState(false);
  const [historyMsg, setHistoryMsg] = useState<string>('');

  // History Search, Filter & Pagination controls
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyWarehouseFilter, setHistoryWarehouseFilter] = useState('ALL');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(15);

  // User Search, Status Filter & Pagination controls
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DELETED'>('ALL');
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userItemsPerPage, setUserItemsPerPage] = useState(5);

  // User deletion confirmation modal state
  const [userToDeleteConfirm, setUserToDeleteConfirm] = useState<{
    username: string;
    isPermanent: boolean;
  } | null>(null);

  // Animated feedback state for user operations
  const [userActionBanner, setUserActionBanner] = useState<{
    type: 'CREATE' | 'EDIT' | 'UPDATE' | 'DELETE' | 'SUSPEND' | 'RESTORE';
    username: string;
    message: string;
  } | null>(null);

  // Ref for auto-scrolling to user edit section (banner + form) when editing
  const userSectionTopRef = useRef<HTMLDivElement>(null);

  // Recently modified/created user for target card highlighting animation
  const [highlightedUser, setHighlightedUser] = useState<{
    username: string;
    action: 'CREATE' | 'EDIT' | 'UPDATE' | 'DELETE' | 'SUSPEND';
  } | null>(null);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historySearchQuery, historyWarehouseFilter, historyTypeFilter, historyItemsPerPage]);

  useEffect(() => {
    setUserCurrentPage(1);
  }, [userSearchQuery, userStatusFilter, userItemsPerPage]);

  const loadData = () => {
    setUsers(getUsers());
    setCategories(getCategories());
    setWarehouses(getWarehouses());
    setMovements(getMovements());
  };

  useEffect(() => {
    loadData();
    return subscribeToStorage(loadData);
  }, []);

  // Handlers for User Permissions
  const togglePermission = (key: keyof Omit<UserPermissions, 'allowedWarehouses'>) => {
    setNewPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleWarehousePermission = (whId: string) => {
    setNewPermissions((prev) => {
      const exists = prev.allowedWarehouses.includes(whId);
      const updated = exists
        ? prev.allowedWarehouses.filter((id) => id !== whId)
        : [...prev.allowedWarehouses, whId];
      return { ...prev, allowedWarehouses: updated };
    });
  };

  const toggleAllWarehouses = () => {
    setNewPermissions((prev) => {
      const allSelected = prev.allowedWarehouses.length === ALL_WAREHOUSE_IDS.length;
      return {
        ...prev,
        allowedWarehouses: allSelected ? [] : [...ALL_WAREHOUSE_IDS],
      };
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMsg('');
    setUserSuccessMsg('');

    const cleanUser = newUsername.trim();
    if (!cleanUser || !newPassword.trim()) {
      setUserErrorMsg('El nombre de usuario y la contraseña son obligatorios.');
      return;
    }

    const currentUsers = getUsers();

    if (editingUsername) {
      // Edit mode
      const updated = currentUsers.map((u) => {
        if (u.username.toLowerCase() === editingUsername.toLowerCase()) {
          return {
            ...u,
            username: cleanUser,
            password: newPassword,
            roleName: newRoleName,
            permissions: newPermissions,
            updatedAt: new Date().toISOString(),
          };
        }
        return u;
      });
      saveUsers(updated);
      setUserSuccessMsg(`Perfil de '${cleanUser}' actualizado correctamente.`);
      setUserActionBanner({
        type: 'UPDATE',
        username: cleanUser,
        message: `¡Perfil de '${cleanUser}' modificado y guardado con éxito!`,
      });
      setHighlightedUser({
        username: cleanUser,
        action: 'UPDATE',
      });
      triggerNotification(
        '¡Perfil Actualizado!',
        `Se guardaron los cambios, contraseña y permisos para el usuario '${cleanUser}'.`,
        'info',
        'USUARIOS'
      );
      setEditingUsername(null);
    } else {
      // Create mode
      if (currentUsers.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
        setUserErrorMsg('El nombre de usuario ya existe en el sistema.');
        return;
      }

      const newUser: UserProfile = {
        username: cleanUser,
        password: newPassword,
        roleName: newRoleName || 'Operador',
        isAdmin: false,
        permissions: newPermissions,
        createdAt: new Date().toISOString(),
      };

      saveUsers([...currentUsers, newUser]);
      setUserSuccessMsg(`Perfil de '${cleanUser}' creado exitosamente.`);
      setUserActionBanner({
        type: 'CREATE',
        username: cleanUser,
        message: `¡Usuario '${cleanUser}' creado y registrado en el sistema exitosamente!`,
      });
      setHighlightedUser({
        username: cleanUser,
        action: 'CREATE',
      });
      triggerNotification(
        '¡Usuario Registrado Exitosamente!',
        `El usuario '${cleanUser}' con el rol '${newRoleName || 'Operador'}' fue creado correctamente en el sistema.`,
        'success',
        'USUARIOS'
      );
    }

    // Reset Form
    setNewUsername('');
    setNewPassword('');
    setNewRoleName('Operador');
    setNewPermissions({
      canEntries: true,
      canExits: true,
      canTransfers: true,
      canExpiry: true,
      canSales: true,
      canPhysicalInventory: true,
      allowedWarehouses: [...ALL_WAREHOUSE_IDS],
    });
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUsername(user.username);
    setNewUsername(user.username);
    setNewPassword(user.password);
    setNewRoleName(user.roleName);
    setNewPermissions({ ...user.permissions });
    setUserErrorMsg('');
    setUserSuccessMsg('');

    setUserActionBanner({
      type: 'EDIT',
      username: user.username,
      message: `Modificando perfil de '${user.username}'. Los datos han sido cargados en el formulario.`,
    });
    setHighlightedUser({
      username: user.username,
      action: 'EDIT',
    });

    // Auto-scroll smoothly to the User Edit section (banner + form) considering header offset
    setTimeout(() => {
      if (userSectionTopRef.current) {
        const yOffset = -110;
        const elementTop = userSectionTopRef.current.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: Math.max(0, elementTop + yOffset), behavior: 'smooth' });
      }
    }, 60);
  };

  const handleToggleSuspendUser = (targetUsername: string) => {
    if (targetUsername.toLowerCase() === 'admin') {
      setUserErrorMsg('El usuario administrador maestro "admin" no puede ser suspendido.');
      return;
    }
    const currentUsers = getUsers();
    const target = currentUsers.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (!target) return;

    const newSuspendedState = !target.isSuspended;
    const now = new Date().toISOString();

    const updated = currentUsers.map((u) => {
      if (u.username.toLowerCase() === targetUsername.toLowerCase()) {
        return {
          ...u,
          isSuspended: newSuspendedState,
          suspendedAt: newSuspendedState ? now : undefined,
          updatedAt: now,
        };
      }
      return u;
    });

    saveUsers(updated);
    if (newSuspendedState) {
      setUserSuccessMsg(`El usuario '${targetUsername}' ha sido suspendido.`);
      setUserActionBanner({
        type: 'SUSPEND',
        username: targetUsername,
        message: `El usuario '${targetUsername}' ha sido suspendido.`,
      });
      setHighlightedUser({
        username: targetUsername,
        action: 'SUSPEND',
      });
      triggerNotification(
        '¡Usuario Suspendido!',
        `El usuario '${targetUsername}' no podrá ingresar al sistema hasta ser reactivado por un administrador.`,
        'warning',
        'USUARIOS'
      );
    } else {
      setUserSuccessMsg(`El usuario '${targetUsername}' ha sido reactivado.`);
      setUserActionBanner({
        type: 'RESTORE',
        username: targetUsername,
        message: `El usuario '${targetUsername}' ha sido reactivado.`,
      });
      triggerNotification(
        '¡Usuario Reactivado!',
        `El usuario '${targetUsername}' ya puede ingresar nuevamente al sistema.`,
        'success',
        'USUARIOS'
      );
    }
  };

  const handleDeleteUser = (username: string) => {
    if (username.toLowerCase() === 'admin') {
      setUserErrorMsg('El usuario administrador maestro "admin" no puede ser eliminado.');
      return;
    }
    const currentUsers = getUsers();
    const now = new Date().toISOString();
    const updated = currentUsers.map((u) => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return {
          ...u,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        };
      }
      return u;
    });
    saveUsers(updated);
    setUserSuccessMsg(`Usuario '${username}' marcado como eliminado.`);
    setUserActionBanner({
      type: 'DELETE',
      username: username,
      message: `El usuario '${username}' ha sido eliminado del sistema.`,
    });
    setHighlightedUser({
      username: username,
      action: 'DELETE',
    });
    triggerNotification(
      '¡Usuario Eliminado!',
      `El usuario '${username}' ha sido marcado como eliminado del sistema.`,
      'warning',
      'USUARIOS'
    );
  };

  const handleRestoreUser = (username: string) => {
    const currentUsers = getUsers();
    const now = new Date().toISOString();
    const updated = currentUsers.map((u) => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return {
          ...u,
          isDeleted: false,
          deletedAt: undefined,
          updatedAt: now,
        };
      }
      return u;
    });
    saveUsers(updated);
    setUserSuccessMsg(`Usuario '${username}' restaurado exitosamente.`);
    setUserActionBanner({
      type: 'RESTORE',
      username: username,
      message: `Usuario '${username}' restaurado en el sistema.`,
    });
    triggerNotification(
      '¡Usuario Restaurado!',
      `El usuario '${username}' ha sido reactivado y restaurado en el sistema.`,
      'success',
      'USUARIOS'
    );
  };

  const handlePermanentDeleteUser = (username: string) => {
    if (username.toLowerCase() === 'admin') return;
    const currentUsers = getUsers().filter((u) => u.username.toLowerCase() !== username.toLowerCase());
    saveUsers(currentUsers);
    setUserSuccessMsg(`Usuario '${username}' eliminado definitivamente.`);
    setUserActionBanner({
      type: 'DELETE',
      username: username,
      message: `El usuario '${username}' fue eliminado definitivamente.`,
    });
    triggerNotification(
      '¡Eliminación Definitiva!',
      `El usuario '${username}' fue borrado permanentemente del sistema.`,
      'error',
      'USUARIOS'
    );
  };

  // Handlers for Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatMsg('');
    const nameClean = newCategoryName.trim();
    const prefixClean = newCategoryPrefix.trim().toUpperCase();

    if (!nameClean || !prefixClean) {
      setCatMsg('El nombre y prefijo de código son obligatorios.');
      return;
    }

    const currentCats = getCategories();
    if (currentCats.some((c) => c.codePrefix === prefixClean)) {
      setCatMsg(`El prefijo '${prefixClean}' ya existe para otra categoría.`);
      return;
    }

    const newCat: Category = {
      id: `cat-custom-${Date.now()}`,
      name: nameClean.toUpperCase(),
      codePrefix: prefixClean,
      isDefault: false,
    };

    addCategory(newCat);
    setNewCategoryName('');
    setNewCategoryPrefix('');
    setCatMsg(`Categoría '${newCat.name}' creada con prefijo [${prefixClean}].`);
    triggerNotification(
      '¡Categoría Registrada!',
      `La categoría '${newCat.name}' fue guardada con el prefijo de código [${prefixClean}].`,
      'success',
      'CATEGORÍAS'
    );
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat: Category) => {
    setCatMsg('');
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatPrefix(cat.codePrefix);
    setEditCatModalOpen(true);
  };

  // Save Edit Category
  const handleSaveEditCategory = () => {
    if (!editingCategory) return;
    const nameClean = editCatName.trim().toUpperCase();
    const prefixClean = editCatPrefix.trim().toUpperCase();

    if (!nameClean || !prefixClean) {
      alert('El nombre y el prefijo de la categoría son obligatorios.');
      return;
    }

    const currentCats = getCategories();
    const prefixCollision = currentCats.find(
      (c) => c.codePrefix === prefixClean && c.id !== editingCategory.id
    );
    if (prefixCollision) {
      alert(`El prefijo '${prefixClean}' ya pertenece a la categoría '${prefixCollision.name}'.`);
      return;
    }

    const updated = currentCats.map((c) =>
      c.id === editingCategory.id ? { ...c, name: nameClean, codePrefix: prefixClean } : c
    );

    saveCategories(updated);
    setCatMsg(`Categoría '${nameClean}' actualizada correctamente.`);
    triggerNotification(
      '¡Categoría Actualizada!',
      `La categoría fue modificada a '${nameClean}' con el prefijo [${prefixClean}].`,
      'info',
      'CATEGORÍAS'
    );
    setEditingCategory(null);
    setEditCatModalOpen(false);
  };

  // Delete Category Request (Checks if it contains products)
  const handleRequestDeleteCategory = (cat: Category) => {
    setCatMsg('');
    const prods = getProducts().filter((p) => p.categoryId === cat.id);
    setCategoryToDelete(cat);
    setAffectedProducts(prods);

    if (prods.length > 0) {
      const remainingCats = categories.filter((c) => c.id !== cat.id);
      setTargetCategoryId(remainingCats.length > 0 ? remainingCats[0].id : '');

      const whs = getWarehouses();
      const relocItems: any[] = [];

      prods.forEach((p) => {
        Object.entries(p.stockByWarehouse || {}).forEach(([whId, stock]) => {
          const numericStock = Number(stock) || 0;
          if (numericStock > 0) {
            const whObj = whs.find((w) => w.id === whId);
            const defaultTargetWh = whs.find((w) => w.id !== whId)?.id || whId;
            relocItems.push({
              productId: p.id,
              productName: p.name,
              productCode: p.code,
              unit: p.unit,
              sourceWhId: whId,
              sourceWhName: whObj ? `${whObj.id} - ${whObj.name}` : whId,
              currentStock: numericStock,
              action: 'KEEP',
              targetWhId: defaultTargetWh,
              transferQty: numericStock,
            });
          }
        });
      });

      setStockRelocations(relocItems);
      setReassignNotes(`Reorganización de inventario por eliminación de categoría ${cat.name}`);
      setReassignModalOpen(true);
    } else {
      setConfirmDeleteCatOpen(true);
    }
  };

  // Confirm simple deletion (when 0 products)
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    deleteCategory(categoryToDelete.id);
    setCatMsg(`Categoría '${categoryToDelete.name}' eliminada correctamente del sistema.`);
    triggerNotification(
      '¡Categoría Eliminada!',
      `La categoría '${categoryToDelete.name}' fue eliminada del sistema.`,
      'warning',
      'CATEGORÍAS'
    );
    setCategoryToDelete(null);
    setConfirmDeleteCatOpen(false);
  };

  // Confirm Reassign Products & Delete Category (when products > 0)
  const handleConfirmReassignAndDeleteCategory = () => {
    if (!categoryToDelete) return;
    if (!targetCategoryId) {
      alert('Debe seleccionar una categoría de destino válida para los productos.');
      return;
    }

    const allProducts = getProducts();
    const targetCat = categories.find((c) => c.id === targetCategoryId);
    let totalTransfers = 0;
    let totalDischarges = 0;

    // 1. Reassign category ID for all affected products
    allProducts.forEach((p) => {
      if (p.categoryId === categoryToDelete.id) {
        p.categoryId = targetCategoryId;
      }
    });

    // 2. Process stock relocations & discharges
    stockRelocations.forEach((item) => {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (!prod) return;

      if (!prod.stockByWarehouse) prod.stockByWarehouse = {};
      const currentSrcStock = Number(prod.stockByWarehouse[item.sourceWhId]) || 0;
      const qtyToMove = Math.min(Math.max(1, Number(item.transferQty) || 0), currentSrcStock);

      if (
        item.action === 'TRANSFER' &&
        qtyToMove > 0 &&
        item.targetWhId &&
        item.targetWhId !== item.sourceWhId
      ) {
        // Deduct from source
        prod.stockByWarehouse[item.sourceWhId] = currentSrcStock - qtyToMove;
        // Add to target
        prod.stockByWarehouse[item.targetWhId] = (Number(prod.stockByWarehouse[item.targetWhId]) || 0) + qtyToMove;

        // Register TRASLADO movement
        addMovement({
          id: `mov-reorg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          movementNumber: `TRS-CAT-${Date.now().toString().slice(-4)}`,
          type: 'TRASLADO',
          docRef: `REORG-${categoryToDelete.codePrefix}-${new Date().toLocaleDateString('es-VE').replace(/\//g, '')}`,
          date: new Date().toLocaleString('es-VE'),
          responsibleUser: 'ADMINISTRADOR',
          sourceWarehouseId: item.sourceWhId,
          targetWarehouseId: item.targetWhId,
          notes: reassignNotes || `Traslado por reestructuración y eliminación de categoría ${categoryToDelete.name}`,
          items: [
            {
              productId: prod.id,
              productCode: prod.code,
              productName: prod.name,
              quantity: qtyToMove,
              unit: prod.unit,
            },
          ],
        });
        totalTransfers++;
      } else if (item.action === 'DISCHARGE' && qtyToMove > 0) {
        // Deduct from source
        prod.stockByWarehouse[item.sourceWhId] = currentSrcStock - qtyToMove;

        // Register DESCARGO movement
        addMovement({
          id: `mov-reorg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          movementNumber: `DSC-CAT-${Date.now().toString().slice(-4)}`,
          type: 'DESCARGO',
          docRef: `REORG-${categoryToDelete.codePrefix}-${new Date().toLocaleDateString('es-VE').replace(/\//g, '')}`,
          date: new Date().toLocaleString('es-VE'),
          responsibleUser: 'ADMINISTRADOR',
          sourceWarehouseId: item.sourceWhId,
          targetWarehouseId: item.sourceWhId,
          notes: reassignNotes || `Descargo por reestructuración y eliminación de categoría ${categoryToDelete.name}`,
          items: [
            {
              productId: prod.id,
              productCode: prod.code,
              productName: prod.name,
              quantity: qtyToMove,
              unit: prod.unit,
            },
          ],
        });
        totalDischarges++;
      }
    });

    // 3. Save products and delete category
    saveProducts(allProducts);
    deleteCategory(categoryToDelete.id);

    let msg = `Se reasignaron los ${affectedProducts.length} producto(s) a la categoría '${targetCat?.name || 'Destino'}' y se eliminó la categoría '${categoryToDelete.name}'.`;
    if (totalTransfers > 0 || totalDischarges > 0) {
      msg += ` Se registraron ${totalTransfers} traslado(s) y ${totalDischarges} descargo(s) en la auditoría de movimientos.`;
    }

    setCatMsg(msg);
    triggerNotification(
      '¡Reasignación y Eliminación de Categoría Completada!',
      msg,
      'success',
      'CATEGORÍAS'
    );
    setCategoryToDelete(null);
    setAffectedProducts([]);
    setStockRelocations([]);
    setReassignModalOpen(false);
  };

  // History Purge Logic
  const handlePurgeHistory = () => {
    const currentMovements = getMovements();
    const filtered = currentMovements.filter((m) => {
      const matchWh =
        m.sourceWarehouseId === selectedWarehouseId ||
        m.targetWarehouseId === selectedWarehouseId;
      if (!matchWh) return true; // keep movements from other warehouses

      if (purgeType === 'ALL') return false; // delete all for this warehouse
      return m.type !== purgeType; // delete matching type
    });

    saveMovements(filtered);
    const whObj = warehouses.find((w) => w.id === selectedWarehouseId);
    const whName = whObj ? `${whObj.code} - ${whObj.name}` : selectedWarehouseId;
    setHistoryMsg('Vaciado de historial completado exitosamente.');
    triggerNotification(
      '¡Vaciado de Historial Completado!',
      `Se vació el historial (${purgeType === 'ALL' ? 'Todos los registros' : purgeType}) del almacén ${whName}.`,
      'warning',
      'HISTORIAL'
    );
    setConfirmPurgeOpen(false);
  };

  const handleConfirmDeleteSingleMovement = () => {
    if (!singleMovementToDelete) return;
    const currentMovements = getMovements().filter((m) => m.id !== singleMovementToDelete.id);
    saveMovements(currentMovements);
    setHistoryMsg(`El registro de movimiento ${singleMovementToDelete.movementNumber} fue eliminado correctamente.`);
    triggerNotification(
      '¡Registro de Movimiento Eliminado!',
      `El movimiento N° ${singleMovementToDelete.movementNumber} (Ref: ${singleMovementToDelete.docRef}) ha sido eliminado del historial de auditoría.`,
      'warning',
      'HISTORIAL'
    );
    setSingleMovementToDelete(null);
    setConfirmSingleDeleteOpen(false);
    setDetailModalOpen(false);
    setSelectedMovementForDetail(null);
  };

  // Format user auditing dates safely
  const formatUserDate = (isoStr?: string) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // Filtered & Paginated Users
  const filteredUsers = users.filter((u) => {
    if (userStatusFilter === 'ACTIVE' && (u.isSuspended || u.isDeleted)) return false;
    if (userStatusFilter === 'SUSPENDED' && (!u.isSuspended || u.isDeleted)) return false;
    if (userStatusFilter === 'DELETED' && !u.isDeleted) return false;
    if (userStatusFilter === 'ALL' && u.isDeleted) return false;

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.trim().toLowerCase();
      const matchName = u.username.toLowerCase().includes(q);
      const matchRole = u.roleName.toLowerCase().includes(q);
      if (!matchName && !matchRole) return false;
    }
    return true;
  });

  const userTotalItems = filteredUsers.length;
  const userTotalPages = Math.max(1, Math.ceil(userTotalItems / userItemsPerPage));
  const userStartIndex = (userCurrentPage - 1) * userItemsPerPage;
  const userEndIndex = Math.min(userStartIndex + userItemsPerPage, userTotalItems);
  const paginatedUsers = filteredUsers.slice(userStartIndex, userEndIndex);

  // Filtered and Paginated movements for the History Auditor
  const filteredHistoryMovements = movements.filter((mov) => {
    // Filter by Warehouse
    if (historyWarehouseFilter !== 'ALL') {
      const matchWh =
        mov.sourceWarehouseId === historyWarehouseFilter ||
        mov.targetWarehouseId === historyWarehouseFilter;
      if (!matchWh) return false;
    }

    // Filter by Movement Type
    if (historyTypeFilter !== 'ALL') {
      if (mov.type !== historyTypeFilter) return false;
    }

    // Search query with advanced date, operation type, user, warehouse, product & ref search
    return matchesMovementSearch(mov, historySearchQuery, warehouses);
  });

  const historyTotalItems = filteredHistoryMovements.length;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotalItems / historyItemsPerPage));
  const historyStartIndex = (historyCurrentPage - 1) * historyItemsPerPage;
  const historyEndIndex = Math.min(historyStartIndex + historyItemsPerPage, historyTotalItems);
  const paginatedHistoryMovements = filteredHistoryMovements.slice(historyStartIndex, historyEndIndex);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Title Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 shadow-xl mb-6 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-300 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30 mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>MODO ADMINISTRADOR</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Gestión del Sistema y Permisos</h1>
          <p className="text-xs text-slate-300 mt-1">
            Cree usuarios, asigne contraseñas, habilite o deshabilite funciones por perfil, configure categorías y limpie historiales.
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex flex-wrap overflow-x-auto scrollbar-none scrollbar-hide touch-auto bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80 gap-1">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'USERS'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios y Permisos</span>
          </button>
          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CATEGORIES'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Categorías</span>
          </button>
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PRODUCTS'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Productos (Catálogo)</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY_PURGE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'HISTORY_PURGE'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar Historiales</span>
          </button>
        </div>
      </div>

      {/* PROMINENT NOTIFICATION BANNER */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`mb-6 p-4 rounded-2xl border-2 shadow-2xl flex items-start justify-between gap-4 text-white relative overflow-hidden backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500 shadow-emerald-500/20'
                : notification.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500 shadow-amber-500/20'
                : notification.type === 'info'
                ? 'bg-slate-900/95 border-blue-500 shadow-blue-500/20'
                : 'bg-slate-900/95 border-rose-500 shadow-rose-500/20'
            }`}
          >
            <div className="flex items-start gap-3.5 relative z-10">
              <div
                className={`p-2.5 rounded-xl text-white shrink-0 mt-0.5 shadow-md ${
                  notification.type === 'success'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                    : notification.type === 'warning'
                    ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                    : notification.type === 'info'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                    : 'bg-gradient-to-br from-rose-500 to-rose-700'
                }`}
              >
                {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-white" />}
                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-white" />}
                {notification.type === 'info' && <Sparkles className="w-5 h-5 text-white" />}
                {notification.type === 'error' && <X className="w-5 h-5 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-sm text-white tracking-wide">
                    {notification.title}
                  </span>
                  {notification.categoryTag && (
                    <span className="bg-slate-800 text-slate-300 font-black text-[10px] px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider">
                      {notification.categoryTag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {notification.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              title="Cerrar notificación"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: USERS & PERMISSIONS */}
      {activeTab === 'USERS' && (
        <div ref={userSectionTopRef} className="space-y-6">
          {/* ANIMATED USER ACTION BANNER */}
          <AnimatePresence mode="wait">
            {userActionBanner && (
              <motion.div
                key={userActionBanner.type + userActionBanner.username}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`p-4 rounded-2xl border-2 shadow-xl flex items-center justify-between gap-4 text-white relative overflow-hidden ${
                  userActionBanner.type === 'CREATE'
                    ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-emerald-400 shadow-emerald-900/30'
                    : userActionBanner.type === 'EDIT'
                    ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-blue-400 shadow-blue-900/30'
                    : userActionBanner.type === 'UPDATE'
                    ? 'bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 border-cyan-400 shadow-cyan-900/30'
                    : userActionBanner.type === 'DELETE'
                    ? 'bg-gradient-to-r from-rose-900 via-red-900 to-slate-900 border-rose-400 shadow-rose-900/30'
                    : userActionBanner.type === 'SUSPEND'
                    ? 'bg-gradient-to-r from-amber-900 via-yellow-950 to-slate-900 border-amber-400 shadow-amber-900/30'
                    : 'bg-gradient-to-r from-emerald-900 via-green-950 to-slate-900 border-emerald-400 shadow-emerald-900/30'
                }`}
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div
                    className={`p-2.5 rounded-xl text-white shrink-0 shadow-lg ${
                      userActionBanner.type === 'CREATE'
                        ? 'bg-emerald-500'
                        : userActionBanner.type === 'EDIT'
                        ? 'bg-blue-500'
                        : userActionBanner.type === 'UPDATE'
                        ? 'bg-cyan-500'
                        : userActionBanner.type === 'DELETE'
                        ? 'bg-rose-500'
                        : userActionBanner.type === 'SUSPEND'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  >
                    {userActionBanner.type === 'CREATE' && <UserPlus className="w-6 h-6" />}
                    {userActionBanner.type === 'EDIT' && <Sparkles className="w-6 h-6 animate-pulse" />}
                    {userActionBanner.type === 'UPDATE' && <CheckCircle2 className="w-6 h-6" />}
                    {userActionBanner.type === 'DELETE' && <Trash2 className="w-6 h-6" />}
                    {userActionBanner.type === 'SUSPEND' && <UserX className="w-6 h-6" />}
                    {userActionBanner.type === 'RESTORE' && <UserCheck className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs uppercase tracking-wider text-slate-200">
                        {userActionBanner.type === 'CREATE' && '✨ Nuevo Usuario Creado'}
                        {userActionBanner.type === 'EDIT' && '✏️ Modo Edición de Usuario'}
                        {userActionBanner.type === 'UPDATE' && '💾 Usuario Actualizado'}
                        {userActionBanner.type === 'DELETE' && '🗑️ Usuario Eliminado'}
                        {userActionBanner.type === 'SUSPEND' && '⚠️ Usuario Suspendido'}
                        {userActionBanner.type === 'RESTORE' && '✅ Usuario Reactivado'}
                      </span>
                      <span className="bg-white/10 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-white/20">
                        @{userActionBanner.username}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {userActionBanner.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setUserActionBanner(null)}
                  className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0"
                  title="Cerrar aviso"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* User Creator Form */}
            <div
              className={`lg:col-span-6 bg-white rounded-2xl p-6 border transition-all duration-200 ${
                editingUsername
                  ? 'border-blue-400 bg-blue-50/20 shadow-lg ring-2 ring-blue-400/30'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingUsername ? `Editar Usuario: ${editingUsername}` : 'Crear Nuevo Usuario'}
                </h2>
              </div>
              {editingUsername && (
                <button
                  onClick={() => {
                    setEditingUsername(null);
                    setNewUsername('');
                    setNewPassword('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            {userSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{userSuccessMsg}</span>
              </div>
            )}

            {userErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{userErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ej: caja01 o contador01"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contraseña
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ej: 001 o clave123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rol / Cargo
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej: Cajera, Despachador, Supervisor"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
              </div>

              {/* Functional Permission Toggles */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-red-600" />
                  <span>Permisos Operativos Habilitados</span>
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => togglePermission('canEntries')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                      newPermissions.canEntries
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>ENTRADAS (Ingresos)</span>
                    <span className="font-extrabold">{newPermissions.canEntries ? 'SÍ' : 'NO'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePermission('canExits')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                      newPermissions.canExits
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>SALIDAS (Descargos)</span>
                    <span className="font-extrabold">{newPermissions.canExits ? 'SÍ' : 'NO'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePermission('canTransfers')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                      newPermissions.canTransfers
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>TRASLADOS</span>
                    <span className="font-extrabold">{newPermissions.canTransfers ? 'SÍ' : 'NO'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePermission('canSales')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                      newPermissions.canSales
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>PRODUCTOS VENDIDOS</span>
                    <span className="font-extrabold">{newPermissions.canSales ? 'SÍ' : 'NO'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePermission('canExpiry')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                      newPermissions.canExpiry
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>FECHA VENCIMIENTO</span>
                    <span className="font-extrabold">{newPermissions.canExpiry ? 'SÍ' : 'NO'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePermission('canPhysicalInventory')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                      newPermissions.canPhysicalInventory
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>INVENTARIO FÍSICO</span>
                    <span className="font-extrabold">{newPermissions.canPhysicalInventory ? 'SÍ' : 'NO'}</span>
                  </button>
                </div>
              </div>

              {/* Warehouse Toggles */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-red-600" />
                    <span>Acceso Habilitado por Almacén</span>
                  </h3>
                  <button
                    type="button"
                    onClick={toggleAllWarehouses}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    {newPermissions.allowedWarehouses.length === ALL_WAREHOUSE_IDS.length
                      ? 'Desmarcar Todos'
                      : 'Marcar Todos'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {warehouses.map((wh) => {
                    const isAllowed = newPermissions.allowedWarehouses.includes(wh.id);
                    return (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => toggleWarehousePermission(wh.id)}
                        className={`w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isAllowed
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">
                          <strong>{wh.code}</strong> - {wh.name}
                        </span>
                        {isAllowed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-md active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{editingUsername ? 'Guardar Cambios de Perfil' : 'Crear Usuario y Asignar Permisos'}</span>
              </button>
            </form>
          </div>

          {/* Users List Card */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                <span>Usuarios Registrados ({users.filter((u) => !u.isDeleted).length})</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">Control Total de Accesos</span>
            </div>

            {/* Search Filter & Status Controls */}
            <div className="space-y-3 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Buscar usuario por nombre o rol/cargo..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap gap-1">
                  {(['ALL', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setUserStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-[11px] ${
                        userStatusFilter === st
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'ALL' && `Activos/Todos (${users.filter((u) => !u.isDeleted).length})`}
                      {st === 'ACTIVE' && `Activos (${users.filter((u) => !u.isSuspended && !u.isDeleted).length})`}
                      {st === 'SUSPENDED' && `Suspendidos (${users.filter((u) => u.isSuspended && !u.isDeleted).length})`}
                      {st === 'DELETED' && `Eliminados (${users.filter((u) => u.isDeleted).length})`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold">
                  <span>Mostrar:</span>
                  <select
                    value={userItemsPerPage}
                    onChange={(e) => setUserItemsPerPage(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-black text-slate-800 focus:outline-none shadow-2xs"
                  >
                    <option value={3}>3 por pág</option>
                    <option value={5}>5 por pág</option>
                    <option value={10}>10 por pág</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users List */}
            {paginatedUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs font-bold">No se encontraron usuarios coincidentes con el filtro o búsqueda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedUsers.map((user) => {
                  const isEditingThis = editingUsername?.toLowerCase() === user.username.toLowerCase();
                  const isHighlighted = highlightedUser?.username.toLowerCase() === user.username.toLowerCase();
                  return (
                    <div
                      key={user.username}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 shadow-xs relative overflow-hidden ${
                        isEditingThis
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/30'
                          : user.isDeleted
                          ? 'bg-rose-50/70 border-rose-200'
                          : user.isSuspended
                          ? 'bg-amber-50/80 border-amber-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                        {isEditingThis && (
                          <div className="bg-blue-600 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded-b-md absolute top-0 right-4 shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3 animate-spin" />
                            <span>EN EDICIÓN ACTIVA</span>
                          </div>
                        )}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">
                            {user.username}
                          </span>
                          {user.isAdmin && (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-300">
                              ADMIN MAESTRO
                            </span>
                          )}
                          {user.isDeleted ? (
                            <span className="bg-rose-100 text-rose-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-300 flex items-center gap-1 shadow-2xs">
                              <Trash2 className="w-3 h-3 text-rose-700" />
                              ELIMINADO
                            </span>
                          ) : user.isSuspended ? (
                            <span className="bg-amber-200 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-400 flex items-center gap-1 shadow-2xs">
                              <UserX className="w-3 h-3 text-amber-800" />
                              SUSPENDIDO
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              ACTIVO
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all shadow-xs active:scale-95"
                          >
                            Editar
                          </button>

                          {!user.isAdmin && !user.isDeleted && (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspendUser(user.username)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 shadow-xs active:scale-95 ${
                                user.isSuspended
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                              }`}
                              title={user.isSuspended ? 'Reactivar acceso del usuario' : 'Suspender acceso del usuario'}
                            >
                              {user.isSuspended ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Activar</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Suspender</span>
                                </>
                              )}
                            </button>
                          )}

                          {!user.isAdmin && (
                            user.isDeleted ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreUser(user.username)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 active:scale-95"
                                  title="Restaurar usuario"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restaurar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUserToDeleteConfirm({ username: user.username, isPermanent: true })}
                                  className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-xs active:scale-95"
                                  title="Eliminar Definitivamente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setUserToDeleteConfirm({ username: user.username, isPermanent: false })}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all border border-red-200 active:scale-95"
                                title="Eliminar Usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Cargo: <strong className="text-slate-900">{user.roleName}</strong> • Clave:{' '}
                        <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] text-slate-800 font-mono font-bold">
                          {user.password}
                        </code>
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.permissions.canEntries ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500 line-through'}`}>
                          Entradas
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.permissions.canExits ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500 line-through'}`}>
                          Salidas
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.permissions.canTransfers ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500 line-through'}`}>
                          Traslados
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.permissions.canSales ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500 line-through'}`}>
                          Ventas
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          {user.permissions.allowedWarehouses.length} Almacén(es)
                        </span>
                      </div>

                      {/* User Audit Dates Section */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <div>
                            <span className="block font-black text-[9px] uppercase tracking-wider text-slate-400">Creado / Registro:</span>
                            <span className="font-extrabold text-slate-800">{formatUserDate(user.createdAt) || 'Fecha inicial'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <div>
                            <span className="block font-black text-[9px] uppercase tracking-wider text-slate-400">Última Modificación:</span>
                            <span className="font-extrabold text-slate-800">{user.updatedAt ? formatUserDate(user.updatedAt) : 'Sin modificaciones'}</span>
                          </div>
                        </div>

                        {user.isDeleted ? (
                          <div className="flex items-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <div>
                              <span className="block font-black text-[9px] uppercase tracking-wider text-rose-500">Fecha Eliminado:</span>
                              <span className="font-extrabold text-rose-900">{formatUserDate(user.deletedAt) || 'Reciente'}</span>
                            </div>
                          </div>
                        ) : user.isSuspended ? (
                          <div className="flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div>
                              <span className="block font-black text-[9px] uppercase tracking-wider text-amber-600">Fecha Suspensión:</span>
                              <span className="font-extrabold text-amber-900">{formatUserDate(user.suspendedAt) || 'Reciente'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="block font-black text-[9px] uppercase tracking-wider text-emerald-600">Estado en Sistema:</span>
                              <span className="font-extrabold text-emerald-800">Perfil Activo</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

            {/* Pagination Controls for Users */}
            {userTotalPages > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">
                  Mostrando <strong className="text-slate-800">{userStartIndex + 1}</strong> -{' '}
                  <strong className="text-slate-800">{userEndIndex}</strong> de{' '}
                  <strong className="text-slate-800">{userTotalItems}</strong> usuarios
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={userCurrentPage === 1}
                    onClick={() => setUserCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setUserCurrentPage(pg)}
                        className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                          userCurrentPage === pg
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={userCurrentPage === userTotalPages}
                    onClick={() => setUserCurrentPage((p) => Math.min(userTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* TAB 2: CATEGORIES & PREFIXES */}
      {activeTab === 'CATEGORIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <FolderPlus className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-slate-900">Agregar Nueva Categoría</h2>
            </div>

            {catMsg && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold">
                {catMsg}
              </div>
            )}

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre de la Categoría (Subgrupo)
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej: EMPAQUES Y PLÁSTICOS"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prefijo Predeterminado de Código (Obligatorio)
                </label>
                <input
                  type="text"
                  value={newCategoryPrefix}
                  onChange={(e) => setNewCategoryPrefix(e.target.value.toUpperCase())}
                  placeholder="Ej: EMP"
                  maxLength={5}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all tracking-wider"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Al seleccionar esta categoría al registrar o ingresar un producto, el código incluirá este prefijo automáticamente.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Guardar Categoría</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-red-600" />
              <span>Categorías Configuradas en el Sistema ({categories.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 hover:border-slate-300 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 text-xs block truncate">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {cat.isDefault ? 'Predeterminada del sistema' : 'Categoría personalizada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-black rounded-lg tracking-wider border border-red-200 font-mono">
                      "{cat.codePrefix}"
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 hover:border-blue-300"
                      title="Editar Nombre o Prefijo de Categoría"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestDeleteCategory(cat)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-300"
                      title="Eliminar Categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <AdminProducts />
      )}

      {/* TAB 4: HISTORY PURGE */}
      {activeTab === 'HISTORY_PURGE' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Auditoría Avanzada y Limpieza de Historial de Movimientos</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Herramienta de administración para buscar, filtrar por almacén/tipo, navegar por páginas e inspeccionar o eliminar movimientos.
              </p>
            </div>
          </div>

          {historyMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span>{historyMsg}</span>
              <button
                onClick={() => setHistoryMsg('')}
                className="text-emerald-700 hover:text-emerald-950 text-xs font-black p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Purge Controls Box */}
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Vaciado Masivo por Almacén y Tipo</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1. Almacén Afectado
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-red-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Tipo de Movimiento a Limpiar
                </label>
                <select
                  value={purgeType}
                  onChange={(e) => setPurgeType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-red-500"
                >
                  <option value="DESCARGO">Sólo Descargos (Salidas)</option>
                  <option value="TRASLADO">Sólo Traslados</option>
                  <option value="ENTRADA">Sólo Entradas (Ingresos)</option>
                  <option value="VENTA">Sólo Ventas</option>
                  <option value="ALL">TODOS LOS MOVIMIENTOS DE ESTE ALMACÉN</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setConfirmPurgeOpen(true)}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Vaciar Historial Seleccionado</span>
                </button>
              </div>
            </div>
          </div>

          {/* ADVANCED FILTER & SEARCH TOOLBAR FOR HISTORY */}
          <div className="mb-4 bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-red-400" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
                  Filtros y Búsqueda de Historial ({historyTotalItems} de {movements.length})
                </span>
              </div>
              {(historySearchQuery || historyWarehouseFilter !== 'ALL' || historyTypeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryWarehouseFilter('ALL');
                    setHistoryTypeFilter('ALL');
                  }}
                  className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar Filtros</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Buscar por fecha (ej: 17/07, 31/7), tipo (ej: tras, ent), usuario, ref o producto..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Warehouse Filter */}
              <div className="sm:col-span-3">
                <select
                  value={historyWarehouseFilter}
                  onChange={(e) => setHistoryWarehouseFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="ALL">Todos los Almacenes</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type Filter */}
              <div className="sm:col-span-3">
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="ALL">Todos los Tipos</option>
                  <option value="ENTRADA">Entradas (Ingresos)</option>
                  <option value="TRASLADO">Traslados</option>
                  <option value="DESCARGO">Descargos (Salidas)</option>
                  <option value="VENTA">Ventas</option>
                  <option value="INVENTARIO_FISICO">Ajustes de Inventario</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of Current Movements with Individual Detail & Delete */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-900 text-white px-4 py-3 font-bold text-xs flex items-center justify-between">
              <span>Registros de Historial Encontrados ({historyTotalItems})</span>
              <span className="text-[11px] text-slate-300 font-normal">
                Haga clic en un registro para ver su detalle completo
              </span>
            </div>

            <div className="divide-y divide-slate-100 min-h-[220px]">
              {paginatedHistoryMovements.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {movements.length === 0
                    ? 'No hay movimientos registrados en el historial.'
                    : 'No se encontraron registros que coincidan con la búsqueda o filtros seleccionados.'}
                </div>
              ) : (
                paginatedHistoryMovements.map((mov) => {
                  const src = warehouses.find((w) => w.id === mov.sourceWarehouseId);
                  const tgt = warehouses.find((w) => w.id === mov.targetWarehouseId);
                  return (
                    <div
                      key={mov.id}
                      onClick={() => {
                        setSelectedMovementForDetail(mov);
                        setDetailModalOpen(true);
                      }}
                      className="p-3.5 hover:bg-blue-50/50 flex items-center justify-between text-xs gap-3 cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {mov.movementNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              mov.type === 'ENTRADA'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : mov.type === 'TRASLADO'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : mov.type === 'DESCARGO'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : mov.type === 'VENTA'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {mov.type}
                          </span>
                          <span className="text-slate-500 text-[11px] font-mono">Ref: {mov.docRef}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1">
                          Fecha: {mov.date} • Resp: <strong className="text-slate-700">{mov.responsibleUser}</strong> •{' '}
                          {src ? src.name : 'Externa'} &rarr; {tgt ? tgt.name : 'Salida/Cliente'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {mov.items.length} producto(s):{' '}
                          {mov.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedMovementForDetail(mov);
                            setDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Detalle</span>
                        </button>
                        <button
                          onClick={() => {
                            setSingleMovementToDelete(mov);
                            setConfirmSingleDeleteOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar este movimiento específico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* HISTORY PAGINATION TOOLBAR */}
            {historyTotalItems > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-3">
                  <span>
                    Mostrando <strong className="text-slate-900">{historyStartIndex + 1}</strong> a{' '}
                    <strong className="text-slate-900">{historyEndIndex}</strong> de{' '}
                    <strong className="text-slate-900">{historyTotalItems}</strong> registros
                  </span>

                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-slate-500 font-medium">Por página:</span>
                    <select
                      value={historyItemsPerPage}
                      onChange={(e) => setHistoryItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setHistoryCurrentPage(1)}
                    disabled={historyCurrentPage === 1}
                    className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors"
                    title="Primera página"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setHistoryCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={historyCurrentPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>

                  <span className="px-3 py-1 bg-red-600 text-white font-black rounded-lg">
                    {historyCurrentPage} / {historyTotalPages}
                  </span>

                  <button
                    onClick={() => setHistoryCurrentPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyCurrentPage >= historyTotalPages}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setHistoryCurrentPage(historyTotalPages)}
                    disabled={historyCurrentPage >= historyTotalPages}
                    className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors"
                    title="Última página"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para ver Detalle Completo de Movimiento en Administrador */}
      <AnimatePresence>
        {detailModalOpen && selectedMovementForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-950/70"
              onClick={() => setDetailModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6 text-slate-900"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-800 rounded-xl">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      Detalle del Movimiento {selectedMovementForDetail.movementNumber}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">Doc. Ref: {selectedMovementForDetail.docRef}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Status Badge & Basic Meta */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Tipo de Operación</span>
                    <span className="font-black text-slate-900 uppercase">{selectedMovementForDetail.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Fecha y Hora</span>
                    <span className="font-bold text-slate-900">{selectedMovementForDetail.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Usuario Responsable</span>
                    <span className="font-bold text-slate-900">{selectedMovementForDetail.responsibleUser}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Almacén Origen</span>
                    <span className="font-bold text-slate-900">
                      {warehouses.find((w) => w.id === selectedMovementForDetail.sourceWarehouseId)?.name ||
                        'N/A (Ingreso Externo)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Almacén Destino</span>
                    <span className="font-bold text-slate-900">
                      {selectedMovementForDetail.type === 'VENTA'
                        ? selectedMovementForDetail.targetWarehouseId || 'Consumidor Final'
                        : warehouses.find((w) => w.id === selectedMovementForDetail.targetWarehouseId)?.name ||
                          'N/A (Salida / Baja)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Total Ítems</span>
                    <span className="font-black text-blue-700">{selectedMovementForDetail.items.length} producto(s)</span>
                  </div>
                </div>

                {/* Products Table */}
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                    Productos y Cantidades del Movimiento:
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5 text-right">Cantidad</th>
                          <th className="p-2.5">Unidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedMovementForDetail.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-slate-900">{item.productCode}</td>
                            <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                            <td className="p-2.5 text-right font-black text-slate-900">{item.quantity}</td>
                            <td className="p-2.5 text-slate-600 font-medium">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase block mb-1">Observación / Nota:</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                    {selectedMovementForDetail.notes || 'Sin observaciones adicionales expresadas.'}
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSingleMovementToDelete(selectedMovementForDetail);
                    setConfirmSingleDeleteOpen(true);
                  }}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar este Registro</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => generateMovementPDF(selectedMovementForDetail)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Individual Movement Deletion */}
      <ConfirmationModal
        isOpen={confirmSingleDeleteOpen}
        onClose={() => {
          setConfirmSingleDeleteOpen(false);
          setSingleMovementToDelete(null);
        }}
        onConfirm={handleConfirmDeleteSingleMovement}
        title={`¿Eliminar Registro de Movimiento ${singleMovementToDelete?.movementNumber || ''}?`}
        message={`¿Está completamente seguro de que desea eliminar permanentemente el registro de movimiento '${
          singleMovementToDelete?.movementNumber || ''
        }' (Ref: ${singleMovementToDelete?.docRef || ''})? Esta acción eliminará el registro del historial de auditoría del sistema.`}
        type="DELETE"
        confirmText="Sí, Eliminar Registro"
      />

      {/* Confirmation Modal for History Purge */}
      <ConfirmationModal
        isOpen={confirmPurgeOpen}
        onClose={() => setConfirmPurgeOpen(false)}
        onConfirm={handlePurgeHistory}
        title="¿Confirmar Vaciado de Historial?"
        message={`¿Está completamente seguro que desea borrar ${
          purgeType === 'ALL' ? 'TODOS los movimientos' : `los movimientos de tipo ${purgeType}`
        } para el almacén seleccionado? Esta acción no se puede deshacer.`}
        type="DELETE"
        confirmText="Sí, Vaciar Historial"
      />

      {/* Confirmation Modal for Simple Category Deletion (0 products) */}
      <ConfirmationModal
        isOpen={confirmDeleteCatOpen}
        onClose={() => {
          setConfirmDeleteCatOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDeleteCategory}
        title={`¿Eliminar Categoría '${categoryToDelete?.name || ''}'?`}
        message={`¿Está seguro de que desea eliminar la categoría '${categoryToDelete?.name}' con prefijo [${categoryToDelete?.codePrefix}]? Esta acción removerá la categoría del sistema.`}
        type="DELETE"
        confirmText="Sí, Eliminar Categoría"
      />

      {/* Confirmation Modal for User Deletion */}
      <ConfirmationModal
        isOpen={!!userToDeleteConfirm}
        onClose={() => setUserToDeleteConfirm(null)}
        onConfirm={() => {
          if (!userToDeleteConfirm) return;
          if (userToDeleteConfirm.isPermanent) {
            handlePermanentDeleteUser(userToDeleteConfirm.username);
          } else {
            handleDeleteUser(userToDeleteConfirm.username);
          }
          setUserToDeleteConfirm(null);
        }}
        title={`¿Eliminar usuario '${userToDeleteConfirm?.username || ''}'?`}
        message={`¿Está seguro de que desea ${
          userToDeleteConfirm?.isPermanent ? 'eliminar definitivamente' : 'marcar como eliminado'
        } al usuario '${userToDeleteConfirm?.username || ''}'? ${
          userToDeleteConfirm?.isPermanent
            ? 'Esta acción destruirá el usuario de forma permanente.'
            : 'El usuario ya no tendrá acceso al sistema.'
        }`}
        type="DELETE"
        confirmText={userToDeleteConfirm?.isPermanent ? 'Sí, Eliminar Definitivamente' : 'Sí, Eliminar Usuario'}
      />

      {/* Modal para Editar Nombre y Prefijo de Categoría */}
      {editCatModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <span>Editar Categoría (Subgrupo)</span>
              </h3>
              <button
                onClick={() => setEditCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prefijo Predeterminado de Código
                </label>
                <input
                  type="text"
                  value={editCatPrefix}
                  onChange={(e) => setEditCatPrefix(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Los comprobantes y registros pasados conservarán sus nombres antiguos. Los nuevos registros utilizarán este nuevo nombre.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditCatModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditCategory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Eliminar Categoría que CONTIENE PRODUCTOS (Reasignación de Subgrupo & Traslados de Almacén) */}
      {reassignModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Reasignación y Traslado por Eliminación de Categoría</span>
              </h3>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <p className="text-xs text-slate-600 font-medium">
                La categoría <strong className="text-slate-900">"{categoryToDelete.name}"</strong> contiene{' '}
                <strong className="text-red-600 font-extrabold">{affectedProducts.length} producto(s)</strong> en el sistema.
                Seleccione la nueva categoría para los productos y configure si desea realizar traslados o descargos de sus existencias entre almacenes.
              </p>

              {/* 1. Selector de Categoría Destino */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-950 uppercase">
                  1. Nueva Categoría (Subgrupo) Asignada:
                </label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {categories
                    .filter((c) => c.id !== categoryToDelete.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.codePrefix})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-amber-900 font-medium">
                  ✓ Todos los productos de '{categoryToDelete.name}' se registrarán a partir de ahora en esta nueva categoría.
                </p>
              </div>

              {/* 2. Configuración de Traslados o Descargos de Existencias por Almacén */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Existencias y Ubicación en Almacenes (Opcional):
                </span>

                {affectedProducts.map((p) => {
                  const pRelocs = stockRelocations.filter((r) => r.productId === p.id);
                  const totalStock = Object.values(p.stockByWarehouse || {}).reduce(
                    (acc: number, curr: any) => acc + (Number(curr) || 0),
                    0
                  );

                  return (
                    <div
                      key={p.id}
                      className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded shrink-0">
                            {p.code}
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs truncate">{p.name}</span>
                        </div>
                        <span className="font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                          Total: {totalStock} {p.unit}
                        </span>
                      </div>

                      {pRelocs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Sin existencias registradas en almacén.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {pRelocs.map((relocItem) => (
                            <div
                              key={`${relocItem.productId}_${relocItem.sourceWhId}`}
                              className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{relocItem.sourceWhName}</span>
                                </span>
                                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                  Stock actual: {relocItem.currentStock} {relocItem.unit}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    Acción con existencias:
                                  </label>
                                  <CustomSelect
                                    value={relocItem.action}
                                    onChange={(val) => {
                                      setStockRelocations((prev) =>
                                        prev.map((r) =>
                                          r.productId === relocItem.productId &&
                                          r.sourceWhId === relocItem.sourceWhId
                                            ? { ...r, action: val as any }
                                            : r
                                        )
                                      );
                                    }}
                                    accentColor="blue"
                                    options={[
                                      { value: 'KEEP', label: 'Mantener existencias en este almacén' },
                                      { value: 'TRANSFER', label: 'Trasladar existencias a otro almacén' },
                                      { value: 'DISCHARGE', label: 'Descargar / Dar de baja existencias' },
                                    ]}
                                  />
                                </div>

                                {relocItem.action === 'TRANSFER' && (
                                  <>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                        Almacén Destino del Traslado:
                                      </label>
                                      <CustomSelect
                                        value={relocItem.targetWhId}
                                        onChange={(val) => {
                                          setStockRelocations((prev) =>
                                            prev.map((r) =>
                                              r.productId === relocItem.productId &&
                                              r.sourceWhId === relocItem.sourceWhId
                                                ? { ...r, targetWhId: val }
                                                : r
                                            )
                                          );
                                        }}
                                        accentColor="blue"
                                        options={warehouses
                                          .filter((w) => w.id !== relocItem.sourceWhId)
                                          .map((w) => ({
                                            value: w.id,
                                            label: w.name,
                                            badge: w.code,
                                          }))}
                                      />
                                    </div>

                                    <div className="sm:col-span-2 flex items-center gap-2 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                                      <span className="text-[11px] font-bold text-blue-900 shrink-0">
                                        Cantidad a trasladar:
                                      </span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={relocItem.currentStock}
                                        value={relocItem.transferQty}
                                        onChange={(e) => {
                                          const num = Math.min(
                                            relocItem.currentStock,
                                            Math.max(1, parseInt(e.target.value) || 1)
                                          );
                                          setStockRelocations((prev) =>
                                            prev.map((r) =>
                                              r.productId === relocItem.productId &&
                                              r.sourceWhId === relocItem.sourceWhId
                                                ? { ...r, transferQty: num }
                                                : r
                                            )
                                          );
                                        }}
                                        className="w-24 px-2 py-1 bg-white border border-blue-300 rounded text-xs font-bold text-slate-900 text-center"
                                      />
                                      <span className="text-[11px] text-blue-800 font-medium">
                                        {relocItem.unit}
                                      </span>
                                    </div>
                                  </>
                                )}

                                {relocItem.action === 'DISCHARGE' && (
                                  <div className="sm:col-span-2 flex items-center gap-2 bg-red-50/60 p-2 rounded-lg border border-red-100">
                                    <span className="text-[11px] font-bold text-red-900 shrink-0">
                                      Cantidad a descargar / dar de baja:
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={relocItem.currentStock}
                                      value={relocItem.transferQty}
                                      onChange={(e) => {
                                        const num = Math.min(
                                          relocItem.currentStock,
                                          Math.max(1, parseInt(e.target.value) || 1)
                                        );
                                        setStockRelocations((prev) =>
                                          prev.map((r) =>
                                            r.productId === relocItem.productId &&
                                            r.sourceWhId === relocItem.sourceWhId
                                              ? { ...r, transferQty: num }
                                              : r
                                          )
                                        );
                                      }}
                                      className="w-24 px-2 py-1 bg-white border border-red-300 rounded text-xs font-bold text-slate-900 text-center"
                                    />
                                    <span className="text-[11px] text-red-800 font-medium">
                                      {relocItem.unit}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 3. Observación / Nota para el Historial de Movimientos */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  3. Nota u Observación para la Auditoría / Movimiento:
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  rows={2}
                  placeholder="Escriba la razón del movimiento o reorganización de categoría..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReassignAndDeleteCategory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Confirmar Reasignación y Traslados</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
