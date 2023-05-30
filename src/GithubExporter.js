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

    /**
     * Constructor.
     *
     * @param token
     * @param options
     * @param program
     */
    constructor(token, options, program) {
        // Instantiate the GitHub API.
        this.github = new GitHub({token: token});

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
            program.option(`-${opt.flag}, --${i} <${opt.type}>`, opt.label);
        }

        // Load the CLI options into the program.
        program.parse(program.argv);
        this.cliOptions = program.opts();
    };

    /**
     * Determine if the user provided a saved search option.
     * @returns {boolean}
     */
    searchOptProvided() {
        return (this.cliOptions?.search && this.cliOptions?.search !== '');
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
            throw new Error('Invalid saved search reference.');
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
    async getUserSearchOption() {
        const options = await this.getSavedSearches();

        // Define the options for the prompt.
        const search_groups = ['New Search'];
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
        query = `repo:${this.queryOptions.owner}/${this.queryOptions.repo} ${query}`;

        return await this.github.search().forIssues({q: query}).then(results => {
            return results.data;
        });
    };

    /**
     * Get the required fields from the results.
     *
     * @param results
     * @param fields
     * @returns {*[]}
     */
    parseResults(results, fields) {
        let content = [];
        fields = fields.split(',');

        // Set headers.
        content.push(this.setHeaders(fields));

        // Build results.
        for (let i in results) {
            content.push(this.parseIssue(results[i], fields));
        }

        return content;
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
    exportResults(content, filename) {
        // Resolve full filename.
        let absolutePath = path.resolve(`./exports/${filename}`);

        // Write the csv.
        fs.writeFile(absolutePath, content.join('\n'), {flag: 'a+'}, err => {
            if (err) {
                throw new Error(err);
            }
            else {
                console.log(`\n💾 File saved to ${absolutePath}`)
            }
        });
    };

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
            if (issue.hasOwnProperty(fields[i])) {
                let _data = this.parseCsvString(issue[fields[i]].toString());

                data.push(_data);
            } else {
                data.push('');
            }
        }

        return data.join(',');
    };

    parseCsvString(string) {
        // Remove line breaks.
        string = string.replace(/\n/g, '');

        // Parse commas.
        string = string.replace(',', '\,');

        return string;
    }
}

module.exports = Exporter;
