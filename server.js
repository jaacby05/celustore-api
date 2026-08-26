// ═══════════════════════════════════════════════════════════════════════
// PAGE: CARRITO (único — normal + mayorista juntos)
// ═══════════════════════════════════════════════════════════════════════
// Un solo "Carrito" en el menú, que muestra las dos secciones (compra
// normal y compra mayorista) una debajo de la otra. Así el swipe entre
// pestañas siempre lleva al mismo lugar, sin depender de en qué sección
// estabas parado antes.
// ═══════════════════════════════════════════════════════════════════════

Router.on("/carrito", async ({ vigente }) => {
  const view = document.getElementById("app-view");
  view.innerHTML = Layout.navbar("carrito") + `<div class="container"><div class="loader">Cargando…</div></div>`;
  Layout.activarNavbar();

  const usuario = await usuarioActual();
  if (!vigente()) return;
  const email = usuario?.email || "invitado";

  const [dataNormal, dataMayorista] = await Promise.all([
    Api.get("mysql", `carrito?usuario_email=${encodeURIComponent(email)}`, { cacheKey: "carrito_actual" }),
    Api.get("mysql", `carrito-mayorista?usuario_email=${encodeURIComponent(email)}`, { cacheKey: "carrito_mayorista_actual" }),
  ]);
  if (!vigente()) return;

  const itemsNormal = dataNormal.items || [];
  const itemsMayorista = dataMayorista.items || [];
  const pendientesNormal = (await DB.obtenerPendientes()).filter((p) => p.endpoint === "carrito");
  const pendientesMayorista = (await DB.obtenerPendientes()).filter((p) => p.endpoint === "carrito-mayorista");
  if (!vigente()) return;

  const cont = document.querySelector("#app-view .container");
  const totalNormal = itemsNormal.reduce((s, i) => s + (i.precio * i.cantidad), 0);
  const totalMayorista = itemsMayorista.reduce((s, i) => s + (i.precio_unitario * i.cantidad), 0);

  const hayAlgoNormal = itemsNormal.length > 0 || pendientesNormal.length > 0;
  const hayAlgoMayorista = itemsMayorista.length > 0 || pendientesMayorista.length > 0;

  if (!hayAlgoNormal && !hayAlgoMayorista) {
    cont.innerHTML = `<div class="empty-state"><p>Tu carrito está vacío.</p><a href="#/productos" class="btn-primary">Ver productos</a></div>`;
    return;
  }

  const seccionNormal = !hayAlgoNormal ? "" : `
    <h2>Tu carrito</h2>
    ${dataNormal._offline ? `<div class="offline-banner-productos">📦 Mostrando el carrito guardado (sin conexión)</div>` : ""}
    <div class="lista-carrito">
      ${itemsNormal.map(i => `
        <div class="item-carrito">
          <img src="${i.imagen || 'img/placeholder.svg'}" onerror="this.src='img/placeholder.svg'">
          <div class="item-carrito-info">
            <strong>${i.producto_nombre}</strong>
            <span>${i.cantidad} × $${Number(i.precio || 0).toLocaleString("es-AR")}</span>
          </div>
          <button class="btn-eliminar-item" data-id="${i._id}" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `).join("")}
      ${pendientesNormal.map(p => `
        <div class="item-carrito item-pendiente">
          <div class="item-carrito-info">
            <strong>${p.descripcion || "Producto"}</strong>
            <span class="badge-pendiente">📴 Pendiente de sincronizar</span>
          </div>
        </div>`).join("")}
    </div>
    <div class="carrito-total">
      <span>Subtotal (confirmado)</span>
      <strong>$${totalNormal.toLocaleString("es-AR")}</strong>
    </div>
    ${pendientesNormal.length > 0 ? `<p class="muted">Hay ${pendientesNormal.length} producto(s) que se sumarán al confirmar la sincronización.</p>` : ""}
    <a href="#/checkout" class="btn-primary btn-block">Continuar a checkout</a>
  `;

  const seccionMayorista = !hayAlgoMayorista ? "" : `
    <h2 class="carrito-seccion-mayorista"><i class="fas fa-boxes-stacked"></i> Carrito mayorista</h2>
    ${dataMayorista._offline ? `<div class="offline-banner-productos">📦 Mostrando el carrito guardado (sin conexión)</div>` : ""}
    <div class="lista-carrito">
      ${itemsMayorista.map(i => `
        <div class="item-carrito">
          <img src="${i.imagen || 'img/placeholder.svg'}" onerror="this.src='img/placeholder.svg'">
          <div class="item-carrito-info">
            <strong>${i.producto_nombre}</strong>
            <span>${i.cantidad} × $${Number(i.precio_unitario || 0).toLocaleString("es-AR")}</span>
          </div>
          <button class="btn-eliminar-item btn-eliminar-item-mayorista" data-id="${i._id}" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `).join("")}
      ${pendientesMayorista.map(p => `
        <div class="item-carrito item-pendiente">
          <div class="item-carrito-info">
            <strong>${p.descripcion || "Producto"}</strong>
            <span class="badge-pendiente">📴 Pendiente de sincronizar</span>
          </div>
        </div>`).join("")}
    </div>
    <div class="carrito-total">
      <span>Subtotal mayorista (confirmado)</span>
      <strong>$${totalMayorista.toLocaleString("es-AR")}</strong>
    </div>
    ${pendientesMayorista.length > 0 ? `<p class="muted">Hay ${pendientesMayorista.length} producto(s) que se sumarán al confirmar la sincronización.</p>` : ""}
    <a href="#/checkout-mayorista" class="btn-primary btn-block">Continuar a checkout mayorista</a>
  `;

  cont.innerHTML = `
    ${seccionNormal}
    ${hayAlgoNormal && hayAlgoMayorista ? `<hr class="carrito-separador">` : ""}
    ${seccionMayorista}
  `;

  document.querySelectorAll(".btn-eliminar-item:not(.btn-eliminar-item-mayorista)").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
      try {
        const res = await Api.post("mysql", "carrito-eliminar", { id }, { descripcion: "Eliminar producto del carrito" });
        UI.toast(res._offline ? "Se eliminará cuando vuelva la conexión" : "Producto eliminado");
        Router.render();
      } catch (e) {
        UI.toast("❌ " + e.message);
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-trash"></i>`;
      }
    };
  });

  document.querySelectorAll(".btn-eliminar-item-mayorista").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
      try {
        const res = await Api.post("mysql", "carrito-mayorista-eliminar", { id }, { descripcion: "Eliminar producto del carrito mayorista" });
        UI.toast(res._offline ? "Se eliminará cuando vuelva la conexión" : "Producto eliminado");
        Router.render();
      } catch (e) {
        UI.toast("❌ " + e.message);
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-trash"></i>`;
      }
    };
  });
});
