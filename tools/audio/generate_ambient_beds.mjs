import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48_000;
const CHANNELS = 1;
const DURATION_SECONDS = 30;
const PERIODIC_BASIS = 'integer_harmonics_full_loop';
export const DOCUMENTED_AUDIO_TOOLCHAIN = Object.freeze({
    ffmpeg: 'ffmpeg version 8.1.2-full_build-www.gyan.dev',
    ffprobe: 'ffprobe version 8.1.2-full_build-www.gyan.dev',
});

export const OGG_ENCODING_ARGUMENTS = Object.freeze([
    '-fflags', '+bitexact',
    '-flags:a', '+bitexact',
    '-map_metadata', '-1',
    '-c:a', 'libvorbis',
    '-q:a', '4',
    '-ar', String(SAMPLE_RATE),
    '-ac', String(CHANNELS),
]);

function nextUnitFloat(state) {
    let value = state.value >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.value = value >>> 0;
    return state.value / 0x1_0000_0000;
}

function buildHarmonics(seed, bands) {
    const state = { value: seed >>> 0 };
    const harmonics = [];
    const usedMultiples = new Set();
    for (const band of bands) {
        const minimumMultiple = Math.ceil(band.minimumHz * DURATION_SECONDS);
        const maximumMultiple = Math.floor(band.maximumHz * DURATION_SECONDS);
        for (let index = 0; index < band.count; index += 1) {
            let multiple = minimumMultiple + Math.floor(nextUnitFloat(state) * (maximumMultiple - minimumMultiple + 1));
            while (usedMultiples.has(multiple)) {
                multiple = multiple === maximumMultiple ? minimumMultiple : multiple + 1;
            }
            usedMultiples.add(multiple);
            const bandPosition = (multiple - minimumMultiple) / Math.max(1, maximumMultiple - minimumMultiple);
            harmonics.push(Object.freeze({
                multiple,
                amplitude: band.gain * (1 - 0.55 * bandPosition) * (0.7 + nextUnitFloat(state) * 0.3),
                phaseRadians: nextUnitFloat(state) * Math.PI * 2,
            }));
        }
    }
    return Object.freeze(harmonics.sort((left, right) => left.multiple - right.multiple));
}

function recipe(cueId, recipeId, seed, peakAmplitude, contentTags, bands) {
    return Object.freeze({
        cueId,
        recipeId,
        seed,
        sampleRate: SAMPLE_RATE,
        channels: CHANNELS,
        durationSeconds: DURATION_SECONDS,
        periodicBasis: PERIODIC_BASIS,
        peakAmplitude,
        contentTags: Object.freeze(contentTags),
        harmonics: buildHarmonics(seed, bands),
    });
}

export const AMBIENT_BED_RECIPES = Object.freeze([
    recipe(
        'ambient_warroom',
        'awwv-restrained-ambient-v1-warroom-hvac-room-texture',
        0x57415231,
        0.052,
        ['restrained_ambient', 'interior_hvac', 'room_texture', 'voice_free', 'nonmusical'],
        [
            { minimumHz: 22, maximumHz: 95, count: 30, gain: 1 },
            { minimumHz: 96, maximumHz: 420, count: 38, gain: 0.46 },
            { minimumHz: 421, maximumHz: 1_400, count: 28, gain: 0.13 },
        ],
    ),
    recipe(
        'ambient_field',
        'awwv-restrained-ambient-v1-field-wind-environmental-rumble',
        0x46494531,
        0.058,
        ['restrained_ambient', 'wind', 'environmental_rumble', 'voice_free', 'nonmusical', 'combat_free'],
        [
            { minimumHz: 18, maximumHz: 78, count: 28, gain: 0.82 },
            { minimumHz: 79, maximumHz: 650, count: 44, gain: 0.58 },
            { minimumHz: 651, maximumHz: 2_600, count: 36, gain: 0.19 },
        ],
    ),
    recipe(
        'ambient_archive',
        'awwv-restrained-ambient-v1-archive-paper-air-room-texture',
        0x41524331,
        0.043,
        ['restrained_ambient', 'paper_air', 'quiet_room', 'voice_free', 'nonmusical'],
        [
            { minimumHz: 28, maximumHz: 130, count: 24, gain: 0.56 },
            { minimumHz: 131, maximumHz: 900, count: 42, gain: 0.48 },
            { minimumHz: 901, maximumHz: 3_400, count: 38, gain: 0.15 },
        ],
    ),
]);

const RECIPES_BY_ID = new Map(AMBIENT_BED_RECIPES.map((entry) => [entry.cueId, entry]));

function renderMonoPcm16(recipeMetadata) {
    const sampleCount = recipeMetadata.sampleRate * recipeMetadata.durationSeconds;
    const floatingPoint = new Float64Array(sampleCount);
    let absolutePeak = 0;

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        const loopPosition = sampleIndex / sampleCount;
        let sample = 0;
        for (const harmonic of recipeMetadata.harmonics) {
            sample += harmonic.amplitude * Math.sin(
                Math.PI * 2 * harmonic.multiple * loopPosition + harmonic.phaseRadians,
            );
        }
        floatingPoint[sampleIndex] = sample;
        absolutePeak = Math.max(absolutePeak, Math.abs(sample));
    }

    const scale = absolutePeak > 0 ? recipeMetadata.peakAmplitude / absolutePeak : 0;
    const pcm = Buffer.allocUnsafe(sampleCount * 2);
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        const quantized = Math.round(Math.max(-1, Math.min(1, floatingPoint[sampleIndex] * scale)) * 32_767);
        pcm.writeInt16LE(quantized, sampleIndex * 2);
    }
    return pcm;
}

export function renderAmbientBedPcm16(cueId) {
    const recipeMetadata = RECIPES_BY_ID.get(cueId);
    if (!recipeMetadata) throw new Error(`unknown ambient cue: ${cueId}`);
    return renderMonoPcm16(recipeMetadata);
}

export function ambientBytesMatchSha256(bytes, expectedSha256) {
    const actualSha256 = createHash('sha256').update(bytes).digest('hex');
    return actualSha256 === expectedSha256.toLowerCase();
}

function wavFromMonoPcm16(pcm, sampleRate) {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * 2;
    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(CHANNELS, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
}

function runFfmpeg(inputPath, outputPath) {
    const argumentsList = [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', inputPath,
        ...OGG_ENCODING_ARGUMENTS,
        outputPath,
    ];
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn('ffmpeg', argumentsList, { stdio: ['ignore', 'inherit', 'inherit'] });
        child.once('error', rejectPromise);
        child.once('exit', (code) => {
            if (code === 0) resolvePromise();
            else rejectPromise(new Error(`ffmpeg exited with code ${String(code)}`));
        });
    });
}

function captureVersion(command) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.once('error', rejectPromise);
        child.once('exit', (code) => {
            if (code !== 0) {
                rejectPromise(new Error(`${command} -version exited with code ${String(code)}: ${stderr.trim()}`));
                return;
            }
            resolvePromise(stdout.split(/\r?\n/u, 1)[0] ?? '');
        });
    });
}

export function validateDocumentedAudioToolchainVersions(versions) {
    const matchesVersionLine = (actual, documented) => actual === documented || actual.startsWith(`${documented} `);
    if (!matchesVersionLine(versions.ffmpeg, DOCUMENTED_AUDIO_TOOLCHAIN.ffmpeg)) {
        throw new Error(`unsupported ffmpeg toolchain: ${versions.ffmpeg}`);
    }
    if (!matchesVersionLine(versions.ffprobe, DOCUMENTED_AUDIO_TOOLCHAIN.ffprobe)) {
        throw new Error(`unsupported ffprobe toolchain: ${versions.ffprobe}`);
    }
}

export async function assertDocumentedAudioToolchain() {
    const [ffmpeg, ffprobe] = await Promise.all([
        captureVersion('ffmpeg'),
        captureVersion('ffprobe'),
    ]);
    validateDocumentedAudioToolchainVersions({ ffmpeg, ffprobe });
}

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIRECTORY = resolve(SCRIPT_DIRECTORY, '../../src/ui/map/assets/audio/ambient');

export async function ambientBedMatchesSha256(filePath, expectedSha256) {
    const bytes = await readFile(resolve(filePath));
    return ambientBytesMatchSha256(bytes, expectedSha256);
}

export async function publishAmbientBedOgg(cueId, pcm, options = {}) {
    const recipeMetadata = RECIPES_BY_ID.get(cueId);
    if (!recipeMetadata) throw new Error(`unknown ambient cue: ${cueId}`);

    const outputDirectory = resolve(options.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY);
    await mkdir(outputDirectory, { recursive: true });
    const temporaryDirectory = await mkdtemp(join(outputDirectory, `.awwv-${cueId}-`));
    const temporaryWav = join(temporaryDirectory, `${cueId}.wav`);
    const temporaryOgg = join(temporaryDirectory, `${cueId}.ogg`);
    const outputPath = join(outputDirectory, `${cueId}.ogg`);
    try {
        await writeFile(temporaryWav, wavFromMonoPcm16(pcm, recipeMetadata.sampleRate));
        await (options.encodeOgg ?? runFfmpeg)(temporaryWav, temporaryOgg);
        const encoded = await stat(temporaryOgg);
        if (!encoded.isFile() || encoded.size <= 4) throw new Error(`${cueId} encoder produced no OGG payload`);
        const signature = await readFile(temporaryOgg);
        if (signature.subarray(0, 4).toString('ascii') !== 'OggS') {
            throw new Error(`${cueId} encoder produced an invalid OGG container`);
        }
        await rename(temporaryOgg, outputPath);
        return outputPath;
    } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
    }
}

export async function generateAmbientBed(cueId, options = {}) {
    const pcm = renderAmbientBedPcm16(cueId);
    return publishAmbientBedOgg(cueId, pcm, options);
}

async function main() {
    const argumentsList = process.argv.slice(2);
    const verifyToolchain = argumentsList.includes('--verify-toolchain');
    const requestedCueIds = argumentsList.filter((argument) => argument !== '--verify-toolchain');
    if (verifyToolchain) await assertDocumentedAudioToolchain();
    const cueIds = requestedCueIds.length > 0 ? requestedCueIds : AMBIENT_BED_RECIPES.map((entry) => entry.cueId);
    for (const cueId of cueIds) {
        const outputPath = await generateAmbientBed(cueId);
        process.stdout.write(`${cueId}: ${outputPath}\n`);
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}
