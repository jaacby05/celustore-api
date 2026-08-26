require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ type: ["application/json", "text/plain"] }));

// ── Conexión MongoDB Atlas ────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas conectado"))
  .catch((err) => console.error("❌ Error MongoDB:", err));

// ════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

// ── Schema Reseña ─────────────────────────────────────────────────────────
const resenaSchema = new mongoose.Schema(
  {
    producto_id:    { type: Number, required: true },
    usuario_id:     { type: Number, required: true },
    usuario_nombre: { type: String, required: true },
    puntuacion:     { type: Number, required: true, min: 1, max: 5 },
    titulo:         { type: String, default: "" },
    comentario:     { type: String, default: "" },
    caracteristicas: {
      bateria:        { type: Number, min: 1, max: 5, default: null },
      camara:         { type: Number, min: 1, max: 5, default: null },
      rendimiento:    { type: Number, min: 1, max: 5, default: null },
      precio_calidad: { type: Number, min: 1, max: 5, default: null },
    },
    util: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Resena = mongoose.model("Resena", resenaSchema, "resenas");

// ── Schema Artículo de Proveedor ──────────────────────────────────────────
const articuloSchema = new mongoose.Schema(
  {
    // Campos comunes
    tipo:             { type: String, required: true, enum: ["celular", "accesorio"] },
    marca:            { type: String, required: true },
    condicion:        { type: String, required: true, enum: ["nuevo", "reacondicionado", "sellado"] },
    cantidad:         { type: Number, required: true, min: 1 },
    precio:           { type: Number, required: true, min: 0 },
    id_proveedor:     { type: Number, required: true },
    proveedor_nombre: { type: String, default: "" },

    // Solo celulares
    modelo:           { type: String, default: "" },
    color:            { type: String, default: "" },
    almacenamiento:   { type: String, default: "" },
    ram:              { type: String, default: "" },
    bateria:          { type: Number, default: null },
    camara:           { type: Number, default: null },

    // Solo accesorios
    categoria:        { type: String, default: "" },
    descripcion:      { type: String, default: "" },
    compatible_con:   { type: String, default: "" },
  },
  { timestamps: true }
);
const Articulo = mongoose.model("Articulo", articuloSchema, "articulos_proveedores");

// ── Schema Usuario (solo para la APK) ─────────────────────────────────────
const usuarioSchema = new mongoose.Schema(
  {
    nombre:   { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol:      { type: String, default: "admin" },
  },
  { timestamps: true }
);
const Usuario = mongoose.model("Usuario", usuarioSchema, "usuarios_app");

// ── Schema Carrito (movimientos hechos desde la APK) ──────────────────────
const carritoMovilSchema = new mongoose.Schema(
  {
    producto_id:     { type: String, required: true },
    producto_nombre: { type: String, required: true },
    imagen:          { type: String, default: "" },
    cantidad:        { type: Number, required: true, min: 1 },
    precio:          { type: Number, default: 0 },
    usuario_email:   { type: String, required: true },
  },
  { timestamps: true }
);
const CarritoMovil = mongoose.model("CarritoMovil", carritoMovilSchema, "carrito_movil");

// ── Schema Órdenes (compras hechas desde la APK) ───────────────────────────
const ordenMovilSchema = new mongoose.Schema(
  {
    usuario_email:    { type: String, required: true },
    domicilio_envio:  { type: String, required: true },
    telefono_contacto:{ type: String, required: true },
    tipo_envio:       { type: String, default: "estandar" },
    metodo_pago:      { type: String, default: "tarjeta" },
    costo_envio:      { type: Number, default: 0 },
    numero_orden:     { type: String, required: true },
    estado:           { type: String, default: "pendiente" },
    items: [{
      producto_id: String, producto_nombre: String,
      cantidad: Number, precio: Number,
    }],
    total: { type: Number, default: 0 }, // subtotal de productos + costo_envio
  },
  { timestamps: true }
);
const OrdenMovil = mongoose.model("OrdenMovil", ordenMovilSchema, "ordenes_movil");

// ── Schema Carrito Mayorista (separado del carrito normal) ────────────────
const carritoMayoristaSchema = new mongoose.Schema(
  {
    producto_id:      { type: String, required: true },
    producto_nombre:  { type: String, required: true },
    imagen:           { type: String, default: "" },
    cantidad:         { type: Number, required: true },
    precio_unitario:  { type: Number, required: true }, // ya con el descuento aplicado
    usuario_email:    { type: String, required: true },
  },
  { timestamps: true }
);
const CarritoMayorista = mongoose.model("CarritoMayorista", carritoMayoristaSchema, "carrito_mayorista");

// ── Schema Órdenes Mayoristas (separadas de las órdenes normales) ─────────
const ordenMayoristaSchema = new mongoose.Schema(
  {
    usuario_email:     { type: String, required: true },
    domicilio_envio:   { type: String, required: true },
    telefono_contacto: { type: String, required: true },
    metodo_pago:       { type: String, default: "transferencia" },
    numero_orden:      { type: String, required: true },
    estado:            { type: String, default: "pendiente" },
    total:             { type: Number, default: 0 },
  },
  { timestamps: true }
);
const OrdenMayorista = mongoose.model("OrdenMayorista", ordenMayoristaSchema, "ordenes_mayoristas");

// ── Schema Caja Mayorista (ingresos/egresos, separado de la caja normal) ──
const cajaMayoristaSchema = new mongoose.Schema(
  {
    tipo:        { type: String, enum: ["ingreso", "egreso"], required: true },
    categoria:   { type: String, required: true }, // 'venta_mayorista', 'mercaderia', 'envio', 'otro'
    descripcion: { type: String, required: true },
    monto:       { type: Number, required: true },
  },
  { timestamps: true }
);
const CajaMayorista = mongoose.model("CajaMayorista", cajaMayoristaSchema, "caja_mayorista");

// ── Schema Producto (copia del catálogo REAL de MySQL, sincronizada
//    automáticamente desde admin/productos.php cada vez que se
//    crea/edita/borra un producto en la web) ───────────────────────────────
const productoAppSchema = new mongoose.Schema(
  {
    id_mysql: { type: Number, required: true, unique: true }, // id real en la tabla `productos`
    nombre:   { type: String, required: true },
    marca:    { type: String, default: "" },
    precio:   { type: Number, required: true },
    stock:    { type: Number, default: 0 },
    imagen:   { type: String, default: "" },
    activo:   { type: Boolean, default: true },
    categoria: { type: String, default: "" },
    descripcion: { type: String, default: "" },
    es_celular: { type: Boolean, default: false },

    // Solo celulares
    bateria_mah:       { type: Number, default: null },
    ram_gb:            { type: Number, default: null },
    almacenamiento_gb: { type: Number, default: null },
    camara_mp:         { type: Number, default: null },
    pantalla_pulgadas: { type: Number, default: null },
    procesador_nombre: { type: String, default: "" },
    antutu_score:      { type: Number, default: null },
    camera_score:      { type: Number, default: null },

    // Solo accesorios
    potencia_watts:  { type: Number, default: null },
    compatible_con:  { type: String, default: "" },
    tipo_conexion:   { type: String, default: "" },
  },
  { timestamps: true }
);
const ProductoApp = mongoose.model("ProductoApp", productoAppSchema, "productos_app");

// ── Schema Stock Pendiente (compras mayoristas desde la app que
//    todavía no se descontaron del stock real en MySQL) ───────────────────
const stockPendienteSchema = new mongoose.Schema(
  {
    id_mysql: { type: Number, required: true },
    cantidad: { type: Number, required: true },
    aplicado: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const StockPendiente = mongoose.model("StockPendiente", stockPendienteSchema, "stock_pendiente_mayorista");

// ── Configuración del modo mayorista ───────────────────────────────────────
const DESCUENTO_MAYORISTA = 0.15;     // 15% menos que el precio normal
const CANTIDAD_MINIMA_MAYORISTA = 10; // unidades mínimas por producto


// ════════════════════════════════════════════════════════════════════════════
// RUTAS PARA LA APK (todo contra MongoDB — sin pasar por InfinityFree)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/app/login
app.post("/api/app/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.json({ error: "Email y contraseña son obligatorios" });
    }
    const usuario = await Usuario.findOne({ email: email.trim(), password: password.trim() });
    if (!usuario) {
      return res.json({ error: "Email o contraseña incorrectos" });
    }
    if (usuario.rol !== "cliente") {
      return res.json({ error: "Esta app es solo para cuentas de cliente" });
    }
    res.json({
      success: true,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/productos — catálogo REAL, sincronizado desde MySQL
app.get("/api/app/productos", async (req, res) => {
  try {
    const productos = await ProductoApp.find({ activo: true }).sort({ createdAt: -1 });
    res.json({
      productos: productos.map((p) => ({
        id: p.id_mysql, nombre: p.nombre, marca: p.marca,
        precio: p.precio, stock: p.stock, imagen: p.imagen,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/catalogo-ia — arma el catalogo_txt igual que asistente.php,
// más la lista de productos (para armar las tarjetas [ID:XX] en la app)
app.get("/api/app/catalogo-ia", async (req, res) => {
  try {
    const productos = await ProductoApp.find({ activo: true, stock: { $gt: 0 } })
      .sort({ es_celular: -1, precio: 1 });

    let catalogo_txt = "";
    const productos_lista = productos.map((p) => {
      let linea = `[ID:${p.id_mysql}] ${p.marca} ${p.nombre} | `;
      linea += `Precio: $${Number(p.precio).toLocaleString("es-AR")} | `;
      linea += `Stock: ${p.stock} | Categoría: ${p.categoria || ""} | `;

      if (p.es_celular) {
        if (p.bateria_mah)       linea += `Batería: ${p.bateria_mah} mAh | `;
        if (p.ram_gb)            linea += `RAM: ${p.ram_gb} GB | `;
        if (p.almacenamiento_gb) linea += `Almacenamiento: ${p.almacenamiento_gb} GB | `;
        if (p.camara_mp)         linea += `Cámara: ${p.camara_mp} MP | `;
        if (p.pantalla_pulgadas) linea += `Pantalla: ${p.pantalla_pulgadas}" | `;
        if (p.procesador_nombre) linea += `Procesador: ${p.procesador_nombre} | `;
        if (p.antutu_score)      linea += `AnTuTu: ${p.antutu_score} | `;
        if (p.camera_score)      linea += `Camera Score: ${p.camera_score} | `;
      } else {
        if (p.potencia_watts) linea += `Potencia: ${p.potencia_watts} W | `;
        if (p.tipo_conexion)  linea += `Conexión: ${p.tipo_conexion} | `;
        if (p.compatible_con) linea += `Compatible con: ${p.compatible_con} | `;
      }
      if (p.descripcion) linea += `Desc: ${p.descripcion.slice(0, 100)}`;
      catalogo_txt += linea + "\n";

      return {
        id: p.id_mysql, nombre: p.nombre, marca: p.marca,
        precio: p.precio, imagen: p.imagen,
      };
    });

    res.json({ catalogo_txt, productos: productos_lista });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/productos/:id — :id acá es el id_mysql (el mismo que en la web)
app.get("/api/app/productos/:id", async (req, res) => {
  try {
    const p = await ProductoApp.findOne({ id_mysql: req.params.id, activo: true });
    if (!p) return res.json({ error: "Producto no encontrado" });
    res.json({
      producto: {
        id: p.id_mysql, nombre: p.nombre, marca: p.marca,
        precio: p.precio, stock: p.stock, imagen: p.imagen,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/carrito — agregar un producto (esto es lo que la app encola si no hay red)
app.post("/api/app/carrito", async (req, res) => {
  try {
    const { producto_id, producto_nombre, cantidad, precio, usuario_email, imagen } = req.body || {};
    if (!producto_id || !cantidad || !usuario_email) {
      return res.json({ error: "Faltan datos para agregar al carrito" });
    }
    const item = await CarritoMovil.create({ producto_id, producto_nombre, cantidad, precio, usuario_email, imagen });
    res.json({ success: true, mensaje: "Agregado al carrito", item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/carrito?usuario_email=...
app.get("/api/app/carrito", async (req, res) => {
  try {
    const filtro = req.query.usuario_email ? { usuario_email: req.query.usuario_email } : {};
    const items = await CarritoMovil.find(filtro).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/carrito-eliminar — sacar un ítem del carrito
app.post("/api/app/carrito-eliminar", async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ error: "Falta el id del ítem" });
    await CarritoMovil.deleteOne({ _id: id });
    res.json({ success: true, mensaje: "Producto eliminado del carrito" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/ordenes — checkout
app.post("/api/app/ordenes", async (req, res) => {
  try {
    const datos = req.body || {};
    if (!datos.usuario_email || !datos.domicilio_envio) {
      return res.json({ error: "Faltan datos para crear la orden" });
    }
    const itemsCarrito = await CarritoMovil.find({ usuario_email: datos.usuario_email });
    const subtotal = itemsCarrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const costo_envio = Number(datos.costo_envio) || 0;
    const total = subtotal + costo_envio;
    const items = itemsCarrito.map((i) => ({
      producto_id: i.producto_id, producto_nombre: i.producto_nombre,
      cantidad: i.cantidad, precio: i.precio,
    }));

    const numero_orden = "ORD-" + Date.now();
    const orden = await OrdenMovil.create({ ...datos, numero_orden, items, total });
    // Al confirmar la orden, vaciamos el carrito de ese usuario
    await CarritoMovil.deleteMany({ usuario_email: datos.usuario_email });
    res.json({ success: true, numero_orden, orden });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/ordenes?usuario_email=...
app.get("/api/app/ordenes", async (req, res) => {
  try {
    const filtro = req.query.usuario_email ? { usuario_email: req.query.usuario_email } : {};
    const ordenes = await OrdenMovil.find(filtro).sort({ createdAt: -1 });
    const mapeadas = ordenes.map((o) => ({
      numero_orden: o.numero_orden, estado: o.estado, fecha: o.createdAt,
      total: o.total || 0, tipo: "normal",
    }));
    res.json({ ordenes: mapeadas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/sync-usuario — la web llama esto (desde el navegador del
// que se registra) justo después de verificar su cuenta, para replicar
// el usuario en Mongo y que ya pueda usar la app. El rol siempre se
// fuerza a "cliente" acá, sin importar qué mande el pedido, para que
// nadie pueda crearse una cuenta admin llamando a este endpoint directo.
app.post("/api/app/sync-usuario", async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) {
      return res.json({ error: "Faltan datos para sincronizar el usuario" });
    }
    await Usuario.findOneAndUpdate(
      { email: email.trim() },
      { nombre, email: email.trim(), password, rol: "cliente" },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DEL CATÁLOGO REAL (llamado por PHP vía cURL desde
// admin/productos.php, cada vez que se crea/edita/borra un producto)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/app/sync-producto — crear o actualizar (upsert por id_mysql)
app.post("/api/app/sync-producto", async (req, res) => {
  try {
    const {
      id_mysql, nombre, marca, precio, stock, imagen, activo,
      categoria, descripcion, es_celular,
      bateria_mah, ram_gb, almacenamiento_gb, camara_mp,
      pantalla_pulgadas, procesador_nombre, antutu_score, camera_score,
      potencia_watts, compatible_con, tipo_conexion,
    } = req.body || {};
    if (!id_mysql || !nombre) {
      return res.json({ error: "Faltan datos para sincronizar el producto" });
    }
    await ProductoApp.findOneAndUpdate(
      { id_mysql },
      {
        id_mysql, nombre, marca: marca || "", precio: precio || 0, stock: stock || 0,
        imagen: imagen || "", activo: activo !== false,
        categoria: categoria || "", descripcion: descripcion || "", es_celular: !!es_celular,
        bateria_mah: bateria_mah ?? null, ram_gb: ram_gb ?? null,
        almacenamiento_gb: almacenamiento_gb ?? null, camara_mp: camara_mp ?? null,
        pantalla_pulgadas: pantalla_pulgadas ?? null, procesador_nombre: procesador_nombre || "",
        antutu_score: antutu_score ?? null, camera_score: camera_score ?? null,
        potencia_watts: potencia_watts ?? null, compatible_con: compatible_con || "",
        tipo_conexion: tipo_conexion || "",
      },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/sync-producto-eliminar — borrar (o desactivar) del catálogo
app.post("/api/app/sync-producto-eliminar", async (req, res) => {
  try {
    const { id_mysql, definitivo } = req.body || {};
    if (!id_mysql) return res.json({ error: "Falta id_mysql" });
    if (definitivo) {
      await ProductoApp.deleteOne({ id_mysql });
    } else {
      await ProductoApp.findOneAndUpdate({ id_mysql }, { activo: false });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STOCK PENDIENTE (compras mayoristas de la app, pendientes de descontar
// del stock real en MySQL — se aplican vía cURL desde la web, ver
// config/sync-stock-mayorista.php)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/app/admin/stock-pendiente — lo que falta descontar
app.get("/api/app/admin/stock-pendiente", async (req, res) => {
  try {
    const pendientes = await StockPendiente.find({ aplicado: false });
    res.json({
      success: true,
      pendientes: pendientes.map(p => ({ id: p._id, id_mysql: p.id_mysql, cantidad: p.cantidad })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/admin/stock-pendiente/aplicar — marcar como ya descontados
app.post("/api/app/admin/stock-pendiente/aplicar", async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ error: "Faltan ids" });
    }
    await StockPendiente.updateMany({ _id: { $in: ids } }, { aplicado: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// RUTAS MAYORISTAS — "caja aparte" de la compra normal, mismos productos
// pero con precio con descuento y cantidad mínima por producto
// ════════════════════════════════════════════════════════════════════════════

// GET /api/app/productos-mayorista
app.get("/api/app/productos-mayorista", async (req, res) => {
  try {
    const productos = await ProductoApp.find({ activo: true }).sort({ createdAt: -1 });
    res.json({
      productos: productos.map((p) => ({
        id: p.id_mysql, nombre: p.nombre, marca: p.marca,
        precio_normal: p.precio,
        precio_mayorista: Math.round(p.precio * (1 - DESCUENTO_MAYORISTA)),
        cantidad_minima: CANTIDAD_MINIMA_MAYORISTA,
        stock: p.stock, imagen: p.imagen,
      })),
      descuento: DESCUENTO_MAYORISTA,
      cantidad_minima: CANTIDAD_MINIMA_MAYORISTA,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/carrito-mayorista
app.post("/api/app/carrito-mayorista", async (req, res) => {
  try {
    const { producto_id, producto_nombre, cantidad, precio_unitario, usuario_email, imagen } = req.body || {};
    if (!producto_id || !cantidad || !usuario_email) {
      return res.json({ error: "Faltan datos para agregar al carrito mayorista" });
    }
    if (Number(cantidad) < CANTIDAD_MINIMA_MAYORISTA) {
      return res.json({ error: `La cantidad mínima para compra mayorista es ${CANTIDAD_MINIMA_MAYORISTA} unidades` });
    }
    const item = await CarritoMayorista.create({ producto_id, producto_nombre, cantidad, precio_unitario, usuario_email, imagen });
    res.json({ success: true, mensaje: "Agregado al carrito mayorista", item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/carrito-mayorista?usuario_email=...
app.get("/api/app/carrito-mayorista", async (req, res) => {
  try {
    const filtro = req.query.usuario_email ? { usuario_email: req.query.usuario_email } : {};
    const items = await CarritoMayorista.find(filtro).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/carrito-mayorista-eliminar — sacar un ítem del carrito mayorista
app.post("/api/app/carrito-mayorista-eliminar", async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.json({ error: "Falta el id del ítem" });
    await CarritoMayorista.deleteOne({ _id: id });
    res.json({ success: true, mensaje: "Producto eliminado del carrito mayorista" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/ordenes-mayoristas — checkout mayorista
app.post("/api/app/ordenes-mayoristas", async (req, res) => {
  try {
    const datos = req.body || {};
    if (!datos.usuario_email || !datos.domicilio_envio) {
      return res.json({ error: "Faltan datos para crear la orden mayorista" });
    }
    const itemsCarrito = await CarritoMayorista.find({ usuario_email: datos.usuario_email });
    const total = itemsCarrito.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
    const numero_orden = "MAY-" + Date.now();
    const orden = await OrdenMayorista.create({ ...datos, numero_orden, total });

    // Anotar el stock que hay que descontar en MySQL (se aplica solo
    // cuando alguien visite la web, vía cURL desde PHP — ver
    // config/sync-stock-mayorista.php)
    for (const item of itemsCarrito) {
      const idNum = Number(item.producto_id);
      if (!isNaN(idNum)) {
        await StockPendiente.create({ id_mysql: idNum, cantidad: item.cantidad });
      }
    }

    await CarritoMayorista.deleteMany({ usuario_email: datos.usuario_email });

    // Registrar el ingreso automáticamente en la caja mayorista
    if (total > 0) {
      await CajaMayorista.create({
        tipo: "ingreso",
        categoria: "venta_mayorista",
        descripcion: `Venta mayorista - Pedido ${numero_orden}`,
        monto: total,
      });
    }

    res.json({ success: true, numero_orden, orden });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/app/ordenes-mayoristas?usuario_email=...
app.get("/api/app/ordenes-mayoristas", async (req, res) => {
  try {
    const filtro = req.query.usuario_email ? { usuario_email: req.query.usuario_email } : {};
    const ordenes = await OrdenMayorista.find(filtro).sort({ createdAt: -1 });
    const mapeadas = ordenes.map((o) => ({
      numero_orden: o.numero_orden, estado: o.estado, fecha: o.createdAt, total: o.total,
      tipo: "mayorista",
    }));
    res.json({ ordenes: mapeadas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: Caja Mayorista ───────────────────────────────────────────────
// GET /api/app/admin/caja-mayorista — resumen + historial completo
app.get("/api/app/admin/caja-mayorista", async (req, res) => {
  try {
    const movimientos = await CajaMayorista.find().sort({ createdAt: -1 });
    const total_ingresos = movimientos.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
    const total_egresos = movimientos.filter(m => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0);
    res.json({
      success: true,
      saldo: total_ingresos - total_egresos,
      total_ingresos,
      total_egresos,
      movimientos: movimientos.map(m => ({
        tipo: m.tipo, categoria: m.categoria, descripcion: m.descripcion,
        monto: m.monto, fecha: m.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/app/admin/caja-mayorista — registrar un egreso manual
app.post("/api/app/admin/caja-mayorista", async (req, res) => {
  try {
    const { categoria, monto, descripcion } = req.body || {};
    if (!monto || monto <= 0) return res.json({ error: "Ingresá un monto válido" });
    if (!descripcion) return res.json({ error: "Ingresá una descripción" });
    await CajaMayorista.create({ tipo: "egreso", categoria: categoria || "otro", descripcion, monto });
    res.json({ success: true, mensaje: "Egreso registrado correctamente" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// GET /health
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    mongo:     mongoose.connection.readyState === 1 ? "conectado" : "desconectado",
    timestamp: new Date().toISOString(),
  });
});

// ── ARTÍCULOS DE PROVEEDORES ──────────────────────────────────────────────

// GET /api/articulos
app.get("/api/articulos", async (req, res) => {
  try {
    const filtro = {};
    if (req.query.id_proveedor) filtro.id_proveedor = parseInt(req.query.id_proveedor);
    if (req.query.tipo)         filtro.tipo  = req.query.tipo;
    if (req.query.marca)        filtro.marca = { $regex: req.query.marca, $options: "i" };
    if (req.query.precio_max)   filtro.precio = { ...filtro.precio, $lte: parseFloat(req.query.precio_max) };
    if (req.query.precio_min)   filtro.precio = { ...filtro.precio, $gte: parseFloat(req.query.precio_min) };

    let orden = { createdAt: -1 };
    if (req.query.orden === "precio_asc")  orden = { precio:  1 };
    if (req.query.orden === "precio_desc") orden = { precio: -1 };

    const articulos = await Articulo.find(filtro).sort(orden).lean();
    res.json({ success: true, total: articulos.length, articulos });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener artículos" });
  }
});

// GET /api/articulos/mas-barato
app.get("/api/articulos/mas-barato", async (req, res) => {
  try {
    const filtro = {};
    if (req.query.id_proveedor) filtro.id_proveedor = parseInt(req.query.id_proveedor);
    if (req.query.campo)        filtro.campo = { $regex: req.query.campo, $options: "i" };

    const articulo = await Articulo.findOne(filtro).sort({ precio: 1 }).lean();
    if (!articulo) return res.status(404).json({ error: "No hay artículos" });
    res.json({ success: true, articulo });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener artículo más barato" });
  }
});

// GET /api/articulos/:id
app.get("/api/articulos/:id", async (req, res) => {
  try {
    const articulo = await Articulo.findById(req.params.id).lean();
    if (!articulo) return res.status(404).json({ error: "Artículo no encontrado" });
    res.json({ success: true, articulo });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener artículo" });
  }
});

// POST /api/articulos
app.post("/api/articulos", async (req, res) => {
  try {
    const {
      tipo, marca, condicion, cantidad, precio, id_proveedor, proveedor_nombre,
      // celular
      modelo, color, almacenamiento, ram, bateria, camara,
      // accesorio
      categoria, descripcion, compatible_con,
    } = req.body;

    if (!tipo || !marca || !condicion || !cantidad || precio === undefined || !id_proveedor) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    if (!["celular", "accesorio"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }

    const nuevoArticulo = new Articulo({
      tipo, marca, condicion,
      cantidad:         parseInt(cantidad),
      precio:           parseFloat(precio),
      id_proveedor:     parseInt(id_proveedor),
      proveedor_nombre: proveedor_nombre || "",
      // celular
      modelo:         modelo         || "",
      color:          color          || "",
      almacenamiento: almacenamiento || "",
      ram:            ram            || "",
      bateria:        bateria        ? parseInt(bateria)  : null,
      camara:         camara         ? parseInt(camara)   : null,
      // accesorio
      categoria:      categoria      || "",
      descripcion:    descripcion    || "",
      compatible_con: compatible_con || "",
    });

    await nuevoArticulo.save();
    res.status(201).json({ success: true, mensaje: "Artículo guardado en MongoDB", articulo: nuevoArticulo });
  } catch (err) {
    console.error("Error POST articulo:", err);
    res.status(500).json({ error: "Error al guardar artículo: " + err.message });
  }
});

// DELETE /api/articulos/:id
app.delete("/api/articulos/:id", async (req, res) => {
  try {
    const articulo = await Articulo.findByIdAndDelete(req.params.id);
    if (!articulo) return res.status(404).json({ error: "Artículo no encontrado" });
    res.json({ success: true, mensaje: "Artículo eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar artículo" });
  }
});

// ── RESEÑAS ───────────────────────────────────────────────────────────────

// GET /api/resenas/:producto_id
app.get("/api/resenas/:producto_id", async (req, res) => {
  try {
    const producto_id = parseInt(req.params.producto_id);
    if (isNaN(producto_id)) return res.status(400).json({ error: "producto_id inválido" });

    const resenas = await Resena.find({ producto_id }).sort({ createdAt: -1 }).lean();
    const total   = resenas.length;
    let promedio  = 0;
    let promedioCaracteristicas = { bateria: 0, camara: 0, rendimiento: 0, precio_calidad: 0 };

    if (total > 0) {
      promedio = resenas.reduce((sum, r) => sum + r.puntuacion, 0) / total;
      promedio = Math.round(promedio * 10) / 10;

      const counts = { bateria: 0, camara: 0, rendimiento: 0, precio_calidad: 0 };
      resenas.forEach((r) => {
        if (r.caracteristicas) {
          Object.keys(promedioCaracteristicas).forEach((asp) => {
            if (r.caracteristicas[asp]) {
              promedioCaracteristicas[asp] += r.caracteristicas[asp];
              counts[asp]++;
            }
          });
        }
      });
      Object.keys(promedioCaracteristicas).forEach((asp) => {
        if (counts[asp] > 0) {
          promedioCaracteristicas[asp] = Math.round((promedioCaracteristicas[asp] / counts[asp]) * 10) / 10;
        }
      });
    }
    res.json({ success: true, total, promedio, promedioCaracteristicas, resenas });
  } catch (err) {
    console.error("Error GET reseñas:", err);
    res.status(500).json({ error: "Error al obtener reseñas" });
  }
});

// POST /api/resenas
app.post("/api/resenas", async (req, res) => {
  try {
    const { producto_id, usuario_id, usuario_nombre, puntuacion, titulo, comentario, caracteristicas } = req.body;
    if (!producto_id || !usuario_id || !usuario_nombre || !puntuacion || !comentario) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    if (puntuacion < 1 || puntuacion > 5) return res.status(400).json({ error: "Puntuación debe ser entre 1 y 5" });

    const existe = await Resena.findOne({ producto_id: parseInt(producto_id), usuario_id: parseInt(usuario_id) });
    if (existe) return res.status(409).json({ error: "Ya dejaste una reseña para este producto" });

    const nuevaResena = new Resena({
      producto_id:     parseInt(producto_id),
      usuario_id:      parseInt(usuario_id),
      usuario_nombre,
      puntuacion:      parseInt(puntuacion),
      titulo:          titulo || "",
      comentario,
      caracteristicas: caracteristicas || {},
      util:            0,
    });
    await nuevaResena.save();
    res.status(201).json({ success: true, mensaje: "Reseña publicada correctamente", resena: nuevaResena });
  } catch (err) {
    console.error("Error POST reseña:", err);
    res.status(500).json({ error: "Error al guardar la reseña" });
  }
});

// PUT /api/resenas/:id/util
app.put("/api/resenas/:id/util", async (req, res) => {
  try {
    const resena = await Resena.findByIdAndUpdate(req.params.id, { $inc: { util: 1 } }, { new: true });
    if (!resena) return res.status(404).json({ error: "Reseña no encontrada" });
    res.json({ success: true, mensaje: "Marcado como útil", util: resena.util });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// DELETE /api/resenas/:id
app.delete("/api/resenas/:id", async (req, res) => {
  try {
    const resena = await Resena.findByIdAndDelete(req.params.id);
    if (!resena) return res.status(404).json({ error: "Reseña no encontrada" });
    res.json({ success: true, mensaje: "Reseña eliminada" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar" });
  }
});


// ── SISTEMA EXPERTO: MOTOR DE INFERENCIA LÓGICA ────────────────────────────

// POST /api/recomendar
// Este endpoint procesa las respuestas del cliente y deduce las reglas/filtros técnicos idóneos.
app.post("/api/recomendar", (req, res) => {
  try {
    const { presupuesto, uso_principal, requiere_bateria } = req.body;

    // Validación de entrada
    if (!presupuesto || !uso_principal) {
      return res.status(400).json({ error: "El presupuesto y el uso principal son requeridos" });
    }

    // 1. Inicializamos los filtros técnicos por defecto basados en el presupuesto del cliente
    let filtrosSugeridos = {
      precio_max:  floatval = parseFloat(presupuesto),
      ram_min:     4,
      camara_min:  12,
      bateria_min: 4000,
      procesador:  "media"
    };

    // 2. Motor de Inferencia: Evaluamos las reglas de negocio según el perfil de uso seleccionado
    switch (uso_principal.toLowerCase()) {
      case "gaming":
      case "juegos":
        // REGLA: Si quiere jugar, se exige rendimiento alto, procesador tope y mínimo 8GB de RAM
        filtrosSugeridos.ram_min = 8;
        filtrosSugeridos.procesador = "alta";
        break;

      case "fotografia":
      case "fotos":
        // REGLA: Si busca fotografía, se priorizan sensores avanzados de alta resolución (mínimo 48MP)
        filtrosSugeridos.camara_min = 48;
        filtrosSugeridos.ram_min = 6; // Se sube la RAM para procesamiento de imágenes complejas
        break;

      case "redes":
      case "basico":
        // REGLA: Para tareas básicas (redes sociales, llamadas), se mantienen parámetros estándar para optimizar costo
        filtrosSugeridos.ram_min = 4;
        filtrosSugeridos.procesador = "media";
        break;
        
      default:
        // Caso preventivo: Perfil equilibrado estándar
        filtrosSugeridos.ram_min = 4;
        break;
    }

    // 3. Regla Condicional Cruzada: Evaluar autonomía si el usuario lo requiere expresamente
    if (requiere_bateria === true || requiere_bateria === "si") {
      filtrosSugeridos.bateria_min = 4500; // Forzamos una batería de larga duración en los resultados
    }

    // 4. Respondemos al Frontend con las directivas calculadas por el Sistema Experto
    res.json({
      success: true,
      mensaje: "Perfil evaluado por el sistema experto con éxito",
      filtros: filtrosSugeridos
    });

  } catch (err) {
    console.error("Error en Sistema Experto (Render):", err);
    res.status(500).json({ error: "Error interno en el motor de inferencia lítica" });
  }
});


// POST /api/gemini
// Recibe el catálogo de productos + historial + mensaje desde el frontend
// y llama a la API de Groq, devolviendo la respuesta al cliente.
app.post("/api/gemini", async (req, res) => {
  try {
    const { catalogo, historial, mensaje } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "API key de Groq no configurada" });
    }

    // ── Extraer presupuesto del mensaje o historial para filtrarlo en el servidor ──
    function extraerPresupuesto(textos) {
      const combined = textos.join(" ");
      const m = combined.match(/\b(\d{2,4}(?:[.,]\d{3})*)\s*(?:pesos?|peso|\$)?/gi);
      if (!m) return null;
      for (const match of m) {
        const num = parseInt(match.replace(/[.,]/g, "").replace(/[^0-9]/g, ""));
        if (num >= 50000 && num <= 5000000) return num;
      }
      return null;
    }

    const textosHistorial = Array.isArray(historial) ? historial.map(t => t.text || "") : [];
    const presupuesto = extraerPresupuesto([mensaje, ...textosHistorial]);

    // ── Filtrar catálogo por presupuesto antes de mandarlo a la IA ──
    let catalogoFiltrado = catalogo || "";
    if (presupuesto && catalogoFiltrado) {
      const lineas = catalogoFiltrado.split("\n");
      const dentro = [];
      const fuera  = [];
      lineas.forEach(linea => {
        const mPrecio = linea.match(/Precio:\s*\$([\.\d]+)/);
        if (mPrecio) {
          const precio = parseInt(mPrecio[1].replace(/\./g, ""));
          if (precio <= presupuesto) dentro.push(linea);
          else fuera.push(linea);
        } else if (linea.trim()) {
          dentro.push(linea);
        }
      });
      catalogoFiltrado = dentro.join("\n");
      if (fuera.length > 0) {
        catalogoFiltrado += `\n\n[PRODUCTOS FUERA DE PRESUPUESTO - NO RECOMENDAR: ${fuera.map(l => l.split("|")[0].trim()).join(", ")}]`;
      }
    }

    const systemPrompt = `Sos el asistente virtual de CeluStore, una tienda de celulares en Argentina.

REGLA #1 - CATALOGO:
Solo podés recomendar productos que estén en el CATALOGO listado abajo.
PROHIBIDO mencionar productos que no aparezcan en ese catalogo.
Si el cliente pide algo que no existe, decile honestamente que no tenes ese producto.
Usa UNICAMENTE los nombres, precios y datos que figuran en el catalogo. No inventes especificaciones.

REGLA #2 - PRESUPUESTO (CRITICA, NO NEGOCIABLE):
${presupuesto ? `El cliente tiene un presupuesto de $${presupuesto.toLocaleString("es-AR")} pesos.
SOLO podés recomendar productos con precio MENOR O IGUAL a $${presupuesto.toLocaleString("es-AR")}.
Los productos marcados como [PRODUCTOS FUERA DE PRESUPUESTO] tienen precio MAYOR al presupuesto: NUNCA los recomiendes.
Si no hay productos dentro del presupuesto, decíselo claramente.` : `Si el cliente menciona un presupuesto, SOLO recomendá productos con precio menor o igual a ese monto.`}

REGLA #3 - COMPARACIONES:
Cuando el cliente pida comparar productos, hacé una tabla clara con los datos reales del catálogo:
- Precio, Batería (mAh), RAM, Almacenamiento, Cámara (MP), Pantalla, AnTuTu Score, Camera Score
- Al final destacá cuál es mejor para el uso específico que describió el cliente y por qué.
- Nunca inventes datos que no estén en el catálogo.

OTRAS REGLAS:
- Explicá por qué cada producto le sirve a ESE cliente según lo que contó.
- Si falta info, hacé UNA sola pregunta puntual.
- Precios en pesos argentinos, formato $X.XXX.XXX.
- Al recomendar incluí [ID:XX] para que el sistema muestre la tarjeta. Hasta 3 productos.
- Lenguaje informal argentino (vos, te, etc.).

CATALOGO ACTUAL EN STOCK:
${catalogoFiltrado}`;

    // Armar mensajes para Groq (formato OpenAI compatible)
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(historial)) {
      historial.forEach((turno) => {
        messages.push({
          role:    turno.role === "user" ? "user" : "assistant",
          content: turno.text,
        });
      });
    }

    messages.push({ role: "user", content: mensaje });

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       "openai/gpt-oss-120b",
        messages,
        temperature: 0.4,
        max_tokens:  2048,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Error Groq:", groqRes.status, errText);
      return res.status(502).json({ error: "Error al conectar con Groq: " + groqRes.status });
    }

    const data  = await groqRes.json();
    const texto = data?.choices?.[0]?.message?.content || "";

    if (!texto) {
      return res.status(502).json({ error: "Respuesta vacía de Groq" });
    }

    res.json({ respuesta: texto });

  } catch (err) {
    console.error("Error en /api/gemini:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// ── SCORES NANOREVIEW ─────────────────────────────────────────────────────
// POST /api/scores
// Recibe { marca, nombre } y devuelve { antutu, dxomark } scrapeando nanoreview.net
// Se llama desde el admin de InfinityFree que no puede hacer requests externos.

app.post("/api/scores", async (req, res) => {
  const { marca = "", nombre = "" } = req.body;

  if (!marca && !nombre) {
    return res.status(400).json({ error: "Faltan marca y nombre" });
  }

  // ── Construir slugs posibles ──────────────────────────────────────────
  function buildSlug(m, n) {
    return (m + " " + n)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  const slugs = [buildSlug(marca, nombre)];
  // Si el nombre ya incluye la marca (ej: "Samsung Galaxy A17"), probar sin marca
  if (nombre.toLowerCase().includes(marca.toLowerCase())) {
    slugs.push(buildSlug("", nombre));
  }
  // Solo primera palabra de la marca
  const primeraMarca = marca.split(" ")[0];
  if (primeraMarca !== marca) slugs.push(buildSlug(primeraMarca, nombre));

  // ── Fetch Nanoreview ──────────────────────────────────────────────────
  async function fetchNanoreview(slug) {
    const url = `https://nanoreview.net/en/phone/${slug}`;
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept":     "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return null;
      const html = await r.text();
      // Verificar que es página de un celular real
      if (!html.includes("AnTuTu") && !html.includes("NanoReview Score")) return null;
      return html;
    } catch {
      return null;
    }
  }

  // ── Parsear scores del HTML ───────────────────────────────────────────
  function parsearScores(html) {
    let antutu = null;
    let camara = null;

    // AnTuTu: "AnTuTu Benchmark 11\n\n3323591"
    let m = html.match(/AnTuTu\s+Benchmark\s+\d+\s*[\r\n\s]+([\d,]+)/i);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""));
      if (n > 100000 && n < 5000000) antutu = n;
    }
    // AnTuTu fallback: "Total score | 3323591"
    if (!antutu) {
      m = html.match(/Total\s+score\s*[|:]\s*([\d,]+)/i);
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ""));
        if (n > 100000 && n < 5000000) antutu = n;
      }
    }
    // AnTuTu fallback 2: número de 6-7 dígitos cerca de "AnTuTu"
    if (!antutu) {
      const pos = html.indexOf("AnTuTu");
      if (pos !== -1) {
        const frag = html.slice(pos, pos + 500);
        m = frag.match(/\b(\d{6,7})\b/);
        if (m) {
          const n = parseInt(m[1]);
          if (n > 100000 && n < 5000000) antutu = n;
        }
      }
    }

    // Camera score
    // Nanoreview puede tener el número con o sin asterisco:
    //   <span class="score-bar-result-square">90</span>
    //   <span class="score-bar-result-square">90*</span>  <- score aproximado
    //
    // Estrategia: encontrar todas las ocurrencias de ">Camera<" en el HTML,
    // tomar 600 chars adelante, cortar antes del próximo score-bar-name
    // (para no mezclar con Gaming u otros scores), y extraer el número.
    // El regex es permisivo: acepta cualquier char no-< entre el número y </span>.
    {
      const re = />\s*Camera\s*<\/div>/gi;
      let camMatch;
      while ((camMatch = re.exec(html)) !== null && !camara) {
        const frag = html.slice(camMatch.index, camMatch.index + 600);
        const nextName = frag.search(/score-bar-name/i);
        const searchIn = nextName > 20 ? frag.slice(0, nextName) : frag;

        // Caso 1 — score-bar-result-square (Samsung, Vivo, etc.)
        //   <span class="score-bar-result-square">93</span>
        const mCam1 = searchIn.match(/score-bar-result-square[^>]*>\s*(\d{2,3})[^<]*<\/span>/i);
        if (mCam1) {
          const n = parseInt(mCam1[1]);
          if (n >= 20 && n <= 100) { camara = n; break; }
        }

        // Caso 2 — score-bar-result-number-review (Xiaomi, iPhone, etc.)
        //   <span class="score-bar-result-number-review"> <span style="">90</span>
        const mCam2 = searchIn.match(/score-bar-result-number-review[^>]*>[\s\S]{0,50}?<span[^>]*>\s*(\d{2,3})\s*<\/span>/i);
        if (mCam2) {
          const n = parseInt(mCam2[1]);
          if (n >= 20 && n <= 100) { camara = n; break; }
        }
      }
    }
    // Último fallback global — cualquiera de las dos clases
    if (!camara) {
      const mFallback = html.match(/Camera[\s\S]{1,500}?(?:score-bar-result-square|score-bar-result-number-review)[^>]*>[\s\S]{0,80}?(\d{2,3})[^<]*<\/span>/i);
      if (mFallback) {
        const n = parseInt(mFallback[1]);
        if (n >= 20 && n <= 100) camara = n;
      }
    }

    return { antutu, dxomark: camara };
  }

  // ── Intentar cada slug ────────────────────────────────────────────────
  let html = null;
  let slugUsado = null;

  for (const slug of [...new Set(slugs)]) {
    html = await fetchNanoreview(slug);
    if (html) { slugUsado = slug; break; }
  }

  if (!html) {
    return res.json({
      antutu:   null,
      dxomark:  null,
      mensaje:  `No encontrado en Nanoreview. Verificá en: nanoreview.net/en/phone/${slugs[0]}`,
      slugs_intentados: slugs,
    });
  }

  const scores = parsearScores(html);
  scores.slug = slugUsado;
  scores.url  = `https://nanoreview.net/en/phone/${slugUsado}`;

  // ── DEBUG TEMPORAL ────────────────────────────────────────────────────
  const camIdx = html.search(/Camera/i);
  if (camIdx !== -1) {
    console.log("[DEBUG] HTML alrededor de 'Camera' (300 chars):");
    console.log(JSON.stringify(html.slice(Math.max(0, camIdx - 100), camIdx + 400)));
  } else {
    console.log("[DEBUG] 'Camera' NO encontrado en el HTML");
  }
  // Buscar score-bar-result-square cerca de Camera
  const camBlockIdx = html.search(/>\s*Camera\s*<\/div>/i);
  if (camBlockIdx !== -1) {
    console.log("[DEBUG] Bloque Camera tag (600 chars adelante):");
    console.log(JSON.stringify(html.slice(camBlockIdx, camBlockIdx + 600)));
  }
  console.log("[DEBUG] scores resultado:", JSON.stringify(scores));
  // ─────────────────────────────────────────────────────────────────────

  res.json(scores);
});


// ═══════════════════════════════════════════════════════════════════════
// PROXY hacia InfinityFree (MySQL)
// ═══════════════════════════════════════════════════════════════════════
// La app NUNCA le habla directo a InfinityFree (lo bloquea porque no
// viene "de un navegador"). En cambio, le habla a ESTE endpoint, y
// este servidor (Render) reenvía el pedido servidor-a-servidor, sin
// pasar por el bloqueo (InfinityFree no distingue esto de cualquier
// otro tráfico normal de servidor).
//
// También reenvía la cookie de sesión de PHP en los dos sentidos, para
// que el login siga funcionando igual que antes.
// ═══════════════════════════════════════════════════════════════════════
const INFINITYFREE_BASE = "https://celustore.66ghz.com/api";

app.all("/api/mysql/*", async (req, res) => {
  try {
    const ruta = req.params[0]; // ej: 'auth/login.php'
    const queryString = req.originalUrl.split("?")[1];
    const url = `${INFINITYFREE_BASE}/${ruta}${queryString ? "?" + queryString : ""}`;

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      "Referer": "https://celustore.66ghz.com/",
    };
    if (req.headers.cookie) headers["Cookie"] = req.headers.cookie;

    const opciones = { method: req.method, headers };
    if (!["GET", "HEAD"].includes(req.method)) {
      opciones.body = JSON.stringify(req.body || {});
    }

    // Timeout explícito: si InfinityFree no responde en 25s, cortamos
    // (mejor un error claro que dejar la petición colgada para siempre)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    opciones.signal = controller.signal;

    let resp;
    try {
      resp = await fetch(url, opciones);
    } catch (e) {
      clearTimeout(timer);
      const motivo = e.name === "AbortError" ? "InfinityFree no respondió a tiempo (timeout)" : e.message;
      return res.status(502).json({ error: "No se pudo conectar con InfinityFree: " + motivo });
    }
    clearTimeout(timer);

    // Reenviamos la cookie de sesión de PHP, pero sacándole el "Domain"
    // (así el navegador/WebView la guarda como cookie de ESTE dominio,
    // ya que la app nunca habla directo con InfinityFree)
    const setCookie = typeof resp.headers.getSetCookie === "function" ? resp.headers.getSetCookie() : [];
    if (setCookie.length) {
      const reescritas = setCookie.map((c) => c.replace(/;\s*Domain=[^;]+/i, ""));
      res.setHeader("Set-Cookie", reescritas);
    }

    const texto = await resp.text();

    // Si InfinityFree (o algo en el medio) no devolvió JSON, no lo
    // mandamos como si lo fuera — eso rompe la app en silencio.
    let esJsonValido = true;
    try { JSON.parse(texto); } catch { esJsonValido = false; }

    if (!esJsonValido) {
      console.error("InfinityFree devolvió algo que no es JSON:", texto.slice(0, 300));
      return res.status(502).json({
        error: "InfinityFree devolvió una respuesta inesperada (no-JSON). Puede ser un bloqueo temporal del hosting.",
        _statusOriginal: resp.status,
      });
    }

    res.status(resp.status);
    res.type("application/json");
    res.send(texto);
  } catch (e) {
    console.error("Error en proxy MySQL:", e);
    res.status(502).json({ error: "No se pudo conectar con el servidor de datos: " + e.message });
  }
});

// GET /health — endpoint liviano para el ping externo (cron-job.org) que
// mantiene despierta la API en Render. No toca la base de datos, así
// que es lo más barato posible para pegarle cada 10 minutos.
app.get("/health", (req, res) => {
  res.json({ ok: true, hora: new Date().toISOString() });
});

// ── Inicio servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CeluStore API corriendo en puerto ${PORT}`);
});
