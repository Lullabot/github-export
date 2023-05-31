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
    const search_param = exporter.getSearchOpt();

    // If the user requested to use a saved search, look it up.
    if (search_param) {
        if (exporter.searchFileExists()) {
            const grouping = search_param.split(':');
            search_options = await exporter.getSavedOptions(grouping[0], grouping[1]).catch(err => {
                die(err, exporter.debug());
            });
        }
        else {
            let err = new Error(`Can't find 'search.yml' to load saved search '${search_param}'.`);
            die(err, exporter.debug());
        }

    // If there were no query or search options set, ask the user what they want to do.
    } else if (!exporter.queryOptProvided() && exporter.searchFileExists()) {
        const action = await exporter.getUserAction();

        if (action !== "New Search") {
            const grouping = action.split(':');
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
            exporter.exportResults(results, export_file).catch(err => {
                die(err, exporter.debug());
            });
        }
    }).catch(err => {
        die(err, exporter.debug());
    });
}

/**
 * End process execution and log the error.
 * @param error
 * @param debug
 */
function die(error, debug) {
    console.error(`😵 ${error.message}`);

    if (debug) {
        console.log(error);
    }

    process.exit(1);
}

/**
 * Run the app.
 */
main(config, options, exporter);
