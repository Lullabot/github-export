# GitHub Issue Exporter

1. Clone to your local.
2. Run `npm install`
3. Copy `config.example.js` to `config.js` and replace the github token with your own [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
4. Copy `search.example.yml` to `search.yml` and replace any example saved searches with your own.

## Saved Searches
Find yourself repeating the same searches over and over?  Save the parameters in  `search.yml`!

```yml
# Example saved search.  Export all issues from my repo and save it into the 'exports' folder as 'allmystuff.csv'.
MyStuff:
    all:
        owner: MyName
        repo: MyCoolRepo
        query: "is:issue"
        fields: title,html_url
        file: "allmystuff.csv"  # optional
```

then, run this command:
```bash
node . -s MyStuff:all
```
If you forget any required parameters, the app will ask you for them.

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
Call this search directly from another application using the `.search()` method!

```js
const exporter = new Exporter('Github Personal Access Token');

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
