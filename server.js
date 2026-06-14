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


// ── GEMINI PROXY ──────────────────────────────────────────────────────────

// POST /api/gemini
// Recibe el catálogo de productos + historial + mensaje desde chat.php (InfinityFree)
// y llama a la API de Gemini, devolviendo la respuesta al cliente.
app.post("/api/gemini", async (req, res) => {
  try {
    const { catalogo, historial, mensaje } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "API key de Gemini no configurada" });
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `Sos el asistente virtual experto de CeluStore, una tienda de celulares y accesorios en Argentina.
Tu trabajo es ayudar a los clientes a elegir el mejor producto según sus necesidades reales.

REGLAS IMPORTANTES:
1. Solo podés recomendar productos que estén en el catálogo de abajo. Nunca inventes productos.
2. Cuando recomiendes un celular, explicá SIEMPRE por qué ese modelo específico le sirve a ESE cliente, basándote en lo que te contó. No des respuestas genéricas.
3. Si el cliente no te dio suficiente información, hacé UNA sola pregunta puntual para entenderlo mejor. No bombardees con muchas preguntas a la vez.
4. Al inicio de la conversación, saludá brevemente y hacé 2 preguntas básicas: para qué lo va a usar y cuánto tiene de presupuesto aproximado.
5. Los precios están en pesos argentinos. Cuando los menciones, usá el formato $X.XXX.XXX.
6. Si el cliente menciona un uso específico (gaming, fotos, trabajo, redes sociales, etc.), priorizá las specs relevantes para ese uso.
7. Cuando recomendés un producto, incluí su ID en el formato [ID:XX] al final para que el sistema pueda mostrarlo. Podés recomendar hasta 3 productos.
8. Sé amigable, directo y usá lenguaje informal (vos, te, etc.) como se habla en Argentina.
9. Si el cliente pregunta por accesorios, también podés recomendarlos del catálogo.
10. Si no hay ningún producto que se adapte al presupuesto o necesidad, decilo honestamente.

CATÁLOGO ACTUAL EN STOCK:
${catalogo || "Sin productos disponibles"}`;

    // Armar contenido para Gemini
    const contents = [
      { role: "user",  parts: [{ text: "Instrucciones del sistema:\n" + systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido. Estoy listo para ayudar a los clientes de CeluStore." }] },
    ];

    // Agregar historial previo
    if (Array.isArray(historial)) {
      historial.forEach((turno) => {
        contents.push({
          role:  turno.role === "user" ? "user" : "model",
          parts: [{ text: turno.text }],
        });
      });
    }

    // Mensaje actual
    contents.push({ role: "user", parts: [{ text: mensaje }] });

    const geminiRes = await fetch(GEMINI_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Error Gemini:", geminiRes.status, errText);
      return res.status(502).json({ error: "Error al conectar con Gemini: " + geminiRes.status });
    }

    const data   = await geminiRes.json();
    const texto  = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!texto) {
      return res.status(502).json({ error: "Respuesta vacía de Gemini" });
    }

    res.json({ respuesta: texto });

  } catch (err) {
    console.error("Error en /api/gemini:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// ── Inicio servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CeluStore API corriendo en puerto ${PORT}`);
});
