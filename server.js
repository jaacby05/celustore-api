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

    const systemPrompt = `Sos el asistente virtual de CeluStore, una tienda de celulares en Argentina.

REGLA ABSOLUTA - MUY IMPORTANTE:
Solo podés recomendar productos que estén EXACTAMENTE en el CATALOGO listado abajo.
PROHIBIDO mencionar, sugerir o inventar cualquier producto que NO aparezca en ese catalogo.
Si el cliente pide algo que no existe en el catalogo, decile honestamente que no tenes ese producto.
Usa UNICAMENTE los nombres, precios y datos que figuran en el catalogo. No inventes especificaciones.
Si recomendas un producto, los datos que des DEBEN coincidir exactamente con los del catalogo.

OTRAS REGLAS:
- Cuando recomiendes un producto del catalogo, explica por que le sirve a ESE cliente segun lo que conto.
- Si el cliente no dio suficiente info, hace UNA sola pregunta puntual.
- Los precios estan en pesos argentinos, formato $X.XXX.XXX.
- Cuando recomiendes, incluí el ID en formato [ID:XX] para que el sistema lo muestre. Hasta 3 productos.
- Usa lenguaje informal argentino (vos, te, etc.).

CATALOGO ACTUAL EN STOCK (SOLO ESTOS PRODUCTOS EXISTEN, NO INVENTES OTROS):
${catalogo || "Sin productos disponibles - informa al cliente que no hay stock."}`;

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
        model:       "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
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

    // DEBUG — ver fragmento alrededor de cada "Camera" en el HTML
    let dbgPos = 0;
    let dbgCount = 0;
    while (dbgCount < 5) {
      const p = html.indexOf("Camera", dbgPos);
      if (p === -1) break;
      console.log(`DEBUG Camera[${dbgCount}] pos=${p}:`, JSON.stringify(html.slice(p, p + 50)));
      dbgPos = p + 1;
      dbgCount++;
    }

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

    // Camera score: está en la sección "## Review" como "Camera\n\n 90*"
    // Hay que saltear el meta description que también tiene "camera"
    // Buscamos específicamente después de "## Review" o "Review"
    let htmlReview = html;
    const posReview = html.indexOf("## Review");
    if (posReview !== -1) htmlReview = html.slice(posReview, posReview + 600);

    // Buscar "Camera" seguido de saltos de línea y número (con posible espacio y asterisco)
    m = htmlReview.match(/\bCamera\b[\r\n\s]{1,10}(\d{2,3})\*?/);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 30 && n <= 100) camara = n;
    }

    // Fallback: buscar todas las ocurrencias de "Camera" y tomar la que tenga número cerca
    if (!camara) {
      let searchFrom = 0;
      while (true) {
        const pos = html.indexOf("Camera", searchFrom);
        if (pos === -1) break;
        const frag = html.slice(pos, pos + 30);
        const numMatch = frag.match(/Camera[\r\n\s]{1,5}(\d{2,3})\*?/);
        if (numMatch) {
          const n = parseInt(numMatch[1]);
          if (n >= 30 && n <= 100) { camara = n; break; }
        }
        searchFrom = pos + 1;
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

  res.json(scores);
});


// ── Inicio servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CeluStore API corriendo en puerto ${PORT}`);
});
