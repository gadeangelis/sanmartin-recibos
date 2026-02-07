const CLAVE_CORRECTA = "2026"; 

// --- SEGURIDAD ---
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('accesoPermitido') === 'true') {
        const login = document.getElementById('pantalla-login');
        if(login) login.style.display = 'none';
    }
});

function verificarClave() {
    const inputClave = document.getElementById('input-clave').value;
    const errorMsg = document.getElementById('error-msg');
    if (inputClave === CLAVE_CORRECTA) {
        sessionStorage.setItem('accesoPermitido', 'true');
        document.getElementById('pantalla-login').style.display = 'none';
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('input-clave').value = ''; 
    }
}

function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const mensajeTxt = document.getElementById('modal-mensaje');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');

    mensajeTxt.innerText = mensaje;
    modal.style.display = 'flex';

    btnConfirmar.onclick = () => { accionConfirmada(); modal.style.display = 'none'; };
    btnCancelar.onclick = () => { modal.style.display = 'none'; };
}

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDAYYgHTSq__yYhv405u0r-0Lr6XWsgH4M",
  authDomain: "sistema-hockey.firebaseapp.com",
  databaseURL: "https://sistema-hockey-default-rtdb.firebaseio.com",
  projectId: "sistema-hockey",
  storageBucket: "sistema-hockey.firebasestorage.app",
  messagingSenderId: "773829482990",
  appId: "1:773829482990:web:559b8f18f70af6d74896ff"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let socios = [];
let historial = [];
let numeroFolio = 1;
let mostrarHistorial = false;

// --- LÓGICA DE LA APP ---
document.addEventListener('DOMContentLoaded', () => {
    db.ref('socios').on('value', (snapshot) => {
        socios = [];
        snapshot.forEach((child) => { socios.push({ id: child.key, ...child.val() }); });
        actualizarListaSociosUI();
    });

    db.ref('historial').on('value', (snapshot) => {
        historial = [];
        snapshot.forEach((child) => { historial.push({ id: child.key, ...child.val() }); });
        if (historial.length > 0) {
            const folios = historial.map(h => parseInt(h.Nro_Folio));
            numeroFolio = Math.max(...folios) + 1;
        }
        if (mostrarHistorial) actualizarTablaHistorial();
    });

    const inputNombre = document.getElementById('nombre');
    const sugerencias = document.getElementById('listaSugerencias');

    inputNombre.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        sugerencias.innerHTML = '';
        if (val.length > 0) {
            const filtrados = socios.filter(s => s.nombre.toUpperCase().includes(val));
            if (filtrados.length > 0) {
                filtrados.forEach(s => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item list-group-item-action';
                    li.textContent = s.nombre;
                    li.onclick = () => {
                        inputNombre.value = s.nombre;
                        document.getElementById('categoria').value = s.categoria;
                        sugerencias.classList.add('d-none');
                    };
                    sugerencias.appendChild(li);
                });
                sugerencias.classList.remove('d-none');
            }
        } else { sugerencias.classList.add('d-none'); }
    });

    document.getElementById('formCobro').addEventListener('submit', (e) => {
        e.preventDefault();
        const hoy = new Date();
        const datos = {
            Nro_Folio: numeroFolio.toString().padStart(4, '0'),
            Fecha: `${hoy.getDate()}/${hoy.getMonth()+1}/${hoy.getFullYear()}`,
            Jugador: inputNombre.value.toUpperCase(),
            Categoria: document.getElementById('categoria').value,
            Mes: document.getElementById('mes').value,
            Concepto: document.getElementById('concepto').value,
            Importe: document.getElementById('total').value,
            Metodo_Pago: document.getElementById('pago').value
        };
        db.ref('historial').push(datos);
        imprimirRecibo(datos);
        e.target.reset();
    });

    document.getElementById('filtroHistorial').addEventListener('input', () => {
        mostrarHistorial = true;
        actualizarTablaHistorial();
    });

    document.getElementById('btnGuardarSocio').onclick = () => {
        const nInput = document.getElementById('nuevoSocioNombre');
        const n = nInput.value.toUpperCase().trim();
        const c = document.getElementById('nuevoSocioCat').value;
        if(n) {
            db.ref('socios').push({ nombre: n, categoria: c });
            nInput.value = '';
        }
    };
});

// --- FUNCIONES DE ELIMINACIÓN (YA NO USAN CONFIRM) ---
function borrarReciboUnico(id) { 
    mostrarConfirmacion("¿Deseas eliminar este recibo de LA COLONIA?", () => {
        db.ref('historial').child(id).remove();
    });
}

function borrarSocio(id) { 
    mostrarConfirmacion("¿Deseas eliminar a este socio del sistema?", () => {
        db.ref('socios').child(id).remove();
    });
}

// --- RESTO DE FUNCIONES ---
function imprimirRecibo(datos) {
    const modalH = document.getElementById('modalHistorial');
    if(modalH) {
        const instance = bootstrap.Modal.getInstance(modalH);
        if (instance) instance.hide();
    }
    llenarCamposRecibo(datos);
    const area = document.getElementById('areaRecibo');
    setTimeout(() => {
        area.style.display = 'block';
        setTimeout(() => {
            window.print();
            window.onafterprint = () => { area.style.display = 'none'; };
        }, 500);
    }, 400);
}

async function enviarWA(id) {
    const d = historial.find(h => h.id === id);
    llenarCamposRecibo(d);
    const area = document.getElementById('areaRecibo');
    area.style.display = 'block';
    try {
        const canvas = await html2canvas(area, { scale: 3, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `Recibo_${d.Nro_Folio}.png`;
        link.href = imgData;
        link.click();
        area.style.display = 'none';
        const msj = `*Recibo A.H C.J*%0A*Socio:* ${d.Jugador}%0A*Mes:* ${d.Mes}%0A*Concepto:* ${d.Concepto}%0A*Monto:* $${d.Importe}`;
        window.open(`https://wa.me/?text=${msj}`, '_blank');
    } catch (e) { area.style.display = 'none'; }
}

function llenarCamposRecibo(d) {
    document.getElementById('r-folio').innerText = d.Nro_Folio;
    document.getElementById('r-fecha').innerText = d.Fecha;
    document.getElementById('r-nombre').innerText = d.Jugador;
    document.getElementById('r-categoria').innerText = d.Categoria;
    document.getElementById('r-mes').innerText = d.Mes;
    document.getElementById('r-concepto').innerText = d.Concepto;
    document.getElementById('r-pago').innerText = d.Metodo_Pago;
    document.getElementById('r-total').innerText = parseFloat(d.Importe).toLocaleString('es-AR', {minimumFractionDigits:2});
}

function actualizarTablaHistorial() {
    const body = document.getElementById('tablaHistorialBody');
    const filtro = document.getElementById('filtroHistorial').value.toLowerCase();
    if(!body) return;
    body.innerHTML = '';
    [...historial].reverse().forEach((reg) => {
        if(reg.Jugador.toLowerCase().includes(filtro)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${reg.Nro_Folio}</td>
                <td>${reg.Fecha}</td>
                <td>${reg.Jugador}</td>
                <td>$${reg.Importe}</td>
                <td>
                    <div class="d-flex gap-3">
                        <button class="btn btn-sm btn-primary px-3" onclick="reimprimirUno('${reg.id}')"><i class="fa fa-print"></i></button>
                        <button class="btn btn-sm btn-success px-3" onclick="enviarWA('${reg.id}')"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="borrarReciboUnico('${reg.id}')"><i class="fa fa-trash"></i></button>
                    </div>
                </td>`;
            body.appendChild(tr);
        }
    });
}

function cargarTodoElHistorial() { mostrarHistorial = true; actualizarTablaHistorial(); }
function limpiarVistaHistorial() { mostrarHistorial = false; document.getElementById('tablaHistorialBody').innerHTML = ''; }
function reimprimirUno(id) { imprimirRecibo(historial.find(h => h.id === id)); }

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "Reporte_Cobranza.xlsx");
}

function actualizarListaSociosUI() {
    const lista = document.getElementById('listaSociosGuardados');
    if(!lista) return;
    lista.innerHTML = '';
    socios.forEach((s) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center small';
        li.innerHTML = `<div><b>${s.nombre}</b><br><small>${s.categoria}</small></div> 
                        <i class="fa fa-trash text-danger" style="cursor:pointer" onclick="borrarSocio('${s.id}')"></i>`;
        lista.appendChild(li);
    });
}