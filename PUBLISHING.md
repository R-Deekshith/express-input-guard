# Publishing checklist

The course framework expects a public GitHub repository, a package published to the public npm registry, a thorough README, installation instructions, and working usage examples. The package is not considered launched until the registry installation has been verified.

## 1. Confirm the npm name

The current proposed package name is `express-input-guard`. Check it from your terminal while online:

```bash
npm view express-input-guard name
```

- If npm prints a package record, the name is already used. Choose a new unique name and update `package.json`, README examples, workflow documentation, and every package-name reference before publishing.
- If npm returns `E404`, that is a sign that no public package record was found. The final authority is the result of `npm publish` because name availability can change.

## 2. Review the project locally

From the project root:

```bash
npm install --no-save express
npm run check
npm test
npm pack --dry-run
```

Confirm all unit and Express integration tests pass (no integration tests should be skipped once the development dependencies are installed). Inspect the package contents shown by `npm pack --dry-run`.

## 3. Create the public GitHub repository

Follow `GITHUB_SETUP.md`. Create a public repository named `express-input-guard`, add the real repository/homepage/issues URLs to `package.json`, push the code, and wait for the GitHub Actions matrix to pass.

## 4. Publish to npm

Use the npm account that will own the package:

```bash
npm login
npm whoami
npm publish --access public
```

The `prepublishOnly` hook runs syntax checks and the test suite before publication. Publishing requires your npm account and explicit approval; do not share your password or access token in chat or commit it to GitHub.

## 5. Verify the public release

In a clean temporary directory:

```bash
npm view express-input-guard
mkdir input-guard-smoke-test
cd input-guard-smoke-test
npm init -y
npm install express express-input-guard
```

Create a small Express route using `validate()` and confirm a valid request reaches the route while an invalid request receives HTTP 422.

## 6. Semantic versioning

The first proposed public version is `0.1.0`, an early development release. Confirm that this version has not already been published before running the release command.

After `1.0.0`:

- Patch (`1.0.1`): backwards-compatible bug fixes.
- Minor (`1.1.0`): backwards-compatible features.
- Major (`2.0.0`): breaking API changes.

Update `CHANGELOG.md` for each release.
