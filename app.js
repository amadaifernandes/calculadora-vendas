// --- CONFIGURAÇÕES ---
const CACHE_KEY = 'vd_cache_v5';
const DATA_URL = 'data.duty';

// Preços carregados em memória
let _prices = [];

// --- FUNÇÃO: MOSTRAR PRODUTOS NA TELA ---
function renderProducts(marcas) {
    const container = document.getElementById('produtos-container');
    if (!container) return; // Segurança caso o HTML não tenha o container
    
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

// --- FUNÇÃO: CALCULAR O TOTAL (CORRIGIDA PARA BATER COM EXCEL) ---
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
            
            // Pega o preço original sem arredondar
            const precoUnitario = _prices[parseInt(input.dataset.idx)];
            
            // Calcula o subtotal da linha e arredonda para o centavo mais próximo
            // Isso simula o comportamento do Excel de somar valores monetários
            const subtotalLinha = Math.round((qty * precoUnitario) * 100) / 100;
            
            totalFinal += subtotalLinha;
        }
    });

    const errEl = document.getElementById('erroValidacao');
    const resEl = document.getElementById('resultado');
    const msgEl = document.getElementById('mensagemErro');
    const displayTotal = document.getElementById('valorTotal');

    // Reset de mensagens
    errEl.classList.remove('show');
    resEl.classList.remove('show');

    // Validações
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

    // Exibe o resultado formatado como dinheiro (R$ 1.234,56)
    displayTotal.textContent = totalFinal.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    });
    
    resEl.classList.add('show');
}

// --- FUNÇÃO: LIMPAR TUDO ---
function limpar() {
    document.querySelectorAll('.produto-qty').forEach(i => i.value = '');
    document.getElementById('resultado').classList.remove('show');
    document.getElementById('erroValidacao').classList.remove('show');
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.produto-item').forEach(i => i.classList.remove('hidden'));
}

// --- FUNÇÃO: CARREGAR DADOS DO ARQUIVO ---
async function loadData() {
    let raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
        const res = await fetch(DATA_URL);
        raw = (await res.text()).trim();
        sessionStorage.setItem(CACHE_KEY, raw);
    }
    return JSON.parse(atob(raw));
}

// --- FUNÇÃO: INICIAR TUDO ---
async function init() {
    try {
        const { marcas } = await loadData();

        // Carrega os preços garantindo que sejam números decimais puros
        _prices = marcas.flatMap(marca => marca.produtos.map(p => parseFloat(p.preco)));

        // Desenha os produtos na tela
        renderProducts(marcas);

        // Configura a busca
        document.getElementById('searchInput').addEventListener('input', function (e) {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.produto-item').forEach(item => {
                item.classList.toggle('hidden',
                    !item.dataset.nome.includes(term) && !item.dataset.marca.includes(term)
                );
            });
        });
    } catch (error) {
        console.error("Erro ao iniciar o sistema:", error);
        alert("Erro ao carregar os dados. Verifique o console.");
    }
}

// --- EXECUÇÃO ---
init();
