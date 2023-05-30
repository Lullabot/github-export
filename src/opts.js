#!/usr/bin/env node

module.exports = {
    owner: {
        label: "Repo Owner",
        flag: 'o',
        type: 'string',
        required: true
    },
    repo: {
        label: "Repo Name",
        flag: 'r',
        type: 'string',
        required: true
    },
    fields: {
        label: "Fields to Export (comma separated)",
        flag: 'f',
        type: 'string',
        required: true
    },
    query: {
        label: "Search Query",
        flag: 'q',
        type: 'string',
        required: true
    },
    search: {
        label: "Load Saved Search",
        flag: 's',
        type: 'group:name',
        required: false
    }
}
