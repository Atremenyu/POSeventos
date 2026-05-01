
import React, { useMemo, useState } from 'react';
import { Order, PaymentMethod, Table } from '../types';
import { Icons } from '../constants';
import { generateTicketPDF } from '../services/pdfGenerator';

interface DispatchViewProps {
  orders: Order[];
  tables: Table[];
  onDeliver: (id: string) => void;
  onPay: (id: string, payment: PaymentMethod) => void;
  onCancel: (id: string) => void;
  onTransfer: (id: string, newTable: string) => void;
  onStartPreparing: (id: string, mins: number) => void;
  onMarkReady: (id: string) => void;
  onUpdateTime: (id: string, mins: number) => void;
  onUpdateItemStatus: (orderId: string, itemIdx: number, status: any) => void;
  restaurantName?: string;
}

const DispatchView: React.FC<DispatchViewProps> = ({ 
  orders, tables, onDeliver, onPay, onCancel, onTransfer, onStartPreparing, onMarkReady, onUpdateTime, onUpdateItemStatus, restaurantName 
}) => {
  const [selectedPayment, setSelectedPayment] = useState<Record<string, PaymentMethod>>({});
  const [transferingId, setTransferingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reactive timer update
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = useMemo(() => {
    return orders
      .filter(o => 
        (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
      )
      .sort((a, b) => {
        const priority: Record<string, number> = { 'ready': 0, 'preparing': 1, 'pending': 2 };
        const aStatus = a.status as string;
        const bStatus = b.status as string;
        
        const aPrio = priority[aStatus] ?? 99;
        const bPrio = priority[bStatus] ?? 99;
        
        if (aPrio !== bPrio) {
          return aPrio - bPrio;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [orders]);

  const getTimerData = (order: Order) => {
    if (!order.preparingAt || !order.estimatedMinutes) return null;
    const start = new Date(order.preparingAt).getTime();
    const now = currentTime.getTime();
    const elapsedSeconds = (now - start) / 1000;
    const totalSeconds = order.estimatedMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    
    // Color logic
    const percentageRemaining = (remainingSeconds / totalSeconds) * 100;
    let colorClass = 'text-green-600';
    let bgClass = 'bg-green-100';
    let dotClass = 'bg-green-500';
    
    if (percentageRemaining <= 0) {
      colorClass = 'text-white animate-pulse';
      bgClass = 'bg-red-600';
      dotClass = 'bg-white';
    } else if (percentageRemaining <= 25) {
      colorClass = 'text-red-600';
      bgClass = 'bg-red-50';
      dotClass = 'bg-red-500';
    } else if (percentageRemaining <= 50) {
      colorClass = 'text-amber-600';
      bgClass = 'bg-amber-100';
      dotClass = 'bg-amber-500';
    }

    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);

    return { 
      text: percentageRemaining <= 0 ? `ATRASADO ${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`,
      colorClass,
      bgClass,
      dotClass
    };
  };

  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="mb-4 opacity-5">
          <Icons.ChefHat />
        </div>
        <p className="text-sm font-black uppercase tracking-widest">Sin Órdenes en Cocina</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeOrders.map(order => {
          const isPending = order.status === 'pending';
          const isPreparing = order.status === 'preparing';
          const isReady = order.status === 'ready';
          const isDineIn = order.type === 'dine-in';
          const timerData = getTimerData(order);
          
          return (
            <div 
              key={order.id} 
              className={`bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative ${
                isPreparing 
                  ? 'border-amber-400 ring-4 ring-amber-50 scale-[1.02] z-10' 
                  : isPending 
                    ? 'border-slate-100 opacity-90' 
                    : isReady
                      ? 'border-green-500 scale-100'
                      : 'border-slate-100 opacity-80'
              }`}
            >
              <div className={`p-6 flex justify-between items-start ${
                isPreparing ? 'bg-amber-50/50' : isReady ? 'bg-green-50/50' : 'bg-white'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full shadow-sm ${
                      isPending 
                        ? 'bg-slate-200 text-slate-600' 
                        : isPreparing 
                          ? 'bg-amber-500 text-white animate-pulse' 
                          : isReady 
                            ? 'bg-green-600 text-white'
                            : 'bg-black text-white'
                    }`}>
                      {isPending ? 'EN COLA' : isPreparing ? 'PREPARANDO' : isReady ? 'LISTO' : 'DESPACHADO'}
                    </span>
                    {isPreparing && timerData && (
                       <div className="flex items-center space-x-2">
                         <div className={`flex items-center px-3 py-1 rounded-full shadow-sm transition-colors ${timerData.bgClass} ${timerData.colorClass}`}>
                           <div className={`w-1.5 h-1.5 rounded-full mr-2 ${timerData.dotClass} ${timerData.colorClass === 'text-white' ? 'animate-ping' : ''}`}></div>
                           <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                             {timerData.text}
                           </span>
                         </div>
                         <button 
                           onClick={() => {
                             const extra = prompt('Ajustar minutos (ej: -5 para restar, 5 para sumar):', '5');
                             if (extra) {
                               const current = order.estimatedMinutes || 0;
                               onUpdateTime(order.id, current + parseInt(extra));
                             }
                           }}
                           className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-black hover:text-white transition-all shadow-sm"
                           title="Ajustar Tiempo"
                         >
                           <Icons.History />
                         </button>
                       </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-black tracking-tighter uppercase leading-none pt-2">
                    {isDineIn ? `Mesa ${order.table}` : `${order.takeawayType?.toUpperCase() || 'MOSTRADOR'}`}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {order.client} • {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                <div className="flex flex-col space-y-2">
                   <button 
                    onClick={() => generateTicketPDF(order, restaurantName)}
                    className="p-2 bg-white text-slate-400 border border-slate-100 rounded-xl hover:text-red-600 hover:border-red-600 transition shadow-sm"
                  >
                    <Icons.FileText />
                  </button>
                  <button 
                    onClick={() => onCancel(order.id)}
                    className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition"
                  >
                    Anular
                  </button>
                </div>
              </div>

              <div className="p-6 flex-grow space-y-4">
                {order.items.map((item, idx) => {
                  const itemIsPending = !item.status || item.status === 'pending' || item.status === 'preparing';
                  const itemIsReady = item.status === 'ready';
                  const itemIsDelivered = item.status === 'delivered';

                  return (
                    <div 
                      key={idx} 
                      onClick={() => onUpdateItemStatus(order.id, idx, itemIsDelivered ? 'ready' : 'delivered')}
                      className={`flex items-start space-x-4 transition-all cursor-pointer p-2 -mx-2 rounded-2xl hover:bg-slate-50 group/item ${itemIsDelivered ? 'opacity-40 grayscale-[0.5]' : ''}`}
                    >
                      <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center font-black rounded-xl text-sm transition-colors group-hover/item:shadow-md ${
                        itemIsDelivered ? 'bg-slate-200 text-slate-400' : (isPreparing ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500')
                      }`}>
                        {itemIsDelivered ? <Icons.Check /> : item.quantity}
                      </span>
                      <div className="flex-grow pt-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`font-black uppercase text-sm tracking-tight block ${
                            itemIsDelivered ? 'text-slate-400 line-through' : (isPreparing ? 'text-black' : 'text-slate-600')
                          }`}>
                            {item.name}
                          </span>
                          {itemIsDelivered && (
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Entregado</span>
                          )}
                        </div>
                        {item.note && (
                          <div className={`mt-2 p-3 rounded-2xl border-l-4 ${
                            itemIsDelivered ? 'bg-slate-50 border-slate-200' : (isPreparing ? 'text-amber-800 bg-amber-50 border-amber-500' : 'text-slate-400 bg-slate-50 border-slate-200')
                          }`}>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Instrucciones:</p>
                            <p className="text-[10px] italic font-bold mt-1">{item.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 pt-0 space-y-4">
                {isPending && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Seleccionar Tiempo de Prep.</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 15, 20].map(mins => (
                        <button 
                          key={mins}
                          onClick={() => onStartPreparing(order.id, mins)}
                          className="py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          {mins}'
                        </button>
                      ))}
                      <button 
                        onClick={() => {
                          const custom = prompt('Minutos personalizados:', '30');
                          if (custom) onStartPreparing(order.id, parseInt(custom));
                        }}
                        className="py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all"
                      >
                         +
                      </button>
                    </div>
                    <button 
                      onClick={() => onStartPreparing(order.id, 15)}
                      className="w-full bg-black text-white py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition active:scale-95 space-x-2 flex items-center justify-center border-b-4 border-slate-700"
                    >
                      <Icons.ChefHat />
                      <span>Comenzar Orden</span>
                    </button>
                  </div>
                )}

                {isPreparing && (
                  <button 
                    onClick={() => onMarkReady(order.id)}
                    className="w-full bg-amber-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-amber-700 animate-pulse"
                  >
                    <Icons.CheckCircle />
                    <span>Marcar como LISTO</span>
                  </button>
                )}

                {isReady && (
                  <button 
                    onClick={() => onDeliver(order.id)}
                    className="w-full bg-green-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-green-800"
                  >
                    <Icons.MapPin />
                    <span>Entregar Pedido</span>
                  </button>
                )}

                {!isPending && !isPreparing && !isReady && !isDineIn && !order.isPaid && (
                   <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total:</span>
                        <span className="text-xl font-black text-black tracking-tighter">${order.total.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                         {(['Efectivo', 'Tarjeta', 'Transferencia'] as PaymentMethod[]).map(met => (
                           <button 
                            key={met}
                            onClick={() => setSelectedPayment(prev => ({ ...prev, [order.id]: met }))}
                            className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                              selectedPayment[order.id] === met 
                              ? 'border-red-600 bg-red-600 text-white shadow-md' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                            }`}
                           >
                             {met}
                           </button>
                         ))}
                      </div>
                      <button 
                        onClick={() => selectedPayment[order.id] && onPay(order.id, selectedPayment[order.id])}
                        disabled={!selectedPayment[order.id]}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center space-x-3 shadow-2xl transition-all active:scale-95 border-b-4 ${
                          selectedPayment[order.id] 
                          ? 'bg-black text-white hover:bg-slate-800 border-slate-900' 
                          : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Icons.CreditCard />
                        <span>Cerrar Cuenta</span>
                      </button>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DispatchView;
