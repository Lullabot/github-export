#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const GitHub = require("github-api");
const inquirer = require('inquirer');
const YAML = require("yaml");

// https://github-tools.github.io/github/docs/3.2.3/index.html

class Exporter {
    github;
    program;
    cliOptions;
    queryOptions = {};
    opsDef;
    fieldExample = false;

    /**
     * Constructor.
     *
     * @param token
     */
    constructor(token) {
        // Instantiate the GitHub API.
        this.github = new GitHub({token: token});
    }

    /**
     * Initialize the Exporter for use with a CLI.
     *
     * @param options
     * @param program
     */
    initCli(options, program) {
        // Store the options definition.
        this.opsDef = options;

        // Store the current program object.
        this.program = program;

        // Instantiate the program for CLI input and store base values.
        for (let i in options) {
            // Instantiate the individual search options.
            this.queryOptions[i] = '';

            // Define the CLI options.
            let opt = options[i];
            let opt_type = opt?.type ? ` <${opt.type}>` : '';
            program.option(`-${opt.flag}, --${i}${opt_type}`, opt.label);
        }

        // Load the CLI options into the program.
        program.parse(program.argv);
        this.cliOptions = program.opts();
    }

    /**
     * Determine if the user provided a saved search option.
     * @returns {boolean}
     */
    getSearchOpt() {
        return this.cliOptions?.search;
    }

    /**
     * Check to see if the search.yml file exists.
     * @returns {boolean}
     */
    searchFileExists() {
        return fs.existsSync('./search.yml');
    }

    /**
     * Determine if any basic query options were set in the CLI.
     * @returns {boolean}
     */
    queryOptProvided() {
        return ((this.cliOptions?.owner && this.cliOptions.owner !== '') || (this.cliOptions?.repo && this.cliOptions.repo !== '') || (this.cliOptions?.query && this.cliOptions.query !== ''));
    }

    /**
     * Get the user-provided options.
     * @returns {*}
     */
    getCliOptions() {
        // Store the CLI option values.
        return this.program.opts();
    }

    /**
     * Get the saved search options for a particular search reference.
     * @param group
     * @param name
     * @returns {Promise<*>}
     */
    async getSavedOptions(group, name) {
        const saved_searches = await this.getSavedSearches();
        if (!saved_searches[group] || !saved_searches[group][name]) {
            throw new Error(`Invalid saved search reference. Can't find '${group}:${name}' in 'search.yml'.`);
        } else {
            return saved_searches[group][name];
        }
    }

    /**
     * Set the options in the proper order to allow CLI options to override any search options.
     * @param search_options
     * @param cli_options
     */
    setOptions(search_options, cli_options) {
        this.queryOptions = {...this.queryOptions, ...search_options, ...cli_options};
    }

    /**
     * Read the data from the search.yml file.
     * @returns {Promise<any>}
     */
    async getSavedSearches() {
        const searches = fs.readFileSync('./search.yml', 'utf-8');
        return await YAML.parse(searches);
    }

    /**
     * Ask the user what type of search to execute.
     * @returns {Promise<*>}
     */
    async getUserAction() {
        const options = await this.getSavedSearches();

        // Define the options for the prompt.
        const search_groups = ['New Search', 'Show Available Fields'];
        for (let i in options) {
            for (let j in options[i]) {
                search_groups.push(`${i}:${j}`);
            }
        }

        return await inquirer.prompt([{
            type: 'list', name: 'search', message: 'Select Search:', choices: search_groups,
        }]).then(answers => {
            return answers.search;
        });
    }

    /**
     * If a user wants to see what fields are available, set params for a special type of report.
     * @returns {{}}
     */
    setFieldExample() {
        const search_options = {};

        this.fieldExample = true;

        search_options.owner = 'Lullabot';
        search_options.repo = 'github-export';
        search_options.fields = 'all';
        search_options.query = 'label:Example';
        search_options.file = 'AvailableFields.csv';
        return search_options;
    }

    /**
     * Ensure we have all the necessary options from the user.
     * @returns {Promise<any|boolean>}
     */
    async validateOptions() {
        const questions = [];

        // Ask for any missing options.
        for (let i in this.opsDef) {
            let opt = this.opsDef[i];
            let qops = this.queryOptions;

            // Load up the questions to get missing options.
            if (opt.required) {
                questions.push({
                    type: 'input', name: i, message: `${opt.label}:`, validate(input) {
                        return input !== "";
                    }, when(answers) {
                        return !qops[i] || qops[i] === "";
                    }
                });
            }
        }

        // Prompt the user for any missing options.
        return await inquirer.prompt(questions).then(answers => {
            for (let i in answers) {
                this.queryOptions[i] = answers[i];
            }

            return this.queryOptions;
        });
    }

    /**
     *
     * @param query
     */
    async getIssues(query) {
        // Prepend the repo to the query string.
        query = Exporter.buildQuery(this.queryOptions.owner, this.queryOptions.repo, query);

        return await this.github.search().forIssues({q: query}).then(results => {
            return results.data;
        });
    }

    /**
     * Build a GitHub search query.
     *
     * @param owner
     * @param repo
     * @param query
     * @returns {string}
     */
    static buildQuery(owner, repo, query) {
        return `repo:${owner}/${repo} ${query}`;
    }

    /**
     * Direct search API given the minimum necessary params.
     *
     * @param params
     * @returns {Promise<void>}
     */
    async search(params) {
        const defaults = {
            owner: '',
            repo: '',
            query: '',
            fields: 'all',
            headerRow: false
        };

        // Merge defaults with provided params.
        const search_params = {...defaults, ...params};
        const query = Exporter.buildQuery(search_params.owner, search_params.repo, search_params.query);

        // Get issues from GitHub.
        const results = await this.github.search().forIssues({q: query}).then(results => {
            return results.data;
        }).catch(err => {
            let error = new Error('Search failed.  Please check your search parameters.');
            error.original = err;
            throw error;
        });

        return this.parseResults(results, search_params.fields, search_params.headerRow);
    }

    /**
     * Get the required fields from the results.
     *
     * @param results
     * @param fields
     * @param header_row
     * @returns {*[]}
     */
    parseResults(results, fields, header_row) {
        let content = [];
        fields = fields.split(',');

        // Print all available fields.  Helpful to see what's available.
        if (fields[0] === 'all') {
            let allFields = [];

            for (let i in results[0]) {
                if (typeof results[0][i] !== 'object' && !Array.isArray(results[0][i])) {
                    allFields.push(i);
                }
            }

            fields = allFields;
        }

        // If this is a field example request, just print one result and list the fields vertically.
        if (this.fieldExample === true) {
            let rep_result = results[0];

            content.push('Field Name,Example Value');

            for (let i in fields) {
                content.push(`${fields[i]},"${rep_result[fields[i]]}"`);
            }
        }
        else {
            // Set headers.
            if (header_row === true) {
                content.push(this.setHeaders(fields));
            }

            // Build results.
            for (let i in results) {
                content.push(this.parseIssue(results[i], fields));
            }
        }

        return content;
    }

    parseFields(fields) {
        for (let i in fields) {
            if (fields[i].indexOf(':') !== 0) {
                // Split the field to
            }
        }
    }

    /**
     * Return the path to a desired export file.
     * @returns {((successCallback: FileCallback, errorCallback?: ErrorCallback) => void) | undefined}
     */
    getExportFile() {
        return this.queryOptions?.file;
    }

    /**
     * Write the results to a file.
     * @param content
     * @param filename
     */
    async exportResults(content, filename) {
        // Resolve full filename.
        let absolutePath = path.resolve(`./exports/${filename}`);

        // Write the csv.
        return await fs.writeFile(absolutePath, content.join('\n'), {flag: 'w'}, err => {
            if (err) {
                throw new Error(err);
            } else {
                console.log(`\n💾 File saved to ${absolutePath}`)
            }
        });
    };

    /**
     * Print the results to the console.
     * @param content
     */
    printResults(content) {
        // Print the content to the console.
        console.log(content.join('\n'));
    };

    /**
     * Create the header row for the CSV.
     *
     * @param fields {array}
     * @returns {string}
     */
    setHeaders(fields) {
        let headers = [];

        for (let i in fields) {
            headers.push(fields[i]);
        }

        return headers.join(',');
    };

    /**
     * Return a comma separated string of field values from a search result.
     *
     * @param issue
     * @param fields
     * @returns {string}
     */
    parseIssue(issue, fields) {
        let data = [];

        for (let i in fields) {
            if (fields[i].indexOf(':') !== 0) {
                // Split the reference to extract subvalues.
                let complex_field = fields[i].split(':');
            } else {
                if (issue.hasOwnProperty(fields[i])) {
                    let _data = this.parseCsvString(issue[fields[i]].toString());

                    data.push(_data);
                } else {
                    data.push('');
                }
            }
        }

        return data.join(',');
    };

    /**
     * Prepare a string for CSV format.
     * @param string
     * @returns {*}
     */
    parseCsvString(string) {
        // Remove line breaks.
        string.replace(/\n/g, '');

        // Check if the input string contains special characters that need to be escaped
        if (/[",\n\r]/g.test(string)) {
            // Escape double quotes by replacing them with two double quotes
            string = string.replace(/"/g, '""');

            // Enclose the string in double quotes
            string = '"' + string + '"';
        }

        return string;
    }

    /**
     * Is debug mode enabled.
     * @returns {boolean}
     */
    debug() {
        return this.cliOptions.debug === true;
    }
}

module.exports = Exporter;
