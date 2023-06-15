#!/usr/bin/env node

const Exporter = require('../src/GithubExporter');
const config = require('../config');

const exporter = new Exporter(config.githubToken);

async function testApi() {
    let issues = [];

    issues = await exporter.search({
        owner: 'Lullabot',
        repo: 'github-export',
        query: 'label:Example',
        fields: 'title,html_url',
        headerRow: true
    }).catch(err => {
        console.error(err.message);
    });

    if (issues) {
        console.log(issues);
    }
}

testApi();
