
    // =====================
    // DATA & STATE
    // =====================
    const CATEGORY_COLORS = [
        '#6366F1', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
    ];

    const DEFAULT_CATEGORIES = [
        { id: 'comida', name: 'Comida', color: '#EF4444' },
        { id: 'transporte', name: 'Transporte', color: '#6366F1' },
        { id: 'servicios', name: 'Servicios', color: '#10B981' },
        { id: 'ocio', name: 'Ocio', color: '#F59E0B' },
        { id: 'salud', name: 'Salud', color: '#EC4899' },
        { id: 'trabajo', name: 'Trabajo', color: '#8B5CF6' },
        { id: 'educacion', name: 'Educación', color: '#14B8A6' },
        { id: 'otros', name: 'Otros', color: '#6B7280' }
    ];

    const CATEGORY_ICONS = {
        comida: '🍔', transporte: '🚗', servicios: '🏠',
        ocio: '🎮', salud: '💊', trabajo: '💼',
        educacion: '📚', otros: '📦'
    };

    let state = {
        currentDate: new Date(),
        currentFilter: 'all',
        editingId: null,
        categories: [],
        templates: [],
        transactions: []
    };

    // =====================
    // STORAGE
    // =====================
    function getStorageKey() {
        const y = state.currentDate.getFullYear();
        const m = String(state.currentDate.getMonth() + 1).padStart(2, '0');
        return `expenses_${y}-${m}`;
    }

    function loadData() {
    try {
        // Carga transacciones y categorías del mes actual
        const data = JSON.parse(localStorage.getItem(getStorageKey())) || {};
        state.transactions = data.transactions || [];
        state.categories = data.categories || JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        
        // NUEVO: Carga las plantillas desde una clave GLOBAL independiente del mes
        const globalTemplates = JSON.parse(localStorage.getItem('finance_global_templates')) || [];
        state.templates = globalTemplates;
        
    } catch (e) {
        state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        state.transactions = [];
        state.templates = [];
    }
}

 function saveData() {
    // 1. Guardamos los datos del mes actual (sin las plantillas para no duplicar espacio)
    const monthData = {
        transactions: state.transactions,
        categories: state.categories
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(monthData));

    // 2. NUEVO: Guardamos las plantillas en la clave GLOBAL fija
    localStorage.setItem('finance_global_templates', JSON.stringify(state.templates));
}
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // =====================
    // RENDER
    // =====================
    function render() {
        renderMonth();
        renderSummary();
        renderTransactions();
        renderChart();
        renderTemplates();
        updateCategorySelects();
    }


    // Formatea el input en tiempo real con separadores de miles (puntos)
function formatInputCurrency(input) {
    // Elimina cualquier caracter que no sea un número
    let value = input.value.replace(/\D/g, "");
    
    // Si está vacío, lo dejamos vacío
    if (!value) {
        input.value = "";
        return;
    }
    
    // Formatea con puntos para los miles
    input.value = new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0
    }).format(value);
}

// Devuelve un string formateado con puntos para inicializar valores de plantilla
function formatNumberWithDots(value) {
    if (!value) return "";
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
}

// Convierte el texto con puntos "10.000" de vuelta a un número puro "10000" para operaciones
function parseCurrencyValue(valueString) {
    if (!valueString) return 0;
    const cleanValue = valueString.replace(/\D/g, "");
    return parseFloat(cleanValue) || 0;
}


    function renderMonth() {
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const monthName = months[state.currentDate.getMonth()];
        const year = state.currentDate.getFullYear();
        document.getElementById('currentMonth').textContent = `${monthName} ${year}`;
    }

    function renderSummary() {
        let income = 0, expense = 0;
        state.transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        const balance = income - expense;

        document.getElementById('totalIncome').textContent = formatMoney(income);
        document.getElementById('totalExpense').textContent = formatMoney(expense);

        const balanceEl = document.getElementById('totalBalance');
        balanceEl.textContent = formatMoney(balance);
        balanceEl.className = 'amount' + (balance < 0 ? ' negative' : '');
    }

    function renderTransactions() {
        const list = document.getElementById('transactionsList');
        
        // Clonamos el array original para no mutarlo directamente
        let filtered = [...state.transactions];

        // Aplicamos el filtro de pestaña (Ingresos / Gastos / Todos)
        if (state.currentFilter !== 'all') {
            filtered = filtered.filter(t => t.type === state.currentFilter);
        }

        // ORDENAMIENTO ESTRICTO POR INSERCIÓN:
        // Como el ID está basado en Date.now(), el elemento con el ID más alto
        // es matemáticamente el último que se agregó al sistema.
        filtered.sort((a, b) => b.id.localeCompare(a.id));

        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span>📝</span>
                    <p>Sin transacciones${state.currentFilter !== 'all' ? ' para este filtro' : ''}</p>
                    <p style="font-size:13px;margin-top:8px">Presiona + para agregar</p>
                </div>`;
            return;
        }

        // ... Aquí continúa el mapeo e inserción en el HTML (list.innerHTML = filtered.map(...))

        list.innerHTML = filtered.map(t => {
            const cat = state.categories.find(c => c.id === t.category);
            const icon = CATEGORY_ICONS[t.category] || '📦';
            return `
                <div class="transaction-item" onclick="editTransaction('${t.id}')">
                    <div class="transaction-icon ${t.type}">${t.type === 'income' ? '📈' : icon}</div>
                    <div class="transaction-info">
                        <div class="transaction-desc">${escapeHtml(t.description)}</div>
                        <div class="transaction-meta">
                            <span>${formatDate(t.date)}</span>
                            ${t.type === 'expense' && cat ? `<span class="category-badge" style="background:${cat.color}">${cat.name}</span>` : ''}
                        </div>
                    </div>
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteTransaction('${t.id}')">✕</button>
                </div>`;
        }).join('');
    }

    function renderChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        const chartEmpty = document.getElementById('chartEmpty');
        const chartTotal = document.getElementById('chartTotal');
        const legend = document.getElementById('chartLegend');

        const expenses = state.transactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) {
            chartEmpty.style.display = 'block';
            if (window.expenseChart && typeof window.expenseChart.destroy === 'function') {
                window.expenseChart.destroy();
                window.expenseChart = null;
            }
            legend.innerHTML = '';
            chartTotal.textContent = '';
            return;
        }

        chartEmpty.style.display = 'none';

        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
        chartTotal.textContent = `Total: ${formatMoney(total)}`;

        const labels = [];
        const data = [];
        const colors = [];
        let legendHtml = '';

        Object.entries(categoryTotals).forEach(([catId, amount]) => {
            const cat = state.categories.find(c => c.id === catId);
            if (cat) {
                labels.push(cat.name);
                data.push(amount);
                colors.push(cat.color);
                const pct = ((amount / total) * 100).toFixed(1);
                legendHtml += `
                    <div class="legend-item">
                        <div class="legend-left">
                            <div class="legend-dot" style="background:${cat.color}"></div>
                            <span>${cat.name}</span>
                        </div>
                        <div class="legend-right">${formatMoney(amount)} (${pct}%)</div>
                    </div>`;
            }
        });

        legend.innerHTML = legendHtml;

        if (window.expenseChart && typeof window.expenseChart.destroy === 'function') {
            window.expenseChart.destroy();
        }
        window.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = ctx.parsed;
                                const pct = ((val / total) * 100).toFixed(1);
                                return ` ${formatMoney(val)} (${pct}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 600
                }
            }
        });
    }

    // Variable global de control que debes asegurarte de tener (búscala arriba en tu state o declárala aquí)
    let editingTemplateId = null; 

    function renderTemplates() {
        const grid = document.getElementById('templateGrid');
        const count = document.getElementById('templateCount');
        
        count.textContent = state.templates.length > 0 ? `(${state.templates.length})` : '';

        const addBtn = grid.querySelector('.add-template-btn');
        const existing = grid.querySelectorAll('.template-card');
        existing.forEach(el => el.remove());

        state.templates.forEach(t => {
            const itemCount = t.items ? t.items.length : 0;
            const totalAmount = t.totalAmount || 0;
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `
                <div class="template-name">${escapeHtml(t.name)}</div>
                <div class="template-details">
                    <span style="font-size:13px;color:var(--text-secondary)">${itemCount} gasto${itemCount !== 1 ? 's' : ''}</span>
                    <span class="template-amount">${formatMoney(totalAmount)}</span>
                </div>
                ${t.description ? `<div style="font-size:12px;color:var(--text-secondary);margin:4px 0">${escapeHtml(t.description)}</div>` : ''}
                <div class="template-actions">
                    <button class="template-btn apply" onclick="applyTemplate('${t.id}')">Aplicar</button>
                    <button class="template-btn edit" onclick="editTemplate('${t.id}')" style="background: var(--border); color: var(--text-primary)">Editar</button>
                    <button class="template-btn delete" onclick="deleteTemplate('${t.id}')">✕</button>
                </div>`;
            grid.insertBefore(card, addBtn);
        });
    }


function editTemplate(id) {
        const t = state.templates.find(x => x.id === id);
        if (!t) return;

        editingTemplateId = id; // Guardamos el ID que estamos editando
        
        // Cambiamos el título del modal dinámicamente si existe el elemento, o lo manejamos visualmente
        const modalTitle = document.querySelector('#templateModal h3');
        if (modalTitle) modalTitle.textContent = 'Editar Plantilla';

        // Llenamos los campos principales
        document.getElementById('templateNameInput').value = t.name;
        document.getElementById('templateDescInput').value = t.description || '';

        // Clonamos los items al estado temporal de edición para no dañar el original hasta guardar
        templateItems = JSON.parse(JSON.stringify(t.items));
        
        // Renderizamos las filas de la plantilla (ya saldrán con el formato de puntos corregido)
        renderTemplateItems();

        // Abrimos el modal
        document.getElementById('templateModal').classList.add('open');
    }


    function updateTemplateSelects() {
        // Update all select elements in template items
        document.querySelectorAll('#templateItemsList select').forEach((sel, idx) => {
            if (templateItems[idx]) {
                const currentVal = templateItems[idx].category;
                let html = '<option value="">Categoría</option>';
                state.categories.forEach(c => {
                    html += `<option value="${c.id}" ${currentVal === c.id ? 'selected' : ''}>${c.name}</option>`;
                });
                sel.innerHTML = html;
            }
        });
    }

    function updateCategorySelects() {
        const sel1 = document.getElementById('categorySelect');
        const sel2 = document.getElementById('templateCategorySelect');

        const makeOptions = (sel) => {
            if (!sel) return;
            let html = '<option value="">Seleccionar categoría</option>';
            state.categories.forEach(c => {
                html += `<option value="${c.id}">${c.name}</option>`;
            });
            sel.innerHTML = html;
        };

        makeOptions(sel1);
        makeOptions(sel2);
    }

    // =====================
    // ACTIONS
    // =====================
 function changeMonth(delta) {
    state.currentDate.setMonth(state.currentDate.getMonth() + delta);
    loadData(); // Carga las transacciones del nuevo mes, pero NO debería vaciar el array de plantillas globales
    render();   // Esta función se encarga de re-dibujar la lista, la gráfica y mantener las plantillas pintadas
}

    function setFilter(filter) {
        state.currentFilter = filter;
        document.querySelectorAll('.filter-tabs button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        renderTransactions();
    }

    function openTransactionModal(editId = null) {
        state.editingId = editId;
        const modal = document.getElementById('transactionModal');
        const title = document.getElementById('modalTitle');
        const catGroup = document.getElementById('categoryGroup');

        document.getElementById('descInput').value = '';
        document.getElementById('amountInput').value = '';
        document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];

        if (editId) {
            const t = state.transactions.find(x => x.id === editId);
            if (t) {
                title.textContent = 'Editar Transacción';
                document.getElementById('descInput').value = t.description;
                document.getElementById('amountInput').value = t.amount;
                document.getElementById('dateInput').value = t.date;
                setType(t.type);
                document.getElementById('categorySelect').value = t.category || '';
            }
        } else {
            title.textContent = 'Nueva Transacción';
            setType('expense');
        }

        modal.classList.add('open');
        document.getElementById('descInput').focus();
    }

    function closeTransactionModal() {
        document.getElementById('transactionModal').classList.remove('open');
        state.editingId = null;
    }

    function setType(type) {
        document.getElementById('typeIncome').className = 'type-toggle button' + (type === 'income' ? ' active income' : '');
        document.getElementById('typeExpense').className = 'type-toggle button' + (type === 'expense' ? ' active expense' : '');
        document.getElementById('categoryGroup').style.display = type === 'expense' ? 'block' : 'none';
    }

    function saveTransaction() {
        const desc = document.getElementById('descInput').value.trim();
      const amount = parseCurrencyValue(document.getElementById('amountInput').value);
        const date = document.getElementById('dateInput').value;
        const isIncome = document.getElementById('typeIncome').classList.contains('active');
        const category = document.getElementById('categorySelect').value;

        if (!desc) { alert('Ingresa una descripción'); return; }
        if (!amount || amount <= 0) { alert('Ingresa un monto válido'); return; }
        if (!date) { alert('Selecciona una fecha'); return; }
        if (!isIncome && !category) { alert('Selecciona una categoría'); return; }

        if (state.editingId) {
            const idx = state.transactions.findIndex(t => t.id === state.editingId);
            if (idx > -1) {
                state.transactions[idx] = {
                    ...state.transactions[idx],
                    description: desc,
                    amount,
                    date,
                    type: isIncome ? 'income' : 'expense',
                    category: isIncome ? null : category
                };
            }
        } else {
            state.transactions.push({
                id: generateId(),
                description: desc,
                amount,
                date,
                type: isIncome ? 'income' : 'expense',
                category: isIncome ? null : category
            });
        }

        saveData();
        closeTransactionModal();
        render();
    }

    function editTransaction(id) {
        openTransactionModal(id);
    }

    function deleteTransaction(id) {
        if (confirm('¿Eliminar esta transacción?')) {
            state.transactions = state.transactions.filter(t => t.id !== id);
            saveData();
            render();
        }
    }

    // Template Items State
    let templateItems = [];

   function renderTemplateItems() {
        const list = document.getElementById('templateItemsList');
        
        list.innerHTML = templateItems.map((item, idx) => {
            const catOptions = state.categories.map(c =>
                `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.name}</option>`
            ).join('');

            // Convertimos el monto almacenado a texto con puntos al renderizar
            const displayAmount = item.amount ? formatNumberWithDots(item.amount) : '';

            return `
                <div class="template-item-row">
                    <input type="text" placeholder="Descripción" value="${escapeHtml(item.description || '')}" 
                        oninput="updateTemplateItem(${idx}, 'description', this.value)">
                    <input type="text" inputmode="numeric" placeholder="Monto" value="${displayAmount}"
                        oninput="updateTemplateItem(${idx}, 'amount', parseCurrencyValue(this.value)); formatInputCurrency(this)">
                    <select onchange="updateTemplateItem(${idx}, 'category', this.value)">
                        <option value="">Categoría</option>
                        ${catOptions}
                    </select>
                    <button class="remove-item-btn" onclick="removeTemplateItem(${idx})">✕</button>
                </div>`;
        }).join('');

        updateTemplateTotal();
    }

function updateTemplateTotal() {
    const total = templateItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    document.getElementById('templateTotalAmount').textContent = `Total: ${formatMoney(total)}`;
}

    function addTemplateItem() {
        templateItems.push({ description: '', amount: 0, category: '' });
        renderTemplateItems();
        updateTemplateSelects();
    }

    function removeTemplateItem(idx) {
        templateItems.splice(idx, 1);
        renderTemplateItems();
    }

  function updateTemplateItem(idx, field, value) {
        // Guarda el valor en el arreglo (si es monto, ya va como número puro gracias a parseCurrencyValue)
        templateItems[idx][field] = value;
        
        // Actualiza el total general de la plantilla abajo sin re-renderizar la fila
        updateTemplateTotal();
    }

    // Templates
  function openTemplateModal() {
        editingTemplateId = null; // Reset crucial
        const modalTitle = document.querySelector('#templateModal h3');
        if (modalTitle) modalTitle.textContent = 'Nueva Plantilla';

        document.getElementById('templateNameInput').value = '';
        document.getElementById('templateDescInput').value = '';
        templateItems = [{ description: '', amount: 0, category: '' }];
        renderTemplateItems();
        document.getElementById('templateModal').classList.add('open');
    }

    function closeTemplateModal() {
        document.getElementById('templateModal').classList.remove('open');
        templateItems = [];
        editingTemplateId = null; // Limpiamos al cerrar
    }

   function saveTemplate() {
        const name = document.getElementById('templateNameInput').value.trim();
        const description = document.getElementById('templateDescInput').value.trim();

        // 1. Validar el nombre de la plantilla principal
        if (!name) { 
            alert('⚠️ El nombre de la plantilla es obligatorio.'); 
            document.getElementById('templateNameInput').focus();
            return; 
        }

        // 2. Validar que al menos exista una fila de gasto
        if (templateItems.length === 0) {
            alert('⚠️ Debes agregar al menos una fila de gasto a la plantilla.');
            return;
        }

        // 3. Validar minuciosamente cada una de las filas añadidas
        for (let i = 0; i < templateItems.length; i++) {
            const item = templateItems[i];
            const filaNumero = i + 1;

            if (!item.description || item.description.trim() === '') {
                alert(`⚠️ Datos incompletos: Falta la descripción en la fila número ${filaNumero}.`);
                return; // Detiene la ejecución por completo
            }

            if (!item.amount || item.amount <= 0) {
                alert(`⚠️ Datos incompletos: El monto en la fila número ${filaNumero} debe ser mayor a 0.`);
                return; // Detiene la ejecución por completo
            }

            if (!item.category || item.category.trim() === '') {
                alert(`⚠️ Datos incompletos: Debes seleccionar una categoría en la fila número ${filaNumero}.`);
                return; // Detiene la ejecución por completo
            }
        }

        // Si pasa todas las validaciones anteriores, procedemos a calcular el total y guardar
        const totalAmount = templateItems.reduce((sum, item) => sum + item.amount, 0);

        if (editingTemplateId) {
            // MODO EDICIÓN
            const idx = state.templates.findIndex(t => t.id === editingTemplateId);
            if (idx > -1) {
                state.templates[idx] = {
                    ...state.templates[idx],
                    name,
                    description,
                    items: templateItems, // Guardamos todos los items validados
                    totalAmount: totalAmount
                };
            }
        } else {
            // MODO CREACIÓN
            state.templates.push({
                id: generateId(),
                name,
                description,
                items: templateItems, // Guardamos todos los items validados
                totalAmount: totalAmount
            });
        }

        saveData();
        closeTemplateModal();
        renderTemplates();
    }

    function applyTemplate(id) {
        const t = state.templates.find(x => x.id === id);
        if (!t || !t.items) return;

        const activeYear = state.currentDate.getFullYear();
        const activeMonth = String(state.currentDate.getMonth() + 1).padStart(2, '0');
        const currentDay = String(new Date().getDate()).padStart(2, '0');
        const targetDate = `${activeYear}-${activeMonth}-${currentDay}`;

        t.items.forEach(item => {
            state.transactions.push({
                id: generateId(), // Genera un ID basado en el milisegundo exacto actual
                description: item.description,
                amount: item.amount,
                date: targetDate,
                type: 'expense',
                category: item.category
            });
        });

        saveData();
        render();
        alert(`✓ Plantilla "${t.name}" aplicada con éxito al mes actual.`);
    }

    function deleteTemplate(id) {
        if (confirm('¿Eliminar esta plantilla?')) {
            state.templates = state.templates.filter(t => t.id !== id);
            saveData();
            renderTemplates();
        }
    }

    function toggleTemplates() {
        const content = document.getElementById('templatesContent');
        const toggle = document.getElementById('templatesToggle');
        content.classList.toggle('open');
        toggle.classList.toggle('open');
    }

    // Categories
    function openCategoryModal() {
        renderCategoryList();
        document.getElementById('newCategoryInput').value = '';
        document.getElementById('categoryModal').classList.add('open');
    }

    function closeCategoryModal() {
        document.getElementById('categoryModal').classList.remove('open');
    }

    function renderCategoryList() {
        const list = document.getElementById('categoryList');
        list.innerHTML = state.categories.map(c => `
            <div class="category-chip" style="background:${c.color}">
                ${escapeHtml(c.name)}
                <button class="remove-cat" onclick="removeCategory('${c.id}')">✕</button>
            </div>`).join('');
    }

    function addCategory() {
        const input = document.getElementById('newCategoryInput');
        const name = input.value.trim();
        if (!name) return;

        const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (state.categories.find(c => c.id === id)) {
            alert('Esta categoría ya existe');
            return;
        }

        const colorIndex = state.categories.length % CATEGORY_COLORS.length;
        state.categories.push({ id, name, color: CATEGORY_COLORS[colorIndex] });

        saveData();
        render();
        renderCategoryList();
        input.value = '';
    }

    function removeCategory(id) {
        if (state.transactions.some(t => t.category === id)) {
            alert('No puedes eliminar una categoría en uso');
            return;
        }
        state.categories = state.categories.filter(c => c.id !== id);
        saveData();
        render();
        renderCategoryList();
    }

    // =====================
    // HELPERS
    // =====================
    function formatMoney(amount) {
        return '$' + amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // =====================
    // INIT
    // =====================
    loadData();
    render();