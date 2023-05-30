# GitHub Issue Exporter

1. Clone to your local.
2. Run `npm install`
3. Copy `config.example.js` to `config.js` and replace the github token with your own Personal Access Token.
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
