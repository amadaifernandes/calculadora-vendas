const CACHE_KEY = 'vd_cache_v5';
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
    let totalFinal = 0; 
    let units = 0;
    let count = 0;

 inputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            count++;
            units += qty;

            // 1. Pegamos o preço bruto (sem arredondar nada!)
            const precoUnitario = _prices[parseInt(input.dataset.idx)];
            
            // 2. Calculamos o subtotal desta linha
            // 3. Arredondamos o resultado DA LINHA para 2 casas (exatamente como o Excel)
            const subtotalLinha = Math.round((qty * precoUnitario) * 100) / 100;
            
            totalFinal += subtotalLinha;
        }
    });

    const errEl = document.getElementById('erroValidacao');
    const resEl = document.getElementById('resultado');
    const msgEl = document.getElementById('mensagemErro');

    errEl.classList.remove('show');
    resEl.classList.remove('show');

    // Validações de quantidade e unidades
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
    // Exibição do resultado formatado
    document.getElementById('valorTotal').textContent = totalFinal.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    });
    
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
    _prices = marcas.flatMap(marca => marca.produtos.map(p => Math.round(p.preco * 100)));

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
