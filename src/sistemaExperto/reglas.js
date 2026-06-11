// src/sistemaExperto/reglas.js

// Definimos los perfiles lógicos basados en las necesidades del cliente
const reglasPerfiles = {
    gaming: {
        ramMinima: 8,
        almacenamientoMinimo: 128,
        procesadorRequerido: ['Snapdragon', 'Dimensity', 'Apple A']
    },
    fotografia: {
        camaraMinimaMP: 48,
        ramMinima: 6
    },
    basico: {
        ramMinima: 4,
        bateriaMinimaMAh: 4000
    }
};

module.exports = { reglasPerfiles };
