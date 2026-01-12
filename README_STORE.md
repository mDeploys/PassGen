# Microsoft Store Build Notes

## Build Command

```
npm run build:msix
```

## Output Location

- Store package output: `release/`
- App assets: `dist/`

## Submission Reminder

- Upload the generated `.appx`/`.msix` file from `release/` to Partner Center.
- Use the exact identity values from Partner Center in `package.json`.

## Store Listing Wording

Recommended wording:
“Subscriptions purchased and managed on our website.”
