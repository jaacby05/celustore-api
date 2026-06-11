require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

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
    denominacion: { type: String, required: true },
    precio:       { type: Number, required: true },
    cantidad:     { type: Number, required: true },
    campo:        { type: String, required: true },
    id_proveedor: { type: Number, required: true },
  },
  { timestamps: true }
);
const Articulo = mongoose.model("Articulo", articuloSchema, "articulos_proveedores");


// ════════════════════════════════════════════════════════════════════════════
// RUTAS
// ════════════════════════════════════════════════════════════════════════════

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
    if (req.query.campo)        filtro.campo = { $regex: req.query.campo, $options: "i" };
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
    const { denominacion, precio, cantidad, campo, id_proveedor } = req.body;
    if (!denominacion || precio === undefined || cantidad === undefined || !campo || !id_proveedor) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    const nuevoArticulo = new Articulo({
      denominacion,
      precio:       parseFloat(precio),
      cantidad:     parseInt(cantidad),
      campo,
      id_proveedor: parseInt(id_proveedor),
    });
    await nuevoArticulo.save();
    res.status(201).json({ success: true, mensaje: "Artículo guardado en MongoDB", articulo: nuevoArticulo });
  } catch (err) {
    console.error("Error POST articulo:", err);
    res.status(500).json({ error: "Error al guardar artículo" });
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


// ── Inicio servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CeluStore API corriendo en puerto ${PORT}`);
});
