
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Table, Order, PaymentMethod, CartItem } from '../types';
import { Icons } from '../constants';
import { generateTicketPDF } from '../services/pdfGenerator';
import ConfirmationModal from './ConfirmationModal';

interface TablesViewProps {
  tables: Table[];
  orders: Order[];
  onSelectTable: (tableId: string) => void;
  onPay: (id: string, payment: PaymentMethod) => void;
  onSplitOrder: (id: string, splitQuantities: Record<number, number>, payment: PaymentMethod) => void;
  onCancel: (id: string) => void;
  onDeliver: (id: string) => void;
  restaurantName: string;
}

const TablesView: React.FC<TablesViewProps> = ({ 
  tables, orders, onSelectTable, onPay, onSplitOrder, onCancel, onDeliver, restaurantName 
}) => {
  const [managingTableId, setManagingTableId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Split Bill State
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitQuantities, setSplitQuantities] = useState<Record<number, number>>({});
  const [cashReceived, setCashReceived] = useState<string>('');

  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTableStatus = (table: Table) => {
    const activeOrder = orders.find(o => o.table === table.name && o.type === 'dine-in' && !o.isPaid);
    if (activeOrder) return { status: 'occupied', order: activeOrder };
    return { status: 'free', order: null };
  };

  const handleTableClick = (table: Table) => {
    const { status } = getTableStatus(table);
    if (status === 'occupied') {
      setManagingTableId(table.id);
      setSelectedPayment(null);
      setIsSplitMode(false);
      setSplitQuantities({});
    } else {
      onSelectTable(table.id);
    }
  };

  const updateSplitQty = (idx: number, delta: number, max: number) => {
    setSplitQuantities(prev => {
      const current = prev[idx] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [idx]: next };
    });
  };

  const managingTable = tables.find(t => t.id === managingTableId);
  const { order: managingOrder } = managingTable ? getTableStatus(managingTable) : { order: null };

  const splitTotal = managingOrder ? Object.entries(splitQuantities).reduce((acc, [idx, qty]) => {
    const item = managingOrder.items[Number(idx)];
    return acc + (item.price * qty);
  }, 0) : 0;

  const handleConfirmSplit = () => {
    if (!managingOrder || !selectedPayment) return;
    
    onSplitOrder(managingOrder.id, splitQuantities, selectedPayment);
    
    // Reset or close if finished
    const totalSelectedQty = Object.values(splitQuantities).reduce((a, b) => a + b, 0);
    const totalRemainingQty = managingOrder.items.reduce((acc, i) => acc + (i.quantity - (i.paidQuantity || 0)), 0);
    
    if (totalSelectedQty >= totalRemainingQty) {
      setManagingTableId(null);
    } else {
      setIsSplitMode(false);
      setSplitQuantities({});
      setSelectedPayment(null);
    }
  };

  return (
    <div className="p-6 h-full overflow-auto relative">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-3xl font-black text-black tracking-tighter uppercase">Gestión de Mesas</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Administrar pedidos y cobros</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
             <div className="relative w-full sm:w-64">
               <span className="absolute left-3 top-2.5 text-slate-400">
                 <Icons.Search />
               </span>
               <input 
                 type="text" 
                 placeholder="Buscar mesa..." 
                 className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all text-xs font-bold"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             
             <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                   <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                   <span className="text-[10px] font-black uppercase text-slate-500">Libre</span>
                </div>
                <div className="flex items-center space-x-2">
                   <div className="w-3 h-3 rounded-full bg-red-600"></div>
                   <span className="text-[10px] font-black uppercase text-slate-500">Ocupada</span>
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredTables.map(table => {
            const { status, order } = getTableStatus(table);
            const isOccupied = status === 'occupied';
            const isReady = order?.status === 'ready';

            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`
                  relative aspect-square rounded-[2.5rem] flex flex-col items-center justify-center space-y-2 transition-all duration-300 group
                  ${isOccupied 
                    ? (isReady ? 'bg-green-600 text-white shadow-xl shadow-green-200 ring-4 ring-green-100 scale-105' : 'bg-red-600 text-white shadow-xl shadow-red-200 ring-4 ring-red-100 scale-[1.02]')
                    : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-red-200 hover:bg-slate-50 shadow-sm'}
                `}
              >
                {isReady && (
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce">
                    <Icons.CheckCircle />
                  </div>
                )}
                <div className={`${isOccupied ? 'text-white' : 'text-slate-300 group-hover:text-red-400'}`}>
                  <Icons.ChefHat />
                </div>
                <span className={`text-xl font-black tracking-tighter uppercase ${isOccupied ? 'text-white' : 'text-black'}`}>
                  {table.name}
                </span>
                
                {isOccupied && order && (
                   <div className="absolute -bottom-2 bg-black text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg">
                     ${order.total.toLocaleString()}
                   </div>
                )}
                
                {!isOccupied && (
                   <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                     Nueva Orden
                   </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Panel Modal */}
        {managingTable && managingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-red-600 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase">{managingTable.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Cliente: {managingOrder.client}</p>
                </div>
                <button 
                  onClick={() => setManagingTableId(null)}
                  className="p-2 bg-black/20 rounded-full hover:bg-black/40 transition"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 sm:p-8 space-y-6">
                {/* Items List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Cuenta</h4>
                    <button 
                      onClick={() => setIsSplitMode(!isSplitMode)}
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${isSplitMode ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:text-black'}`}
                    >
                      {isSplitMode ? 'Cancelar División' : 'Dividir Cuenta'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {managingOrder.items.map((item, idx) => {
                      const remainingQty = item.quantity - (item.paidQuantity || 0);
                      const isFullyPaid = remainingQty <= 0;
                      
                      return (
                        <div key={idx} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${isFullyPaid ? 'opacity-50 grayscale' : (isSplitMode && splitQuantities[idx] > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100')}`}>
                          <div className="flex items-center space-x-3">
                            {isSplitMode && !isFullyPaid ? (
                              <div className="flex items-center space-x-1 bg-white rounded-lg border border-slate-200 p-0.5">
                                <button 
                                  onClick={() => updateSplitQty(idx, -1, remainingQty)}
                                  className="w-5 h-5 flex items-center justify-center text-red-600 hover:bg-red-50 rounded transition"
                                >
                                  <Icons.Minus />
                                </button>
                                <span className="text-[10px] font-black w-4 text-center">{splitQuantities[idx] || 0}</span>
                                <button 
                                  onClick={() => updateSplitQty(idx, 1, remainingQty)}
                                  className="w-5 h-5 flex items-center justify-center text-red-600 hover:bg-red-50 rounded transition"
                                >
                                  <Icons.Plus />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="bg-black text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">
                                  {item.quantity}
                                </span>
                                {item.paidQuantity && item.paidQuantity > 0 && !isFullyPaid && (
                                  <span className="text-[8px] font-black text-green-600 mt-0.5">Pagado: {item.paidQuantity}</span>
                                )}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-black uppercase tracking-tight text-slate-800">
                                {item.name} {isFullyPaid && '(PAGADO)'}
                              </span>
                              {item.note && <p className="text-[9px] italic text-red-500 font-bold">{item.note}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black tracking-tighter text-black block">
                              {isSplitMode && splitQuantities[idx] > 0 
                                ? `$${(item.price * splitQuantities[idx]).toLocaleString()}` 
                                : `$${(item.price * item.quantity).toLocaleString()}`}
                            </span>
                            {!isSplitMode && item.paidQuantity && item.paidQuantity > 0 && !isFullyPaid && (
                              <span className="text-[8px] font-black text-slate-400">Resta: ${(item.price * remainingQty).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`flex justify-between items-center px-4 py-4 rounded-2xl mt-4 transition-colors ${isSplitMode ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'bg-black text-white'}`}>
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">
                      {isSplitMode ? 'Total a Pagar (Seleccionado)' : (managingOrder.partialPayments && managingOrder.partialPayments.length > 0 ? 'Resta por Pagar' : 'Total de la Mesa')}
                    </span>
                    <span className="text-2xl font-black tracking-tighter">
                      ${(isSplitMode ? splitTotal : (managingOrder.total - (managingOrder.partialPayments?.reduce((acc, p) => acc + p.amount, 0) || 0))).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!isSplitMode && (
                  <div className="grid grid-cols-2 gap-4">
                     <button 
                      onClick={() => onSelectTable(managingTable.id)}
                      className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-3xl hover:bg-black transition-all active:scale-95 space-y-2 border-b-4 border-slate-700"
                     >
                       <Icons.Cart />
                       <span className="text-[10px] font-black uppercase tracking-widest">Añadir Items</span>
                     </button>
                     <button 
                      onClick={() => generateTicketPDF(managingOrder, restaurantName)}
                      className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 text-slate-600 rounded-3xl hover:border-red-600 hover:text-red-600 transition-all active:scale-95 space-y-2"
                     >
                       <Icons.FileText />
                       <span className="text-[10px] font-black uppercase tracking-widest">Imprimir Pre-cuenta</span>
                     </button>
                  </div>
                )}

                {/* Payment Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Efectivo', 'Tarjeta', 'Transferencia'] as PaymentMethod[]).map(met => {
                      const isSelected = selectedPayment === met;
                      const isCash = met === 'Efectivo';
                      const amountToPay = isSplitMode ? splitTotal : (managingOrder.total - (managingOrder.partialPayments?.reduce((acc, p) => acc + p.amount, 0) || 0));

                      return (
                        <div key={met} className={isSelected && isCash ? 'col-span-3' : ''}>
                          <button 
                            onClick={() => {
                              setSelectedPayment(met);
                              setCashReceived('');
                            }}
                            className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                              isSelected 
                              ? 'border-red-600 bg-red-600 text-white shadow-lg' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                            }`}
                          >
                            {met}
                          </button>

                          {isSelected && isCash && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 p-4 bg-red-50 border-2 border-red-100 rounded-2xl space-y-4 overflow-hidden"
                            >
                              <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Recibido</p>
                                  <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-black text-red-300">$</span>
                                    <input 
                                      type="text"
                                      inputMode="decimal"
                                      className="w-full bg-transparent border-none outline-none pl-6 text-2xl font-black tracking-tighter text-black placeholder:text-red-100"
                                      placeholder="0.00"
                                      autoFocus
                                      value={cashReceived}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '.');
                                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                          setCashReceived(val);
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                {cashReceived && parseFloat(cashReceived) > 0 && (
                                  <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Cambio</p>
                                    <p className="text-2xl font-black text-green-600 tracking-tighter">
                                      ${Math.max(0, parseFloat(cashReceived) - amountToPay).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-red-100">
                                {[500, 1000, 2000, 5000].map(amount => (
                                  <button 
                                    key={amount}
                                    onClick={() => setCashReceived(amount.toString())}
                                    className="py-1.5 bg-white hover:bg-black hover:text-white rounded-lg text-[9px] font-black transition-all border border-red-100 uppercase"
                                  >
                                    ${amount.toLocaleString()}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => {
                      if (selectedPayment) {
                        const amountToPay = isSplitMode ? splitTotal : (managingOrder.total - (managingOrder.partialPayments?.reduce((acc, p) => acc + p.amount, 0) || 0));
                        if (selectedPayment === 'Efectivo') {
                          const received = parseFloat(cashReceived);
                          if (isNaN(received) || received < amountToPay) {
                            alert(`El cliente debe entregar al menos $${amountToPay.toLocaleString()}`);
                            return;
                          }
                        }

                        if (isSplitMode) {
                          handleConfirmSplit();
                        } else {
                          onPay(managingOrder.id, selectedPayment);
                          setManagingTableId(null);
                        }
                      }
                    }}
                    disabled={!selectedPayment || (isSplitMode && splitTotal === 0)}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 border-b-4 flex items-center justify-center space-x-3 ${
                      selectedPayment && (!isSplitMode || splitTotal > 0)
                      ? 'bg-red-600 text-white border-red-900 hover:bg-black hover:border-slate-800' 
                      : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Icons.CreditCard />
                    <span>{isSplitMode ? 'COBRAR PARCIAL' : 'COBRAR Y CERRAR'}</span>
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex justify-between items-center border-t border-slate-200">
                <button 
                  onClick={() => { 
                    triggerConfirm(
                      'Anular Cuenta',
                      `¿Estás seguro de anular la orden de la mesa ${managingTable.name}? Se perderán todos los items cargados.`,
                      () => { onCancel(managingOrder.id); setManagingTableId(null); }
                    );
                  }}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-red-600"
                >
                  Anular Cuenta
                </button>
                {(managingOrder.status === 'pending' || managingOrder.status === 'preparing' || managingOrder.status === 'ready') && (
                   <button 
                    onClick={() => { onDeliver(managingOrder.id); setManagingTableId(null); }}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      managingOrder.status === 'ready' 
                      ? 'bg-green-600 text-white animate-bounce shadow-lg shadow-green-200' 
                      : 'bg-black text-white'
                    }`}
                   >
                     {managingOrder.status === 'ready' ? 'Entregar (LISTO!)' : 'Entregar Pedido'}
                   </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type="danger"
      />
    </div>
  );
};

export default TablesView;
