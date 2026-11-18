# Publish this project to GitHub

The source code is prepared locally. The public GitHub repository must be created under your own GitHub account.

## 1. Create an empty public repository

On GitHub, create a repository named `express-input-guard`. Choose **Public**. Do not initialize it with a README, licence, or `.gitignore` because those files are already in this project.

## 2. Configure package metadata

After creating the repository, replace `<YOUR_GITHUB_USERNAME>` below with your actual GitHub username, then run these commands from the project folder:

```bash
npm pkg set repository.type=git
npm pkg set repository.url="git+https://github.com/<YOUR_GITHUB_USERNAME>/express-input-guard.git"
npm pkg set homepage="https://github.com/<YOUR_GITHUB_USERNAME>/express-input-guard#readme"
npm pkg set bugs.url="https://github.com/<YOUR_GITHUB_USERNAME>/express-input-guard/issues"
```

## 3. Initialize and push the repository

```bash
git init
git branch -M main
git add .
git commit -m "chore: prepare express-input-guard release candidate"
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/express-input-guard.git
git push -u origin main
```

If `git remote add origin` says `origin` already exists, inspect it with `git remote -v` before changing it.

## 4. Verify

Open the new repository on GitHub. Confirm it is **Public**, contains the source, tests, examples, README, licence, and GitHub Actions workflow, and that the CI check passes.

Do not add npm tokens, GitHub tokens, passwords, `.env` files, or other secrets to the repository.
