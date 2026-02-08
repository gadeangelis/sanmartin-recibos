const CLAVE_CORRECTA = "2026";

// SEGURIDAD
function verificarClave() {
    const input = document.getElementById('input-clave').value;
    if (input === CLAVE_CORRECTA) {
        sessionStorage.setItem('accesoPermitido', 'true');
        document.getElementById('pantalla-login').style.display = 'none';
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('accesoPermitido') === 'true') {
        const p = document.getElementById('pantalla-login');
        if(p) p.style.display = 'none';
    }
});

// MODAL INTELIGENTE
function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const msgTxt = document.getElementById('modal-mensaje');
    const btnConf = document.getElementById('btn-confirmar');
    const btnCanc = document.getElementById('btn-cancelar');
    
    const esExito = mensaje.includes("correctamente") || mensaje.includes("guardado");
    
    msgTxt.innerText = mensaje;
    btnConf.innerText = esExito ? "Aceptar" : "Eliminar";
    btnConf.className = esExito ? "btn btn-primary w-100" : "btn btn-danger w-100";
    btnCanc.style.display = esExito ? 'none' : 'inline-block';
    
    modal.style.display = 'flex';
    btnConf.onclick = () => { if(accionConfirmada) accionConfirmada(); modal.style.display = 'none'; };
    btnCanc.onclick = () => { modal.style.display = 'none'; };
}

// FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyALepfLTXEL3w-BRpzrRwFCS5-A-Varu4o",
    authDomain: "recibos-san-martin.firebaseapp.com",
    databaseURL: "https://recibos-san-martin-default-rtdb.firebaseio.com",
    projectId: "recibos-san-martin",
    storageBucket: "recibos-san-martin.firebasestorage.app",
    messagingSenderId: "757269810918",
    appId: "1:757269810918:web:c8ab85d5e9a90a4ecfb527"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let socios = [], historial = [], numeroFolio = 1, mostrarHistorial = false;

// SINCRONIZACIÓN
db.ref('socios').on('value', snap => {
    socios = [];
    snap.forEach(c => { socios.push({id:c.key, ...c.val()}); });
    actualizarListaSociosUI();
});

db.ref('historial').on('value', snap => {
    historial = [];
    snap.forEach(c => { historial.push({id:c.key, ...c.val()}); });
    if(historial.length > 0) {
        numeroFolio = Math.max(...historial.map(h => parseInt(h.Nro_Folio) || 0)) + 1;
    }
    if(mostrarHistorial) actualizarTablaHistorial();
});

// BUSCADOR
const inputNombre = document.getElementById('nombre');
const sug = document.getElementById('listaSugerencias');
inputNombre.addEventListener('input', e => {
    const val = e.target.value.toUpperCase();
    sug.innerHTML = '';
    if(val.length > 0) {
        const filtrados = socios.filter(s => s.nombre.toUpperCase().includes(val));
        filtrados.forEach(s => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = s.nombre;
            li.onclick = () => {
                inputNombre.value = s.nombre;
                document.getElementById('categoria').value = s.categoria;
                sug.classList.add('d-none');
            };
            sug.appendChild(li);
        });
        sug.classList.toggle('d-none', filtrados.length === 0);
    } else sug.classList.add('d-none');
});

// GUARDAR
document.getElementById('formCobro').onsubmit = (e) => {
    e.preventDefault();
    const hoy = new Date();
    const d = {
        Nro_Folio: numeroFolio.toString().padStart(4, '0'),
        Fecha: `${hoy.getDate()}/${hoy.getMonth()+1}/${hoy.getFullYear()}`,
        Jugador: inputNombre.value.toUpperCase(),
        Categoria: document.getElementById('categoria').value,
        Mes: document.getElementById('mes').value,
        Concepto: document.getElementById('concepto').value,
        Importe: document.getElementById('total').value,
        Metodo_Pago: document.getElementById('pago').value
    };
    db.ref('historial').push(d).then(() => {
        imprimirRecibo(d);
        e.target.reset();
    });
};

document.getElementById('btnGuardarSocio').onclick = () => {
    const n = document.getElementById('nuevoSocioNombre').value.toUpperCase().trim();
    const c = document.getElementById('nuevoSocioCat').value;
    if(n) {
        db.ref('socios').push({nombre:n, categoria:c}).then(() => {
            document.getElementById('nuevoSocioNombre').value = '';
            mostrarConfirmacion("Socio guardado correctamente", () => {
                bootstrap.Modal.getInstance(document.getElementById('modalSocios')).hide();
            });
        });
    }
};

// FUNCIONES HISTORIAL
function cargarTodoElHistorial() { mostrarHistorial = true; actualizarTablaHistorial(); }
function limpiarVistaHistorial() { mostrarHistorial = false; document.getElementById('tablaHistorialBody').innerHTML = ''; }

function actualizarTablaHistorial() {
    const body = document.getElementById('tablaHistorialBody');
    const filtro = document.getElementById('filtroHistorial').value.toLowerCase();
    if(!body) return;
    body.innerHTML = '';
    if(!mostrarHistorial && filtro === "") return;

    [...historial].reverse().forEach(r => {
        if(r.Jugador.toLowerCase().includes(filtro)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.Nro_Folio}</td>
                <td><small>${r.Fecha}</small></td>
                <td><b>${r.Jugador}</b></td>
                <td>$${r.Importe}</td>
                <td>
                    <div class="acciones-container">
                        <button class="btn btn-sm btn-primary" onclick="reimprimirUno('${r.id}')"><i class="fa fa-print"></i></button>
                        <button class="btn btn-sm btn-success" onclick="compartirWhatsApp('${r.id}')"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-sm btn-outline-danger btn-separado-borrar" onclick="borrarRecibo('${r.id}')"><i class="fa fa-trash"></i></button>
                    </div>
                </td>`;
            body.appendChild(tr);
        }
    });
}

function llenarCamposRecibo(d) {
    document.getElementById('r-folio').innerText = d.Nro_Folio;
    document.getElementById('r-fecha').innerText = d.Fecha;
    document.getElementById('r-nombre').innerText = d.Jugador;
    document.getElementById('r-categoria').innerText = d.Categoria;
    document.getElementById('r-mes').innerText = d.Mes;
    document.getElementById('r-concepto').innerText = d.Concepto;
    document.getElementById('r-pago').innerText = d.Metodo_Pago;
    document.getElementById('r-total').innerText = d.Importe;
}

function imprimirRecibo(d) {
    llenarCamposRecibo(d);
    const area = document.getElementById('areaRecibo');
    area.style.display = 'block';
    setTimeout(() => { window.print(); area.style.display = 'none'; }, 500);
}

function reimprimirUno(id) {
    const r = historial.find(h => h.id === id);
    if(r) imprimirRecibo(r);
}

// WA CON IMAGEN
async function compartirWhatsApp(id) {
    const r = historial.find(h => h.id === id);
    if (!r) return;
    llenarCamposRecibo(r);
    const area = document.getElementById('areaRecibo');
    area.style.display = 'block';
    try {
        const canvas = await html2canvas(area, { scale: 2, useCORS: true });
        area.style.display = 'none';
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `Recibo_${r.Nro_Folio}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Recibo ACSM', text: `Recibo de ${r.Jugador}` });
            } else {
                window.open(`https://wa.me/?text=*RECIBO ACSM*%0ASocio: ${r.Jugador}%0AFolio: ${r.Nro_Folio}`, '_blank');
            }
        });
    } catch (e) { area.style.display = 'none'; }
}

function borrarRecibo(id) { mostrarConfirmacion("¿Eliminar este recibo?", () => db.ref('historial').child(id).remove()); }
function borrarSocio(id) { mostrarConfirmacion("¿Eliminar socio?", () => db.ref('socios').child(id).remove()); }

function actualizarListaSociosUI() {
    const lista = document.getElementById('listaSociosGuardados');
    if(!lista) return;
    lista.innerHTML = '';
    socios.sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(s => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center small';
        li.innerHTML = `<span><b>${s.nombre}</b> <small>(${s.categoria})</small></span> 
        <i class="fa fa-trash text-danger" onclick="borrarSocio('${s.id}')" style="cursor:pointer"></i>`;
        lista.appendChild(li);
    });
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "Reporte_ACSM.xlsx");
}