const CACHE_KEY = 'vd_cache_v2';
const DATA_URL = 'data.duty';

// Preços carregados em memória — nunca expostos no DOM
let _prices = [];

function renderProducts(marcas) {
    const container = document.getElementById('produtos-container');
    container.innerHTML = '';
    let idx = 0;

    for (const marca of marcas) {
        const section = document.createElement('div');
        section.className = 'marca-section';

        const header = document.createElement('div');
        header.className = 'marca-header';
        header.innerHTML = `<span>${marca.nome}</span><span class="toggle-icon">▼</span>`;

        const grid = document.createElement('div');
        grid.className = 'produtos-grid';

        for (const produto of marca.produtos) {
            const item = document.createElement('div');
            item.className = 'produto-item';
            item.dataset.nome = produto.nome.toLowerCase();
            item.dataset.marca = marca.nome.toLowerCase();
            item.innerHTML = `
                <div class="produto-nome">${produto.nome}</div>
                <div class="produto-input">
                    <label>Qtd:</label>
                    <input type="number" class="produto-qty" min="0" value="" data-idx="${idx++}">
                </div>`;
            grid.appendChild(item);
        }

        header.onclick = function () {
            this.classList.toggle('collapsed');
            grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
        };

        section.appendChild(header);
        section.appendChild(grid);
        container.appendChild(section);
    }
}

function calcular() {
    const inputs = document.querySelectorAll('.produto-qty');
    let total = 0, units = 0, count = 0;

    inputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            count++;
            units += qty;
            total += qty * _prices[parseInt(input.dataset.idx)];
        }
    });

    const errEl = document.getElementById('erroValidacao');
    const resEl = document.getElementById('resultado');
    const msgEl = document.getElementById('mensagemErro');

    errEl.classList.remove('show');
    resEl.classList.remove('show');

    if (count < 3) {
        msgEl.innerHTML = `Você precisa selecionar pelo menos <strong>3 produtos diferentes</strong>.<br>Atualmente você tem: ${count} produto(s).`;
        errEl.classList.add('show');
        return;
    }
    if (units < 100) {
        msgEl.innerHTML = `Você precisa de pelo menos <strong>100 unidades no total</strong>.<br>Atualmente você tem: ${units} unidade(s).`;
        errEl.classList.add('show');
        return;
    }

    total = Math.round(total / 5) * 5;
    document.getElementById('valorTotal').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
    resEl.classList.add('show');
}

function limpar() {
    document.querySelectorAll('.produto-qty').forEach(i => i.value = 0);
    document.getElementById('resultado').classList.remove('show');
    document.getElementById('erroValidacao').classList.remove('show');
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.produto-item').forEach(i => i.classList.remove('hidden'));
}

async function loadData() {
    let raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
        const res = await fetch(DATA_URL);
        raw = (await res.text()).trim();
        sessionStorage.setItem(CACHE_KEY, raw);
    }
    return JSON.parse(atob(raw));
}

async function init() {
    const { marcas } = await loadData();

    // Popula array de preços em memória na mesma ordem que os inputs serão renderizados
    _prices = marcas.flatMap(marca => marca.produtos.map(p => p.preco));

    renderProducts(marcas);

    document.getElementById('searchInput').addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.produto-item').forEach(item => {
            item.classList.toggle('hidden',
                !item.dataset.nome.includes(term) && !item.dataset.marca.includes(term)
            );
        });
    });
}

init();

// Anti-screenshot
(function () {
    const overlay = document.getElementById('antiScreenshot');

    function escurecer() {
        overlay.style.display = 'block';
        document.body.style.filter = 'brightness(0)';
    }
    function clarear() {
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.style.filter = '';
        }, 400);
    }

    document.addEventListener('keyup', function (e) {
        if (e.key === 'PrintScreen') {
            escurecer(); clarear();
            try { navigator.clipboard.writeText(''); } catch (e) { }
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key === 'p') e.preventDefault();
    });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') escurecer(); else clarear();
    });
    window.addEventListener('blur', escurecer);
    window.addEventListener('focus', clarear);

    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';
})();
