# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` branch
- Push to `claude/**` branches
- Pull requests to `main`

**Jobs:**
- **build-backend**:
  - Checks out code
  - Sets up Node.js 18
  - Installs dependencies
  - Runs TypeScript type checking
  - Builds the backend

- **build-frontend**:
  - Checks out code
  - Sets up Node.js 18
  - Installs dependencies
  - Runs TypeScript type checking
  - Builds the frontend
  - Uploads build artifacts

**Purpose:** Ensures code quality and successful builds before merging.

### 2. Docker Workflow (`docker.yml`)

**Triggers:**
- Push to `main` branch
- Push of tags matching `v*` (e.g., `v1.0.0`)
- Pull requests to `main` (build only, no push)

**Jobs:**
- **build-and-push**:
  - Builds Docker images for frontend and backend
  - Pushes to GitHub Container Registry (ghcr.io)
  - Tags images with:
    - Branch name (e.g., `main`)
    - Commit SHA (e.g., `main-abc1234`)
    - Version tags (e.g., `v1.0.0`, `1.0`, `1`)
    - `latest` for main branch

**Images:**
- `ghcr.io/jellevictoor/klskmp-energy-dashboard-frontend`
- `ghcr.io/jellevictoor/klskmp-energy-dashboard-backend`

**Purpose:** Automates Docker image building and publishing.

### 3. Release Workflow (`release.yml`)

**Triggers:**
- Push of version tags (e.g., `v1.0.0`)

**Jobs:**
- **create-release**:
  - Generates changelog from git commits
  - Creates GitHub release
  - Creates docker-compose.yml for the release
  - Uploads docker-compose.yml as release asset

**Purpose:** Automates GitHub releases with changelogs and deployment files.

## Using Pre-built Docker Images

Images are automatically built and published. To use them:

### Pull latest images:
```bash
docker pull ghcr.io/jellevictoor/klskmp-energy-dashboard-frontend:latest
docker pull ghcr.io/jellevictoor/klskmp-energy-dashboard-backend:latest
```

### Pull specific version:
```bash
docker pull ghcr.io/jellevictoor/klskmp-energy-dashboard-frontend:v1.0.0
docker pull ghcr.io/jellevictoor/klskmp-energy-dashboard-backend:v1.0.0
```

### Use in docker-compose:
```yaml
services:
  backend:
    image: ghcr.io/jellevictoor/klskmp-energy-dashboard-backend:latest
    # ... rest of config

  frontend:
    image: ghcr.io/jellevictoor/klskmp-energy-dashboard-frontend:latest
    # ... rest of config
```

## Creating a Release

To create a new release:

1. **Tag the commit:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Wait for workflows to complete:**
   - Docker images will be built and tagged with `v1.0.0`
   - GitHub release will be created automatically
   - Release will include a docker-compose.yml file

3. **Users can deploy:**
   ```bash
   # Download docker-compose.yml from the release
   wget https://github.com/jellevictoor/klskmp-energy-dashboard/releases/download/v1.0.0/docker-compose.yml

   # Configure environment
   cp backend/.env.example .env
   # Edit .env with your settings

   # Deploy
   docker-compose up -d
   ```

## Permissions

The workflows use:
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- Permissions needed:
  - `contents: read` - Read repository
  - `contents: write` - Create releases (release workflow)
  - `packages: write` - Push to GitHub Container Registry

These are configured in the workflow files and don't require additional setup.

## Troubleshooting

### Images not pushing to GHCR

1. Check that GitHub Packages is enabled for your repository
2. Verify the workflow has `packages: write` permission
3. Ensure you're not on a fork (packages can't be written to upstream from forks)

### CI failing on type check

1. Run `npm run build` locally to see TypeScript errors
2. Fix type errors in your code
3. Push the fixes

### Release workflow not triggering

1. Ensure you're pushing a tag that matches `v*` pattern
2. Use semantic versioning (e.g., `v1.0.0`, not `1.0.0`)
3. Check the Actions tab for workflow runs

## Best Practices

1. **Always create tags for releases:**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Use semantic versioning:**
   - `v1.0.0` - Major release
   - `v1.1.0` - Minor release (new features)
   - `v1.0.1` - Patch release (bug fixes)

3. **Test before releasing:**
   - Push to a branch first
   - Let CI workflow run
   - Tag only after CI passes

4. **Monitor workflow runs:**
   - Check the Actions tab in GitHub
   - Fix any failures promptly
   - Review build logs for warnings
