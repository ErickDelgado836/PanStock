import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Search,
  LayoutGrid,
  Building2,
  PackageSearch,
  Clock,
  ClipboardList,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ChevronRight,
  ArrowUp,
  Layers,
  Calendar,
  Filter,
  RefreshCw,
  Hash,
  ShoppingBag,
} from 'lucide-react';

interface UserManualProps {
  onNavigateToTab?: (tab: string) => void;
  onOpenEntradas?: () => void;
  onOpenTraslados?: () => void;
  onOpenDescargos?: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  content: {
    summary: string;
    steps?: { title: string; desc: string; tip?: string }[];
    keyFeatures?: { title: string; desc: string; icon?: React.ComponentType<{ className?: string }> }[];
    pdfInfo?: string;
    faq?: { q: string; a: string }[];
  };
}

export const UserManual: React.FC<UserManualProps> = ({
  onNavigateToTab,
  onOpenEntradas,
  onOpenTraslados,
  onOpenDescargos,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('VENTAS');
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

  const sections: ManualSection[] = [
    {
      id: 'INICIO',
      title: 'Pantalla de Inicio (Dashboard)',
      subtitle: 'Visión general de inventario, stock consolidado y métricas en tiempo real',
      badge: 'Panel Principal',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: LayoutGrid,
      keywords: ['inicio', 'dashboard', 'metricas', 'resumen', 'stock', 'categorias', 'sincronizar'],
      content: {
        summary:
          'La pantalla de Inicio es el centro de mando del sistema PanStock. Permite consultar al instante el valor total de inventario, unidades disponibles por categoría y acceder directamente a los movimientos.',
        keyFeatures: [
          {
            title: 'Tarjetas de Métricas',
            desc: 'Muestran el total de productos en catálogo, unidades globales disponibles, productos con stock bajo y alertas de vencimiento.',
          },
          {
            title: 'Accesos Rápidos de Operación',
            desc: 'Botones directos para Registrar Entrada (+), Trasladar Stock (⇄) o Descargar Stock (↑) sin salir de la vista.',
          },
          {
            title: 'Catálogo Consolidado',
            desc: 'Visualiza la lista de todos los productos y su desglose de existencia por cada almacén activo.',
          },
          {
            title: 'Botón de Sincronización Nube',
            desc: 'Ubicado en la barra superior para actualizar y respaldar los datos en tiempo real.',
          },
        ],
        steps: [
          {
            title: '1. Consultar existencias rápidas',
            desc: 'Revisa las tarjetas superiores para conocer el estado general del inventario.',
          },
          {
            title: '2. Usar los accesos rápidos',
            desc: 'Haz clic en cualquier botón de operación en la barra superior o en el panel de inicio.',
          },
          {
            title: '3. Filtrar por categoría',
            desc: 'Selecciona una categoría para ver los productos clasificados con sus cantidades exactas.',
          },
        ],
      },
    },
    {
      id: 'ALMACENES',
      title: 'Gestión y Vista de Almacenes',
      subtitle: 'Inventario detallado por depósito, filtros avanzados y auditoría rápida',
      badge: 'Almacenes',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Building2,
      keywords: ['almacen', 'almacenes', 'deposito', 'lotes', 'stock', 'auditoria fisica', 'conteo', 'pdf'],
      content: {
        summary:
          'En esta sección puedes navegar entre los diferentes depósitos de la empresa (Distribución Interna, Despacho, Ventas al Mayor, Materia Prima, etc.) y gestionar el inventario específico de cada uno.',
        keyFeatures: [
          {
            title: 'Selector de Almacén',
            desc: 'Usa las pestañas superiores o el menú desplegable para cambiar de almacén rápidamente.',
          },
          {
            title: 'Filtros Inteligentes',
            desc: 'Filtra por Categoría / Subgrupo, Estado de Stock (Todos, Óptimo, Stock Bajo, Agotado) y Estado de Auditoría Física.',
          },
          {
            title: 'Gestión de Lotes y Fechas',
            desc: 'Haz clic en el botón de Lotes de cualquier producto para ver o actualizar sus números de lote y fechas de vencimiento.',
          },
          {
            title: 'Conteo Físico Rápido (Auditoría)',
            desc: 'Registra la existencia real contada en físico para compararla contra el sistema al instante.',
          },
        ],
        steps: [
          {
            title: '1. Seleccionar el almacén',
            desc: 'Haz clic en la pestaña del almacén que deseas consultar (ej. 01 DESPACHO o 002 VENTAS AL MAYOR).',
          },
          {
            title: '2. Buscar o filtrar productos',
            desc: 'Escribe el nombre o código en la barra de búsqueda, o usa los selectores de categoría y estado de stock.',
          },
          {
            title: '3. Descargar el reporte del almacén en PDF',
            desc: 'Haz clic en el botón rojo "Descargar PDF" ubicado en la esquina superior derecha de la tabla para obtener la lista oficial formateada con membrete, RIF y totales.',
            tip: 'El PDF incluye membrete institucional de Panadería Española C.A, fecha de emisión, RIF y firmas.',
          },
        ],
        pdfInfo: 'El reporte en PDF de Almacén genera un documento imprimible con el inventario completo, unidades, códigos y totales valorizados.',
      },
    },
    {
      id: 'VENTAS',
      title: 'Módulo de Ventas y Despacho',
      subtitle: 'Procesamiento de salidas por venta, selección por lotes y comprobante PDF',
      badge: 'Ventas',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: PackageSearch,
      keywords: ['venta', 'ventas', 'factura', 'despacho', 'cliente', 'mas vendidos', 'ranking', 'comprobante', 'pdf'],
      content: {
        summary:
          'El módulo de Ventas permite registrar las salidas comerciales desde los almacenes autorizados (01 DESPACHO o 002 VENTAS AL MAYOR), restando automáticamente las existencias del inventario y generando el comprobante oficial.',
        steps: [
          {
            title: 'Paso 1: Seleccionar el almacén de venta',
            desc: 'Elige entre "01 DESPACHO" (ventas directas/mostrador) o "002 VENTAS AL MAYOR" en el selector superior.',
          },
          {
            title: 'Paso 2: Buscar y agregar productos al carrito',
            desc: 'Utiliza el buscador o haz clic en "+ Agregar" en las tarjetas de productos. Puedes ajustar las cantidades deseadas.',
            tip: 'El sistema valida automáticamente que no vendas más de la existencia disponible en el almacén seleccionado.',
          },
          {
            title: 'Paso 3: Completar los datos de la venta',
            desc: 'Ingresa el número de Factura / Doc. Referencia, el Nombre del Cliente / Destino y cualquier observación o nota de venta.',
          },
          {
            title: 'Paso 4: Ejecutar la venta y restar inventario',
            desc: 'Haz clic en el botón morado "Ejecutar Venta y Restar Inventario". El sistema actualizará el stock inmediatamente.',
          },
          {
            title: 'Paso 5: Descargar / Imprimir el Comprobante de Venta',
            desc: 'Al confirmar la venta, se abrirá la ventana con el Comprobante Oficial en PDF con membrete de Panadería Española C.A listo para descargar o imprimir.',
          },
        ],
        keyFeatures: [
          {
            title: 'Ranking de Productos Más Vendidos',
            desc: 'Sección inferior que muestra en tiempo real los artículos con mayor rotación en el almacén seleccionado, con filtros por Hoy, Este Mes e Histórico.',
          },
          {
            title: 'Control por Lote y Vencimiento',
            desc: 'Descuenta automáticamente los lotes más próximos a vencer garantizando frescura y rotación adecuada.',
          },
        ],
        pdfInfo: 'Cada venta genera una Nota de Venta oficial en PDF con número de documento, cliente, detalle de productos, lotes y firmas de entrega.',
      },
    },
    {
      id: 'NOTAS_HISTORIAL',
      title: 'Historial de Notas y Movimientos',
      subtitle: 'Consulta de todas las operaciones realizadas, filtros de fechas y reimpresión de PDF',
      badge: 'Historial',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: ClipboardList,
      keywords: ['historial', 'notas', 'movimientos', 'entradas', 'traslados', 'descargos', 'reimprimir', 'pdf', 'buscar'],
      content: {
        summary:
          'En la pestaña "Notas (Auditoría)" $\\rightarrow$ "Notas de Movimientos" se almacena el registro cronológico inmutable de todas las Entradas, Traslados, Descargos y Ventas procesadas en el sistema.',
        steps: [
          {
            title: '1. Acceder al módulo',
            desc: 'Haz clic en "Notas (Auditoría)" en el menú de navegación superior y mantente en la primera sub-pestaña: "Notas de Movimientos".',
          },
          {
            title: '2. Usar los filtros de búsqueda',
            desc: 'Puedes filtrar por Tipo de Movimiento (Entrada, Traslado, Descargo, Venta), Almacén Origen/Destino, Usuario responsable o por Rango de Fechas (Desde / Hasta).',
          },
          {
            title: '3. Ver el detalle de cualquier nota',
            desc: 'Haz clic en el botón "Ver Nota" de cualquier fila para inspeccionar los productos, cantidades, motivos y lotes asignados.',
          },
          {
            title: '4. Descargar o Reimprimir el PDF',
            desc: 'Dentro de la ventana de la nota, haz clic en "Descargar PDF Oficial" o "Imprimir" para obtener el documento legal con firmas.',
            tip: 'Puedes reimprimir cualquier comprobante de días, meses o años anteriores en cualquier momento.',
          },
        ],
        keyFeatures: [
          {
            title: 'Exportación Consolidada a Excel y PDF',
            desc: 'Descarga un reporte consolidado con todas las notas que coincidan con tus filtros aplicados.',
          },
          {
            title: 'Trazabilidad Total',
            desc: 'Cada nota registra fecha, hora exacta, usuario que la ejecutó y documento de referencia.',
          },
        ],
      },
    },
    {
      id: 'AUDITORIA_FISICA',
      title: 'Estado Real de Conteos (Auditoría Física)',
      subtitle: 'Comparativa de conteo físico vs sistema, faltantes, sobrantes y reporte PDF',
      badge: 'Auditoría',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: FileCheck,
      keywords: ['auditoria', 'conteo fisico', 'faltante', 'sobrante', 'cuadrado', 'diferencia', 'reporte consolidado', 'pdf'],
      content: {
        summary:
          'En la sub-pestaña "Estado Real de Conteos en Almacén" puedes auditar la mercancía física contra lo registrado en el sistema, detectando discrepancias y faltantes de forma preventiva.',
        keyFeatures: [
          {
            title: 'Diagnóstico en Tiempo Real',
            desc: 'Clasifica automáticamente cada producto en: Inventario Correcto (Cuadrado), Faltante Detectado o Sobrante Detectado.',
          },
          {
            title: 'Barras de Desplazamiento Sincronizadas',
            desc: 'Cuenta con barras de desplazamiento horizontal tanto en la parte superior como en la inferior, además de botones (< y >) para navegar cómodamente sin tener que bajar en tablas largas.',
          },
          {
            title: 'Descarga del Reporte Gerencial en PDF',
            desc: 'Genera un documento profesional con el resumen de productos auditados, porcentaje de exactitud y detalle por almacén.',
          },
        ],
        steps: [
          {
            title: '1. Ir a Notas (Auditoría) y elegir "Estado Real de Conteos"',
            desc: 'Selecciona la segunda pestaña para abrir la tabla comparativa de auditoría física.',
          },
          {
            title: '2. Filtrar por Almacén o Estado',
            desc: 'Selecciona un almacén específico o filtra solo los "Faltantes" para tomar acciones inmediatas.',
          },
          {
            title: '3. Descargar el Informe PDF',
            desc: 'Haz clic en el botón rojo "Descargar Reporte PDF" para generar el informe con membrete institucional.',
          },
        ],
      },
    },
    {
      id: 'VENCIMIENTOS',
      title: 'Control de Vencimientos y Lotes',
      subtitle: 'Semáforo de caducidad, días restantes, alertas y prevención de pérdidas',
      badge: 'Vencimientos',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      icon: Clock,
      keywords: ['vencimiento', 'vencimientos', 'lote', 'caducidad', 'alertas', 'semaforo', 'dias', 'merma'],
      content: {
        summary:
          'El módulo de Vencimientos clasifica todos los lotes de productos según su fecha de caducidad para prevenir mermas y garantizar que siempre se roten primero los productos más antiguos.',
        keyFeatures: [
          {
            title: 'Semáforo de Alertas por Color',
            desc: 'Rojo: Vencidos o críticos. Ámbar/Amarillo: Próximos a vencer (30-60 días). Verde: Estado óptimo.',
          },
          {
            title: 'Días Restantes en Tiempo Real',
            desc: 'Cálculo dinámico de días faltantes para la fecha de caducidad.',
          },
          {
            title: 'Edición y Actualización de Lotes',
            desc: 'Posibilidad de modificar o corregir la fecha de vencimiento y número de lote con un clic.',
          },
        ],
        steps: [
          {
            title: '1. Consultar el panel de vencimientos',
            desc: 'Haz clic en "Vencimientos" en el menú principal.',
          },
          {
            title: '2. Filtrar por urgencia',
            desc: 'Usa los filtros de "Estado" para ver únicamente los productos en riesgo de caducidad.',
          },
          {
            title: '3. Exportar el reporte de vencimiento en PDF',
            desc: 'Haz clic en "Exportar Reporte PDF" para entregar la lista al equipo de piso de venta o producción.',
          },
        ],
      },
    },
    {
      id: 'OPERACIONES_RAPIDAS',
      title: 'Operaciones Rápidas (Entradas, Traslados y Descargos)',
      subtitle: 'Cómo registrar ingresos de mercancía, movimientos entre almacenes y bajas',
      badge: 'Movimientos',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: ArrowRightLeft,
      keywords: ['entrada', 'ingreso', 'traslado', 'descargo', 'baja', 'merma', 'compra', 'proveedor'],
      content: {
        summary:
          'Desde la barra superior de accesos rápidos puedes ejecutar las 3 operaciones fundamentales de almacén en cualquier momento:',
        keyFeatures: [
          {
            title: 'Ingresar (Entrada)',
            desc: 'Para registrar compras a proveedores o recepción de mercancía nueva, asignando almacén, lote y vencimiento.',
            icon: Plus,
          },
          {
            title: 'Trasladar Stock',
            desc: 'Para mover unidades entre depósitos (ej. de Materia Prima a Despacho) con descuento y suma automática en ambos almacenes.',
            icon: ArrowRightLeft,
          },
          {
            title: 'Descargar Stock',
            desc: 'Para dar de baja productos por merma, rotura, consumo interno o vencimiento, indicando el motivo correspondiente.',
            icon: ArrowUpRight,
          },
        ],
        steps: [
          {
            title: '1. Abrir la ventana de operación',
            desc: 'Haz clic en el botón verde (+ Entrada), ámbar (⇄ Traslado) o rojo (↑ Descargo) en la barra superior.',
          },
          {
            title: '2. Seleccionar productos y cantidades',
            desc: 'Agrega los productos indicando la cantidad a mover y los lotes asociados.',
          },
          {
            title: '3. Confirmar la operación',
            desc: 'Haz clic en Guardar/Confirmar. El sistema actualizará los inventarios y generará la nota correspondiente.',
          },
        ],
      },
    },
    {
      id: 'CHAT_SOPORTE',
      title: 'Chat Interno PanStock en Línea',
      subtitle: 'Mensajería interna en vivo entre los colaboradores del sistema',
      badge: 'Comunicación',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: MessageSquare,
      keywords: ['chat', 'soporte', 'mensaje', 'colaboradores', 'ayuda', 'en linea'],
      content: {
        summary:
          'El botón flotante rojo en la esquina inferior derecha permite abrir el chat interno para comunicarse en tiempo real con otros usuarios y consultar dudas operativas.',
        steps: [
          {
            title: '1. Abrir el chat',
            desc: 'Haz clic en el botón rojo "Chat PanStock" ubicado en la esquina inferior derecha.',
          },
          {
            title: '2. Enviar mensajes',
            desc: 'Escribe tu consulta o aviso para que los demás usuarios conectados puedan responder.',
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
        s.content.keyFeatures?.some((kf) => kf.title.toLowerCase().includes(q) || kf.desc.toLowerCase().includes(q))
    );
  }, [searchQuery, sections]);

  const currentSection =
    sections.find((s) => s.id === selectedSectionId) || filteredSections[0] || sections[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guía y Manual de Usuario Oficial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Manual del Sistema PanStock
            </h1>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Aprende paso a paso cómo utilizar todas las opciones del programa: ventas, descarga de PDFs, auditoría física, control de lotes e historial de movimientos.
            </p>
          </div>

          {/* Quick Stats or Direct Tips */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0 text-xs space-y-2.5 max-w-xs">
            <div className="flex items-center gap-2 text-amber-300 font-extrabold">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Consejo Rápido</span>
            </div>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              Todos los reportes y notas disponen de botón de <strong>Descarga en PDF</strong> oficial con membrete y RIF institucional.
            </p>
          </div>
        </div>

        {/* Interactive Search Bar inside Manual */}
        <div className="mt-6 relative z-10">
          <div className="relative max-w-2xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="¿Qué deseas aprender? (Ej: cómo hacer una venta, descargar pdf, auditoría, traslados...)"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 placeholder-slate-400 text-sm font-semibold shadow-lg border-2 border-transparent focus:border-red-500 focus:outline-none transition-all"
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

      {/* Main Interactive Manual Layout: Sidebar Topics + Active Content Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Topics */}
        <div ref={topicsListRef} className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-2 mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Temas y Módulos ({filteredSections.length})
            </span>
            {searchQuery && (
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Filtrado
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {filteredSections.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold">No se encontraron temas con ese término.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-red-600 font-bold hover:underline cursor-pointer"
                >
                  Restablecer búsqueda
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = currentSection?.id === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleSelectSection(sec.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 group cursor-pointer active:scale-[0.99] touch-manipulation ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20 ring-2 ring-red-600/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-red-50 group-hover:text-red-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`font-black text-xs block truncate ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {sec.title}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white border-white/30'
                              : sec.badgeColor
                          }`}
                        >
                          {sec.badge}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] truncate leading-tight ${
                          isSelected ? 'text-red-100' : 'text-slate-500'
                        }`}
                      >
                        {sec.subtitle}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 mt-2 shrink-0 transition-transform ${
                        isSelected
                          ? 'text-white translate-x-0.5'
                          : 'text-slate-300 group-hover:text-slate-500'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>

          {/* Direct Action Help Box */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mt-6">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>¿Necesitas ayuda adicional?</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Puedes comunicarte con tus compañeros o con el administrador a través del <strong>Chat PanStock</strong> en la esquina inferior derecha.
            </p>
          </div>
        </div>

        {/* Right Content Details */}
        <div ref={detailContainerRef} className="lg:col-span-8 scroll-mt-6">
          <AnimatePresence mode="wait">
            {currentSection && (
              <motion.div
                key={currentSection.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
              >
                {/* Section Header */}
                <div className="border-b border-slate-100 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full border ${currentSection.badgeColor}`}
                    >
                      {currentSection.badge}
                    </span>

                    {/* Quick navigation to that tab if handler exists */}
                    {onNavigateToTab && (
                      <button
                        onClick={() => {
                          if (currentSection.id === 'INICIO') onNavigateToTab('INICIO');
                          else if (currentSection.id === 'ALMACENES') onNavigateToTab('ALMACENES');
                          else if (currentSection.id === 'VENTAS') onNavigateToTab('VENTAS');
                          else if (currentSection.id === 'VENCIMIENTOS') onNavigateToTab('VENCIMIENTO');
                          else if (currentSection.id === 'NOTAS_HISTORIAL' || currentSection.id === 'AUDITORIA_FISICA')
                            onNavigateToTab('NOTAS');
                        }}
                        className="text-xs font-extrabold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Ir a este módulo</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentSection.title}
                  </h2>
                  <p className="text-sm text-slate-500 font-semibold mt-1">
                    {currentSection.subtitle}
                  </p>
                </div>

                {/* Summary Intro */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-slate-700 text-xs sm:text-sm font-medium leading-relaxed">
                  {currentSection.content.summary}
                </div>

                {/* Key Features Cards */}
                {currentSection.content.keyFeatures && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Funcionalidades Principales</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentSection.content.keyFeatures.map((feat, idx) => {
                        const FeatIcon = feat.icon || CheckCircle2;
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all flex flex-col justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 shrink-0">
                                <FeatIcon className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-black text-xs text-slate-900">{feat.title}</h4>
                                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                                  {feat.desc}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step-by-Step Instructions */}
                {currentSection.content.steps && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Instrucciones Paso a Paso</span>
                    </h3>
                    <div className="space-y-3">
                      {currentSection.content.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5 relative overflow-hidden"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                              {st.title}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 font-medium pl-8 leading-relaxed">
                            {st.desc}
                          </p>
                          {st.tip && (
                            <div className="ml-8 mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-900 flex items-center gap-2">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{st.tip}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF & Export Info Banner */}
                {currentSection.content.pdfInfo && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl flex items-start gap-3.5 text-xs text-red-950 font-medium">
                    <div className="p-2 bg-red-600 text-white rounded-xl shrink-0 shadow-xs">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="font-black text-xs block text-red-900">
                        Exportación e Impresión en Formato PDF Oficial
                      </span>
                      <p className="text-xs text-red-800 leading-relaxed">
                        {currentSection.content.pdfInfo}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile Scroll Back Button */}
                <div className="lg:hidden pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Fin de la guía</span>
                  <button
                    type="button"
                    onClick={handleScrollToTopics}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation shadow-2xs"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                    <span>Volver a la lista de temas</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
