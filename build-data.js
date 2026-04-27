#!/usr/bin/env node
/**
 * build-data.js
 *
 * Lê um .xlsx com a base de preços e gera o data.duty (JSON em base64)
 * consumido pelo frontend.
 *
 * Layout esperado da planilha (a partir da linha 2):
 *   A: MARCA
 *   B: CATEGORIA (ignorada)
 *   C: PRODUTO PRICING
 *   D: PREÇO VAREJO  ← lê o valor numérico bruto da célula (.v),
 *                      nunca o texto formatado, para preservar decimais
 *
 * Uso:
 *   node build-data.js <input.xlsx> [output=data.duty] [--sheet=Nome] [--json]
 *
 *   --json  também grava um arquivo .json legível ao lado do .duty
 *           (útil para conferência / diff)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// ---------- CLI ----------
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
    console.error(`Arquivo não encontrado: ${inputXlsx}`);
    process.exit(1);
}

// ---------- Leitura ----------
const wb = XLSX.readFile(inputXlsx, { cellNF: false, cellText: false });
const sheetName = flags.sheet || wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

if (!sheet) {
    console.error(`Planilha "${sheetName}" não encontrada. Disponíveis: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
}

// header:1 devolve array de arrays; raw:true mantém número como número
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

// ---------- Transformação ----------
const marcasMap = new Map(); // preserva ordem de inserção

let pulados = 0;
for (let i = 1; i < rows.length; i++) {  // i=1 pula o cabeçalho
    const [marca, , produto, preco] = rows[i] || [];

    if (!marca || !produto || preco == null || preco === '') {
        pulados++;
        continue;
    }

    const precoNum = typeof preco === 'number' ? preco : Number(String(preco).replace(',', '.'));
    if (!Number.isFinite(precoNum)) {
        console.warn(`Linha ${i + 1}: preço inválido (${preco}) — ignorada`);
        pulados++;
        continue;
    }

    const marcaKey = String(marca).trim();
    if (!marcasMap.has(marcaKey)) {
        marcasMap.set(marcaKey, []);
    }
    marcasMap.get(marcaKey).push({
        nome: String(produto).trim(),
        preco: precoNum
    });
}

const data = {
    marcas: [...marcasMap.entries()].map(([nome, produtos]) => ({ nome, produtos }))
};

// ---------- Saída ----------
const json = JSON.stringify(data, null, 2);
const duty = Buffer.from(json, 'utf8').toString('base64');

fs.writeFileSync(outputDuty, duty);

if (flags.json) {
    const jsonPath = outputDuty.replace(/\.duty$/, '') + '.json';
    fs.writeFileSync(jsonPath, json);
    console.log(`✓ JSON legível: ${jsonPath}`);
}

const totalProdutos = data.marcas.reduce((s, m) => s + m.produtos.length, 0);
console.log(`✓ ${path.basename(outputDuty)} gerado`);
console.log(`  Marcas:   ${data.marcas.length}`);
console.log(`  Produtos: ${totalProdutos}`);
if (pulados) console.log(`  Linhas puladas: ${pulados}`);