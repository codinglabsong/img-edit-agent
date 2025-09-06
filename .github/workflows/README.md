# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflows

### `deploy-api.yml` - Testing and Deployment

- **Triggers**:
  - Push to main (API changes only) - Runs tests + deploys
  - Pull Requests to main (API changes only) - Runs tests only
  - Manual dispatch
- **Purpose**: Test code changes and deploy to Hugging Face Spaces
- **Features**:
  - Tests must pass before deployment
  - Fast unit tests (excluding database)
  - Automatic deployment to HF Spaces (main branch only)
  - Uses existing HF secrets

## Environment Variables

The workflow uses a smart fallback system for environment variables:

```yaml
env:
  AWS_S3_BUCKET_NAME: ${{ secrets.AWS_S3_BUCKET_NAME || 'test-bucket' }}
  DATABASE_URL: ${{ secrets.DATABASE_URL || 'postgresql://test:test@localhost:5432/test' }}
  # ... etc
```

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

#### For Testing (Optional - tests will use fallback values)

- `AWS_S3_BUCKET_NAME` - Your S3 bucket name
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_API_KEY` - Google AI API key

#### For Deployment (Required)

- `HF_USERNAME` - Your Hugging Face username
- `HF_TOKEN` - Your Hugging Face access token
- `HF_SPACE_NAME` - Your HF Space name

### How It Works

1. **Tests**: Use actual secrets if available, otherwise use safe test values
2. **Deployment**: Uses actual secrets for HF deployment
3. **No Conflicts**: Test values don't interfere with production values
4. **Security**: Secrets are never exposed in logs

## Test Strategy

### Fast Tests (Default)

- Run on every PR and push
- Exclude database tests for speed
- Complete in ~2 seconds
- Use mocked external services

### Database Tests (Optional)

- Run when database is available
- Marked with `@pytest.mark.database`
- Can fail without breaking deployment
- Use actual database connection if available

## Local Development

Run tests locally using npm scripts:

```bash
# Fast tests (recommended)
pnpm test:api

# All tests including database
pnpm test:api:all

# Database tests only
pnpm test:api:db
```

## Workflow Flow

```
Pull Request → deploy-api.yml (tests only)
     ↓
Push to main → deploy-api.yml (tests + deploy if tests pass)
```

## Benefits

- ✅ **Fast Feedback**: Tests run in ~2 seconds
- ✅ **No Conflicts**: Uses actual secrets when available
- ✅ **Safe Fallbacks**: Test values when secrets unavailable
- ✅ **Quality Gate**: Deployment only happens if tests pass
- ✅ **Comprehensive**: Covers unit, integration, and error cases
- ✅ **Simplified**: Single workflow handles both testing and deployment
