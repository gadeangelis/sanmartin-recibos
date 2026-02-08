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

// --- CARTEL INTELIGENTE (SUCCESS O DELETE) ---
function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const mensajeTxt = document.getElementById('modal-mensaje');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');
    
    // Si el mensaje es de éxito (guardado)
    const esExito = mensaje.toLowerCase().includes("correctamente") || mensaje.toLowerCase().includes("socio guardado");

    mensajeTxt.innerText = mensaje;
    
    if (esExito) {
        btnConfirmar.innerText = "Aceptar";
        btnConfirmar.className = "btn btn-primary"; // Azul
        btnCancelar.style.display = 'none';         // Oculta cancelar
    } else {
        btnConfirmar.innerText = "Eliminar";
        btnConfirmar.className = "btn btn-danger";  // Rojo
        btnCancelar.style.display = 'inline-block'; // Muestra cancelar
    }

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
        db.ref('historial').push(datos).then(() => {
            imprimirRecibo(datos);
            e.target.reset();
        });
    });

    // --- GUARDAR SOCIO ---
    const btnGuardar = document.getElementById('btnGuardarSocio');
    if(btnGuardar) {
        btnGuardar.onclick = () => {
            const nInput = document.getElementById('nuevoSocioNombre');
            const cInput = document.getElementById('nuevoSocioCat');
            const n = nInput.value.toUpperCase().trim();
            const c = cInput.value.toUpperCase().trim();

            if(n) {
                db.ref('socios').push({ nombre: n, categoria: c })
                .then(() => {
                    nInput.value = ''; cInput.value = '';
                    mostrarConfirmacion("Socio guardado correctamente", () => {
                        const m = document.getElementById('modalSocio');
                        bootstrap.Modal.getInstance(m).hide();
                    });
                });
            }
        };
    }
});

// --- FUNCIONES ---
function enviarWA(id) {
    const reg = historial.find(h => h.id === id);
    if (!reg) return;
    const msj = `*RECIBO DE PAGO - SAN MARTIN HOCKEY*%0A*Folio:* ${reg.Nro_Folio}%0A*Socio:* ${reg.Jugador}%0A*Monto:* $${reg.Importe}`;
    window.open(`https://wa.me/?text=${msj}`, '_blank');
}

function actualizarTablaHistorial() {
    const body = document.getElementById('tablaHistorialBody');
    if(!body) return;
    body.innerHTML = '';
    [...historial].slice(-10).reverse().forEach((reg) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${reg.Nro_Folio}</td><td>${reg.Jugador}</td><td>$${reg.Importe}</td>
            <td><button class="btn btn-sm btn-success" onclick="enviarWA('${reg.id}')"><i class="fab fa-whatsapp"></i></button></td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="borrarReciboUnico('${reg.id}')">×</button></td>`;
        body.appendChild(tr);
    });
}

function imprimirRecibo(d) {
    document.getElementById('r-folio').innerText = d.Nro_Folio;
    document.getElementById('r-fecha').innerText = d.Fecha;
    document.getElementById('r-nombre').innerText = d.Jugador;
    document.getElementById('r-categoria').innerText = d.Categoria;
    document.getElementById('r-mes').innerText = d.Mes;
    document.getElementById('r-concepto').innerText = d.Concepto;
    document.getElementById('r-pago').innerText = d.Metodo_Pago;
    document.getElementById('r-total').innerText = d.Importe;
    document.getElementById('areaRecibo').style.display='block';
    setTimeout(() => { window.print(); document.getElementById('areaRecibo').style.display='none'; }, 500);
}

function borrarReciboUnico(id) { mostrarConfirmacion("¿Eliminar recibo?", () => db.ref('historial').child(id).remove()); }
function borrarSocio(id) { mostrarConfirmacion("¿Eliminar este socio?", () => db.ref('socios').child(id).remove()); }
function cargarTodoElHistorial() { mostrarHistorial = true; actualizarTablaHistorial(); }
function reimprimirUno(id) { imprimirRecibo(historial.find(h => h.id === id)); }
function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "Cobranza_San_Martin.xlsx");
}

function actualizarListaSociosUI() {
    const lista = document.getElementById('listaSociosGuardados');
    if(!lista) return;
    lista.innerHTML = '';
    socios.forEach(s => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center small';
        li.innerHTML = `<b>${s.nombre}</b> <i class="fa fa-trash text-danger" style="cursor:pointer" onclick="borrarSocio('${s.id}')"></i>`;
        lista.appendChild(li);
    });
}