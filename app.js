const CLAVE_CORRECTA = "2026";

// --- SEGURIDAD ---
document.addEventListener('DOMContentLoaded', () => {
    const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const comboMes = document.getElementById('mes');
    if(comboMes) meses.forEach(m => { let opt = document.createElement('option'); opt.text = m; comboMes.add(opt); });
    
    if (sessionStorage.getItem('accesoPermitido') === 'true') {
        const login = document.getElementById('pantalla-login');
        if(login) login.style.display = 'none';
    }
});

function verificarClave() {
    if (document.getElementById('input-clave').value === CLAVE_CORRECTA) {
        sessionStorage.setItem('accesoPermitido', 'true');
        document.getElementById('pantalla-login').style.display = 'none';
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

// --- CARTEL INTELIGENTE ---
function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const msgTxt = document.getElementById('modal-mensaje');
    const btnConf = document.getElementById('btn-confirmar');
    const btnCanc = document.getElementById('btn-cancelar');
    
    const esExito = mensaje.toLowerCase().includes("correctamente") || mensaje.toLowerCase().includes("socio");
    msgTxt.innerText = mensaje;
    
    btnConf.innerText = esExito ? "Aceptar" : "Eliminar";
    btnConf.className = esExito ? "btn btn-primary w-100" : "btn btn-danger w-100";
    btnCanc.style.display = esExito ? 'none' : 'inline-block';
    
    modal.style.display = 'flex';
    btnConf.onclick = () => { if(accionConfirmada) accionConfirmada(); modal.style.display = 'none'; };
    btnCanc.onclick = () => { modal.style.display = 'none'; };
}

// --- FIREBASE ---
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

let socios = [], historial = [], numeroFolio = 1;

// --- CARGA ---
db.ref('socios').on('value', (snap) => {
    socios = []; snap.forEach(c => { socios.push({id:c.key, ...c.val()}); });
    actualizarListaSociosUI();
});

db.ref('historial').on('value', (snap) => {
    historial = []; snap.forEach(c => { historial.push({id:c.key, ...c.val()}); });
    if(historial.length > 0) numeroFolio = Math.max(...historial.map(h => parseInt(h.Nro_Folio) || 0)) + 1;
    actualizarTablaHistorial();
});

// --- BUSCADOR ---
document.getElementById('nombre').addEventListener('input', (e) => {
    const val = e.target.value.toUpperCase();
    const sug = document.getElementById('listaSugerencias');
    sug.innerHTML = '';
    if (val.length > 0) {
        const filt = socios.filter(s => s.nombre.toUpperCase().includes(val));
        filt.forEach(s => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = s.nombre;
            li.onclick = () => {
                document.getElementById('nombre').value = s.nombre;
                document.getElementById('categoria').value = s.categoria;
                sug.classList.add('d-none');
            };
            sug.appendChild(li);
        });
        sug.classList.toggle('d-none', filt.length === 0);
    } else sug.classList.add('d-none');
});

// --- ACCIONES ---
document.getElementById('formCobro').onsubmit = (e) => {
    e.preventDefault();
    const h = new Date();
    const d = {
        Nro_Folio: numeroFolio.toString().padStart(4, '0'),
        Fecha: `${h.getDate()}/${h.getMonth()+1}/${h.getFullYear()}`,
        Jugador: document.getElementById('nombre').value.toUpperCase(),
        Categoria: document.getElementById('categoria').value,
        Mes: document.getElementById('mes').value,
        Concepto: document.getElementById('concepto').value,
        Importe: document.getElementById('total').value,
        Metodo_Pago: document.getElementById('pago').value
    };
    db.ref('historial').push(d).then(() => { imprimirRecibo(d); e.target.reset(); });
};

document.getElementById('btnGuardarSocio').onclick = () => {
    const n = document.getElementById('nuevoSocioNombre').value.toUpperCase().trim();
    const c = document.getElementById('nuevoSocioCat').value.toUpperCase().trim();
    if(n) {
        db.ref('socios').push({nombre:n, categoria:c}).then(() => {
            document.getElementById('nuevoSocioNombre').value = '';
            document.getElementById('nuevoSocioCat').value = '';
            mostrarConfirmacion("Socio guardado correctamente", () => {
                bootstrap.Modal.getInstance(document.getElementById('modalSocio')).hide();
            });
        });
    }
};

function actualizarTablaHistorial() {
    const list = document.getElementById('tablaHistorialBody');
    list.innerHTML = '';
    [...historial].reverse().slice(0,10).forEach(r => {
        const d = document.createElement('div');
        d.className = 'p-2 border-bottom small d-flex justify-content-between align-items-center';
        d.innerHTML = `<div><b>${r.Jugador}</b><br><span class="text-muted">${r.Fecha} - $${r.Importe}</span></div>
            <button class="btn btn-sm btn-outline-danger border-0" onclick="borrarReciboUnico('${r.id}')">×</button>`;
        list.appendChild(d);
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

function borrarReciboUnico(id) { mostrarConfirmacion("¿Eliminar este recibo?", () => db.ref('historial').child(id).remove()); }
function borrarSocio(id) { mostrarConfirmacion("¿Eliminar socio definitivamente?", () => db.ref('socios').child(id).remove()); }
function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "Cobranza_San_Martin.xlsx");
}
function actualizarListaSociosUI() {
    const list = document.getElementById('listaSociosGuardados');
    list.innerHTML = '';
    socios.sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(s => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${s.nombre} <small class="text-muted">(${s.categoria})</small></span>
            <i class="fa fa-trash text-danger" style="cursor:pointer" onclick="borrarSocio('${s.id}')"></i>`;
        list.appendChild(li);
    });
}
function cargarTodoElHistorial() {
    // Abrir una vista más grande si lo deseas, por ahora refresca el lateral
    actualizarTablaHistorial();
}