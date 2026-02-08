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

// --- FUNCIÓN DE CARTEL PERSONALIZADO (CORREGIDA) ---
function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const mensajeTxt = document.getElementById('modal-mensaje');
    const titulo = modal.querySelector('h5') || { innerText: "" };
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');
    
    // Si el mensaje incluye "Socio" o "correctamente", es un aviso de éxito
    const esExito = mensaje.includes("correctamente") || mensaje.includes("Socio");

    mensajeTxt.innerText = mensaje;
    btnConfirmar.innerText = esExito ? "Aceptar" : "Eliminar";
    btnConfirmar.className = esExito ? "btn btn-primary" : "btn btn-danger";
    
    // Ocultar cancelar si es solo un aviso de éxito
    btnCancelar.style.display = esExito ? 'none' : 'inline-block';
    
    modal.style.display = 'flex';

    btnConfirmar.onclick = () => { 
        if(accionConfirmada) accionConfirmada(); 
        modal.style.display = 'none'; 
    };
    btnCancelar.onclick = () => { modal.style.display = 'none'; };
}

// --- CONFIGURACIÓN DE FIREBASE ---
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

let socios = [];
let historial = [];
let numeroFolio = 1;
let mostrarHistorial = false;

// --- CARGA DE DATOS ---
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
            const folios = historial.map(h => parseInt(h.Nro_Folio) || 0);
            numeroFolio = Math.max(...folios) + 1;
        }
        if (mostrarHistorial) actualizarTablaHistorial();
    });

    // Buscador
    const inputNombre = document.getElementById('nombre');
    const sugerencias = document.getElementById('listaSugerencias');
    inputNombre.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        sugerencias.innerHTML = '';
        if (val.length > 0) {
            const filtrados = socios.filter(s => s.nombre.toUpperCase().includes(val));
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
            sugerencias.classList.toggle('d-none', filtrados.length === 0);
        } else { sugerencias.classList.add('d-none'); }
    });

    // Formulario de Cobro
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

    // --- GUARDADO DE SOCIOS ---
    const btnGuardar = document.getElementById('btnGuardarSocio');
    if(btnGuardar) {
        btnGuardar.onclick = () => {
            const nInput = document.getElementById('nuevoSocioNombre');
            const cInput = document.getElementById('nuevoSocioCat');
            const n = nInput.value.toUpperCase().trim();
            const c = cInput.value;
            if(n) {
                db.ref('socios').push({ nombre: n, categoria: c })
                .then(() => {
                    nInput.value = ''; 
                    mostrarConfirmacion("Socio guardado correctamente", () => {
                        const modalSocio = document.getElementById('modalSocio');
                        const modalBS = bootstrap.Modal.getInstance(modalSocio);
                        if (modalBS) modalBS.hide();
                    });
                });
            }
        };
    }
});

// --- FUNCIONES EXTRAS ---
function enviarWA(id) {
    const reg = historial.find(h => h.id === id);
    if (!reg) return;
    const msj = `*RECIBO DE PAGO - SAN MARTIN HOCKEY*%0A` +
                `*Folio:* ${reg.Nro_Folio}%0A*Socio:* ${reg.Jugador}%0A*Monto:* $${reg.Importe}`;
    window.open(`https://wa.me/?text=${msj}`, '_blank');
}
function actualizarTablaHistorial() {
    const body = document.getElementById('tablaHistorialBody');
    if(!body) return;
    body.innerHTML = '';
    [...historial].reverse().forEach((reg) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${reg.Nro_Folio}</td><td>${reg.Fecha}</td><td>${reg.Jugador}</td><td>$${reg.Importe}</td>
            <td><button class="btn btn-sm btn-primary" onclick="reimprimirUno('${reg.id}')">🖨️</button></td>`;
        body.appendChild(tr);
    });
}
function imprimirRecibo(datos) { llenarCamposRecibo(datos); document.getElementById('areaRecibo').style.display='block'; setTimeout(()=> { window.print(); document.getElementById('areaRecibo').style.display='none'; }, 500); }
function llenarCamposRecibo(d) { document.getElementById('r-folio').innerText = d.Nro_Folio; document.getElementById('r-nombre').innerText = d.Jugador; document.getElementById('r-total').innerText = d.Importe; }
function borrarReciboUnico(id) { mostrarConfirmacion("¿Eliminar recibo?", () => db.ref('historial').child(id).remove()); }
function borrarSocio(id) { mostrarConfirmacion("¿Eliminar socio?", () => db.ref('socios').child(id).remove()); }
function cargarTodoElHistorial() { mostrarHistorial = true; actualizarTablaHistorial(); }
function reimprimirUno(id) { imprimirRecibo(historial.find(h => h.id === id)); }
function limpiarVistaHistorial() { mostrarHistorial = false; document.getElementById('tablaHistorialBody').innerHTML = ''; }
function actualizarListaSociosUI() {
    const lista = document.getElementById('listaSociosGuardados');
    if(!lista) return;
    lista.innerHTML = '';
    socios.forEach(s => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${s.nombre}</span> <i class="fa fa-trash text-danger" onclick="borrarSocio('${s.id}')"></i>`;
        lista.appendChild(li);
    });
}