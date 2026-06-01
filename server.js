require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ── Conexión MongoDB Atlas ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas conectado"))
  .catch((err) => console.error("❌ Error MongoDB:", err));

// ── Schema Reseña ────────────────────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
// RUTAS
// ════════════════════════════════════════════════════════════════════════════

// GET /health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "conectado" : "desconectado",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/resenas/:producto_id
app.get("/api/resenas/:producto_id", async (req, res) => {
  try {
    const producto_id = parseInt(req.params.producto_id);
    if (isNaN(producto_id)) {
      return res.status(400).json({ error: "producto_id inválido" });
    }

    const resenas = await Resena.find({ producto_id })
      .sort({ createdAt: -1 })
      .lean();

    const total = resenas.length;
    let promedio = 0;
    let promedioCaracteristicas = {
      bateria: 0, camara: 0, rendimiento: 0, precio_calidad: 0,
    };

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
          promedioCaracteristicas[asp] =
            Math.round((promedioCaracteristicas[asp] / counts[asp]) * 10) / 10;
        }
      });
    }

    res.json({ success: true, total, promedio, promedioCaracteristicas, resenas });
  } catch (err) {
    console.error("Error GET reseñas:", err);
    res.status(500).json({ error: "Error al obtener reseñas" });
  }
});

// POST /api/resenas — recibe datos verificados desde InfinityFree
app.post("/api/resenas", async (req, res) => {
  try {
    const { producto_id, usuario_id, usuario_nombre, puntuacion, titulo, comentario, caracteristicas } = req.body;

    if (!producto_id || !usuario_id || !usuario_nombre || !puntuacion || !comentario) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    if (puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({ error: "Puntuación debe ser entre 1 y 5" });
    }

    // Verificar reseña duplicada
    const existe = await Resena.findOne({
      producto_id: parseInt(producto_id),
      usuario_id:  parseInt(usuario_id),
    });
    if (existe) {
      return res.status(409).json({ error: "Ya dejaste una reseña para este producto" });
    }

    const nuevaResena = new Resena({
      producto_id:     parseInt(producto_id),
      usuario_id:      parseInt(usuario_id),
      usuario_nombre:  usuario_nombre,
      puntuacion:      parseInt(puntuacion),
      titulo:          titulo || "",
      comentario:      comentario,
      caracteristicas: caracteristicas || {},
      util:            0,
    });

    await nuevaResena.save();

    res.status(201).json({
      success: true,
      mensaje: "Reseña publicada correctamente",
      resena:  nuevaResena,
    });
  } catch (err) {
    console.error("Error POST reseña:", err);
    res.status(500).json({ error: "Error al guardar la reseña" });
  }
});

// PUT /api/resenas/:id/util
app.put("/api/resenas/:id/util", async (req, res) => {
  try {
    const resena = await Resena.findByIdAndUpdate(
      req.params.id,
      { $inc: { util: 1 } },
      { new: true }
    );
    if (!resena) {
      return res.status(404).json({ error: "Reseña no encontrada" });
    }
    res.json({ success: true, mensaje: "Marcado como útil", util: resena.util });
  } catch (err) {
    console.error("Error PUT util:", err);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// DELETE /api/resenas/:id
app.delete("/api/resenas/:id", async (req, res) => {
  try {
    const resena = await Resena.findByIdAndDelete(req.params.id);
    if (!resena) {
      return res.status(404).json({ error: "Reseña no encontrada" });
    }
    res.json({ success: true, mensaje: "Reseña eliminada" });
  } catch (err) {
    console.error("Error DELETE reseña:", err);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

// ── Inicio servidor ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CeluStore API corriendo en puerto ${PORT}`);
});