# AP NPM Package Release Checklist

This checklist maps the project to the AP Small Project (Bucket 1, NPM Package) requirements.

## Required deliverables from the course framework

- [ ] Public GitHub repository
- [ ] Package published to the public NPM registry
- [x] README with purpose, features, requirements, and documentation
- [x] Installation instructions
- [x] Working usage examples
- [x] Automated tests and compatibility checks
- [x] Semantic version and changelog
- [x] Attribution for frameworks and AI-assisted development

## Before the first public release

- [ ] Confirm `express-input-guard` is available on npm: `npm view express-input-guard name`
- [ ] If the name is taken, choose a new name and update every occurrence before release.
- [ ] Replace/add GitHub repository, homepage, and issue-tracker metadata in `package.json`.
- [ ] Run `npm install`.
- [ ] Run `npm run check`.
- [ ] Run `npm test` and confirm no failures or skipped integration tests.
- [ ] Run `npm pack --dry-run` and inspect the included files.
- [ ] Review README examples and execute them against the release candidate.
- [ ] Review LICENSE, attribution, and security notes.
- [ ] Create a public GitHub repository and push the complete commit history.
- [ ] Confirm GitHub Actions succeeds on all configured Node.js / Express combinations.
- [ ] Log in to npm and verify the account: `npm login` then `npm whoami`.
- [ ] Publish the public package: `npm publish --access public`.
- [ ] Verify publication: `npm view express-input-guard`.
- [ ] Test installation from the registry in a clean folder: `npm install express-input-guard`.

## Semantic versioning

The initial public release is planned as `0.1.0` (early development). Before publishing, ensure this version has not already been released under the package name.

After the project reaches `1.0.0`:

- Patch (`1.0.1`): backwards-compatible bug fixes.
- Minor (`1.1.0`): backwards-compatible features.
- Major (`2.0.0`): breaking API changes.

Update `CHANGELOG.md` for each release.
