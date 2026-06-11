// src/sistemaExperto/motor.js
const { reglasPerfiles } = require('./reglas');

function evaluarRespuestas(datosUsuario) {
    const { presupuesto, usoPrincipal, requiereBateria } = datosUsuario;
    
    // 1. Regla base universal: No pasarse del presupuesto del cliente
    let filtrosBaseDeDatos = {
        precio: { $lte: parseFloat(presupuesto) }
    };

    // 2. El motor evalúa el uso principal usando las reglas predefinidas
    const perfilSugerido = reglasPerfiles[usoPrincipal] || reglasPerfiles.basico;

    // Aplicamos las sub-reglas del perfil al filtro de la búsqueda
    if (perfilSugerido.ramMinima) {
        filtrosBaseDeDatos.ram = { $gte: perfilSugerido.ramMinima };
    }
    if (perfilSugerido.camaraMinimaMP) {
        filtrosBaseDeDatos.camara_mp = { $gte: perfilSugerido.camaraMinimaMP };
    }

    // 3. Regla especial: Si el usuario marcó que la batería es vital
    if (requiereBateria === true || requiereBateria === 'si') {
        filtrosBaseDeDatos.bateria_mah = { $gte: 5000 }; // Exigimos mínimo 5000mAh
    }

    // Devolvemos el filtro optimizado listo para buscar en MongoDB/MySQL
    return filtrosBaseDeDatos;
}

module.exports = { evaluarRespuestas };
