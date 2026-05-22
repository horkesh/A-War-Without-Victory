#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CATEGORY_PATTERNS = {
    as_factionid_casts: /\bas\s+FactionId\b/g,
    as_unknown_casts: /\bas\s+unknown\b/g,
    as_any_casts: /\bas\s+any\b/g,
    non_null_assertions_dot: /\b[A-Za-z_$][\w$]*!\./g,
    non_null_assertions_index: /\b[A-Za-z_$][\w$]*!\[/g,
};

const CATEGORY_NAMES = Object.keys(CATEGORY_PATTERNS);
const DOMAIN_NAMES = ['sim', 'state', 'scenario', 'ipc', 'ui_adapter', 'derived', 'unknown'];

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function sortObject(value) {
    if (Array.isArray(value)) return value.map(sortObject);
    if (value == null || typeof value !== 'object') return value;
    const sorted = {};
    for (const key of Object.keys(value).sort(strictCompare)) {
        sorted[key] = sortObject(value[key]);
    }
    return sorted;
}

function stableStringify(value) {
    return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}

function shouldSkipPath(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.includes('/node_modules/')
        || normalized.includes('/src/_archived/');
}

function listSourceFiles(rootDir) {
    const srcDir = path.resolve(rootDir, 'src');
    if (!fs.existsSync(srcDir)) return [];
    const files = [];
    const stack = [srcDir];

    while (stack.length > 0) {
        const dir = stack.pop();
        if (!dir || shouldSkipPath(`${dir}/`)) continue;
        const entries = fs.readdirSync(dir, { withFileTypes: true })
            .slice()
            .sort((a, b) => strictCompare(a.name, b.name));

        for (let index = entries.length - 1; index >= 0; index -= 1) {
            const entry = entries[index];
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!shouldSkipPath(`${fullPath}/`)) stack.push(fullPath);
            } else if (entry.isFile() && /\.(ts|tsx|js|cjs|mjs)$/.test(entry.name) && !shouldSkipPath(fullPath)) {
                files.push(path.resolve(fullPath));
            }
        }
    }

    return files.sort(strictCompare);
}

function countBraceDelta(line) {
    let delta = 0;
    for (const ch of line) {
        if (ch === '{') delta += 1;
        if (ch === '}') delta -= 1;
    }
    return delta;
}

function classifyDomain(interfaceName, filePath) {
    const name = String(interfaceName || '');
    const normalized = filePath.replace(/\\/g, '/');

    if (/Renderer|Ui|UI|Adapter|View|Component|Warroom|Map/.test(name) || normalized.includes('/src/ui/')) {
        return 'ui_adapter';
    }
    if (/Ipc|IPC|Desktop|Bridge|Preload/.test(name) || normalized.includes('/src/desktop/')) {
        return 'ipc';
    }
    if (/Scenario|Save|Load|Migration/.test(name) || normalized.includes('/src/scenario/')) {
        return 'scenario';
    }
    if (/Derived|Exposure|Trend|Summary|Descriptor|Snapshot/.test(name)) {
        return 'derived';
    }
    if (/Sim|Military|Combat|Corps|Formation|Brigade|Operation|Sector|Front|Army|Commander|Doctrine|Equipment|Readiness|Paramilitary|Supply|Reserve|JNA|Militia|Fatigue/.test(name)) {
        return 'sim';
    }
    if (normalized.endsWith('/src/state/game_state.ts')) {
        return 'state';
    }
    if (/State|Meta|Political|Displacement|Settlement|Municipality|Negotiation|Endgame|Authority|Control|Legitimacy|Collapse|Strain|Capacity|Enclave|Sustainability|Casualt/.test(name)) {
        return 'state';
    }
    return 'unknown';
}

function buildOccurrence(filePath, lineNumber, column, matchText, lineText, extra = {}) {
    return {
        file: path.resolve(filePath),
        line: lineNumber,
        column,
        match: matchText,
        text: lineText.trim(),
        ...extra,
    };
}

function scanEscapeHatches(filePath, source) {
    const lines = source.split(/\r?\n/);
    const results = {};
    for (const category of CATEGORY_NAMES) results[category] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        for (const category of CATEGORY_NAMES) {
            const pattern = CATEGORY_PATTERNS[category];
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
                results[category].push(buildOccurrence(
                    filePath,
                    lineIndex + 1,
                    match.index + 1,
                    match[0],
                    line,
                ));
            }
        }
    }

    return results;
}

function scanOptionalGameStateFields(rootDir) {
    const gameStatePath = path.resolve(rootDir, 'src', 'state', 'game_state.ts');
    if (!fs.existsSync(gameStatePath)) return [];
    const source = fs.readFileSync(gameStatePath, 'utf8');
    const lines = source.split(/\r?\n/);
    const fields = [];
    let currentInterface = null;
    let interfaceDepth = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const interfaceMatch = line.match(/^\s*export\s+interface\s+([A-Za-z_$][\w$]*)\b/);
        if (interfaceMatch) {
            currentInterface = interfaceMatch[1];
            interfaceDepth = countBraceDelta(line);
            continue;
        }

        if (currentInterface) {
            const fieldMatch = line.match(/^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\?:/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const domain = classifyDomain(currentInterface, gameStatePath);
                fields.push(buildOccurrence(
                    gameStatePath,
                    lineIndex + 1,
                    line.indexOf(fieldName) + 1,
                    `${fieldName}?:`,
                    line,
                    {
                        interface: currentInterface,
                        field: fieldName,
                        domain,
                    },
                ));
            }

            interfaceDepth += countBraceDelta(line);
            if (interfaceDepth <= 0) {
                currentInterface = null;
                interfaceDepth = 0;
            }
        }
    }

    return fields.sort(compareOccurrence);
}

function compareOccurrence(a, b) {
    return strictCompare(a.file, b.file)
        || a.line - b.line
        || a.column - b.column
        || strictCompare(a.match, b.match);
}

function buildCategory(occurrences) {
    const sorted = occurrences.slice().sort(compareOccurrence);
    const countsByFile = {};
    for (const occurrence of sorted) {
        countsByFile[occurrence.file] = (countsByFile[occurrence.file] || 0) + 1;
    }
    return {
        count: sorted.length,
        counts_by_file: countsByFile,
        occurrences: sorted,
    };
}

function buildHotspots(categories) {
    const hotspots = {};
    for (const category of Object.keys(categories).sort(strictCompare)) {
        const countsByFile = categories[category].counts_by_file || {};
        hotspots[category] = Object.keys(countsByFile)
            .sort((a, b) => countsByFile[b] - countsByFile[a] || strictCompare(a, b))
            .slice(0, 20)
            .map(file => ({ file, count: countsByFile[file] }));
    }
    return hotspots;
}

function buildDomainReport(optionalFields) {
    const domainCounts = {};
    const fieldsByDomain = {};
    const unknown_justifications = [];
    for (const domain of DOMAIN_NAMES) {
        domainCounts[domain] = 0;
        fieldsByDomain[domain] = [];
    }

    for (const field of optionalFields) {
        const domain = DOMAIN_NAMES.includes(field.domain) ? field.domain : 'unknown';
        domainCounts[domain] += 1;
        fieldsByDomain[domain].push(`${field.interface}.${field.field}`);
        if (domain === 'unknown') {
            unknown_justifications.push({
                field: `${field.interface}.${field.field}`,
                reason: 'no classifier rule matched interface or file path',
            });
        }
    }

    for (const domain of DOMAIN_NAMES) {
        fieldsByDomain[domain] = fieldsByDomain[domain].sort(strictCompare);
    }

    return {
        total: optionalFields.length,
        domain_counts: domainCounts,
        fields_by_domain: fieldsByDomain,
        unknown_justifications,
    };
}

function buildInterfaceReport(optionalFields) {
    const byInterface = {};

    for (const field of optionalFields) {
        if (!byInterface[field.interface]) {
            byInterface[field.interface] = {
                interface: field.interface,
                domain: field.domain,
                count: 0,
                fields: [],
            };
        }

        byInterface[field.interface].count += 1;
        byInterface[field.interface].fields.push(field.field);
    }

    const interfaces = Object.values(byInterface)
        .map((entry) => ({
            ...entry,
            fields: entry.fields.sort(strictCompare),
        }))
        .sort((a, b) => b.count - a.count || strictCompare(a.interface, b.interface));

    const byDomain = {};
    for (const domain of DOMAIN_NAMES) byDomain[domain] = [];
    for (const entry of interfaces) {
        const domain = DOMAIN_NAMES.includes(entry.domain) ? entry.domain : 'unknown';
        byDomain[domain].push({
            interface: entry.interface,
            count: entry.count,
        });
    }

    for (const domain of DOMAIN_NAMES) {
        byDomain[domain] = byDomain[domain].sort((a, b) => b.count - a.count || strictCompare(a.interface, b.interface));
    }

    return {
        total: optionalFields.length,
        interfaces,
        by_domain: byDomain,
    };
}

function buildOptionalFieldReports(optionalFields) {
    return {
        domains: buildDomainReport(optionalFields),
        interfaces: buildInterfaceReport(optionalFields),
    };
}

function buildInventory(rootDir = process.cwd()) {
    const resolvedRoot = path.resolve(rootDir);
    const collected = {};
    for (const category of CATEGORY_NAMES) collected[category] = [];

    for (const filePath of listSourceFiles(resolvedRoot)) {
        const source = fs.readFileSync(filePath, 'utf8');
        const fileResults = scanEscapeHatches(filePath, source);
        for (const category of CATEGORY_NAMES) {
            collected[category].push(...fileResults[category]);
        }
    }

    const optionalFields = scanOptionalGameStateFields(resolvedRoot);
    collected.optional_fields_game_state = optionalFields;

    const categories = {};
    for (const category of [...CATEGORY_NAMES, 'optional_fields_game_state']) {
        categories[category] = buildCategory(collected[category]);
    }

    const counts = {};
    for (const category of Object.keys(categories).sort(strictCompare)) {
        counts[category] = categories[category].count;
    }

    const optionalFieldReports = buildOptionalFieldReports(optionalFields);

    return {
        generated_by: 'tools/diagnostics/strict_null_inventory.cjs',
        scanned_root: resolvedRoot,
        counts,
        categories,
        hotspots: buildHotspots(categories),
        optional_field_domains: optionalFieldReports.domains,
        optional_field_interfaces: optionalFieldReports.interfaces,
    };
}

function main(argv) {
    const args = argv.slice(2);
    const fieldDomainsOnly = args.includes('--field-domains');
    const fieldInterfacesOnly = args.includes('--field-interfaces');
    const rootArg = args.find(arg => arg !== '--field-domains' && arg !== '--field-interfaces') || process.cwd();
    const inventory = buildInventory(rootArg);
    const output = fieldDomainsOnly
        ? inventory.optional_field_domains
        : fieldInterfacesOnly
            ? inventory.optional_field_interfaces
            : inventory;
    process.stdout.write(stableStringify(output));
}

if (require.main === module) {
    main(process.argv);
}

module.exports = {
    buildInventory,
    classifyDomain,
    buildInterfaceReport,
    stableStringify,
};
