# AP Small Project Submission Guide — NPM Package

This project is prepared for **AP Small Project, Bucket 1, Option 2: Publish an NPM Package** in the AP & DE Academic Evaluation Framework (AY 2026–27).

## Course requirement mapping

| Requirement in the framework | Project evidence / remaining action |
| --- | --- |
| Build and publish a reusable open-source package to the public NPM registry | `src/`, `package.json`, MIT `LICENSE`; public NPM publication remains to be completed from the owner's npm account |
| Public GitHub repository | Repository setup instructions in `GITHUB_SETUP.md`; create the public repository and push the code |
| Published package on NPM registry | Publish instructions in `PUBLISHING.md`; registry release is not yet complete |
| Thorough README documentation | `README.md` covers purpose, requirements, installation, usage, request locations, validation rules, options, errors, examples, limits, attribution, and licence |
| Installation instructions | `README.md` and `PUBLISHING.md` |
| Working usage code examples | `examples/basic-express-app.js`, README quick start, and Express integration tests |
| Code quality | 34 automated test cases are defined (31 unit tests and 3 real-Express integration tests); see current run note below |
| Package usefulness | Reusable request validation and sanitization for Express body, params, query, and headers |
| Documentation quality | README, contribution guide, security policy, changelog, submission guide, and release checklist |
| Semantic versioning | Version `0.1.0` and `CHANGELOG.md`; version guidance in `RELEASE_CHECKLIST.md` |
| Ease of developer integration | CommonJS and ESM entry points, TypeScript declarations, middleware examples, and peer dependency metadata |

## Current verification note

In the build environment used to prepare this archive, `npm run check` passed and all 31 unit tests passed. The three Express integration tests were skipped because Express was not installed in that environment. The project has already been manually exercised in a real Express app on the student's Mac, where a valid request returned HTTP 201 and invalid requests returned HTTP 422. For the final submission, install Express in this checkout and rerun the tests so all three integration tests execute:

```bash
npm install --no-save express
npm run check
npm test
```

The expected final result is 34 passing tests and zero skipped tests.

## Release steps

1. Download and extract the complete source archive.
2. Install Express and run all checks.
3. Confirm the npm name is available. If not, choose another name before publishing.
4. Create a **public** GitHub repository and push the project using `GITHUB_SETUP.md`.
5. Confirm GitHub Actions passes.
6. Log in to npm and publish using `PUBLISHING.md`.
7. Verify installation from the public registry in a clean test folder.

**Do not claim the package is published until the NPM registry shows the release and a clean install succeeds. Do not claim the GitHub deliverable is complete until the repository is public.**
