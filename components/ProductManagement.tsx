
import React, { useState, useRef, useEffect } from 'react';
import { Product, Category, Order, Table, User, Shift, UserRole, ViewState, StoreSettings } from '../types';
import { Icons } from '../constants';

interface ProductManagementProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  settings: StoreSettings;
  onUpdateSettings: (settings: StoreSettings) => void;
  onRestoreDatabase: (data: any) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  shifts: Shift[];
  roles: UserRole[];
  setRoles: React.Dispatch<React.SetStateAction<UserRole[]>>;
  initialTab?: 'products' | 'categories' | 'tables' | 'general' | 'users' | 'shifts' | 'roles';
  activeTab?: 'overview' | 'history' | 'products' | 'categories' | 'tables' | 'users' | 'roles' | 'shifts' | 'general';
}

interface BackupPreview {
  products: Product[];
  categories: Category[];
  tables: Table[];
  orders: Order[];
  users: User[];
  settings: StoreSettings;
  fileName: string;
}

import ConfirmationModal from './ConfirmationModal';

const ProductManagement: React.FC<ProductManagementProps> = ({ 
  products, 
  setProducts, 
  categories, 
  setCategories,
  tables,
  setTables,
  orders,
  setOrders,
  settings,
  onUpdateSettings,
  onRestoreDatabase,
  users,
  setUsers,
  shifts,
  roles,
  setRoles,
  activeTab = 'products'
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' = 'danger') => {
    setConfirmState({ isOpen: true, title, message, onConfirm, type });
  };

  // General Settings Form
  const [formSettings, setFormSettings] = useState<StoreSettings>(settings);

  // Backup Import State
  const [preview, setPreview] = useState<BackupPreview | null>(null);

  // Sync internal form with props when they change (critical for imports)
  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Product Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState<Category>('');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');

  // Table Form State
  const [newTableName, setNewTableName] = useState('');

  // User Form State
  const [useFormName, setUserFormName] = useState('');
  const [userFormPin, setUserFormPin] = useState('');
  const [userFormRole, setUserFormRole] = useState<string>('Caja');

  const handleSaveProduct = () => {
    if (!name || price <= 0 || !category) return;

    if (editingId) {
      setProducts(prev => prev.map(p => 
        p.id === editingId ? { ...p, name, price, category } : p
      ));
      setEditingId(null);
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        name,
        price,
        category,
      };
      setProducts(prev => [...prev, newProduct]);
      setIsAdding(false);
    }
    resetProductForm();
  };

  const handleSaveUser = () => {
    if (!useFormName || userFormPin.length !== 4 || !userFormRole) {
      alert('Completa todos los campos correctamente. El PIN debe tener 4 dígitos.');
      return;
    }

    if (editingId) {
      setUsers(prev => prev.map(u => 
        u.id === editingId ? { ...u, name: useFormName, pin: userFormPin, role: userFormRole } : u
      ));
      setEditingId(null);
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        name: useFormName,
        pin: userFormPin,
        role: userFormRole,
      };
      setUsers(prev => [...prev, newUser]);
      setIsAdding(false);
    }
    resetUserForm();
  };

  const resetUserForm = () => {
    setUserFormName('');
    setUserFormPin('');
    setUserFormRole('Caja');
  };

  const startEditUser = (u: User) => {
    setEditingId(u.id);
    setUserFormName(u.name);
    setUserFormPin(u.pin);
    setUserFormRole(u.role);
    setIsAdding(false);
  };

  const deleteUser = (id: string) => {
    if (id === 'admin') {
      alert('No se puede eliminar el usuario administrador principal.');
      return;
    }
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    triggerConfirm(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar al usuario "${user.name}"?`,
      () => setUsers(prev => prev.filter(u => u.id !== id))
    );
  };

  const resetProductForm = () => {
    setName('');
    setPrice(0);
    setCategory(categories[0] || '');
  };

  // Role Management State
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormPermissions, setRoleFormPermissions] = useState<ViewState[]>([]);

  const handleSaveRole = () => {
    if (!roleFormName) return;
    
    if (editingId) {
      setRoles(prev => prev.map(r => r.name === editingId ? { name: roleFormName, permissions: roleFormPermissions } : r));
      setEditingId(null);
    } else {
      if (roles.some(r => r.name === roleFormName)) {
        alert('Este rol ya existe.');
        return;
      }
      setRoles(prev => [...prev, { name: roleFormName, permissions: roleFormPermissions }]);
      setIsAdding(false);
    }
    setRoleFormName('');
    setRoleFormPermissions([]);
  };

  const deleteRole = (name: string) => {
    if (name === 'Admin') {
      alert('No se puede eliminar el rol de Administrador.');
      return;
    }
    if (users.some(u => u.role === name)) {
      alert('No se puede eliminar un rol asignado a usuarios.');
      return;
    }
    triggerConfirm(
      'Eliminar Rol',
      `¿Deseas eliminar el rol "${name}"?`,
      () => setRoles(prev => prev.filter(r => r.name !== name))
    );
  };

  const togglePermission = (view: ViewState) => {
    setRoleFormPermissions(prev => 
      prev.includes(view) ? prev.filter(v => v !== view) : [...prev, view]
    );
  };

  const availableViews: {id: ViewState, label: string}[] = [
    { id: 'pos', label: 'Venta (POS)' },
    { id: 'tables', label: 'Mesas' },
    { id: 'dispatch', label: 'Cocina (Dispatch)' },
    { id: 'central', label: 'Centro de Control (CRM)' },
    { id: 'cash_audit', label: 'Auditoría de Caja' },
  ];

  const startEditProduct = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(p.price);
    setCategory(p.category);
    setIsAdding(false);
  };

  const deleteProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    triggerConfirm(
      'Eliminar Producto',
      `¿Estás seguro de eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      () => setProducts(prev => prev.filter(p => p.id !== id))
    );
  };

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert('Esta categoría ya existe.');
      return;
    }
    setCategories(prev => [...prev, trimmed]);
    setNewCatName('');
  };

  const handleDeleteCategory = (cat: Category) => {
    const inUse = products.some(p => p.category === cat);
    if (inUse) {
      alert(`No se puede eliminar "${cat}" porque está siendo usada por algunos productos.`);
      return;
    }
    
    triggerConfirm(
      'Eliminar Categoría',
      `¿Eliminar categoría "${cat}"? Se quitará de la lista de filtros.`,
      () => setCategories(prev => prev.filter(c => c !== cat))
    );
  };

  const handleAddTable = () => {
    const trimmed = newTableName.trim();
    if (!trimmed) return;
    if (tables.some(t => t.name === trimmed)) {
      alert('Esta mesa ya existe.');
      return;
    }
    const newTable: Table = {
      id: Date.now().toString(),
      name: trimmed,
      status: 'free'
    };
    setTables(prev => [...prev, newTable]);
    setNewTableName('');
  };

  const handleDeleteTable = (id: string) => {
    const table = tables.find(t => t.id === id);
    if (!table) return;
    
    // Check if table has active order
    const hasOrder = orders.some(o => o.table === table.name && !o.isPaid);
    if (hasOrder) {
      alert('No se puede eliminar una mesa con una cuenta abierta.');
      return;
    }

    triggerConfirm(
      'Eliminar Mesa',
      `¿Eliminar mesa "${table.name}"? Los registros históricos se preservarán, pero no podrá abrir nuevas órdenes aquí.`,
      () => setTables(prev => prev.filter(t => t.id !== id))
    );
  };

  const handleSaveGeneral = () => {
    onUpdateSettings(formSettings);
    alert('Configuración actualizada');
  };

  // BACKUP LOGIC
  const handleExportData = () => {
    const data = {
      products,
      categories,
      tables,
      orders,
      users,
      settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comanda_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validaciones básicas de estructura
        if (!data.products || !data.categories) {
          throw new Error("El archivo no es un respaldo válido de Comanda Eventos.");
        }

        setPreview({
          products: data.products || [],
          categories: data.categories || [],
          tables: data.tables || [],
          orders: data.orders || [],
          users: data.users || [],
          settings: data.settings || settings,
          fileName: file.name
        });
      } catch (err) {
        console.error("Error al leer archivo:", err);
        alert('Error al procesar el archivo: ' + (err instanceof Error ? err.message : 'Formato inválido'));
        setPreview(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyBackup = () => {
    if (!preview) return;

    triggerConfirm(
      'Restaurar Respaldo',
      'ATENCIÓN: Se borrarán todos los datos actuales y se reemplazarán por los del respaldo. Esta acción es irreversible.',
      () => {
        try {
          onRestoreDatabase(preview);
          alert('Base de datos restaurada con éxito.');
          setPreview(null);
        } catch (error) {
          console.error("Error durante applyBackup:", error);
          alert("Ocurrió un error al aplicar el respaldo.");
        }
      },
      'warning'
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 overflow-hidden">
      {activeTab === 'products' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Menú de Ventas</h2>
            {!isAdding && !editingId && (
              <button 
                onClick={() => {
                  setIsAdding(true);
                  if (categories.length > 0) setCategory(categories[0]);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-red-700 transition shadow-lg shadow-red-100"
              >
                <Icons.Plus /> <span>Nuevo</span>
              </button>
            )}
          </div>

          {(isAdding || editingId) && (
            <div className="bg-white p-6 rounded-3xl border-2 border-red-600 shadow-xl animate-in zoom-in duration-200">
              <h3 className="font-black text-black uppercase tracking-widest mb-6 border-b pb-2">{editingId ? 'Editar' : 'Agregar'} Item</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Item</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</label>
                  <input 
                    type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  onClick={() => { setIsAdding(false); setEditingId(null); resetProductForm(); }}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProduct}
                  className="px-10 py-2 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[500px] md:min-w-0">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded border border-slate-300 uppercase bg-white text-slate-600">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-black">${product.price}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => startEditProduct(product)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Icons.Edit /></button>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition"><Icons.Trash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Categorías</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Nueva categoría..."
                className="flex-grow p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
              />
              <button 
                onClick={handleAddCategory}
                className="bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg"
              >
                <span>Añadir</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group transition hover:border-red-600 hover:bg-white">
                  <span className="font-bold text-slate-800 text-sm uppercase tracking-tight">{cat}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-2 text-slate-300 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Mesas</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Nombre de mesa (ej. Mesa 10)..."
                className="flex-grow p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddTable()}
              />
              <button 
                onClick={handleAddTable}
                className="bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg"
              >
                <span>Añadir</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tables.map(table => (
                <div key={table.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group transition hover:border-red-600 hover:bg-white">
                  <span className="font-bold text-slate-800 text-sm uppercase tracking-tight">{table.name}</span>
                  <button 
                    onClick={() => handleDeleteTable(table.id)}
                    className="p-2 text-slate-300 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Usuarios</h2>
            {!isAdding && !editingId && (
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-red-700 transition shadow-lg shadow-red-100"
              >
                <Icons.Plus /> <span>Nuevo Usuario</span>
              </button>
            )}
          </div>

          {(isAdding || editingId) && (
            <div className="bg-white p-6 rounded-3xl border-2 border-red-600 shadow-xl animate-in zoom-in duration-200">
              <h3 className="font-black text-black uppercase tracking-widest mb-6 border-b pb-2">{editingId ? 'Editar' : 'Agregar'} Usuario</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                  <input 
                    type="text" value={useFormName} onChange={e => setUserFormName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PIN (4 dígitos)</label>
                  <input 
                    type="password" maxLength={4} value={userFormPin} onChange={e => setUserFormPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                    placeholder="****"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Permisos</label>
                  <select 
                    value={userFormRole} onChange={e => setUserFormRole(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    {roles.map(role => (
                      <option key={role.name} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  onClick={() => { setIsAdding(false); setEditingId(null); resetUserForm(); }}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveUser}
                  className="px-10 py-2 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-lg"
                >
                  Guardar Usuario
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[500px] md:min-w-0">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PIN</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{user.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                        user.role === 'Admin' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">****</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => startEditUser(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Icons.Edit /></button>
                        <button 
                          onClick={() => deleteUser(user.id)} 
                          className={`p-2 transition rounded-lg ${user.id === 'admin' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-black hover:bg-slate-100'}`}
                          disabled={user.id === 'admin'}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'shifts' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Historial de Turnos</h2>
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {shifts.length} Registros
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 uppercase text-xs font-black tracking-widest">No hay turnos registrados</td>
                  </tr>
                ) : (
                  shifts.map(shift => {
                    const start = new Date(shift.startTime);
                    const end = shift.endTime ? new Date(shift.endTime) : null;
                    const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

                    return (
                      <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{shift.userName}</td>
                        <td className="px-6 py-4 text-xs">
                          {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {end ? (
                            `${end.toLocaleDateString()} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          ) : (
                            <span className="text-green-500 font-black animate-pulse uppercase text-[10px]">En Turno</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                          {duration !== null ? `${Math.floor(duration/60)}h ${duration%60}m` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Configuración de Roles</h2>
            {!isAdding && !editingId && (
              <button 
                onClick={() => {
                  setIsAdding(true);
                  setRoleFormName('');
                  setRoleFormPermissions([]);
                }}
                className="bg-black text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-slate-800 transition shadow-lg"
              >
                <Icons.Plus /> <span>Nuevo Rol</span>
              </button>
            )}
          </div>

          {(isAdding || editingId) && (
            <div className="bg-white p-8 rounded-3xl border-2 border-black shadow-2xl space-y-6 animate-in zoom-in duration-200">
              <h3 className="text-lg font-black uppercase tracking-widest">{editingId ? 'Editar' : 'Crear'} Rol</h3>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Rol</label>
                <input 
                  type="text"
                  value={roleFormName}
                  onChange={e => setRoleFormName(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold"
                  placeholder="Ej. Supervisor de Barra"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permisos de Visualización</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableViews.map(view => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => togglePermission(view.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        roleFormPermissions.includes(view.id)
                          ? 'border-red-600 bg-red-50 text-red-900 shadow-md'
                          : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'
                      }`}
                    >
                      <span className="font-black text-[10px] uppercase tracking-widest">{view.label}</span>
                      {roleFormPermissions.includes(view.id) ? (
                        <Icons.CheckCircle size={20} className="text-red-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button 
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveRole}
                  className="px-10 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-xl transition-all"
                >
                  Guardar Permisos
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.name} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group transition-all hover:border-black">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{role.name}</h4>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingId(role.name);
                          setRoleFormName(role.name);
                          setRoleFormPermissions(role.permissions);
                          setIsAdding(false);
                        }}
                        className="p-2 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl"
                      >
                        <Icons.Edit />
                      </button>
                      <button 
                        onClick={() => deleteRole(role.name)}
                        className={`p-2 rounded-xl transition ${role.name === 'Admin' ? 'text-slate-100 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                        disabled={role.name === 'Admin'}
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map(p => (
                      <span key={p} className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200">
                        {availableViews.find(v => v.id === p)?.label || p}
                      </span>
                    ))}
                    {role.permissions.length === 0 && (
                      <span className="text-[10px] font-bold text-slate-300 italic">Sin accesos</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'general' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-400 pb-10">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Ajustes del Negocio</h2>
            
            {/* Perfil del Negocio */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-black uppercase tracking-widest border-b border-slate-100 pb-4">Perfil del Negocio</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Negocio</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-slate-400"><Icons.ChefHat size={18}/></div>
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm"
                      value={formSettings.name}
                      onChange={e => setFormSettings({...formSettings, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Evento / Rubro</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-slate-400"><Icons.MapPin size={18}/></div>
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm"
                      value={formSettings.eventType}
                      onChange={e => setFormSettings({...formSettings, eventType: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Ej. +52 123 456 7890"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm"
                    value={formSettings.phone || ''}
                    onChange={e => setFormSettings({...formSettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                  <input 
                    type="email" 
                    placeholder="contacto@minegocio.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm"
                    value={formSettings.email || ''}
                    onChange={e => setFormSettings({...formSettings, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección Comercial</label>
                  <input 
                    type="text" 
                    placeholder="Av. Principal 123, Ciudad, País"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm"
                    value={formSettings.address || ''}
                    onChange={e => setFormSettings({...formSettings, address: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Tickets */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-black uppercase tracking-widest border-b border-slate-100 pb-4">Tickets & Recibos</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moneda</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm appearance-none"
                    value={formSettings.currency}
                    onChange={e => setFormSettings({...formSettings, currency: e.target.value})}
                  >
                    <option value="MXN">Peso Mexicano (MXN)</option>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="ARS">Peso Argentino (ARS)</option>
                    <option value="COP">Peso Colombiano (COP)</option>
                    <option value="PEN">Sol Peruano (PEN)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador Fiscal / RFC / RUT</label>
                  <input 
                    type="text" 
                    placeholder="Opcional"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm"
                    value={formSettings.taxId || ''}
                    onChange={e => setFormSettings({...formSettings, taxId: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensaje Impreso - Cabecera</label>
                  <textarea 
                    placeholder="Ej. ¡Bienvenidos a nuestro local! / Wi-Fi: ... "
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm resize-none h-20"
                    value={formSettings.receiptHeader || ''}
                    onChange={e => setFormSettings({...formSettings, receiptHeader: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensaje Impreso - Pie de Página</label>
                  <textarea 
                    placeholder="Ej. ¡Gracias por su preferencia! / Síganos en redes: @minegocio"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-black outline-none font-bold text-slate-800 text-sm resize-none h-20"
                    value={formSettings.receiptFooter || ''}
                    onChange={e => setFormSettings({...formSettings, receiptFooter: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSaveGeneral}
                className="bg-black text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition shadow-2xl"
              >
                Guardar Configuración
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Respaldo de Base de Datos</h2>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleExportData}
                  className="flex-1 bg-black text-white px-6 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-900 transition shadow-xl flex flex-col items-center justify-center space-y-3"
                >
                  <div className="scale-150 mb-1"><Icons.FileText /></div>
                  <span>Exportar Base de Datos</span>
                </button>

                <div className="flex-1 relative">
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full bg-slate-100 text-slate-700 px-6 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition border-2 border-dashed border-slate-300 flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="scale-150 mb-1 rotate-180"><Icons.FileText /></div>
                    <span>Seleccionar Archivo</span>
                  </button>
                </div>
              </div>

              {/* PREVIEW AREA */}
              {preview && (
                <div className="mt-6 bg-slate-50 rounded-3xl border-2 border-red-600 p-6 animate-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black text-black uppercase tracking-widest text-xs">Previsualización del Respaldo</h4>
                    <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-red-600 transition"><Icons.Trash /></button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Archivo</p>
                      <p className="text-[10px] font-bold truncate">{preview.fileName}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Productos</p>
                      <p className="text-lg font-black">{preview.products.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mesas</p>
                      <p className="text-lg font-black">{preview.tables.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Categorías</p>
                      <p className="text-lg font-black">{preview.categories.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Órdenes</p>
                      <p className="text-lg font-black">{preview.orders.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Usuarios</p>
                      <p className="text-lg font-black">{preview.users.length}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 mb-6">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ajustes a aplicar:</p>
                    <p className="text-[10px] font-black uppercase tracking-tight text-red-600">{preview.settings.name} / {preview.settings.eventType}</p>
                  </div>

                  <button 
                    onClick={applyBackup}
                    className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-2xl shadow-red-200 hover:bg-red-700 transition"
                  >
                    <Icons.CheckCircle />
                    <span>APLICAR ESTE RESPALDO</span>
                  </button>
                </div>
              )}
              
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start space-x-3">
                <div className="text-red-600 pt-0.5 scale-90"><Icons.Settings /></div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-red-800 tracking-wider">¡Atención!</p>
                  <p className="text-[10px] text-red-700 leading-relaxed font-medium">
                    Use estas funciones para guardar su progreso. El sistema almacena datos localmente, por lo que limpiar la caché del navegador borrará su información si no tiene un respaldo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type as 'danger' | 'warning'}
      />
    </div>
  );
};

export default ProductManagement;
