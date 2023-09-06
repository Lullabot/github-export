# GitHub Issue Exporter

1. [Install node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
2. Clone to your local.
3. `cd` into the directory.
4. Run `npm install`
5. Copy `config.example.js` to `config.js` and replace the github token with your own [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
6. (optional) Copy `search.example.yml` to `search.yml` and replace any example saved searches with your own.

## Search For Issues

### Option 1: Use the command prompts
1. Run `node index.js`
2. Choose "New Search"
3. The Owner and Repo are the first two parts of the URL.  For example, in this case `Lullabot` and `github-export` respectively.
4. For the `query` input, use anything that you would use to search for issues in GitHub.  For example `is:open is:pr`
5. For `fields`, you can specify any fields you know the machine name for.  If unsure, say `all` to get all fields, or run the app again and choose "Show Available Fields" from the options menu.

### Option 2: Specify directly from the CLI

```bash
node index.js -o Lullabot -r github-export -q "is:issue is:open" -f "title,html_url" -f issuedump.csv
```

If you leave any required options empty, the app will prompt you for them.

*Run with the `--help` flag to see all available options.*

### Option 3: Define a saved search
Find yourself repeating the same searches over and over?  Save the parameters in  `search.yml`!

```yaml
# Example saved search.  Export all issues from my repo and save it into the 'exports' folder as 'allmystuff.csv'.
MyStuff:
    all:
        owner: Lullabot
        repo: github-export
        query: "is:issue"
        fields: title,html_url
        file: "allmystuff.csv"  # optional
```

then, perform the search by running this command:

```bash
node index.js -s MyStuff:all
```
If you forget any required parameters, the app will ask you for them.

You can also **override any saved search** settings using the CLI flags.

```bash
node index.js -s MyStuff:all -q "is:issue is:open"
```

## What fields are available?
### Option 1: Set "fields" to 'all'
In any search, when prompted for the fields you want, say `all` and all available field data will be exported.  Then you can specify the ones you want in your next search.

```yaml
Examples:
  AllFields:
    owner: Lullabot
    repo: github-export
    query: is:issue is:open label:Example
    fields: all
```

### Option 2: Use the Built-In Example
Run `node index.js` without any parameters.  When prompted, select "Show Available Fields" and the system will show all available fields from an example issue in this repo and save the results to an export file. 

## Limitations
1. Doesn't pull complex field values (yet), like Users or Labels (See https://github.com/Lullabot/github-export/issues/3)
2. Doesn't pull data added via GitHub Projects, like custom fields. (See https://github.com/Lullabot/github-export/issues/4)

## Direct API Call
Want a quick and easy way to get a dump of GitHub issues into your application?  Call this search directly using the `.search()` method!

```js
const exporter = new Exporter('MyGitHubPersonlAccessToken');

let issues = [];
issues = await exporter.search({
    owner: 'Lullabot',
    repo: 'github-export',
    query: 'label:Example',
    fields: 'title,html_url',       // (optional) Defaults to all fields
    headerRow: true                 // (optional) Defaults to false
}).catch(err => {
    console.error(err.message);
});

if (issues) {
    console.log(issues);
}
```
