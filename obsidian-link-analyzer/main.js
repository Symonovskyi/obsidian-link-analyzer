// TODO: Parallelization: If you have a large number of files, you can parallelize the analysis across multiple threads or processes.
// TODO: Incremental analysis: If files rarely change, you can analyze only new or modified files instead of starting from scratch.
// TODO: Caching: If the file structure and links between them change infrequently, you can cache the results to speed up subsequent requests.

const { Plugin, MarkdownView, TFile } = require('obsidian');

window.debugMode = false; // window.debugMode = true

const debounce = (func, wait, immediate) => {
    let timeout;
    return function () {
        const context = this, args = arguments;
        const later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

// * Global utilities

async function debugLog(message) {
    if (window.debugMode) {
        console.debug(`[DEBUG] ${message}`);
    }
}


async function handleError(operation, error, shouldThrow = true) {
    const errorMessage = `${operation}: ${error.message || error}`;
    console.error(errorMessage, error);
    await debugLog(errorMessage);

    if (shouldThrow) {
        throw new Error(errorMessage);
    }
}









/**
 * Class representing statistics for link analysis.
 */
class Stats {
    /**
     * Create a new Stats object.
     */
    constructor() {
        this.reset();
        this.totalUniqueOutgoingLinks = new Set();
        this.totalUniqueIncomingLinks = new Set();
    }

    // * Managing and updating statistics

    /**
     * Update the total number of files.
     * @param {number} count - The new count of files.
     * @throws {Error} If the provided input is not a number.
     */
    async updateTotalFiles(count) {
        try {
            if (typeof count !== 'number') {
                await handleError('Invalid input for totalFiles', 'The provided input for totalFiles is not a number.');
            }

            this.totalFiles = count;
            await debugLog('Updated totalFiles');

        } catch (error) {
            await handleError("Error updating totalFiles", error);
        }
    }

    /**
     * Update the total number of directories.
     * @param {number} count - The new count of directories.
     * @throws {Error} If the provided input is not a number.
     */
    async updateTotalDirectories(count) {
        try {
            if (typeof count !== 'number') {
                await handleError('Invalid input for totalDirectories', 'The provided input for totalDirectories is not a number.');
            }

            this.totalDirectories = count;
            await debugLog('Updated totalDirectories');

        } catch (error) {
            await handleError("Error updating totalDirectories", error);
        }
    }

    /**
     * Update the total number of outgoing links.
     * @param {Set|Array} links - The new outgoing links.
     * @throws {Error} If the provided input is neither a Set nor an Array.
     */
    async updateOutgoingLinks(links) {
        try {
            if (!(links instanceof Set || Array.isArray(links))) {
                await handleError('Invalid input for outgoingLinks', 'The provided input for outgoingLinks is neither a Set nor an Array.');
            }

            const outgoingSize = links.size || links.length;
            this.totalOutgoingLinks += outgoingSize;
            await debugLog('Updated outgoingLinks');

        } catch (error) {
            await handleError("Error updating outgoingLinks", error);
        }
    }

    /**
     * Update the total number of incoming links.
     * @param {Set|Array} links - The new incoming links.
     * @throws {Error} If the provided input is neither a Set nor an Array.
     */
    async updateIncomingLinks(links) {
        try {
            if (!(links instanceof Set || Array.isArray(links))) {
                await handleError('Invalid input for incomingLinks', 'The provided input for incomingLinks is neither a Set nor an Array.');
            }

            const incomingSize = links.size || links.length;
            this.totalIncomingLinks += incomingSize;
            await debugLog('Updated incomingLinks');

        } catch (error) {
            await handleError("Error updating incomingLinks", error);
        }
    }

    /**
     * Update the set of unique outgoing links.
     * @param {Set|Array} links - The new unique outgoing links.
     * @throws {Error} If the provided input is neither a Set nor an Array.
     */
    async updateUniqueOutgoingLinks(links) {
        try {
            if (!(links instanceof Set || Array.isArray(links))) {
                await handleError('Invalid input for uniqueOutgoingLinks', 'The provided input for uniqueOutgoingLinks is neither a Set nor an Array.');
            }

            links.forEach(link => this.totalUniqueOutgoingLinks.add(link));
            await debugLog('Updated uniqueOutgoingLinks');

        } catch (error) {
            await handleError("Error updating uniqueOutgoingLinks", error);
        }
    }

    /**
     * Update the set of unique incoming links.
     * @param {Set|Array} links - The new unique incoming links.
     * @throws {Error} If the provided input is neither a Set nor an Array.
     */
    async updateUniqueIncomingLinks(links) {
        try {
            if (!(links instanceof Set || Array.isArray(links))) {
                await handleError('Invalid input for uniqueIncomingLinks', 'The provided input is neither a Set nor an Array.');
            }

            links.forEach(link => this.totalUniqueIncomingLinks.add(link));
            await debugLog('Updated uniqueIncomingLinks');

        } catch (error) {
            await handleError("Error updating uniqueIncomingLinks", error);
        }
    }

    /**
     * Update the number of skipped files.
     * @param {number} count - The number of skipped files.
     * @throws {Error} If the provided input is not a number.
     */
    async updateSkippedFiles(count) {
        try {
            if (typeof count !== 'number') {
                await handleError('Invalid input', 'Expected a number for skippedFiles');
            }

            this.skippedFiles += count;
            await debugLog('Updated skippedFiles');

        } catch (error) {
            await handleError("Error updating skippedFiles", error);
        }
    }

    /**
     * Update the number of files in the table.
     * @param {number} count - The number of files in the table.
     * @throws {Error} If the provided input is not a number.
     */
    async updateFilesInTable(count) {
        try {
            if (typeof count !== 'number') {
                await handleError('Invalid input', 'Expected a number for filesInTable');
            }

            this.filesInTable += count;
            await debugLog('Updated filesInTable');

        } catch (error) {
            await handleError("Error updating filesInTable", error);
        }
    }

    /**
     * Reset all statistics to their initial values.
     */
    async reset() {
        this.totalFiles = 0;
        this.totalDirectories = 0;
        this.totalUniqueOutgoingLinks = new Set();
        this.totalUniqueIncomingLinks = new Set();
        this.totalOutgoingLinks = 0;
        this.totalIncomingLinks = 0;
        this.skippedFiles = 0;
        this.filesInTable = 0;
        await debugLog('Stats reset');
    }
}










class LinkAnalyzer extends Plugin {

    // * Initialization and life cycle of the plugin

    async onload() {
        try {
            console.log(`Link Analyzer: Enabled`);

            this.addCommand({
                id: 'link-analyzer-standard-scan',
                name: 'Insert Markdown Table (Standard Filter)',
                callback: async () => {
                    await this.analyzeLinks();
                },
            });

            this.addCommand({
                id: 'link-analyzer-comprehensive-scan',
                name: 'Insert Markdown Table (All Files + Stats)',
                callback: async () => {
                    const params = {
                        fileType: 'all',
                        showStats: true
                    };
                    await this.analyzeLinks(params);
                },
            });

            this.registerMarkdownCodeBlockProcessor("link-analyzer", async (source, el, ctx) => {
                const params = await this.parseParams(source);
                await this.analyzeLinks(params, el);
            });

            await debugLog('onload completed successfully');

        } catch (error) {
            await handleError("Failed in onload", error);
        }
    }


    async onunload() {
        console.log(`Link Analyzer: Disabled`);
    }











    // * Utilities and auxiliary functions

    async parseParams(line) {
        try {
            // Initialize an object to hold the parsed parameters with default values
            const params = {
                paths: [],
                sort: 'name',
                sortOrder: 'desc',
                excludeCol: [],
                fileType: 'eitherIncomingOrOutgoing',
                showStats: false
            };

            // Split the input line into individual lines based on newline character
            const lines = line.split('\n');
            await debugLog('After splitting line:', lines);

            // Parse each line to extract key-value pairs
            for (const line of lines) {
                const [key, value] = line.split(':').map(str => str.trim());
                await debugLog(`Parsed line - Key: ${key}, Value: ${value}`);
                if (key === 'paths') params.paths = value ? value.split(',').map(str => str.trim()) : params.paths;
                if (key === 'sort') params.sort = value || params.sort;
                if (key === 'sortOrder') params.sortOrder = value || params.sortOrder;
                if (key === 'excludeCol') params.excludeCol = value ? value.split(',').map(str => str.trim()) : params.excludeCol;
                if (key === 'fileType') params.fileType = value || params.fileType;
                if (key === 'showStats') params.showStats = value ? value.toLowerCase() === 'true' : params.showStats;
            }

            await debugLog('Parsed parameters:', params);
            return params;

        } catch (error) {
            await handleError("An error occurred in parseParams", error);
        }
    }



    async validatePaths(paths) {
        try {
            if (paths && !Array.isArray(paths)) {
                await handleError('validatePaths', "Invalid type for 'paths'. Expected an array.", false);
                return false;
            }

            if (!paths || paths.length === 0) {
                await debugLog("No 'paths' specified, will check all files.");
                return true;
            }

            for (const path of paths) {
                if (typeof path !== 'string') {
                    await handleError('validatePaths', `Invalid path: ${path}. Expected a string.`, false);
                    return false;
                }
            }

            await debugLog(`Checking specified paths: ${paths.join(", ")}`);
            return true;

        } catch (error) {
            await handleError('An error occurred while validating paths.', error);
        }
    }


    async validateSort(sort) {
        try {
            const validSortOptions = ['name', 'outgoingCount', 'incomingCount'];
            if (!validSortOptions.includes(sort)) {
                await handleError('validateSort', `Invalid value for 'sort'. Expected one of ${validSortOptions.join(", ")}.`, false);
                return false;
            }

            await debugLog(`Validated sort parameter: ${sort}`);
            return true;

        } catch (error) {
            await handleError('An error occurred while validating sort', error);
        }
    }


    async validateSortOrder(sortOrder) {
        try {
            const validSortOrderOptions = ['asc', 'desc'];
            if (!validSortOrderOptions.includes(sortOrder)) {
                await handleError('validateSortOrder', `Invalid value for 'sortOrder'. Expected one of ${validSortOrderOptions.join(", ")}.`, false);
                return false;
            }

            await debugLog(`Validated sortOrder parameter: ${sortOrder}`);
            return true;

        } catch (error) {
            await handleError('An error occurred while validating sortOrder', error);
        }
    }


    async validateExcludeCol(excludeCol) {
        try {
            const validExcludeColValues = ['index', 'name', 'outgoingCount', 'incomingCount', 'outgoing', 'incoming'];

            if (!Array.isArray(excludeCol)) {
                await handleError('validateExcludeCol', "Invalid value for 'excludeCol'. Expected an array.", false);
                return false;
            }

            if (!excludeCol.every(value => validExcludeColValues.includes(value))) {
                await handleError('validateExcludeCol', `Invalid value(s) in 'excludeCol'. Expected values are one of ${validExcludeColValues.join(", ")}.`, false);
                return false;
            }

            if (excludeCol.length === validExcludeColValues.length) {
                await handleError('validateExcludeCol', "Invalid value for 'excludeCol'. Cannot exclude all columns.", false);
                return false;
            }

            await debugLog("ExcludeCol validated successfully.");
            return true;

        } catch (error) {
            await handleError('An error occurred while validating excludeCol', error);
        }
    }


    async validateFileType(fileType) {
        try {
            const validFileTypes = ['all', 'noLinks', 'onlyOutgoingNoIncoming', 'onlyIncomingNoOutgoing', 'bothIncomingAndOutgoing', 'eitherIncomingOrOutgoing'];

            if (!validFileTypes.includes(fileType)) {
                await handleError('validateFileType', `Invalid value for 'fileType'. Expected one of ${validFileTypes.join(", ")}.`, false);
                return false;
            }

            await debugLog("FileType validated successfully.");
            return true;

        } catch (error) {
            await handleError('An error occurred while validating fileType', error);
        }
    }


    async validateShowStats(showStats) {
        try {
            if (typeof showStats !== 'boolean') {
                await handleError('validateShowStats', "Invalid type for 'showStats'. Expected a boolean.", false);
                return false;
            }

            await debugLog("ShowStats validated successfully.");
            return true;

        } catch (error) {
            await handleError('An error occurred while validating showStats', error);
        }
    }


    async validateParams(params) {
        try {
            if (!params) {
                await handleError('validateParams', "Params object is null or undefined.", false);
                return false;
            }

            const isPathsValid = await this.validatePaths(params.paths);
            const isSortValid = await this.validateSort(params.sort);
            const isSortOrderValid = await this.validateSortOrder(params.sortOrder);
            const isExcludeColValid = await this.validateExcludeCol(params.excludeCol);
            const isFileTypeValid = await this.validateFileType(params.fileType);
            const isShowStatsValid = await this.validateShowStats(params.showStats);

            if (!isPathsValid || !isSortValid || !isSortOrderValid || !isExcludeColValid || !isFileTypeValid || !isShowStatsValid) {
                await debugLog('Parameters validated successfully.');
                return false;
            }

            await debugLog("Parameters validated successfully.");
            return true;

        } catch (error) {
            await handleError('An error occurred while validating params', error);
        }
    }


    async validateInput(targetPaths, fileType) {
        try {
            await debugLog("Validating input parameters...");

            if (!Array.isArray(targetPaths)) {
                await handleError('validateInput', "Validation failed: targetPaths should be an array", false);
                return false;
            }

            if (!targetPaths.every(path => typeof path === 'string')) {
                await handleError('validateInput', "Validation failed: All elements in targetPaths should be strings", false);
                return false;
            }

            if (!fileType) {
                await handleError('validateInput', "Validation failed: fileType should not be null or undefined", false);
                return false;
            }

            await debugLog("Input parameters are valid.");
            return true;

        } catch (error) {
            await handleError('An unexpected error occurred during input validation', error);
        }
    }


    async validateLinkData(linkData) {
        try {
            await debugLog("Validating linkData...");

            if (!linkData || !(linkData instanceof Map)) {
                await handleError('validateLinkData', "Validation failed: Invalid linkData, must be a Map", false);
                return false;
            }

            await debugLog("linkData validated successfully.");
            return true;

        } catch (error) {
            await handleError('An unexpected error occurred during linkData validation', error);
        }
    }


    async validateStatsFields(stats) {
        try {
            await debugLog("Validating stats fields...", stats);

            const requiredStatsFields = [
                'totalFiles',
                'totalDirectories',
                'totalUniqueOutgoingLinks',
                'totalUniqueIncomingLinks',
                'totalOutgoingLinks',
                'totalIncomingLinks',
                'skippedFiles',
                'filesInTable'
            ];

            for (const field of requiredStatsFields) {
                if (stats[field] === undefined) {
                    await handleError('validateStatsFields', `Field ${field} is missing in stats`, false);
                    return false;
                }
            }

            await debugLog("Stats fields validated successfully.");
            return true;

        } catch (error) {
            await handleError('An error occurred in validateStatsFields', error);
        }
    }


    async validateOutput(linkData, stats) {
        try {
            await debugLog("Validating output data...");

            const isLinkDataValid = await this.validateLinkData(linkData);
            const areStatsFieldsValid = await this.validateStatsFields(stats);

            if (!isLinkDataValid || !areStatsFieldsValid) {
                return false;
            }

            await debugLog("Output data validated successfully.");
            return true;

        } catch (error) {
            await handleError('An unexpected error occurred during output validation', error);
        }
    }











    // * Data collection and analysis

    async getFilesData(stats) {
        try {
            await debugLog("Fetching all files...");
            const vault = this.app.vault;
            const allFiles = await vault.getFiles();
            const allMarkdownFiles = await vault.getMarkdownFiles();

            if (allFiles && allFiles.length > 0) {
                await stats.updateTotalFiles(allFiles.length);
            }

            if (allMarkdownFiles && allMarkdownFiles.length > 0) {
                await stats.updateTotalFiles(allMarkdownFiles.length);
            }

            await debugLog("Fetched all files.");
            return { allFiles, allMarkdownFiles };

        } catch (error) {
            await handleError("An error occurred while fetching files", error);
            throw error;
        }
    }


    async collectData(allMarkdownFiles, currentFile, targetPaths, stats) {
        try {
            const linkData = new Map();
            const uniqueDirectories = new Set();
            const fileNameMap = new Map();

            const includePaths = targetPaths.filter(path => !path.startsWith('-'));
            const excludePaths = targetPaths.filter(path => path.startsWith('-')).map(path => path.substring(1));
            const shouldIncludeAll = !targetPaths || targetPaths.length === 0;

            if (!Array.isArray(allMarkdownFiles) || !currentFile || !Array.isArray(targetPaths) || !stats) {
                await handleError('Data validation in collectData', 'Invalid input parameters');
            }

            await stats.updateTotalFiles(allMarkdownFiles.length);

            for (const file of allMarkdownFiles) {
                await debugLog(`Processing file: ${file.path}`);

                if (!file.path.endsWith('.md')) {
                    continue;
                }

                const fileName = file.path.split('/').pop().replace(/\.md$/, '');

                if (fileNameMap.has(fileName)) {
                    fileNameMap.set(fileName, fileNameMap.get(fileName) + 1);
                } else {
                    fileNameMap.set(fileName, 1);
                }

                if (file.path === currentFile.path) {
                    await stats.updateTotalFiles(stats.totalFiles - 1);
                    continue;
                }

                const directory = file.path.split('/').slice(0, -1).join('/');
                uniqueDirectories.add(directory);

                const filePathWithoutExtension = file.path.replace(/\.md$/, '');

                const shouldSaveFullPath = fileNameMap.get(fileName) > 1;
                const keyToSave = shouldSaveFullPath ? filePathWithoutExtension : fileName;

                const shouldInclude = includePaths.includes(keyToSave) || includePaths.includes(directory + '/');
                const shouldExclude = excludePaths.includes(keyToSave) || excludePaths.includes(directory + '/');

                if ((shouldIncludeAll || shouldInclude) && !shouldExclude) {
                    const fileCache = this.app.metadataCache.getFileCache(file);

                    if (!fileCache || !file) {
                        await stats.updateSkippedFiles(1);
                        continue;
                    }

                    const outgoingLinks = fileCache.links ? new Set(fileCache.links.map(link => link.link)) : new Set();
                    linkData.set(keyToSave, {
                        outgoing: outgoingLinks,
                        incoming: new Set(),
                        incomingCount: 0
                    });
                }

                await stats.updateTotalDirectories(uniqueDirectories.size);
            }

            await debugLog('Data collection completed successfully');
            return { linkData, fileNameMap };

        } catch (error) {
            await handleError("Error in collectData", error);
        }
    }



    async analyzeData(linkData, stats, fileNameMap) {
        try {
            await debugLog("Starting to analyze link data");

            if (!(await this.validateStatsFields(stats))) {
                await handleError('Data validation in analyzeData', 'Invalid stats', false);
                return null;
            } else {
                await debugLog(`stats: ${JSON.stringify(stats)}`);
            }

            if (!(await this.validateLinkData(linkData))) {
                await handleError('Data validation in analyzeData', 'Invalid linkData', false);
                return null;
            } else {
                await debugLog(`LinkData size: ${linkData.size}`);
            }

            for (const [filename, data] of linkData.entries()) {
                await debugLog(`Processing filename: ${filename}`);

                if (!data || !data.outgoing) {
                    await handleError('Data validation in analyzeData', `Invalid data for filename: ${filename}`, false);
                    continue;
                }

                for (const outgoingLink of data.outgoing) {
                    const shouldUseFullPath = fileNameMap.get(outgoingLink) > 1;
                    const keyToLookup = shouldUseFullPath ? outgoingLink : outgoingLink.split('/').pop().replace(/\.md$/, '');

                    if (linkData.has(keyToLookup)) {
                        const outgoingData = linkData.get(keyToLookup);
                        if (outgoingData) {
                            if (!outgoingData.incoming) {
                                outgoingData.incoming = new Set();
                            }

                            if (outgoingData.incoming instanceof Set) {
                                outgoingData.incoming.add(filename);
                                outgoingData.incomingCount++;
                                await debugLog(`Added incoming link for ${outgoingLink}`);
                            } else {
                                await handleError('Data validation in analyzeData', `Incoming links for ${outgoingLink} is not a Set`, false);
                            }
                        } else {
                            await handleError('Data validation in analyzeData', `Data for ${outgoingLink} is undefined`, false);
                        }
                    }
                }
            }



            await debugLog("Finished analyzing link data");
            return linkData;

        } catch (error) {
            await handleError('An error occurred during data analysis', error);
        }
    }


    async filterData(linkData, stats, fileType) {
        try {
            await debugLog("Filtering and deleting data...");

            const validFileTypes = [
                'all',
                'noLinks',
                'onlyOutgoingNoIncoming',
                'onlyIncomingNoOutgoing',
                'bothIncomingAndOutgoing',
                'eitherIncomingOrOutgoing'
            ];

            if (!(await this.validateFileType(fileType))) {
                await handleError('Invalid fileType', `${fileType}. Must be one of ${validFileTypes.join(', ')}`);
            }

            for (const [key, value] of linkData) {
                const hasOutgoing = value.outgoing.size > 0;
                const hasIncoming = value.incoming.size > 0;

                let includeFile = false;

                await debugLog("Starting data filtering...");

                const fileTypeMapper = {
                    'all': async () => true,
                    'noLinks': async () => !hasOutgoing && !hasIncoming,
                    'onlyOutgoingNoIncoming': async () => hasOutgoing && !hasIncoming,
                    'onlyIncomingNoOutgoing': async () => !hasOutgoing && hasIncoming,
                    'bothIncomingAndOutgoing': async () => hasOutgoing && hasIncoming,
                    'eitherIncomingOrOutgoing': async () => hasOutgoing || hasIncoming
                };

                await debugLog(`hasOutgoing: ${hasOutgoing}, hasIncoming: ${hasIncoming}`);

                if (fileTypeMapper.hasOwnProperty(fileType)) {
                    includeFile = await fileTypeMapper[fileType]();
                    await debugLog(`Data filtered using fileType: ${fileType}, includeFile: ${includeFile}`);
                } else {
                    await debugLog(`Invalid fileType: ${fileType}`);
                }

                await debugLog("Data filtering completed");

                if (includeFile) {
                    await debugLog(`Including file in table: ${key}`);
                    await stats.updateFilesInTable(1);
                    await stats.updateOutgoingLinks(Array.from(value.outgoing));
                    await stats.updateIncomingLinks(Array.from(value.incoming));
                    await stats.updateUniqueOutgoingLinks(Array.from(value.outgoing));
                    await stats.updateUniqueIncomingLinks(Array.from(value.incoming));
                } else {
                    await debugLog(`Skipping file: ${key}`);
                    await stats.updateSkippedFiles(1);
                    linkData.delete(key);
                }
            }
            await debugLog("Data after filtering:", JSON.stringify(linkData));
            return linkData;

        } catch (error) {
            await handleError("An error occurred during data filtering and deletion", error);
        }
    }


    async sortLinkData(linkData, sortBy, sortOrder) {
        return Array.from(linkData).sort((a, b) => {
            let aValue, bValue;

            if (sortBy === 'name') {
                aValue = a[0];
                bValue = b[0];
            } else if (sortBy === 'outgoingCount') {
                aValue = a[1].outgoing ? a[1].outgoing.size : 0;
                bValue = b[1].outgoing ? b[1].outgoing.size : 0;
            } else if (sortBy === 'incomingCount') {
                aValue = a[1].incoming ? a[1].incoming.size : 0;
                bValue = b[1].incoming ? b[1].incoming.size : 0;
            }

            const compareValue = sortBy === 'name' ? aValue.localeCompare(bValue) : bValue - aValue;

            return sortOrder === 'asc' ? -compareValue : compareValue;
        });
    }


    // Main function to analyze link data
    async analyzeLinkData(targetPaths, currentFile, fileType) {
        try {
            await debugLog("Starting analyzeLinkData function...");

            const stats = new Stats();

            await this.validateInput(targetPaths, fileType);
            await debugLog("Input validated");

            const { allFiles, allMarkdownFiles } = await this.getFilesData(stats);
            await debugLog("Files data obtained");

            const { linkData, fileNameMap } = await this.collectData(allMarkdownFiles, currentFile, targetPaths, stats);
            await debugLog("Data collected");

            const analyzedData = await this.analyzeData(linkData, stats, fileNameMap);
            await debugLog("Markdown files processed");

            const filteredData = await this.filterData(analyzedData, stats, fileType);
            await debugLog("Data filtered");

            await this.validateOutput(filteredData, stats);
            await debugLog("Output validated");

            await debugLog("analyzeLinkData function completed successfully");
            return { linkData: filteredData, stats };

        } catch (error) {
            await handleError("An error occurred in analyzeLinkData function", error);
        }
    }











    // * Generating and outputting results

    async prepareTableData(linkData, sortBy, sortOrder, excludeCol) {
        try {
            await debugLog('Starting data preparation for table.')

            if (!(await this.validateLinkData(linkData))) {
                await handleError('prepareTableData', 'Invalid linkData');
            }

            if (!(await this.validateSort(sortBy))) {
                await handleError('prepareTableData', 'Invalid sortBy value');
            }

            if (!(await this.validateSortOrder(sortOrder))) {
                await handleError('prepareTableData', 'Invalid sortOrder value');
            }

            if (!(await this.validateExcludeCol(excludeCol))) {
                await handleError('prepareTableData', 'Invalid excludeCol value');
            }

            await debugLog('linkData, sortBy, excludeCol validated successfully.');

            // Define all possible columns
            const allColumns = ['index', 'name', 'outgoingCount', 'incomingCount', 'outgoing', 'incoming'];

            // Exclude columns if needed
            const columns = excludeCol && excludeCol.length > 0 ?
                allColumns.filter(col => !excludeCol.includes(col)) :
                [...allColumns];
            await debugLog('Columns determined.');

            // Define display names for each column
            const columnDisplayNames = {
                index: '#',
                name: '📄',
                outgoingCount: '🔗👉',
                incomingCount: '🔗👈',
                outgoing: '📄👉 out',
                incoming: '📄👈 in'
            };

            // Sort the linkData
            const sortedData = await this.sortLinkData(linkData, sortBy, sortOrder);

            await debugLog('Data sorted.');

            const tableData = [];
            let index = 1;

            for (const [fileName, links] of sortedData) {
                let incomingLinks = [];
                let outgoingLinks = [];

                if (Array.isArray(links.incoming) || links.incoming instanceof Set) {
                    incomingLinks = Array.from(links.incoming).map((link, i) => `${i + 1}. [[${link}]]`).join(",<br>");
                }

                if (Array.isArray(links.outgoing) || links.outgoing instanceof Set) {
                    outgoingLinks = Array.from(links.outgoing).map((link, i) => `${i + 1}. [[${link}]]`).join(",<br>");
                }

                const rowData = {
                    index,
                    name: `[[${fileName}]]`,
                    outgoingCount: links.outgoing.size,
                    incomingCount: links.incoming.size,
                    outgoing: outgoingLinks,
                    incoming: incomingLinks
                };

                tableData.push(rowData);
                index++;
            }

            await debugLog('Table data prepared.');
            return { tableData, columns, columnDisplayNames };

        } catch (error) {
            await handleError('An error occurred in prepareTableData', error);
        }
    }


    async generateMarkdownTable(preparedData) {
        try {
            await debugLog('Starting to generate Markdown table.');

            if (!preparedData) {
                await handleError('generateMarkdownTable', 'Prepared data is undefined', false);
                return 'Unable to generate table due to missing prepared data.';

            }
            await debugLog('Prepared data is available.');

            const { tableData, columns, columnDisplayNames } = preparedData;

            let tableContent = [];

            tableContent.push(`| ${columns.map(col => columnDisplayNames[col] || col).join(' | ')} |`);
            await debugLog('Table headers added.');

            tableContent.push(`| ${columns.map(() => '---').join(' | ')} |`);
            await debugLog('Table separators added.');

            for (const rowData of tableData) {
                let row = `| ${columns.map(col => rowData[col]).join(' | ')} |`;
                tableContent.push(row);
            }

            await debugLog('Markdown table generated successfully.');
            return '\n' + tableContent.join('\n') + '\n';

        } catch (error) {
            await handleError("An error occurred in generateMarkdownTable", error, false);
            return 'An error occurred while generating the table. Please try again.';
        }
    }


    async generateHTMLTable(preparedData) {
        try {
            await debugLog('Starting to generate HTML table.');

            if (!preparedData) {
                await handleError('generateHTMLTable', 'Prepared data is undefined');
            }

            const { tableData, columns, columnDisplayNames } = preparedData;
            await debugLog('Prepared data is available.');


            let tableHTML = ['<table class="ola-view-table">'];

            tableHTML.push('<thead><tr>');
            for (const col of columns) {
                tableHTML.push(`<th class="ola-view-table">${columnDisplayNames[col] || col}</th>`);
            }
            tableHTML.push('</tr></thead>');

            tableHTML.push('<tbody>');
            for (const rowData of tableData) {
                tableHTML.push('<tr>');
                for (const col of columns) {
                    let cellData = rowData[col];
                    if (typeof cellData === 'string') {
                        cellData = cellData.replace(/\[\[([^\]]+)\]\]/g, function (match, p1) {
                            return `<a data-href="${p1}" href="${p1}" class="internal-link" target="_blank" rel="noopener">${p1}</a>`;
                        });
                    }
                    tableHTML.push(`<td class="${col}">${cellData}</td>`);
                }
                tableHTML.push('</tr>');
            }
            tableHTML.push('</tbody></table>');

            await debugLog('HTML table generated successfully.');
            return tableHTML.join('');

        } catch (error) {
            await handleError("An error occurred in generateHTMLTable", error);
        }
    }


    async generateMarkdownStats(stats) {
        try {
            await debugLog('Starting to generate Markdown stats.');

            if (!stats || typeof stats !== 'object') {
                await handleError('Data validation in generateMarkdownStats', 'Invalid stats object', false);
                return 'Unable to generate statistics due to invalid data.';
            }

            await debugLog('Generating statistics string...');

            const statsString = `**Statistics**
    - Execution time: **${stats.executionTime}** sec
    - Processed ${stats.totalFiles === 1 ? 'file' : 'files'}: **${stats.totalFiles}**
    - Processed ${stats.totalDirectories === 1 ? 'directory' : 'directories'}: **${stats.totalDirectories}**
    - ${stats.filesInTable === 1 ? 'File' : 'Files'} in table: **${stats.filesInTable}**
    - Total outgoing ${stats.totalOutgoingLinks === 1 ? 'link' : 'links'}: **${stats.totalOutgoingLinks}**
    - Total incoming ${stats.totalIncomingLinks === 1 ? 'link' : 'links'}: **${stats.totalIncomingLinks}**
    - Unique outgoing ${stats.totalUniqueOutgoingLinks.size === 1 ? 'link' : 'links'}: **${stats.totalUniqueOutgoingLinks.size}**
    - Unique incoming ${stats.totalUniqueIncomingLinks.size === 1 ? 'link' : 'links'}: **${stats.totalUniqueIncomingLinks.size}**
    - Skipped ${stats.skippedFiles === 1 ? 'file' : 'files'}: **${stats.skippedFiles}**
    `;

            await debugLog('Successfully generated statistics string.');
            return statsString;

        } catch (error) {
            await handleError('Failed to generate statistics string', error);
            return 'An error occurred while generating statistics. Please try again.';
        }
    }


    async generateHTMLStats(stats) {
        try {
            await debugLog('Starting to generate HTML stats.');

            if (!stats || typeof stats !== 'object') {
                await handleError('Data validation in generateHTMLStats', 'Invalid stats object', false);
                return 'Unable to generate statistics due to invalid data.';
            }

            await debugLog('Generating statistics HTML...');

            let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th colspan="4">Statistics</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total ${stats.totalOutgoingLinks === 1 ? 'outgoing link' : 'outgoing links'}</td>
                    <td>${stats.totalOutgoingLinks}</td>
                    <td>${stats.totalFiles}</td>
                    <td>${stats.totalFiles === 1 ? 'File' : 'Files'} processed</td>
                </tr>
                <tr>
                    <td>Total incoming ${stats.totalIncomingLinks === 1 ? 'link' : 'links'}</td>
                    <td>${stats.totalIncomingLinks}</td>
                    <td>${stats.totalDirectories}</td>
                    <td>${stats.totalDirectories === 1 ? 'directory' : 'directories'} processed</td>
                </tr>
                <tr>
                    <td>Unique outgoing ${stats.totalUniqueOutgoingLinks.size === 1 ? 'link' : 'links'}</td>
                    <td>${stats.totalUniqueOutgoingLinks.size}</td>
                    <td>${stats.skippedFiles}</td>
                    <td>${stats.skippedFiles === 1 ? 'File' : 'Files'} skipped</td>
                </tr>
                <tr>
                    <td>Unique incoming ${stats.totalUniqueIncomingLinks.size === 1 ? 'link' : 'links'}</td>
                    <td>${stats.totalUniqueIncomingLinks.size}</td>
                    <td>${stats.filesInTable}</td>
                    <td>${stats.filesInTable === 1 ? 'File' : 'Files'} in Table</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4">Execution time: ${stats.executionTime} sec</td>
                </tr>
            </tfoot>
        </table>
        `;

            await debugLog('Successfully generated statistics HTML.');
            return html;

        } catch (error) {
            await handleError('Failed to generate statistics HTML', error);
        }
    }











    // * Event registration and processing

    async registerCodeBlock() {
        this.registerMarkdownCodeBlockProcessor("link-analyzer", debounce(async (source, el, ctx) => {
            try {
                await debugLog("Starting code block processing for link-analyzer");

                const params = await this.parseParams(source);
                if (!params) {
                    await handleError('registerCodeBlock', 'Failed to parse parameters', false);
                    return;
                }

                await this.analyzeLinks(params, el);
                await debugLog("Successfully processed code block for link-analyzer");

            } catch (error) {
                await handleError('An error occurred in registerCodeBlock', error);
            }
        }, 2000));
    }


    async analyzeLinks(customParams = {}, el = null) {
        try {
            let startTime = Date.now();

            // Validate active file and editor
            const currentFile = this.app.workspace.getActiveFile();
            const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            await debugLog('Current active file and editor obtained.');
            if (!currentFile || !editor) {
                console.warn("No active file or editor found.");
                return;
            }
            await debugLog('Current active file and editor obtained.');

            // Parsing and validating parameters
            const cursorPosition = editor.getCursor();
            const line = editor.getLine(cursorPosition.line);
            const defaultParams = await this.parseParams(line);
            if (!defaultParams || !(await this.validateParams(defaultParams))) {
                console.warn("Invalid parameters.");
                return;
            }
            const params = { ...defaultParams, ...customParams };
            await debugLog(`Parameters parsed and validated - ${JSON.stringify(params)}`);

            // Fetch link data based on parsed parameters
            const { linkData, stats } = await this.analyzeLinkData(params.paths, currentFile, params.fileType);
            if (!linkData || !stats || !(await this.validateStatsFields(stats))) {
                await debugLog("Invalid link data or stats.");
                throw new Error("Stats fields are invalid");
            }
            await debugLog(`Link data and stats obtained - ${JSON.stringify(stats)}`);

            // Prepare data for table generation
            const preparedData = await this.prepareTableData(linkData, params.sort, params.sortOrder, params.excludeCol);
            await debugLog(`Prepared data for table generation - ${JSON.stringify(preparedData)}`);

            // Check for data and el
            if (!preparedData) {
                await debugLog("No data available with the given parameters.");
                if (el) {
                    el.innerHTML = "<center>No data available with the given parameters.</center>";
                } else {
                    editor.replaceRange("<center>No data available with the given parameters.</center>\n", { line: cursorPosition.line, ch: 0 }, { line: cursorPosition.line, ch: line.length });
                    editor.setCursor({ line: cursorPosition.line + 1, ch: 0 });
                }
                return;
            }

            // Generating the table based on the output format
            const table = el ? await this.generateHTMLTable(preparedData) : await this.generateMarkdownTable(preparedData);
            await debugLog('Table generated.');

            // Calculating execution time
            stats.executionTime = (Date.now() - startTime) / 1000;
            await debugLog(`Execution time calculated - ${stats.executionTime}s`);

            // Generating statistics based on the output format
            const methodToUse = el ? await this.generateHTMLStats : await this.generateMarkdownStats;
            const statsString = params.showStats ? await methodToUse(stats) : '';

            // Outputting the table and statistics
            if (el) {
                el.innerHTML = table + statsString;
            } else {
                editor.replaceRange(table + statsString, { line: cursorPosition.line, ch: 0 }, { line: cursorPosition.line, ch: line.length });
            }

            console.log(`Link Analyzer: 
    Processed ${stats.totalFiles} ${stats.totalFiles === 1 ? 'file' : 'files'} in ${stats.totalDirectories} ${stats.totalDirectories === 1 ? 'directory' : 'directories'}
    Execution time: ${stats.executionTime} sec
    ${stats.filesInTable === 1 ? 'File' : 'Files'} in table: ${stats.filesInTable}
    Total outgoing ${stats.totalOutgoingLinks === 1 ? 'link' : 'links'}: ${stats.totalOutgoingLinks}
    Total incoming ${stats.totalIncomingLinks === 1 ? 'link' : 'links'}: ${stats.totalIncomingLinks}
    Unique outgoing ${stats.totalUniqueOutgoingLinks.size === 1 ? 'link' : 'links'}: ${stats.totalUniqueOutgoingLinks.size}
    Unique incoming ${stats.totalUniqueIncomingLinks.size === 1 ? 'link' : 'links'}: ${stats.totalUniqueIncomingLinks.size}
    Skipped ${stats.skippedFiles === 1 ? 'file' : 'files'}: ${stats.skippedFiles}`);

        } catch (error) {
            await handleError('An error occurred', error, false);
            if (el) {
                el.innerHTML = "An error occurred: " + error.message;
            } else {
                editor.replaceRange("An error occurred: " + error.message + "\n", { line: cursorPosition.line, ch: 0 }, { line: cursorPosition.line, ch: line.length });
                editor.setCursor({ line: cursorPosition.line + 1, ch: 0 });
            }
        }
    }
}

module.exports = LinkAnalyzer;
