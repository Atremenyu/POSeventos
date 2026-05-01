
import React, { useMemo, useState } from 'react';
import { Order, Table } from '../types';
import { Icons } from '../constants';
import { generateTicketPDF } from '../services/pdfGenerator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area 
} from 'recharts';

interface HistoryViewProps {
  orders: Order[];
  tables: Table[];
  restaurantName?: string;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#000000'];

const HistoryView: React.FC<HistoryViewProps> = ({ orders, tables, restaurantName }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const paymentMethods = useMemo(() => {
    const methods = new Set<string>();
    orders.forEach(o => methods.add(o.payment));
    return Array.from(methods);
  }, [orders]);

  const analyticsData = useMemo(() => {
    const validOrders = orders.filter(o => o.isPaid && o.status !== 'cancelled');
    
    // Daily Sales
    const dailyMap = new Map<string, number>();
    validOrders.forEach(o => {
      const day = new Date(o.date).toLocaleDateString();
      dailyMap.set(day, (dailyMap.get(day) || 0) + o.total);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Top Products
    const productMap = new Map<string, number>();
    validOrders.forEach(o => {
      o.items.forEach(item => {
        productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);
      });
    });
    const products = Array.from(productMap.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8);

    // Hourly Sales
    const hourlyMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);
    validOrders.forEach(o => {
      const hour = new Date(o.date).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + o.total);
    });
    const hourly = Array.from(hourlyMap.entries()).map(([hour, total]) => ({
      hour: `${hour}:00`,
      total
    }));

    // Method Distribution
    const methodsMap = new Map<string, number>();
    validOrders.forEach(o => {
      methodsMap.set(o.payment, (methodsMap.get(o.payment) || 0) + 1);
    });
    const methods = Array.from(methodsMap.entries()).map(([name, value]) => ({ name, value }));

    const totalRevenue = validOrders.reduce((acc, o) => acc + o.total, 0);
    const orderCount = validOrders.length;
    const deliveredCount = validOrders.filter(o => o.status === 'delivered').length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Occupancy
    const occupiedTables = tables.filter(t => t.isOccupied).length;
    const occupancyRate = tables.length > 0 ? (occupiedTables / tables.length) * 100 : 0;

    return { 
      daily, products, hourly, methods, totalRevenue, orderCount, deliveredCount, 
      avgOrderValue, occupancyRate, occupiedTables 
    };
  }, [orders, tables]);

  const displayOrders = useMemo(() => {
    return orders
      .filter(o => paymentFilter === 'all' || o.payment === paymentFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, paymentFilter]);

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAnalyticsDaily = () => {
    const headers = ['Fecha', 'Total Ventas'];
    const rows = analyticsData.daily.map(d => [`"${d.date}"`, d.total].join(','));
    downloadCSV(`ventas_diarias_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
  };

  const exportAnalyticsProducts = () => {
    const headers = ['Producto', 'Cantidad Vendida'];
    const rows = analyticsData.products.map(p => [`"${p.name}"`, p.sales].join(','));
    downloadCSV(`top_productos_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
  };

  const exportAnalyticsHourly = () => {
    const headers = ['Horario', 'Total Ventas'];
    const rows = analyticsData.hourly.map(h => [`"${h.hour}"`, h.total].join(','));
    downloadCSV(`ventas_por_horario_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
  };

  const exportAnalyticsMethods = () => {
    const headers = ['Metodo de Pago', 'Cantidad de Usos'];
    const rows = analyticsData.methods.map(m => [`"${m.name}"`, m.value].join(','));
    downloadCSV(`metodos_pago_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
  };

  const exportToCSV = () => {
    const exportData = orders.filter(o => o.isPaid && o.status !== 'cancelled');
    if (exportData.length === 0) return;

    // CSV Headers
    const headers = ['ID', 'Fecha', 'Cliente', 'Tipo', 'Subtipo/Mesa', 'Metodo Pago', 'Total', 'Detalles'];
    
    // CSV Rows
    const rows = exportData.map(order => {
      const itemsDetail = order.items
        .map(item => `${item.quantity}x ${item.name}${item.note ? ` (${item.note})` : ''}`)
        .join('; ');
      
      return [
        `"${order.id}"`,
        `"${new Date(order.date).toLocaleString()}"`,
        `"${order.client.replace(/"/g, '""')}"`,
        `"${order.type === 'dine-in' ? 'MESA' : 'LLEVAR'}"`,
        `"${order.type === 'dine-in' ? order.table : (order.takeawayType || 'Mostrador')}"`,
        `"${order.payment}"`,
        order.total,
        `"${itemsDetail.replace(/"/g, '""')}"`
      ].join(',');
    });

    downloadCSV(`ventas_detalladas_${new Date().toISOString().split('T')[0]}.csv`, [headers.join(','), ...rows].join('\n'));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-black tracking-tighter uppercase leading-none">
            Administración
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 flex items-center">
            <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
            Métricas y Registros
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'list' ? 'bg-black text-white shadow-xl scale-105' : 'text-slate-500 hover:text-black'
            }`}
          >
            Operaciones
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'analytics' ? 'bg-black text-white shadow-xl scale-105' : 'text-slate-500 hover:text-black'
            }`}
          >
            Estadísticas
          </button>
        </div>
      </div>

      {/* Primary KPIs (Always visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox 
          label="Ventas Totales" 
          value={`$${analyticsData.totalRevenue.toLocaleString()}`} 
          icon={<Icons.Chart />} 
          color="black"
        />
        <KPIBox 
          label="Promedio Venta" 
          value={`$${Math.round(analyticsData.avgOrderValue).toLocaleString()}`} 
          icon={<Icons.DollarSign />} 
          color="red"
        />
        <KPIBox 
          label="Ordenes Totales" 
          value={analyticsData.orderCount.toString()} 
          icon={<Icons.Cart />} 
          color="slate"
        />
        <KPIBox 
          label="Ocupación Sala" 
          value={`${Math.round(analyticsData.occupancyRate)}%`} 
          subValue={`${analyticsData.occupiedTables}/${tables.length} Mesas`}
          icon={<Icons.Layout />} 
          color={analyticsData.occupancyRate > 80 ? "red" : "green"}
        />
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Charts Row 1: Daily Revenue */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-black text-black tracking-tighter uppercase">Ventas por Día</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flujo de caja histórico</p>
               </div>
               <div className="flex items-center space-x-3">
                 <button 
                   onClick={exportAnalyticsDaily}
                   className="p-2 text-slate-400 hover:text-black transition-colors"
                   title="Exportar Ventas Diarias"
                 >
                   <Icons.Download />
                 </button>
                 <Icons.History />
               </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.daily}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-black tracking-tighter uppercase">Top de Ventas</h3>
                <button 
                   onClick={exportAnalyticsProducts}
                   className="p-2 text-slate-400 hover:text-black transition-colors"
                   title="Exportar Top Productos"
                 >
                   <Icons.Download />
                 </button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.products} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', width: 100 }}
                      width={100}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', shadow: 'none', fontWeight: 900, fontSize: '10px' }}
                    />
                    <Bar dataKey="sales" radius={[0, 10, 10, 0]} barSize={20}>
                      {analyticsData.products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-black tracking-tighter uppercase">Horarios Pico</h3>
                <button 
                   onClick={exportAnalyticsHourly}
                   className="p-2 text-slate-400 hover:text-black transition-colors"
                   title="Exportar Horarios Pico"
                 >
                   <Icons.Download />
                 </button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.hourly}>
                    <XAxis 
                       dataKey="hour" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 900, fontSize: '10px' }}
                    />
                    <Bar dataKey="total" fill="#000" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-black tracking-tighter uppercase">Métodos de Pago</h3>
                <button 
                   onClick={exportAnalyticsMethods}
                   className="p-2 text-slate-400 hover:text-black transition-colors"
                   title="Exportar Métodos de Pago"
                 >
                   <Icons.Download />
                 </button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.methods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analyticsData.methods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 900, fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {analyticsData.methods.map((entry, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-[10px] font-black uppercase text-slate-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History List (Existing) */
        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-x-auto">
          <div className="p-4 sm:p-8 border-b border-slate-200 bg-slate-50 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4 min-w-[600px] md:min-w-0">
            <span className="flex items-center">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></div>
              Registro de Movimientos
            </span>
            
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`px-4 py-2 rounded-xl transition-all border-2 ${paymentFilter === 'all' ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
              >
                Todos
              </button>
              {paymentMethods.map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentFilter(method)}
                  className={`px-4 py-2 rounded-xl transition-all border-2 ${paymentFilter === method ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                >
                  {method}
                </button>
              ))}
              <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
              <button 
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 text-[9px] uppercase font-black"
              >
                <Icons.Download />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {displayOrders.map(order => {
              const isDineIn = order.type === 'dine-in';
              const isCancelled = order.status === 'cancelled';
              
              return (
                <div key={order.id} className={`transition-colors hover:bg-slate-50/80 ${isCancelled ? 'bg-slate-100 opacity-60 grayscale' : (order.isPaid ? '' : 'bg-amber-50/30')}`}>
                  <div 
                    className="p-6 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all ${isCancelled ? 'bg-slate-300 border-slate-300 text-slate-500' : (order.isPaid ? 'bg-black text-white border-black rotate-3 shadow-lg' : 'bg-white text-amber-600 border-amber-600 shadow-sm')}`}>
                        {isCancelled ? <Icons.Trash /> : (order.isPaid ? <Icons.CheckCircle /> : <Icons.ChefHat />)}
                      </div>
                      <div>
                        <p className={`font-black uppercase tracking-tighter text-lg leading-none ${isCancelled ? 'text-slate-500' : 'text-black'}`}>
                          {isDineIn ? `MESA: ${order.table}` : `${order.takeawayType?.toUpperCase() || 'LLEVAR'}`} 
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5 font-black uppercase tracking-widest text-[10px]">
                           <span className="text-slate-400">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                           <span className="text-slate-400">{order.payment}</span>
                           {order.client !== 'Mostrador' && (
                             <>
                               <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                               <span className="text-red-600">{order.client}</span>
                             </>
                           )}
                           {isCancelled && (
                             <>
                               <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                               <span className="text-slate-500">CANCELADA</span>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-8">
                      <div className="flex flex-col items-end">
                        <p className={`font-black text-2xl tracking-tighter leading-none mb-1.5 ${isCancelled ? 'text-slate-400 line-through' : 'text-black'}`}>
                          ${order.total.toLocaleString()}
                        </p>
                        <div className="flex space-x-1">
                          <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                            isCancelled 
                              ? 'bg-slate-400 text-white' 
                              : order.status === 'delivered' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-red-600 text-white animate-pulse'
                          }`}>
                            {isCancelled ? 'ANULADA' : order.status === 'delivered' ? 'RECIBIDO' : 'EN COCINA'}
                          </span>
                          {!order.isPaid && !isCancelled && (
                            <span className="text-[8px] font-black bg-amber-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                              PAGAR
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`transition-transform duration-500 text-slate-300 ${expandedId === order.id ? 'rotate-180 text-red-600' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {expandedId === order.id && (
                    <div className="px-4 sm:px-24 pb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-4 sm:p-8 space-y-4 shadow-inner">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col border-b border-slate-200 last:border-0 pb-3">
                            <div className="flex justify-between text-xs font-black uppercase tracking-tight">
                              <span className="text-slate-600 flex items-center">
                                <span className="bg-white border border-slate-200 w-6 h-6 flex items-center justify-center rounded-lg text-[10px] mr-3">{item.quantity}</span>
                                {item.name}
                              </span>
                              <span className="text-black">${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                            {item.note && (
                              <span className="text-[9px] italic font-bold text-red-600 mt-2 ml-9">
                               &gt; {item.note}
                              </span>
                            )}
                          </div>
                        ))}
                        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end space-x-4">
                           <button 
                            onClick={(e) => { e.stopPropagation(); window.print(); }}
                            className="text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-black hover:text-white hover:border-black transition-all"
                          >
                            <Icons.Printer /> <span>Imprimir</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); generateTicketPDF(order, restaurantName); }}
                            className="text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95"
                          >
                            <Icons.FileText /> <span>Bajar Ticket</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface KPIBoxProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: 'black' | 'red' | 'slate' | 'green';
}

const KPIBox: React.FC<KPIBoxProps> = ({ label, value, subValue, icon, color }) => {
  const colorStyles = {
    black: 'bg-black text-white border-black',
    red: 'bg-white text-black border-slate-200',
    slate: 'bg-slate-50 text-black border-slate-200',
    green: 'bg-white text-black border-slate-200'
  };

  return (
    <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-transform hover:scale-105 duration-300 ${colorStyles[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</span>
        <div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${color === 'black' ? 'bg-slate-800' : 'bg-slate-100 text-red-600'}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <p className="text-3xl font-black tracking-tighter leading-none">{value}</p>
        {subValue && <span className="text-[10px] font-black opacity-40 uppercase ml-2">{subValue}</span>}
      </div>
    </div>
  );
};

export default HistoryView;
