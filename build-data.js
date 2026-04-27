#!/usr/bin/env node
/**
 * build-data.js
 *
 * Le um .xlsx com a base de precos e gera o data.duty (JSON em base64)
 * consumido pelo frontend.
 *
 * Layout esperado da planilha (a partir da linha 2):
 *   A: MARCA
 *   B: CATEGORIA (ignorada)
 *   C: PRODUTO PRICING
 *   D: PRECO VAREJO  -- le o valor numerico bruto da celula (.v),
 *                       nunca o texto formatado, para preservar decimais.
 *
 * Uso:
 *   node build-data.js <input.xlsx> [output=data.duty] [--sheet=Nome] [--json]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(
    args.filter(a => a.startsWith('--')).map(a => {
        const [k, v = true] = a.replace(/^--/, '').split('=');
        return [k, v];
    })
);

const inputXlsx = positional[0];
const outputDuty = positional[1] || 'data.duty';

if (!inputXlsx) {
    console.error('Uso: node build-data.js <input.xlsx> [output=data.duty] [--sheet=Nome] [--json]');
    process.exit(1);
}
if (!fs.existsSync(inputXlsx)) {
    console.error('Arquivo nao encontrado: ' + inputXlsx);
    process.exit(1);
}

const wb = XLSX.readFile(inputXlsx, { cellNF: false, cellText: false });
const sheetName = flags.sheet || wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

if (!sheet) {
    console.error('Planilha "' + sheetName + '" nao encontrada. Disponiveis: ' + wb.SheetNames.join(', '));
    process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

const marcasMap = new Map();
let pulados = 0;

for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const marca = row[0];
    const produto = row[2];
    const preco = row[3];

    if (!marca || !produto || preco == null || preco === '') {
        pulados++;
        continue;
    }

    const precoNum = typeof preco === 'number'
        ? preco
        : Number(String(preco).replace(',', '.'));

    if (!Number.isFinite(precoNum)) {
        console.warn('Linha ' + (i + 1) + ': preco invalido (' + preco + ') - ignorada');
        pulados++;
        continue;
    }

    const marcaKey = String(marca).trim();
    if (!marcasMap.has(marcaKey)) marcasMap.set(marcaKey, []);
    marcasMap.get(marcaKey).push({ nome: String(produto).trim(), preco: precoNum });
}

const data = {
    marcas: [...marcasMap.entries()].map(([nome, produtos]) => ({ nome, produtos }))
};

// JSON minificado (sem indentacao) para reduzir o payload baixado pelo browser.
// Escapa caracteres nao-ASCII para \uXXXX: o frontend usa atob(), que decodifica
// base64 como Latin-1; sem escape, multibytes UTF-8 quebram o JSON.
const json = JSON.stringify(data)
    .replace(/[\u0080-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const duty = Buffer.from(json, 'ascii').toString('base64');

fs.writeFileSync(outputDuty, duty);

if (flags.json) {
    // Versao indentada apenas para inspecao humana (nao e a que vai pro browser).
    const jsonPath = outputDuty.replace(/\.duty$/, '') + '.json';
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log('JSON legivel: ' + jsonPath);
}

const totalProdutos = data.marcas.reduce((s, m) => s + m.produtos.length, 0);
console.log('OK ' + path.basename(outputDuty) + ' gerado');
console.log('  Marcas:   ' + data.marcas.length);
console.log('  Produtos: ' + totalProdutos);
if (pulados) console.log('  Linhas puladas: ' + pulados);