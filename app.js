const CLAVE_CORRECTA = "2026";

// Cargar meses al inicio
document.addEventListener('DOMContentLoaded', () => {
    const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const comboMes = document.getElementById('mes');
    if(comboMes) meses.forEach(m => { let opt = document.createElement('option'); opt.text = m; comboMes.add(opt); });
    
    if (sessionStorage.getItem('accesoPermitido') === 'true') {
        document.getElementById('pantalla-login').style.display = 'none';
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

function mostrarConfirmacion(mensaje, accionConfirmada) {
    const modal = document.getElementById('modal-confirmacion');
    const msgTxt = document.getElementById('modal-mensaje');
    const btnConf = document.getElementById('btn-confirmar');
    const btnCanc = document.getElementById('btn-cancelar');
    
    const esExito = mensaje.includes("correctamente") || mensaje.includes("Socio");
    msgTxt.innerText = mensaje;
    btnConf.innerText = esExito ? "Aceptar" : "Eliminar";
    btnConf.className = esExito ? "btn btn-primary" : "btn btn-danger";
    btnCanc.style.display = esExito ? 'none' : 'inline-block';
    
    modal.style.display = 'flex';
    btnConf.onclick = () => { if(accionConfirmada) accionConfirmada(); modal.style.display = 'none'; };
    btnCanc.onclick = () => { modal.style.display = 'none'; };
}

// FIREBASE (Tu Configuración)
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

// Sincronizar Socios
db.ref('socios').on('value', (snap) => {
    socios = []; snap.forEach(c => { socios.push({id:c.key, ...c.val()}); });
    actualizarListaSociosUI();
});

// Sincronizar Historial
db.ref('historial').on('value', (snap) => {
    historial = []; snap.forEach(c => { historial.push({id:c.key, ...c.val()}); });
    if(historial.length > 0) numeroFolio = Math.max(...historial.map(h => parseInt(h.Nro_Folio) || 0)) + 1;
    actualizarTablaHistorial();
});

// Buscador
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

// Guardar Recibo
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
    db.ref('historial').push(d).then(() => { 
        imprimirRecibo(d); 
        e.target.reset(); 
    });
};

// Guardar Socio
document.getElementById('btnGuardarSocio').onclick = () => {
    const n = document.getElementById('nuevoSocioNombre').value.toUpperCase().trim();
    const c = document.getElementById('nuevoSocioCat').value; // Toma el valor del SELECT
    if(n) {
        db.ref('socios').push({nombre:n, categoria:c}).then(() => {
            document.getElementById('nuevoSocioNombre').value = '';
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
        const div = document.createElement('div');
        div.className = 'p-2 border-bottom d-flex justify-content-between align-items-center';
        div.innerHTML = `<div><strong>${r.Jugador}</strong><br><small>$${r.Importe} - ${r.Fecha}</small></div>
        <button class="btn btn-sm btn-outline-danger" onclick="borrarReciboUnico('${r.id}')">×</button>`;
        list.appendChild(div);
    });
}

function imprimirRecibo(d) {
    document.getElementById('r-folio').innerText = d.Nro_Folio;
    document.getElementById('r-nombre').innerText = d.Jugador;
    document.getElementById('r-categoria').innerText = d.Categoria;
    document.getElementById('r-mes').innerText = d.Mes;
    document.getElementById('r-concepto').innerText = d.Concepto;
    document.getElementById('r-total').innerText = d.Importe;
    document.getElementById('areaRecibo').style.display='block';
    setTimeout(() => { window.print(); document.getElementById('areaRecibo').style.display='none'; }, 500);
}

function borrarReciboUnico(id) { mostrarConfirmacion("¿Borrar recibo?", () => db.ref('historial').child(id).remove()); }
function borrarSocio(id) { mostrarConfirmacion("¿Eliminar socio?", () => db.ref('socios').child(id).remove()); }

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "Cobranza.xlsx");
}

function actualizarListaSociosUI() {
    const list = document.getElementById('listaSociosGuardados');
    list.innerHTML = '';
    socios.sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(s => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center small';
        li.innerHTML = `<span>${s.nombre} (${s.categoria})</span>
            <i class="fa fa-trash text-danger" style="cursor:pointer" onclick="borrarSocio('${s.id}')"></i>`;
        list.appendChild(li);
    });
}