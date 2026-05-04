# 📖 Manual de Usuario - Sistema POS Red & Black Edition

Este documento detalla todas las funcionalidades del sistema de gestión para restaurantes, cafeterías o eventos gastronómicos.

## 1. Sistema de Acceso (Login)
El sistema utiliza un esquema de seguridad basado en identificación por usuario y PIN.

*   **Selección de Usuario**: Al abrir la app, verás la lista de personal autorizado.
*   **Ingreso de PIN**: Cada usuario tiene un PIN único de 4 dígitos. Una vez ingresado correctamente, el sistema registrará el **Inicio de Turno**.
*   **Control de Turnos**: El sistema guarda la hora exacta de entrada. Al cerrar sesión, se registra la hora de salida y la duración total del turno.

## 2. Roles y Permisos
El sistema adapta su interfaz según quién haya iniciado sesión:
*   **Admin**: Acceso total (Ventas, Mesas, Cocina, Reportes, Configuración, Usuarios y Turnos).
*   **Caja**: Acceso a Ventas (POS) y Mapa de Mesas.
*   **Mesero**: Acceso a Mapa de Mesas y toma de pedidos (POS).
*   **Cocinero**: Acceso exclusivo al panel de Despacho (Cocina).

## 3. Punto de Venta (POS)
Es el corazón de la operación para tomar pedidos.
*   **Categorías**: Navega entre Comida, Bebida, Postre, etc., usando los botones superiores.
*   **Carrito**: Al hacer clic en un producto, se añade al carrito. Puedes aumentar o disminuir cantidades directamente.
*   **Tipo de Orden**:
    *   **Mesa**: Debes seleccionar una mesa activa. El estado de la mesa cambiará a "Ocupada".
    *   **Para Llevar**: Pedidos rápidos que no ocupan mesa.
*   **Pago**: Soporta Efectivo y Tarjeta. Al finalizar, el pedido se envía automáticamente a la Cocina.

## 4. Mapa de Mesas
Permite visualizar el estado del salón de forma gráfica.
*   **Colores de Estado**:
    *   **Gris**: Mesa Libre.
    *   **Rojo**: Mesa Ocupada (con pedido en curso).
    *   **Azul**: Mesa solicitando cuenta (listo para cobrar).
*   **Funcionalidad**: Al hacer clic en una mesa ocupada, puedes ver el detalle del pedido o añadir más productos.

## 5. Panel de Cocina (Dispatch)
Diseñado para que los chefs gestionen las órdenes entrantes.
*   **Estados del Pedido**: 
    1.  **Pendiente**: Pedido recién llegado.
    2.  **Preparando**: El chef indica que ha comenzado la elaboración.
    3.  **Listo**: El pedido sale de cocina. Se genera una alerta visual para el mesero/caja.
*   **Filtros**: Permite ver solo lo pendiente para mayor enfoque.

## 6. Historial y Reportes
Ubicado en la pestaña "Admin" para usuarios con permiso.
*   **Resumen de Ventas**: Visualiza el total recaudado hoy, este mes y el histórico.
*   **Listado de Órdenes**: Consulta cada detalle de ventas pasadas, incluyendo método de pago y productos vendidos.
*   **Re-impresión**: Opción para simular la impresión de un ticket de una venta antigua.

## 7. Configuración y Administración
El panel más potente del sistema (solo Admin).
*   **Productos**: Crea, edita o elimina productos, precios y categorías.
*   **Mesas**: Configura cuántas mesas tiene tu establecimiento.
*   **Usuarios**: Gestión de personal. Aquí es donde se definen los PINs y roles.
*   **Turnos**: Historial detallado de quién entró, a qué hora y cuánto tiempo trabajó.
*   **Base de Datos**: 
    *   **Exportar**: Baja un archivo JSON con toda la información (ideal para respaldos diarios).
    *   **Importar**: Restaura el sistema completo usando un archivo de respaldo previo.

## 8. Consejos de Uso
*   **Cerrar Sesión**: Siempre cierra sesión al terminar tu jornada para que el registro de turnos sea exacto. En móviles, encontrarás esta opción dentro del menú lateral.
*   **Respaldo**: Se recomienda exportar la base de datos al menos una vez por semana.
*   **Cocina**: Si usas una tablet en cocina, el modo "Solo Pendientes" es ideal para no saturar la pantalla.
