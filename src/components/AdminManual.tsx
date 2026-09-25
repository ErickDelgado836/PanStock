import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserPlus,
  Key,
  Building2,
  Tag,
  Box,
  Trash2,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  FileSpreadsheet,
  FileText,
  Lock,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

interface AdminManualProps {
  onNavigateToAdminTab?: (tab: 'USERS' | 'CATEGORIES' | 'PRODUCTS' | 'HISTORY_PURGE' | 'MANUAL') => void;
  onNavigateToAppTab?: (tab: string) => void;
}

interface AdminSection {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  content: {
    summary: string;
    targetAdminTab?: 'USERS' | 'CATEGORIES' | 'PRODUCTS' | 'HISTORY_PURGE';
    actionButtonText?: string;
    keyFeatures?: { title: string; desc: string; icon?: React.ComponentType<{ className?: string }> }[];
    steps?: { title: string; desc: string; tip?: string }[];
    securityWarning?: string;
    faq?: { q: string; a: string }[];
  };
}

export const AdminManual: React.FC<AdminManualProps> = ({
  onNavigateToAdminTab,
  onNavigateToAppTab,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('USUARIOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const detailContainerRef = useRef<HTMLDivElement>(null);
  const topicsListRef = useRef<HTMLDivElement>(null);

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        if (detailContainerRef.current) {
          const yOffset = -24;
          const element = detailContainerRef.current;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const handleScrollToTopics = () => {
    if (topicsListRef.current) {
      const yOffset = -24;
      const element = topicsListRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sections: AdminSection[] = [
    {
      id: 'INTRO',
      title: '1. Visión General del Modo Administrador',
      subtitle: 'Alcance, responsabilidades, jerarquía de acceso y gobierno del sistema',
      badge: 'Gobernanza',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      icon: Shield,
      keywords: ['administrador', 'admin', 'seguridad', 'acceso', 'modo administrador', 'responsabilidades', 'gobernanza'],
      content: {
        summary:
          'El Modo Administrador otorga control absoluto sobre la plataforma PanStock de Panadería Española C.A. (RIF: J-070054034). Desde aquí se definen quiénes pueden ingresar, qué almacenes pueden ver, cuáles operaciones tienen autorizadas y el mantenimiento integral de la base de datos.',
        keyFeatures: [
          {
            title: 'Control de Acceso Basado en Roles (RBAC)',
            desc: 'Asigne permisos quirúrgicos a cada empleado: solo lo necesario para su función operativa diaria.',
            icon: Users,
          },
          {
            title: 'Sincronización en Tiempo Real',
            desc: 'Cualquier cambio de permisos o suspensión surte efecto de inmediato en las sesiones activas de los usuarios.',
            icon: RefreshCw,
          },
          {
            title: 'Auditoría y Mantenimiento Seguro',
            desc: 'Permite inspeccionar, reimprimir comprobantes y depurar movimientos históricos erróneos con respaldo y reversión.',
            icon: ShieldCheck,
          },
        ],
        steps: [
          {
            title: 'Diferencia entre Acceso Operativo y Administrador',
            desc: 'El "Acceso Operativo" es para el personal de almacén, despachos y ventas. El "Modo Administrador" está reservado para la gerencia y supervisores autorizados.',
            tip: 'El usuario administrador maestro "admin" cuenta con protección de sistema contra eliminación o suspensión accidental.',
          },
          {
            title: 'Navegación segura y fluida',
            desc: 'Como administrador, puedes alternar entre el Panel Admin y las vistas de Inicio, Almacenes, Ventas y Vencimientos directamente desde el menú superior sin cerrar sesión.',
          },
        ],
        securityWarning:
          'Nunca comparta las contraseñas administrativas ni asigne privilegios totales a operadores que solo requieren registrar ingresos o traslados.',
      },
    },
    {
      id: 'USUARIOS',
      title: '2. Gestión de Usuarios y Permisos Operativos',
      subtitle: 'Creación de cuentas, asignación de cargos y configuración de los 7 permisos',
      badge: 'Control de Usuarios',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Users,
      keywords: ['usuarios', 'permisos', 'crear usuario', 'roles', 'cargos', 'contraseñas', 'entradas', 'salidas', 'traslados', 'ventas'],
      content: {
        targetAdminTab: 'USERS',
        actionButtonText: 'Ir a Usuarios y Permisos',
        summary:
          'Permite registrar a cada colaborador con su propio nombre de usuario y contraseña individual, evitando el uso de cuentas genéricas y garantizando la trazabilidad en cada movimiento.',
        keyFeatures: [
          {
            title: 'ENTRADAS (Ingresos)',
            desc: 'Autoriza al usuario a ingresar nueva mercancía a los almacenes.',
          },
          {
            title: 'SALIDAS (Descargos)',
            desc: 'Permite registrar mermas, productos vencidos, consumos internos o ajustes negativos.',
          },
          {
            title: 'TRASLADOS',
            desc: 'Permite transferir existencias entre diferentes almacenes autorizados.',
          },
          {
            title: 'PRODUCTOS VENDIDOS',
            desc: 'Habilita el módulo de registro de ventas, cálculo de facturación e inventario comercial.',
          },
          {
            title: 'FECHA VENCIMIENTO (Módulo)',
            desc: 'Permite acceder a la pantalla de alertas y calendario de caducidades.',
          },
          {
            title: 'EDICIÓN VENCIMIENTO (Lotes)',
            desc: 'Habilita el botón para crear, editar o corregir números de lote y fechas de vencimiento.',
          },
          {
            title: 'INVENTARIO FÍSICO (Auditoría)',
            desc: 'Habilita el registro de conteos físicos y cálculo de diferencias contra el sistema.',
          },
        ],
        steps: [
          {
            title: '1. Ingresar los datos del usuario',
            desc: 'En el formulario lateral, escribe el nombre de usuario, contraseña y cargo o rol (ej. Despachador, Supervisor, Almacenista).',
            tip: 'Los nombres de usuario no distinguen mayúsculas/minúsculas pero deben ser únicos.',
          },
          {
            title: '2. Habilitar o deshabilitar permisos con un clic',
            desc: 'Haz clic sobre cada botón de permiso para alternar entre "SÍ" (verde) y "NO" (gris).',
          },
          {
            title: '3. Asignar almacenes autorizados',
            desc: 'Usa las casillas para elegir los almacenes a los que tendrá acceso o pulsa "Seleccionar Todos".',
          },
          {
            title: '4. Guardar o Actualizar',
            desc: 'Haz clic en "Guardar Usuario". El usuario se añadirá a la lista de inmediato y se sincronizará con la nube.',
          },
        ],
        faq: [
          {
            q: '¿Cómo restablezco la contraseña de un usuario que la olvidó?',
            a: 'Busca al usuario en la lista derecha, haz clic en el botón de lápiz (Editar), escribe la nueva contraseña en el formulario y pulsa "Actualizar Usuario".',
          },
          {
            q: '¿Qué sucede si le quito el permiso de Ventas a un usuario conectado?',
            a: 'El sistema detecta la modificación en tiempo real. Si el usuario estaba en la pantalla de Ventas, será redirigido al Inicio y recibirá un aviso emergente informándole el cambio.',
          },
        ],
      },
    },
    {
      id: 'ALMACENES_RESTICCION',
      title: '3. Restricción por Almacenes y Depósitos',
      subtitle: 'Delimite la visibilidad del inventario según la estación o sucursal del empleado',
      badge: 'Almacenes',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Building2,
      keywords: ['almacenes', 'deposito', 'restriccion', 'permiso almacen', 'distribucion', 'materia prima', 'despacho'],
      content: {
        targetAdminTab: 'USERS',
        actionButtonText: 'Configurar Almacenes por Usuario',
        summary:
          'PanStock administra 10 almacenes distintos (Distribución Interna, Despacho, Ventas al Mayor, Materia Prima, Panadería, Pastelería, etc.). Puede restringir a un usuario para que únicamente vea y opere los depósitos asignados a su puesto de trabajo.',
        keyFeatures: [
          {
            title: 'Aislamiento de Existencias',
            desc: 'Un operador solo verá en la barra de pestañas y en los formularios de traslados los almacenes expresamente autorizados.',
          },
          {
            title: 'Botón "Seleccionar Todos"',
            desc: 'Facilita asignar los 10 almacenes de un solo clic para cargos gerenciales o supervisores generales.',
          },
          {
            title: 'Reasignación Dinámica',
            desc: 'Si revocas el acceso a un almacén mientras el usuario lo visualiza, el sistema lo reubicará automáticamente al siguiente almacén permitido.',
          },
        ],
        steps: [
          {
            title: '1. Seleccionar al usuario a editar',
            desc: 'Haz clic en el botón "Editar" en la tarjeta del usuario correspondiente.',
          },
          {
            title: '2. Marcar o desmarcar almacenes',
            desc: 'Marca los almacenes que el usuario tiene permitido consultar. Por ejemplo, marca únicamente "04 MATERIA PRIMA" para el equipo de producción.',
          },
          {
            title: '3. Guardar cambios',
            desc: 'Pulsa "Actualizar Usuario" para aplicar los cambios de manera instantánea.',
          },
        ],
      },
    },
    {
      id: 'ESTADOS_SUSPENSION',
      title: '4. Suspensión, Reactivación y Eliminación Segura',
      subtitle: 'Control de estatus, desvinculación inmediata y protección del admin maestro',
      badge: 'Seguridad Activa',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: ShieldAlert,
      keywords: ['suspender', 'reactivar', 'eliminar', 'desactivar', 'bloqueo', 'seguridad', 'admin maestro'],
      content: {
        targetAdminTab: 'USERS',
        actionButtonText: 'Gestionar Estatus de Usuarios',
        summary:
          'Para proteger la seguridad de la información, el administrador puede suspender temporalmente el acceso de cualquier empleado o eliminar cuentas obsoletas sin perder el historial de los movimientos pasados.',
        keyFeatures: [
          {
            title: 'Suspensión Inmediata (Cierre en Vivo)',
            desc: 'Si un usuario con sesión abierta es suspendido, el sistema cerrará su sesión de inmediato y le mostrará una pantalla de notificación de bloqueo.',
          },
          {
            title: 'Reactivación en 1 Clic',
            desc: 'Un usuario suspendido puede ser reactivado en cualquier momento pulsando el botón verde "Reactivar".',
          },
          {
            title: 'Eliminación Lógica con Histórico Protegido',
            desc: 'Al eliminar un usuario, sus movimientos pasados conservan su nombre como responsable para fines de auditoría.',
          },
          {
            title: 'Protección Anti-Bloqueo del Admin Maestro',
            desc: 'El usuario "admin" está blindado por código fuente contra suspensión y eliminación para garantizar que nunca se pierda el acceso al sistema.',
          },
        ],
        steps: [
          {
            title: 'Cómo Suspender a un Usuario',
            desc: 'En la lista de usuarios, localiza la tarjeta y haz clic en el botón amarillo "Suspender". Confirma la acción. El usuario quedará inhabilitado al instante.',
            tip: 'Usa la suspensión para vacaciones, permisos o investigaciones sin necesidad de borrar la cuenta.',
          },
          {
            title: 'Cómo Reactivar a un Usuario',
            desc: 'Filtra por la pestaña "Suspendidos" en la lista de usuarios y pulsa el botón verde "Reactivar". El usuario podrá volver a ingresar inmediatamente.',
          },
          {
            title: 'Cómo Eliminar un Usuario',
            desc: 'Haz clic en el botón rojo de papelera. Se te preguntará si deseas eliminarlo de forma lógica (recomendado para conservar historial) o permanente.',
          },
        ],
        securityWarning:
          'Si sospecha de un acceso indebido, suspenda al usuario de inmediato desde el panel y cambie su contraseña antes de reactivarlo.',
      },
    },
    {
      id: 'CATEGORIAS',
      title: '5. Gestión de Categorías y Reasignación de Stock',
      subtitle: 'Creación de grupos, prefijos alfanuméricos y asistente inteligente de eliminación',
      badge: 'Catálogo y Grupos',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Tag,
      keywords: ['categorias', 'grupos', 'prefijo', 'reasignacion', 'eliminar categoria', 'editar categoria', 'subgrupos'],
      content: {
        targetAdminTab: 'CATEGORIES',
        actionButtonText: 'Ir a Categorías',
        summary:
          'Las categorías organizan el catálogo de PanStock (Materia Prima, Panadería, Pastelería, Embalajes, etc.). El sistema incluye un asistente de protección que impide dejar productos sin categoría o perder existencias.',
        keyFeatures: [
          {
            title: 'Prefijos Estandarizados',
            desc: 'Cada categoría cuenta con un prefijo de 3 a 5 letras (ej: HAR, EMB, LACT, DUL) que identifica y clasifica los productos.',
          },
          {
            title: 'Edición en Línea',
            desc: 'Modifica el nombre o prefijo de cualquier categoría en cualquier momento sin afectar los productos ya creados.',
          },
          {
            title: 'Asistente de Reasignación al Eliminar',
            desc: 'Si una categoría tiene productos asociados, el sistema te solicitará a qué otra categoría deseas transferirlos antes de permitir borrarla.',
          },
        ],
        steps: [
          {
            title: '1. Crear una nueva categoría',
            desc: 'Ingresa a la pestaña "Categorías", escribe el nombre (ej. Bebidas y Lácteos) y su prefijo (ej. BEB), y haz clic en "Agregar Categoría".',
          },
          {
            title: '2. Editar una categoría existente',
            desc: 'En la lista inferior, haz clic en el botón de edición de la categoría que deseas corregir, haz los cambios en el modal y pulsa "Guardar Cambios".',
          },
          {
            title: '3. Eliminar con seguridad',
            desc: 'Si eliminas una categoría con artículos, se abrirá el Asistente de Reasignación para que elijas la categoría de destino de los productos.',
            tip: 'Ningún producto ni existencia de inventario se pierde al eliminar una categoría.',
          },
        ],
      },
    },
    {
      id: 'PRODUCTOS_CATALOGO',
      title: '6. Catálogo General de Artículos y Servicios',
      subtitle: 'Creación y mantenimiento maestro de productos, precios en USD/BCV y stock mínimo',
      badge: 'Artículos y Servicios',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Box,
      keywords: ['articulos', 'productos', 'servicios', 'catalogo', 'precios', 'usd', 'bcv', 'stock minimo', 'crear producto'],
      content: {
        targetAdminTab: 'PRODUCTS',
        actionButtonText: 'Ir a Artículos y Servicios',
        summary:
          'Permite la creación de nuevos productos para la panadería, fijación de precios en divisas (USD), cálculo de precio en Bolívares (VES), stock mínimo para disparar alertas automáticas de reposición y stock inicial por almacén.',
        keyFeatures: [
          {
            title: 'Alta de Nuevos Productos',
            desc: 'Asigne código único, descripción, categoría, unidad de medida (Kgs, Unidades, Litros, Sacos, Cajas), stock mínimo y precio.',
          },
          {
            title: 'Control de Stock Mínimo de Alerta',
            desc: 'Define el umbral a partir del cual el sistema marcará el producto en color rojo o ámbar con alerta de stock bajo.',
          },
          {
            title: 'Doble Moneda (USD / Bs)',
            desc: 'Permite registrar precios de referencia en dólares para el cálculo automático del valor monetario total del inventario.',
          },
          {
            title: 'Filtro y Búsqueda Avanzada',
            desc: 'Localiza productos al instante por código, nombre o categoría para editar precios o descripciones.',
          },
        ],
        steps: [
          {
            title: '1. Abrir la pestaña de Artículos',
            desc: 'Haz clic en "Artículos y Servicios" en el selector superior del Panel Admin.',
          },
          {
            title: '2. Completar los datos requeridos',
            desc: 'Rellena el código, nombre oficial del producto, categoría correspondiente, unidad de medida y stock mínimo sugerido.',
          },
          {
            title: '3. Guardar el nuevo producto',
            desc: 'Pulsa "Crear Producto". Estará disponible de inmediato en todos los almacenes y en los formularios de entradas, traslados y ventas.',
          },
        ],
      },
    },
    {
      id: 'HISTORIAL_PURGA',
      title: '7. Mantenimiento y Limpieza de Historiales',
      subtitle: 'Auditoría profunda, exportación oficial, corrección de movimientos y depuración masiva',
      badge: 'Mantenimiento y Auditoría',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: Trash2,
      keywords: ['limpiar historiales', 'purga', 'eliminar movimiento', 'pdf comprobante', 'excel', 'auditoria', 'depuracion'],
      content: {
        targetAdminTab: 'HISTORY_PURGE',
        actionButtonText: 'Ir a Limpiar Historiales',
        summary:
          'Herramienta de alto nivel para supervisar todas las transacciones históricas registradas en el sistema. Permite auditar qué usuario realizó cada movimiento, generar el comprobante oficial en PDF, exportar a Excel y eliminar comprobantes erróneos con ajuste de stock.',
        keyFeatures: [
          {
            title: 'Búsqueda Multicriterio',
            desc: 'Busca por número de comprobante, nombre de usuario responsable, almacén o producto involucrado.',
          },
          {
            title: 'Reimpresión de Comprobante PDF',
            desc: 'Genera en cualquier momento la nota oficial en PDF con membrete de Panadería Española C.A.',
          },
          {
            title: 'Exportación a Excel (.xlsx)',
            desc: 'Descarga el detalle completo de los movimientos filtrados para conciliación contable.',
          },
          {
            title: 'Depuración Masiva Controlada',
            desc: 'Permite vaciar transacciones antiguas por tipo (Entrada, Traslado, Descargo o Venta) con doble clave de seguridad.',
          },
        ],
        steps: [
          {
            title: '1. Auditar un movimiento específico',
            desc: 'Escribe el número de comprobante o el usuario en la barra de búsqueda de historiales para inspeccionar fecha, hora y productos.',
          },
          {
            title: '2. Corregir o anular un comprobante erróneo',
            desc: 'Haz clic en el botón de basura roja del movimiento. El sistema te pedirá confirmación antes de revertir o anular la operación.',
            tip: 'Solo el administrador tiene autorización para eliminar movimientos del historial.',
          },
          {
            title: '3. Depuración masiva periódica',
            desc: 'Si la base de datos acumula miles de movimientos de prueba o períodos antiguos cerrados, usa el botón "Depurar Historial" seleccionando el tipo de movimiento a purgar.',
          },
        ],
        securityWarning:
          'La depuración masiva es irreversible. Antes de realizar un vaciado masivo, exporte los movimientos a Excel o descargue los reportes en PDF.',
      },
    },
    {
      id: 'NUBE_SUPABASE',
      title: '8. Sincronización en la Nube y Base de Datos (Supabase SQL)',
      subtitle: 'Monitoreo de conectividad, respaldo bidireccional y resolución de inconsistencias',
      badge: 'Base de Datos',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: Database,
      keywords: ['supabase', 'sql', 'nube', 'sincronizar', 'conexion', 'respaldo', 'postgresql'],
      content: {
        summary:
          'PanStock cuenta con una arquitectura híbrida: opera con alta velocidad en memoria local y sincroniza de forma transparente con PostgreSQL en la nube de Supabase.',
        keyFeatures: [
          {
            title: 'Indicador de Estado en el Encabezado',
            desc: 'Muestra "Supabase Conectado" (verde) o "Supabase SQL" (ámbar) con botón de diagnóstico directo.',
          },
          {
            title: 'Sincronización Automática',
            desc: 'Cada entrada, traslado, venta o actualización de usuario se envía automáticamente a la nube cuando hay conexión.',
          },
          {
            title: 'Botón Manual "Sincronizar"',
            desc: 'Ubicado en la barra superior oscura junto al indicador ONLINE para forzar una sincronización instantánea si regresas de una pérdida de red.',
          },
          {
            title: 'Operación Offline Garantizada',
            desc: 'Si la panadería se queda temporalmente sin internet, el sistema continúa funcionando localmente sin interrupción.',
          },
        ],
        steps: [
          {
            title: 'Verificar la conexión',
            desc: 'Haz clic en el botón con icono de base de datos en la barra superior para abrir el modal de estado de Supabase.',
          },
          {
            title: 'Forzar actualización de datos',
            desc: 'Pulsa el botón "Sincronizar" en la barra superior para descargar las últimas modificaciones hechas desde otros dispositivos.',
          },
        ],
        faq: [
          {
            q: '¿Qué ocurre si dos administradores modifican un producto al mismo tiempo?',
            a: 'El sistema aplica resolución por marca de tiempo (timestamp) más reciente, garantizando consistencia en la base de datos.',
          },
        ],
      },
    },
    {
      id: 'PREGUNTAS_FRECUENTES',
      title: '9. Preguntas Frecuentes y Solución de Problemas (FAQ)',
      subtitle: 'Respuestas rápidas a las situaciones administrativas más comunes en PanStock',
      badge: 'Soporte y FAQ',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: HelpCircle,
      keywords: ['preguntas frecuentes', 'faq', 'ayuda', 'problemas', 'solucion', 'errores', 'bloqueo'],
      content: {
        summary:
          'Guía de respuesta rápida ante dudas o eventualidades en la administración cotidiana del sistema.',
        faq: [
          {
            q: '¿Por qué el usuario "admin" no puede ser eliminado ni suspendido?',
            a: 'Por seguridad de la empresa. El sistema garantiza que siempre exista al menos una cuenta de superadministrador con acceso para evitar que el negocio quede bloqueado.',
          },
          {
            q: '¿Cómo puedo restringir a un empleado para que solo pueda ver vencimientos pero no modificarlos?',
            a: 'En la gestión de permisos del usuario, activa "FECHA VENCIMIENTO (VER)" en SÍ, pero desactiva "EDICIÓN VENCIMIENTO (LOTES)" en NO. El usuario podrá consultar el calendario y semáforo de alertas pero no podrá alterar las fechas de los lotes.',
          },
          {
            q: 'Un usuario me dice que al entrar no le aparece ningún almacén, ¿qué hago?',
            a: 'Edita su perfil en la sección de usuarios y asegúrate de marcar al menos una casilla en "Almacenes Autorizados". Si no tiene ningún almacén asignado, la pantalla le indicará que no tiene permisos asignados.',
          },
          {
            q: '¿Cómo exporto o imprimo el inventario completo de un almacén?',
            a: 'Ve a la pestaña "Almacenes", selecciona el depósito deseado y pulsa el botón rojo "Descargar PDF" ubicado en la cabecera de la tabla.',
          },
          {
            q: '¿Cómo me comunico con los demás operadores en línea?',
            a: 'Utiliza el botón flotante rojo "Chat PanStock" en la esquina inferior derecha. Todos los usuarios conectados reciben los avisos y mensajes al instante.',
          },
        ],
      },
    },
  ];

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.includes(q)) ||
        s.content.summary.toLowerCase().includes(q) ||
        s.content.steps?.some((st) => st.title.toLowerCase().includes(q) || st.desc.toLowerCase().includes(q)) ||
        s.content.keyFeatures?.some((kf) => kf.title.toLowerCase().includes(q) || kf.desc.toLowerCase().includes(q)) ||
        s.content.faq?.some((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    );
  }, [searchQuery, sections]);

  const currentSection =
    sections.find((s) => s.id === selectedSectionId) || filteredSections[0] || sections[0];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Administrative Header Banner */}
      <div className="bg-gradient-to-r from-[#140e0b] via-[#241710] to-[#1c110b] rounded-3xl p-5 sm:p-8 text-white shadow-2xl border border-amber-900/40 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Documentación Oficial • Modo Administrador</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Manual del Administrador</span>
              <span className="text-[11px] bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Exclusivo
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Guía técnica y operativa para la gestión de usuarios, asignación de los 7 permisos del sistema, restricción por almacén, catálogo de productos, limpieza de historiales y sincronización de base de datos.
            </p>
          </div>

          {/* Quick Admin Security Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-amber-400/20 rounded-2xl p-4 shrink-0 text-xs space-y-2 max-w-xs">
            <div className="flex items-center gap-2 text-amber-300 font-black">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Privacidad & Seguridad</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Este manual contiene directrices de seguridad y control de accesos reservadas exclusivamente para el rol de <strong>SuperAdministrador</strong>.
            </p>
          </div>
        </div>

        {/* Interactive Search Bar inside Admin Manual */}
        <div className="mt-5 sm:mt-6 relative z-10">
          <div className="relative max-w-2xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el manual admin (ej: crear usuario, suspender, permisos, purga de historial, supabase...)"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white/95 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-bold shadow-lg border-2 border-transparent focus:border-red-500 focus:bg-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Topics Navigation */}
        <div ref={topicsListRef} className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>Índice Administrativo ({filteredSections.length})</span>
              </h2>
              {searchQuery && (
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md">
                  Filtrado
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = sec.id === currentSection.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleSelectSection(sec.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-50 to-amber-50 border-red-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-transparent text-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs font-black truncate ${
                            isSelected ? 'text-red-950' : 'text-slate-800'
                          }`}
                        >
                          {sec.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {sec.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="text-center py-8 px-4 text-slate-500 text-xs">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold">No se encontraron temas coincidentes.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-red-600 hover:underline font-bold text-xs"
                  >
                    Ver todos los temas del manual
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Topic Content */}
        <div ref={detailContainerRef} className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 space-y-6"
            >
              {/* Section Header */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${currentSection.badgeColor}`}
                  >
                    {currentSection.badge}
                  </span>

                  {currentSection.content.targetAdminTab && onNavigateToAdminTab && (
                    <button
                      onClick={() => onNavigateToAdminTab(currentSection.content.targetAdminTab!)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span>{currentSection.content.actionButtonText || 'Abrir Función en Admin'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentSection.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  {currentSection.subtitle}
                </p>
              </div>

              {/* Summary Callout */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {currentSection.content.summary}
              </div>

              {/* Security Warning if present */}
              {currentSection.content.securityWarning && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="block font-black text-amber-950 uppercase tracking-wide mb-0.5">
                      Aviso de Seguridad para Administradores
                    </strong>
                    <span>{currentSection.content.securityWarning}</span>
                  </div>
                </div>
              )}

              {/* Key Features Cards */}
              {currentSection.content.keyFeatures && currentSection.content.keyFeatures.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Funcionalidades y Capacidades Clave</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentSection.content.keyFeatures.map((kf, idx) => {
                      const KIcon = kf.icon || CheckCircle2;
                      return (
                        <div
                          key={idx}
                          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 hover:border-red-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
                            <KIcon className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{kf.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
                            {kf.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step by Step Guide */}
              {currentSection.content.steps && currentSection.content.steps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-red-500" />
                    <span>Procedimiento Paso a Paso</span>
                  </h3>
                  <div className="space-y-3">
                    {currentSection.content.steps.map((st, sidx) => (
                      <div
                        key={sidx}
                        className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-1.5"
                      >
                        <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] shrink-0 font-mono">
                            {sidx + 1}
                          </span>
                          <span>{st.title}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pl-7">
                          {st.desc}
                        </p>
                        {st.tip && (
                          <div className="ml-7 mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-900 font-bold">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{st.tip}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ Section */}
              {currentSection.content.faq && currentSection.content.faq.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span>Preguntas Frecuentes y Casos Prácticos</span>
                  </h3>
                  <div className="space-y-2.5">
                    {currentSection.content.faq.map((fq, fidx) => (
                      <div
                        key={fidx}
                        className="bg-blue-50/40 border border-blue-100 rounded-2xl p-3.5 space-y-1"
                      >
                        <p className="text-xs font-black text-blue-950 flex items-center gap-2">
                          <span className="text-blue-600 font-bold">P:</span>
                          <span>{fq.q}</span>
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed pl-5">
                          <strong className="text-emerald-700 font-extrabold mr-1">R:</strong>
                          {fq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Quick Return / Nav */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <button
                  onClick={handleScrollToTopics}
                  className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 lg:hidden"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Volver al índice de temas</span>
                </button>

                {currentSection.content.targetAdminTab && onNavigateToAdminTab && (
                  <button
                    onClick={() => onNavigateToAdminTab(currentSection.content.targetAdminTab!)}
                    className="ml-auto text-red-600 hover:text-red-700 font-black flex items-center gap-1 hover:underline"
                  >
                    <span>Abrir herramienta de {currentSection.badge}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
