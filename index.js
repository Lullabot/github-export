#!/usr/bin/env node

const program = require('commander');
const Exporter = require('./src/GithubExporter');
const options = require('./src/opts');
const config = require('./config');

// Instantiate the exporter.
const exporter = new Exporter(config.githubToken, options, program);

/**
 * Define the app.
 */
async function main(config, options, exporter) {
    const cli_options = exporter.getCliOptions();
    let search_options = {};
    let query_options = {};

    // If the user requested to use a saved search, look it up.
    if (exporter.searchOptProvided()) {
        const grouping = exporter.cliOptions.search.split(':');
        search_options = await exporter.getSavedOptions(grouping[0], grouping[1]);

    // If there were no query or search options set, ask the user what they want to do.
    } else if (!exporter.queryOptProvided()) {
        const search = await exporter.getUserSearchOption();

        if (search !== "New Search") {
            const grouping = search.split(':');
            search_options = await exporter.getSavedOptions(grouping[0], grouping[1])
        }
    }

    // Store the search options, allowing the cli_options to take precedence.
    exporter.setOptions(search_options, cli_options);

    // Check the provided options and ask the user for any that are missing.
    query_options = await exporter.validateOptions();

    // Fetch the issues from GitHub.
    exporter.getIssues(query_options.query).then(issues => {
        // Format and print the results.
        let results = exporter.parseResults(issues, query_options.fields);
        exporter.printResults(results);

        // Save a file if requested.
        let export_file = exporter.getExportFile();
        if (export_file) {
            exporter.exportResults(results, export_file);
        }
    });
}

/**
 * Run the app.
 */
main(config, options, exporter);
