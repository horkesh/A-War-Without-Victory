#!/usr/bin/env node
import { resolve } from 'node:path';

import {
    formatCpuProfileMarkdown,
    summarizeCpuProfile,
    readCpuProfile,
    writeCpuProfileSummaryFiles,
} from './cpu_profile_analysis.js';

interface Args {
    profilePath: string;
    appRoot?: string;
    topN: number;
    applicationOnly: boolean;
    jsonOut?: string;
    markdownOut?: string;
}

function parseArgs(argv: string[]): Args {
    let profilePath = '';
    let appRoot: string | undefined;
    let topN = 25;
    let applicationOnly = false;
    let jsonOut: string | undefined;
    let markdownOut: string | undefined;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--profile' && argv[i + 1]) {
            profilePath = argv[++i];
        } else if (arg === '--app-root' && argv[i + 1]) {
            appRoot = argv[++i];
        } else if (arg === '--top' && argv[i + 1]) {
            topN = Number.parseInt(argv[++i], 10);
        } else if (arg === '--application-only') {
            applicationOnly = true;
        } else if (arg === '--json-out' && argv[i + 1]) {
            jsonOut = argv[++i];
        } else if (arg === '--markdown-out' && argv[i + 1]) {
            markdownOut = argv[++i];
        } else if (!profilePath) {
            profilePath = arg;
        }
    }

    if (!profilePath) {
        throw new Error(
            'usage: analyze_cpu_profile --profile PATH [--app-root DIR] [--application-only] [--top N] [--json-out PATH] [--markdown-out PATH]',
        );
    }
    if (!Number.isFinite(topN) || topN <= 0) {
        throw new Error('--top must be a positive integer');
    }

    return {
        profilePath: resolve(profilePath),
        appRoot: appRoot ? resolve(appRoot) : undefined,
        topN,
        applicationOnly,
        jsonOut: jsonOut ? resolve(jsonOut) : undefined,
        markdownOut: markdownOut ? resolve(markdownOut) : undefined,
    };
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const options = {
        appRoot: args.appRoot,
        topN: args.topN,
        applicationOnly: args.applicationOnly,
        jsonOut: args.jsonOut,
        markdownOut: args.markdownOut,
    };
    const summary = args.jsonOut || args.markdownOut
        ? writeCpuProfileSummaryFiles(args.profilePath, options)
        : summarizeCpuProfile(readCpuProfile(args.profilePath), options);

    process.stdout.write(formatCpuProfileMarkdown(summary));
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`analyze_cpu_profile failed: ${message}\n`);
    process.exitCode = 1;
});
