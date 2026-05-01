
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus, PaymentMethod } from '../types';
import { Icons } from '../constants';

interface ActiveOrdersSliderProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onDeliver: (id: string) => void;
  onUpdateItemStatus: (orderId: string, itemIdx: number, status: OrderStatus) => void;
  onPay: (id: string, payment: PaymentMethod) => void;
  onCancel: (id: string) => void;
}

const ActiveOrdersSlider: React.FC<ActiveOrdersSliderProps> = ({
  isOpen, onClose, orders, onDeliver, onUpdateItemStatus, onPay, onCancel
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[50] flex justify-end overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full md:w-[450px] bg-slate-50 shadow-2xl h-full flex flex-col"
          >
            <div className="p-6 bg-black text-white flex justify-between items-center border-b border-red-600/30">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Pedidos Activos</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estatus y Entregas</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition text-white">
                <Icons.X />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {orders.filter(o => !(o.isPaid && o.status === 'delivered') && o.status !== 'cancelled').sort((a,b) => {
                if (a.status === 'ready' && b.status !== 'ready') return -1;
                if (a.status !== 'ready' && b.status === 'ready') return 1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              }).map(order => {
                const isReady = order.status === 'ready';
                const isPreparing = order.status === 'preparing';
                
                return (
                  <motion.div 
                    key={order.id} 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col transition-all duration-500 ${
                      isReady 
                        ? 'border-green-500 ring-4 ring-green-100 shadow-green-100 scale-[1.02] z-10' 
                        : 'border-slate-100'
                    }`}
                  >
                    <div className={`p-4 flex justify-between items-start border-b ${isReady ? 'bg-green-50 border-green-100' : 'border-slate-50'}`}>
                      <div>
                        <div className="flex items-center space-x-2">
                           <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${
                             isReady ? 'bg-green-600 text-white animate-bounce shadow-md' : (isPreparing ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600')
                           }`}>
                             {isReady ? 'LISTO PARA ENTREGAR' : order.status.toUpperCase()}
                           </span>
                           <span className="text-[8px] font-black uppercase text-slate-400">{order.type === 'dine-in' ? `MESA ${order.table}` : 'LLEVAR'}</span>
                        </div>
                        <p className="font-black text-sm uppercase tracking-tight mt-1">{order.client}</p>
                      </div>
                      <div className="text-right">
                        {isReady && (
                          <div className="text-green-600 mb-1 flex justify-end">
                            <Icons.CheckCircle />
                          </div>
                        )}
                        <p className="font-black text-sm text-slate-900">${order.total.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-2">
                       {order.items.map((item, i) => {
                         const isDelivered = item.status === 'delivered';
                         return (
                           <div 
                             key={i} 
                             onClick={() => onUpdateItemStatus(order.id, i, isDelivered ? 'ready' : 'delivered')}
                             className={`flex justify-between items-center text-[10px] font-bold transition-all cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded-lg ${isDelivered ? 'text-slate-300' : 'text-slate-600'}`}
                           >
                             <div className="flex items-center">
                               <span className={`w-4 h-4 flex items-center justify-center rounded text-[8px] mr-2 transition-colors ${isDelivered ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                 {isDelivered ? <Icons.Check /> : item.quantity}
                               </span>
                               <span className={`uppercase ${isDelivered ? 'line-through' : ''}`}>{item.name}</span>
                             </div>
                             <span>${(item.price * item.quantity).toLocaleString()}</span>
                           </div>
                         );
                       })}
                    </div>

                    <div className="p-4 bg-slate-50 flex gap-2">
                       <button 
                        onClick={() => { onDeliver(order.id); }}
                        className={`flex-grow py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          isReady 
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg scale-105 active:scale-95' 
                          : 'bg-black text-white hover:bg-slate-800'
                        }`}
                       >
                         {isReady ? 'MARCAR ENTREGADO ✓' : 'MARCAR ENTREGADO'}
                       </button>
                       {order.type !== 'dine-in' && (
                         <button 
                          onClick={() => { 
                            const m = prompt('Método de pago (Efectivo, Tarjeta, Transferencia):', 'Efectivo'); 
                            if(m && ['Efectivo', 'Tarjeta', 'Transferencia'].includes(m)) onPay(order.id, m as any); 
                          }}
                          className="bg-white border-2 border-slate-200 px-4 py-3 rounded-xl hover:bg-slate-100 transition shadow-sm text-slate-400"
                         >
                            <Icons.CreditCard />
                         </button>
                       )}
                       <button 
                          onClick={() => { if(confirm('¿Anular pedido?')) onCancel(order.id); }}
                          className="text-slate-300 hover:text-red-500 transition px-2"
                        >
                          <Icons.Trash />
                        </button>
                    </div>
                  </motion.div>
                );
              })}
              {orders.filter(o => !(o.isPaid && o.status === 'delivered') && o.status !== 'cancelled').length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-40">
                  <Icons.History />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Sin pedidos activos</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ActiveOrdersSlider;
