const path = require('path');
const fs = require('fs');
const { Command } = require('commander');

const program = new Command();

// Configure the CLI
program
    .name('mockCli.mjs')
    .description('Google Play Console Data Fetcher (Mock Version)')
    .version('1.0.0')
    .addHelpText(
        'after',
        `
Examples:
  node mockCli.js -p com.example.app -c creds.json -A
  node mockCli.js --package com.example.app --creds-path creds.json -t production,beta -i icon,featureGraphic
  node mockCli.js -p com.example.app -c creds.json -t all -i all -j

Notes:
  - For comma-separated inputs, do not use spaces.
  - Use 'all' to select all supported values.
`
    );

// Required arguments
program
    .requiredOption('-p, --package <name>', 'Android application package name')
    .requiredOption(
        '-c, --creds-path <path>',
        'Path to Google service account credentials JSON file'
    );

// Resource flags
program
    .option(
        '-t, --tracks <tracks>',
        "Include tracks ('all' or comma-separated track names)"
    )
    .option('-a, --apks', 'Include APKs')
    .option('-b, --bundles', 'Include App Bundles')
    .option('-l, --listings', 'Include store listings')
    .option(
        '-i, --images <images>',
        "Include images ('all' or comma-separated image types)"
    )
    .option('-I, --inapps', 'Include in-app products')
    .option('-r, --reviews', 'Include reviews')
    .option('-v, --voided-purchases', 'Include voided purchases')
    .option(
        '-T, --testers <testers>',
        "Include testers ('all' or comma-separated track names)"
    )
    .option('-d, --app-details', 'Include app details')
    .option('-e, --expansion-files', 'Include expansion files')
    .option('-A, --all', 'Include all supported resources');

// Options
program
    .option(
        '-L, --images-language <lang>',
        'Listing language for images',
        'en-US'
    )
    .option(
        '-P, --reviews-pages <num>',
        'Number of review pages to fetch',
        (value) => {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed) || parsed < 1) {
                throw new Error('--reviews-pages must be a positive integer');
            }
            return parsed;
        },
        1
    )
    .option(
        '-S, --reviews-page-size <num>',
        'Reviews per page',
        (value) => {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed) || parsed < 1) {
                throw new Error('--reviews-page-size must be a positive integer');
            }
            return parsed;
        },
        100
    )
    .option('-j, --json', 'Output raw JSON instead of formatted tree');

// Custom validation function
const validateCommaSeperatedOrAll = (value, key) => {
    if (!value || !value.trim()) {
        throw new Error(`--${key} requires a non-empty value`);
    }

    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'all') {
        return trimmed; // 'all' is valid
    }

    // Check for comma-separated values
    if (
        trimmed.includes(',,') ||
        trimmed.startsWith(',') ||
        trimmed.endsWith(',')
    ) {
        throw new Error(`--${key} has invalid comma placement`);
    }

    const parts = trimmed
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    if (parts.length === 0) {
        throw new Error(
            `--${key} must be 'all' or a comma-separated list of values`
        );
    }

    return trimmed;
};

const validateTracks = (value) => {
    const validTracks = ['internal', 'alpha', 'beta', 'production'];
    const trimmed = value.trim();

    if (trimmed.toLowerCase() === 'all') {
        return trimmed;
    }

    const parts = trimmed.split(',').map((p) => p.trim().toLowerCase());
    const invalidTracks = parts.filter((track) => !validTracks.includes(track));

    if (invalidTracks.length > 0) {
        throw new Error(
            `Invalid track names: ${invalidTracks.join(', ')}. Valid tracks: ${validTracks.join(', ')}`
        );
    }

    return trimmed;
};

const validateImages = (value) => {
    const validImageTypes = [
        'icon',
        'featureGraphic',
        'tvBanner',
        'phoneScreenshots',
        'sevenInchScreenshots',
        'tenInchScreenshots',
        'tvScreenshots',
        'wearScreenshots',
    ];
    const trimmed = value.trim();

    if (trimmed.toLowerCase() === 'all') {
        return trimmed;
    }

    const parts = trimmed.split(',').map((p) => p.trim());
    const invalidTypes = parts.filter((type) => !validImageTypes.includes(type));

    if (invalidTypes.length > 0) {
        throw new Error(
            `Invalid image types: ${invalidTypes.join(', ')}. Valid types: ${validImageTypes.join(', ')}`
        );
    }

    return trimmed;
};

const validateTesters = (value) => {
    const validTracks = ['internal', 'alpha', 'beta', 'production'];
    const trimmed = value.trim();

    if (trimmed.toLowerCase() === 'all') {
        return trimmed;
    }

    const parts = trimmed.split(',').map((p) => p.trim().toLowerCase());
    const invalidTracks = parts.filter((track) => !validTracks.includes(track));

    if (invalidTracks.length > 0) {
        throw new Error(
            `Invalid tester track names: ${invalidTracks.join(', ')}. Valid tracks: ${validTracks.join(', ')}`
        );
    }

    return trimmed;
};

const filterTracks = (tracksData, selection) => {
    if (!tracksData || !tracksData.tracks) {
        return { kind: 'androidpublisher#tracksListResponse', tracks: [] };
    }

    if (selection === 'all') return tracksData;

    const wantedTracks = selection.split(',').map((t) => t.trim().toLowerCase());
    const filtered = tracksData.tracks.filter((track) =>
        wantedTracks.includes(track.track.toLowerCase())
    );

    return { ...tracksData, tracks: filtered };
};

const filterImages = (imagesData, selection) => {
    if (!imagesData) {
        return {};
    }

    if (selection === 'all') return imagesData;

    const wantedTypes = selection.split(',').map((t) => t.trim());
    const filtered = {};

    wantedTypes.forEach((type) => {
        if (imagesData[type]) {
            filtered[type] = imagesData[type];
        } else {
            // Add empty structure for requested but non-existent types
            filtered[type] = { images: [] };
        }
    });

    return filtered;
};

const filterTesters = (testersData, selection) => {
    if (!testersData) {
        return {};
    }

    if (selection === 'all') return testersData;

    const wantedTracks = selection.split(',').map((t) => t.trim().toLowerCase());
    const filtered = {};

    wantedTracks.forEach((track) => {
        if (testersData[track]) {
            filtered[track] = testersData[track];
        } else {
            // Add empty structure for requested but non-existent tracks
            filtered[track] = { googleGroups: [] };
        }
    });

    return filtered;
};

const printTreeOutput = (results) => {
    const printSection = (
        title,
        data,
        prefix = '',
        isLast = true,
        isRoot = false
    ) => {
        const branch = isRoot ? '\x1b[34m● \x1b[0m' : isLast ? '└─╴' : '├─╴';
        const space = isLast ? '    ' : '│   ';

        if (title) {
            console.log(`${prefix}${branch}\x1b[1m${title}\x1b[0m`);
        }

        const newPrefix = prefix + (space && !isRoot && title ? space : '');

        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                if (data.length === 0) {
                    const branchVal = isLast ? '└─╴' : '├─╴';
                    console.log(`${newPrefix}${branchVal}\x1b[2m<empty>\x1b[0m`);
                } else {
                    data.forEach((item, idx) => {
                        const last = idx === data.length - 1;
                        printSection(`[${idx}]`, item, newPrefix, last);
                    });
                }
            } else {
                const entries = Object.entries(data);
                if (entries.length === 0) {
                    const branchVal = isLast ? '└─╴' : '├─╴';
                    console.log(`${newPrefix}${branchVal}\x1b[2m<empty>\x1b[0m`);
                } else {
                    entries.forEach(([key, value], idx) => {
                        const last = idx === entries.length - 1;
                        printSection(key, value, newPrefix, last);
                    });
                }
            }
        } else {
            const branchVal = isLast ? '└─╴' : '├─╴';
            const valueStr = String(data);
            // Handle multiline strings properly
            if (valueStr.includes('\n')) {
                const lines = valueStr.split('\n');
                lines.forEach((line, idx) => {
                    if (idx === 0) {
                        console.log(`${newPrefix}${branchVal}\x1b[36m${line}\x1b[0m`);
                    } else {
                        const continuationPrefix = newPrefix + (isLast ? '    ' : '│   ');
                        console.log(`${continuationPrefix}\x1b[36m${line}\x1b[0m`);
                    }
                });
            } else {
                console.log(`${newPrefix}${branchVal}\x1b[36m${valueStr}\x1b[0m`);
            }
        }
    };

    Object.entries(results).forEach(([section, content]) => {
        printSection(section, content, '', true, true);
        console.log();
    });
};

const mock = async () => {
    try {
        // Parse arguments using commander
        program.parse();
        const options = program.opts();

        // Check if credentials file exists (custom logic - not handled by Commander.js)
        if (!fs.existsSync(options.credsPath)) {
            console.error('[ERROR] Credentials file not found:', options.credsPath);
            process.exit(1);
        }

        // Validate comma-separated arguments if they exist (custom logic for format and valid values)
        if (options.tracks) {
            options.tracks = validateCommaSeperatedOrAll(options.tracks, 'tracks');
            options.tracks = validateTracks(options.tracks);
        }
        if (options.images) {
            options.images = validateCommaSeperatedOrAll(options.images, 'images');
            options.images = validateImages(options.images);
        }
        if (options.testers) {
            options.testers = validateCommaSeperatedOrAll(options.testers, 'testers');
            options.testers = validateTesters(options.testers);
        }

        // Check if result.json exists
        const resultPath = path.join(
            process.cwd(),
            'cli',
            'mock',
            'result.json'
        );
        if (!fs.existsSync(resultPath)) {
            console.error('[ERROR] result.json not found in tests/mocks directory');
            process.exit(1);
        }

        let fullData;
        try {
            const fileContent = fs.readFileSync(resultPath, 'utf8');
            if (fileContent.trim() === '') {
                console.error('[ERROR] result.json is empty');
                process.exit(1);
            }
            fullData = JSON.parse(fileContent);
        } catch (e) {
            console.error('[ERROR] Failed to parse result.json:', e.message);
            process.exit(1);
        }

        // Determine requested resources
        const requested = [];
        if (options.all) {
            requested.push(
                'tracks',
                'apks',
                'bundles',
                'listings',
                'images',
                'inapps',
                'reviews',
                'voided_purchases',
                'testers',
                'app_details',
                'expansion_files'
            );
        } else {
            if (options.tracks) requested.push('tracks');
            if (options.apks) requested.push('apks');
            if (options.bundles) requested.push('bundles');
            if (options.listings) requested.push('listings');
            if (options.images) requested.push('images');
            if (options.inapps) requested.push('inapps');
            if (options.reviews) requested.push('reviews');
            if (options.voidedPurchases) requested.push('voided_purchases');
            if (options.testers) requested.push('testers');
            if (options.appDetails) requested.push('app_details');
            if (options.expansionFiles) requested.push('expansion_files');
        }

        if (requested.length === 0) {
            console.error(
                '[ERROR] No resources selected. Provide --all or at least one of: --tracks, --apks, --bundles, --listings, --images, --inapps, --reviews, --voided-purchases, --testers, --app-details, --expansion-files'
            );
            console.log('Use --help for usage information');
            process.exit(1);
        }

        const results = {};

        // Process each requested resource
        requested.forEach((resource) => {
            switch (resource) {
                case 'tracks': {
                    const trackSelection = options.tracks || 'all';
                    results.tracks = filterTracks(fullData.tracks, trackSelection);
                    break;
                }
                case 'images': {
                    const imageSelection = options.images || 'all';
                    results.images = filterImages(fullData.images, imageSelection);
                    break;
                }
                case 'testers': {
                    const testerSelection = options.testers || 'all';
                    results.testers = filterTesters(fullData.testers, testerSelection);
                    break;
                }
                default:
                    if (fullData[resource]) {
                        results[resource] = fullData[resource];
                    } else {
                        results[resource] = {};
                    }
            }
        });

        // Streaming implementation
        const resultTxtPath = path.join(
            process.cwd(),
            'cli',
            'mock',
            'result.txt'
        );

        // Check if result.txt exists
        if (!fs.existsSync(resultTxtPath)) {
            console.error('[ERROR] result.txt not found in tests/mocks directory');
            process.exit(1);
        }

        const resultTxtContent = fs.readFileSync(resultTxtPath, 'utf8');
        const lines = resultTxtContent.split('\n');

        const chunkLimit = 1;
        let linesCount = 0;
        let actualOutputStreamed = false;
        let charIndex = 0;

        // Stream first part of result.txt (up to 25 lines)
        for (
            let lineIndex = 0;
            lineIndex < lines.length && linesCount < 25;
            lineIndex++
        ) {
            const line = lines[lineIndex] + '\n';
            for (let i = 0; i < line.length; i += chunkLimit) {
                const limitedChunk = line.slice(i, i + chunkLimit);
                process.stderr.write(limitedChunk);
                // await new Promise((resolve) => setTimeout(resolve, 0)); // Small delay for visibility
            }
            linesCount++;
            charIndex += line.length;
        }

        // After 25 lines, output the actual CLI results
        if (!actualOutputStreamed) {
            actualOutputStreamed = true;

            // Show progress messages (to stderr) unless in JSON mode
            if (!options.json) {
                requested.forEach((resource) => {
                    process.stderr.write(`[PROGRESS] Fetching ${resource}...\n`);
                });
                process.stderr.write('[INFO] Completed successfully!\n');
            }

            // Output results to stdout
            if (options.json) {
                const jsonOutput = JSON.stringify(results, null, 2);
                for (let j = 0; j < jsonOutput.length; j += chunkLimit) {
                    const limitedChunk = jsonOutput.slice(j, j + chunkLimit);
                    process.stdout.write(limitedChunk);
                    // await new Promise((resolve) => setTimeout(resolve, 5)); // Faster for actual output
                }
            } else {
                // Capture tree output as string
                const originalConsoleLog = console.log;
                let treeOutput = '';
                console.log = (str) => {
                    if (str !== undefined) {
                        treeOutput += str + '\n';
                    } else {
                        treeOutput += '\n';
                    }
                }

                printTreeOutput(results);
                console.log = originalConsoleLog;

                // Stream tree output character by character
                for (let j = 0; j < treeOutput.length; j += chunkLimit) {
                    const limitedChunk = treeOutput.slice(j, j + chunkLimit);
                    process.stdout.write(limitedChunk);
                    // await new Promise((resolve) => setTimeout(resolve, 5)); // Faster for actual output
                }
            }

            process.stdout.write('\n');
        }

        // Continue streaming the rest of result.txt
        const remainingContent = resultTxtContent.slice(charIndex);
        for (let i = 0; i < remainingContent.length; i += chunkLimit) {
            const limitedChunk = remainingContent.slice(i, i + chunkLimit);
            process.stderr.write(limitedChunk);
            await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for visibility
        }
    } catch (error) {
        // Commander.js will automatically handle and display argument errors
        if (
            error.code === 'commander.missingRequiredArgument' ||
            error.code === 'commander.invalidArgument' ||
            error.message.includes('required option')
        ) {
            process.exit(1);
        }
        console.error('[ERROR]', error.message);
        process.exit(1);
    }
};

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
    console.error('[ERROR] Unexpected error:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('[ERROR] Unhandled promise rejection:', reason);
    process.exit(1);
});

mock().catch((error) => {
    console.error('[ERROR]', error.message);
    process.exit(1);
});
